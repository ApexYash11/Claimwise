# API Usage Analysis - ClaimWise Backend

## Current API Usage Summary

### 🚫 **REMOVED API Usage (Now Local Only)**
- **PDF Text Extraction**: Now 100% local using PyPDF2
  - ❌ No longer uses Gemini Files API for text extraction
  - ✅ All text extraction happens locally via PyPDF2
  - ✅ Saves API quota and ensures deterministic results

### 🔄 **Current API Usage (Where APIs Are Still Used)**

#### 1. **Gemini Embeddings API** 
- **File**: `backend/src/embeddings.py`
- **Function**: `embed_texts()`
- **Usage**: Converting text chunks to vector embeddings for semantic search
- **Rate Limits**: 
  - Batch size: 10 texts per API call (configurable)
  - Retry logic: 3 attempts with exponential backoff
  - Handles 429 rate limit errors gracefully
- **Fallback**: If API fails, chunks are stored without embeddings (can be re-embedded later)

#### 2. **Gemini Text Generation API**
- **File**: `backend/src/llm.py`
- **Function**: `make_gemini_request()`
- **Usage**: Generating responses for chat queries using RAG context
- **Rate Limits**: 3 retries with 1-second delay
- **Fallback Chain**: Gemini → Groq → Basic pattern matching

#### 3. **Groq API (Secondary LLM)**
- **File**: `backend/src/llm_groq.py`
- **Function**: `generate_response()`
- **Usage**: Backup LLM when Gemini fails
- **Rate Limits**: Basic retry logic

## API Quota Conservation Strategy

### ✅ **Implemented Optimizations**

1. **Text Extraction = 0 API Calls**
   - All PDF extraction uses PyPDF2 locally
   - No model-based extraction calls

2. **Efficient Embeddings with Caching**
   - ✅ Batch processing: 20-30 texts per API call (configurable via `EMBEDDING_BATCH_SIZE`)
   - ✅ Smart retry with exponential backoff
   - ✅ Content fingerprint-based caching to avoid duplicate API calls
   - ✅ Graceful degradation if API unavailable

3. **Content Filtering & Optimization**
   - ✅ Boilerplate content removal (headers, footers, legal disclaimers)
   - ✅ Chunk deduplication to eliminate identical content
   - ✅ Quality filtering to skip low-value chunks
   - ✅ Pre-processing reduces embedding costs by 20-40%

4. **Smart LLM Provider Selection**
   - ✅ Groq as primary LLM (faster, often cheaper than Gemini)
   - ✅ Intelligent fallback chain: Groq → Gemini → Pattern matching
   - ✅ Configurable provider preference via `PREFER_GROQ` setting
   - ✅ Only calls LLM API when user asks questions

5. **Database-Level Caching**
   - ✅ Embedding cache table with content fingerprints
   - ✅ Automatic cache hit detection and reuse
   - ✅ Usage tracking and cache cleanup functions

### 📊 **Estimated API Usage Per Operation**

```
Upload PDF Document (OPTIMIZED):
├── Text Extraction: 0 API calls (local PyPDF2) ✅
├── Content Filtering: 0 API calls (local processing) ✅
├── Chunking & Deduplication: 0 API calls (local processing) ✅
├── Cache Check: 0 API calls (database lookup) ✅
├── Embeddings: ~1-5 API calls (after caching & filtering) ✅
│   └── Example: 50 chunks → 20 unique → 15 not cached → 1 batch call
└── Total: 1-5 API calls (reduced from 10-25)

Chat Query (OPTIMIZED):
├── Query Embedding: 1 API call (may be cached) ✅
├── Vector Search: 0 API calls (database operation) ✅
├── Response Generation: 1 API call (Groq preferred) ✅
└── Total: 1-2 API calls

Policy Analysis (OPTIMIZED):
└── Similar to chat query: ~1-2 API calls ✅
```

### 🔧 **Configuration Options**

#### Environment Variables for API Control:
```bash
# Embeddings (Optional - system degrades gracefully if missing)
GEMINI_API_KEY=your_gemini_key
GEMINI_EMBEDDING_MODEL=textembedding-gecko-001
EMBEDDING_DIM=768

# Text Generation (Optional - has fallbacks)
GROQ_API_KEY=your_groq_key

# Batch Configuration (in code)
EMBEDDING_BATCH_SIZE=10  # Reduce to save quota, increase for speed
MAX_RETRIES=3           # API retry attempts
```

