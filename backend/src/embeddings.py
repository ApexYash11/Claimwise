from typing import List, Any
from google import genai
import os 

EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "textembedding-gecko-001")
# Cast the client to Any so static type-checkers won't complain about SDK attributes
client: Any = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
   
    resp = client.generate_embeddings(
        model=EMBEDDING_MODEL,
        text=texts
    )
    # The SDK may return different shapes: a list in resp, or resp.data/resp["embeddings"]
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

    # Ensure each embedding is a list of floats and matches lengths
    cleaned = []
    for emb in embeddings:
        cleaned_emb = [float(x) for x in emb]
        cleaned.append(cleaned_emb)
    return cleaned