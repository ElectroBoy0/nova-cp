
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_internal_key
from app.schemas.bookmark import (
    BookmarkCreate,
    BookmarkMove,
    BookmarkRead,
    CollectionCreate,
    CollectionRead,
    CollectionUpdate,
)
from app.services.bookmark_service import BookmarkService

router = APIRouter(prefix="/api/v1/users/{user_id}/bookmarks", tags=["bookmarks"], dependencies=[Depends(require_internal_key)])

# ==========================
# Collections
# ==========================

@router.get("/collections", response_model=list[CollectionRead])
async def get_collections(user_id: str, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    return await service.get_collections(user_id)

@router.post("/collections", response_model=CollectionRead)
async def create_collection(user_id: str, payload: CollectionCreate, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    collection = await service.create_collection(user_id, name=payload.name, description=payload.description)

    # Reload with counts
    collections = await service.get_collections(user_id)
    for c in collections:
        if c["id"] == collection.id:
            return c
    return collection # fallback

@router.put("/collections/{collection_id}", response_model=CollectionRead)
async def update_collection(user_id: str, collection_id: str, payload: CollectionUpdate, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    collection = await service.update_collection(user_id, collection_id, name=payload.name, description=payload.description)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    collections = await service.get_collections(user_id)
    for c in collections:
        if c["id"] == collection.id:
            return c
    return collection

@router.delete("/collections/{collection_id}")
async def delete_collection(user_id: str, collection_id: str, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    success = await service.delete_collection(user_id, collection_id)
    if not success:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"status": "success"}

# ==========================
# Bookmarks
# ==========================

@router.get("")
async def get_bookmarks(
    user_id: str,
    collection_id: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    bookmarks, total = await service.get_bookmarks(user_id, collection_id=collection_id, limit=limit, offset=offset)

    # Format to match BookmarkRead roughly
    items = []
    for b in bookmarks:
        items.append({
            "id": b.id,
            "user_id": b.user_id,
            "problem_id": b.problem_id,
            "problem": b.problem,
            "note": None, # Could fetch from NoteService if needed
            "created_at": b.created_at,
            "updated_at": b.updated_at
        })

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.post("", response_model=BookmarkRead)
async def add_bookmark(user_id: str, payload: BookmarkCreate, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    bookmark = await service.add_bookmark(user_id, payload.problem_id, collection_id=payload.collection_id, note=payload.note)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Problem not found")

    return {
        "id": bookmark.id,
        "user_id": bookmark.user_id,
        "problem_id": bookmark.problem_id,
        "problem": bookmark.problem,
        "note": payload.note,
        "created_at": bookmark.created_at,
        "updated_at": bookmark.updated_at
    }

@router.delete("/{bookmark_id}")
async def remove_bookmark(user_id: str, bookmark_id: str, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    success = await service.remove_bookmark(user_id, bookmark_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"status": "success"}

@router.patch("/{bookmark_id}/move")
async def move_bookmark(user_id: str, bookmark_id: str, payload: BookmarkMove, db: AsyncSession = Depends(get_db)):
    service = BookmarkService(db)
    success = await service.move_bookmark(user_id, bookmark_id, payload.collection_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"status": "success"}
