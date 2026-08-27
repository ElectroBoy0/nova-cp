import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User


@pytest.mark.asyncio
async def test_problem_search_by_id_title_tag_rating(client: AsyncClient, db_session: AsyncSession):
    # Seed test problems
    p1 = Problem(
        platform="codeforces",
        platform_problem_id="CF_2041_G",
        contest_id=2041,
        index="G",
        name="Summmon",
        rating=2400,
        tags=["binary search", "data structures", "greedy", "math"],
        url="https://codeforces.com/contest/2041/problem/G",
        solved_count=1200,
    )
    p2 = Problem(
        platform="codeforces",
        platform_problem_id="CF_1705_B",
        contest_id=1705,
        index="B",
        name="Mark the Dust Sweeper",
        rating=800,
        tags=["greedy", "implementation"],
        url="https://codeforces.com/contest/1705/problem/B",
        solved_count=25000,
    )
    p3 = Problem(
        platform="codeforces",
        platform_problem_id="CF_1600_A",
        contest_id=1600,
        index="A",
        name="Tree Diameter Queries",
        rating=1600,
        tags=["trees", "dfs and similar", "dp"],
        url="https://codeforces.com/contest/1600/problem/A",
        solved_count=5000,
    )
    db_session.add_all([p1, p2, p3])
    await db_session.commit()

    # 1. Search by exact ID pattern: "2041G"
    res1 = await client.get("/api/v1/problems/search?q=2041G")
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["results"]) >= 1
    assert data1["results"][0]["id"] == "2041G"
    assert data1["results"][0]["title"] == "Summmon"

    # 2. Search by title keyword: "sweeper"
    res2 = await client.get("/api/v1/problems/search?q=sweeper")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["results"]) >= 1
    assert "Mark the Dust Sweeper" in data2["results"][0]["title"]

    # 3. Search by tag keyword: "trees"
    res3 = await client.get("/api/v1/problems/search?q=trees")
    assert res3.status_code == 200
    data3 = res3.json()
    assert any("trees" in r["tags"] for r in data3["results"])

    # 4. Search by compound query: "trees 1600"
    res4 = await client.get("/api/v1/problems/search?q=trees%201600")
    assert res4.status_code == 200
    data4 = res4.json()
    assert len(data4["results"]) >= 1
    assert data4["results"][0]["rating"] == 1600
