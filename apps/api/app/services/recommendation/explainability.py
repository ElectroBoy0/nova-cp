from .scorers.base import RecommendationContext, ScoredProblem


class ExplainabilityEngine:
    @staticmethod
    def generate_explanation(sp: ScoredProblem, context: RecommendationContext, mission_type: str) -> dict[str, str | int]:
        problem = sp.problem

        # 1. Identify primary weakness targeted
        primary_tag = problem.tags[0] if problem.tags else "general logic"
        weakest_tag = primary_tag
        min_mastery = 1.0

        for tag in problem.tags:
            mastery = context.topic_mastery.get(tag, 1.0)
            if mastery < min_mastery:
                min_mastery = mastery
                weakest_tag = tag

        mastery_pct = int(min_mastery * 100)
        recent_fails = context.recent_failures.get(weakest_tag, 0)

        # 2. Difficulty label
        rating = problem.rating or 800
        diff_delta = rating - context.user_rating

        if diff_delta > 200:
            diff_label = f"Stretch Challenge ({rating} Rating)"
        elif diff_delta > 50:
            diff_label = f"Slight Challenge ({rating} Rating)"
        elif diff_delta > -50:
            diff_label = f"Right at your level ({rating} Rating)"
        else:
            diff_label = f"Review & Speed ({rating} Rating)"

        # 3. Estimated solve time
        # Very rough heuristic based on rating delta
        if diff_delta > 200:
            est_time = 45
        elif diff_delta > 50:
            est_time = 30
        elif diff_delta > -50:
            est_time = 20
        else:
            est_time = 10

        # 4. Reason summary & Outcome
        is_preferred = weakest_tag in context.preferred_tags or any(t in context.preferred_tags for t in problem.tags)
        if is_preferred:
            reason = f"Prioritizes your preferred topic in {weakest_tag.title()} ({mastery_pct}% mastery)."
        else:
            reason = f"Targets your {mastery_pct}% mastery in {weakest_tag.title()}."

        if recent_fails > 0:
            reason += f" You recently struggled with {recent_fails} problems in this topic."

        outcome = f"Master {weakest_tag.title()} concepts at the {rating} rating level."

        if mission_type == "speed_review":
            reason = f"A quick exercise to keep your skills sharp in {weakest_tag.title()}."
            outcome = f"Reinforce your fundamentals in {weakest_tag.title()} with a quick solve."
            diff_label = f"Speed & Review ({rating} Rating)"
            est_time = 10
        elif mission_type == "continue":
            reason = "You attempted this problem recently but haven't solved it yet."
            outcome = "Finish what you started and secure the solve."
            diff_label = f"Unfinished Business ({rating} Rating)"
            est_time = 15

        return {
            "recommendation_type": mission_type,
            "reason_summary": reason,
            "target_weakness": f"{weakest_tag.title()} ({mastery_pct}% mastery)",
            "difficulty_label": diff_label,
            "estimated_solve_time_minutes": est_time,
            "expected_learning_outcome": outcome,
        }
