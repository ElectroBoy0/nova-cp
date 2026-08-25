import math
import random

from app.models.problem import Problem

from .base import BaseScorer, RecommendationContext, ScoredProblem


class RuleBasedHybridScorer(BaseScorer):
    def __init__(self, weights: dict[str, float] | None = None):
        self.weights = weights or {
            "topic_fit": 0.35,
            "difficulty_fit": 0.25,
            "skill_gap": 0.15,
            "learning_value": 0.15,
            "exploration": 0.10,
        }

    def _gaussian(self, x: float, mu: float, sigma: float) -> float:
        return math.exp(-0.5 * ((x - mu) / sigma) ** 2)

    def score(self, candidate: Problem, context: RecommendationContext) -> ScoredProblem:
        if not candidate.rating:
            return ScoredProblem(candidate, 0.0, {})

        features = {}

        # 1. Topic Fit & Skill Gap
        max_topic_score = 0.0
        max_weakness = 0.0

        if candidate.tags:
            for tag in candidate.tags:
                mastery = context.topic_mastery.get(tag, 0.5) # Default 50% if unknown
                weakness = 1.0 - mastery
                if weakness > max_weakness:
                    max_weakness = weakness

                failures = context.recent_failures.get(tag, 0)
                topic_score = weakness + (min(failures, 5) / 5.0) * 0.5
                if topic_score > max_topic_score:
                    max_topic_score = topic_score

        features["topic_fit"] = max_topic_score
        features["skill_gap"] = max_weakness

        # 2. Difficulty Fit (Gaussian around user_rating + target_delta)
        target_rating = context.user_rating + context.target_delta
        # sigma = 150 means +/- 150 rating is 1 std deviation
        diff_fit = self._gaussian(candidate.rating, target_rating, 150)
        features["difficulty_fit"] = diff_fit

        # 3. Learning Value (High rating diff but achievable + Weak topic)
        learning_value = diff_fit * max_weakness
        features["learning_value"] = learning_value

        # 4. Exploration (Noise)
        features["exploration"] = random.uniform(0, 1.0)

        total_score = sum(features.get(k, 0) * w for k, w in self.weights.items())

        return ScoredProblem(candidate, total_score, features)
