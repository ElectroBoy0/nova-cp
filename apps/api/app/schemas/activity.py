from datetime import date

from pydantic import BaseModel


class ProblemRef(BaseModel):
    name: str
    contest_id: int | None
    index: str
    rating: int | None

class DayActivity(BaseModel):
    date: date
    solved_count: int
    max_rating: int | None
    problems: list[ProblemRef]

class ActivitySummary(BaseModel):
    current_streak: int
    longest_streak: int
    total_solved: int
    active_days: int

class ActivityHeatmapResponse(BaseModel):
    days: dict[str, DayActivity]  # Keyed by YYYY-MM-DD
    summary: ActivitySummary
