# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the NovaCP project.

ADRs document **significant architectural decisions** — the context that drove them, the decision made, and the trade-offs accepted. They are meant to be read in order, and never deleted. If a decision is superseded, the old ADR is updated to `Superseded` status and the new ADR links back to it.

---

## Format

Each ADR follows this structure:

```
# ADR-NNN: Title

- Status: Proposed | Accepted | Deprecated | Superseded by ADR-NNN
- Date: YYYY-MM-DD
- Deciders: [list]

## Context
## Decision
## Consequences
## Alternatives Considered
```

---

## Index

| ADR                                                  | Title                                               | Status   |
| ---------------------------------------------------- | --------------------------------------------------- | -------- |
| [ADR-001](./ADR-001-monorepo-with-turborepo.md)      | Monorepo with Turborepo + pnpm                      | Accepted |
| [ADR-002](./ADR-002-nextjs-15-frontend.md)           | Next.js 15 as Frontend Framework                    | Accepted |
| [ADR-003](./ADR-003-fastapi-python-backend.md)       | FastAPI Python Backend                              | Accepted |
| [ADR-004](./ADR-004-postgresql-primary-database.md)  | PostgreSQL as Primary Database                      | Accepted |
| [ADR-005](./ADR-005-redis-caching-and-sync-state.md) | Redis for Caching and Sync State                    | Accepted |
| [ADR-006](./ADR-006-bff-pattern-internal-api-key.md) | BFF Pattern with Internal API Key Auth              | Accepted |
| [ADR-007](./ADR-007-authjs-v5-oauth.md)              | Auth.js v5 with GitHub and Google OAuth             | Accepted |
| [ADR-008](./ADR-008-docker-compose-local-dev.md)     | Docker Compose for Local Development Infrastructure | Accepted |

---

## How to Add a New ADR

1. Copy the template below into a new file: `ADR-NNN-short-title.md`
2. Fill in all sections
3. Add a row to the index table above
4. Open a PR — ADRs should be reviewed like code

```markdown
# ADR-NNN: Title

- **Status:** Proposed
- **Date:** YYYY-MM-DD
- **Deciders:** [names]

---

## Context

## Decision

## Consequences

## Alternatives Considered
```
