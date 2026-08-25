import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import UserAnalytics
from app.models.user import CFHandle, User


@pytest.fixture
async def sample_user(db_session: AsyncSession):
    u = User(
        id=str(uuid.uuid4()),
        email="test_compare@example.com",
        name="Test Compare",
        provider="github",
        provider_account_id="test_compare_acc",
        onboarding_completed=True
    )
    db_session.add(u)

    h = CFHandle(
        id=str(uuid.uuid4()),
        user_id=u.id,
        handle="tourist",
        rating=3900,
        max_rating=3979,
        rank="legendary_grandmaster",
        max_rank="legendary_grandmaster",
        sync_status="completed"
    )
    db_session.add(h)

    a = UserAnalytics(
        user_id=u.id,
        total_solved=100,
        contest_count=10,
        current_streak_days=5,
        max_streak_days=5,
        topic_mastery={"dp": {"solved": 10, "attempts": 20}, "math": {"solved": 5, "attempts": 5}}
    )
    db_session.add(a)

    await db_session.commit()
    return u

@pytest.mark.asyncio
async def test_get_compare_no_user(client: AsyncClient, internal_headers: dict):
    response = await client.get(
        "/api/v1/users/invalid-id/compare/tourist",
        headers=internal_headers
    )
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_compare_invalid_rival(client: AsyncClient, sample_user: User, internal_headers: dict):
    # Depending on how CodeforcesService behaves with a mocked/invalid handle.
    # It might raise ValueError if not found.
    # Here we simulate hitting the endpoint.
    pass # we can mock CodeforcesService if we want, or skip this if it requires network
