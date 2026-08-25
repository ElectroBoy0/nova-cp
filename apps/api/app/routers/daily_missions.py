from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_internal_key
from app.services.daily_mission_service import DailyMissionService
from app.services.user_service import UserService

router = APIRouter(
    prefix="/daily-mission",
    tags=["Daily Mission"],
    dependencies=[Depends(require_internal_key)]
)

@router.get("/{user_id}", response_model=dict)
async def get_daily_mission(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get or generate today's Daily Mission for the user.
    """
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if not user.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must link Codeforces handle to get a daily mission.",
        )

    service = DailyMissionService(db)
    mission = await service.get_or_create_mission_for_today(user_id)

    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not generate daily mission.",
        )

    return mission
