from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

from sqlalchemy.orm import DeclarativeBase

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


# -------------------------------------------------------
# Declarative Base — always importable without side effects
# -------------------------------------------------------
class Base(DeclarativeBase):
    pass


# -------------------------------------------------------
# Lazy engine and session factory
# Defer actual engine creation until get_engine() is called.
# This allows tests to override the DATABASE_URL before
# any engine is created.
# -------------------------------------------------------

_engine = None
_session_factory = None


def get_engine():
    """Return the singleton async engine, creating it on first call."""
    global _engine  # noqa: PLW0603
    if _engine is None:
        from sqlalchemy.ext.asyncio import create_async_engine

        from app.config import settings

        url = settings.DATABASE_URL
        is_sqlite = url.startswith("sqlite")

        if is_sqlite:
            # SQLite (used in tests) doesn't support connection pool arguments
            _engine = create_async_engine(url, echo=settings.DEBUG)
        else:
            _engine = create_async_engine(
                url,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_timeout=settings.DB_POOL_TIMEOUT,
                pool_recycle=settings.DB_POOL_RECYCLE,
                pool_pre_ping=True,
                echo=settings.DEBUG,
            )
    return _engine


def get_session_factory():
    """Return the singleton session factory, creating it on first call."""
    global _session_factory  # noqa: PLW0603
    if _session_factory is None:
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


# -------------------------------------------------------
# Dependency: get_db
# Use as: db: AsyncSession = Depends(get_db)
# -------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency providing a database session per request.
    Automatically handles rollback on errors and closes the session.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
