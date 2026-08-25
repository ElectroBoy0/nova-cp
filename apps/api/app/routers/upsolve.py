
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_internal_key
from app.schemas.upsolve import UpsolveQueueResponse, UpsolveStatsRead, UpsolveStatusUpdate
from app.services.upsolve_service import UpsolveService

router = APIRouter(prefix="/api/v1/users/{user_id}/upsolve", tags=["upsolve"], dependencies=[Depends(require_internal_key)])

@router.get("", response_model=UpsolveQueueResponse)
async def get_upsolve_queue(
    user_id: str,
    status: str | None = Query(None, description="Filter by status: not_started, attempted, solved"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = UpsolveService(db)
    items, total = await service.get_upsolve_queue(user_id, status_filter=status, limit=limit, offset=offset)
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/stats", response_model=UpsolveStatsRead)
async def get_upsolve_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    service = UpsolveService(db)
    return await service.get_upsolve_stats(user_id)

@router.post("/generate")
async def generate_upsolve_queue(user_id: str, db: AsyncSession = Depends(get_db)):
    service = UpsolveService(db)
    result = await service.generate_upsolve_queue(user_id)
    await service.refresh_solved_status(user_id)
    return result

@router.patch("/{item_id}")
async def update_upsolve_status(
    user_id: str,
    item_id: str,
    payload: UpsolveStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = UpsolveService(db)
    await service.update_item_status(user_id, item_id, payload.status)
    return {"status": "success"}
