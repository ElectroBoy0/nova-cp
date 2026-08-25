from datetime import datetime

from pydantic import BaseModel


class UpsolveItemRead(BaseModel):
    id: str
    user_id: str
    contest_id: int
    contest_name: str
    problem_index: str
    problem_name: str
    problem_rating: int | None
    tags: list[str]
    problem_url: str
    reason: str
    status: str
    added_at: datetime
    solved_at: datetime | None

    class Config:
        from_attributes = True

class UpsolveQueueResponse(BaseModel):
    items: list[UpsolveItemRead]
    total: int
    limit: int
    offset: int

class UpsolveStatsRead(BaseModel):
    total_items: int
    not_started: int
    attempted: int
    solved: int
    upsolve_ratio: float
    monthly_total: int
    monthly_solved: int
    monthly_ratio: float

class UpsolveStatusUpdate(BaseModel):
    status: str
