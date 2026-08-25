import logging
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_mission import DailyMission
from app.models.problem import Problem
from app.models.user import User
from app.services.recommendation.engine import RecommendationEngine

logger = logging.getLogger(__name__)

class DailyMissionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.engine = RecommendationEngine(db)

    def _get_local_date(self, tz_name: str):
        try:
            tz = ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            tz = ZoneInfo("UTC")
        return datetime.now(tz).date()

    async def get_or_create_mission_for_today(self, user_id: str) -> dict | None:
        user_query = select(User).where(User.id == user_id)
        user = (await self.db.execute(user_query)).scalar_one_or_none()

        if not user:
            return None

        local_date = self._get_local_date(user.timezone)

        # Check if mission exists for today
        mission_query = select(DailyMission).where(
            DailyMission.user_id == user_id,
            DailyMission.mission_date == local_date
        )
        existing_mission = (await self.db.execute(mission_query)).scalar_one_or_none()

        if existing_mission:
            # We need to fetch the problem details
            prob_query = select(Problem).where(Problem.id == existing_mission.problem_id)
            problem = (await self.db.execute(prob_query)).scalar_one_or_none()
            if problem:
                # Format it similar to how the engine returns it, but without explanation for now
                # or we could save the explanation in the DB? Let's just return a basic dict
                return {
                    "mission_id": str(existing_mission.id),
                    "is_completed": existing_mission.is_completed,
                    "date": str(existing_mission.mission_date),
                    "problem": {
                        "id": str(problem.id),
                        "platform": problem.platform,
                        "platform_problem_id": problem.platform_problem_id,
                        "contest_id": problem.contest_id,
                        "index": problem.index,
                        "name": problem.name,
                        "rating": problem.rating,
                        "tags": problem.tags,
                        "url": problem.url,
                        "solved_count": problem.solved_count,
                    },
                    "explanation": {
                        "bucket": "todays_mission",
                        "reasoning": "This is your daily target based on your weak topics."
                    }
                }

        # Generate new mission
        mission_data = await self.engine.generate_daily_mission(user_id)
        if not mission_data:
            return None

        new_mission = DailyMission(
            user_id=user_id,
            mission_date=local_date,
            problem_id=mission_data["problem"]["id"],
            is_completed=False
        )
        self.db.add(new_mission)
        await self.db.commit()
        await self.db.refresh(new_mission)

        mission_data["mission_id"] = str(new_mission.id)
        mission_data["is_completed"] = False
        mission_data["date"] = str(local_date)

        try:
            from app.services.notification_service import NotificationService
            notif_service = NotificationService(self.db)
            await notif_service.create_notification(
                user_id=user_id,
                type="daily_mission",
                title="Daily Mission Ready",
                message=f"Today's target: {mission_data['problem']['name']} ({mission_data['problem']['rating'] or 'Unrated'})",
                link="/dashboard",
            )
        except Exception:
            pass

        return mission_data
