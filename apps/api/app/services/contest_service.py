from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.fetchers import FetchError, get_all_fetchers
from app.fetchers.base import BaseFetcher, ContestData
from app.models.contest import Contest
from app.schemas.contest import SyncResult

logger = logging.getLogger(__name__)


class ContestService:
    """
    Business logic for contest data management.

    Responsibilities:
    - Orchestrate fetching from all registered platform fetchers
    - Upsert normalised ContestData into the contests table
    - Provide query methods for the REST layer

    Design notes:
    - Each fetcher failure is isolated: one platform failing does NOT
      abort the sync for other platforms.
    - Upsert uses database-level INSERT … ON CONFLICT DO UPDATE to
      guarantee atomic deduplication even under concurrent syncs.
    - Query methods accept limit/offset for pagination.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # -------------------------------------------------------
    # Sync
    # -------------------------------------------------------

    async def sync_all(self) -> list[SyncResult]:
        """
        Fetch contests from all registered platforms and upsert them.
        Returns one SyncResult per platform.
        """
        fetchers = get_all_fetchers()
        results: list[SyncResult] = []

        for fetcher in fetchers:
            result = await self._sync_platform(fetcher)
            results.append(result)

        return results

    async def _sync_platform(self, fetcher: BaseFetcher) -> SyncResult:
        """
        Fetch + upsert a single platform. Catches all exceptions so
        one platform failure does not affect others.
        """
        platform = fetcher.PLATFORM
        try:
            contests = await fetcher.fetch()
            upserted = await self._upsert_contests(contests)
            logger.info("[%s] Upserted %d contests", platform, upserted)
            return SyncResult(platform=platform, fetched=len(contests), upserted=upserted)
        except FetchError as exc:
            logger.warning("[%s] Fetch failed: %s", platform, exc.reason)
            return SyncResult(platform=platform, fetched=0, upserted=0, error=exc.reason)
        except Exception as exc:
            logger.exception("[%s] Unexpected error during sync", platform)
            return SyncResult(platform=platform, fetched=0, upserted=0, error=str(exc))

    async def _upsert_contests(self, contests: list[ContestData]) -> int:
        """
        Bulk upsert a list of ContestData into the contests table.

        Uses PostgreSQL's INSERT … ON CONFLICT DO UPDATE. Falls back
        to a SQLite-compatible path for the test environment.

        Returns the count of rows that were inserted or updated.
        """
        if not contests:
            return 0

        # Determine the current dialect by inspecting the DATABASE_URL.
        # We avoid self.db.bind which is not available in async sessions (SA 2.0).
        from app.config import settings

        is_sqlite = settings.DATABASE_URL.startswith("sqlite")

        rows = [self._contest_data_to_row(c) for c in contests]

        if is_sqlite:
            return await self._upsert_sqlite(rows)
        return await self._upsert_postgresql(rows)

    async def _upsert_postgresql(self, rows: list[dict]) -> int:
        """PostgreSQL-native INSERT … ON CONFLICT DO UPDATE."""
        stmt = pg_insert(Contest).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["platform", "platform_contest_id"],
            set_={
                "contest_name": stmt.excluded.contest_name,
                "url": stmt.excluded.url,
                "start_time": stmt.excluded.start_time,
                "duration_seconds": stmt.excluded.duration_seconds,
                "status": stmt.excluded.status,
                "registration_open": stmt.excluded.registration_open,
                "updated_at": datetime.now(UTC),
            },
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    async def _upsert_sqlite(self, rows: list[dict]) -> int:
        """
        SQLite-compatible upsert used in tests.
        Uses INSERT OR REPLACE semantics via SQLite's insert dialect.
        """
        stmt = sqlite_insert(Contest).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["platform", "platform_contest_id"],
            set_={
                "contest_name": stmt.excluded.contest_name,
                "url": stmt.excluded.url,
                "start_time": stmt.excluded.start_time,
                "duration_seconds": stmt.excluded.duration_seconds,
                "status": stmt.excluded.status,
                "registration_open": stmt.excluded.registration_open,
                "updated_at": datetime.now(UTC),
            },
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    @staticmethod
    def _contest_data_to_row(c: ContestData) -> dict:
        """Map a ContestData dataclass to a dict suitable for bulk insert."""
        import uuid

        now = datetime.now(UTC)
        return {
            "id": str(uuid.uuid4()),
            "platform": c.platform,
            "platform_contest_id": c.platform_contest_id,
            "contest_name": c.contest_name,
            "url": c.url,
            "start_time": c.start_time,
            "duration_seconds": c.duration_seconds,
            "status": c.status,
            "registration_open": c.registration_open,
            "created_at": now,
            "updated_at": now,
        }

    # -------------------------------------------------------
    # Queries
    # -------------------------------------------------------

    async def get_all(
        self,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Contest], int]:
        """
        Return all contests. If status='upcoming', ordered soonest first.
        Otherwise ordered newest first.
        """
        where_clause = True
        now = datetime.now(UTC)
        if status == "upcoming":
            where_clause = Contest.start_time > now
        elif status == "finished":
            # Just rough approximation for finished
            where_clause = (Contest.start_time <= now) & (Contest.status != "running")
        elif status:
            where_clause = Contest.status == status

        count_stmt = select(func.count()).select_from(Contest).where(where_clause)
        total = (await self.db.execute(count_stmt)).scalar_one()

        order_col = Contest.start_time.asc() if status == "upcoming" else Contest.start_time.desc()

        stmt = (
            select(Contest)
            .where(where_clause)
            .order_by(order_col)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def get_upcoming(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Contest], int]:
        """Return upcoming contests (status='upcoming'), soonest first."""
        now = datetime.now(UTC)
        where = Contest.start_time > now

        count_stmt = select(func.count()).select_from(Contest).where(where)
        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(Contest)
            .where(where)
            .order_by(Contest.start_time.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_platform(
        self,
        platform: str,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[Contest], int]:
        """Return contests for a single platform."""
        where_clause = Contest.platform == platform
        now = datetime.now(UTC)
        if status == "upcoming":
            where_clause = (Contest.platform == platform) & (Contest.start_time > now)
        elif status == "finished":
            where_clause = (Contest.platform == platform) & (Contest.start_time <= now) & (Contest.status != "running")
        elif status:
            where_clause = (Contest.platform == platform) & (Contest.status == status)

        count_stmt = select(func.count()).select_from(Contest).where(where_clause)
        total = (await self.db.execute(count_stmt)).scalar_one()

        order_col = Contest.start_time.asc() if status == "upcoming" else Contest.start_time.desc()

        stmt = (
            select(Contest)
            .where(where_clause)
            .order_by(order_col)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total
