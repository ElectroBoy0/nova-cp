from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    pass


# -------------------------------------------------------
# User
# Core identity model. Auth is handled by Auth.js (Next.js).
# We create/sync this record on first sign-in via the
# internal API call from Next.js.
# -------------------------------------------------------
class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image: Mapped[str | None] = mapped_column(Text, nullable=True)

    # OAuth provider info — for display and deduplication
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # "github" | "google"
    provider_account_id: Mapped[str] = mapped_column(String(255), nullable=False)

    timezone: Mapped[str] = mapped_column(String(50), default="UTC", server_default="UTC", nullable=False)

    # Customizable Preferences and Notification Settings (JSONB/JSON)
    custom_preferences: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}", nullable=False)
    notification_settings: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}", nullable=False)

    # Whether the user has completed onboarding (linked CF handle)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    cf_handle: Mapped[CFHandle | None] = relationship(
        "CFHandle",
        back_populates="user",
        uselist=False,  # One-to-one
        cascade="all, delete-orphan",
    )

    # Composite index for provider-based deduplication
    __table_args__ = (
        Index("ix_users_provider_account", "provider", "provider_account_id", unique=True),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r}>"


# -------------------------------------------------------
# CFHandle
# A user's linked Codeforces handle.
# One user → one handle (can be updated, not replaced).
# -------------------------------------------------------

CF_RANK_ENUM = Enum(
    "newbie",
    "pupil",
    "specialist",
    "expert",
    "candidate_master",
    "master",
    "international_master",
    "grandmaster",
    "international_grandmaster",
    "legendary_grandmaster",
    name="cf_rank",
)

SYNC_STATUS_ENUM = Enum(
    "pending",
    "syncing",
    "completed",
    "failed",
    name="sync_status",
)


class CFHandle(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cf_handles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    handle: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Current rating info — updated on each sync
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rank: Mapped[str | None] = mapped_column(CF_RANK_ENUM, nullable=True)
    max_rank: Mapped[str | None] = mapped_column(CF_RANK_ENUM, nullable=True)
    rating_history: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)

    # Sync tracking
    sync_status: Mapped[str] = mapped_column(
        SYNC_STATUS_ENUM,
        default="pending",
        nullable=False,
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship back to User
    user: Mapped[User] = relationship("User", back_populates="cf_handle")

    def __repr__(self) -> str:
        return f"<CFHandle id={self.id!r} handle={self.handle!r} rating={self.rating}>"
