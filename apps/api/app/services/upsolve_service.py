import logging
from datetime import UTC, datetime

from sqlalchemy import case, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contest import Contest
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.upsolve import UpsolveItem

logger = logging.getLogger(__name__)

class UpsolveService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_upsolve_queue(self, user_id: str, limit_contests: int = 20) -> dict:
        """
        Generates or updates the upsolve queue for the given user based on their submissions.
        Only considers the `limit_contests` most recent contests the user participated in.
        """
        logger.info(f"Generating upsolve queue for user {user_id}")

        # 1. Get the last N contests the user participated in
        # Group by contest_id, order by the most recent submission in that contest
        recent_contests_stmt = (
            select(Submission.contest_id, func.max(Submission.creation_time).label("last_sub"))
            .where(Submission.user_id == user_id)
            .group_by(Submission.contest_id)
            .order_by(func.max(Submission.creation_time).desc())
            .limit(limit_contests)
        )
        recent_contests_result = await self.db.execute(recent_contests_stmt)
        participated_contest_ids = [row[0] for row in recent_contests_result.all() if row[0] is not None]

        if not participated_contest_ids:
            return {"status": "success", "added": 0, "message": "No participated contests found."}

        # 2. Get all problems for these contests
        problems_stmt = select(Problem).where(Problem.contest_id.in_(participated_contest_ids))
        problems_result = await self.db.execute(problems_stmt)
        contest_problems = list(problems_result.scalars().all())

        # Group problems by contest_id
        problems_by_contest = {}
        for p in contest_problems:
            if p.contest_id not in problems_by_contest:
                problems_by_contest[p.contest_id] = []
            problems_by_contest[p.contest_id].append(p)

        # 3. Get all user submissions for these contests
        subs_stmt = select(Submission).where(
            Submission.user_id == user_id,
            Submission.contest_id.in_(participated_contest_ids)
        )
        subs_result = await self.db.execute(subs_stmt)
        submissions = list(subs_result.scalars().all())

        # Group submissions by (contest_id, problem_index)
        subs_by_problem = {}
        for sub in submissions:
            key = (sub.contest_id, sub.problem_index)
            if key not in subs_by_problem:
                subs_by_problem[key] = []
            subs_by_problem[key].append(sub)

        # 4. Fetch contest names to denormalize into UpsolveItem
        str_contest_ids = [str(c) for c in participated_contest_ids]
        contests_stmt = select(Contest.platform_contest_id, Contest.contest_name).where(
            Contest.platform_contest_id.in_(str_contest_ids)
        )
        contests_result = await self.db.execute(contests_stmt)
        # Store using the integer representation as that's what we use later
        contest_names = {int(row[0]): row[1] for row in contests_result.all()}

        # 5. Build upsolve items
        values_to_upsert = []
        now = datetime.now(UTC)

        for contest_id in participated_contest_ids:
            problems = problems_by_contest.get(contest_id, [])
            contest_name = contest_names.get(contest_id, f"Contest {contest_id}")

            for problem in problems:
                subs = subs_by_problem.get((contest_id, problem.index), [])

                # Check if solved
                is_solved = any(s.verdict == "OK" for s in subs)

                # We only add it to the queue if it's NOT solved
                if not is_solved:
                    reason = "Attempted" if len(subs) > 0 else "Not attempted"
                    status = "attempted" if len(subs) > 0 else "not_started"

                    values_to_upsert.append({
                        "user_id": user_id,
                        "contest_id": contest_id,
                        "contest_name": contest_name,
                        "problem_index": problem.index,
                        "problem_name": problem.name,
                        "problem_rating": problem.rating,
                        "tags": problem.tags,
                        "problem_url": problem.url,
                        "reason": reason,
                        "status": status,
                        "added_at": now,
                    })

        if not values_to_upsert:
            return {"status": "success", "added": 0}

        from app.config import settings
        is_sqlite = settings.DATABASE_URL.startswith("sqlite")

        # 6. Upsert the items
        if is_sqlite:
            stmt = sqlite_insert(UpsolveItem).values(values_to_upsert)
            stmt = stmt.on_conflict_do_update(
                index_elements=["user_id", "contest_id", "problem_index"],
                set_={
                    "problem_name": stmt.excluded.problem_name,
                    "problem_rating": stmt.excluded.problem_rating,
                    "tags": stmt.excluded.tags,
                    "problem_url": stmt.excluded.problem_url,
                },
            )
        else:
            stmt = pg_insert(UpsolveItem).values(values_to_upsert)
            stmt = stmt.on_conflict_do_update(
                index_elements=["user_id", "contest_id", "problem_index"],
                set_={
                    "problem_name": stmt.excluded.problem_name,
                    "problem_rating": stmt.excluded.problem_rating,
                    "tags": stmt.excluded.tags,
                    "problem_url": stmt.excluded.problem_url,
                },
            )

        await self.db.execute(stmt)
        await self.db.commit()

        return {"status": "success", "added": len(values_to_upsert)}

    async def refresh_solved_status(self, user_id: str):
        """
        Marks items in the upsolve queue as solved if the user has a new AC submission.
        """
        # Find all unsolved items
        unsolved_stmt = select(UpsolveItem).where(
            UpsolveItem.user_id == user_id,
            UpsolveItem.status != "solved"
        )
        unsolved_result = await self.db.execute(unsolved_stmt)
        unsolved_items = list(unsolved_result.scalars().all())

        if not unsolved_items:
            return

        now = datetime.now(UTC)
        marked_solved = 0

        for item in unsolved_items:
            # Check for an OK submission
            sub_stmt = select(Submission).where(
                Submission.user_id == user_id,
                Submission.contest_id == item.contest_id,
                Submission.problem_index == item.problem_index,
                Submission.verdict == "OK"
            ).limit(1)
            sub_result = await self.db.execute(sub_stmt)

            if sub_result.scalar_one_or_none():
                # They solved it!
                item.status = "solved"
                item.solved_at = now
                marked_solved += 1

        if marked_solved > 0:
            await self.db.commit()

    async def get_upsolve_queue(self, user_id: str, status_filter: str | None = None, limit: int = 50, offset: int = 0):
        query = select(UpsolveItem).where(UpsolveItem.user_id == user_id)

        if status_filter and status_filter != "all":
            query = query.where(UpsolveItem.status == status_filter)

        # Get count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one_or_none() or 0

        # Paginate
        # Prioritize recent contests (higher contest_id usually means more recent)
        query = query.order_by(UpsolveItem.contest_id.desc(), UpsolveItem.problem_index.asc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def update_item_status(self, user_id: str, item_id: str, new_status: str):
        stmt = (
            update(UpsolveItem)
            .where(UpsolveItem.user_id == user_id, UpsolveItem.id == item_id)
            .values(status=new_status)
        )
        if new_status == "solved":
            stmt = stmt.values(solved_at=datetime.now(UTC))

        await self.db.execute(stmt)
        await self.db.commit()

    async def get_upsolve_stats(self, user_id: str):
        stmt = select(
            func.count(UpsolveItem.id).label("total"),
            func.sum(case((UpsolveItem.status == 'solved', 1), else_=0)).label("solved"),
            func.sum(case((UpsolveItem.status == 'not_started', 1), else_=0)).label("not_started"),
            func.sum(case((UpsolveItem.status == 'attempted', 1), else_=0)).label("attempted")
        ).where(UpsolveItem.user_id == user_id)

        result = await self.db.execute(stmt)
        row = result.first()

        total = row.total or 0
        solved = row.solved or 0
        not_started = row.not_started or 0
        attempted = row.attempted or 0

        ratio = (solved / total) if total > 0 else 0.0

        # Monthly stats (simplistic for V1)
        # In a real app we'd filter by added_at/solved_at within current month
        # For now, return basic stats
        return {
            "total_items": total,
            "not_started": not_started,
            "attempted": attempted,
            "solved": solved,
            "upsolve_ratio": ratio,
            "monthly_total": total,  # Placeholder
            "monthly_solved": solved, # Placeholder
            "monthly_ratio": ratio
        }
