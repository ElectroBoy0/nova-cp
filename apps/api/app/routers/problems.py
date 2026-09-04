
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_internal_key
from app.models.hint_feedback import HintFeedback
from app.models.problem import RecommendationFeedback
from app.schemas.problem import (
    HintFeedbackCreate,
    HintResponse,
    ProblemListResponse,
    ProblemRecommendationRead,
    ProblemSearchResponse,
    RecommendationFeedbackCreate,
)
from app.services.hint_service import HintService
from app.services.problem_service import ProblemService
from app.services.recommendation.engine import RecommendationEngine

router = APIRouter(prefix="/api/v1/problems", tags=["problems"])


@router.get("/search", response_model=ProblemSearchResponse)
async def search_problems(
    q: str = Query("", description="Search query by ID (2041G), title, tag, or rating"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user_id: str | None = Query(None, description="Optional user ID to annotate solved status"),
    db: AsyncSession = Depends(get_db),
) -> ProblemSearchResponse:
    """
    Search problems across ID (2041G), title (Summmon), tag (dp, trees), or rating (1600).
    Returns ranked problem metadata with user solved status.
    """
    service = ProblemService(db)
    results, total = await service.search_problems(
        query=q,
        limit=limit,
        offset=offset,
        user_id=user_id,
    )
    return ProblemSearchResponse(
        results=results,
        total=total,
        limit=limit,
        offset=offset,
    )

@router.get("", response_model=ProblemListResponse)
async def get_problems(
    platform: str | None = Query(None),
    min_rating: int | None = Query(None),
    max_rating: int | None = Query(None),
    tags: str | None = Query(None, description="Comma-separated list of tags"),
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    tags_list = [t.strip() for t in tags.split(",")] if tags else None

    service = ProblemService(db)
    problems, total = await service.get_problems(
        platform=platform,
        min_rating=min_rating,
        max_rating=max_rating,
        tags=tags_list,
        search=search,
        limit=limit,
        offset=offset
    )

    return ProblemListResponse(
        items=problems,
        total=total,
        limit=limit,
        offset=offset
    )

@router.get("/recommendations/{user_id}", response_model=list[ProblemRecommendationRead], dependencies=[Depends(require_internal_key)])
async def get_recommendations(user_id: str, db: AsyncSession = Depends(get_db)):
    engine = RecommendationEngine(db)
    recommendations = await engine.generate_recommendations(user_id)
    return recommendations

@router.post("/feedback/{user_id}", dependencies=[Depends(require_internal_key)])
async def submit_feedback(
    user_id: str,
    feedback: RecommendationFeedbackCreate,
    db: AsyncSession = Depends(get_db)
):
    from app.config import settings
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    insert_fn = sqlite_insert if is_sqlite else pg_insert

    values = {
        "user_id": user_id,
        "problem_id": feedback.problem_id,
        "recommendation_type": feedback.recommendation_type or "skill_builder",
        "event_type": feedback.event_type,
        "score_snapshot": {} # In a real implementation we'd snapshot the score features here
    }
    stmt = insert_fn(RecommendationFeedback).values(**values)
    await db.execute(stmt)
    await db.commit()

    if feedback.event_type in ["skipped", "solved_externally"]:
        # If the problem was today's daily mission, regenerate it
        try:
            from app.services.daily_mission_service import DailyMissionService
            daily_service = DailyMissionService(db)
            await daily_service.get_or_create_mission_for_today(user_id)
        except Exception:
            pass

    return {"status": "success"}

@router.post("/sync", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_internal_key)])
async def sync_problems(db: AsyncSession = Depends(get_db)):
    """Trigger a manual global problem sync."""
    service = ProblemService(db)
    # Note: In a production setup, we should offload this to a background worker
    # because fetching ~9000 problems takes time. For this MVP we await it.
    result = await service.sync_all_problems()
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result

@router.get("/{problem_id}/hints/{level}", response_model=HintResponse)
async def get_problem_hint(
    problem_id: str,
    level: int,
    db: AsyncSession = Depends(get_db)
):
    if level < 1 or level > 4:
        raise HTTPException(status_code=400, detail="Hint level must be between 1 and 4")

    service = HintService(db)
    try:
        hint = await service.get_hint(problem_id, level)
        return hint
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate hint") from None

@router.post("/{problem_id}/hints/feedback", dependencies=[Depends(require_internal_key)])
async def submit_hint_feedback(
    problem_id: str,
    feedback: HintFeedbackCreate,
    db: AsyncSession = Depends(get_db)
):
    from app.config import settings
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    insert_fn = sqlite_insert if is_sqlite else pg_insert

    stmt = insert_fn(HintFeedback).values(
        user_id=feedback.user_id,
        problem_id=problem_id,
        hint_level=feedback.hint_level,
        event_type=feedback.event_type
    )
    await db.execute(stmt)
    await db.commit()

    return {"status": "success"}

@router.get("/{problem_id}/statement")
async def get_problem_statement(
    problem_id: str,
    session_cookie: str | None = Query(None),
    db: AsyncSession = Depends(get_db)
):
    from app.services.codeforces_statement import CodeforcesStatementService
    from app.models.problem import Problem
    from sqlalchemy import select, or_
    import re

    # Find problem by ID or platform_problem_id or contest_id+index
    stmt = select(Problem).where(
        or_(
            Problem.id == problem_id,
            Problem.platform_problem_id == problem_id,
        )
    )
    res = await db.execute(stmt)
    problem = res.scalar_one_or_none()

    if not problem:
        # Check if problem_id is formatted like '166A' or '1999B1'
        match = re.match(r"^(\d+)([A-Za-z]\d*)$", problem_id)
        if match:
            c_id, p_idx = int(match.group(1)), match.group(2).upper()
            stmt = select(Problem).where(Problem.contest_id == c_id, Problem.index == p_idx)
            res = await db.execute(stmt)
            problem = res.scalar_one_or_none()

    if problem and problem.contest_id:
        contest_id = problem.contest_id
        problem_index = problem.index
        problem_name = problem.name
        problem_rating = problem.rating
        problem_tags = problem.tags or []
        resolved_pid = problem.id
    else:
        # If not present in DB, attempt direct parsing for valid contest+index patterns
        match = re.match(r"^(\d+)([A-Za-z]\d*)$", problem_id)
        if match:
            contest_id = int(match.group(1))
            problem_index = match.group(2).upper()
            problem_name = f"Problem {contest_id}{problem_index}"
            problem_rating = None
            problem_tags = []
            resolved_pid = problem_id
        else:
            raise HTTPException(status_code=404, detail="Problem not found")

    statement = await CodeforcesStatementService.get_statement(
        contest_id=contest_id,
        index=problem_index,
        session_cookie=session_cookie,
        problem_name=problem_name,
    )
    return {
        "problem_id": resolved_pid,
        "contest_id": contest_id,
        "index": problem_index,
        "name": problem_name,
        "rating": problem_rating,
        "tags": problem_tags,
        **statement
    }

