# 🔍 ClaimWise — Deep Architectural Review

**Date**: May 30, 2026  
**Reviewer**: Senior Software Architect / Staff Engineer / Tech Lead

---

## Executive Summary

**Project Purpose**: AI-powered insurance policy analysis platform. Users upload PDF policies, receive LLM-powered analysis (coverage gaps, claim readiness), compare policies side-by-side, and chat with documents via RAG.

**Current Architecture**: Next.js 15 App Router (frontend) + FastAPI monolith (backend) + Supabase (PostgreSQL + auth + storage). Multiple LLM providers: Groq (primary with 3 API keys), Gemini (fallback), regex-based tertiary fallback.

**Overall Quality Score: 6.5/10**

**Biggest Strengths**:
- Comprehensive error handling architecture (both frontend and backend) with typed error hierarchies, recovery suggestions, and structured logging
- Sophisticated rate limiting with 5 strategies (sliding window, token bucket, etc.) and per-endpoint scoping
- Full-featured monitoring system with request tracking, p50/p95/p99 latency, endpoint-level stats
- Multi-provider LLM fallback chain (3 Groq keys → Gemini → pattern matching) for resilience

**Biggest Weaknesses**:
- Monolithic 1787-line `main.py` with zero controller/router separation — all 29 endpoints in one file
- Exception handler (`claimwise_exception_handler`) is defined but **never registered** on the FastAPI app — custom exceptions would produce raw 500 errors
- Rate limit middleware defined but never mounted — rate limiting only works via inline `_enforce_user_rate_limit()` calls at top of endpoints
- Zero test coverage — no test files exist in the entire repository
- Two API client implementations exist on the frontend (`api.ts` and `api-client.ts`) with no clear ownership

---

## Architecture Review

### Folder Structure

```
claimwise/
├── backend/src/     # 11 Python files, all logic
├── frontend/app/    # Next.js App Router pages
├── frontend/components/  # React components
├── frontend/lib/         # Utilities & API layer
├── docs/            # Documentation
└── test/            # Empty directory
```

**Pros**: Clean top-level separation. Frontend follows Next.js App Router conventions well. `lib/` and `types/` directories show maturity.

**Cons**: Backend `src/` has no controller/service/repository separation. The `test/` directory exists but is completely empty. No `migrations/` folder despite SQL migration files in `backend/sql/`.

### Service Boundaries

**Issue**: Zero separation of concerns on the backend. All endpoints, validation, DB access, and business logic are in:
- `main.py` (1787 lines) — routes, controllers, error handling, logging utilities
- Individual `llm*.py` files mix provider initialization, prompt construction, and response parsing

**Recommendation**: Extract into:

```
backend/src/
├── routes/          # FastAPI routers (auth, policies, chat, analysis, admin, monitoring)
├── services/        # Business logic (PolicyService, ChatService, AnalysisService)
├── repositories/    # Data access (PolicyRepo, ChatLogRepo, ActivityRepo)
├── middleware/      # rate_limit_middleware, performance_middleware
└── main.py          # Only app initialization + middleware registration
```

### Data Flow

```
Frontend (Next.js) → Supabase Auth (JWT) → FastAPI Backend → Supabase DB
                           ↓                                 ↓
                     Groq/Gemini LLM                   pgvector (RAG)
```

**Concern**: The chat flow in `main.py:892-919` has an overly complex fallback chain. It tries `retrieve_top_k()` from RAG (which can fail silently since `except` catches everything), then tries Gemini, then falls back to Groq's `chat_with_policy`. The fallback structure makes it impossible to trace where failures occur.

### Design Patterns Used

| Pattern | Location | Assessment |
|---------|----------|------------|
| Dependency Injection | `Depends(get_current_user)` on routes | ✅ Good |
| Decorator | `@handle_exceptions` in exceptions.py | ⚠️ Not used anywhere |
| Singleton | `ErrorLogger`, `monitor`, `rate_limiter`, `cache_manager` | ✅ Good |
| Strategy | `CacheStrategy`, `RateLimitStrategy` enums | ✅ Over-engineered for current usage |
| LRU Cache | `@lru_cache` on `decode_token` | ✅ Good, but security concern |
| Background Tasks | RAG indexing via `BackgroundTasks` | ✅ Good |
| Middleware | Performance middleware | ✅ Good |
| Factory | None | ❌ Missing |

