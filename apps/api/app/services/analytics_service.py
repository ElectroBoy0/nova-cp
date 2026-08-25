import logging
from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import UserAnalytics
from app.models.daily_mission import DailyMission
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def generate_analytics(self, user_id: str, rated_contest_count: int | None = None) -> None:
        """
        Calculates user analytics based on submissions and updates the database.
        """
        logger.info("Generating analytics for user %s", user_id)

        # 1. Fetch user to get timezone
        user_query = select(User).where(User.id == user_id)
        user = (await self.db.execute(user_query)).scalar_one_or_none()
        if not user:
            logger.info("User %s not found. Skipping analytics generation.", user_id)
            return

        try:
            user_tz = ZoneInfo(user.timezone)
        except ZoneInfoNotFoundError:
            user_tz = ZoneInfo("UTC")

        # 2. Fetch all submissions for the user
        stmt = select(Submission).where(Submission.user_id == user_id).order_by(Submission.creation_time.asc())
        result = await self.db.execute(stmt)
        submissions = list(result.scalars().all())

        if not submissions:
            logger.info("No submissions found for user %s. Skipping analytics generation.", user_id)
            return

        solved_problems = set()
        contests_participated = set()
        topic_stats = defaultdict(lambda: {"solved": 0, "attempts": 0})

        # For streak calculation
        active_days = set()

        for sub in submissions:
            is_ac = sub.verdict == "OK"

            if is_ac:
                problem_key = f"{sub.contest_id}_{sub.problem_index}" if sub.contest_id else sub.problem_name
                solved_problems.add(problem_key)

                # Active days are only when a problem is solved
                local_time = sub.creation_time.astimezone(user_tz)
                active_days.add(local_time.date())

            if sub.contest_id:
                contests_participated.add(sub.contest_id)

            for tag in sub.tags:
                topic_stats[tag]["attempts"] += 1
                if is_ac:
                    topic_stats[tag]["solved"] += 1

        # 3. Calculate streak
        current_streak = 0
        max_streak = 0

        if active_days:
            sorted_days = sorted(active_days)
            current_streak = 1
            max_streak = 1
            streak_counter = 1

            for i in range(1, len(sorted_days)):
                diff = (sorted_days[i] - sorted_days[i-1]).days
                if diff == 1:
                    streak_counter += 1
                    max_streak = max(max_streak, streak_counter)
                elif diff > 1:
                    streak_counter = 1

            # If the last active day was more than 1 day ago, current streak is 0
            today = datetime.now(user_tz).date()
            current_streak = 0 if (today - sorted_days[-1]).days > 1 else streak_counter

        # 4. Check Daily Mission Completion
        today = datetime.now(user_tz).date()
        mission_query = select(DailyMission).where(
            DailyMission.user_id == user_id,
            DailyMission.mission_date == today,
        )
        daily_mission = (await self.db.execute(mission_query)).scalar_one_or_none()

        if daily_mission and not daily_mission.is_completed:
            # Look up problem by ID to get its contest_id and index
            prob_query = select(Problem).where(Problem.id == daily_mission.problem_id)
            mission_problem = (await self.db.execute(prob_query)).scalar_one_or_none()

            if mission_problem and mission_problem.contest_id:
                # Check if this problem was solved
                mission_prob_query = select(Submission).where(
                    Submission.user_id == user_id,
                    Submission.contest_id == mission_problem.contest_id,
                    Submission.problem_index == mission_problem.index,
                    Submission.verdict == "OK",
                )
                mission_sub = (await self.db.execute(mission_prob_query)).first()
                if mission_sub:
                    daily_mission.is_completed = True

        # 5. Topic Mastery & Recommendation
        # Find weakest topic (most attempts but lowest solve rate)
        # We'll just sort by solve rate ascending, minimum 5 attempts
        weakest_topic = None
        lowest_rate = 1.0

        for topic, stats in topic_stats.items():
            if stats["attempts"] >= 5:
                rate = stats["solved"] / stats["attempts"]
                if rate < lowest_rate:
                    lowest_rate = rate
                    weakest_topic = topic

        recommended_problem = None
        if weakest_topic:
            # We would ideally query a problem bank here.
            # For now, we'll mock a recommendation based on the weakest topic.
            recommended_problem = {
                "name": f"Practice {weakest_topic.title()}",
                "contestId": 1000,
                "index": "A",
                "rating": 1200,
                "topic": weakest_topic
            }

        # 6. Upsert UserAnalytics
        stmt = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        result = await self.db.execute(stmt)
        analytics = result.scalar_one_or_none()

        final_contest_count = rated_contest_count if rated_contest_count is not None else len(contests_participated)

        if analytics is None:
            analytics = UserAnalytics(
                user_id=user_id,
                total_solved=len(solved_problems),
                contest_count=final_contest_count,
                current_streak_days=current_streak,
                max_streak_days=max_streak,
                topic_mastery=dict(topic_stats),
                recommended_problem=recommended_problem
            )
            self.db.add(analytics)
        else:
            analytics.total_solved = len(solved_problems)
            analytics.contest_count = final_contest_count
            analytics.current_streak_days = current_streak
            analytics.max_streak_days = max_streak
            analytics.topic_mastery = dict(topic_stats)
            analytics.recommended_problem = recommended_problem

        await self.db.commit()
        logger.info("Analytics generated for user %s", user_id)
