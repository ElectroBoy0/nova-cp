# ADR-008: Docker Compose for Local Development Infrastructure

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

The project requires three infrastructure services locally:
- PostgreSQL (primary database)
- Redis (cache + sync state)
- FastAPI (Python backend, which is not part of the pnpm workspace)

All three need to be available and healthy before the Next.js app can function. Developers should be able to spin up the full environment with a single command without installing PostgreSQL or Redis natively.

## Decision

Use **Docker Compose** (`docker-compose.yml`) to manage all three services for local development and as the deployment unit for staging.

Key design decisions:

**Health checks on every service.** PostgreSQL and Redis both define `healthcheck` blocks. The API container declares `depends_on` with `condition: service_healthy` — it will not start until both DB and Redis pass their health checks. This eliminates race conditions during `docker compose up`.

**`develop.watch` for hot-reload.** The API container uses Docker Compose's `develop.watch` feature:
```yaml
develop:
  watch:
    - action: sync+restart
      path: ./apps/api/app
      target: /app/app
```
Changes to Python files in `apps/api/app` are synced into the container and trigger a uvicorn restart automatically.

**Named volumes** (`postgres_data`, `redis_data`) persist data between `docker compose down` cycles. `docker compose down -v` is required to fully reset.

**Isolated network.** All services communicate on a private `novacp_network` bridge. The API is reachable at `http://api:8000` inside the network and `http://localhost:8000` from the host.

**Environment variable passthrough.** The API container mounts the root `.env` file and injects `DATABASE_URL` and `REDIS_URL` pointing to the Docker service names.

**Redis memory policy.** `allkeys-lru` with a 256MB cap is set at startup via the `redis-server` command — no separate Redis config file needed.

## Consequences

**Positive:**
- `docker compose up -d` gives a fully working backend in ~30 seconds on any OS
- Health check ordering prevents "DB not ready" startup errors
- Hot-reload in the API container enables tight iteration without rebuilding the image
- Named volumes survive `compose down`, preserving test data across sessions

**Negative:**
- Requires Docker Desktop on macOS (adds ~2GB memory overhead)
- `sync+restart` hot-reload is slower than native uvicorn `--reload` (an extra few seconds per change)
- The API Dockerfile has a `development` target — production deployments need a separate `production` target (multi-stage build)

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Native installs (no Docker) | Inconsistent across developer machines; PostgreSQL version drift |
| Podman | Less mature Docker Compose compatibility; team standardized on Docker Desktop |
| Dev containers (VS Code) | Adds editor coupling; Docker Compose is editor-agnostic |
| Kubernetes (local, e.g. k3d) | Massive overkill for a 3-service local setup |
