"""
Gemini-only RAG test script

Requirements satisfied:
- Uses google-genai SDK for file upload / extraction and embeddings.
- Does NOT use PyPDF2 or any local PDF parser.
- Loads `.env` for GEMINI_API_KEY.

Usage (PowerShell):
  $env:VIRTUAL_ENV = "d:\\claimwise\\backend\\venv"
  $env:PATH = "d:\\claimwise\\backend\\venv\\Scripts;" + $env:PATH
  $env:PYTHONPATH = "d:\\claimwise\\backend"
  python backend/scripts/test_gemini_rag.py [path/to/file.pdf]
"""
import os
import sys
import time
import textwrap
from pathlib import Path
from dotenv import load_dotenv

# Load env from backend/.env if present
ROOT = Path(__file__).resolve().parents[1]
env_path = ROOT / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

# Import the google-genai Client (this repo uses google.genai / genai.Client)
gemini = None
client = None
try:
    from google import genai
    api_key = os.getenv('GEMINI_API_KEY')
    client = genai.Client(api_key=api_key)
    gemini = genai
except Exception as e:
    # keep client/gemini as None for clearer error handling below
    gemini = None
    client = None


def _find_pdf_candidate() -> Path:
    # Prefer explicit arg, else use any PDF in backend root
    if len(sys.argv) > 1:
        p = Path(sys.argv[1])
        return p
    # search common locations
    candidates = list(ROOT.glob('*.pdf')) + list((ROOT / 'src').glob('*.pdf'))
    return candidates[0] if candidates else None


def extract_with_gemini(file_path: str) -> str:
    """Upload file to Gemini Files and ask the model to extract text.

    This function attempts multiple SDK call shapes to remain compatible with
    different google-genai versions. It raises a RuntimeError with helpful
    details on failure.
    """
    if client is None:
        raise RuntimeError('google-genai Client not available or GEMINI_API_KEY not set in .env')

    # Upload file via client.files.upload
    try:
        uploaded = client.files.upload(file=file_path)
    except Exception as e:
        raise RuntimeError(f'File upload to Gemini failed: {e}')

    # Build prompt and request extraction using client.models.generate_content
    prompt = (
        'You are a text extraction assistant. Extract the full human-readable text from the provided PDF file. '
        'Preserve line breaks and paragraphs. Return only the extracted text.'
    )

    try:
        resp = client.models.generate_content(model='gemini-1.5-pro', contents=[prompt, uploaded])
        text = getattr(resp, 'text', None) or getattr(resp, 'content', None) or str(resp)
        return text
    except Exception as e:
        raise RuntimeError(f'Gemini generation/extraction failed: {e}')


def chunk_texts(text: str, chunk_size: int = 500, overlap: int = 50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        j = min(i + chunk_size, len(words))
        chunks.append(' '.join(words[i:j]))
        i = j - overlap
        if i < 0:
            i = 0
    return chunks


def embed_with_gemini(chunks, model: str = 'textembedding-gecko-001'):
    if gemini is None:
        raise RuntimeError('google-genai SDK not available; cannot create embeddings')

    # Attempt common SDK shapes for embeddings
    try:
        if hasattr(gemini, 'embeddings') and hasattr(gemini.embeddings, 'create'):
            resp = gemini.embeddings.create(model=model, input=chunks)
            # resp.data is common
            if hasattr(resp, 'data'):
                embs = []
                for item in resp.data:
                    vec = getattr(item, 'embedding', None) or item.get('embedding')
                    embs.append(list(vec))
                return embs

        # google.generativeai alternative
        if hasattr(gemini, 'Embedding') or hasattr(gemini, 'generate_embeddings'):
            # try a high-level call
            try:
                resp = gemini.generate_embeddings(model=model, input=chunks)
                if hasattr(resp, 'data'):
                    return [list(d.embedding) for d in resp.data]
            except Exception:
                pass

        # fallback: some SDKs return raw dict
        raise RuntimeError('Unsupported embeddings API on installed SDK')
    except Exception as e:
        raise RuntimeError(f'Embedding generation failed: {e}')


def main():
    pdf = _find_pdf_candidate()
    if not pdf:
        print('No PDF found to test. Provide a path as argument or place a PDF in backend/')
        return

    print('Using PDF:', pdf)
    start = time.time()
    try:
        text = extract_with_gemini(str(pdf))
    except Exception as e:
        print('Extraction failed:', e)
        return
    dur = time.time() - start
    print(f'Extracted {len(text)} characters in {dur:.1f}s')

    chunks = chunk_texts(text, chunk_size=500, overlap=50)
    print('Number of chunks:', len(chunks))

    if not chunks:
        print('No chunks produced; aborting embedding step')
        return

    try:
        embs = embed_with_gemini(chunks)
    except Exception as e:
        print('Embedding step failed:', e)
        return

    dim = len(embs[0]) if embs and embs[0] else 0
    print('Embedding dimension:', dim)
    print('\nFirst chunk preview:\n')
    print(textwrap.fill(chunks[0][:1000], width=120))
    print('\nFirst embedding (first 10 values):')
    print(embs[0][:10])


if __name__ == '__main__':
    main()
