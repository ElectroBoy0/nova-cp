from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User

JSONVariant = JSON().with_variant(JSONB, "postgresql")

UPSOLVE_STATUS_ENUM = Enum(
    "not_started",
    "attempted",
    "solved",
    name="upsolve_status",
    create_constraint=True,
)


class UpsolveItem(Base, UUIDMixin, TimestampMixin):
    """
    Represents a problem from a contest the user participated in but did not solve.
    Populated after sync and updated when the user solves the problem later.
    """

    __tablename__ = "upsolve_items"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Codeforces contest info
    contest_id: Mapped[int] = mapped_column(Integer, nullable=False)
    contest_name: Mapped[str] = mapped_column(String(500), nullable=False)

    # Problem info (denormalized for fast reads)
    problem_index: Mapped[str] = mapped_column(String(20), nullable=False)
    problem_name: Mapped[str] = mapped_column(String(500), nullable=False)
    problem_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[list] = mapped_column(JSONVariant, nullable=False, default=list)
    problem_url: Mapped[str] = mapped_column(Text, nullable=False)

    # Why this problem is in the queue
    reason: Mapped[str] = mapped_column(String(100), nullable=False)

    # Tracking
    status: Mapped[str] = mapped_column(
        UPSOLVE_STATUS_ENUM,
        default="not_started",
        nullable=False,
        index=True,
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    solved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    user: Mapped[User] = relationship("User")

    __table_args__ = (
        Index(
            "ix_upsolve_user_contest_problem",
            "user_id",
            "contest_id",
            "problem_index",
            unique=True,
        ),
        Index("ix_upsolve_user_status", "user_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<UpsolveItem contest={self.contest_id} "
            f"problem={self.problem_index} status={self.status}>"
        )
