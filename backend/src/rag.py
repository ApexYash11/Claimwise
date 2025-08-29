from typing import List, Tuple, Optional
import os
import logging

from src.db import supabase, supabase_storage
from src.embeddings import embed_texts


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
    i = j - overlap
    if i < 0:
      i = 0
  return chunks


def index_documents(text: str, document_id: str, chunk_size: int = 500, overlap: int = 50) -> List[Tuple[str, Optional[List[float]]]]:
  """
  Chunk the provided text, obtain embeddings for each chunk, and insert them into
  the `document_chunks` table in Supabase. Uses service-role client when available.

  Returns a list of (chunk_text, embedding) for the successfully inserted chunks.
  """
  chunks = chunk_texts([text], chunk_size, overlap)
  result: List[Tuple[str, Optional[List[float]]]] = []

  # Attempt to embed chunks; if embeddings fail for any reason, fall back to
  # storing chunks without embeddings (so retrieval can still be performed
  # later once embeddings are available).
  try:
    embs = embed_texts(chunks)
  except Exception as e:
    logger.warning("Embedding call failed or GEMINI_API_KEY missing: %s", e)
    embs = [None] * len(chunks)

  # Normalize embeddings list length
  if embs is None:
    embs = [None] * len(chunks)
  elif len(embs) < len(chunks):
    embs = list(embs) + [None] * (len(chunks) - len(embs))

  service_client = supabase_storage or supabase

  for idx, chunk in enumerate(chunks):
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
      "document_id": document_id,
      "chunk_index": idx,
      "content": chunk,
    }
    if emb is not None:
      row["embedding"] = emb

    try:
      res = service_client.table("document_chunks").insert(row).execute()
      err = getattr(res, "error", None)
      if err:
        logger.error("Failed to insert chunk %d for doc %s: %s", idx, document_id, err)
        continue

      result.append((chunk, emb))
    except Exception as e:
      logger.exception("Exception inserting chunk %d for doc %s: %s", idx, document_id, e)

  return result


def retrieve_top_k(query: str, k: int = 5) -> List[Tuple[int, str, float]]:
  """
  Retrieve the top-k most relevant document chunks for the given query.

  Embeds the query and calls the Supabase RPC `vector_search_document_chunks`.
  """
  q_embs = embed_texts([query])
  if not q_embs:
    return []
  q_emb = q_embs[0]

  service_client = supabase_storage or supabase
  try:
    res = service_client.postgrest.rpc(
      "vector_search_document_chunks", {"query_embedding": q_emb, "limit_count": k}
    ).execute()
    rows = res.data or []
    return [(r.get("id"), r.get("content"), r.get("score")) for r in rows]
  except Exception as e:
    logger.exception("RPC vector search failed: %s", e)
    return []