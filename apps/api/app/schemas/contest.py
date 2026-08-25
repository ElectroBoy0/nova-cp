from __future__ import annotations

from datetime import UTC, datetime, timedelta

from pydantic import model_validator

from app.schemas.user import NovaCPBaseModel

# -------------------------------------------------------
# Contest Schemas
# -------------------------------------------------------

VALID_PLATFORMS = {"codeforces", "codechef", "atcoder"}
VALID_STATUSES = {"upcoming", "running", "finished"}


class ContestRead(NovaCPBaseModel):
    """Public representation of a contest returned by the API."""

    id: str
    platform: str
    platform_contest_id: str
    contest_name: str
    url: str
    start_time: datetime
    duration_seconds: int | None
    status: str
    registration_open: bool | None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def compute_status(self) -> ContestRead:
        now = datetime.now(UTC)
        start = self.start_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)

        if start > now:
            self.status = "upcoming"
        else:
            if self.duration_seconds is not None:
                end_time = start + timedelta(seconds=self.duration_seconds)
                if now < end_time:
                    self.status = "running"
                else:
                    self.status = "finished"
            else:
                # Fallback for null duration
                if now - start > timedelta(days=2):
                    self.status = "finished"
                elif self.status == "upcoming":
                    self.status = "running"
        return self


class ContestListResponse(NovaCPBaseModel):
    """Paginated contest list response."""

    contests: list[ContestRead]
    total: int
    limit: int
    offset: int


class SyncResult(NovaCPBaseModel):
    """Per-platform result reported in a sync response."""

    platform: str
    fetched: int
    upserted: int
    error: str | None = None


class SyncResponse(NovaCPBaseModel):
    """Response returned by POST /sync."""

    results: list[SyncResult]
    total_upserted: int
