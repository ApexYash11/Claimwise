# Redis Caching Rollout Plan

This document outlines a concise, reviewable plan to add an external Redis-backed caching layer to reduce latency for the Claimwise backend. It focuses on low-risk, high-impact caches (embeddings, vector-search results, LLM responses, and rate-limiting state) and a safe, pluggable rollout.

## Goals
- Reduce request latency for RAG/embedding-heavy flows.
- Share cache across multiple app processes/instances.
- Keep safe fallbacks to in-memory caching if Redis is unavailable.
- Provide clear, testable steps and minimal code changes.

## High-level approach
1. Add `redis` dependency and an env var `REDIS_URL`.
2. Implement a `RedisCache` adapter that implements the same surface used by the existing `CacheManager` (`get`, `set`, `delete`, `exists`, `clear`, `ttl`).
3. Make `CacheManager` pluggable via `CACHE_BACKEND` (values: `memory`, `redis`).
4. Wire Redis-backed caches for key targets: embeddings, vector-search results, LLM responses, and rate-limiter state.
5. Add testing, health checks, fallbacks, and docs.

## Files to change (overview)
- `backend/requirements.txt` — add `redis>=4.5`.
- `backend/src/caching.py` — add wiring to accept a pluggable backend; import `RedisCache` when configured.
- `backend/src/cache_redis.py` (new) — `RedisCache` adapter implementation and serialization helpers.
- `backend/src/embeddings.py` — use configured cache for `embed_text_with_cache` / `embed_texts_with_cache`.
- `backend/src/rag.py` — add optional caching in `retrieve_top_k` for vector-search results.
- `backend/src/llm.py` — optional caching for stateless prompts (explicit opt-in at call sites).
- `backend/src/rate_limiting.py` — migrate counters to Redis INCR+EXPIRE or Lua scripts for sliding-window.
- `backend/src/monitoring.py` — add Redis health-check and metrics hooks.

## Cache key patterns and TTLs (defaults)
- Embedding (single): `embed:{provider}:{sha256(text)}` — TTL: `EMBED_TTL` (default 7 days).
- Embeddings (batch): `embed:{provider}:batch:{sha256(concat(texts))}` — TTL: `EMBED_TTL_BATCH` (default 1 day). See notes below for deterministic serialization and max batch guidance.
- Vector search results: `vec_search:qhash:{sha256(query)}:k:{k}:policy:{policy_or_all}` — TTL: `VEC_TTL` (default 5 minutes).
- LLM stateless response: `llm:{provider}:{sha256(prompt+context)}` — TTL: `LLM_TTL` (default 30 minutes).
- User profile: `user:profile:public:{user_id}` or `user:preferences:{user_id}` — TTL: `USER_TTL` (default 5 minutes). Do NOT cache full raw PII under `user:profile:{user_id}`; see Security & privacy section for allowed fields and redaction guidance.
- Doc chunks list: `doc:chunks:{doc_id}:v{schema}` — TTL: `DOC_TTL` (default 1 hour).
- Rate limiting keys: `rate:{limit_name}:{scope}:{identifier}` — use atomic counter patterns (see Rate-limiting migration notes) with window seconds.

Notes: all TTLs should be configurable via environment variables (see sample below). See the Embeddings batch key notes below.

### Embeddings batch key determinism and limits
- Deterministic serialization: compute the batch hash using a canonical serialization, for example:

  - `sha256(json.dumps(texts, separators=(",",":"), ensure_ascii=False).encode('utf-8'))`
  - or `sha256('\n'.join(texts).encode('utf-8'))` if newlines are acceptable.

- Order considerations: text order affects the key. If order should not matter, sort `texts` deterministically before serializing (e.g., `sorted(texts)`), but only do this if the batch semantics guarantee commutativity.
- Max batch size: enforce a recommended limit (e.g., max 50 items or max 100KB concatenated length) before hashing; for larger inputs, fall back to per-text caching or reject/trim the batch to avoid extremely long keys and high memory usage.

## Serialization
- Use msgpack for compact binary serialization of embeddings and structured data. Optionally compress with zlib for very large objects.
- Avoid pickle in production for security and portability.

