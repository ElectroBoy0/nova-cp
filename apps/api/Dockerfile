# =============================================================
# NovaCP API — Dockerfile
# Multi-stage build: development + production
# =============================================================

# ---- Base stage ----
FROM python:3.12-slim AS base

# Security: run as non-root user
RUN groupadd --gid 1001 novacp \
    && useradd --uid 1001 --gid novacp --shell /bin/bash --create-home novacp

# Install system deps required by asyncpg and other C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv — the fast Python package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# ---- Development stage ----
FROM base AS development

# Copy dependency files first (layer cache)
COPY pyproject.toml .python-version ./

# Install ALL deps including dev (--all-extras)
RUN uv sync --all-extras --no-install-project

# Copy source code
COPY . .

# Install the project itself
RUN uv sync --all-extras

# Switch to non-root user
USER novacp

EXPOSE 8000

# Hot-reload in development (exclude .venv to avoid reload loop)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-exclude", ".venv"]

# ---- Production stage ----
FROM base AS production

# Copy dependency files
COPY pyproject.toml .python-version ./

# Install only production deps
RUN uv sync --no-dev --no-install-project

# Copy source
COPY . .

# Install project
RUN uv sync --no-dev

# Switch to non-root user
USER novacp

EXPOSE 8000

# Production: multiple workers, no reload
CMD ["uv", "run", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "info"]
