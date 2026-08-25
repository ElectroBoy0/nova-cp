from datetime import datetime

from pydantic import BaseModel

from app.schemas.problem import ProblemRead


class CollectionCreate(BaseModel):
    name: str
    description: str | None = None

class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class CollectionRead(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None
    position: int
    problem_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BookmarkCreate(BaseModel):
    problem_id: str
    collection_id: str | None = None
    note: str | None = None

class BookmarkRead(BaseModel):
    id: str
    user_id: str
    problem_id: str
    problem: ProblemRead
    note: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BookmarkMove(BaseModel):
    collection_id: str | None = None