## RedisCache adapter (requirements)
- Async-friendly: prefer `redis` (redis-py) with asyncio support. The codebase has asynchronous call sites; provide both sync and async wrappers or use the async client throughout.
- Methods: `async def get(key)`, `async def set(key, value, ex=None)`, `async def delete(key)`, `async def exists(key)`, `async def clear(prefix=None)`, `async def ttl(key)`.
- Operational guidance: implement connection pooling (pool size / max connections), per-operation timeouts, reconnection and retry strategies (max retries, exponential backoff), and a `health_check()` method that returns connectivity state. Make these parameters configurable via env vars.
- Helpers: key-building helpers, serializer (msgpack + optional gzip), & health-check method. Ensure pooling and timeouts are configurable via env (see variables below).

## Fallback & resilience
- If `CACHE_BACKEND=redis` but Redis is unreachable at startup, the app should: 1) log a warning, 2) fall back to in-memory caches, and 3) continue serving requests.

- Operational guidance when instances fall back to in-memory caches:
  - Disable or conservatively handle sensitive cache types when any instance is in fallback mode. For example:
    - Rate limiting: fail-open or use conservative defaults (e.g., lower quotas per unit time) until Redis is restored.
    - Vector-search caching: disable on-instance caching or serve only from a central warmed cache to avoid inconsistency; prefer warming centrally rather than allowing inconsistent per-instance caches.
    - LLM response caching: consider disabling for user-personalized prompts or flag as non-cacheable.
  - Expose per-instance cache mode (Redis vs in-memory) as a metric and attach labels/tags (e.g., `cache_backend=redis|memory`) so monitoring systems can aggregate fallback counts and durations.
  - Emit an alert when any instance has been in fallback mode longer than a configured threshold (e.g., `REDIS_FALLBACK_ALERT_SECONDS`, default 60s).

- Health checks and automated switch-back policy:
  - Add a periodic background health check (`REDIS_HEALTHCHECK_INTERVAL`) that attempts reconnection and validates basic operations (PING, simple GET/SET).
  - On successful reconnection, automatically switch back to the Redis backend and drain or invalidate local in-memory caches as appropriate (avoid stale cache data being used post-switch). Document a safe invalidation strategy (e.g., flush in-memory caches or bump a `CACHE_KEY_PREFIX` version to avoid key collisions).
  - Record events when switching modes for audit and troubleshooting.

## Rate-limiting migration notes
- Avoid naive `INCR` + separate `EXPIRE` race: prefer an atomic approach. Use either:
  - Redis atomic Lua script that calls `local v = redis.call('INCR', key); if v == 1 then redis.call('EXPIRE', key, window) end; return v` — this ensures counter and expiry are set atomically on first increment.
  - Or use Redis `SET` with NX and expiry for initial token setting patterns where appropriate.

- For sliding-window or token-bucket semantics, implement the algorithm in Lua for atomic updates (or use a tested library). This avoids race conditions and ensures correct enforcement under concurrency.
- Ensure keys are small and expiration windows match existing limits.

## Local development & infra
Add a small `docker-compose.redis.yml` snippet for local dev:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]

