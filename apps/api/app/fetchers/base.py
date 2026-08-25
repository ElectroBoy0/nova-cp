from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import httpx


# -------------------------------------------------------
# ContestData — normalised intermediate representation
#
# This is the contract between platform fetchers and the
# service layer. It is NOT an ORM model or Pydantic schema.
# Keeping it a plain dataclass means fetchers can be unit-
# tested without any database or HTTP setup.
# -------------------------------------------------------
@dataclass(frozen=True)
class ContestData:
    """
    Normalised representation of a contest from any platform.
    All fetchers must produce this shape.
    """

    platform: str                        # "codeforces" | "codechef" | "atcoder"
    platform_contest_id: str             # Unique ID on the source platform
    contest_name: str
    url: str
    start_time: datetime                 # Always timezone-aware UTC
    duration_seconds: int | None         # None if the platform does not expose it
    status: str                          # "upcoming" | "running" | "finished"
    registration_open: bool | None       # None if not available


# -------------------------------------------------------
# FetchError — raised when a platform fetch fails
# -------------------------------------------------------
class FetchError(Exception):
    """Raised when a platform fetcher cannot retrieve contest data."""

    def __init__(self, platform: str, reason: str) -> None:
        self.platform = platform
        self.reason = reason
        super().__init__(f"[{platform}] fetch failed: {reason}")


# -------------------------------------------------------
# BaseFetcher — Strategy pattern for platform adapters
#
# Each platform is a concrete subclass implementing fetch().
# The service layer calls get_all_fetchers() and iterates —
# it never knows which platforms exist.
#
# Adding a new platform:
#   1. Create app/fetchers/<platform>.py
#   2. Subclass BaseFetcher, implement fetch()
#   3. Add to get_all_fetchers() in __init__.py
#   ← zero changes to existing fetcher code (OCP)
# -------------------------------------------------------
class BaseFetcher:
    """
    Abstract base class for platform contest fetchers.

    Subclasses must implement `fetch()` and set `PLATFORM`.
    """

    PLATFORM: str = ""  # Override in each subclass

    # Shared HTTPX client settings — all fetchers inherit these
    _TIMEOUT = httpx.Timeout(timeout=15.0, connect=5.0)
    _HEADERS = {
        "User-Agent": (
            "NovaCP/1.0 (https://novacp.app; contest aggregator) "
            "contact: hi@novacp.app"
        )
    }

    async def fetch(self) -> list[ContestData]:
        """
        Fetch and normalise contests from the platform.

        Returns an empty list on partial failure — never raises.
        Callers should treat an empty list as "no data available".
        """
        raise NotImplementedError

    @classmethod
    def _make_client(cls) -> httpx.AsyncClient:
        """Return a pre-configured HTTPX async client."""
        return httpx.AsyncClient(
            timeout=cls._TIMEOUT,
            headers=cls._HEADERS,
            follow_redirects=True,
        )
