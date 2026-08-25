from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import (
    bookmarks,
    bug_reports,
    code_execution,
    contests,
    daily_missions,
    health,
    notes,
    problems,
    snippets,
    uploads,
    upsolve,
    users,
)
from app.services.scheduler import TaskScheduler

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = TaskScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    """
    Application lifespan handler.
    - Startup: verify DB and Redis connections
    - Shutdown: cleanly close all connections
    """
    # ---- Startup ----
    logger.info("Starting NovaCP API v%s", settings.APP_VERSION)

    # Verify database connection
    from sqlalchemy import text

    from app.database import get_engine
    engine = get_engine()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection: OK")
    except Exception as e:
        logger.error("Database connection failed: %s", e)
        raise

    # Verify Redis connection (non-fatal — API can start without Redis,
    # Redis failures will surface per-request)
    from app.redis import redis_client

    try:
        await redis_client.ping()
        logger.info("Redis connection: OK")
    except Exception as e:
        # Log but don't crash — Redis may be temporarily unavailable
        # during hot reloads. The connection pool will retry lazily.
        logger.warning("Redis connection check failed (non-fatal): %s", e)

    logger.info("NovaCP API ready to serve requests")

    # Start background scheduler
    scheduler.start()

    yield

    # ---- Shutdown ----
    logger.info("Shutting down NovaCP API")

    # Stop background scheduler
    await scheduler.stop()

    from app.database import get_engine
    from app.redis import redis_client
    await redis_client.aclose()
    engine = get_engine()
    await engine.dispose()

    logger.info("Cleanup complete")


# -------------------------------------------------------
# FastAPI App
# -------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend API for NovaCP — The OS for Competitive Programmers.\n\n"
        "**Internal API**: All endpoints require the `X-Internal-API-Key` header. "
        "These endpoints are not intended to be called directly by end users."
    ),
    version=settings.APP_VERSION,
    # Only expose docs in debug/development mode
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# -------------------------------------------------------
# Middleware
# -------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# -------------------------------------------------------
# Global Exception Handlers
# -------------------------------------------------------


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all for unhandled exceptions.
    Returns a generic 500 without leaking internal details in production.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url)

    detail: Any = "An unexpected error occurred."
    if settings.DEBUG:
        detail = str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
    )


# -------------------------------------------------------
# Routers
# -------------------------------------------------------

app.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)
app.include_router(
    health.router,
    prefix="/api/v1/health",
    tags=["Health"],
)

app.include_router(
    users.router,
    prefix="/api/v1/users",
    tags=["Users"],
)

app.include_router(
    contests.router,
    prefix="/api/v1/contests",
    tags=["Contests"],
)

app.include_router(
    problems.router,
    # The router itself has prefix="/api/v1/problems" in routers/problems.py
    # So we don't need to add prefix here, or we can remove it from problems.py
)

app.include_router(upsolve.router)
app.include_router(bookmarks.router)
app.include_router(notes.router)
app.include_router(snippets.router)
app.include_router(
    daily_missions.router,
    prefix="/api/v1",
)
app.include_router(
    bug_reports.router,
    prefix="/api/v1",
)
app.include_router(
    uploads.router,
    prefix="/api/v1",
)
app.include_router(
    code_execution.router,
    prefix="/api/v1",
)

# -------------------------------------------------------
# Static Uploads Mount (for screenshots / assets)
# -------------------------------------------------------
from pathlib import Path
from fastapi.staticfiles import StaticFiles

static_dir = Path(__file__).resolve().parent.parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


