import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_codeforces_submit_missing_cookie():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/codeforces/submit",
            json={
                "contest_id": 2258,
                "problem_index": "A",
                "code": "#include <iostream>\nint main(){ return 0; }",
                "language": "cpp",
            },
        )
        assert response.status_code == 400
        assert "Codeforces session cookie not provided" in response.json()["detail"]


@pytest.mark.asyncio
async def test_codeforces_submit_invalid_cookie():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/codeforces/submit",
            json={
                "contest_id": 2258,
                "problem_index": "A",
                "code": "#include <iostream>\nint main(){ return 0; }",
                "language": "cpp",
                "session_cookie": "some_dummy_cookie=123",
            },
        )
        assert response.status_code == 400
        assert "JSESSIONID or 39ce7 is required" in response.json()["detail"]