---

## Frontend Review

### Component Organization

**Pros:**
- Clear separation: `components/ui/` for shadcn primitives, `components/analysis/`, `components/chat/`, etc. for domain components
- 51 reusable shadcn/ui components — a strong foundational UI library
- Pages are thin wrappers that delegate to feature components (e.g., `login/page.tsx` just renders `<LoginForm />`)
- Dynamic imports (`next/dynamic`) for lazy-loading heavy components (ChatWidget, RecentActivity)

**Cons:**
- `error-boundary.tsx` is in `components/` root rather than `components/ui/` or `components/common/`
- Two versions of `policy-comparison.tsx` and `policy-comparison-new.tsx` — indicates incomplete migration
- No component unit tests whatsoever
- No Storybook or component documentation

**Recommended Improvements:**
- Remove `policy-comparison-new.tsx` if `policy-comparison.tsx` is the canonical version
- Move `error-boundary.tsx` into `components/ui/` or `components/common/`
- Add basic render tests for key feature components

### State Management

**Cons:**
- Only React Context for auth (`use-auth.tsx`) and `next-themes` for theme — no global state management
- localStorage used as a persistence layer: `claimwise_uploaded_policy_ids`, `claimwise_uploaded_policy_infos`, `claimwise_chat_history_{userId}` — fragile and untyped
- Custom events (`window.dispatchEvent(new Event("stats:refresh"))`) for cross-component communication — this is an anti-pattern that makes data flow untraceable

**Recommended Improvements:**
- Introduce Zustand for shared state
- Replace custom events and localStorage with URL search params or a lightweight store
- Create a typed store for persisted state (recent policies, chat history)

### API Integration

**Major Issue**: Two parallel API clients exist:

1. `lib/api-client.ts` — Full-featured `ApiClient` class with caching, retry, error handling, and `ApiResponse<T>` types
2. `lib/api.ts` — Standalone functions (`uploadPolicies`, `comparePolicies`, `getPolicies`, etc.) using `fetchWithTimeout` directly

These are **never used together**. `api-client.ts`'s `ApiClient` instance is exported as `apiClient` but `api.ts` functions are what the pages actually import. This is dead code or a migration in progress.

**Recommended Improvements:**
- Delete `api.ts` if unused, or complete the migration by making all pages use `api-client.ts`
- Add methods to `ApiClient` for all backend endpoints
- Remove `fetch-with-timeout.ts` and `url-utils.ts` if consolidating into `api-client.ts`

### UI Architecture

**Pros:**
- Tailwind CSS with OKLCH color space for theming — modern and accessible
- `cn()` utility for class merging
- Dark mode via `next-themes`
- Responsive design with mobile detection hook

**Cons:**
- All 51 shadcn components are committed to the repo with no tests — they should either be in a private package or trimmed to only what's used
- `components.json` configures style "new-york" but many components may be unused — this adds weight

### Performance Concerns

- Landing page (`page.tsx`) is 382 lines with complex animations — consider it's already a client component
- `next.config.mjs` has production-only `optimizePackageImports` for Radix UI — good practice
- No bundle analysis or size budget configured
- `productionBrowserSourceMaps: false` is good for production

---

## Backend Review

### API Structure

**CRITICAL ISSUE**: All 29 routes in `main.py` (1787 lines). This is the single biggest architectural problem.

Routes include: health checks, monitoring (4 endpoints), upload, analyze, compare, chat, chat-multiple, history, dashboard/stats, dashboard/metrics, activities, debug (10+ endpoints), test endpoints, token refresh, and more.

**Recommended Improvements:**
- Split into:
  - `routes/auth.py` — login, refresh
  - `routes/policies.py` — CRUD + upload + analysis
  - `routes/chat.py` — chat, chat-multiple
  - `routes/dashboard.py` — stats, metrics
  - `routes/admin.py` — all debug endpoints (gated)
  - `routes/monitoring.py` — health, monitoring

