
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_internal_key
from app.schemas.snippet import SnippetCreate, SnippetListResponse, SnippetRead, SnippetUpdate
from app.services.seed_snippets import seed_official_snippets
from app.services.snippet_service import SnippetService

router = APIRouter(prefix="/api/v1/snippets", tags=["snippets"], dependencies=[Depends(require_internal_key)])

@router.get("", response_model=SnippetListResponse)
async def list_snippets(
    user_id: str,
    search: str | None = None,
    language: str | None = None,
    category: str | None = None,
    favorites_only: bool = False,
    official_only: bool = False,
    my_snippets_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = SnippetService(db)
    items, total = await service.list_snippets(
        user_id=user_id,
        search=search,
        language=language,
        category=category,
        favorites_only=favorites_only,
        official_only=official_only,
        my_snippets_only=my_snippets_only,
        limit=limit,
        offset=offset
    )
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{snippet_id}", response_model=SnippetRead)
async def get_snippet(snippet_id: str, user_id: str, db: AsyncSession = Depends(get_db)):
    service = SnippetService(db)
    snippet = await service.get_snippet(user_id, snippet_id)
    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")
    return snippet

@router.post("", response_model=SnippetRead)
async def create_snippet(user_id: str, payload: SnippetCreate, db: AsyncSession = Depends(get_db)):
    service = SnippetService(db)
    snippet = await service.create_snippet(user_id, payload)
    return await service.get_snippet(user_id, snippet.id)

@router.put("/{snippet_id}", response_model=SnippetRead)
async def update_snippet(snippet_id: str, user_id: str, payload: SnippetUpdate, db: AsyncSession = Depends(get_db)):
    service = SnippetService(db)
    snippet = await service.update_snippet(user_id, snippet_id, payload)
    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found or access denied")
    return await service.get_snippet(user_id, snippet.id)

@router.delete("/{snippet_id}")
async def delete_snippet(snippet_id: str, user_id: str, db: AsyncSession = Depends(get_db)):
    service = SnippetService(db)
    success = await service.delete_snippet(user_id, snippet_id)
    if not success:
        raise HTTPException(status_code=404, detail="Snippet not found or access denied")
    return {"status": "success"}

@router.post("/{snippet_id}/favorite")
async def toggle_favorite(snippet_id: str, user_id: str, db: AsyncSession = Depends(get_db)):
    service = SnippetService(db)
    try:
        is_favorited = await service.toggle_favorite(user_id, snippet_id)
        return {"status": "success", "is_favorited": is_favorited}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

@router.post("/seed")
async def seed_snippets(db: AsyncSession = Depends(get_db)):
    """Seed the official snippets. Can be called internally."""
    count = await seed_official_snippets(db)
    return {"status": "success", "seeded": count}
