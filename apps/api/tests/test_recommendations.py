import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import UserAnalytics
from app.models.problem import Problem, RecommendationFeedback
from app.models.user import CFHandle, User
from app.services.recommendation.engine import RecommendationEngine


@pytest.mark.asyncio
async def test_recommendations_and_feedback_filtering(db_session: AsyncSession):
    # 1. Create user and CF handle
    user = User(
        email="recsuser@example.com",
        name="Recs User",
        provider="github",
        provider_account_id="gh-recs-1",
        timezone="UTC",
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.flush()

    handle = CFHandle(
        user_id=user.id,
        handle="recs_handle",
        rating=1400,
        sync_status="completed",
    )
    db_session.add(handle)

    analytics = UserAnalytics(
        user_id=user.id,
        total_solved=10,
        contest_count=3,
        current_streak_days=1,
        max_streak_days=1,
        topic_mastery={"dp": {"solved": 1, "attempts": 5}, "greedy": {"solved": 4, "attempts": 4}},
    )
    db_session.add(analytics)

    # 2. Add sample problems in rating range
    p1 = Problem(
        platform="codeforces",
        platform_problem_id="CF_401_A",
        contest_id=401,
        index="A",
        name="DP Problem 1",
        rating=1400,
        tags=["dp"],
        url="https://codeforces.com/contest/401/problem/A",
        solved_count=1000,
    )
    p2 = Problem(
        platform="codeforces",
        platform_problem_id="CF_401_B",
        contest_id=401,
        index="B",
        name="Greedy Problem 2",
        rating=1500,
        tags=["greedy"],
        url="https://codeforces.com/contest/401/problem/B",
        solved_count=800,
    )
    db_session.add_all([p1, p2])
    await db_session.commit()

    # 3. Generate recommendations
    engine = RecommendationEngine(db_session)
    recs = await engine.generate_recommendations(user.id)
    assert len(recs) > 0

    # 4. Skip problem p1
    feedback = RecommendationFeedback(
        user_id=user.id,
        problem_id=p1.id,
        recommendation_type="skill_builder",
        event_type="skipped",
        score_snapshot={},
    )
    db_session.add(feedback)
    await db_session.commit()

    # 5. Re-generate recommendations and ensure p1 is excluded
    recs_after = await engine.generate_recommendations(user.id)
    rec_ids = [r["problem"]["id"] for r in recs_after]
    assert p1.id not in rec_ids
