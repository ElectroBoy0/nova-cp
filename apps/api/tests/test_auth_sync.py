import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_auth_sync_new_user(client: AsyncClient, internal_headers: dict[str, str], db_session: AsyncSession):
    payload = {
        "user_id": "oauth-github-12345",
        "email": "coder@example.com",
        "name": "Alex Coder",
        "image": "https://example.com/avatar.png",
        "provider": "github",
        "timezone": "America/New_York",
    }
    response = await client.post("/api/v1/users/sync", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "coder@example.com"
    assert data["name"] == "Alex Coder"
    assert data["provider"] == "github"
    assert data["timezone"] == "America/New_York"
    assert data["onboarding_completed"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_auth_sync_existing_user_idempotent(client: AsyncClient, internal_headers: dict[str, str]):
    payload = {
        "user_id": "oauth-google-999",
        "email": "googleuser@example.com",
        "name": "Initial Name",
        "image": "https://example.com/img1.png",
        "provider": "google",
    }
    res1 = await client.post("/api/v1/users/sync", json=payload, headers=internal_headers)
    assert res1.status_code == 200
    user_id = res1.json()["id"]

    # Re-login with updated profile info
    payload_update = {
        "user_id": "oauth-google-999",
        "email": "googleuser@example.com",
        "name": "Updated Name",
        "image": "https://example.com/img2.png",
        "provider": "google",
    }
    res2 = await client.post("/api/v1/users/sync", json=payload_update, headers=internal_headers)
    assert res2.status_code == 200
    data = res2.json()
    assert data["id"] == user_id
    assert data["name"] == "Updated Name"
    assert data["image"] == "https://example.com/img2.png"


@pytest.mark.asyncio
async def test_auth_sync_requires_internal_key(client: AsyncClient):
    payload = {
        "user_id": "oauth-123",
        "email": "test@example.com",
        "name": "Test",
        "provider": "github",
    }
    response = await client.post("/api/v1/users/sync", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_user_settings(client: AsyncClient, internal_headers: dict[str, str]):
    payload = {
        "user_id": "oauth-settings-1",
        "email": "settings@example.com",
        "name": "Settings User",
        "provider": "github",
    }
    res = await client.post("/api/v1/users/sync", json=payload, headers=internal_headers)
    user_id = res.json()["id"]

    patch_res = await client.patch(
        f"/api/v1/users/{user_id}/settings",
        json={"timezone": "Asia/Tokyo", "name": "Tokyo Coder"},
        headers=internal_headers,
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["timezone"] == "Asia/Tokyo"
    assert data["name"] == "Tokyo Coder"
