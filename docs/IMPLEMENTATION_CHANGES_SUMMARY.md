# ClaimWise Implementation Changes Summary

Last updated: 2026-02-20

This document captures the concrete changes implemented across backend, frontend, SQL, and tests during the security/performance/reliability hardening cycle.

## 1. Security Hardening

### Backend
- Added admin-role enforcement helpers and applied them to debug/diagnostic endpoints.
- Added production-safe debug route gating via environment checks.
- Added per-user rate-limit enforcement to critical routes (`/upload-policy`, `/analyze-policy`, `/chat`, `/chat-multiple`, `/history`, signed file URL route).
- Hardened upload validation:
  - file extension and MIME checks,
  - max upload size checks (declared + actual bytes),
  - invalid/missing filename rejection.
- Added insurance-document validation gate before accepting uploaded policy content.
- Replaced sensitive/raw exception exposure with sanitized API error responses in multiple endpoints.

### Storage Privacy
- Changed policy file persistence to store private storage paths (not public URLs).
- Added signed URL retrieval endpoint for policy files:
  - `GET /policies/{policy_id}/file-url`
  - short-lived URL with configurable TTL.

## 2. API Contract and Data-Flow Fixes

### Backend Contracts
- Added `MultiPolicyChatRequest` model and switched `/chat-multiple` to JSON body contract.
- Standardized `/compare-policies` request handling to `policy_ids` array contract.
- Added/normalized `GET /policies` as frontend source-of-truth for policy listing.
- Improved `/history` response to include pagination metadata and chat log slices.

### Frontend Contract Alignment
- Updated compare flow to use backend API helper (`getPolicies`) instead of direct DB parsing.
- Updated chat "all policies" flow to use `/chat-multiple` JSON body.
- Updated analysis flow to load policy data from backend `/policies` endpoint.
- Removed duplicate upload name check on frontend DB reads; now relies on backend `409` conflict handling.

## 3. Latency and Reliability Improvements

### Timeout Infrastructure
- Added shared timeout utility: `frontend/lib/fetch-with-timeout.ts`.
- Applied timeout-based requests to core pages/components (dashboard, analyze, upload, compare, chat history, recent activity, API helper calls).

### Dashboard and Fetch Patterns
- Switched dashboard stats + metrics retrieval to parallel fetch execution.
- Tightened dashboard to authenticated production endpoints (removed dev fallback behavior from main path).

### Chat History UX
- Added paginated history loading in chat UI (load older history behavior).
- Added deduping when appending older messages.

### UI Resilience
- Mounted global `ErrorBoundary` in root layout to prevent whole-app crashes on component errors.
- Hardened expiration-date parsing/display in policy card UI.

## 4. Observability

### Monitoring Integration
- Wired request performance middleware into FastAPI app pipeline.
- Added monitoring startup hook.
- Added admin-gated monitoring endpoints:
  - `GET /monitoring/summary`
  - `GET /monitoring/endpoints`
  - `GET /monitoring/health`

## 5. RAG and Vector Search Stability

### SQL
- Implemented vector retrieval RPC in `backend/sql/vector_search_rpc.sql`:
  - `vector_search_document_chunks(query_embedding, limit_count, filter_policy_id)`

### Backend RAG
- Normalized embedding dimension handling (truncate/pad to expected dimensionality).
- Updated expected embedding dimension default alignment.
- Applied normalization to both indexed chunk embeddings and query embeddings.

## 6. Admin UX and Access Control

- Extended auth context to include `userRole` and `isAdmin`.
- Added admin UI gating on admin policies page before loading debug data.
- Added non-admin fallback UX for restricted admin page access.

## 7. History Pagination Semantics

- Added `page` and `page_size` query support to `/history`.
- Added pagination payload with `has_more_activities`, `has_more_chat_logs`, and `next_page`.
- Added safe defaults and bounds for pagination inputs.
- Used page-size semantics for chat has-more detection to avoid typed count-query issues.

## 8. Test Coverage Added

Added focused backend contract tests in `test/test_api_contracts_pytest.py` covering:
- compare request validation bounds,
- multi-policy chat request validation,
- document validator acceptance/rejection behavior,
- rate limiter blocking behavior after threshold.

Latest focused run result:
- `pytest test/test_api_contracts_pytest.py -q` → **8 passed**.

## 9. Key Files Changed (High-Impact)

### Backend
- `backend/src/main.py`
- `backend/src/models.py`
- `backend/src/rag.py`
- `backend/sql/vector_search_rpc.sql`

### Frontend
- `frontend/lib/fetch-with-timeout.ts`
- `frontend/lib/api.ts`
- `frontend/hooks/use-auth.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/analyze/page.tsx`
- `frontend/app/chat/page.tsx`
- `frontend/app/upload/page.tsx`
- `frontend/app/compare/page.tsx`
- `frontend/app/admin/policies/page.tsx`
- `frontend/components/analysis/policy-card.tsx`
- `frontend/components/analysis/policy-comparison.tsx`
- `frontend/components/dashboard/recent-activity.tsx`

### Tests
- `test/test_api_contracts_pytest.py`

---

If you want a shorter version for stakeholders, derive a one-page release note from sections 1, 2, 3, and 8.