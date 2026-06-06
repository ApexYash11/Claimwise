# Backend Optimization Plan

Based on `BACKEND-PERFORMANCE-AUDIT.md`. This is the working implementation plan.

---

## Sprint 1: Quick Wins (Day 1)

### 1.1 Fix Database Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON public.policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_user_id_created_at ON public.policies(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON public.chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id_created_at ON public.chat_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON public.comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id_created_at ON public.comparisons(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id_created_at ON public.activities(user_id, created_at DESC);
```

### 1.2 Stop Fetching Overloaded Fields

- **`dashboard.py:406`** — remove `extracted_text` from metrics SELECT
- **`dashboard.py:76`** — remove `comparison_result` from history SELECT
- **`dashboard.py:25-38`** — add `.range(0, 50)` to policies query in history
- **`chat.py:21-26`** — only fetch `policy_name`, `policy_number` from policies (not `extracted_text` — RAG already provides context)
- **`chat.py:125-131`** — same: don't fetch `extracted_text` for all policies

### 1.3 Fix Bugs

- **`chat.py:94-101`** — add `"created_at": datetime.utcnow().isoformat()` to chat_logs INSERT
- **`chat.py:153-161`** — same fix for multi-policy chat
- **`dashboard.py:209-216`** — change `supabase_storage.table("activities")` → `supabase.table("activities")`
- **`rag.py:16`** — set `EXPECTED_EMBED_DIM = int(os.getenv("EMBEDDING_DIM", "768"))` (match env default)

### 1.4 Reduce LLM Timeouts

- **`llm_groq.py:121,137,153`** — reduce `timeout=30` → `timeout=8`
- **`llm_groq.py:104-189`** — add early exit: if 429 received, skip remaining Groq keys

---

## Sprint 2: Caching (Day 2)

### 2.1 Wire Backend In-Memory Cache

**Files to modify per endpoint:**

| Endpoint | Cache Key | TTL | Priority |
|---|---|---|---|
| `GET /dashboard/stats` | `stats:{user_id}` | 60s | Highest |
| `GET /dashboard/metrics` | `metrics:{user_id}` | 60s | Highest |
| `GET /history` | `history:{user_id}:{page}:{page_size}` | 30s | High |
| `GET /activities` | `activities:{user_id}` | 30s | High |
| `GET /policies` | `policies:{user_id}` | 30s | High |

**Pattern to apply in each route:**
```python
from src.caching import cache_manager

cache = cache_manager.create_cache("dashboard", max_size=1000, default_ttl=60)
cached = cache.get(f"stats:{user_id}")
if cached:
    return cached
# ... query logic ...
result = {...}
cache.set(f"stats:{user_id}", result)
return result
```

**Invalidation:** Clear cache on:
- `POST /upload-policy` → clear `policies:{user_id}`, `stats:{user_id}`, `metrics:{user_id}`
- `DELETE /policies/{id}` → clear all caches for that user
- `POST /chat` → clear `history:{user_id}:*`
- `POST /analyze-policy` → clear `metrics:{user_id}`, `policies:{user_id}`

### 2.2 Wire Embedding Cache

**`embeddings.py:345-400`** — Enable the existing cache in `embed_texts`. The `get_embedding_cache()` function already exists with 24h TTL and LRU eviction. The `embed_texts` method already checks `self.cache.get(cache_key)` — ensure the cache is actually populated.

### 2.3 Wire LLM Response Cache

**`llm.py:41` / `llm_groq.py:104`** — Before making LLM call, check `get_llm_response_cache()` for identical question hash. Cache responses for 1 hour.

---

## Sprint 3: Dashboard Rewrite (Day 3)

### 3.1 Consolidate `/dashboard/stats`

- Merge the two queries (policies count + comparisons count) into a single Supabase call
- Return cached results
- Expected: 7-10s → ~5ms

### 3.2 Rewrite `/dashboard/metrics`

- **Remove dependency on `extracted_text`** — all coverage amounts and risks should be stored in `validation_metadata`
- Compute `protection_score`, `risks_found`, `total_coverage` once on policy upload/analysis, store in `validation_metadata`
- Metrics endpoint just reads pre-computed values
- Expected: 7-10s → <100ms

### 3.3 Pre-compute on Analysis

- **`analysis.py:31-43`** — when analysis completes, also compute and store dashboard metrics fragments:
  ```python
  metadata["computed_metrics"] = {
      "coverage_amount": extracted_coverage,
      "risk_count": len(gaps) + len(exclusions),
      "validation_score_pct": validation_score * 100,
  }
  ```

---

## Sprint 4: History Rewrite (Day 3-4)

### 4.1 Use Real Activities Table

- **`dashboard.py:87-167`** — replace the synthetic activity generation (iterating policies + chat_logs + comparisons) with a single query against the real `activities` table
- Add proper pagination with SQL `range()` + `count=exact`
- Only fetch raw comparison data when expanding a specific item

### 4.2 Add CreatedAt to All Logging

- Ensure every `log_activity()` call and every chat_log INSERT includes `created_at`
- Verify `activities` table has proper RLS policies (from `supabase_schema.sql`)

---

## Sprint 5: Chat Optimization (Day 4-5)

### 5.1 Circuit Breaker for LLM

**New file: `circuit_breaker.py`**
```python
class CircuitBreaker:
    STATES = {"CLOSED", "OPEN", "HALF_OPEN"}
    
    def __init__(self, failure_threshold=3, recovery_timeout=60):
        self.failure_count = defaultdict(int)
        self.state = defaultdict(lambda: "CLOSED")
        self.last_failure_time = {}
    
    def call(self, service_name, fn, *args, **kwargs):
        if self.state[service_name] == "OPEN":
            if time.time() - self.last_failure_time[service_name] > self.recovery_timeout:
                self.state[service_name] = "HALF_OPEN"
            else:
                raise CircuitBreakerOpen(f"{service_name} circuit is open")
        
        try:
            result = fn(*args, **kwargs)
            self.failure_count[service_name] = 0
            self.state[service_name] = "CLOSED"
            return result
        except Exception as e:
            self.failure_count[service_name] += 1
            self.last_failure_time[service_name] = time.time()
            if self.failure_count[service_name] >= self.failure_threshold:
                self.state[service_name] = "OPEN"
            raise
