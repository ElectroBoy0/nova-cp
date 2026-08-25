import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    JSON,
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.database import Base

JSONVariant = JSON().with_variant(JSONB, "postgresql")


class BugReport(Base):
    """
    Bug report submitted by beta users with automated diagnostic metadata.
    """
    __tablename__ = "bug_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)  # Authentication, Sync, UI/UX, etc.
    description = Column(Text, nullable=False)
    reproduction_steps = Column(Text, nullable=True)
    expected_behavior = Column(Text, nullable=True)
    actual_behavior = Column(Text, nullable=True)

    priority = Column(String(32), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(32), default="OPEN", nullable=False)  # OPEN, IN_PROGRESS, FIXED, CLOSED

    screenshot_url = Column(String(1024), nullable=True)
    environment_metadata = Column(JSONVariant, nullable=False, default=dict)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", backref="bug_reports", lazy="joined")

    __table_args__ = (
        Index("ix_bug_reports_user_status", "user_id", "status"),
        Index("ix_bug_reports_priority", "priority"),
        Index("ix_bug_reports_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<BugReport id={self.id} title={self.title!r} category={self.category!r} status={self.status!r}>"
