import csv
import io
import json
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_session_factory
from app.middleware.auth import require_internal_key
from app.models.analytics import UserAnalytics
from app.models.submission import Submission
from app.models.user import CFHandle
from app.redis import CacheKey, redis_client
from app.schemas.activity import ActivityHeatmapResponse, ActivitySummary, DayActivity, ProblemRef
from app.schemas.compare import CompareResponse
from app.schemas.user import (
    AuthPayload,
    CFHandleLinkRequest,
    NotificationListResponse,
    NotificationRead,
    UserAnalyticsRead,
    UserRead,
    UserUpdate,
    VerificationTokenResponse,
)
from app.services.compare_service import CompareService
from app.services.notification_service import NotificationService
from app.services.sync_service import SyncService
from app.services.user_service import UserService

router = APIRouter(
    dependencies=[Depends(require_internal_key)],  # All routes require internal API key
)


async def _run_sync_task(user_id: str, handle: str, is_manual: bool = False) -> None:
    factory = get_session_factory()
    async with factory() as session:
        try:
            sync_service = SyncService(session)
            await sync_service.run_full_sync(user_id, handle, is_manual=is_manual)
        except Exception:
            # Errors are already logged and handled inside run_full_sync
            pass


@router.post(
    "/sync",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Sync user from Auth.js session",
    description=(
        "Called by Next.js on every sign-in. Creates the user if they don't exist, "
        "or updates their profile info if they do. Idempotent."
    ),
)
async def sync_user(
    payload: AuthPayload,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """
    Upsert a user from the Auth.js session payload.
    This is the single entry point for user creation in the system.
    """
    service = UserService(db)
    user = await service.upsert_from_auth(payload)
    return UserRead.model_validate(user)


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Get user by ID",
)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id!r} not found.",
        )

    # If user has a linked handle but rating_history hasn't been populated yet, fetch on the fly
    if user.cf_handle and not user.cf_handle.rating_history:
        try:
            from app.services.codeforces_service import CodeforcesService
            async with CodeforcesService() as cf:
                hist = await cf.fetch_rating_history(user.cf_handle.handle)
                if hist:
                    extracted = [
                        {
                            "contest_id": r.get("contestId"),
                            "contest_name": r.get("contestName"),
                            "old_rating": r.get("oldRating"),
                            "new_rating": r.get("newRating"),
                            "rank": r.get("rank"),
                            "time": r.get("ratingUpdateTimeSeconds"),
                        }
                        for r in hist if "newRating" in r
                    ]
                    user.cf_handle.rating_history = extracted
                    await db.commit()
                    await db.refresh(user)
        except Exception:
            pass

    return UserRead.model_validate(user)


@router.post(
    "/{user_id}/cf-handle/verification-token",
    response_model=VerificationTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate CF verification token",
    description="Generates a unique token for Codeforces handle ownership verification.",
)
async def generate_verification_token(
    user_id: str,
    request: CFHandleLinkRequest,
    db: AsyncSession = Depends(get_db),
) -> VerificationTokenResponse:
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id!r} not found.",
        )

    try:
        token = await service.generate_cf_verification_token(user_id, request.handle)
        return VerificationTokenResponse(
            token=token,
            handle=request.handle,
            expires_in_minutes=15
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

@router.post(
    "/{user_id}/cf-handle",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Link a Codeforces handle",
    description="Links or updates the CF handle for a user and queues a sync job.",
)
async def link_cf_handle(
    user_id: str,
    request: CFHandleLinkRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    service = UserService(db)

    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id!r} not found.",
        )

    try:
        user = await service.link_cf_handle(user_id, request.handle)
        # Queue the background sync task with is_manual=True
        background_tasks.add_task(_run_sync_task, user_id, request.handle, is_manual=True)
        return UserRead.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get(
    "/{user_id}/dashboard",
    response_model=UserAnalyticsRead,
    summary="Get user analytics dashboard data",
)
async def get_user_dashboard(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> UserAnalyticsRead:
    analytics = None
    try:
        stmt = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        result = await db.execute(stmt)
        analytics = result.scalar_one_or_none()
    except Exception as e:
        logger.warning("Could not query UserAnalytics for user %s: %s", user_id, e)

    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id!r} not found.",
        )

    if not analytics or analytics.total_solved == 0:
        # Check if the user has a linked handle
        cf_handle_stmt = select(CFHandle).where(CFHandle.user_id == user_id)
        cf_handle_result = await db.execute(cf_handle_stmt)
        cf_handle = cf_handle_result.scalar_one_or_none()

        if cf_handle:
            # Auto-trigger sync if not already syncing
            if cf_handle.sync_status != "syncing":
                background_tasks.add_task(_run_sync_task, user_id, cf_handle.handle)

    # If analytics exists but rating_distribution is empty, backfill it on-the-fly from existing submissions
    if analytics and (not analytics.rating_distribution or len(analytics.rating_distribution) == 0):
        try:
            from app.services.analytics_service import AnalyticsService
            analytics_service = AnalyticsService(db)
            await analytics_service.generate_analytics(user_id)
            stmt = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
            result = await db.execute(stmt)
            analytics = result.scalar_one_or_none()
        except Exception as gen_err:
            logger.warning("Could not auto-generate rating distribution for %s: %s", user_id, gen_err)

    if not analytics:
        return UserAnalyticsRead(
            user_id=user_id,
            total_solved=0,
            contest_count=0,
            current_streak_days=0,
            max_streak_days=0,
            topic_mastery={},
            rating_distribution={},
            verdict_distribution={},
            recommended_problem=None,
        )

    return UserAnalyticsRead.model_validate(analytics)

