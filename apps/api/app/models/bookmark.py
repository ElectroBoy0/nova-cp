from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.problem import Problem
    from app.models.user import User


class Bookmark(Base, UUIDMixin, TimestampMixin):
    """
    A user's bookmark on a problem. Exists independently of collections.
    One bookmark per (user, problem) pair.
    """

    __tablename__ = "bookmarks"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    problem_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationship
    user: Mapped[User] = relationship("User")
    problem: Mapped[Problem] = relationship("Problem")
    collection_items: Mapped[list[CollectionItem]] = relationship(
        "CollectionItem",
        back_populates="bookmark",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_bookmarks_user_problem",
            "user_id",
            "problem_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return f"<Bookmark user={self.user_id!r} problem={self.problem_id!r}>"


class Collection(Base, UUIDMixin, TimestampMixin):
    """
    A user-created named collection of bookmarked problems.
    """

    __tablename__ = "collections"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    user: Mapped[User] = relationship("User")
    items: Mapped[list[CollectionItem]] = relationship(
        "CollectionItem",
        back_populates="collection",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_collections_user_name",
            "user_id",
            "name",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return f"<Collection name={self.name!r} user={self.user_id!r}>"


class CollectionItem(Base, UUIDMixin, TimestampMixin):
    """
    Join table linking bookmarks to collections (many-to-many).
    A bookmark can exist in zero, one, or multiple collections.
    """

    __tablename__ = "collection_items"

    collection_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("collections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bookmark_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("bookmarks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    collection: Mapped[Collection] = relationship(
        "Collection", back_populates="items"
    )
    bookmark: Mapped[Bookmark] = relationship(
        "Bookmark", back_populates="collection_items"
    )

    __table_args__ = (
        Index(
            "ix_collection_items_collection_bookmark",
            "collection_id",
            "bookmark_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CollectionItem collection={self.collection_id!r} "
            f"bookmark={self.bookmark_id!r}>"
        )
