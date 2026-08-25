# ADR-001: Monorepo with Turborepo + pnpm

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

NovaCP has two distinct runtimes — a Next.js frontend and a FastAPI Python backend — plus shared TypeScript packages (`types`, `config`). We needed a repository strategy that:

- Keeps shared types in sync across the web app without publishing to npm
- Allows running all services with a single `pnpm dev` command from root
- Provides build caching to avoid rebuilding unchanged packages
- Scales to additional apps (e.g., a future mobile app or worker service)

## Decision

Adopt a **Turborepo + pnpm workspaces monorepo** with the following structure:

```
novacp/
├── apps/
│   ├── web/        # Next.js 15 frontend
│   └── api/        # FastAPI Python backend
└── packages/
    ├── types/      # Shared TypeScript types
    └── config/     # Shared ESLint + TypeScript configs
```

Turborepo orchestrates the task graph (`build`, `dev`, `lint`, `test`) with caching. pnpm workspaces handle `node_modules` hoisting and cross-package references via `workspace:*` protocol.

> **Note:** The Python API (`apps/api`) is not a pnpm workspace. It is managed separately by `uv` with its own `pyproject.toml`. Turborepo runs it as a persistent background task via Docker Compose in dev.

## Consequences

**Positive:**
- `@novacp/types` can be imported in the web app as a first-class workspace package without any publishing step
- `pnpm dev` from root starts all JavaScript services concurrently with Turborepo's task graph
- Turborepo's remote caching (optional) can drastically speed up CI builds
- Single `git` history, single PR process for cross-cutting changes

**Negative:**
- Developers need both `pnpm ≥ 9` and `uv` installed — slightly higher onboarding friction
- Turborepo does not natively cache Python builds; the API caching relies solely on Docker layer caching
- `pnpm-lock.yaml` can produce large diffs when dependencies change

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Separate repos (polyrepo) | Type sharing requires publishing `@novacp/types` to npm on every change; cross-repo PRs are cumbersome |
| Nx | More configuration overhead; Turborepo is simpler for our current scale |
| Yarn workspaces | pnpm is faster and has stricter hoisting rules that prevent phantom dependency bugs |
