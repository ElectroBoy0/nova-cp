# ADR-004: PostgreSQL as Primary Database

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

NovaCP stores:

- User identities and OAuth provider accounts
- Codeforces handles with rating history
- (Future) Submission history per user, contest registrations, problem metadata

The data is relational and structured. We need ACID guarantees for user records, reliable migrations, and efficient complex queries for analytics aggregations.

## Decision

Use **PostgreSQL 16** (Alpine Docker image) as the primary datastore, accessed via **SQLAlchemy 2.0 (async)** with the **asyncpg** driver.

Schema decisions:

- **Primary keys:** UUID strings (`String(36)`) generated client-side by Python. This avoids auto-increment sequences and makes IDs portable across environments (tests, staging, production)
- **Timestamps:** All tables use a `TimestampMixin` providing `created_at` and `updated_at` with both Python-side defaults and `server_default=func.now()` so direct SQL inserts (migrations, seeding) also get correct timestamps
- **Enums:** PostgreSQL native `ENUM` types for `cf_rank` and `sync_status` fields — enforces value constraints at the DB level
- **Indexes:** Composite unique index on `(provider, provider_account_id)` on the `users` table to prevent duplicate OAuth accounts

The connection pool is configured as:

```
pool_size=10, max_overflow=20, pool_timeout=30, pool_recycle=3600, pool_pre_ping=True
```

`pool_pre_ping=True` ensures stale connections are detected and replaced without errors after periods of inactivity.

## Consequences

**Positive:**

- ACID compliance guarantees correct user and sync-status transitions
- `asyncpg` is one of the fastest PostgreSQL drivers for Python, with native async support
- PostgreSQL's JSONB support gives an escape hatch for semi-structured data (e.g., raw API responses) without a schema migration
- Alembic autogenerate handles schema evolution with human-reviewable migration scripts

**Negative:**

- UUID primary keys are slightly larger and less cache-friendly than sequential integers
- Running PostgreSQL locally requires Docker (or a local install); lightweight SQLite in tests via `aiosqlite`
- The lazy engine pattern (`database.py`) uses a module-level global — care needed in multi-process environments

## Alternatives Considered

| Option                        | Reason Rejected                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| MySQL / MariaDB               | PostgreSQL has better support for advanced types (JSONB, arrays), better async drivers                       |
| MongoDB                       | Data is strongly relational (user → CF handle → submissions); document model adds complexity without benefit |
| SQLite (production)           | Not suitable for concurrent async writes at scale                                                            |
| PlanetScale / Neon (cloud DB) | Adds external dependency and cost for M0; can migrate later                                                  |
