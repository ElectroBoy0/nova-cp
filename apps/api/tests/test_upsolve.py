import datetime
from datetime import UTC

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contest import Contest
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User
from app.services.upsolve_service import UpsolveService


@pytest.mark.asyncio
async def test_upsolve_queue_generation_and_updates(db_session: AsyncSession):
    # 1. Create user
    user = User(
        email="upsolveuser@example.com",
        name="Upsolve User",
        provider="github",
        provider_account_id="gh-upsolve-1",
        timezone="UTC",
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.flush()

    # 2. Create contest and problems
    contest = Contest(
        platform="codeforces",
        platform_contest_id="300",
        contest_name="Codeforces Round 300",
        url="https://codeforces.com/contest/300",
        start_time=datetime.datetime.now(UTC) - datetime.timedelta(days=1),
        duration_seconds=7200,
        status="finished",
    )
    db_session.add(contest)

    prob_a = Problem(
        platform="codeforces",
        platform_problem_id="CF_300_A",
        contest_id=300,
        index="A",
        name="Problem 300A",
        rating=1000,
        tags=["implementation"],
        url="https://codeforces.com/contest/300/problem/A",
    )
    prob_b = Problem(
        platform="codeforces",
        platform_problem_id="CF_300_B",
        contest_id=300,
        index="B",
        name="Problem 300B",
        rating=1500,
        tags=["dp"],
        url="https://codeforces.com/contest/300/problem/B",
    )
    db_session.add_all([prob_a, prob_b])
    await db_session.flush()

    # 3. Add solved submission for A, failed submission for B
    sub_a = Submission(
        user_id=user.id,
        cf_submission_id=3001,
        contest_id=300,
        problem_index="A",
        problem_name="Problem 300A",
        problem_rating=1000,
        tags=["implementation"],
        verdict="OK",
        creation_time=datetime.datetime.now(UTC),
    )
    sub_b = Submission(
        user_id=user.id,
        cf_submission_id=3002,
        contest_id=300,
        problem_index="B",
        problem_name="Problem 300B",
        problem_rating=1500,
        tags=["dp"],
        verdict="WRONG_ANSWER",
        creation_time=datetime.datetime.now(UTC),
    )
    db_session.add_all([sub_a, sub_b])
    await db_session.commit()

    # 4. Generate queue
    service = UpsolveService(db_session)
    result = await service.generate_upsolve_queue(user.id)
    assert result["status"] == "success"

    # Verify only Problem B is in upsolve queue (A was solved)
    items, total = await service.get_upsolve_queue(user.id)
    assert total == 1
    assert items[0].problem_index == "B"
    assert items[0].status == "attempted"

    # 5. Update status
    await service.update_item_status(user.id, items[0].id, "solved")
    items_after, _ = await service.get_upsolve_queue(user.id)
    assert items_after[0].status == "solved"
    assert items_after[0].solved_at is not None

    # 6. Check stats
    stats = await service.get_upsolve_stats(user.id)
    assert stats["total_items"] == 1
    assert stats["solved"] == 1
    assert stats["upsolve_ratio"] == 1.0
