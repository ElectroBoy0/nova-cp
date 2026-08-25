from sqlalchemy import Column, ForeignKey, Integer, String

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class HintFeedback(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "hint_feedback"

    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    hint_level = Column(Integer, nullable=False)
    event_type = Column(String(50), nullable=False)  # "requested", "helpful", "not_helpful", "solved_after_hint"
