import datetime
from datetime import UTC

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import UserAnalytics
from app.models.daily_mission import DailyMission
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import CFHandle, User
from app.services.analytics_service import AnalyticsService


@pytest.mark.asyncio
async def test_analytics_generation_and_streaks(db_session: AsyncSession):
    # 1. Create user
    user = User(
        email="analyticstest@example.com",
        name="Analytics User",
        provider="github",
        provider_account_id="gh-analytic-1",
        timezone="UTC",
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.flush()

    handle = CFHandle(
        user_id=user.id,
        handle="testuser",
        rating=1500,
        sync_status="completed",
    )
    db_session.add(handle)
    await db_session.flush()

    # 2. Add submissions for multiple consecutive days
    now = datetime.datetime.now(UTC)
    day1 = now - datetime.timedelta(days=2)
    day2 = now - datetime.timedelta(days=1)
    day3 = now

    subs = [
        Submission(
            user_id=user.id,
            cf_submission_id=1001,
            contest_id=100,
            problem_index="A",
            problem_name="Problem A",
            problem_rating=1200,
            tags=["dp", "math"],
            verdict="OK",
            creation_time=day1,
        ),
        Submission(
            user_id=user.id,
            cf_submission_id=1002,
            contest_id=100,
            problem_index="B",
            problem_name="Problem B",
            problem_rating=1400,
            tags=["dp", "greedy"],
            verdict="OK",
            creation_time=day2,
        ),
        Submission(
            user_id=user.id,
            cf_submission_id=1003,
            contest_id=101,
            problem_index="A",
            problem_name="Problem C",
            problem_rating=1500,
            tags=["math"],
            verdict="OK",
            creation_time=day3,
        ),
    ]
    for s in subs:
        db_session.add(s)
    await db_session.commit()

    # 3. Generate analytics
    service = AnalyticsService(db_session)
    await service.generate_analytics(user.id, rated_contest_count=2)

    # 4. Verify results
    analytics_stmt = select(UserAnalytics).where(UserAnalytics.user_id == user.id)
    analytics = (await db_session.execute(analytics_stmt)).scalar_one()

    assert analytics.total_solved == 3
    assert analytics.contest_count == 2
    assert analytics.current_streak_days == 3
    assert analytics.max_streak_days == 3
    assert analytics.topic_mastery["dp"]["solved"] == 2
    assert analytics.topic_mastery["math"]["solved"] == 2


@pytest.mark.asyncio
async def test_analytics_completes_daily_mission(db_session: AsyncSession):
    # 1. Create user
    user = User(
        email="missionuser@example.com",
        name="Mission User",
        provider="github",
        provider_account_id="gh-mission-1",
        timezone="UTC",
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.flush()

    # 2. Create problem
    problem = Problem(
        platform="codeforces",
        platform_problem_id="CF_200_A",
        contest_id=200,
        index="A",
        name="Daily Target Problem",
        rating=1300,
        tags=["graphs"],
        url="https://codeforces.com/contest/200/problem/A",
    )
    db_session.add(problem)
    await db_session.flush()

    # 3. Create Daily Mission for today
    today = datetime.datetime.now(UTC).date()
    mission = DailyMission(
        user_id=user.id,
        mission_date=today,
        problem_id=problem.id,
        is_completed=False,
    )
    db_session.add(mission)
    await db_session.commit()

    # 4. Add AC submission for this problem
    sub = Submission(
        user_id=user.id,
        cf_submission_id=2001,
        contest_id=200,
        problem_index="A",
        problem_name="Daily Target Problem",
        problem_rating=1300,
        tags=["graphs"],
        verdict="OK",
        creation_time=datetime.datetime.now(UTC),
    )
    db_session.add(sub)
    await db_session.commit()

    # 5. Run analytics generation
    service = AnalyticsService(db_session)
    await service.generate_analytics(user.id)

    # 6. Verify daily mission is marked as completed
    await db_session.refresh(mission)
    assert mission.is_completed is True
