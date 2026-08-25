import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.snippet import SnippetCreate, SnippetUpdate
from app.services.seed_snippets import seed_official_snippets
from app.services.snippet_service import SnippetService


@pytest.mark.asyncio
async def test_snippets_crud_search_and_favorites(db_session: AsyncSession):
    # 1. Create user
    user = User(
        email="snippetuser@example.com",
        name="Snippet User",
        provider="github",
        provider_account_id="gh-snip-1",
        timezone="UTC",
    )
    db_session.add(user)
    await db_session.flush()

    # 2. Seed official snippets
    seeded_count = await seed_official_snippets(db_session)
    assert seeded_count > 0

    # 3. Create user snippet
    service = SnippetService(db_session)
    user_snippet_data = SnippetCreate(
        title="Custom Fenwick Tree",
        description="Point update range query",
        language="cpp",
        category="data_structures",
        code="struct Fenwick { vector<int> bit; ... };",
        complexity="O(log N)",
        usage_notes="1-based indexing",
    )
    snip = await service.create_snippet(user.id, user_snippet_data)
    assert snip.title == "Custom Fenwick Tree"
    assert snip.is_official is False

    # 4. Search snippets
    items, total = await service.list_snippets(user.id, search="Fenwick")
    assert total >= 1
    assert any(s["title"] == "Custom Fenwick Tree" for s in items)

    # 5. Filter by language
    items_py, _ = await service.list_snippets(user.id, language="python")
    assert all(s["language"] == "python" for s in items_py)

    # 6. Toggle favorite
    is_fav = await service.toggle_favorite(user.id, snip.id)
    assert is_fav is True

    # Check favorites_only
    fav_items, fav_total = await service.list_snippets(user.id, favorites_only=True)
    assert fav_total >= 1
    assert any(s["id"] == snip.id for s in fav_items)

    # 7. Update snippet
    updated = await service.update_snippet(
        user.id,
        snip.id,
        SnippetUpdate(title="Custom Fenwick Tree (Updated)"),
    )
    assert updated is not None
    assert updated.title == "Custom Fenwick Tree (Updated)"

    # 8. Delete snippet
    del_res = await service.delete_snippet(user.id, snip.id)
    assert del_res is True
