from typing import List, Any, Optional
import os 
import time
import logging

try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

# Configuration from environment
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
DEFAULT_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "20"))
ENABLE_EMBEDDING_CACHE = os.getenv("ENABLE_EMBEDDING_CACHE", "true").lower() == "true"
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
INITIAL_DELAY = float(os.getenv("INITIAL_DELAY", "1.0"))

# Initialize Gemini client properly
client = None
api_key = os.getenv("GEMINI_API_KEY")
if genai and api_key:
    try:
        os.environ["GOOGLE_API_KEY"] = api_key
        client = genai
        logger.info("Gemini embedding client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        client = None
else:
    logger.warning("Gemini not available - embeddings will fail gracefully")

from typing import List, Any, Optional
import logging

def embed_texts_with_cache(texts: List[str], max_retries: int = 3, batch_size: Optional[int] = None, delay: float = 1.0) -> List[Optional[List[float]]]:
    """
    Embed texts with caching support to reduce API calls.
    
    Args:
        texts: List of strings to embed
        max_retries: Number of retry attempts for rate limits
        batch_size: Number of texts to embed per API call (None = use DEFAULT_BATCH_SIZE)
        delay: Initial delay between retries (exponential backoff)
        
    Returns:
        List of embeddings (or None for failed embeddings)
    """
    if not texts:
        return []
    
    if batch_size is None:
        batch_size = DEFAULT_BATCH_SIZE
    
    # If caching is disabled, use regular embedding
    if not ENABLE_EMBEDDING_CACHE:
        return embed_texts(texts, max_retries, batch_size, delay)
    
    from src.content_filters import get_content_fingerprint
    from src.db import supabase, supabase_storage
    
    cached_embeddings = []
    texts_to_embed = []
    cache_map = {}  # fingerprint -> index in original texts
    
    # Step 1: Check cache for existing embeddings
    for i, text in enumerate(texts):
        fingerprint = get_content_fingerprint(text)
        
        try:
            # Try to get cached embedding
            service_client = supabase_storage or supabase
            result = service_client.rpc('get_cached_embedding', {'fingerprint': fingerprint}).execute()
            
            if result.data and result.data[0]:
                # Found cached embedding
                cached_embeddings.append((i, result.data[0]))
                logger.debug(f"Using cached embedding for text {i}")
            else:
                # Need to embed this text
                texts_to_embed.append(text)
                cache_map[fingerprint] = i
                
        except Exception as e:
            logger.warning(f"Cache lookup failed for text {i}: {e}")
            texts_to_embed.append(text)
            cache_map[fingerprint] = i
    
    # Step 2: Embed uncached texts
    new_embeddings = []
    if texts_to_embed:
        logger.info(f"Cache hit rate: {len(cached_embeddings)}/{len(texts)} ({len(cached_embeddings)/len(texts)*100:.1f}%)")
        new_embeddings = embed_texts(texts_to_embed, max_retries, batch_size, delay)
        
        # Step 3: Cache new embeddings
        for j, embedding in enumerate(new_embeddings):
            if embedding is not None:
                text = texts_to_embed[j]
                fingerprint = get_content_fingerprint(text)
                
                try:
                    service_client = supabase_storage or supabase
                    service_client.rpc('cache_embedding', {
                        'fingerprint': fingerprint,
                        'content_preview': text[:200],
                        'embedding_vector': embedding,
                        'model_name': EMBEDDING_MODEL
                    }).execute()
                    logger.debug(f"Cached new embedding for text {cache_map[fingerprint]}")
                except Exception as e:
                    logger.warning(f"Failed to cache embedding: {e}")
    
    # Step 4: Combine cached and new embeddings in original order
    final_embeddings: List[Optional[List[float]]] = [None] * len(texts)
    
    # Place cached embeddings
    for i, embedding in cached_embeddings:
        final_embeddings[i] = embedding
    
    # Place new embeddings
    new_embedding_index = 0
    for fingerprint, original_index in cache_map.items():
        if new_embedding_index < len(new_embeddings):
            final_embeddings[original_index] = new_embeddings[new_embedding_index]
            new_embedding_index += 1
    
    return final_embeddings


# Keep original function for backward compatibility
def embed_texts(texts: List[str], max_retries: int = 3, batch_size: Optional[int] = None, delay: float = 1.0) -> List[Optional[List[float]]]:
    """
    Embed texts with batching and retry logic to handle rate limits.
    
    Args:
        texts: List of strings to embed
        max_retries: Number of retry attempts for rate limits
        batch_size: Number of texts to embed per API call (None = use DEFAULT_BATCH_SIZE)
        delay: Initial delay between retries (exponential backoff)
    """
    if not texts:
        return []
    
    if batch_size is None:
        batch_size = DEFAULT_BATCH_SIZE
    
    logger.info(f"Embedding {len(texts)} texts in batches of {batch_size}")
    all_embeddings = []
    
    # Process in batches
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = _embed_batch(batch, max_retries, delay)
        all_embeddings.extend(batch_embeddings)
    
    return all_embeddings

def _embed_batch(texts: List[str], max_retries: int, initial_delay: float) -> List[Optional[List[float]]]:
    """Embed a batch of texts with retry logic using correct Gemini API."""
    for attempt in range(max_retries):
        try:
            if not client:
                logger.error("Gemini client not available")
                return [None] * len(texts)
                
            # Use the correct Gemini embedding API
            embeddings = []
            for text in texts:
                try:
                    # Use the correct Gemini API call with proper error handling
                    result = genai.embed_content(
                        model=f"models/{EMBEDDING_MODEL}",
                        content=text,
                        task_type="retrieval_document"
                    )
                    
                    # Extract the embedding from the response - handle different response formats
                    embedding_data = None
                    
                    # Try different ways to access the embedding
                    try:
                        if isinstance(result, dict):
                            embedding_data = result.get('embedding')
                        elif hasattr(result, '__getitem__'):
                            embedding_data = result['embedding']
                        else:
                            # Try to get embedding attribute safely
                            embedding_data = getattr(result, 'embedding', None)
                    except (KeyError, TypeError, AttributeError):
                        embedding_data = None
                    
                    if embedding_data is not None:
                        if isinstance(embedding_data, list):
                            embeddings.append(embedding_data)
                        elif hasattr(embedding_data, '__iter__'):
                            embeddings.append(list(embedding_data))
                        else:
                            logger.warning(f"Unexpected embedding format: {type(embedding_data)}")
                            embeddings.append(None)
                    else:
                        logger.warning(f"No embedding data in response for text: {text[:50]}...")
                        embeddings.append(None)
                        
                except Exception as text_error:
                    logger.warning(f"Failed to embed individual text: {text_error}")
                    embeddings.append(None)
            
            successful_embeddings = sum(1 for e in embeddings if e is not None)
            logger.info(f"Successfully embedded {successful_embeddings}/{len(texts)} texts in batch")
            return embeddings
            
        except Exception as e:
            error_str = str(e)
            delay = initial_delay * (2 ** attempt)  # Exponential backoff
            
            # Check for rate limiting or API errors
            if ("429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower()) and attempt < max_retries - 1:
                logger.warning(f"Rate limit hit on batch, waiting {delay:.1f} seconds (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                continue
            elif "embed_content" in error_str and "not" in error_str:
                # API method not available - use graceful fallback
                logger.error("Gemini embed_content method not available - using graceful fallback")
                return [None] * len(texts)
            else:
                logger.error(f"Embedding API error on attempt {attempt + 1}: {error_str}")
                break
    
    # All retries failed - return None embeddings for graceful degradation
    logger.warning(f"Failed to embed batch after {max_retries} retries - using graceful fallback")
    return [None] * len(texts)

def _parse_embeddings_response(resp, expected_count: int) -> List[Optional[List[float]]]:
    """Parse embeddings from various SDK response shapes."""
    embeddings = []
    try:
        # try iterable response
        for item in resp:
            # item may be a simple object with 'values' or 'embedding'
            val = getattr(item, 'values', None) or getattr(item, 'embedding', None) or item
            if hasattr(val, '__iter__'):
                embeddings.append(list(val))
            else:
                # fallback to string parsing
                embeddings.append([float(x) for x in str(val).split() if x])
    except TypeError:
        # resp not iterable, try attribute access
        val = getattr(resp, 'data', None) or getattr(resp, 'embeddings', None) or resp
        if isinstance(val, list):
            for item in val:
                v = getattr(item, 'values', None) or getattr(item, 'embedding', None) or item
                embeddings.append(list(v) if hasattr(v, '__iter__') else [float(x) for x in str(v).split() if x])
        else:
            # single embedding
            v = getattr(val, 'values', None) or getattr(val, 'embedding', None) or val
            embeddings.append(list(v) if hasattr(v, '__iter__') else [float(x) for x in str(v).split() if x])

    # Ensure each embedding is a list of floats and pad/truncate if needed
    cleaned = []
    for emb in embeddings:
        cleaned_emb = [float(x) for x in emb]
        cleaned.append(cleaned_emb)
    
    # Fill missing embeddings with None if response was shorter than expected
    while len(cleaned) < expected_count:
        cleaned.append(None)
        
    return cleaned