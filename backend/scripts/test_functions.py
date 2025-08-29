import sys
from pathlib import Path

# Ensure backend package is importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

from src.gemini_files import extract_text
from src.rag import chunk_texts
from src.embeddings import embed_texts

def main():
    sample_pdf = ROOT / 'src' / 'sample.pdf'
    # Fallback to any PDF in the backend root
    if not sample_pdf.exists():
        candidates = list((ROOT).glob('*.pdf'))
        if candidates:
            sample_pdf = candidates[0]
        else:
            print('No PDF found to test; place one of your PDFs at backend/sample.pdf or in backend/')
            return

    print('Extracting text from:', sample_pdf)
    text = extract_text(str(sample_pdf))
    print('Extracted length:', len(text))
    print('Preview:\n', text[:500].replace('\n',' '))

    chunks = chunk_texts([text], chunk_size=200, overlap=20)
    print('Number of chunks:', len(chunks))
    if chunks:
        print('First chunk preview:', chunks[0][:300])

    # Try embeddings for first chunk (guarded)
    if chunks:
        try:
            emb = embed_texts([chunks[0]])
            print('Embedding generated. Length:', len(emb[0]))
        except Exception as e:
            print('Embedding failed:', str(e))

if __name__ == '__main__':
    main()
