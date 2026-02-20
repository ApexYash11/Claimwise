# ClaimWise Site Flow, Features, and Improvements

This document explains how data moves through the app page-by-page, what each page does, and what changes will improve reliability, security, and performance.

## 1) Page-wise Features and Data Flow

### `/` Home
- **Purpose:** Landing page and entry point.
- **Features:** Intro content and navigation to auth.
- **Data flow:** Uses auth session from frontend context; redirects authenticated users to dashboard.

### `/login` and `/signup`
- **Purpose:** Authentication.
- **Features:** Email/password and social login.
- **Data flow:**
  1. Frontend form submits credentials.
  2. Supabase auth returns session token.
  3. Session is stored in frontend auth provider.
  4. Protected pages use token for backend APIs.

### `/dashboard`
- **Purpose:** Portfolio summary and activity view.
- **Features:** Protection score, risks, total coverage, quick insight, recent activity.
- **Data flow:**
  1. Frontend calls `GET /dashboard/stats` and `GET /dashboard/metrics`.
  2. Backend aggregates from `policies`, `analyses`, `comparisons`, `activities`.
  3. Response renders cards and activity timeline.

### `/upload`
- **Purpose:** Ingest policy document.
- **Features:** Upload progress, processing states, completion handoff to analysis.
- **Data flow:**
  1. Frontend posts multipart to `POST /upload-policy`.
  2. Backend validates file (type/size), extracts text, validates document class.
  3. Backend stores file in private storage path and inserts policy row.
  4. Background/sync indexing chunks text and stores embeddings.
  5. Frontend receives `policy_id` and stores session-local upload context.

### `/analyze`
- **Purpose:** Read policy insights.
- **Features:** Policy list, key fields, recommendations, compare selection, delete policy.
- **Data flow:**
  1. Frontend loads `GET /policies`.
  2. Backend returns policy + `validation_metadata.analysis_result`.
  3. Frontend maps response to UI model and computes display insights.
  4. Delete action calls `DELETE /policies/{id}`.

### `/compare`
- **Purpose:** Side-by-side policy comparison.
- **Features:** Auto-select policies, quick comparison summary, persisted comparison logs.
- **Data flow:**
  1. Frontend loads policy summaries from backend API.
  2. Comparison component calls `POST /compare-policies` with policy IDs.
  3. Backend runs LLM compare, stores result in `comparisons`, logs activity.

### `/chat`
- **Purpose:** Ask policy questions.
- **Features:** Single policy Q&A, all-policy Q&A, smart policy selection, history.
- **Data flow:**
  1. Frontend loads `GET /policies` and `GET /history`.
  2. Single-policy asks `POST /chat` with `policy_id + question`.
  3. All-policy asks `POST /chat-multiple` with JSON body.
  4. Backend retrieves context (RAG for single-policy), calls LLM, stores `chat_logs`, logs activity.

### `/profile`
- **Purpose:** User account view and sign-out.
- **Features:** Session info and logout.
- **Data flow:** Supabase signout + auth context reset.

### `/admin/policies`
- **Purpose:** Admin diagnostics for policy metadata.
- **Features:** List policies and update policy names.
- **Data flow:** Calls debug/admin backend routes (admin-gated).

---

## 2) Core End-to-End Flows

## Auth flow
1. User logs in via Supabase auth.
2. Frontend stores session.
3. Protected routes enforce authenticated access.
4. Backend validates JWT and resolves `user_id`.

## Upload and Index flow
1. Client uploads policy file.
2. Backend validates and extracts text.
3. Policy row saved with private storage path.
4. Text chunking + embedding + vector storage.
5. Policy becomes available for analysis/chat/compare.

## Chat flow (single policy)
1. User sends question with selected policy.
2. Backend fetches policy text and top chunks via vector RPC.
3. LLM answers with context and citations.
4. Response stored in `chat_logs` and returned.

## Chat flow (all policies)
1. User sends question once.
2. Backend pulls all user policies.
3. LLM returns consolidated answer.
4. Response stored and returned.

---

## 3) What Is Already Strong

- Clear separation of frontend routes and backend API responsibilities.
- JWT-based auth on protected endpoints.
- Private file storage path handling with signed URL support.
- RAG retrieval path exists and now has explicit vector RPC.
- Activity and chat persistence provide traceability.

---

## 4) Current Issues and Better Direction

## A) Data consistency
- Some pages previously used direct table reads and custom parsing.
- **Better:** Use backend APIs as single source of truth for all business data.

## B) Security and privacy
- Debug/dev pathways need strict boundaries.
- **Better:** Keep admin-only checks and avoid sensitive data in URL query params.

## C) Latency
- Sequential calls and fan-out patterns can delay UI.
- **Better:** Use single backend aggregate endpoints where possible, plus cancellation/timeouts.

## D) UX reliability
- Some actions were incomplete or weakly guarded.
- **Better:** Ensure every action has clear success/error paths and role checks.

---

## 5) Improvement Plan (Prioritized)

1. **API consistency pass** (High impact / Medium effort)
   - Move compare/upload reads fully to backend APIs.
2. **Chat payload hardening** (High impact / Low effort)
   - Use JSON body for multi-policy question payloads.
3. **Dashboard dev-fallback tightening** (High impact / Low effort)
   - Keep production dashboard on authenticated endpoints only.
4. **Timeout + abort layer** (Medium impact / Medium effort)
   - Add reusable request cancellation for chat/analyze/dashboard.
5. **Role UX enforcement** (Medium impact / Low effort)
   - Hide/redirect non-admin users on admin pages before API calls.
6. **Indexing observability** (Medium impact / Medium effort)
   - Add explicit status (`queued/indexed/failed`) and surface in UI.

---

## 6) Suggested Next Build Cycle

### Sprint 1 (stability)
- API consistency on compare/upload/chat payloads.
- Harden dashboard endpoint usage.
- Add better error copy and retry actions.

### Sprint 2 (performance)
- Timeout/abort helper.
- Reduce repeated fetch patterns.
- Add pagination knobs for history.

### Sprint 3 (quality)
- Improve test coverage for critical API contracts.
- Add observability for p50/p95 route latency.
- Add role-based UX checks for admin screens.

---

## 7) Success Criteria

- No direct frontend business reads from DB tables for compare/upload flows.
- All chat payloads avoid sensitive query strings.
- Page load and interaction latency reduces measurably.
- Error handling is user-safe and developer-observable.
- Admin features are inaccessible to non-admin users both server-side and UI-side.
