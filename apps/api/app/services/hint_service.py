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

        # 4. Save to DB & Cache only if GEMINI_API_KEY is configured and valid
        if settings.GEMINI_API_KEY and not content.startswith("AI hints are currently disabled") and not content.startswith("I'm having trouble"):
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
        prompt = f"""
        Problem Name: {problem.name}
        Platform ID: {problem.platform_problem_id}
        Rating: {problem.rating or 'Unknown'}
        Tags: {', '.join(problem.tags)}
        """

        system_prompts = {
            1: "You are a competitive programming coach. The user is stuck on a problem. Provide a very high-level Hint 1. Identify the relevant concept or mathematical/algorithmic direction. Do NOT name the specific algorithm if it gives it away immediately. Keep it under 3 sentences.",
            2: "You are a competitive programming coach. The user requested Hint 2. Guide the user's thinking towards the key observation or bottleneck of the problem. Ask a leading question. Keep it under 4 sentences.",
            3: "You are a competitive programming coach. The user requested Hint 3. Name the specific algorithm, data structure, or mathematical theorem required to solve the problem. Explain roughly how it applies. Do NOT provide implementation details or pseudo-code.",
            4: "You are a competitive programming coach. The user requested Hint 4, the final hint. Give concrete, implementation-level guidance. Describe the steps of the algorithm clearly. However, do NOT provide the complete solution code or the exact final answer. Leave the actual coding to the user."
        }

        base_rule = "\nCRITICAL RULE: NEVER provide direct code, complete solutions, or exact formulas that completely solve the problem. Your goal is to guide, not solve."

        system_prompt = system_prompts[level] + base_rule

        return await self.ai_provider.generate(prompt=prompt, system_prompt=system_prompt)