# Usage:
# REDIS_URL=redis://localhost:6379
```

## Testing & verification
1. Unit tests: add `tests/test_redis_cache.py` to assert `RedisCache` `get/set/delete`, serializer round-trips, and TTL behavior (use pytest and a test Redis server via docker/testcontainers).
2. Integration test: measure p50/p95 for common RAG requests before and after cache enabled (small script `tools/bench_cache.py`).
3. Run the repo's existing tests to ensure no behavior changed.

## Rollout plan (phased)
1. Implement `RedisCache` and make `CacheManager` pluggable. Add env vars and docs. (No behavior change yet.)
2. Turn on Redis backend for embeddings only. Monitor latency and Redis memory usage. Adjust TTLs.
3. Add vector-search caching and LLM response caching (opt-in per call site). Monitor correctness and hit rates.
4. Migrate rate-limiter to Redis in a controlled windowed release.
5. Finalize docs and CI integration.

## Rollback strategy & monitoring
- Rollback triggers (examples): sustained Redis errors, elevated Redis memory eviction events, sudden drop in cache hit rate, or p95 latency spikes above threshold.
- Rollback steps:
  1. Toggle `CACHE_BACKEND=memory` or update `CacheManager` config to switch to in-memory caches (no code deploy required if pluggable flag used).
  2. For specific features (embeddings/vector-search/LLM): disable their cache usage by flipping feature flags or env toggles and invalidate any warmed caches centrally.
  3. Revert rate-limiter migration by switching back to in-process rate limiting or an alternate store if available.
  4. Communicate to on-call and owners, and run health checks to validate normal operation before ending rollback.
- Monitoring metrics to collect & alert on (suggested):
  - Latency p50/p95 for key endpoints (chat, retrieve, embed).
  - Redis memory usage and eviction count.
  - Cache hit/miss rates per cache type (embeddings, vector-search, llm)
  - TTL expirations and misconfig counts.
  - Redis command error rates and exception counts.
  - Rate-limiter enforcement failures or anomalies.
  - Overall application error and latency spikes.
- Alert thresholds (examples):
  - p95 latency increase > 2x baseline for 5+ minutes.
  - Redis memory usage > 80% or eviction rate > threshold.
  - Cache hit rate drop > 30% sustained over 5 minutes.
- Owners & runbook: list responsible teams/contacts and include a short runbook for toggling `CACHE_BACKEND` and invalidating warmed caches.

## Security & privacy
- Do not cache raw PII or user-sensitive prompts. Review call sites and mark non-cacheable flows explicitly.

- Data classes that must never be cached (examples): `full_name`, `ssn`, `email`, `phone`, `address`, `payment_details`, `credit_card_number`, `bank_account`, `medical_records`.

- Allowed non-PII fields suitable for caching (examples): preferences, UI settings, non-identifying feature flags, derived non-sensitive metadata (e.g., `account_tier`, `language_pref`).

- Redaction and transformation rules:
  - Redact or transform sensitive fields before caching. Example regex rules:
    - Email redaction: `s/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/[REDACTED]@$1/`
    - Phone redaction: `s/\+?\d[\d\-() ]{7,}/[REDACTED_PHONE]/`
  - Alternatively, store only derived flags (e.g., `has_verified_email: true`) instead of raw values.

- Per-key TTLs: require conservative TTLs for user-related caches (recommended default 300–1800 seconds, i.e., 5–30 minutes) unless explicitly justified.

- Encryption & transport: require TLS for Redis connections and encryption-at-rest for production Redis instances; include credentials in `REDIS_URL` and ensure it's stored securely (secrets manager).

- Access controls and auditing: place Redis in a VPC/private network, require Redis AUTH, use role-based API keys, and log cache hit/miss metrics without including PII values.

- Marking code paths non-cacheable: use an explicit `cacheable: bool` flag in cache helper functions or an annotation/decorator (e.g., `@cacheable(False)`) so reviewers can enforce non-cacheable flows at call sites.

## Environment variables (suggested)
- `CACHE_BACKEND` = `memory|redis` (default: `memory`)
- `REDIS_URL` = e.g. `redis://:password@host:6379/0`
- `CACHE_KEY_PREFIX` (string) — default: `claimwise:` — allows safe prefix bumping on switch-back.
- `CACHE_MAX_ENTRIES` (int) — default: `100000` — approximate maximum entries expected; used for local sizing guidance.
- `CACHE_DEFAULT_TTL` (seconds) — default: `3600` (1 hour) — fallback TTL for unspecified caches.
- `EMBED_TTL` (seconds) — default: `604800` (7 days)
- `EMBED_TTL_BATCH` (seconds) — default: `86400` (1 day)
- `VEC_TTL` (seconds) — default: `300` (5 minutes)
- `LLM_TTL` (seconds) — default: `1800` (30 minutes)
- `REDIS_MAX_CONNECTIONS` (int) — default: `50` — max pooled connections for the client.
- `REDIS_CONNECT_TIMEOUT` (ms) — default: `200` — connection timeout in milliseconds.
- `REDIS_HEALTHCHECK_INTERVAL` (seconds) — default: `10` — interval for background health checks.
- `REDIS_RETRY_STRATEGY` — description: e.g., `exponential_backoff, max_retries=5, base_delay_ms=100`.
- `CACHE_EVICTION_POLICY` — default: `allkeys-lru` — recommended Redis eviction policy.

Notes: tune `CACHE_MAX_ENTRIES`, `REDIS_MAX_CONNECTIONS`, and `CACHE_EVICTION_POLICY` according to production memory and workload.

## Next steps I can implement
1. Patch `backend/requirements.txt` to add `redis>=4.5`.
2. Add `backend/src/cache_redis.py` scaffold and unit tests.
3. Update `backend/src/caching.py` to select backend by `CACHE_BACKEND`.

If you'd like, I can implement steps 1–3 now and run the unit tests locally. Reply with which steps to start or say "implement all 1–3".

---
Generated: May 9, 2026
