import hashlib
import re

import pytest

from app.models.user import CFHandle, User
from app.redis import redis_client
from app.services.codeforces_service import CodeforcesService
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_token_format_and_crypto(db_session, monkeypatch):
    """Test that generated token matches novacp-verify-<12-hex-chars>."""
    user = User(email="format_test@novacp.test", provider="github", provider_account_id="f1")
    db_session.add(user)
    await db_session.flush()

    async def mock_fetch_user_info(self, handle):
        return {"handle": "tourist", "firstName": "original", "rating": 3800}

    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_user_info)

    redis_storage = {}
    async def mock_redis_set(key, val, **kwargs):
        redis_storage[key] = val
        return True
    async def mock_redis_delete(key):
        redis_storage.pop(key, None)
        return 1
    async def mock_redis_incr(key):
        redis_storage[key] = redis_storage.get(key, 0) + 1
        return redis_storage[key]
    async def mock_redis_expire(key, sec):
        return True

    monkeypatch.setattr(redis_client, "set", mock_redis_set)
    monkeypatch.setattr(redis_client, "delete", mock_redis_delete)
    monkeypatch.setattr(redis_client, "incr", mock_redis_incr)
    monkeypatch.setattr(redis_client, "expire", mock_redis_expire)

    service = UserService(db_session)
    token = await service.generate_cf_verification_token(user.id, "tourist")

    # Format: novacp-verify- followed by 12 hex characters
    assert re.match(r"^novacp-verify-[0-9a-f]{12}$", token), f"Token {token} does not match expected format"
    assert len(token) == 26

    # Verify SHA-256 hash was stored in Redis, NOT the plaintext token
    cache_key = f"cf_verify:{user.id}:tourist"
    stored_hash = redis_storage.get(cache_key)
    assert stored_hash is not None
    assert stored_hash == hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert stored_hash != token


@pytest.mark.asyncio
async def test_link_cf_handle_success_and_immediate_invalidation(db_session, monkeypatch):
    """Test successful verification, linking, and immediate token deletion."""
    user = User(email="success_test@novacp.test", provider="github", provider_account_id="s1")
    db_session.add(user)
    await db_session.flush()

    redis_storage = {}
    async def mock_redis_set(key, val, **kwargs):
        redis_storage[key] = val
        return True
    async def mock_redis_get(key):
        return redis_storage.get(key)
    async def mock_redis_delete(key):
        redis_storage.pop(key, None)
        return 1
    async def mock_redis_incr(key):
        redis_storage[key] = int(redis_storage.get(key, 0)) + 1
        return redis_storage[key]
    async def mock_redis_expire(key, sec):
        return True

    monkeypatch.setattr(redis_client, "set", mock_redis_set)
    monkeypatch.setattr(redis_client, "get", mock_redis_get)
    monkeypatch.setattr(redis_client, "delete", mock_redis_delete)
    monkeypatch.setattr(redis_client, "incr", mock_redis_incr)
    monkeypatch.setattr(redis_client, "expire", mock_redis_expire)

    async def mock_fetch_user_info_gen(self, handle):
        return {"handle": "tourist", "firstName": "original", "rating": 3800, "rank": "legendary grandmaster"}

    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_user_info_gen)

    service = UserService(db_session)
    token = await service.generate_cf_verification_token(user.id, "tourist")

    # Simulate user changing First Name on Codeforces to the exact token
    async def mock_fetch_user_info_verify(self, handle):
        return {"handle": "tourist", "firstName": token, "rating": 3800, "rank": "legendary grandmaster"}

    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_user_info_verify)

    linked_user = await service.link_cf_handle(user.id, "tourist")
    assert linked_user.cf_handle is not None
    assert linked_user.cf_handle.handle == "tourist"
    assert linked_user.onboarding_completed is True

    # Token must be deleted from Redis immediately (single-use)
    cache_key = f"cf_verify:{user.id}:tourist"
    assert cache_key not in redis_storage


