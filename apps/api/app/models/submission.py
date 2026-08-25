from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class Submission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "submissions"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Codeforces specific submission ID (use BigInteger for large IDs)
    cf_submission_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)

    # Problem details
    contest_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    problem_index: Mapped[str] = mapped_column(String(20), nullable=False)
    problem_name: Mapped[str] = mapped_column(String(500), nullable=False)
    problem_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Store tags as JSON list
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    # Submission details
    verdict: Mapped[str] = mapped_column(String(50), nullable=False)
    passed_test_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_consumed_millis: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    memory_consumed_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    creation_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationship back to User
    user: Mapped[User] = relationship("User")

    __table_args__ = (
        Index("ix_submissions_user_id_verdict", "user_id", "verdict"),
        Index("ix_submissions_user_contest_prob", "user_id", "contest_id", "problem_index"),
    )

    def __repr__(self) -> str:
        return f"<Submission cf_id={self.cf_submission_id} verdict={self.verdict}>"
