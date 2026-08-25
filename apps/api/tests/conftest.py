from __future__ import annotations

import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# -------------------------------------------------------
# Set test environment variables BEFORE importing the app
# This must happen before any app module is imported.
# -------------------------------------------------------
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://:novacp_redis_dev@localhost:6379/1")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-api-key-do-not-use-in-production")
os.environ.setdefault("DEBUG", "true")

from app.database import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402, F401 — registers models with Base.metadata
    CFHandle,
    Contest,
    User,
)

# -------------------------------------------------------
# Test Database (SQLite in-memory)
# -------------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class MockAsyncRedis:
    def __init__(self):
        self._store = {}
        self.connection_pool = type("Pool", (), {"disconnect": self._noop})()

    async def _noop(self):
        pass

    async def ping(self):
        return True

    async def aclose(self):
        pass

    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value, ex=None, px=None, nx=False, xx=False):
        if nx and key in self._store:
            return None
        if xx and key not in self._store:
            return None
        self._store[key] = str(value)
        return True

    async def delete(self, *keys):
        count = 0
        for k in keys:
            if k in self._store:
                del self._store[k]
                count += 1
        return count

    async def incr(self, key: str, amount: int = 1):
        curr = int(self._store.get(key, 0))
        curr += amount
        self._store[key] = str(curr)
        return curr

    async def expire(self, key: str, time: int):
        return key in self._store


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db(monkeypatch):
    """Create all tables before each test, drop after, and mock redis if offline."""
    from app.redis import redis_client
    mock_redis = MockAsyncRedis()
    monkeypatch.setattr(redis_client, "get", mock_redis.get)
    monkeypatch.setattr(redis_client, "set", mock_redis.set)
    monkeypatch.setattr(redis_client, "delete", mock_redis.delete)
    monkeypatch.setattr(redis_client, "incr", mock_redis.incr)
    monkeypatch.setattr(redis_client, "expire", mock_redis.expire)
    monkeypatch.setattr(redis_client, "ping", mock_redis.ping)
    monkeypatch.setattr(redis_client, "aclose", mock_redis.aclose)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Provide a test database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """
    Provide an HTTPX async test client for the FastAPI app.

    Overrides get_db so that route handlers use the same in-memory
    SQLite engine that setup_test_db already created tables in.
    Without this override, each sqlite:///:memory: URL is a separate
    database and the app would see empty/missing tables.
    """
    from app.database import get_db

    async def _override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
def internal_headers() -> dict[str, str]:
    """Headers that pass the internal API key check."""
    return {"X-Internal-API-Key": "test-internal-api-key-do-not-use-in-production"}
