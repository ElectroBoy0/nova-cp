from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.models.problem import Problem


@dataclass
class ScoredProblem:
    problem: Problem
    total_score: float
    features: dict[str, float]  # e.g. {"topic_fit": 0.8, "difficulty_fit": 0.5}

@dataclass
class RecommendationContext:
    user_rating: int
    topic_mastery: dict[str, float]
    recent_failures: dict[str, int]
    target_delta: int = 100
    preferred_tags: set[str] = field(default_factory=set)
    recommendation_mode: str = "challenge"

class BaseScorer(ABC):
    @abstractmethod
    def score(self, candidate: Problem, context: RecommendationContext) -> ScoredProblem:
        """Score a problem based on the given context."""
        pass

