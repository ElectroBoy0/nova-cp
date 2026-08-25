from __future__ import annotations

import redis.asyncio as redis

from app.config import settings

# -------------------------------------------------------
# Redis Client
# Single connection pool shared across the application.
# Uses hiredis parser for better performance.
# -------------------------------------------------------
redis_client: redis.Redis = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    max_connections=settings.REDIS_MAX_CONNECTIONS,
)


# -------------------------------------------------------
# Cache key helpers
# Centralizing key patterns prevents typos and makes
# cache invalidation easier to reason about.
# -------------------------------------------------------


class CacheKey:
    """Namespace for all Redis cache key patterns."""

    # Contest list — refreshed every 30 minutes from CF/CC/AC APIs
    CONTESTS_ALL = "contests:all"
    CONTESTS_BY_PLATFORM = "contests:{platform}"

    # User CF sync status — short TTL, just for polling during sync
    CF_SYNC_STATUS = "sync:cf:{user_id}"
    CF_SYNC_STATUS_TTL = 300  # 5 minutes

    # User profile cache — invalidated on sync completion
    USER_PROFILE = "user:profile:{user_id}"
    USER_PROFILE_TTL = 600  # 10 minutes

    # AI Hint cache — very long TTL as hints don't change
    PROBLEM_HINT = "hint:{problem_id}:{level}"

    # User practice activity heatmap
    USER_ACTIVITY = "user:activity:{user_id}"
    USER_ACTIVITY_TTL = 600  # 10 minutes

    # User comparison dashboard
    COMPARE = "compare:{user_id}:{rival_handle}"
    COMPARE_TTL = 21600  # 6 hours

    @staticmethod
    def contests_platform(platform: str) -> str:
        return f"contests:{platform}"

    @staticmethod
    def sync_status(user_id: str) -> str:
        return f"sync:cf:{user_id}"

    @staticmethod
    def user_profile(user_id: str) -> str:
        return f"user:profile:{user_id}"

    @staticmethod
    def problem_hint(problem_id: str, level: int) -> str:
        return f"hint:{problem_id}:{level}"

    @staticmethod
    def user_activity(user_id: str) -> str:
        return f"user:activity:{user_id}"

    @staticmethod
    def compare(user_id: str, rival_handle: str) -> str:
        return f"compare:{user_id}:{rival_handle}"
