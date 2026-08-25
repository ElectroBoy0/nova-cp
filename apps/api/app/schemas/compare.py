from __future__ import annotations

from pydantic import BaseModel


class CompareOverview(BaseModel):
    handle: str
    current_rating: int | None
    peak_rating: int | None
    problems_solved: int
    contests_participated: int
    best_rank: int | None

class TopicMasteryComparison(BaseModel):
    topic: str
    user_solved: int
    user_attempts: int
    rival_solved: int
    rival_attempts: int

class GapProblem(BaseModel):
    name: str
    contest_id: int | None
    index: str
    rating: int | None
    tags: list[str]
    relevance_score: float
    reasons: list[str]

class RatingHistoryPoint(BaseModel):
    contest_id: int
    contest_name: str
    time: int
    user_rating: int | None
    rival_rating: int | None

class CompareResponse(BaseModel):
    user_overview: CompareOverview
    rival_overview: CompareOverview
    rating_history: list[RatingHistoryPoint]
    topic_comparison: list[TopicMasteryComparison]
    gap_problems: list[GapProblem]
    shared_problems_count: int
