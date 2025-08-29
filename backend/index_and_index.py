import requests, uuid, sys, json
from time import sleep
url = 'http://127.0.0.1:8000/test-gemini'
print('Posting PDF to /test-gemini...')
r = requests.post(url, files={'file':('Medical_Insurance_Policy_Sample_2.pdf', open(r'D:/claimwise/backend/Medical_Insurance_Policy_Sample_2.pdf','rb'),'application/pdf')})
print('HTTP', r.status_code)
try:
    data = r.json()
except Exception as e:
    print('Response not JSON:', r.text)
    sys.exit(2)
print('Got extracted_text length:', len(data.get('extracted_text','')))
extracted = data.get('extracted_text')
if not extracted:
    print('No extracted text; abort')
    sys.exit(1)

# Delay a short moment to ensure DB connectivity
sleep(1)

# Perform indexing using project code
print('Indexing document via src.rag.index_documents...')
from src.rag import index_documents
from src.db import supabase

doc_id = str(uuid.uuid4())
chunks = index_documents(extracted, doc_id)
print('Indexed', len(chunks), 'chunks')

# Verify rows in Supabase
print('Verifying inserted chunks via Supabase...')
res = supabase.table('document_chunks').select('id,document_id,content').eq('document_id', doc_id).execute()
print('Supabase query status, data len:', (res.status_code if hasattr(res, 'status_code') else 'ok'), len(res.data) if res and res.data else 0)
for i, row in enumerate(res.data or []):
    print(i, row.get('id'), len(row.get('content','')))

# Clean up: do not delete DB rows automatically
print('Done')
