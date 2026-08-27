
from pydantic import BaseModel


class ProblemRead(BaseModel):
    id: str
    platform: str
    platform_problem_id: str
    contest_id: int | None
    index: str
    name: str
    rating: int | None
    tags: list[str]
    url: str
    solved_count: int | None

    class Config:
        from_attributes = True

class ProblemListResponse(BaseModel):
    items: list[ProblemRead]
    total: int
    limit: int
    offset: int


class ProblemSearchResult(BaseModel):
    id: str
    problem_id: str
    platform: str
    platform_problem_id: str
    contest_id: int | None
    index: str
    name: str
    title: str
    rating: int | None
    tags: list[str]
    url: str
    solved_count: int | None = None
    status: str | None = None  # "solved" | "attempted" | "unattempted" | None


class ProblemSearchResponse(BaseModel):
    results: list[ProblemSearchResult]
    total: int
    limit: int
    offset: int

class ProblemRecommendationExplanation(BaseModel):
    recommendation_type: str
    reason_summary: str
    target_weakness: str
    difficulty_label: str
    estimated_solve_time_minutes: int
    expected_learning_outcome: str

class ProblemRecommendationRead(BaseModel):
    problem: ProblemRead
    score: float
    explanation: ProblemRecommendationExplanation

class RecommendationFeedbackCreate(BaseModel):
    problem_id: str
    event_type: str  # e.g., 'helpful', 'not_relevant', 'skipped'

class HintResponse(BaseModel):
    hint_level: int
    content: str
    total_levels: int = 4

class HintFeedbackCreate(BaseModel):
    user_id: str
    hint_level: int
    event_type: str  # "requested", "helpful", "not_helpful", "solved_after_hint"