@router.get(
    "/{user_id}/activity",
    response_model=ActivityHeatmapResponse,
    summary="Get user activity heatmap data",
)
async def get_user_activity(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> ActivityHeatmapResponse:
    # 1. Check Cache
    cache_key = CacheKey.user_activity(user_id)
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        return ActivityHeatmapResponse.model_validate(json.loads(cached_data))

    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        user_tz = ZoneInfo(user.timezone)
    except ZoneInfoNotFoundError:
        user_tz = ZoneInfo("UTC")

    # 2. Fetch last 12 months of accepted submissions
    one_year_ago = datetime.now(UTC) - timedelta(days=365)
    stmt = (
        select(Submission)
        .where(Submission.user_id == user_id)
        .where(Submission.verdict == "OK")
        .where(Submission.creation_time >= one_year_ago)
        .order_by(Submission.creation_time.asc())
    )

    result = await db.execute(stmt)
    submissions = list(result.scalars().all())

    # 3. Aggregate by day
    days_dict = {}
    active_days_set = set()

    for sub in submissions:
        # Use user's timezone date to match streak calculations
        local_time = sub.creation_time.astimezone(user_tz)
        d_str = local_time.date().isoformat()
        active_days_set.add(local_time.date())

        pref = ProblemRef(
            name=sub.problem_name,
            contest_id=sub.contest_id,
            index=sub.problem_index,
            rating=sub.problem_rating
        )

        if d_str not in days_dict:
            days_dict[d_str] = DayActivity(
                date=sub.creation_time.date(),
                solved_count=1,
                max_rating=sub.problem_rating,
                problems=[pref]
            )
        else:
            days_dict[d_str].solved_count += 1
            days_dict[d_str].problems.append(pref)
            if sub.problem_rating:
                current_max = days_dict[d_str].max_rating
                days_dict[d_str].max_rating = max(current_max or 0, sub.problem_rating)

    # 4. Calculate streaks
    current_streak = 0
    max_streak = 0

    if active_days_set:
        sorted_days = sorted(active_days_set)
        current_streak = 1
        max_streak = 1
        streak_counter = 1

        for i in range(1, len(sorted_days)):
            diff = (sorted_days[i] - sorted_days[i - 1]).days
            if diff == 1:
                streak_counter += 1
                max_streak = max(max_streak, streak_counter)
            elif diff > 1:
                streak_counter = 1

        today = datetime.now(user_tz).date()
        current_streak = 0 if (today - sorted_days[-1]).days > 1 else streak_counter

    # Create response
    summary = ActivitySummary(
        current_streak=current_streak,
        longest_streak=max_streak,
        total_solved=len(submissions),
        active_days=len(active_days_set)
    )

    response_data = ActivityHeatmapResponse(days=days_dict, summary=summary)

    # 5. Cache response
    await redis_client.set(
        cache_key,
        response_data.model_dump_json(),
        ex=CacheKey.USER_ACTIVITY_TTL
    )

    return response_data


@router.get(
    "/{user_id}/compare/{rival_handle}",
    response_model=CompareResponse,
    summary="Get user vs rival comparison data",
)
async def get_user_comparison(
    user_id: str,
    rival_handle: str,
    db: AsyncSession = Depends(get_db),
) -> CompareResponse:
    # 1. Check Cache
    cache_key = CacheKey.compare(user_id, rival_handle)
    cached_data = await redis_client.get(cache_key)
    if cached_data:
        return CompareResponse.model_validate(json.loads(cached_data))

    service = CompareService(db)
    try:
        response_data = await service.get_comparison(user_id, rival_handle)
        if not response_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id!r} not found or has no linked handle.",
            )

        # Cache response
        await redis_client.set(
            cache_key,
            response_data.model_dump_json(),
            ex=CacheKey.COMPARE_TTL,
        )
        return response_data
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

