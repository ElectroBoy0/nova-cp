# ADR-005: Redis for Caching and Sync State

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

Two caching needs emerged early:

1. **Contest list aggregation:** Fetching upcoming contests from Codeforces, CodeChef, and AtCoder APIs on every page load is slow (~1–3 seconds each) and risks rate-limiting. This data changes at most a few times per day.
2. **CF sync status polling:** When a user links their Codeforces handle, the sync runs asynchronously. The frontend needs to poll for the status (`pending → syncing → completed | failed`). Storing ephemeral state like this in PostgreSQL adds unnecessary write load.

## Decision

Use **Redis 7** (Alpine Docker image) as:

- A **cache** for contest lists and user profiles
- A **short-lived state store** for CF sync status

Configuration:

```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

`allkeys-lru` evicts the least-recently-used keys when memory is full — safe for all-cache workloads where every key is reconstructable.

Key patterns are **centralized** in a `CacheKey` class (`redis.py`) to prevent typos and make cache invalidation explicit:

| Key Pattern              | TTL            | Purpose                                             |
| ------------------------ | -------------- | --------------------------------------------------- |
| `contests:all`           | 1800s (30 min) | Aggregated contest list across all platforms        |
| `contests:{platform}`    | 1800s (30 min) | Contest list per platform                           |
| `sync:cf:{user_id}`      | 300s (5 min)   | CF sync status for polling                          |
| `user:profile:{user_id}` | 600s (10 min)  | Cached user profile, invalidated on sync completion |

The client uses the `hiredis` C extension parser for better throughput (`redis[hiredis]`).

## Consequences

**Positive:**

- Contest list is served from Redis in <1ms vs. 1–3s from external APIs
- Sync status polling is O(1) Redis reads — no DB load
- `allkeys-lru` means Redis self-manages eviction without any application-level TTL management for low-priority keys
- `decode_responses=True` on the client returns Python strings directly (no manual decoding)

**Negative:**

- Redis is an additional infrastructure dependency for local dev and production
- 256MB memory cap is adequate for M0–M1 but needs revisiting as the user base grows
- Redis data is not persisted by default in our config (no `save` or `appendonly`); a Redis restart loses all cached data. This is acceptable since all cached data is reconstructable from the DB or external APIs

## Alternatives Considered

| Option                        | Reason Rejected                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| In-memory cache (Python dict) | Not shared across multiple API workers/processes; not suitable for distributed deployment                           |
| Memcached                     | No native sorted sets or pub/sub (which may be needed for real-time features later); Redis is strictly more capable |
| PostgreSQL as state store     | Adds write load to the primary DB for ephemeral data; slower than Redis for key-value lookups                       |
| CDN-level caching             | Not practical for personalized user data; contest list is suitable but adds operational complexity at M0            |
