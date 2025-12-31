from typing import List, Tuple, Optional
import os
import logging
from datetime import datetime

from src.db import supabase, supabase_storage
from src.embeddings import embed_texts_with_cache
from src.content_filters import filter_boilerplate_content, deduplicate_chunks, should_embed_chunk


logger = logging.getLogger(__name__)
EXPECTED_EMBED_DIM = int(os.getenv("EMBEDDING_DIM", "768"))


def chunk_texts(texts: List[str], chunk_size: int = 500, overlap: int = 50) -> List[str]:
  """
  Split one or more input texts into word-based chunks with a fixed overlap.

  Args:
    texts: list of strings to be chunked (we join them before splitting by words)
    chunk_size: approximate number of words per chunk
    overlap: number of words to overlap between consecutive chunks

  Returns:
    List of chunk strings.
  """
  words = " ".join(texts).split()
  chunks: List[str] = []
  i = 0
  while i < len(words):
    j = min(i + chunk_size, len(words))
    chunks.append(" ".join(words[i:j]))
    
    # Move forward by chunk_size - overlap, but ensure we make progress
    step = max(1, chunk_size - overlap)  # Always move at least 1 word forward
    i += step
    
    # Safety check to prevent infinite loops
    if len(chunks) > 10000:  # Reasonable upper limit
      logger.warning(f"Stopping chunking at {len(chunks)} chunks to prevent memory issues")
      break
      
  return chunks


def index_documents(text: str, document_id: str, chunk_size: int = 500, overlap: int = 50) -> List[Tuple[str, Optional[List[float]]]]:
  """
  Chunk the provided text, obtain embeddings for each chunk, and insert them into
  the `document_chunks` table in Supabase. Uses service-role client when available.
  
  Includes content filtering to optimize embedding quality and reduce API costs.

  Returns a list of (chunk_text, embedding) for the successfully inserted chunks.
  """
  # Step 1: Filter boilerplate content to improve embedding quality
  logger.info(f"Original text length: {len(text)} characters")
  filtered_text = filter_boilerplate_content(text)
  logger.info(f"Filtered text length: {len(filtered_text)} characters (saved {len(text) - len(filtered_text)} chars)")
  
  # Step 2: Create chunks
  chunks = chunk_texts([filtered_text], chunk_size, overlap)
  logger.info(f"Created {len(chunks)} initial chunks")
  
  # Step 3: Deduplicate chunks to reduce API calls
  unique_chunks = deduplicate_chunks(chunks)
  logger.info(f"After deduplication: {len(unique_chunks)} unique chunks (saved {len(chunks) - len(unique_chunks)} duplicates)")
  
  # Step 4: Filter chunks worth embedding
  quality_chunks = [chunk for chunk in unique_chunks if should_embed_chunk(chunk)]
  logger.info(f"After quality filtering: {len(quality_chunks)} chunks worth embedding (filtered out {len(unique_chunks) - len(quality_chunks)} low-quality chunks)")
  
  result: List[Tuple[str, Optional[List[float]]]] = []

  # Step 5: Attempt to embed quality chunks; if embeddings fail for any reason, fall back to
  # storing chunks without embeddings (so retrieval can still be performed
  # later once embeddings are available).
  try:
    embs = embed_texts_with_cache(quality_chunks)
  except Exception as e:
    logger.warning("Embedding call failed or GEMINI_API_KEY missing: %s", e)
    embs = [None] * len(quality_chunks)

  # Normalize embeddings list length
  if embs is None:
    embs = [None] * len(quality_chunks)
  elif len(embs) < len(quality_chunks):
    embs = list(embs) + [None] * (len(quality_chunks) - len(embs))

  service_client = supabase_storage or supabase

  for idx, chunk in enumerate(quality_chunks):
    emb = embs[idx] if idx < len(embs) else None

    # Validate embedding dimensionality if present
    if emb is not None:
      if EXPECTED_EMBED_DIM and len(emb) != EXPECTED_EMBED_DIM:
        logger.error(
          "Embedding dimension mismatch for doc %s chunk %d: got %d expected %d - storing without embedding",
          document_id,
          idx,
          len(emb),
          EXPECTED_EMBED_DIM,
        )
        emb = None

    row = {
      "policy_id": document_id,  # Use policy_id instead of document_id
      "chunk_index": idx,
      "content": chunk,
    }
    if emb is not None:
      row["embedding"] = emb

    try:
      # First try with policy_id (current schema)
      res = service_client.table("document_chunks").insert(row).execute()
      err = getattr(res, "error", None)
      if err:
        logger.error("Failed to insert chunk %d for doc %s: %s", idx, document_id, err)
        continue

      result.append((chunk, emb))
    except Exception as e:
      # If foreign key constraint fails, it might be schema mismatch
      if "foreign key constraint" in str(e).lower():
        logger.warning("Document chunks table foreign key constraint failed for policy %s - skipping RAG indexing", document_id)
        logger.debug("Full error: %s", e)
        break  # Skip remaining chunks for this document
      else:
        logger.exception("Exception inserting chunk %d for doc %s: %s", idx, document_id, e)

  return result


def retrieve_top_k(query: str, k: int = 5, policy_id: Optional[str] = None) -> List[Tuple[int, str, float]]:
  """
  Retrieve the top-k most relevant document chunks for the given query.

  Embeds the query and calls the Supabase RPC `vector_search_document_chunks`.
  """
  q_embs = embed_texts_with_cache([query])
  if not q_embs:
    return []
  q_emb = q_embs[0]

  service_client = supabase_storage or supabase
  try:
    params = {"query_embedding": q_emb, "limit_count": k}
    if policy_id:
        params["filter_policy_id"] = policy_id
        
    res = service_client.postgrest.rpc(
      "vector_search_document_chunks", params
    ).execute()
    rows = res.data or []
    return [(r.get("id"), r.get("content"), r.get("score")) for r in rows]
  except Exception as e:
    logger.exception("RPC vector search failed: %s", e)
    return []