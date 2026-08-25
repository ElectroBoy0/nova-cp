
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_internal_key
from app.schemas.note import NoteRead, NoteUpdate
from app.services.note_service import NoteService

router = APIRouter(prefix="/api/v1/users/{user_id}/notes", tags=["notes"], dependencies=[Depends(require_internal_key)])

@router.get("", response_model=list[NoteRead])
async def get_user_notes(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = NoteService(db)
    return await service.get_user_notes(user_id, limit=limit, offset=offset)

@router.get("/{problem_id}", response_model=NoteRead)
async def get_note(user_id: str, problem_id: str, db: AsyncSession = Depends(get_db)):
    service = NoteService(db)
    note = await service.get_note(user_id, problem_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.put("/{problem_id}", response_model=NoteRead)
async def upsert_note(user_id: str, problem_id: str, payload: NoteUpdate, db: AsyncSession = Depends(get_db)):
    service = NoteService(db)
    note = await service.upsert_note(user_id, problem_id, payload.content)
    if not note:
        raise HTTPException(status_code=404, detail="Problem not found")
    return note

@router.delete("/{problem_id}")
async def delete_note(user_id: str, problem_id: str, db: AsyncSession = Depends(get_db)):
    service = NoteService(db)
    success = await service.delete_note(user_id, problem_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "success"}
