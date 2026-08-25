from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.problem import Problem
from app.models.user import User


class DailyMission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "daily_missions"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The local date in the user's timezone when this mission was assigned
    mission_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    problem_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
    )

    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")
    problem: Mapped["Problem"] = relationship("Problem")

    __table_args__ = (
        UniqueConstraint("user_id", "mission_date", name="uix_daily_mission_user_date"),
    )

    def __repr__(self) -> str:
        return f"<DailyMission user_id={self.user_id!r} date={self.mission_date} completed={self.is_completed}>"