### Business Logic Organization

**Cons:**
No service/use-case layer. Logic lives in:
1. Inline in `main.py` route handlers
2. Free functions in `llm.py`, `llm_groq.py`, `rag.py`
3. `log_activity()` defined as a standalone function (not in a service)

**Example**: `upload_policy` (lines 197-437) does: rate limiting, file validation, text extraction, document validation, storage upload, DB insert, background indexing scheduling, and activity logging — all in one function.

**Recommended Improvements:**
- Extract `PolicyService`, `ChatService`, `AnalysisService` classes
- Move `log_activity()` into an `ActivityService`
- Extract file validation logic into a `FileValidator` utility

### Database Access Patterns

**Cons:**
- No ORM — raw Supabase REST client with string table names (`supabase.table("policies")`)
- No repository pattern — queries are scattered across endpoints
- `create_client(url, key)` called inline in `delete_policy` for RLS-aware deletion — this creates a new Supabase client per request, wasting connections
- Multiple RPC calls in same request for `/history` endpoint (policies + chat_logs + comparisons)

**Example of fragmentation**: The word `"policies"` appears as a string literal in >15 places across main.py. A typo would only fail at runtime.

**Recommended Improvements:**
- Create a `PolicyRepository` class with typed methods: `find_by_user()`, `find_by_id()`, `create()`, `delete()`
- Create a singleton `SupabaseClientFactory` to avoid recreating clients
- Use `dataclass` or Pydantic models for database row representations

### Error Handling

**Paradox**: The `exceptions.py` file (323 lines) defines a thorough error hierarchy:

```
ClaimWiseError → ValidationError, AuthenticationError, AuthorizationError,
                 FileHandlingError, RateLimitError, DatabaseError,
                 ExternalAPIError, ProcessingError
```

**BUT**: The global `claimwise_exception_handler` (line 256) is **never registered** on the app. `main.py` line 129 simply does `app = FastAPI()` with no `app.add_exception_handler(ClaimWiseError, claimwise_exception_handler)`. If any custom exception is raised, FastAPI returns a generic 500.

Similarly, `@handle_exceptions` decorator is defined but never used on any route.

**Recommended Improvements:**
- Add `app.add_exception_handler(ClaimWiseError, claimwise_exception_handler)` in `main.py` startup
- Replumb routes to raise `ClaimWiseError` subclasses instead of raw `HTTPException`
- Use `@handle_exceptions` decorator on route handlers

### Validation

**Mixed:**
- Pydantic models used for JSON request bodies (`ChatRequest`, `CompareRequest`) — good
- File upload validation is manual (extension, MIME type, size) — adequate but should be extracted
- Two document validators exist: `document_validator.py` (keyword-based, used) and `medical_policy_validator.py` (LLM-enhanced, unused)
- No rate of upload limits per time window (only request count)

**Recommended Improvements:**
- Add magic byte validation for file uploads (`python-magic`)
- Decide on `medical_policy_validator.py` — either wire it in or remove it
- Extract file validation into reusable `FileValidator.validate()`

### Authentication

**Good:**
- JWT verification via `jose.jwt.decode()` with Supabase HS256
- `Depends(get_current_user)` consistently on all protected routes
- Admin check via env allowlist + DB role lookup
- Token refresh endpoint implemented

**Security Concern**: `decode_token()` is cached with `@lru_cache(maxsize=128)`. If a token is revoked, the cache still considers it valid until evicted. This is a security vulnerability.

**Recommended Improvements:**
- Remove `@lru_cache` from `decode_token()` in `auth.py:26`
- Implement token version checking for revocation support

### Logging

**Incomplete:**
- `structlog==25.4.0` is in `requirements.txt` but never imported or configured
- Currently using `logging.basicConfig(level=logging.INFO)` with `logging.getLogger(__name__)` — basic Python logging
- No structured JSON logging, no correlation IDs, no log shipping
- `logger.exception()` calls will leak tracebacks in production if not properly configured

