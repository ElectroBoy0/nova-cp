import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem
from app.services.codeforces_service import CodeforcesService

logger = logging.getLogger(__name__)

class ProblemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_all_problems(self) -> dict[str, Any]:
        """
        Fetches the complete problemset from Codeforces and upserts it into the DB.
        """
        logger.info("Starting global problem sync from Codeforces")
        try:
            async with CodeforcesService() as cf:
                cf_problems = await cf.fetch_problemset()

            if not cf_problems:
                logger.warning("No problems returned from Codeforces API")
                return {"status": "error", "message": "Failed to fetch problems from CF"}

            upserted = 0
            # Process in batches to avoid overwhelming the DB
            batch_size = 500
            for i in range(0, len(cf_problems), batch_size):
                batch = cf_problems[i:i + batch_size]

                values = []
                for p in batch:
                    contest_id = p.get("contestId")
                    index = p.get("index")
                    if not contest_id or not index:
                        continue

                    platform_id = f"CF_{contest_id}_{index}"
                    url = f"https://codeforces.com/contest/{contest_id}/problem/{index}"

                    values.append({
                        "platform": "codeforces",
                        "platform_problem_id": platform_id,
                        "contest_id": contest_id,
                        "index": index,
                        "name": p.get("name", "Unknown"),
                        "rating": p.get("rating"),
                        "tags": p.get("tags", []),
                        "url": url,
                        "solved_count": p.get("solvedCount", 0),
                    })

                if not values:
                    continue

                stmt = insert(Problem).values(values)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['platform_problem_id'],
                    set_={
                        'name': stmt.excluded.name,
                        'rating': stmt.excluded.rating,
                        'tags': stmt.excluded.tags,
                        'solved_count': stmt.excluded.solved_count,
                    }
                )
                await self.db.execute(stmt)
                await self.db.commit()
                upserted += len(values)

            logger.info(f"Successfully synced {upserted} problems")
            return {"status": "success", "synced_count": upserted}

        except Exception as e:
            logger.exception("Error syncing problems: %s", e)
            await self.db.rollback()
            return {"status": "error", "message": str(e)}

    async def get_problems(
        self,
        platform: str | None = None,
        min_rating: int | None = None,
        max_rating: int | None = None,
        tags: list[str] | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[Problem], int]:
        """
        Query problems with various filters.
        Returns (problems_list, total_count).
        """
        query = select(Problem)

        # Apply filters
        if platform:
            query = query.where(Problem.platform == platform)
        if min_rating is not None:
            query = query.where(Problem.rating >= min_rating)
        if max_rating is not None:
            query = query.where(Problem.rating <= max_rating)
        if tags:
            # PostgreSQL JSONB contains operator ?& (has all keys)
            query = query.where(Problem.tags.contains(tags))
        if search:
            query = query.where(Problem.name.ilike(f"%{search}%"))

        # Get total count
        from sqlalchemy import func
        count_query = select(func.count()).select_from(query.subquery())
        total_count_result = await self.db.execute(count_query)
        total_count = total_count_result.scalar_one_or_none() or 0

        # Apply sorting and pagination
        query = query.order_by(Problem.contest_id.desc(), Problem.index)
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        problems = list(result.scalars().all())

        return problems, total_count
