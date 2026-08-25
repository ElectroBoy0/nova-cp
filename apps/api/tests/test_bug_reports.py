import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_submit_bug_report_success(
    client: AsyncClient,
    internal_headers: dict[str, str],
):
    """
    Test submitting a bug report with automated diagnostic metadata.
    """
    # 1. Sync user
    sync_res = await client.post(
        "/api/v1/users/sync",
        json={
            "user_id": "bug-tester-1",
            "email": "bugtester1@example.com",
            "name": "Bug Tester One",
            "provider": "github",
        },
        headers=internal_headers,
    )
    assert sync_res.status_code == 200
    user_id = sync_res.json()["id"]

    payload = {
        "title": "Submissions failing to sync on contest end",
        "category": "Codeforces Sync",
        "description": "After contest 998 ended, submissions took 10 minutes to populate in upsolve queue.",
        "reproduction_steps": "1. Enter contest\n2. Solve problems A, B\n3. Wait for contest end",
        "expected_behavior": "Submissions should appear within 60 seconds",
        "actual_behavior": "Took over 10 minutes",
        "priority": "HIGH",
        "screenshot_url": "/static/uploads/screenshots/test_screen.png",
        "environment_metadata": {
            "route": "/contests",
            "browser": "Chrome 128.0",
            "os": "macOS",
            "viewport": "1440x900",
            "app_version": "1.0.0-beta",
        },
    }

    response = await client.post(
        f"/api/v1/bug-reports?user_id={user_id}",
        json=payload,
        headers=internal_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["category"] == "Codeforces Sync"
    assert data["priority"] == "HIGH"
    assert data["status"] == "OPEN"
    assert data["user_id"] == user_id
    assert data["screenshot_url"] == "/static/uploads/screenshots/test_screen.png"
    assert data["environment_metadata"]["route"] == "/contests"
    assert data["environment_metadata"]["app_version"] == "1.0.0-beta"


@pytest.mark.asyncio
async def test_submit_bug_report_user_not_found(
    client: AsyncClient,
    internal_headers: dict[str, str],
):
    """
    Test submitting a report for a non-existent user returns 404.
    """
    payload = {
        "title": "Broken link",
        "category": "UI/UX",
        "description": "Button does not respond to clicks",
        "priority": "LOW",
    }

    response = await client.post(
        "/api/v1/bug-reports?user_id=00000000-0000-0000-0000-000000000000",
        json=payload,
        headers=internal_headers,
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_bug_reports_and_filters(
    client: AsyncClient,
    internal_headers: dict[str, str],
):
    """
    Test listing reports with priority, status, and category filters.
    """
    sync_res = await client.post(
        "/api/v1/users/sync",
        json={
            "user_id": "bug-tester-2",
            "email": "bugtester2@example.com",
            "name": "Bug Tester Two",
            "provider": "github",
        },
        headers=internal_headers,
    )
    user_id = sync_res.json()["id"]

    # Create 2 reports
    await client.post(
        f"/api/v1/bug-reports?user_id={user_id}",
        json={
            "title": "Critical Auth Crash",
            "category": "Authentication",
            "description": "OAuth token expired causing 500 error",
            "priority": "CRITICAL",
        },
        headers=internal_headers,
    )
    await client.post(
        f"/api/v1/bug-reports?user_id={user_id}",
        json={
            "title": "Minor Dark Mode Contrast",
            "category": "UI/UX",
            "description": "Tag badge text hard to read in sunlight",
            "priority": "LOW",
        },
        headers=internal_headers,
    )

    # Filter by user_id
    res = await client.get(f"/api/v1/bug-reports?user_id={user_id}", headers=internal_headers)
    assert res.status_code == 200
    assert res.json()["total"] >= 2

    # Filter by priority
    res_crit = await client.get(f"/api/v1/bug-reports?priority=CRITICAL", headers=internal_headers)
    assert res_crit.status_code == 200
    assert all(item["priority"] == "CRITICAL" for item in res_crit.json()["items"])

    # Filter by category
    res_ui = await client.get(f"/api/v1/bug-reports?category=UI/UX", headers=internal_headers)
    assert res_ui.status_code == 200
    assert any(item["category"] == "UI/UX" for item in res_ui.json()["items"])


@pytest.mark.asyncio
async def test_update_bug_report_status(
    client: AsyncClient,
    internal_headers: dict[str, str],
):
    """
    Test updating bug report status from OPEN to IN_PROGRESS to FIXED.
    """
    sync_res = await client.post(
        "/api/v1/users/sync",
        json={
            "user_id": "bug-tester-3",
            "email": "bugtester3@example.com",
            "name": "Bug Tester Three",
            "provider": "github",
        },
        headers=internal_headers,
    )
    user_id = sync_res.json()["id"]

    create_res = await client.post(
        f"/api/v1/bug-reports?user_id={user_id}",
        json={
            "title": "Recommendation calculation anomaly",
            "category": "Recommendations",
            "description": "Rating bucket shifted unexpectedly",
            "priority": "MEDIUM",
        },
        headers=internal_headers,
    )
    report_id = create_res.json()["id"]

    # Patch status
    patch_res = await client.patch(
        f"/api/v1/bug-reports/{report_id}/status",
        json={"status": "IN_PROGRESS", "priority": "HIGH"},
        headers=internal_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_PROGRESS"
    assert patch_res.json()["priority"] == "HIGH"

    # Fetch report detail
    detail_res = await client.get(f"/api/v1/bug-reports/{report_id}", headers=internal_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_screenshot_upload_abstraction(
    client: AsyncClient,
    internal_headers: dict[str, str],
):
    """
    Test upload endpoint validates formats and returns public URL.
    """
    # 1. Valid PNG upload
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("screenshot.png", io.BytesIO(png_bytes), "image/png")}

    upload_res = await client.post(
        "/api/v1/uploads/screenshot",
        files=files,
        headers=internal_headers,
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert "url" in upload_data
    assert upload_data["url"].startswith("/static/uploads/screenshots/")

    # 2. Invalid file extension / type
    bad_files = {"file": ("script.sh", io.BytesIO(b"echo 'malicious'"), "text/x-sh")}
    bad_res = await client.post(
        "/api/v1/uploads/screenshot",
        files=bad_files,
        headers=internal_headers,
    )
    assert bad_res.status_code == 400
