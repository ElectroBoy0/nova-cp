import asyncio
import logging
import time

from app.redis import redis_client

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Global rate limiter using Redis to prevent exceeding provider API limits
    across multiple Uvicorn workers.
    """

    @staticmethod
    async def wait_for_token(provider: str, req_per_second: float = 1.0, timeout: float = 30.0) -> None:
        """
        Wait until it's safe to make a request to the provider.
        Uses a simple Redis-based throttle: we set a key with expiration
        equal to the required interval between requests.
        """
        interval_ms = int((1.0 / req_per_second) * 1000)
        lock_key = f"rate_limit:{provider}"

        start_time = time.time()

        while True:
            if time.time() - start_time > timeout:
                raise TimeoutError(f"Timeout waiting for rate limit token for {provider}")

            # Try to set the key. If successful, we got the token!
            acquired = await redis_client.set(lock_key, "1", nx=True, px=interval_ms)
            if acquired:
                return

            # If not acquired, sleep and try again.
            # Add a tiny bit of jitter to avoid thundering herd
            import random
            sleep_time = (interval_ms / 1000.0) * random.uniform(0.5, 1.0)
            await asyncio.sleep(sleep_time)
