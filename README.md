# NovaCP

> The OS for Competitive Programmers — performance analytics, smart recommendations, and contest aggregation.

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Python 3.12
- Docker + Docker Compose
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Clone and install

```bash
git clone https://github.com/your-org/novacp.git
cd novacp
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, etc.
# See .env.example for instructions on generating each value
```

### 3. Start infrastructure (PostgreSQL + Redis + API)

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
cd apps/api
uv run alembic upgrade head
cd ../..
```

### 5. Start the development server

```bash
pnpm dev
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs** (dev only): http://localhost:8000/docs

---

## Project Structure

```
novacp/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # FastAPI Python backend
├── packages/
│   ├── config/       # Shared ESLint + TypeScript configs
│   └── types/        # Shared TypeScript type definitions
├── infra/            # Docker configs and scripts
└── .github/          # CI/CD workflows
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| UI | shadcn/ui + TailwindCSS |
| Auth | Auth.js v5 (GitHub + Google) |
| Backend | FastAPI + Python 3.12 |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Monorepo | Turborepo + pnpm |
| CI | GitHub Actions |

## Milestone Roadmap

| Milestone | Focus | Timeline |
|---|---|---|
| M0 | Foundation (this) | Week 1-2 |
| M1 | Data Pipeline + Contest Center | Week 3-5 |
| M2 | Analytics + "Aha Moment" | Week 6-9 |
| M3 | Recommendations + Problem Explorer | Week 10-12 |
| M4 | Dashboard + Notifications + Polish | Week 13-14 |
| M5 | 50 real users. Fix. Don't ship. | Week 15-16 |
