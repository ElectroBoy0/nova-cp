from __future__ import annotations

import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_basic_health_returns_ok(self, client: AsyncClient) -> None:
        """Basic health endpoint should always return 200 with status=ok."""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "environment" in data

    @pytest.mark.asyncio
    async def test_basic_health_returns_version(self, client: AsyncClient) -> None:
        """Version field should match the configured app version."""
        response = await client.get("/health")
        data = response.json()

        assert data["version"] == "0.1.0"

    @pytest.mark.asyncio
    async def test_basic_health_environment_is_development(self, client: AsyncClient) -> None:
        """In test mode, DEBUG=true, so environment should be 'development'."""
        response = await client.get("/health")
        data = response.json()

        assert data["environment"] == "development"

    @pytest.mark.asyncio
    async def test_health_endpoint_does_not_require_api_key(self, client: AsyncClient) -> None:
        """Health endpoint must NOT require the internal API key (used by load balancers)."""
        # No headers provided
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_detailed_health_returns_expected_fields(self, client: AsyncClient) -> None:
        """Detailed health endpoint returns database and redis status fields."""
        response = await client.get("/health/detailed")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "database" in data
        assert "redis" in data
        assert data["status"] in ("ok", "degraded")
