# Contributing to NovaCP 🚀

Thank you for your interest in contributing to **NovaCP** — The OS for Competitive Programmers! We welcome contributions from developers, competitive programmers, designers, and educators of all skill levels.

---

## 🌟 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and kind in all interactions within issues, pull requests, and discussions.

---

## 🛠️ Local Development Setup

NovaCP is organized as a modern monorepo powered by **Turborepo** and **pnpm**:

### Prerequisites

- **Node.js**: `≥ 20.0.0`
- **pnpm**: `≥ 9.0.0`
- **Python**: `≥ 3.12`
- **uv**: Astral's high-performance Python package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Docker & Docker Compose** (for local PostgreSQL & Redis)

### Quickstart

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/<your-username>/nova-cp.git
   cd nova-cp
   ```

2. **Install frontend and root dependencies**:

   ```bash
   pnpm install
   ```

3. **Install Python backend dependencies**:

   ```bash
   cd apps/api
   uv sync --all-extras
   cd ../..
   ```

4. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

5. **Start local infrastructure (PostgreSQL & Redis)**:

   ```bash
   docker compose up -d postgres redis
   ```

6. **Run database migrations**:

   ```bash
   cd apps/api
   uv run alembic -c migrations/alembic.ini upgrade head
   cd ../..
   ```

7. **Start the development servers**:
   ```bash
   pnpm dev
   ```
   - **Web Frontend**: [http://localhost:3000](http://localhost:3000)
   - **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Testing & Code Quality

Before submitting a Pull Request, make sure all tests and quality checks pass:

### Frontend

```bash
# Type check all packages
pnpm type-check

# Lint frontend code
pnpm lint

# Format check with Prettier
pnpm format:check
```

### Backend

```bash
cd apps/api

# Run full test suite with coverage
uv run pytest tests/ -v --cov=app

# Run Ruff linter and formatter
uv run ruff check .
uv run ruff format --check .
```

---

## 🌿 Branching & Pull Request Guidelines

1. **Create a branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
2. **Follow Conventional Commits**:
   - `feat: add Codeforces rating predictor`
   - `fix: handle edge case in contest duration parsing`
   - `docs: update deployment architecture guide`
   - `refactor: optimize cache invalidation on submission sync`

3. **Open a Pull Request**:
   - Target the `main` branch.
   - Fill out the PR template with a clear description and screenshots/recordings for UI changes.
   - Ensure all automated GitHub Actions CI checks are passing.

---

## 💬 Community & Questions

Have ideas or questions? Feel free to open a [GitHub Discussion](https://github.com/ElectroBoy0/nova-cp/discussions) or submit an [Issue](https://github.com/ElectroBoy0/nova-cp/issues).
