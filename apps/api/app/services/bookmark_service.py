import logging
import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bookmark import Bookmark, Collection, CollectionItem
from app.models.problem import Problem

logger = logging.getLogger(__name__)

class BookmarkService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ==========================
    # Collections
    # ==========================

    async def create_collection(self, user_id: str, name: str, description: str | None = None) -> Collection:
        # Get max position
        max_pos_stmt = select(func.max(Collection.position)).where(Collection.user_id == user_id)
        max_pos_result = await self.db.execute(max_pos_stmt)
        max_pos = max_pos_result.scalar() or 0

        collection = Collection(
            user_id=user_id,
            name=name,
            description=description,
            position=max_pos + 1
        )
        self.db.add(collection)
        await self.db.commit()
        await self.db.refresh(collection)
        return collection

    async def get_collections(self, user_id: str):
        stmt = select(Collection).where(Collection.user_id == user_id).order_by(Collection.position)
        result = await self.db.execute(stmt)
        collections = list(result.scalars().all())

        # Get counts
        counts_stmt = (
            select(CollectionItem.collection_id, func.count(CollectionItem.bookmark_id))
            .join(Collection)
            .where(Collection.user_id == user_id)
            .group_by(CollectionItem.collection_id)
        )
        counts_result = await self.db.execute(counts_stmt)
        counts_map = {row[0]: row[1] for row in counts_result.all()}

        # Format output
        output = []
        for c in collections:
            output.append({
                "id": c.id,
                "user_id": c.user_id,
                "name": c.name,
                "description": c.description,
                "position": c.position,
                "problem_count": counts_map.get(c.id, 0),
                "created_at": c.created_at,
                "updated_at": c.updated_at
            })
        return output

    async def update_collection(self, user_id: str, collection_id: str, name: str | None, description: str | None) -> Collection | None:
        stmt = select(Collection).where(Collection.id == collection_id, Collection.user_id == user_id)
        result = await self.db.execute(stmt)
        collection = result.scalar_one_or_none()
        if not collection:
            return None

        if name is not None:
            collection.name = name
        if description is not None:
            collection.description = description

        await self.db.commit()
        await self.db.refresh(collection)
        return collection

    async def delete_collection(self, user_id: str, collection_id: str) -> bool:
        stmt = select(Collection).where(Collection.id == collection_id, Collection.user_id == user_id)
        result = await self.db.execute(stmt)
        collection = result.scalar_one_or_none()
        if not collection:
            return False

        # Will cascade delete collection_items, but leaves bookmarks alone (which is what we want)
        await self.db.delete(collection)
        await self.db.commit()
        return True

    # ==========================
    # Bookmarks
    # ==========================

    async def add_bookmark(self, user_id: str, problem_id: str, collection_id: str | None = None, note: str | None = None) -> Bookmark | None:
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

        # Use the correct UUID
        problem_id = problem.id

        # Check if bookmark exists
        bm_stmt = select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.problem_id == problem_id)
        bm_result = await self.db.execute(bm_stmt)
        bookmark = bm_result.scalar_one_or_none()

        if not bookmark:
            # Create bookmark
            bookmark = Bookmark(user_id=user_id, problem_id=problem_id)
            self.db.add(bookmark)
            await self.db.flush() # Get ID

        # Link to collection if provided
        if collection_id:
            # Check if collection exists and belongs to user
            coll_stmt = select(Collection).where(Collection.id == collection_id, Collection.user_id == user_id)
            coll_result = await self.db.execute(coll_stmt)
            if coll_result.scalar_one_or_none():
                # Check if link exists
                link_stmt = select(CollectionItem).where(
                    CollectionItem.collection_id == collection_id,
                    CollectionItem.bookmark_id == bookmark.id
                )
                link_result = await self.db.execute(link_stmt)
                if not link_result.scalar_one_or_none():
                    max_pos_stmt = select(func.max(CollectionItem.position)).where(CollectionItem.collection_id == collection_id)
                    max_pos_res = await self.db.execute(max_pos_stmt)
                    max_pos = max_pos_res.scalar() or 0

                    link = CollectionItem(
                        collection_id=collection_id,
                        bookmark_id=bookmark.id,
                        position=max_pos + 1
                    )
                    self.db.add(link)

        # If a note was provided, we'd actually use the NoteService, or add it to bookmark if we had note on Bookmark.
        # Wait, Bookmark model doesn't have note. We created ProblemNote model.
        # This parameter 'note' might need to be handled via NoteService separately.

        await self.db.commit()

        # Reload with problem
        reload_stmt = select(Bookmark).options(selectinload(Bookmark.problem)).where(Bookmark.id == bookmark.id)
        reload_result = await self.db.execute(reload_stmt)
        return reload_result.scalar_one()

    async def get_bookmarks(self, user_id: str, collection_id: str | None = None, limit: int = 50, offset: int = 0):
        query = select(Bookmark).options(selectinload(Bookmark.problem)).where(Bookmark.user_id == user_id)

        if collection_id:
            query = query.join(CollectionItem).where(CollectionItem.collection_id == collection_id)

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one_or_none() or 0

        # Sort by creation time desc
        query = query.order_by(Bookmark.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        bookmarks = list(result.scalars().all())

        # We also need to fetch ProblemNotes if we want them bundled,
        # or just return bookmarks and let the client fetch notes separately.
        # Let's keep it simple for now.

        return bookmarks, total

    async def remove_bookmark(self, user_id: str, bookmark_id: str) -> bool:
        stmt = select(Bookmark).where(Bookmark.id == bookmark_id, Bookmark.user_id == user_id)
        result = await self.db.execute(stmt)
        bookmark = result.scalar_one_or_none()
        if not bookmark:
            return False

        await self.db.delete(bookmark)
        await self.db.commit()
        return True

    async def move_bookmark(self, user_id: str, bookmark_id: str, collection_id: str | None) -> bool:
        # First verify bookmark belongs to user
        bm_stmt = select(Bookmark).where(Bookmark.id == bookmark_id, Bookmark.user_id == user_id)
        bm_result = await self.db.execute(bm_stmt)
        bookmark = bm_result.scalar_one_or_none()
        if not bookmark:
            return False

        # For this simple "move" logic:
        # We will clear all collection links for this bookmark, and add it to the new collection.
        del_stmt = delete(CollectionItem).where(CollectionItem.bookmark_id == bookmark_id)
        await self.db.execute(del_stmt)

        if collection_id:
            # Add to new collection
            max_pos_stmt = select(func.max(CollectionItem.position)).where(CollectionItem.collection_id == collection_id)
            max_pos_res = await self.db.execute(max_pos_stmt)
            max_pos = max_pos_res.scalar() or 0

            link = CollectionItem(
                collection_id=collection_id,
                bookmark_id=bookmark_id,
                position=max_pos + 1
            )
            self.db.add(link)

        await self.db.commit()
        return True
