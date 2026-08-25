import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem
from app.models.user import User
from app.services.bookmark_service import BookmarkService
from app.services.note_service import NoteService


@pytest.mark.asyncio
async def test_bookmarks_collections_and_notes(db_session: AsyncSession):
    # 1. Create user and problem
    user = User(
        email="bmuser@example.com",
        name="Bookmark User",
        provider="github",
        provider_account_id="gh-bm-1",
        timezone="UTC",
    )
    db_session.add(user)
    await db_session.flush()

    problem = Problem(
        platform="codeforces",
        platform_problem_id="CF_500_A",
        contest_id=500,
        index="A",
        name="Bookmark Test Problem",
        rating=1600,
        tags=["trees"],
        url="https://codeforces.com/contest/500/problem/A",
    )
    db_session.add(problem)
    await db_session.commit()

    # 2. Test Collections
    bm_service = BookmarkService(db_session)
    col = await bm_service.create_collection(user.id, name="Dynamic Programming Favorites", description="Best DP problems")
    assert col.name == "Dynamic Programming Favorites"

    collections = await bm_service.get_collections(user.id)
    assert len(collections) == 1
    assert collections[0]["name"] == "Dynamic Programming Favorites"

    # 3. Test Add Bookmark
    bm = await bm_service.add_bookmark(user.id, problem.id, collection_id=col.id)
    assert bm is not None
    assert bm.problem.name == "Bookmark Test Problem"

    bookmarks, total = await bm_service.get_bookmarks(user.id, collection_id=col.id)
    assert total == 1

    # 4. Test Move Bookmark
    moved = await bm_service.move_bookmark(user.id, bm.id, collection_id=None)
    assert moved is True

    # 5. Test Problem Notes
    note_service = NoteService(db_session)
    note = await note_service.upsert_note(user.id, problem.id, content="State: dp[i][j] represents max sum")
    assert note is not None
    assert note.content == "State: dp[i][j] represents max sum"

    # Fetch note by platform_problem_id
    fetched_note = await note_service.get_note(user.id, "CF_500_A")
    assert fetched_note is not None
    assert fetched_note.content == "State: dp[i][j] represents max sum"

    # Delete note
    del_res = await note_service.delete_note(user.id, problem.id)
    assert del_res is True
