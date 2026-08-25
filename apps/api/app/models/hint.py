from sqlalchemy import Column, ForeignKey, Integer, Text, UniqueConstraint

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class ProblemHint(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "problem_hints"

    problem_id = Column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    hint_level = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("problem_id", "hint_level", name="uix_problem_hint_level"),
    )
