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
- Embeddings (batch): `embed:{provider}:batch:{sha256(concat(texts))}` — TTL: `EMBED_TTL_BATCH` (default 1 day).
- Vector search results: `vec_search:qhash:{sha256(query)}:k:{k}:policy:{policy_or_all}` — TTL: `VEC_TTL` (default 5 minutes).
- LLM stateless response: `llm:{provider}:{sha256(prompt+context)}` — TTL: `LLM_TTL` (default 30 minutes).
- User profile: `user:profile:{user_id}` — TTL: `USER_TTL` (default 5 minutes).
- Doc chunks list: `doc:chunks:{doc_id}:v{schema}` — TTL: `DOC_TTL` (default 1 hour).
- Rate limiting keys: `rate:{limit_name}:{scope}:{identifier}` — use INCR+EXPIRE with window seconds.

Notes: all TTLs should be configurable via environment variables (see sample below).

## Serialization
- Use msgpack for compact binary serialization of embeddings and structured data. Optionally compress with zlib for very large objects.
- Avoid pickle in production for security and portability.

## RedisCache adapter (requirements)
- Async-friendly: prefer `redis` (redis-py) with asyncio support. The codebase has asynchronous call sites; provide both sync and async wrappers or use the async client throughout.
- Methods: `async def get(key)`, `async def set(key, value, ex=None)`, `async def delete(key)`, `async def exists(key)`, `async def clear(prefix=None)`.
- Helpers: key-building helpers, serializer (msgpack + optional gzip), & health-check method.

## Fallback & resilience
- If `CACHE_BACKEND=redis` but Redis is unreachable at startup, the app should: 1) log a warning, 2) fall back to in-memory caches, and 3) continue serving requests. Add a periodic background health check to try reconnecting and switch back to Redis when available.

## Rate-limiting migration notes
- Replace in-process counters with Redis atomic operations (INCR + EXPIRE) for fixed-window limits. For sliding-window token-bucket semantics, use an atomic Lua script.
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

## Security & privacy
- Do not cache raw PII or user-sensitive prompts. Review call sites and mark non-cacheable flows explicitly.
- Use Redis with authentication (`REDIS_URL` that includes password) and run in a private network in production.

## Environment variables (suggested)
- `CACHE_BACKEND` = `memory|redis` (default: `memory`)
- `REDIS_URL` = e.g. `redis://:password@host:6379/0`
- `EMBED_TTL` (seconds)
- `EMBED_TTL_BATCH` (seconds)
- `VEC_TTL` (seconds)
- `LLM_TTL` (seconds)

## Next steps I can implement
1. Patch `backend/requirements.txt` to add `redis>=4.5`.
2. Add `backend/src/cache_redis.py` scaffold and unit tests.
3. Update `backend/src/caching.py` to select backend by `CACHE_BACKEND`.

If you'd like, I can implement steps 1–3 now and run the unit tests locally. Reply with which steps to start or say "implement all 1–3".

---
Generated: May 9, 2026
