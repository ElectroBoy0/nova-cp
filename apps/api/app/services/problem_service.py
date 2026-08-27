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

    async def search_problems(
        self,
        query: str = "",
        limit: int = 20,
        offset: int = 0,
        user_id: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """
        Fast search across problems by Problem ID (e.g. 2041G), title, tags, and rating.
        Annotates each result with the user's solved/attempted status if user_id is provided.
        """
        import re
        from sqlalchemy import and_, or_, cast, String, func
        from app.models.submission import Submission

        clean_q = query.strip()
        stmt = select(Problem)

        if clean_q:
            # 1. Check for exact Problem ID pattern (e.g., "2041G", "2041 g", "1705B", "CF_2041_G")
            id_match = re.match(r"^(?:cf[_\-\s]*)?(\d+)\s*[-_]?\s*([a-zA-Z]\d*)$", clean_q, re.IGNORECASE)
            
            # 2. Check for pure number query (could be contest ID or rating, e.g. "2041" or "1600")
            num_match = re.match(r"^(\d+)$", clean_q)

            conditions = []

            if id_match:
                cid = int(id_match.group(1))
                pidx = id_match.group(2).upper()
                conditions.append(
                    and_(
                        Problem.contest_id == cid,
                        func.upper(Problem.index) == pidx
                    )
                )

            # Multi-token matching (e.g., "dp 1600", "tree 1400", "greedy easy")
            tokens = clean_q.split()
            if len(tokens) > 1:
                token_conditions = []
                for token in tokens:
                    if token.isdigit() and 800 <= int(token) <= 3500 and int(token) % 100 == 0:
                        token_conditions.append(
                            or_(
                                Problem.rating == int(token),
                                Problem.contest_id == int(token),
                                Problem.name.ilike(f"%{token}%")
                            )
                        )
                    else:
                        token_conditions.append(
                            or_(
                                Problem.name.ilike(f"%{token}%"),
                                cast(Problem.tags, String).ilike(f"%{token}%"),
                                func.lower(Problem.index) == token.lower()
                            )
                        )
                conditions.append(and_(*token_conditions))

            # General text search (name, tags, platform_problem_id)
            general_or = [
                Problem.name.ilike(f"%{clean_q}%"),
                cast(Problem.tags, String).ilike(f"%{clean_q}%"),
                Problem.platform_problem_id.ilike(f"%{clean_q}%"),
            ]

            if num_match:
                val = int(num_match.group(1))
                general_or.append(Problem.contest_id == val)
                if 800 <= val <= 3500:
                    general_or.append(Problem.rating == val)

            conditions.append(or_(*general_or))

            stmt = stmt.where(or_(*conditions))

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.db.execute(count_stmt)).scalar_one_or_none() or 0

        # Order by contest ID desc, then index
        stmt = stmt.order_by(Problem.contest_id.desc().nullslast(), Problem.index.asc())
        stmt = stmt.limit(limit).offset(offset)

        problems = list((await self.db.execute(stmt)).scalars().all())

        # If user_id is provided, check user's submission status for these problems
        user_status_map: dict[str, str] = {}
        if user_id and problems:
            problem_keys = [(p.contest_id, p.index) for p in problems if p.contest_id]
            if problem_keys:
                sub_stmt = select(
                    Submission.contest_id,
                    Submission.problem_index,
                    Submission.verdict
                ).where(
                    Submission.user_id == user_id,
                    or_(*[
                        and_(Submission.contest_id == cid, Submission.problem_index == pidx)
                        for cid, pidx in problem_keys
                    ])
                )
                sub_res = await self.db.execute(sub_stmt)
                for row in sub_res.all():
                    key = f"{row.contest_id}_{row.problem_index}"
                    if row.verdict == "OK":
                        user_status_map[key] = "solved"
                    elif key not in user_status_map:
                        user_status_map[key] = "attempted"

        results = []
        for p in problems:
            key = f"{p.contest_id}_{p.index}"
            status = user_status_map.get(key, "unattempted") if user_id else None
            prob_display_id = f"{p.contest_id}{p.index}" if p.contest_id else p.index
            results.append({
                "id": prob_display_id,
                "problem_id": str(p.id),
                "platform": p.platform,
                "platform_problem_id": p.platform_problem_id,
                "contest_id": p.contest_id,
                "index": p.index,
                "name": p.name,
                "title": p.name,
                "rating": p.rating,
                "tags": p.tags or [],
                "url": p.url,
                "solved_count": p.solved_count,
                "status": status,
            })

        return results, total
