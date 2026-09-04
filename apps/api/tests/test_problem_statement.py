import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_problem_statement_direct_id_fallback(client: AsyncClient):
    response = await client.get("/api/v1/problems/166A/statement")
    assert response.status_code == 200
    data = response.json()
    assert data["contest_id"] == 166
    assert data["index"] == "A"
    assert "is_fallback" in data
    # Successfully fetched official statement via archive fallback
    assert len(data["description"]) > 0
    assert len(data["sample_tests"]) > 0
    assert "codeforces.com" in data["cf_url"]

@pytest.mark.asyncio
async def test_problem_statement_with_session_cookie_param(client: AsyncClient):
    response = await client.get(
        "/api/v1/problems/166A/statement",
        params={"session_cookie": "JSESSIONID=test1234; 39ce7=clearance5678"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["contest_id"] == 166
    assert data["index"] == "A"

@pytest.mark.asyncio
async def test_get_problem_by_id_direct(client: AsyncClient):
    # Test lookup of problem metadata by code format
    response = await client.get("/api/v1/problems/99999Z")
    # Non-existent problem should 404 cleanly
    assert response.status_code == 404