## Rate Limit Handling

### **Gemini API Limits**
- **Embeddings**: 1,500 requests/minute (free tier)
- **Generation**: 15 requests/minute (free tier)
- **Strategy**: Batch embeddings (10x efficiency), retry with backoff

### **Error Recovery**
1. **429 Rate Limit**: Exponential backoff (1s, 2s, 4s)
2. **API Down**: Store chunks without embeddings, continue processing
3. **Quota Exceeded**: Graceful degradation, still allows text-based search

## Development vs Production

### **Development Mode** (sync_indexing=true)
```bash
curl -X POST "http://localhost:8000/upload-policy" \
  -F "file=@document.pdf" \
  -F "sync_indexing=true"
```
- Immediate embedding processing
- Higher API usage but instant feedback

### **Production Mode** (default)
```bash
curl -X POST "http://localhost:8000/upload-policy" \
  -F "file=@document.pdf"
```
- Background embedding processing
- Spreads API calls over time
- Better for rate limit management

## Monitoring API Usage

### **Logging Points**
- All API calls are logged with success/failure status
- Rate limit hits are logged as warnings
- Fallback usage is tracked

### **Health Checks**
- `GET /healthz` includes API connectivity status
- Dashboard shows successful vs failed API operations

## Cost Estimation

### **Gemini API Pricing** (approximate)
- Embeddings: ~$0.0001 per 1K characters
- Generation: ~$0.0015 per 1K characters

### **Typical Document Processing**
```
10-page PDF (~5,000 words):
├── Extraction: $0 (local)
├── Embeddings: ~$0.05 
├── 10 chat queries: ~$0.15
└── Total: ~$0.20 per document
```

## Recommendations

### 🔄 **High Volume**
1. **Use larger embedding batch sizes (20–50 chunks per call)**
   - Modify `EMBEDDING_BATCH_SIZE` in `embeddings.py`
   - Reduces API calls by 2-5x compared to default batch size of 10
   - Monitor rate limits and adjust delays if needed

2. **Enable background processing (production mode) to spread API calls**
   - Use default `sync_indexing=false` for uploads
   - Distributes API load over time via FastAPI BackgroundTasks
   - Better rate limit compliance for high document volumes

3. **Cache embeddings to avoid duplicate API calls**
   - Implement content hash-based caching for identical chunks
   - Store embeddings with content hashes in database
   - Skip embedding generation for already-processed content

4. **Monitor rate limits and scale batch delays accordingly**
   - Increase delays between batches during peak usage
   - Implement adaptive backoff based on 429 responses

### 🛠️ **Development**
1. **Test with small PDFs to conserve quota**
   - Use 1-2 page sample documents for testing
   - Focus on functionality validation rather than large content processing
   - Create test suite with minimal API usage

2. **Use sync mode for quick feedback**
   - Enable `sync_indexing=true` for immediate results
   - Allows real-time debugging of embedding/indexing pipeline
   - Switch to async mode once functionality is verified

3. **Run with no API keys to confirm graceful degradation**
   - Test with `GEMINI_API_KEY` and `GROQ_API_KEY` unset
   - Verify system continues to work for text extraction and storage
   - Ensure error messages are user-friendly when APIs unavailable

### 💰 **Cost Optimization**
1. **Pre-filter boilerplate content before embedding**
   - Remove headers, footers, and repetitive legal text
   - Filter out non-informative sections (page numbers, disclaimers)
   - Focus embeddings on policy-specific content only

2. **Deduplicate similar/identical chunks**
   - Implement content similarity detection before embedding
   - Skip embedding for chunks with >95% similarity to existing ones
   - Use text hashing for exact duplicate detection

3. **Cache embeddings for repeated uploads**
   - Store embeddings with content fingerprints
   - Reuse embeddings across document versions with identical sections
   - Implement TTL-based cache invalidation for stale embeddings

4. **Prefer Groq for generation, Gemini only for embeddings**
   - Configure Groq as primary LLM (faster, often cheaper)
   - Use Gemini primarily for embedding generation
   - Reserve Gemini generation for complex analysis tasks only
