import logging

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        user_id: str,
        type: str,
        title: str,
        message: str,
        link: str | None = None,
    ) -> Notification | None:
        """
        Creates an in-app notification if the user's notification preferences allow it.
        Extensible: future email / push hooks can be called here without altering callers.
        """
        user_stmt = select(User).where(User.id == user_id)
        user = (await self.db.execute(user_stmt)).scalar_one_or_none()
        if not user:
            return None

        # Check user's notification preferences
        settings = user.notification_settings or {}

        # Type to preference key mapping
        if type == "daily_mission" and not settings.get("daily_mission_alert", True):
            logger.info("Daily mission notification skipped for user %s per preferences", user_id)
            return None
        elif type == "contest_reminder" and not settings.get("contest_reminders", True):
            logger.info("Contest reminder notification skipped for user %s per preferences", user_id)
            return None
        elif type == "sync_status" and not settings.get("sync_updates", True):
            logger.info("Sync status notification skipped for user %s per preferences", user_id)
            return None
        elif type == "recommendation" and not settings.get("recommendation_updates", True):
            logger.info("Recommendation update notification skipped for user %s per preferences", user_id)
            return None
        elif type == "streak_saver" and not settings.get("streak_saver", True):
            logger.info("Streak saver notification skipped for user %s per preferences", user_id)
            return None
        elif type == "upsolve_reminder" and not settings.get("upsolve_reminders", False):
            logger.info("Upsolve reminder notification skipped for user %s per preferences", user_id)
            return None

        # Deduplicate sync_status: update existing unread notification instead of creating duplicates
        if type == "sync_status":
            existing_stmt = select(Notification).where(
                Notification.user_id == user_id,
                Notification.type == type,
                Notification.is_read.is_(False),
            ).order_by(Notification.created_at.desc())
            existing = (await self.db.execute(existing_stmt)).scalars().first()
            if existing:
                existing.title = title
                existing.message = message
                existing.link = link
                await self.db.commit()
                await self.db.refresh(existing)
                return existing

        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
            is_read=False,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        return notification

    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int, int]:
        """
        Returns (items, total_count, unread_count).
        """
        query = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        total_stmt = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(total_stmt) or 0

        unread_stmt = select(func.count()).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        unread_count = await self.db.scalar(unread_stmt) or 0

        query = query.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total, unread_count

    async def mark_as_read(self, user_id: str, notification_id: str) -> bool:
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0

    async def mark_all_as_read(self, user_id: str) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount
