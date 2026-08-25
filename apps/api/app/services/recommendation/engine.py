from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.analytics import UserAnalytics
from app.models.problem import Problem, RecommendationFeedback
from app.models.submission import Submission
from app.models.user import User

from .diversity import DiversityReRanker
from .explainability import ExplainabilityEngine
from .scorers.base import RecommendationContext, ScoredProblem
from .scorers.hybrid import RuleBasedHybridScorer


class RecommendationEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.scorer = RuleBasedHybridScorer()
        self.reranker = DiversityReRanker()
        self.explainer = ExplainabilityEngine()

    async def generate_recommendations(self, user_id: str) -> list[dict]:
        # 1. Fetch User Context with joinedload
        user_query = select(User).options(joinedload(User.cf_handle)).where(User.id == user_id)
        user = (await self.db.execute(user_query)).scalar_one_or_none()

        if not user:
            return []

        user_rating = user.cf_handle.rating if (user.cf_handle and user.cf_handle.rating) else 800

        # Load real topic mastery from UserAnalytics
        analytics_query = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        analytics = (await self.db.execute(analytics_query)).scalar_one_or_none()

        topic_mastery = {}
        recent_failures = {}
        if analytics and analytics.topic_mastery:
            for topic, stats in analytics.topic_mastery.items():
                attempts = stats.get("attempts", 0)
                solved = stats.get("solved", 0)
                if attempts > 0:
                    topic_mastery[topic] = solved / attempts
                if attempts - solved > 0:
                    recent_failures[topic] = attempts - solved

        context = RecommendationContext(
            user_rating=user_rating,
            topic_mastery=topic_mastery or {"implementation": 0.5},
            recent_failures=recent_failures,
            target_delta=100,
        )

        # 2. Candidate Generation
        # Get all solved problem IDs
        subs_query = select(Submission.problem_index, Submission.contest_id).where(
            Submission.user_id == user_id,
            Submission.verdict == "OK"
        )
        solved_subs = (await self.db.execute(subs_query)).all()
        solved_keys = {(s.contest_id, s.problem_index) for s in solved_subs if s.contest_id}

        # Get attempted but unsolved
        attempted_query = select(Submission.problem_index, Submission.contest_id).where(
            Submission.user_id == user_id,
            Submission.verdict != "OK"
        )
        attempted_subs = (await self.db.execute(attempted_query)).all()
        attempted_keys = {(s.contest_id, s.problem_index) for s in attempted_subs if s.contest_id}
        unsolved_attempted_keys = attempted_keys - solved_keys

        # Fetch candidate problems from DB
        # Range: user_rating - 400 to user_rating + 400 (only problems with a rating)
        prob_query = select(Problem).where(
            Problem.rating.isnot(None),
            Problem.rating >= max(800, user_rating - 400),
            Problem.rating <= user_rating + 400
        ).limit(1000)

        candidates = list((await self.db.execute(prob_query)).scalars().all())

        # Get skipped / solved_externally problem IDs
        feedback_query = select(RecommendationFeedback.problem_id).where(
            RecommendationFeedback.user_id == user_id,
            RecommendationFeedback.event_type.in_(["skipped", "solved_externally"])
        )
        excluded_problem_ids = set((await self.db.execute(feedback_query)).scalars().all())

        # Filter out solved and excluded
        unsolved_candidates = [
            p for p in candidates
            if (p.contest_id, p.index) not in solved_keys and p.id not in excluded_problem_ids
        ]

        continue_candidates = [
            p for p in unsolved_candidates
            if (p.contest_id, p.index) in unsolved_attempted_keys
        ]

        # 3. Scoring
        scored_unsolved = [self.scorer.score(p, context) for p in unsolved_candidates]

        # 4. Diversity Re-ranking & Bucket Assignment
        recommendations = []
        seen_problem_ids: set[str] = set()

        # Bucket: Continue
        if continue_candidates:
            cont_p = continue_candidates[0]
            if cont_p.id not in seen_problem_ids:
                seen_problem_ids.add(cont_p.id)
                sp = self.scorer.score(cont_p, context)
                explanation = self.explainer.generate_explanation(sp, context, "continue")
                recommendations.append(self._build_response(sp, explanation))

        # Bucket: Skill Builder
        top_picks = self.reranker.rerank(scored_unsolved, limit=3)
        if top_picks:
            for ts in top_picks:
                if ts.problem.id not in seen_problem_ids and len(recommendations) < 3:
                    seen_problem_ids.add(ts.problem.id)
                    explanation = self.explainer.generate_explanation(ts, context, "skill_builder")
                    recommendations.append(self._build_response(ts, explanation))

        # Bucket: Stretch Challenge
        stretch_context = RecommendationContext(
            user_rating=user_rating,
            topic_mastery=context.topic_mastery,
            recent_failures=context.recent_failures,
            target_delta=300
        )
        scored_stretch = [
            self.scorer.score(p, stretch_context)
            for p in unsolved_candidates
            if p.rating and p.rating >= user_rating + 200 and p.id not in seen_problem_ids
        ]
        if scored_stretch:
            top_stretch = self.reranker.rerank(scored_stretch, limit=2)
            for ts in top_stretch:
                if ts.problem.id not in seen_problem_ids and len(recommendations) < 4:
                    seen_problem_ids.add(ts.problem.id)
                    explanation = self.explainer.generate_explanation(ts, stretch_context, "stretch")
                    recommendations.append(self._build_response(ts, explanation))

        # Bucket: Speed & Review
        speed_context = RecommendationContext(
            user_rating=user_rating,
            topic_mastery=context.topic_mastery,
            recent_failures=context.recent_failures,
            target_delta=-200
        )
        scored_speed = [
            self.scorer.score(p, speed_context)
            for p in unsolved_candidates
            if p.rating and p.rating <= user_rating - 100 and p.id not in seen_problem_ids
        ]
        if scored_speed:
            top_speed = self.reranker.rerank(scored_speed, limit=2)
            for ts in top_speed:
                if ts.problem.id not in seen_problem_ids and len(recommendations) < 6:
                    seen_problem_ids.add(ts.problem.id)
                    explanation = self.explainer.generate_explanation(ts, speed_context, "speed_review")
                    recommendations.append(self._build_response(ts, explanation))

        return recommendations

    async def generate_daily_mission(self, user_id: str) -> dict | None:
        # 1. Fetch User and Analytics
        user_query = select(User).options(joinedload(User.cf_handle)).where(User.id == user_id)
        user = (await self.db.execute(user_query)).scalar_one_or_none()

        if not user:
            return None

        user_rating = user.cf_handle.rating if (user.cf_handle and user.cf_handle.rating) else 800

        analytics_query = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        analytics = (await self.db.execute(analytics_query)).scalar_one_or_none()

        topic_mastery = {}
        recent_failures = {}
        if analytics and analytics.topic_mastery:
            for topic, stats in analytics.topic_mastery.items():
                attempts = stats.get("attempts", 0)
                solved = stats.get("solved", 0)
                if attempts > 0:
                    topic_mastery[topic] = solved / attempts
                if attempts - solved > 0:
                    recent_failures[topic] = attempts - solved

        context = RecommendationContext(
            user_rating=user_rating,
            topic_mastery=topic_mastery or {"implementation": 0.5}, # fallback
            recent_failures=recent_failures,
            target_delta=100
        )

        # 2. Candidate Generation
        subs_query = select(Submission.problem_index, Submission.contest_id).where(
            Submission.user_id == user_id,
        )
        all_subs = (await self.db.execute(subs_query)).all()
        attempted_keys = {(s.contest_id, s.problem_index) for s in all_subs if s.contest_id}

        prob_query = select(Problem).where(
            Problem.rating.isnot(None),
            Problem.rating >= max(800, user_rating),
            Problem.rating <= user_rating + 200
        ).limit(2000)

        candidates = list((await self.db.execute(prob_query)).scalars().all())

        feedback_query = select(RecommendationFeedback.problem_id).where(
            RecommendationFeedback.user_id == user_id,
            RecommendationFeedback.event_type.in_(["skipped", "solved_externally"])
        )
        excluded_problem_ids = set((await self.db.execute(feedback_query)).scalars().all())

        unsolved_candidates = [
            p for p in candidates
            if (p.contest_id, p.index) not in attempted_keys and p.id not in excluded_problem_ids
        ]

        # 3. Scoring
        scored_unsolved = [self.scorer.score(p, context) for p in unsolved_candidates]

        # 4. Rerank and Pick Top 1
        top_picks = self.reranker.rerank(scored_unsolved, limit=1)
        if top_picks:
            explanation = self.explainer.generate_explanation(top_picks[0], context, "todays_mission")
            return self._build_response(top_picks[0], explanation)

        return None

    def _build_response(self, sp: ScoredProblem, explanation: dict) -> dict:
        return {
            "problem": {
                "id": str(sp.problem.id),
                "platform": sp.problem.platform,
                "platform_problem_id": sp.problem.platform_problem_id,
                "contest_id": sp.problem.contest_id,
                "index": sp.problem.index,
                "name": sp.problem.name,
                "rating": sp.problem.rating,
                "tags": sp.problem.tags,
                "url": sp.problem.url,
                "solved_count": sp.problem.solved_count,
            },
            "score": sp.total_score,
            "explanation": explanation
        }