**Recommended Improvements:**
- Configure `structlog` with JSON rendering for production
- Add correlation ID propagation (frontend `X-Request-ID` → backend logs)
- Add log level configuration via environment variable

---

## Database Review

### Schema Design
- `users`, `policies`, `chat_logs`, `document_chunks`, `activities`, `comparisons` tables
- `auth.users` → `public.users` sync via trigger — good pattern
- `document_chunks` has `UNIQUE(policy_id, chunk_index)` constraint — prevents duplicate indexing

### Query Efficiency

**Issues:**
1. `/history` endpoint does 4 sequential queries (policies + chat_logs + chat_logs count + comparisons)
2. `dashboard_metrics` fetches all policies with `extracted_text` field but only uses `validation_score` and `validation_metadata` — unnecessary data transfer
3. `dashboard_stats` queries `policies` for ID count and `comparisons` for ID count — could use a single COUNT query

### Missing Indexes

- `chat_logs(user_id)` — needed for history queries
- `activities(user_id, created_at)` — needed for activity feed
- `comparisons(user_id)` — needed for dashboard stats
- `policies(user_id, created_at)` — already has this from `order("created_at", desc=True)` usage

### Scalability Concerns
- ivfflat index on embeddings is good for approximate search, but HNSW is more performant for high-dimensional vectors at scale
- In-memory caching (`caching.py`) won't scale across multiple instances
- Rate limiting is per-process in-memory — defeats purpose behind a load balancer

---

## DevOps & Deployment Review

### Docker
- **No Dockerfile exists anywhere in the repository** — despite `docker-compose.yml` snippet in README
- `render.yaml` exists for Render deployment — uses `uvicorn src.main:app` directly
- No `.dockerignore`

### Build Process
- Frontend: `next build` (with ESLint + TS checks enforced)
- Backend: `pip install -r requirements.txt` then `uvicorn`
- **No build caching** — every Render deploy re-installs all 76+ Python packages

### CI/CD
- Only one GitHub Actions workflow: `check-deps.yml` — runs `pipdeptree` on push to `backend/**`
- **No test runner in CI** — not even a placeholder step
- **No lint step** — `ruff` or `black` not configured
- Vercel auto-deploys from Git, but there's no preview/staging environment

### Environment Management
- `.env.example` at backend root documents all required variables
- Frontend has `.env.local.example` and `.env.production`
- **Secret management**: API keys in env vars. No Vault, no AWS Secrets Manager, no Doppler.

---

## Security Review

### Authentication Risks
- JWT cache (`@lru_cache` on `decode_token`) means revoked tokens are accepted until evicted (max 128 entries) — **CRITICAL**
- No token blacklist/revocation mechanism
- `SUPABASE_JWT_SECRET` is required at startup or the app crashes with `ValueError`

### Authorization Risks
- Admin routes check `_is_admin_user()` which falls back to env allowlist if DB query fails — reasonable but the fallback silently degrades
- Debug routes require `ALLOW_DEBUG_ROUTES=true` in production — good gating

### Secret Management Issues
- API keys (Groq ×3, Gemini, OpenAI, Anthropic, Together) all in environment variables
- Multiple LLM keys suggest no centralized secrets management
- Supabase service role key used for storage operations — powerful key with elevated privileges

### Input Validation Gaps
- File upload validates extension + MIME type but not file content (magic bytes) — a renamed `.exe` to `.pdf` would pass
- No input sanitization for `text_input` field — XSS vector if text is rendered unsafely
- `question` field limited to 1000 chars via Pydantic — good, but no size limit on `text_input`

### OWASP Concerns
- **A01: Broken Access Control**: Some debug endpoints may leak user data across users (e.g., `debug_list_policies` only filters by `user_id` but uses service role client)
- **A02: Cryptographic Failures**: JWTs cached without invalidation mechanism
- **A04: Insecure Design**: Monolithic architecture with no defense in depth
- **A06: Vulnerable Components**: torch==2.8.0 and transformers==4.56.0 are large dependencies for an app that may not need them
- **A07: Identification and Authentication Failures**: Token refresh allows session extension without re-authentication

