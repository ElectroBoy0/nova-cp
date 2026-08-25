from sqlalchemy import JSON, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

JSONVariant = JSON().with_variant(JSONB, "postgresql")


class Problem(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "problems"

    platform = Column(String(50), nullable=False, index=True)
    platform_problem_id = Column(String(100), nullable=False, unique=True, index=True)
    contest_id = Column(Integer, nullable=True, index=True)
    index = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    rating = Column(Integer, nullable=True, index=True)
    tags = Column(JSONVariant, nullable=False, default=list)
    url = Column(String(512), nullable=False)
    solved_count = Column(Integer, nullable=True)

class RecommendationFeedback(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "recommendation_feedback"

    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    recommendation_type = Column(String(50), nullable=False)
    event_type = Column(String(50), nullable=False)
    score_snapshot = Column(JSONVariant, nullable=False, default=dict)
