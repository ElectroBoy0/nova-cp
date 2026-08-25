import logging

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.snippet import Snippet, SnippetFavorite
from app.schemas.snippet import SnippetCreate, SnippetUpdate

logger = logging.getLogger(__name__)

class SnippetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_snippets(
        self,
        user_id: str,
        search: str | None = None,
        language: str | None = None,
        category: str | None = None,
        favorites_only: bool = False,
        official_only: bool = False,
        my_snippets_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[dict], int]:

        # We need to compute if the user favorited the snippet.
        # A simple way is to join with SnippetFavorite

        stmt = select(Snippet, SnippetFavorite.id.is_not(None).label("is_favorited"))
        stmt = stmt.outerjoin(
            SnippetFavorite,
            and_(
                Snippet.id == SnippetFavorite.snippet_id,
                SnippetFavorite.user_id == user_id
            )
        )

        conditions = []

        if search:
            search_pattern = f"%{search}%"
            conditions.append(or_(
                Snippet.title.ilike(search_pattern),
                Snippet.description.ilike(search_pattern),
                Snippet.code.ilike(search_pattern)
            ))

        if language:
            conditions.append(Snippet.language == language)

        if category:
            conditions.append(Snippet.category == category)

        if official_only:
            conditions.append(Snippet.is_official.is_(True))
        elif my_snippets_only:
            conditions.append(Snippet.user_id == user_id)
        else:
            # By default, show official snippets OR user's own snippets
            conditions.append(or_(
                Snippet.is_official.is_(True),
                Snippet.user_id == user_id
            ))

        if favorites_only:
            conditions.append(SnippetFavorite.id.is_not(None))

        if conditions:
            stmt = stmt.where(and_(*conditions))

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self.db.scalar(count_stmt) or 0

        # Paginate
        stmt = stmt.order_by(Snippet.is_official.desc(), Snippet.title.asc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)

        rows = result.all()

        items = []
        for snippet, is_favorited in rows:
            # Convert to dict to match SnippetRead schema more easily
            snippet_dict = {
                "id": snippet.id,
                "user_id": snippet.user_id,
                "title": snippet.title,
                "description": snippet.description,
                "language": snippet.language,
                "category": snippet.category,
                "code": snippet.code,
                "complexity": snippet.complexity,
                "usage_notes": snippet.usage_notes,
                "is_official": snippet.is_official,
                "created_at": snippet.created_at,
                "updated_at": snippet.updated_at,
                "is_favorited": is_favorited
            }
            items.append(snippet_dict)

        return items, total

    async def get_snippet(self, user_id: str, snippet_id: str) -> dict | None:
        stmt = select(Snippet, SnippetFavorite.id.is_not(None).label("is_favorited"))
        stmt = stmt.outerjoin(
            SnippetFavorite,
            and_(
                Snippet.id == SnippetFavorite.snippet_id,
                SnippetFavorite.user_id == user_id
            )
        )
        stmt = stmt.where(
            and_(
                Snippet.id == snippet_id,
                or_(
                    Snippet.is_official.is_(True),
                    Snippet.user_id == user_id
                )
            )
        )

        result = await self.db.execute(stmt)
        row = result.first()

        if not row:
            return None

        snippet, is_favorited = row
        return {
            "id": snippet.id,
            "user_id": snippet.user_id,
            "title": snippet.title,
            "description": snippet.description,
            "language": snippet.language,
            "category": snippet.category,
            "code": snippet.code,
            "complexity": snippet.complexity,
            "usage_notes": snippet.usage_notes,
            "is_official": snippet.is_official,
            "created_at": snippet.created_at,
            "updated_at": snippet.updated_at,
            "is_favorited": is_favorited
        }

    async def create_snippet(self, user_id: str, data: SnippetCreate) -> Snippet:
        snippet = Snippet(
            user_id=user_id,
            title=data.title,
            description=data.description,
            language=data.language,
            category=data.category,
            code=data.code,
            complexity=data.complexity,
            usage_notes=data.usage_notes,
            is_official=False
        )
        self.db.add(snippet)
        await self.db.commit()
        await self.db.refresh(snippet)
        return snippet

    async def update_snippet(self, user_id: str, snippet_id: str, data: SnippetUpdate) -> Snippet | None:
        stmt = select(Snippet).where(Snippet.id == snippet_id, Snippet.user_id == user_id)
        result = await self.db.execute(stmt)
        snippet = result.scalar_one_or_none()

        if not snippet:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(snippet, key, value)

        await self.db.commit()
        await self.db.refresh(snippet)
        return snippet

    async def delete_snippet(self, user_id: str, snippet_id: str) -> bool:
        stmt = select(Snippet).where(Snippet.id == snippet_id, Snippet.user_id == user_id)
        result = await self.db.execute(stmt)
        snippet = result.scalar_one_or_none()

        if not snippet:
            return False

        await self.db.delete(snippet)
        await self.db.commit()
        return True

    async def toggle_favorite(self, user_id: str, snippet_id: str) -> bool:
        """Returns True if favorited, False if unfavorited"""
        # Ensure snippet exists and is accessible
        stmt = select(Snippet).where(
            Snippet.id == snippet_id,
            or_(
                Snippet.is_official.is_(True),
                Snippet.user_id == user_id
            )
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ValueError("Snippet not found or access denied")

        # Check if already favorited
        fav_stmt = select(SnippetFavorite).where(
            SnippetFavorite.user_id == user_id,
            SnippetFavorite.snippet_id == snippet_id
        )
        fav_result = await self.db.execute(fav_stmt)
        fav = fav_result.scalar_one_or_none()

        if fav:
            await self.db.delete(fav)
            await self.db.commit()
            return False
        else:
            new_fav = SnippetFavorite(user_id=user_id, snippet_id=snippet_id)
            self.db.add(new_fav)
            await self.db.commit()
            return True
