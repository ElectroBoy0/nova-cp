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
            # Check if this mission's problem was skipped / solved externally / solved on CF
            from app.models.problem import RecommendationFeedback
            from app.models.submission import Submission
            from app.services.recommendation.scorers.base import RecommendationContext

            feedback_check = select(RecommendationFeedback.id).where(
                RecommendationFeedback.user_id == user_id,
                RecommendationFeedback.problem_id == existing_mission.problem_id,
                RecommendationFeedback.event_type.in_(["skipped", "solved_externally"])
            )
            is_excluded = (await self.db.execute(feedback_check)).scalar_one_or_none()

            if not is_excluded:
                prob_query = select(Problem).where(Problem.id == existing_mission.problem_id)
                problem = (await self.db.execute(prob_query)).scalar_one_or_none()
                if problem:
                    # Check if solved on CF
                    solved_check = select(Submission.id).where(
                        Submission.user_id == user_id,
                        Submission.contest_id == problem.contest_id,
                        Submission.problem_index == problem.index,
                        Submission.verdict == "OK"
                    )
                    is_cf_solved = (await self.db.execute(solved_check)).scalar_one_or_none()
                    if not is_cf_solved:
                        user_rating = user.cf_handle.rating if (user.cf_handle and user.cf_handle.rating) else 800
                        context = RecommendationContext(
                            user_rating=user_rating,
                            topic_mastery={"implementation": 0.5},
                            recent_failures={},
                            target_delta=100
                        )
                        sp = self.engine.scorer.score(problem, context)
                        explanation = self.engine.explainer.generate_explanation(sp, context, "todays_mission")
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
                            "score": sp.total_score,
                            "explanation": explanation
                        }

        # Generate new mission
        mission_data = await self.engine.generate_daily_mission(user_id)
        if not mission_data:
            return None

        if existing_mission:
            # Update existing record for today
            existing_mission.problem_id = mission_data["problem"]["id"]
            existing_mission.is_completed = False
            await self.db.commit()
            await self.db.refresh(existing_mission)
            new_mission = existing_mission
        else:
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
