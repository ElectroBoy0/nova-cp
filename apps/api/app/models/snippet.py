from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class Snippet(Base, UUIDMixin, TimestampMixin):
    """
    A competitive programming snippet or template.
    If user_id is null, it's an official global snippet.
    If user_id is set, it's a private user-created snippet.
    """

    __tablename__ = "snippets"

    user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    complexity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    usage_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_official: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    user: Mapped[User | None] = relationship("User")
    favorites: Mapped[list[SnippetFavorite]] = relationship(
        "SnippetFavorite",
        back_populates="snippet",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Snippet title={self.title!r} language={self.language!r}>"


class SnippetFavorite(Base, UUIDMixin, TimestampMixin):
    """
    Join table linking users to their favorite snippets.
    """

    __tablename__ = "snippet_favorites"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snippet_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("snippets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships
    user: Mapped[User] = relationship("User")
    snippet: Mapped[Snippet] = relationship("Snippet", back_populates="favorites")

    __table_args__ = (
        Index(
            "ix_snippet_favorites_user_snippet",
            "user_id",
            "snippet_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return f"<SnippetFavorite user={self.user_id!r} snippet={self.snippet_id!r}>"
