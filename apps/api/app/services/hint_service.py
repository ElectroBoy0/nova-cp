import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.hint import ProblemHint
from app.models.problem import Problem
from app.redis import CacheKey, redis_client
from app.services.ai import get_ai_provider

logger = logging.getLogger(__name__)

class HintService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_provider = get_ai_provider()

    async def get_hint(self, problem_id: str, level: int) -> dict:
        """
        Get a hint for a problem at a specific level (1-4).
        Strategy: Cache -> DB -> AI Generation
        """
        if level < 1 or level > 4:
            raise ValueError("Hint level must be between 1 and 4")

        # 1. Check Redis Cache
        cache_key = CacheKey.problem_hint(problem_id, level)
        cached_hint = await redis_client.get(cache_key)
        if cached_hint:
            return {"hint_level": level, "content": cached_hint, "total_levels": 4}

        # 2. Check Database
        db_query = select(ProblemHint.content).where(
            ProblemHint.problem_id == problem_id,
            ProblemHint.hint_level == level
        )
        db_hint = (await self.db.execute(db_query)).scalar_one_or_none()

        if db_hint:
            # Populate cache and return
            await redis_client.set(cache_key, db_hint, ex=settings.REDIS_HINT_CACHE_TTL)
            return {"hint_level": level, "content": db_hint, "total_levels": 4}

        # 3. Generate via AI
        # Fetch problem details for the prompt
        problem = (await self.db.execute(select(Problem).where(Problem.id == problem_id))).scalar_one_or_none()
        if not problem:
            raise ValueError("Problem not found")

        content = await self._generate_hint(problem, level)

        # 4. Save to DB & Cache
        if not content.startswith("AI hints are currently disabled") and not content.startswith("I'm having trouble"):
            stmt = insert(ProblemHint).values(
                problem_id=problem_id,
                hint_level=level,
                content=content
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=['problem_id', 'hint_level'],
                set_={'content': stmt.excluded.content}
            )
            await self.db.execute(stmt)
            await self.db.commit()

            # Save to Cache
            await redis_client.set(cache_key, content, ex=settings.REDIS_HINT_CACHE_TTL)

        return {"hint_level": level, "content": content, "total_levels": 4}

    async def _generate_hint(self, problem: Problem, level: int) -> str:
        # Try AI generation first if configured
        if settings.GEMINI_API_KEY:
            try:
                prompt = f"""
                Problem Name: {problem.name}
                Platform ID: {problem.platform_problem_id}
                Rating: {problem.rating or 'Unknown'}
                Tags: {', '.join(problem.tags or [])}
                """

                system_prompts = {
                    1: "You are a competitive programming coach. The user is stuck on a problem. Provide a very high-level Hint 1. Identify the relevant concept or mathematical/algorithmic direction. Do NOT name the specific algorithm if it gives it away immediately. Keep it under 3 sentences.",
                    2: "You are a competitive programming coach. The user requested Hint 2. Guide the user's thinking towards the key observation or bottleneck of the problem. Ask a leading question. Keep it under 4 sentences.",
                    3: "You are a competitive programming coach. The user requested Hint 3. Name the specific algorithm, data structure, or mathematical theorem required to solve the problem. Explain roughly how it applies. Do NOT provide implementation details or pseudo-code.",
                    4: "You are a competitive programming coach. The user requested Hint 4, the final hint. Give concrete, implementation-level guidance. Describe the steps of the algorithm clearly. However, do NOT provide the complete solution code or the exact final answer. Leave the actual coding to the user."
                }

                base_rule = "\nCRITICAL RULE: NEVER provide direct code, complete solutions, or exact formulas that completely solve the problem. Your goal is to guide, not solve."
                system_prompt = system_prompts[level] + base_rule

                ai_hint = await self.ai_provider.generate(prompt=prompt, system_prompt=system_prompt)
                if ai_hint and not ai_hint.startswith("AI hints are currently disabled") and not ai_hint.startswith("I'm having trouble"):
                    return ai_hint
            except Exception as e:
                logger.warning(f"AI hint generation failed: {e}. Using rule-based fallback.")

        # Algorithmic domain-aware fallback hints
        return self._generate_fallback_hint(problem, level)

    def _generate_fallback_hint(self, problem: Problem, level: int) -> str:
        tags = [t.lower() for t in (problem.tags or [])]
        tags_str = ", ".join(t.title() for t in tags) if tags else "General Logic"
        rating = problem.rating or 1200

        tag_clues = []
        if any(t in tags for t in ["dp", "dynamic programming"]):
            tag_clues.append("defining a subproblem state $dp[i]$ representing the optimal answer up to index $i$")
        if any(t in tags for t in ["binary search"]):
            tag_clues.append("checking if the answer space has a monotonic predicate to binary search on the answer")
        if any(t in tags for t in ["greedy"]):
            tag_clues.append("making locally optimal choices (e.g. sorting by values, deadlines, or ratios)")
        if any(t in tags for t in ["graphs", "trees", "dfs and similar", "shortest paths"]):
            tag_clues.append("modeling the problem as a graph traversal (BFS/DFS) or shortest path search")
        if any(t in tags for t in ["math", "number theory", "combinatorics"]):
            tag_clues.append("analyzing parity, GCD/LCM properties, prime factorizations, or algebraic simplifications")
        if any(t in tags for t in ["two pointers", "sortings"]):
            tag_clues.append("maintaining two pointers after sorting to shrink the search window in $O(N)$ time")
        if any(t in tags for t in ["bitmasks"]):
            tag_clues.append("using bitwise operations ($AND, OR, XOR$) or representing subsets as integer bitmasks")
        if any(t in tags for t in ["data structures", "dsu"]):
            tag_clues.append("using an efficient data structure (like Segment Tree, Fenwick Tree, Disjoint Set Union, or Priority Queue)")
        if any(t in tags for t in ["constructive algorithms"]):
            tag_clues.append("working backwards from small base cases ($N=1, 2, 3$) to identify an invariant pattern")
        if any(t in tags for t in ["brute force"]):
            tag_clues.append("analyzing constraints to see if you can iterate through all valid states or simulate step-by-step")

        clue = tag_clues[0] if tag_clues else "carefully examining problem invariants and edge cases"

        if level == 1:
            return (
                f"**Conceptual Direction**: For **{problem.name}** ({rating} rating), focus on {tags_str}. "
                f"Consider whether you can simplify the problem by {clue} rather than checking every combination directly."
            )
        elif level == 2:
            return (
                f"**Key Observation**: Look closely at the input constraints and edge cases. "
                f"Ask yourself: What invariant stays true as you process the elements? Can you transform the condition into {clue}?"
            )
        elif level == 3:
            return (
                f"**Algorithmic Approach**: This problem primarily leverages **{tags_str}**. "
                f"The standard approach involves {clue}. Ensure your algorithm runs comfortably within the typical $10^8$ operations per second limit."
            )
        else:
            return (
                f"**Implementation Strategy**: "
                f"1. Parse the input and handle base cases first. "
                f"2. Apply {clue}. "
                f"3. Maintain 64-bit integer types (`long long` in C++, `BigInt`/`long` in other languages) to prevent arithmetic overflow. "
                f"4. Double-check $N=0, 1$ and extreme boundary values before final submission."
            )
