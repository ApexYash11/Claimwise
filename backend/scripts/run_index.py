import os
import sys
import json
import uuid
from pathlib import Path

# Ensure repository backend is on path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / '.env')

from src.rag import index_documents

def main():
    # Read extracted text produced by tmp_post_test (it prints to stdout only),
    # so this script expects a local file called extracted_text.txt in the backend folder
    extracted_file = ROOT / 'extracted_text.txt'
    if not extracted_file.exists():
        print('No extracted_text.txt found in backend; run /test-gemini and save the text to this file first.')
        return

    text = extracted_file.read_text(encoding='utf-8')
    document_id = str(uuid.uuid4())
    print('Indexing document id=', document_id)
    try:
        result = index_documents(text, document_id)
        print('Indexed', len(result), 'chunks')
        # print sample first chunk metadata
        if result:
            print('First chunk length:', len(result[0][0]))
            print('First embedding length:', len(result[0][1]))
    except Exception as e:
        print('Indexing failed:', e)

if __name__ == '__main__':
    main()
