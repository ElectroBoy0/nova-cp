from datetime import datetime

from pydantic import BaseModel

from app.schemas.problem import ProblemRead


class NoteCreate(BaseModel):
    problem_id: str
    content: str

class NoteRead(BaseModel):
    id: str
    user_id: str
    problem_id: str
    problem: ProblemRead
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NoteUpdate(BaseModel):
    content: str
