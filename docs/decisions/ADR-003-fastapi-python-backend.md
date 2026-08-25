# ADR-003: FastAPI Python Backend

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

NovaCP's backend needs to:

- Ingest and store competitive programming data (submissions, ratings, contest history) from external APIs (Codeforces, CodeChef, AtCoder)
- Serve analytics queries over potentially large datasets per user
- Handle async I/O efficiently (many concurrent external API calls during sync)
- Be easy to develop and iterate on rapidly in the early stages

The backend is **internal-only**: it is not exposed publicly. Only the Next.js BFF calls it, verified by a shared `X-Internal-API-Key` header.

## Decision

Use **FastAPI** with **Python 3.12** as the backend framework.

Key sub-decisions:

| Concern | Choice |
|---|---|
| Framework | FastAPI `≥ 0.115.0` |
| ASGI server | Uvicorn with `standard` extras (includes `uvloop`, `httptools`) |
| ORM | SQLAlchemy 2.0 (async, with `asyncpg` driver) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Settings | pydantic-settings (reads from `.env`) |
| HTTP client | httpx (async, for external API calls) |
| Package manager | uv |
| Linting/formatting | Ruff (replaces flake8 + isort + black) |
| Testing | pytest + pytest-asyncio, aiosqlite for in-memory DB in tests |

The app uses a **lazy singleton engine pattern** (`database.py`) — the SQLAlchemy engine is not created at import time, allowing tests to override `DATABASE_URL` before the first engine instantiation.

Connection pool is tuned for the target of **10,000 users on a single instance** (`pool_size=10`, `max_overflow=20`).

## Consequences

**Positive:**
- `async`/`await` throughout enables high-throughput concurrent external API calls (e.g., syncing 100 users' Codeforces data simultaneously)
- Pydantic v2 provides fast, type-safe request/response validation with automatic OpenAPI schema generation
- Alembic gives version-controlled, reproducible schema migrations
- FastAPI's dependency injection system makes auth, DB sessions, and caching easy to compose
- Docs are auto-generated at `/docs` and `/redoc` in DEBUG mode, disabled in production

**Negative:**
- Python GIL limits true CPU parallelism for compute-heavy analytics; may need to offload to background workers later
- Async SQLAlchemy has a steeper learning curve than synchronous ORM patterns
- `uv` is a newer tool — team members need to learn it alongside `pnpm`

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Node.js / Express | Team's data-science and analytics work is Python-native; NumPy/pandas ecosystem |
| Django + DRF | Heavier framework; ORM is synchronous by default; less suited to async I/O-heavy workloads |
| Go (Gin/Echo) | Faster, but loses Python's data ecosystem; higher implementation cost |
| Litestar | Similar to FastAPI but smaller community; fewer resources and examples |
