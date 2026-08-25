from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.problem import Problem
    from app.models.user import User


class ProblemNote(Base, UUIDMixin, TimestampMixin):
    """
    A personal note a user can write for a specific problem.
    """

    __tablename__ = "problem_notes"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    problem_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationship
    user: Mapped[User] = relationship("User")
    problem: Mapped[Problem] = relationship("Problem")

    __table_args__ = (
        Index(
            "ix_problem_notes_user_problem",
            "user_id",
            "problem_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return f"<ProblemNote user={self.user_id!r} problem={self.problem_id!r}>"
