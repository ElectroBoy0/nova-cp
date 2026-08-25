from collections.abc import Iterable

from .scorers.base import ScoredProblem


class DiversityReRanker:
    @staticmethod
    def rerank(scored_problems: Iterable[ScoredProblem], limit: int = 5) -> list[ScoredProblem]:
        """
        Re-ranks scored problems to ensure topic diversity.
        Takes top items, but penalizes items if we already selected one with the same primary tag.
        """
        sorted_problems = sorted(scored_problems, key=lambda x: x.total_score, reverse=True)
        selected = []
        selected_tags = set()

        for sp in sorted_problems:
            if len(selected) >= limit:
                break

            # Basic diversity: try not to pick problems with the exact same tags
            # if we already have a problem heavily overlapping.
            overlap = False
            primary_tag = sp.problem.tags[0] if sp.problem.tags else "unknown"

            if primary_tag in selected_tags:
                overlap = True

            # If overlap, we only accept it if we desperately need problems (e.g. less than 10 total available)
            if not overlap or len(sorted_problems) < limit * 2:
                selected.append(sp)
                selected_tags.add(primary_tag)

        # If we didn't get enough due to strict diversity, just fill with the highest scores remaining
        if len(selected) < limit:
            for sp in sorted_problems:
                if len(selected) >= limit:
                    break
                if sp not in selected:
                    selected.append(sp)

        return selected
