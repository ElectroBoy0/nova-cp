from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class DetailedHealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    redis: str


@router.get(
    "",
    response_model=HealthResponse,
    summary="Basic health check",
    description="Returns OK if the API is running. Used by load balancers.",
)
async def health_check() -> HealthResponse:
    from app.config import settings

    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment="development" if settings.DEBUG else "production",
    )


@router.get(
    "/detailed",
    response_model=DetailedHealthResponse,
    summary="Detailed health check with dependency status",
    description="Checks database and Redis connectivity. Not exposed to the public.",
)
async def detailed_health_check() -> DetailedHealthResponse:
    from sqlalchemy import text

    from app.config import settings
    from app.database import get_engine
    from app.redis import redis_client

    engine = get_engine()
    db_status = "ok"
    redis_status = "ok"

    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {e!s}"

    # Check Redis
    try:
        pong = await redis_client.ping()
        if not pong:
            redis_status = "error: no pong"
    except Exception as e:
        redis_status = f"error: {e!s}"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return DetailedHealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        environment="development" if settings.DEBUG else "production",
        database=db_status,
        redis=redis_status,
    )