---

## Code Quality Review

### Code Smells

1. **`main.py:439`** — `from fastapi import Form` imported mid-file (should be at top)
2. **`main.py:1742`** — `from fastapi import APIRouter` also mid-file, then a router is created but never used for its intended purpose (only one endpoint on it)
3. **`main.py:401-413`** — Activity logged after potentially failing DB insert — if insert fails, the activity log still records it
4. **`rate_limiting.py:393-408`** — `rate_limit_middleware()` accesses `request.state.user_id` but no middleware sets this field — it will always be `None`
5. **`caching.py:66`** — `_access_order: OrderedDict = OrderedDict()` — used only for `move_to_end` in `get()` but never in eviction logic
6. **`monitoring.py:153-161`** — Slow request detection logged inside lock — blocking the monitor for all subsequent requests

### Technical Debt

| Item | Impact | Effort |
|------|--------|--------|
| Exception handler not registered | Custom errors → 500 | 1 hour |
| Rate limit middleware not mounted | Inline checks miss some paths | 1 hour |
| Two frontend API clients | Dead code, confusion | 2 hours |
| Monolithic main.py | Maintainability | 4-6 hours |
| No tests | Regression risk | Ongoing |
| Unused dependencies (torch, transformers) | 2GB+ deploy size | 1 hour |
| structlog in reqs but not used | Config gap | 30 min |
| `medical_policy_validator.py` unused | Dead code | 30 min |

### Duplicated Code

- `exceptions.py:237-247` and `:273-282` — identical status code mapping duplicated in `convert_to_http_exception` and `claimwise_exception_handler`
- `caching.py:87-100` and `:142-147` — expiration checking logic
- Frontend `api-client.ts` and `api.ts` — overlapping API layer
- `main.py:1460-1568` (dashboard_metrics) and `:1573-1641` (dashboard_metrics_dev) — near-duplicate logic

### Over-engineering

- 5 caching strategies (LRU, LFU, TTL, FIFO) implemented for a system that only uses default TTL
- 5 rate limit strategies when only sliding window and token bucket are configured
- `CacheManager` with named caches, context manager, decorator — but only `get_embedding_cache()` is actually called (in `embeddings.py`)

### Under-engineering

- Zero tests across the entire stack
- No TypeScript strict checks beyond `tsconfig.json` defaults
- No request ID propagation through the system (frontend generates `X-Request-ID`, backend generates separate `X-Request-ID`)
- No structured error responses from the backend (everywhere returns `{"detail": "message"}`)

---

## This Week's Changes Review

Based on git history, the most recent commits (within last ~3 weeks) were:

| Commit | Date | Description |
|--------|------|-------------|
| `bc28179` | May 9 | Enhanced Redis caching rollout documentation |
| `645d88d` | May 9 | Added Redis caching rollout plan |
| `0d350af` | Apr 15 | Updated footer/header links |
| `328dd0b` | Apr 19 | Enhanced landing page animations |
| `ac3e352` | Apr 19 | Optimized Next.js config |

### Analysis

**Redis Caching Documentation (May 9)**: Excellent planning document. Covers key patterns, TTLs, security, PII redaction, migration strategy, rollback plans, and monitoring. However, it's **only documentation** — no actual Redis implementation was committed. The gap between the plan and execution is significant.

**Landing Page Improvements (Apr 19)**: 382-line `page.tsx` was heavily modified with animations (float-soft, glow-pulse, reveal-on-load). The diff shows +627/-176 lines across 8 files. While visually impressive, these animations add to the bundle size and should be reviewed for performance impact on low-end devices.

**Next.js Config Optimization (Apr 19)**: `next.config.mjs` was updated with `optimizePackageImports` and webpack cache settings. Good practice but the Radix UI imports list is exhaustive (24 entries) — some may not be used.

