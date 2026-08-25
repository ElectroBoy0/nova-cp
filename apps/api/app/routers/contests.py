from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.contest import ContestListResponse, ContestRead, SyncResponse
from app.services.contest_service import ContestService

logger = logging.getLogger(__name__)

# Contest endpoints are intentionally NOT protected by require_internal_key.
# Contest data is public — the BFF can call these from server components
# and they may be cached or proxied without auth.
router = APIRouter()

VALID_PLATFORMS = {"codeforces", "codechef", "atcoder"}


# -------------------------------------------------------
# GET /api/v1/contests
# -------------------------------------------------------
@router.get(
    "",
    response_model=ContestListResponse,
    summary="List all contests",
    description=(
        "Returns all contests from all platforms, ordered by start time. "
        "Supports pagination via `limit` and `offset`."
    ),
)
async def list_contests(
    status_filter: str | None = Query(default=None, alias="status", description="Filter by status (e.g. upcoming, finished)"),
    limit: int = Query(default=50, ge=1, le=200, description="Number of results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    db: AsyncSession = Depends(get_db),
) -> ContestListResponse:
    service = ContestService(db)
    contests, total = await service.get_all(status=status_filter, limit=limit, offset=offset)
    return ContestListResponse(
        contests=[ContestRead.model_validate(c) for c in contests],
        total=total,
        limit=limit,
        offset=offset,
    )


# -------------------------------------------------------
# GET /api/v1/contests/upcoming
# -------------------------------------------------------
@router.get(
    "/upcoming",
    response_model=ContestListResponse,
    summary="List upcoming contests",
    description="Returns only upcoming contests (start_time in the future), soonest first.",
)
async def list_upcoming_contests(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ContestListResponse:
    service = ContestService(db)
    contests, total = await service.get_upcoming(limit=limit, offset=offset)
    return ContestListResponse(
        contests=[ContestRead.model_validate(c) for c in contests],
        total=total,
        limit=limit,
        offset=offset,
    )


# -------------------------------------------------------
# GET /api/v1/contests/platform/{platform}
# -------------------------------------------------------
@router.get(
    "/platform/{platform}",
    response_model=ContestListResponse,
    summary="List contests by platform",
    description=(
        "Returns contests for a specific platform. "
        "Valid platforms: `codeforces`, `codechef`, `atcoder`."
    ),
)
async def list_contests_by_platform(
    platform: str,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ContestListResponse:
    if platform not in VALID_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid platform {platform!r}. "
                f"Valid platforms: {sorted(VALID_PLATFORMS)}"
            ),
        )

    service = ContestService(db)
    contests, total = await service.get_by_platform(platform=platform, status=status_filter, limit=limit, offset=offset)
    return ContestListResponse(
        contests=[ContestRead.model_validate(c) for c in contests],
        total=total,
        limit=limit,
        offset=offset,
    )


# -------------------------------------------------------
# POST /api/v1/contests/sync
# -------------------------------------------------------
@router.post(
    "/sync",
    response_model=SyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronise contests from all platforms",
    description=(
        "Fetches the latest contest data from Codeforces, CodeChef, and AtCoder "
        "and upserts them into the database. Idempotent — safe to call multiple times. "
        "Individual platform failures are reported in the response but do not fail the "
        "whole request."
    ),
)
async def sync_contests(
    db: AsyncSession = Depends(get_db),
) -> SyncResponse:
    logger.info("Manual contest sync triggered")
    service = ContestService(db)
    results = await service.sync_all()
    total_upserted = sum(r.upserted for r in results)
    logger.info("Sync complete. Total upserted: %d", total_upserted)
    return SyncResponse(results=results, total_upserted=total_upserted)
