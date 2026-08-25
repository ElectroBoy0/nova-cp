from __future__ import annotations

"""
Service-level tests for ContestService.
Uses in-memory SQLite (same pattern as conftest.py).
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("INTERNAL_API_KEY", "test-key")

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.fetchers.base import ContestData
from app.models.contest import Contest
from app.services.contest_service import ContestService


def _make_contest(
    platform: str = "codeforces",
    contest_id: str = "1000",
    name: str = "Test Round",
    status: str = "upcoming",
    hours_from_now: int = 24,
) -> ContestData:
    return ContestData(
        platform=platform,
        platform_contest_id=contest_id,
        contest_name=name,
        url=f"https://example.com/{contest_id}",
        start_time=datetime.now(UTC) + timedelta(hours=hours_from_now),
        duration_seconds=7200,
        status=status,
        registration_open=True,
    )


class TestContestServiceUpsert:
    @pytest.mark.asyncio
    async def test_upsert_inserts_new_contest(self, db_session) -> None:
        service = ContestService(db_session)
        contests = [_make_contest(contest_id="cf-101")]

        await service._upsert_contests(contests)

        result = await db_session.execute(
            select(Contest).where(Contest.platform_contest_id == "cf-101")
        )
        row = result.scalar_one_or_none()
        assert row is not None
        assert row.contest_name == "Test Round"
        assert row.platform == "codeforces"

    @pytest.mark.asyncio
    async def test_upsert_updates_existing_contest(self, db_session) -> None:
        """Upserting the same (platform, platform_contest_id) must update, not duplicate."""
        service = ContestService(db_session)

        original = [_make_contest(contest_id="cf-200", name="Original Name")]
        await service._upsert_contests(original)

        updated = [_make_contest(contest_id="cf-200", name="Updated Name")]
        await service._upsert_contests(updated)

        result = await db_session.execute(
            select(Contest).where(Contest.platform_contest_id == "cf-200")
        )
        rows = result.scalars().all()
        assert len(rows) == 1, "Duplicate row must not be created"
        assert rows[0].contest_name == "Updated Name"

    @pytest.mark.asyncio
    async def test_upsert_empty_list_returns_zero(self, db_session) -> None:
        service = ContestService(db_session)
        count = await service._upsert_contests([])
        assert count == 0

    @pytest.mark.asyncio
    async def test_upsert_multiple_platforms_no_collision(self, db_session) -> None:
        """Same contest_id on different platforms must NOT conflict."""
        service = ContestService(db_session)
        contests = [
            _make_contest(platform="codeforces", contest_id="999"),
            _make_contest(platform="codechef", contest_id="999"),
        ]
        await service._upsert_contests(contests)

        result = await db_session.execute(select(Contest))
        rows = result.scalars().all()
        assert len(rows) == 2

    @pytest.mark.asyncio
    async def test_upsert_batch_of_contests(self, db_session) -> None:
        service = ContestService(db_session)
        contests = [
            _make_contest(contest_id=f"cf-{i}", name=f"Round {i}")
            for i in range(10)
        ]
        await service._upsert_contests(contests)

        result = await db_session.execute(select(Contest))
        rows = result.scalars().all()
        assert len(rows) == 10


class TestContestServiceQueries:
    @pytest.mark.asyncio
    async def test_get_all_returns_all_contests(self, db_session) -> None:
        service = ContestService(db_session)
        contests = [_make_contest(contest_id=f"c{i}") for i in range(5)]
        await service._upsert_contests(contests)

        all_contests, total = await service.get_all()
        assert total == 5
        assert len(all_contests) == 5

    @pytest.mark.asyncio
    async def test_get_all_pagination(self, db_session) -> None:
        service = ContestService(db_session)
        contests = [_make_contest(contest_id=f"c{i}") for i in range(10)]
        await service._upsert_contests(contests)

        page1, total = await service.get_all(limit=3, offset=0)
        page2, _ = await service.get_all(limit=3, offset=3)

        assert total == 10
        assert len(page1) == 3
        assert len(page2) == 3
        # Pages must not overlap
        ids1 = {c.platform_contest_id for c in page1}
        ids2 = {c.platform_contest_id for c in page2}
        assert ids1.isdisjoint(ids2)

    @pytest.mark.asyncio
    async def test_get_upcoming_filters_by_start_time(self, db_session) -> None:
        service = ContestService(db_session)
        upcoming = _make_contest(contest_id="future", hours_from_now=48)
        past = ContestData(
            platform="codeforces",
            platform_contest_id="past",
            contest_name="Past Contest",
            url="https://example.com/past",
            start_time=datetime.now(UTC) - timedelta(hours=48),
            duration_seconds=7200,
            status="finished",
            registration_open=None,
        )
        await service._upsert_contests([upcoming, past])

        contests, total = await service.get_upcoming()
        ids = [c.platform_contest_id for c in contests]
        assert "future" in ids
        assert "past" not in ids

    @pytest.mark.asyncio
    async def test_get_by_platform_filters_correctly(self, db_session) -> None:
        service = ContestService(db_session)
        contests = [
            _make_contest(platform="codeforces", contest_id="cf1"),
            _make_contest(platform="codeforces", contest_id="cf2"),
            _make_contest(platform="codechef", contest_id="cc1"),
        ]
        await service._upsert_contests(contests)

        cf_contests, total = await service.get_by_platform("codeforces")
        assert total == 2
        assert all(c.platform == "codeforces" for c in cf_contests)

        cc_contests, cc_total = await service.get_by_platform("codechef")
        assert cc_total == 1
