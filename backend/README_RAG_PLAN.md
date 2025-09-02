# ClaimWise Backend - RAG Implementation

A FastAPI backend implementing hybrid PDF extraction and Retrieval-Augmented Generation (RAG) for insurance policy analysis.

## Features

- **Hybrid PDF Extraction**: Local PyPDF2 extraction with Gemini Files API integration
- **RAG Pipeline**: Chunking, embeddings, and vector similarity search using pgvector
- **Production Ready**: Comprehensive logging, error handling, and fallbacks
- **Flexible Indexing**: Background or synchronous indexing modes
- **API Integration**: Gemini for embeddings and generation with graceful fallbacks

## Architecture

```
PDF Upload → Extract Text (PyPDF2) → Chunk Text → Generate Embeddings → Store in Supabase
                                                                              ↓
User Query → Embed Query → Vector Search (pgvector) → Build Context → Generate Answer
```

## Requirements

### Environment Variables

Create `backend/.env` with:

```bash
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Recommended for server ops
SUPABASE_JWT_SECRET=your-jwt-secret

# Storage
SUPABASE_STORAGE_BUCKET=policies

# Gemini API (Optional - enables embeddings and generation)
GEMINI_API_KEY=AIzaSyC...

# Other API Keys (Optional)
GROQ_API_KEY=gsk_...

# Vector Configuration
EMBEDDING_DIM=768  # Must match your DB vector column dimension
```

### Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),  -- Adjust dimension to match EMBEDDING_DIM
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION vector_search_document_chunks(
    query_embedding VECTOR(768),
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(id INTEGER, content TEXT, score FLOAT)
LANGUAGE SQL
AS $$
    SELECT 
        document_chunks.id,
        document_chunks.content,
        1 - (document_chunks.embedding <=> query_embedding) as score
    FROM document_chunks
    WHERE embedding IS NOT NULL
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT limit_count;
$$;

-- Optional: Create HNSW index for faster similarity search
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

### Python Dependencies

```bash
pip install -r backend/requirements.txt
```

Required packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `supabase` - Database client
- `PyPDF2` - Local PDF extraction
- `google-generativeai` - Gemini API (optional)
- `python-jose[cryptography]` - JWT handling
- `python-multipart` - File upload support
- `pytest` - Testing framework

## Quick Start

### 1. Setup Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Database Migrations

Execute the SQL commands from the "Database Setup" section in your Supabase dashboard.

### 4. Start the Server

```bash
# Development mode
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. Test the Implementation

```bash
# Run unit tests
pytest tests/ -v

# Run smoke test (requires sample PDF)
python scripts/smoke_test_rag.py

# Test specific endpoint
curl -X POST "http://localhost:8000/upload-policy" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@sample.pdf" \
  -F "policy_name=Test Policy" \
  -F "sync_indexing=true"
```

## API Endpoints

### Upload Policy
```http
POST /upload-policy
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- file: PDF file (optional)
- text_input: Raw text (optional)  
- policy_name: Policy name (optional)
- policy_number: Policy number (optional)
- sync_indexing: boolean (default: false) - Enable synchronous indexing for dev

Response:
{
  "policy_id": "uuid",
  "extracted_text": "Policy text...",
  "status": "indexing_started",
  "indexing_mode": "background" | "synchronous"
}
```

### Chat with Policy
```http
POST /chat
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "policy_id": "uuid",
  "question": "What is covered under this policy?"
}

Response:
{
  "answer": "Based on your policy...",
  "citations": [
    {
      "id": 123,
      "excerpt": "Relevant chunk text...",
      "score": 0.95
    }
  ]
}
```

### Other Endpoints
- `GET /healthz` - Health check
- `POST /analyze-policy` - Policy analysis
- `POST /compare-policies` - Policy comparison
- `GET /activities` - User activity log
- `GET /dashboard/stats` - Dashboard statistics

## Development

### Running Tests

```bash
# All tests
pytest tests/ -v

# Specific test file
pytest tests/test_rag.py -v

# With coverage
pytest tests/ --cov=src --cov-report=html
```

### Smoke Testing

```bash
# Place a PDF file at backend/src/sample.pdf, then:
python scripts/smoke_test_rag.py

# Or with custom file:
python scripts/smoke_test_rag.py /path/to/your/document.pdf
```

### Development Mode Features

Enable synchronous indexing for immediate feedback:
```bash
curl -X POST "http://localhost:8000/upload-policy" \
  -F "file=@test.pdf" \
  -F "sync_indexing=true"
```

## Configuration Options

### Indexing Modes

- **Background (default)**: Non-blocking indexing using FastAPI BackgroundTasks
- **Synchronous**: Immediate indexing with response delay (dev mode)

### Embedding Configuration

- **EMBEDDING_DIM**: Must match your Postgres vector column dimension
- **Batch Size**: Configurable in `embeddings.py` (default: 10 texts per API call)
- **Retry Logic**: Exponential backoff for rate limits (default: 3 retries)

### Fallback Behavior

1. **Embeddings**: If Gemini fails, stores chunks without embeddings
2. **Generation**: Falls back from Gemini → Groq → basic pattern matching
3. **Extraction**: Local PyPDF2 (no remote model calls)

## Production Deployment

### Environment Setup
- Use `SUPABASE_SERVICE_ROLE` for server-side operations
- Set appropriate `EMBEDDING_DIM` for your model
- Configure logging levels via uvicorn/gunicorn

### Database Optimization
- Create HNSW index on embedding column for faster search
- Monitor query performance and adjust chunk sizes
- Consider partitioning for large document volumes

### Monitoring
- All operations logged with structured logging
- Health check endpoint for load balancers
- Error tracking with exception details

## Troubleshooting

### Common Issues

1. **"Embedding dimension mismatch"**
   - Ensure `EMBEDDING_DIM` matches your DB vector column
   - Check your embedding model's output dimension

2. **"RPC vector_search_document_chunks does not exist"**
   - Run the database setup SQL commands
   - Verify the function was created successfully

3. **"PyPDF2 not available"**
   - Install: `pip install PyPDF2`
   - Verify dynamic import is working

4. **Gemini API quota exceeded (429)**
   - Check your Google Cloud billing and quotas
   - Increase embedding batch delays in `embeddings.py`
   - Use fallback modes for development

### Debug Mode

Enable detailed logging:
```bash
export LOG_LEVEL=DEBUG
uvicorn src.main:app --reload --log-level debug
```

### Testing Database Connection

```python
# Quick connection test
from src.db import supabase
result = supabase.table("policies").select("*").limit(1).execute()
print("Connection successful:", bool(result.data))
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add unit tests for new features
3. Update this README for significant changes
4. Test both local and Gemini-enabled paths

## License

See LICENSE file for details.