### Potential Issues
1. The landing page is a client component with heavy CSS animations — no loading states or suspense boundaries
2. No tests accompany any of these changes
3. The Redis doc specifies implementation details that contradict the existing in-memory caching architecture — no migration plan from in-memory to Redis exists in code

---

## Priority Improvements

| Priority | Issue | Impact | Effort | Recommendation |
|----------|-------|--------|--------|---------------|
| 🔴 Critical | Exception handler not registered | Custom errors → raw 500 to client | 30 min | Add `app.add_exception_handler(ClaimWiseError, claimwise_exception_handler)` in `main.py` startup |
| 🔴 Critical | Zero test coverage | No regression safety | 8 hrs | Add pytest for backend API endpoints (auth, upload, analyze, chat) with mock Supabase |
| 🔴 Critical | JWT token caching without invalidation | Revoked tokens accepted | 1 hr | Remove `@lru_cache` from `decode_token()` in `auth.py:26` |
| 🟠 High | Monolithic 1787-line main.py | Maintainability blocker | 6 hrs | Split into `routes/` directory with FastAPI `APIRouter` |
| 🟠 High | Two frontend API clients | Dead code, confusion | 2 hrs | Pick one (recommend keeping `api-client.ts`), delete the other, migrate callers |
| 🟠 High | Rate limit middleware not mounted | Inconsistent enforcement | 1 hr | Register `app.middleware("http")(rate_limit_middleware())` in main.py |
| 🟠 High | No CI test step | Regressions ship silently | 2 hrs | Add `pytest` step to `check-deps.yml` workflow |
| 🟡 Medium | Dashboard duplicated logic | Maintenance burden | 2 hrs | De-duplicate `dashboard_metrics` and `dashboard_metrics_dev` |
| 🟡 Medium | structlog in reqs but unconfigured | Config gap | 30 min | Either configure structlog or remove from requirements |
| 🟡 Medium | File upload magic byte check missing | Security | 1 hr | Add `python-magic` check before accepting upload |
| 🟡 Medium | Unused dependencies (torch 2.8, transformers 4.56) | 2GB+ deploy footprint | 30 min | Audit and remove unused ML packages from root `requirements.txt` |
| 🟢 Low | Mid-file imports in main.py | Code smell | 15 min | Move all imports to top of file |
| 🟢 Low | custom event anti-pattern | Untraceable data flow | 3 hrs | Replace `window.dispatchEvent(stats:refresh)` with Zustand store subscription |

---

## OpenCode Refactor Tasks

### Task 1: Register Exception Handler

1. **Problem**: `claimwise_exception_handler` defined but never registered → custom `ClaimWiseError` exceptions produce generic 500 errors
2. **Root Cause**: Missing `app.add_exception_handler()` call in `main.py:129-163`
3. **Solution**: Register handler and replumb routes to raise `ClaimWiseError` subclasses instead of raw `HTTPException`
4. **Files**: `backend/src/main.py:129` (add handler), `backend/src/exceptions.py:256` (already correct)
5. **Steps**:
   - In `main.py`, after `app = FastAPI()`, add: `app.add_exception_handler(ClaimWiseError, claimwise_exception_handler)`
   - For each `raise HTTPException(status_code=400, detail=...)`, replace with `raise ValidationError(...)`
   - Verify: start app, trigger validation error → should see structured error response

### Task 2: Test Infrastructure

1. **Problem**: Zero tests in entire repo
2. **Root Cause**: No test framework configured, no CI step
3. **Solution**: Add `pytest` with `httpx.AsyncClient` for FastAPI, mock Supabase responses
4. **Files**: Create `backend/tests/conftest.py`, `backend/tests/test_auth.py`, `backend/tests/test_policies.py`, `backend/tests/test_chat.py`
5. **Steps**:
   - Create `conftest.py` with `TestClient` fixture and mock Supabase
   - Write `test_upload_policy_success`, `test_upload_policy_no_file`, `test_upload_policy_large_file`
   - Write `test_chat_success`, `test_chat_policy_not_found`
   - Add to CI: `pytest tests/ --cov=src` step

### Task 3: Split Monolithic main.py

