from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class UserAnalytics(Base, UUIDMixin, TimestampMixin):
    """
    Stores pre-computed statistics and analytics for a user's dashboard.
    This is updated asynchronously after Codeforces submissions are synced.
    """
    __tablename__ = "user_analytics"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Aggregated Stats
    total_solved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contest_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # JSON structures for frontend rendering
    # e.g., {"math": {"solved": 15, "total": 20}, "dp": {"solved": 5, "total": 10}}
    topic_mastery: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Rating difficulty spectrum: e.g. {"800": 24, "900": 12, "1000": 15, "1100": 4, "1200": 2}
    rating_distribution: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Submissions verdict breakdown: e.g. {"OK": 57, "WRONG_ANSWER": 38, "TIME_LIMIT_EXCEEDED": 2}
    verdict_distribution: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Selected recommended problem for the user
    # e.g., {"name": "Problem Name", "contestId": 123, "index": "A", "rating": 1200}
    recommended_problem: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationship back to User
    user: Mapped[User] = relationship("User")

    def __repr__(self) -> str:
        return f"<UserAnalytics user_id={self.user_id!r} solved={self.total_solved}>"
