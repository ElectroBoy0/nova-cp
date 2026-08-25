import logging
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import UserAnalytics
from app.models.submission import Submission
from app.models.user import CFHandle
from app.schemas.compare import (
    CompareOverview,
    CompareResponse,
    GapProblem,
    RatingHistoryPoint,
    TopicMasteryComparison,
)
from app.services.codeforces_service import CodeforcesService

logger = logging.getLogger(__name__)


class CompareService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_comparison(self, user_id: str, rival_handle: str) -> CompareResponse | None:
        # 1. Fetch User Data
        stmt_handle = select(CFHandle).where(CFHandle.user_id == user_id)
        user_handle = (await self.db.execute(stmt_handle)).scalar_one_or_none()
        if not user_handle:
            logger.warning(f"Compare: User {user_id} has no CF handle.")
            return None

        stmt_analytics = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        user_analytics = (await self.db.execute(stmt_analytics)).scalar_one_or_none()

        stmt_subs = select(Submission).where(Submission.user_id == user_id)
        user_subs = list((await self.db.execute(stmt_subs)).scalars().all())

        user_solved_keys = {
            f"{s.contest_id}_{s.problem_index}" if s.contest_id else s.problem_name
            for s in user_subs if s.verdict == "OK"
        }

        user_attempted_times = {}
        for s in user_subs:
            key = f"{s.contest_id}_{s.problem_index}" if s.contest_id else s.problem_name
            if key not in user_attempted_times or s.creation_time.timestamp() > user_attempted_times[key]:
                user_attempted_times[key] = s.creation_time.timestamp()

        user_overview = CompareOverview(
            handle=user_handle.handle,
            current_rating=user_handle.rating,
            peak_rating=user_handle.max_rating,
            problems_solved=len(user_solved_keys),
            contests_participated=user_analytics.contest_count if user_analytics else 0,
            best_rank=self._extract_best_rank_from_history(user_handle.rating_history) if user_handle.rating_history else None,
        )

        # 2. Fetch Rival Data
        async with CodeforcesService() as cf:
            rival_info = await cf.fetch_user_info(rival_handle)
            if not rival_info:
                raise ValueError(f"Rival handle {rival_handle} not found on Codeforces.")

            rival_subs = await cf.fetch_user_submissions(rival_handle)
            rival_rating_history = await cf.fetch_rating_history(rival_handle)

        # Process Rival Data
        rival_solved_problems = {} # key -> problem dict
        rival_solve_times = {}
        rival_topic_stats = defaultdict(lambda: {"solved": 0, "attempts": 0})

        for sub in rival_subs:
            problem = sub.get("problem", {})
            key = f"{problem.get('contestId')}_{problem.get('index')}" if problem.get("contestId") else problem.get("name")

            if not key:
                continue

            is_ac = sub.get("verdict") == "OK"

            for tag in problem.get("tags", []):
                rival_topic_stats[tag]["attempts"] += 1
                if is_ac:
                    rival_topic_stats[tag]["solved"] += 1

            if is_ac:
                if key not in rival_solved_problems:
                    rival_solved_problems[key] = problem

                creation_time = sub.get("creationTimeSeconds", 0)
                if key not in rival_solve_times or creation_time > rival_solve_times[key]:
                    rival_solve_times[key] = creation_time

        rival_overview = CompareOverview(
            handle=rival_info.get("handle", rival_handle),
            current_rating=rival_info.get("rating"),
            peak_rating=rival_info.get("maxRating"),
            problems_solved=len(rival_solved_problems),
            contests_participated=len(rival_rating_history),
            best_rank=self._extract_best_rank_from_cf_history(rival_rating_history),
        )

        # 3. Topic Mastery Comparison
        user_topic_stats = user_analytics.topic_mastery if user_analytics else {}
        all_topics = set(user_topic_stats.keys()).union(set(rival_topic_stats.keys()))

        # Major tags to track (consistent with NovaCP Analytics)
        major_tags = {"dp", "graphs", "greedy", "math", "strings", "data structures", "binary search"}

        topic_comparison = []
        for topic in sorted(all_topics):
            if topic not in major_tags and (
                user_topic_stats.get(topic, {}).get("attempts", 0) < 10 and
                rival_topic_stats[topic]["attempts"] < 10
            ):
                continue # Skip very rare topics if not major

            topic_comparison.append(
                TopicMasteryComparison(
                    topic=topic,
                    user_solved=user_topic_stats.get(topic, {}).get("solved", 0),
                    user_attempts=user_topic_stats.get(topic, {}).get("attempts", 0),
                    rival_solved=rival_topic_stats[topic]["solved"],
                    rival_attempts=rival_topic_stats[topic]["attempts"],
                )
            )

        # 4. Rating History
        rating_history = self._merge_rating_histories(user_handle.rating_history or [], rival_rating_history)

        # 5. Shared Problems
        shared_problems_count = len(user_solved_keys.intersection(set(rival_solved_problems.keys())))

        # 6. "The Gap" (Problems rival solved but user hasn't)
        gap_problems = self._compute_gap(
            user_solved_keys,
            user_attempted_times,
            user_topic_stats,
            user_handle.rating or 1200,
            rival_solved_problems,
            rival_solve_times
        )

        return CompareResponse(
            user_overview=user_overview,
            rival_overview=rival_overview,
            rating_history=rating_history,
            topic_comparison=topic_comparison,
            gap_problems=gap_problems,
            shared_problems_count=shared_problems_count,
        )

    def _extract_best_rank_from_history(self, history: list[dict]) -> int | None:
        ranks = [h.get("rank") for h in history if h.get("rank")]
        return min(ranks) if ranks else None

    def _extract_best_rank_from_cf_history(self, history: list[dict]) -> int | None:
        ranks = [h.get("rank") for h in history if h.get("rank")]
        return min(ranks) if ranks else None

    def _merge_rating_histories(self, user_history: list[dict], rival_history: list[dict]) -> list[RatingHistoryPoint]:
        # User history is stored as dict with contest_id, contest_name, time, new_rating
        # Rival history is directly from CF API: contestId, contestName, ratingUpdateTimeSeconds, newRating

        merged = {} # time -> RatingHistoryPoint

        for uh in user_history:
            t = uh.get("time")
            merged[t] = RatingHistoryPoint(
                contest_id=uh.get("contest_id", 0),
                contest_name=uh.get("contest_name", ""),
                time=t,
                user_rating=uh.get("new_rating"),
                rival_rating=None
            )

        for rh in rival_history:
            t = rh.get("ratingUpdateTimeSeconds")
            if t in merged:
                merged[t].rival_rating = rh.get("newRating")
            else:
                merged[t] = RatingHistoryPoint(
                    contest_id=rh.get("contestId", 0),
                    contest_name=rh.get("contestName", ""),
                    time=t,
                    user_rating=None,
                    rival_rating=rh.get("newRating")
                )

        # Fill in missing ratings (carry forward the last known rating)
        sorted_times = sorted(merged.keys())
        last_u = None
        last_r = None

        for t in sorted_times:
            pt = merged[t]
            if pt.user_rating is not None:
                last_u = pt.user_rating
            else:
                pt.user_rating = last_u

            if pt.rival_rating is not None:
                last_r = pt.rival_rating
            else:
                pt.rival_rating = last_r

        return [merged[t] for t in sorted_times]

    def _compute_gap(
        self,
        user_solved_keys: set[str],
        user_attempted_times: dict[str, float],
        user_topic_stats: dict[str, dict],
        user_rating: int,
        rival_solved_problems: dict[str, dict],
        rival_solve_times: dict[str, float]
    ) -> list[GapProblem]:
        gap_list = []

        # Determine user's weak topics (low solve rate)
        topic_rates = {}
        for topic, stats in user_topic_stats.items():
            if stats.get("attempts", 0) >= 3:
                topic_rates[topic] = stats.get("solved", 0) / stats.get("attempts", 1)

        for key, problem in rival_solved_problems.items():
            if key in user_solved_keys:
                continue

            prob_rating = problem.get("rating")
            if not prob_rating:
                continue

            # Filter by rating range (-100 to +200)
            if prob_rating < user_rating - 100 or prob_rating > user_rating + 200:
                continue

            relevance_score = 0.0
            reasons = []

            # 1. Rating appropriateness
            rating_diff = prob_rating - user_rating
            if 0 <= rating_diff <= 100:
                relevance_score += 3.0
                reasons.append("Perfect difficulty step")
            elif 100 < rating_diff <= 200:
                relevance_score += 2.0
                reasons.append("Stretch difficulty")
            else:
                relevance_score += 1.0

            # 2. Weak topic relevance
            prob_tags = problem.get("tags", [])
            weak_tag_match = False
            for tag in prob_tags:
                if tag in topic_rates and topic_rates[tag] < 0.5:
                    weak_tag_match = True
                    break
            if weak_tag_match:
                relevance_score += 4.0
                reasons.append("Matches your weak topics")

            # 3. Recently attempted by user but not solved?
            if key in user_attempted_times:
                relevance_score += 2.0
                reasons.append("You tried this before")

            # 4. Recently solved by rival
            import time
            now = time.time()
            if key in rival_solve_times and (now - rival_solve_times[key]) < 30 * 24 * 3600:
                relevance_score += 1.5
                reasons.append("Recently solved by rival")

            gap_list.append(
                GapProblem(
                    name=problem.get("name", "Unknown"),
                    contest_id=problem.get("contestId"),
                    index=problem.get("index", ""),
                    rating=prob_rating,
                    tags=prob_tags,
                    relevance_score=relevance_score,
                    reasons=reasons[:2] # Keep top 2 reasons
                )
            )

        # Sort by relevance_score descending, then by rating ascending
        gap_list.sort(key=lambda x: (-x.relevance_score, x.rating or 0))

        return gap_list[:15] # Top 15 problems
