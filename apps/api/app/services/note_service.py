import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note import ProblemNote
from app.models.problem import Problem

logger = logging.getLogger(__name__)

class NoteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_note(self, user_id: str, problem_id: str, content: str) -> ProblemNote | None:
        # Verify problem exists
        try:
            uuid.UUID(str(problem_id))
            prob_stmt = select(Problem).where(Problem.id == problem_id)
        except ValueError:
            prob_stmt = select(Problem).where(Problem.platform_problem_id == problem_id)

        prob_result = await self.db.execute(prob_stmt)
        problem = prob_result.scalar_one_or_none()
        if not problem:
            return None

        problem_id = problem.id

        # Check existing
        stmt = select(ProblemNote).where(ProblemNote.user_id == user_id, ProblemNote.problem_id == problem_id)
        result = await self.db.execute(stmt)
        note = result.scalar_one_or_none()

        if note:
            note.content = content
        else:
            note = ProblemNote(user_id=user_id, problem_id=problem_id, content=content)
            self.db.add(note)

        await self.db.commit()
        await self.db.refresh(note)

        # Reload with problem relationship for response
        reload_stmt = select(ProblemNote).options(selectinload(ProblemNote.problem)).where(ProblemNote.id == note.id)
        reload_res = await self.db.execute(reload_stmt)
        return reload_res.scalar_one()

    async def get_note(self, user_id: str, problem_id: str) -> ProblemNote | None:
        try:
            uuid.UUID(str(problem_id))
            real_problem_id = problem_id
        except ValueError:
            prob_stmt = select(Problem.id).where(Problem.platform_problem_id == problem_id)
            real_problem_id = await self.db.scalar(prob_stmt)
            if not real_problem_id:
                return None

        stmt = (
            select(ProblemNote)
            .options(selectinload(ProblemNote.problem))
            .where(ProblemNote.user_id == user_id, ProblemNote.problem_id == real_problem_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_note(self, user_id: str, problem_id: str) -> bool:
        try:
            uuid.UUID(str(problem_id))
            real_problem_id = problem_id
        except ValueError:
            prob_stmt = select(Problem.id).where(Problem.platform_problem_id == problem_id)
            real_problem_id = await self.db.scalar(prob_stmt)
            if not real_problem_id:
                return False

        stmt = select(ProblemNote).where(ProblemNote.user_id == user_id, ProblemNote.problem_id == real_problem_id)
        result = await self.db.execute(stmt)
        note = result.scalar_one_or_none()
        if not note:
            return False

        await self.db.delete(note)
        await self.db.commit()
        return True

    async def get_user_notes(self, user_id: str, limit: int = 50, offset: int = 0):
        stmt = (
            select(ProblemNote)
            .options(selectinload(ProblemNote.problem))
            .where(ProblemNote.user_id == user_id)
            .order_by(ProblemNote.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
