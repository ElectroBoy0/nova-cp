from __future__ import annotations

import logging
from datetime import UTC, datetime

from app.fetchers.base import BaseFetcher, ContestData, FetchError

logger = logging.getLogger(__name__)

# CodeChef unofficial public API — returns all contest statuses
_CC_API_URL = "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all"


def _cc_status(raw_status: str) -> str:
    """
    Map CodeChef status strings to our normalised status.

    CC statuses observed: "upcoming", "present" (running), "past"
    """
    s = raw_status.lower()
    if s == "upcoming":
        return "upcoming"
    if s in ("present", "running"):
        return "running"
    return "finished"


def _parse_datetime(dt_str: str) -> datetime | None:
    """
    Parse CodeChef datetime strings. They are typically in
    ISO-8601 format: "2024-12-21T14:30:00+05:30"
    """
    if not dt_str:
        return None
    try:
        dt = datetime.fromisoformat(dt_str)
        # Ensure timezone-aware
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)
    except ValueError:
        return None


def _parse_duration(duration_str: str) -> int | None:
    """
    Parse CodeChef duration strings.
    The modern API returns minutes as an integer string (e.g., "120").
    Historically, it returned formats like "3 Days, 00:00:00" or "02:30:00".
    Returns total seconds or None if unparseable.
    """
    if not duration_str:
        return None

    # Fast path: check if it's just a raw integer (minutes)
    duration_str = str(duration_str).strip()
    if duration_str.isdigit():
        return int(duration_str) * 60

    try:
        # Handle "N Days, HH:MM:SS"
        days = 0
        time_part = duration_str
        if "," in duration_str:
            day_part, time_part = duration_str.split(",", 1)
            day_part = day_part.strip().lower()
            days = int(day_part.split()[0])
            time_part = time_part.strip()

        parts = time_part.strip().split(":")
        if len(parts) != 3:  # noqa: PLR2004
            return None
        hours, minutes, seconds = int(parts[0]), int(parts[1]), int(parts[2])
        return days * 86400 + hours * 3600 + minutes * 60 + seconds
    except (ValueError, IndexError):
        return None


def _parse_contest(raw: dict) -> ContestData | None:
    """Parse a single CodeChef contest dict into ContestData."""
    try:
        code = raw.get("contest_code") or raw.get("code")
        name = raw.get("contest_name") or raw.get("name")
        status_raw = raw.get("contest_status") or raw.get("status", "")
        start_str = raw.get("contest_start_date_iso") or raw.get("start_date", "")
        duration_str = raw.get("contest_duration") or raw.get("duration", "")

        if not code or not name or not start_str:
            return None

        start_time = _parse_datetime(start_str)
        if start_time is None:
            return None

        return ContestData(
            platform="codechef",
            platform_contest_id=str(code),
            contest_name=str(name),
            url=f"https://www.codechef.com/{code}",
            start_time=start_time,
            duration_seconds=_parse_duration(duration_str),
            status=_cc_status(status_raw),
            registration_open=None,  # CC API does not expose this reliably
        )
    except (KeyError, TypeError) as exc:
        logger.warning("Skipping malformed CC contest %s: %s", raw.get("code"), exc)
        return None


class CodeChefFetcher(BaseFetcher):
    """
    Fetches contests from the CodeChef unofficial public API.

    Endpoint: https://www.codechef.com/api/list/contests/all
    Auth: none required
    Note: This is an unofficial endpoint. Failures are handled
    gracefully — the sync continues with other platforms.
    """

    PLATFORM = "codechef"

    async def fetch(self) -> list[ContestData]:
        logger.info("[codechef] Starting contest fetch")
        try:
            async with self._make_client() as client:
                response = await client.get(_CC_API_URL)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            raise FetchError("codechef", str(exc)) from exc

        contests: list[ContestData] = []

        # The API returns contests in three buckets
        for bucket in ("future_contests", "present_contests", "past_contests"):
            raw_list = payload.get(bucket, [])
            if not isinstance(raw_list, list):
                continue
            for raw in raw_list:
                parsed = _parse_contest(raw)
                if parsed is not None:
                    contests.append(parsed)

        logger.info("[codechef] Fetched %d contests", len(contests))
        return contests
