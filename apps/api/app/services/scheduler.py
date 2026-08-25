import asyncio
import logging
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.database import get_session_factory
from app.models.user import CFHandle
from app.redis import redis_client

logger = logging.getLogger(__name__)


class TaskScheduler:
    """
    Robust background task scheduler for FastAPI that runs on every Uvicorn worker,
    but uses Redis distributed locks to ensure each scheduled job is only executed
    by a single worker at a time.
    """

    def __init__(self) -> None:
        self.tasks: list[asyncio.Task[Any]] = []
        self._is_running = False

    async def _run_job_with_lock(
        self,
        job_name: str,
        interval_seconds: int,
        job_func: Callable[[], Coroutine[Any, Any, None]],
    ) -> None:
        """
        Periodically runs a job. Uses Redis lock with TTL so if the worker crashes
        while holding the lock, it will automatically expire and another worker can pick it up.
        """
        lock_key = f"scheduler:lock:{job_name}"

        while self._is_running:
            try:
                # Attempt to acquire the lock.
                # TTL is slightly less than the interval to ensure it expires before the next run.
                lock_ttl = max(int(interval_seconds * 0.9 * 1000), 1000)

                acquired = await redis_client.set(lock_key, "locked", nx=True, px=lock_ttl)

                if acquired:
                    logger.info(f"Worker acquired lock for {job_name}, executing...")
                    try:
                        await job_func()
                        logger.info(f"Job {job_name} completed successfully.")
                    except Exception as e:
                        logger.exception(f"Job {job_name} failed: {e}")
                else:
                    logger.debug(f"Job {job_name} is locked by another worker. Skipping this cycle.")

            except asyncio.CancelledError:
                logger.info(f"Job runner for {job_name} was cancelled.")
                break
            except Exception as e:
                logger.exception(f"Unexpected error in scheduler loop for {job_name}: {e}")

            # Sleep until next interval
            try:
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                break


    # --- Specific Jobs ---

    async def _sync_contests(self) -> None:
        from app.services.contest_service import ContestService
        from app.services.problem_service import ProblemService

        factory = get_session_factory()
        async with factory() as db:
            contest_service = ContestService(db)
            await contest_service.sync_all()

            problem_service = ProblemService(db)
            await problem_service.sync_all_problems()

    async def _sync_active_users(self) -> None:
        from app.services.sync_service import SyncService

        factory = get_session_factory()
        async with factory() as db:
            # Sync users whose last_synced_at is older than 60 minutes
            threshold = datetime.now(UTC) - timedelta(minutes=60)

            # Note: In a real large-scale production app, we would paginate this
            # or use a queue, but since this is an early version, we can fetch
            # a limited batch of users who need syncing.
            stmt = select(CFHandle).where(
                (CFHandle.last_synced_at < threshold) | (CFHandle.last_synced_at.is_(None))
            ).limit(50)

            result = await db.execute(stmt)
            handles = result.scalars().all()

            if not handles:
                logger.info("No active users need syncing right now.")
                return

            sync_service = SyncService(db)
            for handle in handles:
                try:
                    await sync_service.run_full_sync(handle.user_id, handle.handle)
                except Exception as e:
                    logger.error(f"Failed to background sync user {handle.user_id}: {e}")

    # --- Lifecycle ---

    def start(self) -> None:
        if self._is_running:
            return

        self._is_running = True
        logger.info("Starting TaskScheduler...")

        # Schedule jobs
        # 12 hours = 43200 seconds for contests
        self.tasks.append(
            asyncio.create_task(self._run_job_with_lock("sync_contests", 43200, self._sync_contests))
        )

        # 30 minutes = 1800 seconds for user submissions
        self.tasks.append(
            asyncio.create_task(self._run_job_with_lock("sync_active_users", 1800, self._sync_active_users))
        )

    async def stop(self) -> None:
        self._is_running = False
        logger.info("Stopping TaskScheduler...")

        for task in self.tasks:
            task.cancel()

        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)

        self.tasks.clear()
        logger.info("TaskScheduler stopped.")