@router.patch(
    "/{user_id}/settings",
    response_model=UserRead,
    summary="Update user settings",
)
async def update_user_settings(
    user_id: str,
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if update_data.name is not None:
        user.name = update_data.name
    if update_data.image is not None:
        user.image = update_data.image
    if update_data.timezone is not None:
        user.timezone = update_data.timezone
    if update_data.custom_preferences is not None:
        current_prefs = dict(user.custom_preferences or {})
        current_prefs.update(update_data.custom_preferences)
        user.custom_preferences = current_prefs
    if update_data.notification_settings is not None:
        current_notifs = dict(user.notification_settings or {})
        current_notifs.update(update_data.notification_settings)
        user.notification_settings = current_notifs
    if update_data.onboarding_completed is not None:
        user.onboarding_completed = update_data.onboarding_completed

    await db.commit()
    await db.refresh(user)

    # Invalidate cached profile
    await redis_client.delete(CacheKey.user_profile(user_id))

    return UserRead.model_validate(user)


# -------------------------------------------------------
# In-App Notifications Endpoints
# -------------------------------------------------------


@router.get(
    "/{user_id}/notifications",
    response_model=NotificationListResponse,
    summary="Get user in-app notifications",
)
async def get_user_notifications(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    service = NotificationService(db)
    items, total, unread_count = await service.get_user_notifications(
        user_id=user_id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )
    return NotificationListResponse(
        items=[NotificationRead.model_validate(item) for item in items],
        total=total,
        unread_count=unread_count,
    )


@router.patch(
    "/{user_id}/notifications/{notification_id}/read",
    summary="Mark notification as read",
)
async def mark_notification_read(
    user_id: str,
    notification_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = NotificationService(db)
    success = await service.mark_as_read(user_id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}


@router.post(
    "/{user_id}/notifications/read-all",
    summary="Mark all notifications as read",
)
async def mark_all_notifications_read(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = NotificationService(db)
    count = await service.mark_all_as_read(user_id)
    return {"status": "success", "marked_count": count}


@router.post(
    "/{user_id}/notifications/test",
    summary="Trigger a test in-app notification",
)
async def trigger_test_notification(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = NotificationService(db)
    notification = await service.create_notification(
        user_id=user_id,
        type="system",
        title="Alert System Active",
        message="Your customizable notification preferences are working perfectly!",
        link="/settings",
    )
    return {
        "status": "success",
        "created": notification is not None,
        "notification": NotificationRead.model_validate(notification) if notification else None,
    }


# -------------------------------------------------------
# Data Export Endpoint (CSV)
# -------------------------------------------------------


@router.get(
    "/{user_id}/export",
    summary="Export user problem history as CSV",
)
async def export_user_data(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    from app.models.submission import Submission

    stmt = (
        select(Submission)
        .where(Submission.user_id == user_id, Submission.verdict == "OK")
        .order_by(Submission.creation_time.desc())
    )
    result = await db.execute(stmt)
    submissions = list(result.scalars().all())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Submission ID", "Contest ID", "Index", "Problem Name", "Rating", "Tags", "Solved Date (UTC)"])

    for s in submissions:
        writer.writerow([
            s.cf_submission_id,
            s.contest_id,
            s.problem_index,
            s.problem_name,
            s.problem_rating or "Unrated",
            ", ".join(s.tags) if s.tags else "",
            s.creation_time.strftime("%Y-%m-%d %H:%M:%S") if s.creation_time else "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=novacp_solved_problems_{user_id[:8]}.csv"},
    )


