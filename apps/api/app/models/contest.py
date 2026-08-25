from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin


# -------------------------------------------------------
# Contest
# Stores normalised contest data aggregated from all
# supported platforms. Deduplication is enforced via
# the (platform, platform_contest_id) unique index.
# -------------------------------------------------------
class Contest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "contests"

    # ---- Identity ----
    # The platform slug: "codeforces" | "codechef" | "atcoder"
    platform: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # The contest's unique ID on its source platform (e.g. CF round ID, CC slug)
    platform_contest_id: Mapped[str] = mapped_column(String(255), nullable=False)

    # ---- Display ----
    contest_name: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)

    # ---- Timing ----
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    # Duration in seconds. NULL means unknown (some platforms don't expose it)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ---- Status ----
    # "upcoming" | "running" | "finished"
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Whether registration is still open (null = platform does not provide this info)
    registration_open: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # ---- Composite unique index for deduplication ----
    __table_args__ = (
        Index(
            "ix_contests_platform_platform_contest_id",
            "platform",
            "platform_contest_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Contest platform={self.platform!r} "
            f"id={self.platform_contest_id!r} "
            f"name={self.contest_name!r}>"
        )
