from __future__ import annotations

"""
HTTP-level endpoint tests for /api/v1/contests.
Uses mocked fetchers so tests do not make real network calls.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("INTERNAL_API_KEY", "test-key")

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.fetchers.base import ContestData


def _make_contest_data(
    platform: str = "codeforces",
    contest_id: str = "1",
    name: str = "Test Round",
    status: str = "upcoming",
    hours_from_now: int = 24,
) -> ContestData:
    return ContestData(
        platform=platform,
        platform_contest_id=contest_id,
        contest_name=name,
        url=f"https://example.com/{contest_id}",
        start_time=datetime.now(UTC) + timedelta(hours=hours_from_now),
        duration_seconds=7200,
        status=status,
        registration_open=True,
    )


# Mock fetcher that returns controlled data
class _MockFetcher:
    def __init__(self, platform: str, contests: list[ContestData]) -> None:
        self.PLATFORM = platform
        self._contests = contests

    async def fetch(self) -> list[ContestData]:
        return self._contests


def _make_mock_fetchers(contests: list[ContestData]) -> list[_MockFetcher]:
    """Return a single mock fetcher that returns the given contests."""
    return [_MockFetcher("codeforces", contests)]


class TestContestListEndpoint:
    @pytest.mark.asyncio
    async def test_get_all_returns_200(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_all_returns_expected_schema(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests")
        data = response.json()
        assert "contests" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

    @pytest.mark.asyncio
    async def test_get_all_empty_when_no_data(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests")
        data = response.json()
        assert data["total"] == 0
        assert data["contests"] == []

    @pytest.mark.asyncio
    async def test_get_all_pagination_params(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests?limit=10&offset=5")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 5

    @pytest.mark.asyncio
    async def test_get_all_invalid_limit_rejected(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests?limit=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_all_limit_too_large_rejected(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests?limit=999")
        assert response.status_code == 422


class TestUpcomingEndpoint:
    @pytest.mark.asyncio
    async def test_upcoming_returns_200(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests/upcoming")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_upcoming_returns_expected_schema(self, client: AsyncClient) -> None:
        data = (await client.get("/api/v1/contests/upcoming")).json()
        assert "contests" in data and "total" in data


class TestPlatformEndpoint:
    @pytest.mark.asyncio
    async def test_valid_platform_returns_200(self, client: AsyncClient) -> None:
        for platform in ("codeforces", "codechef", "atcoder"):
            response = await client.get(f"/api/v1/contests/platform/{platform}")
            assert response.status_code == 200, f"Failed for platform={platform}"

    @pytest.mark.asyncio
    async def test_invalid_platform_returns_422(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/contests/platform/leetcode")
        assert response.status_code == 422
        data = response.json()
        assert "Invalid platform" in data["detail"]

    @pytest.mark.asyncio
    async def test_platform_filters_correctly(self, client: AsyncClient) -> None:
        """After seeding via sync, platform filter should return only that platform's data."""
        cf_contest = _make_contest_data(platform="codeforces", contest_id="cf-1")
        cc_contest = _make_contest_data(platform="codechef", contest_id="cc-1")

        mock_fetchers = [
            _MockFetcher("codeforces", [cf_contest]),
            _MockFetcher("codechef", [cc_contest]),
        ]

        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            sync_resp = await client.post("/api/v1/contests/sync")
            assert sync_resp.status_code == 200

        cf_resp = await client.get("/api/v1/contests/platform/codeforces")
        cf_data = cf_resp.json()
        assert cf_data["total"] == 1
        assert cf_data["contests"][0]["platform"] == "codeforces"

        cc_resp = await client.get("/api/v1/contests/platform/codechef")
        cc_data = cc_resp.json()
        assert cc_data["total"] == 1
        assert cc_data["contests"][0]["platform"] == "codechef"


class TestSyncEndpoint:
    @pytest.mark.asyncio
    async def test_sync_returns_200(self, client: AsyncClient) -> None:
        mock_fetchers = _make_mock_fetchers([])
        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            response = await client.post("/api/v1/contests/sync")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sync_response_schema(self, client: AsyncClient) -> None:
        mock_fetchers = _make_mock_fetchers([])
        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            data = (await client.post("/api/v1/contests/sync")).json()
        assert "results" in data
        assert "total_upserted" in data

    @pytest.mark.asyncio
    async def test_sync_inserts_and_returns_contest(self, client: AsyncClient) -> None:
        contest = _make_contest_data(contest_id="sync-test-1", name="Synced Contest")
        mock_fetchers = _make_mock_fetchers([contest])

        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            await client.post("/api/v1/contests/sync")

        list_resp = await client.get("/api/v1/contests")
        data = list_resp.json()
        assert data["total"] == 1
        assert data["contests"][0]["contest_name"] == "Synced Contest"

    @pytest.mark.asyncio
    async def test_sync_idempotent_no_duplicates(self, client: AsyncClient) -> None:
        """Calling sync twice must NOT create duplicate rows."""
        contest = _make_contest_data(contest_id="dedup-1")
        mock_fetchers = _make_mock_fetchers([contest])

        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            await client.post("/api/v1/contests/sync")
            await client.post("/api/v1/contests/sync")

        list_resp = await client.get("/api/v1/contests")
        assert list_resp.json()["total"] == 1, "Sync must be idempotent"

    @pytest.mark.asyncio
    async def test_sync_partial_failure_still_returns_200(self, client: AsyncClient) -> None:
        """A fetch error on one platform must not fail the whole sync."""
        from app.fetchers.base import FetchError

        class _FailingFetcher:
            PLATFORM = "failing"

            async def fetch(self):
                raise FetchError("failing", "network error")

        mock_fetchers = [_FailingFetcher(), _MockFetcher("codeforces", [])]

        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            response = await client.post("/api/v1/contests/sync")

        assert response.status_code == 200
        data = response.json()
        results_by_platform = {r["platform"]: r for r in data["results"]}
        assert results_by_platform["failing"]["error"] is not None
        assert results_by_platform["codeforces"]["error"] is None

    @pytest.mark.asyncio
    async def test_sync_does_not_require_internal_api_key(self, client: AsyncClient) -> None:
        """Contest endpoints are public — no X-Internal-API-Key required."""
        mock_fetchers = _make_mock_fetchers([])
        with patch("app.services.contest_service.get_all_fetchers", return_value=mock_fetchers):
            # Deliberately no headers
            response = await client.post("/api/v1/contests/sync")
        assert response.status_code == 200
