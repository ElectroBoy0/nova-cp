from __future__ import annotations

import logging
from datetime import UTC, datetime

from app.fetchers.base import BaseFetcher, ContestData, FetchError

logger = logging.getLogger(__name__)

# Codeforces public contest list API — no auth required
_CF_API_URL = "https://codeforces.com/api/contest.list?gym=false"


def _cf_status(phase: str, start_time_unix: int) -> str:
    """
    Map a Codeforces phase string to our normalised status.

    CF phases:
      BEFORE        → contest hasn't started yet
      CODING        → contest is live
      PENDING_SYSTEM_TEST / SYSTEM_TEST / FINISHED → contest ended
    """
    if phase == "BEFORE":
        return "upcoming"
    if phase == "CODING":
        return "running"
    return "finished"


def _parse_contest(raw: dict) -> ContestData | None:
    """
    Parse a single Codeforces contest dict into ContestData.
    Returns None if required fields are missing.
    """
    try:
        contest_id = str(raw["id"])
        name = raw["name"]
        phase = raw["phase"]
        start_unix: int = raw["startTimeSeconds"]
        duration_sec: int = raw["durationSeconds"]

        start_time = datetime.fromtimestamp(start_unix, tz=UTC)
        status = _cf_status(phase, start_unix)

        if phase == "BEFORE":
            registration_open = True
        elif phase == "CODING":
            registration_open = False
        else:
            registration_open = None

        return ContestData(
            platform="codeforces",
            platform_contest_id=contest_id,
            contest_name=name,
            url=f"https://codeforces.com/contest/{contest_id}",
            start_time=start_time,
            duration_seconds=duration_sec,
            status=status,
            registration_open=registration_open,
        )
    except (KeyError, TypeError, ValueError) as exc:
        logger.warning("Skipping malformed CF contest %s: %s", raw.get("id"), exc)
        return None


class CodeforcesFetcher(BaseFetcher):
    """
    Fetches contests from the Codeforces public REST API.

    Endpoint: https://codeforces.com/api/contest.list
    Auth: none required
    """

    PLATFORM = "codeforces"

    async def fetch(self) -> list[ContestData]:
        logger.info("[codeforces] Starting contest fetch")
        try:
            async with self._make_client() as client:
                response = await client.get(_CF_API_URL)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            raise FetchError("codeforces", str(exc)) from exc

        if payload.get("status") != "OK":
            raise FetchError("codeforces", f"API returned status={payload.get('status')!r}")

        contests_raw: list[dict] = payload.get("result", [])
        contests: list[ContestData] = []

        for raw in contests_raw:
            parsed = _parse_contest(raw)
            if parsed is not None:
                contests.append(parsed)

        logger.info("[codeforces] Fetched %d contests", len(contests))
        return contests