1. **Problem**: 1787-line file, all routes in one place
2. **Root Cause**: No architectural discipline for route separation
3. **Solution**: Extract route groups into separate FastAPI `APIRouter` modules
4. **Files**: Create `backend/src/routes/__init__.py`, `routes/policies.py`, `routes/chat.py`, `routes/dashboard.py`, `routes/admin.py`, `routes/monitoring.py`
5. **Steps**:
   - Create `routes/policies.py` with: upload, list, get, delete, analyze, compare
   - Create `routes/chat.py` with: chat, chat-multiple
   - Create `routes/dashboard.py` with: stats, metrics
   - Create `routes/admin.py` with: all /debug/* endpoints
   - Create `routes/monitoring.py` with: health, monitoring/summary, endpoints
   - In `main.py`: `app.include_router(policies_router)`, etc.
   - Move shared utilities (`log_activity`, `_is_admin_user`, `_enforce_user_rate_limit`) to `services/` or keep in main.py temporarily

### Task 4: API Client Consolidation

1. **Problem**: Two conflicting frontend API layers (`api-client.ts` and `api.ts`)
2. **Root Cause**: Incomplete refactor from raw `fetch` calls to `ApiClient` class
3. **Solution**: Delete `api.ts`, migrate all callers to use `api-client.ts`
4. **Files**: `frontend/lib/api-client.ts` (keep), `frontend/lib/api.ts` (delete), plus all pages importing from `api.ts`
5. **Steps**:
   - Add methods to `ApiClient` class for: `getPolicies()`, `uploadPolicy()`, `comparePolicies()`, `chatWithPolicy()`
   - Re-export typed interfaces (PolicySummary, HistoryResponse) from `api-client.ts`
   - Update all page imports to use `api-client.ts`
   - Delete `api.ts`

### Task 5: Security — Remove JWT Cache

1. **Problem**: `@lru_cache` on `decode_token` means revoked JWTs are honored until cache eviction
2. **Root Cause**: Performance optimization without security consideration
3. **Solution**: Remove the cache, or add explicit token version checking
4. **Files**: `backend/src/auth.py:26`
5. **Steps**:
   - Remove `@lru_cache(maxsize=128)` from `decode_token`
   - Verify token decode still works (performance impact is negligible for JWT operations)
   - (Optional) Add `token_version` column to `users` table and check against it

---

## Senior Architect Verdict

**Is the current implementation acceptable?**
For a student/early-stage project: **mostly yes**. For production: **no**. The gaps in testing, error handling wiring, and architecture are typical MVP shortcuts that need addressing before scaling.

**What I would approve immediately:**
- Landing page animations and UX improvements ✅
- Redis caching plan and documentation ✅
- Next.js production optimizations ✅
- Error handling architecture (exception hierarchy, monitoring, rate limiting) — the *design* is solid ✅
- Multi-provider LLM fallback chain ✅

**What I would request changes on:**
1. Register the exception handler NOW — this is a 10-minute fix that prevents silent failures
2. Remove the JWT cache — security risk
3. Consolidate the frontend API layer — dead code is technical debt
4. Add at least smoke tests for the 3 core routes (upload, analyze, chat)
5. Split main.py — start with extracting admin/debug routes into their own router

**Top 5 Actions This Week:**

| # | Action | Reason | Effort |
|---|--------|--------|--------|
| 1 | Register `claimwise_exception_handler` and remove JWT `@lru_cache` | Security + error handling gaps | 45 min |
| 2 | Add pytest with 3-5 basic endpoint tests | Zero tests = blind deployments | 4 hrs |
| 3 | Extract admin/debug routes into `routes/admin.py` | Start untangling 1787-line main.py | 2 hrs |
| 4 | Delete or consolidate frontend API client | Eliminate dead code | 2 hrs |
| 5 | Add magic byte validation to file upload | Security hardening | 1 hr |

---

*The project has strong bones — good error handling design, solid rate limiting, comprehensive monitoring. The critical path is: **wire up what's already built** (exception handler, rate limit middleware) and **start testing**. The Redis caching and architectural splits are week-2 priorities.*
