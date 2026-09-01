import logging
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


import time
from collections import defaultdict

# Simple in-memory cache with timestamps: {key: (data, timestamp)}
_CF_CACHE: dict[str, tuple[Any, float]] = {}
_CACHE_TTL_SECONDS = 60.0  # 1 minute fresh TTL


class CodeforcesService:
    """Service to interact with the Codeforces API with exponential backoff and caching."""

    BASE_URL = "https://codeforces.com/api"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        # If no client is provided, we create a temporary one.
        # It's better to pass a persistent client to avoid connection overhead.
        self._client = client
        self._owns_client = client is None

    async def __aenter__(self) -> "CodeforcesService":
        if self._owns_client and self._client is None:
            self._client = httpx.AsyncClient(
                timeout=15.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            )
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            msg = "CodeforcesService must be used as an async context manager if no client is provided."
            raise RuntimeError(msg)
        return self._client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True
    )
    async def _make_request(self, method: str, url: str, **kwargs) -> httpx.Response:
        """Internal method to execute requests with rate limiting and retries."""
        await RateLimiter.wait_for_token("codeforces", req_per_second=1.0)

        response = await self.client.request(method, url, **kwargs)

        # We only want to retry on 429 and 5xx errors.
        # We raise HTTPStatusError to trigger the tenacity retry mechanism.
        if response.status_code == 429 or response.status_code >= 500:
            logger.warning(f"Codeforces API {response.status_code}, retrying...")
            response.raise_for_status()

        return response

    async def fetch_user_info(self, handle: str, force_refresh: bool = False) -> dict[str, Any] | None:
        """
        Fetch the user profile info from Codeforces.
        Returns a dictionary with 'rating', 'maxRating', 'rank', 'maxRank', etc.
        Returns None if the handle does not exist or API fails.
        """
        cache_key = f"user_info_{handle.lower()}"
        now = time.time()

        if force_refresh:
            _CF_CACHE.pop(cache_key, None)
        else:
            cached = _CF_CACHE.get(cache_key)
            if cached and (now - cached[1]) < _CACHE_TTL_SECONDS:
                return cached[0]

        url = f"{self.BASE_URL}/user.info"
        try:
            params: dict[str, Any] = {"handles": handle}
            headers = None
            if force_refresh:
                params["_t"] = str(int(now * 1000))
                headers = {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                }
            response = await self._make_request("GET", url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "OK" and data.get("result"):
                res = data["result"][0]
                _CF_CACHE[cache_key] = (res, now)
                return res
            logger.warning("Codeforces API returned non-OK status or empty result for %s: %s", handle, data)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                logger.info("Codeforces handle %s not found (400 Bad Request)", handle)
            else:
                logger.warning("Codeforces API HTTP error for %s: %s", handle, e)
        except httpx.RequestError as e:
            logger.warning("Codeforces API request error for %s: %s", handle, e)
        except Exception as e:
            logger.warning("Unexpected error fetching CF info for %s: %s", handle, e)

        # Stale cache fallback if Codeforces is down or failing
        cached = _CF_CACHE.get(cache_key)
        if not force_refresh and cached:
            logger.info("Serving stale cached user info for %s during downtime", handle)
            return cached[0]

        return None

    async def fetch_user_submissions(self, handle: str) -> list[dict[str, Any]]:
        """
        Fetch all submissions for a user from Codeforces.
        Returns a list of submission dictionaries.
        """
        cache_key = f"user_submissions_{handle.lower()}"
        cached = _CF_CACHE.get(cache_key)
        now = time.time()

        if cached and (now - cached[1]) < _CACHE_TTL_SECONDS:
            return cached[0]

        url = f"{self.BASE_URL}/user.status"
        try:
            response = await self._make_request("GET", url, params={"handle": handle})
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "OK" and "result" in data:
                res = data["result"]
                _CF_CACHE[cache_key] = (res, now)
                return res
            logger.warning("Codeforces API returned non-OK status for submissions %s: %s", handle, data)
        except Exception as e:
            logger.warning("Unexpected error fetching CF submissions for %s: %s", handle, e)

        # Stale cache fallback
        if cached:
            logger.info("Serving stale cached submissions for %s during downtime", handle)
            return cached[0]

        return []

    async def fetch_rating_history(self, handle: str) -> list[dict[str, Any]]:
        """
        Fetch rating history for a user from Codeforces.
        Returns a list of rating change dictionaries.
        """
        cache_key = f"user_rating_{handle.lower()}"
        cached = _CF_CACHE.get(cache_key)
        now = time.time()

        if cached and (now - cached[1]) < (_CACHE_TTL_SECONDS * 5):
            return cached[0]

        url = f"{self.BASE_URL}/user.rating"
        try:
            response = await self._make_request("GET", url, params={"handle": handle})
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "OK" and "result" in data:
                res = data["result"]
                _CF_CACHE[cache_key] = (res, now)
                return res
            logger.warning("Codeforces API returned non-OK status for rating history %s: %s", handle, data)
        except Exception as e:
            logger.warning("Unexpected error fetching CF rating history for %s: %s", handle, e)

        # Stale cache fallback
        if cached:
            return cached[0]

        return []

    async def fetch_problemset(self) -> list[dict[str, Any]]:
        """
        Fetch the entire problemset from Codeforces.
        Returns a list of problem dictionaries containing problem metadata and statistics.
        """
        url = f"{self.BASE_URL}/problemset.problems"
        try:
            response = await self._make_request("GET", url)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "OK" and "result" in data:
                problems = data["result"].get("problems", [])
                statistics = data["result"].get("problemStatistics", [])

                # Merge statistics (solvedCount) into the problem objects
                stats_map = {
                    (s.get("contestId"), s.get("index")): s.get("solvedCount", 0)
                    for s in statistics
                }

                for p in problems:
                    key = (p.get("contestId"), p.get("index"))
                    p["solvedCount"] = stats_map.get(key, 0)

                return problems
            logger.warning("Codeforces API returned non-OK status for problemset")
        except Exception as e:
            logger.warning("Unexpected error fetching CF problemset: %s", e)
        return []