```

### 5.2 Parallel LLM Calls (Race Mode)

- Instead of trying Groq keys sequentially, fire all 3 Groq keys + Gemini simultaneously
- Return first successful response, cancel remaining
- This reduces worst-case from 30s to 8s (the fastest timeout)

### 5.3 Add Chat Session Caching

- Cache the last N policy texts in memory per user session
- Avoid re-fetching `extracted_text` from Supabase for every chat message

---

## Sprint 6: Frontend Caching (Day 5)

### 6.1 Add TanStack Query

```bash
cd frontend && npm install @tanstack/react-query
```

**Create `providers/query-provider.tsx`:**
```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### 6.2 Rewrite All Data Fetching

**Replace every `useEffect` + `fetchWithTimeout()` pattern with TanStack Query hooks.**

Example:
```tsx
// Before
const [policies, setPolicies] = useState([]);
useEffect(() => {
  fetchWithTimeout(`${API_URL}/policies`, {}, 12000)
    .then(res => res.json())
    .then(data => setPolicies(data.policies));
}, []);

// After
const { data: policies } = useQuery({
  queryKey: ["policies"],
  queryFn: () => fetchWithTimeout(`${API_URL}/policies`, {}, 12000).then(r => r.json()),
  select: (data) => data.policies,
});
```

### 6.3 Deduplicate Dashboard Calls

- Merge `/dashboard/stats`, `/dashboard/metrics`, and `/activities` into a **single** `/dashboard` endpoint that returns all 3
- Or: use TanStack Query's `useQueries` to fetch in parallel with proper staleTime
- Or: embed RecentActivity data directly into dashboard page (no separate component fetch)

---

## Sprint 7: Error Handling & Resilience (Day 6)

### 7.1 Fix Global Exception Handler

- **`main.py:24`** — register a catch-all exception handler that returns structured JSON

### 7.2 Remove Error Swallowing

- Audit all `except Exception: return []` / `except Exception: pass` patterns
- Replace with proper logging and minimal graceful degradation

### 7.3 Add Request Timeouts

- **`llm.py:41-101`** — add timeout to `make_gemini_request`
- **`rag.py:176-203`** — add timeout to `retrieve_top_k` RPC call

---

## Sprint 8: RAG & Embedding Optimization (Day 6-7)

### 8.1 Batch INSERT in index_documents

- **`rag.py:110-163`** — accumulate all chunk rows, single INSERT:
  ```python
  rows = [...]
  service_client.table("document_chunks").insert(rows).execute()
  ```

### 8.2 Fix Embedding Pipeline

- Reconcile `EMBEDDING_DIM` env var with actual provider dimension
- Wire embedding cache properly
- Add retry logic for embedding API calls

### 8.3 Optimize Vector Search

- Review IVFFlat index `lists` parameter (default may be too low)
- Consider HNSW index for better performance at scale

---

## Completion Criteria

| Metric | Before | After (Target) |
|---|---|---|
| `GET /dashboard/stats` | 7-10s | <200ms |
| `GET /dashboard/metrics` | 7-10s | <200ms |
| `GET /history` | 6-15s | <500ms |
| `GET /activities` | 3-5s | <200ms |
| `GET /policies` | 6-15s | <500ms |
| `POST /chat` (success) | 10+ s | <5s |
| `POST /chat` (quota exceeded) | 15-20s | <5s |
| `POST /upload-policy` | 2-10s | <3s (without embedding) |
| Frontend duplicate fetches | 4× for /policies | 1× |
| Cache hit rate | 0% | >80% |

---

## Dependency Graph

```
Sprint 1 (Indexes + Fixes)
  └── Sprint 2 (Caching depends on Sprint 1)
       └── Sprint 3 (Dashboard rewrite depends on Sprint 2)
       └── Sprint 4 (History rewrite depends on Sprint 2)
  Sprint 5 (Chat optimization)
  └── Sprint 6 (Frontend caching)
       └── Sprint 7 (Error handling)
            └── Sprint 8 (RAG optimization)
```

Sprints 1-2 are blockers for everything else. Sprint 5 can run in parallel with Sprints 3-4.
