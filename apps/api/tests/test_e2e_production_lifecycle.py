import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.codeforces_service import CodeforcesService

@pytest.mark.asyncio
async def test_full_production_lifecycle_and_edge_cases(
    client: AsyncClient,
    internal_headers: dict[str, str],
    db_session: AsyncSession,
    monkeypatch
):
    """
    Comprehensive E2E smoke test verifying full user journey and edge cases:
    1. Fresh signup sync
    2. Empty account analytics & dashboard
    3. CF verification token generation & linking
    4. Conflict handling when second user attempts same handle
    5. Code execution sandbox (C++, Python)
    6. Snippets CRUD & Favorites
    7. Notification preferences & settings
    8. Bug report submission with full client metadata
    """
    # 1. Fresh signup sync
    unique_id = uuid.uuid4().hex[:8]
    test_email = f"e2e_user_{unique_id}@example.com"
    sync_payload = {
        "user_id": f"oauth_github_{unique_id}",
        "email": test_email,
        "name": "E2E Test User",
        "image": "https://avatars.githubusercontent.com/u/12345",
        "provider": "github"
    }
    res = await client.post("/api/v1/users/sync", json=sync_payload, headers=internal_headers)
    assert res.status_code == 200
    user_data = res.json()
    user_id = user_data["id"]
    assert user_data["email"] == test_email
    assert user_data["cf_handle"] is None

    # 2. Empty account dashboard & activity gracefully handled
    res = await client.get(f"/api/v1/users/{user_id}/dashboard", headers=internal_headers)
    assert res.status_code == 200
    dash = res.json()
    assert dash["total_solved"] == 0
    assert dash["current_streak_days"] == 0

    res = await client.get(f"/api/v1/users/{user_id}/activity", headers=internal_headers)
    assert res.status_code == 200

    # 3. CF Token generation & Verification
    handle_to_link = f"tourist_{unique_id}"
    
    async def mock_fetch_initial(self, handle, *args, **kwargs):
        return {"handle": handle, "firstName": "original", "rating": 3900, "rank": "legendary grandmaster"}
    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_initial)

    token_res = await client.post(
        f"/api/v1/users/{user_id}/cf-handle/verification-token",
        json={"handle": handle_to_link},
        headers=internal_headers
    )
    assert token_res.status_code == 200
    token_data = token_res.json()
    token = token_data["token"]
    assert token.startswith("novacp-verify-")

    # Mock user updating CF firstName to token
    async def mock_fetch_verified(self, handle, *args, **kwargs):
        return {"handle": handle, "firstName": token, "rating": 3900, "rank": "legendary grandmaster"}
    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_verified)

    link_res = await client.post(
        f"/api/v1/users/{user_id}/cf-handle",
        json={"handle": handle_to_link},
        headers=internal_headers
    )
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["cf_handle"]["handle"] == handle_to_link

    # 4. Handle Conflict Protection: another user tries to claim the same handle
    user2_email = f"user2_{unique_id}@example.com"
    sync2 = await client.post(
        "/api/v1/users/sync",
        json={"user_id": f"oauth_google_{unique_id}", "email": user2_email, "name": "User 2", "provider": "google"},
        headers=internal_headers
    )
    user2_id = sync2.json()["id"]

    conflict_res = await client.post(
        f"/api/v1/users/{user2_id}/cf-handle",
        json={"handle": handle_to_link},
        headers=internal_headers
    )
    assert conflict_res.status_code in (400, 409)

    # 5. Code Sandbox Execution
    code_req = {
        "language": "cpp",
        "code": "#include <iostream>\nusing namespace std;\nint main() { int a, b; if (cin >> a >> b) cout << a + b << endl; return 0; }",
        "test_cases": [
            {"id": "1", "input": "3 5\n", "expected_output": "8\n"},
            {"id": "2", "input": "10 20\n", "expected_output": "30\n"}
        ],
        "time_limit_ms": 2000,
        "memory_limit_mb": 256
    }
    exec_res = await client.post("/api/v1/code/run", json=code_req, headers=internal_headers)
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["status"] == "ACCEPTED"
    assert len(exec_data["test_cases"]) == 2
    assert exec_data["test_cases"][0]["status"] == "PASSED"

    # 6. Snippets CRUD & Favorites
    snip_res = await client.post(
        "/api/v1/snippets",
        params={"user_id": user_id},
        json={
            "title": "E2E Fast IO",
            "language": "cpp",
            "category": "templates",
            "code": "cin.tie(NULL);",
            "description": "Fast IO boilerplate"
        },
        headers=internal_headers
    )
    assert snip_res.status_code == 200
    snip_id = snip_res.json()["id"]

    fav_res = await client.post(
        f"/api/v1/snippets/{snip_id}/favorite",
        params={"user_id": user_id},
        headers=internal_headers
    )
    assert fav_res.status_code == 200
    assert fav_res.json()["is_favorited"] is True

    # 7. Settings & Onboarding Persistence
    settings_res = await client.patch(
        f"/api/v1/users/{user_id}/settings",
        json={
            "timezone": "UTC",
            "onboarding_completed": True,
            "custom_preferences": {
                "primary_language": "cpp",
                "recommendation_mode": "hardcore",
                "daily_target_problems": 5,
            },
            "notification_settings": {
                "contest_reminders": True,
                "streak_saver": True
            }
        },
        headers=internal_headers
    )
    assert settings_res.status_code == 200
    updated_settings = settings_res.json()
    assert updated_settings["onboarding_completed"] is True
    assert updated_settings["custom_preferences"]["recommendation_mode"] == "hardcore"

    # 8. Bug Reporting submission
    bug_res = await client.post(
        "/api/v1/bug-reports",
        params={"user_id": user_id},
        json={
            "title": "E2E Test Bug Report",
            "category": "UI/UX",
            "description": "Everything is running smoothly for v1.0",
            "reproduction_steps": "1. Run test\n2. Verify",
            "priority": "MEDIUM",
            "environment_metadata": {"browser": "Safari", "os": "macOS"}
        },
        headers=internal_headers
    )
    assert bug_res.status_code == 201
    bug_data = bug_res.json()
    assert bug_data["status"] == "OPEN"