@pytest.mark.asyncio
async def test_link_cf_handle_wrong_name_and_lockout(db_session, monkeypatch):
    """Test that failed attempts increment and lockout occurs after 5 failures."""
    user = User(email="lockout_test@novacp.test", provider="github", provider_account_id="l1")
    db_session.add(user)
    await db_session.flush()

    redis_storage = {}
    async def mock_redis_set(key, val, **kwargs):
        redis_storage[key] = val
        return True
    async def mock_redis_get(key):
        return redis_storage.get(key)
    async def mock_redis_delete(key):
        redis_storage.pop(key, None)
        return 1
    async def mock_redis_incr(key):
        redis_storage[key] = int(redis_storage.get(key, 0)) + 1
        return redis_storage[key]
    async def mock_redis_expire(key, sec):
        return True

    monkeypatch.setattr(redis_client, "set", mock_redis_set)
    monkeypatch.setattr(redis_client, "get", mock_redis_get)
    monkeypatch.setattr(redis_client, "delete", mock_redis_delete)
    monkeypatch.setattr(redis_client, "incr", mock_redis_incr)
    monkeypatch.setattr(redis_client, "expire", mock_redis_expire)

    async def mock_fetch_user_info_gen(self, handle):
        return {"handle": "tourist", "firstName": "original", "rating": 3800}

    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_user_info_gen)

    service = UserService(db_session)
    await service.generate_cf_verification_token(user.id, "tourist")

    # Codeforces profile returns wrong First Name
    async def mock_fetch_user_info_wrong(self, handle):
        return {"handle": "tourist", "firstName": "wrong_name", "rating": 3800}

    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_user_info_wrong)

    # 4 failed attempts
    for _ in range(1, 5):
        with pytest.raises(ValueError, match="Verification failed"):
            await service.link_cf_handle(user.id, "tourist")

    # 5th failed attempt should invalidate the token
    with pytest.raises(ValueError, match="Maximum attempts reached|Too many failed verification attempts"):
        await service.link_cf_handle(user.id, "tourist")

    # Subsequent attempt should report expired/invalid token
    with pytest.raises(ValueError, match="invalidated|expired or is invalid"):
        await service.link_cf_handle(user.id, "tourist")


@pytest.mark.asyncio
async def test_handle_conflict_prevention(db_session, monkeypatch):
    """Test that attempting to link a handle already owned by another user fails."""
    user1 = User(email="owner@novacp.test", provider="github", provider_account_id="o1")
    user2 = User(email="attacker@novacp.test", provider="github", provider_account_id="a1")
    db_session.add_all([user1, user2])
    await db_session.flush()

    # User 1 has already linked 'tourist'
    cf_handle1 = CFHandle(user_id=user1.id, handle="tourist", sync_status="completed")
    db_session.add(cf_handle1)
    await db_session.flush()

    service = UserService(db_session)

    # User 2 tries to generate verification token for 'tourist'
    with pytest.raises(ValueError, match="already linked to another NovaCP account"):
        await service.generate_cf_verification_token(user2.id, "tourist")

    # User 2 tries to link 'tourist' directly
    with pytest.raises(ValueError, match="already linked to another NovaCP account"):
        await service.link_cf_handle(user2.id, "tourist")


@pytest.mark.asyncio
async def test_cf_api_downtime_error(db_session, monkeypatch):
    """Test graceful error handling when Codeforces API returns None or fails."""
    user = User(email="downtime@novacp.test", provider="github", provider_account_id="d1")
    db_session.add(user)
    await db_session.flush()

    async def mock_fetch_user_info_fail(self, handle):
        return None

    monkeypatch.setattr(CodeforcesService, "fetch_user_info", mock_fetch_user_info_fail)

    service = UserService(db_session)
    with pytest.raises(ValueError, match="not found or Codeforces API is currently unavailable"):
        await service.generate_cf_verification_token(user.id, "tourist")
