import logging
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission
from app.models.user import CFHandle
from app.services.analytics_service import AnalyticsService
from app.services.codeforces_service import CodeforcesService
from app.services.upsolve_service import UpsolveService

logger = logging.getLogger(__name__)


class SyncService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def run_full_sync(self, user_id: str, handle: str) -> None:
        """
        Runs the full synchronization pipeline for a user:
        1. Fetch raw submissions from Codeforces.
        2. Upsert submissions to the database.
        3. Generate analytics.
        4. Update CFHandle sync status.
        """
        logger.info("Starting full sync for user %s (handle: %s)", user_id, handle)

        # Mark as syncing
        await self._update_sync_status(user_id, "syncing")

        try:
            rated_contest_count = 0
            async with CodeforcesService() as cf_service:
                submissions_data = await cf_service.fetch_user_submissions(handle)

                if submissions_data:
                    await self._upsert_submissions(user_id, submissions_data)

                # Fetch rating history to get accurate rated contest count
                extracted_rating_history = []
                try:
                    rating_history = await cf_service.fetch_rating_history(handle)
                    rated_contest_count = len(rating_history)
                    extracted_rating_history = [
                        {
                            "contest_id": r.get("contestId"),
                            "contest_name": r.get("contestName"),
                            "old_rating": r.get("oldRating"),
                            "new_rating": r.get("newRating"),
                            "rank": r.get("rank"),
                            "time": r.get("ratingUpdateTimeSeconds"),
                        }
                        for r in rating_history if "newRating" in r
                    ]
                except Exception as e:
                    logger.warning("Failed to fetch rating history for %s: %s", handle, e)

            analytics_service = AnalyticsService(self.db)
            await analytics_service.generate_analytics(user_id, rated_contest_count=rated_contest_count)

            upsolve_service = UpsolveService(self.db)
            await upsolve_service.generate_upsolve_queue(user_id)
            await upsolve_service.refresh_solved_status(user_id)

            await self._update_sync_status(user_id, "completed", rating_history=extracted_rating_history if extracted_rating_history else None)
            logger.info("Successfully completed full sync for user %s", user_id)

            from app.redis import CacheKey, redis_client
            await redis_client.delete(
                CacheKey.user_profile(user_id),
                CacheKey.user_activity(user_id),
            )

            from app.services.notification_service import NotificationService
            notif_service = NotificationService(self.db)
            await notif_service.create_notification(
                user_id=user_id,
                type="sync_status",
                title="Codeforces Sync Complete",
                message=f"Submissions and rating history for '{handle}' have been updated.",
                link="/dashboard",
            )

        except Exception as e:
            logger.exception("Full sync failed for user %s", user_id)
            await self._update_sync_status(user_id, "failed", error=str(e))
            try:
                from app.services.notification_service import NotificationService
                notif_service = NotificationService(self.db)
                await notif_service.create_notification(
                    user_id=user_id,
                    type="sync_status",
                    title="Codeforces Sync Failed",
                    message=f"Could not sync with handle '{handle}'.",
                    link="/settings",
                )
            except Exception:
                pass

    async def _update_sync_status(self, user_id: str, status: str, error: str | None = None, rating_history: list | None = None) -> None:
        values = {
            "sync_status": status,
            "last_synced_at": datetime.now(UTC),
            "sync_error": error,
        }
        if rating_history is not None:
            values["rating_history"] = rating_history

        stmt = (
            update(CFHandle)
            .where(CFHandle.user_id == user_id)
            .values(**values)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def _upsert_submissions(self, user_id: str, raw_submissions: list[dict]) -> None:
        import uuid

        from app.config import settings

        is_sqlite = settings.DATABASE_URL.startswith("sqlite")

        rows = []
        now = datetime.now(UTC)

        # Delete stale submissions not present in the fetched list
        from sqlalchemy import delete
        fetched_cf_submission_ids = [raw["id"] for raw in raw_submissions if "id" in raw]
        if fetched_cf_submission_ids:
            # Delete any submission for this user that isn't in the newly fetched IDs.
            delete_stmt = delete(Submission).where(
                Submission.user_id == user_id,
                Submission.cf_submission_id.notin_(fetched_cf_submission_ids)
            )
            await self.db.execute(delete_stmt)
            await self.db.commit()
        else:
            # If they have 0 submissions, wipe all submissions for this user
            delete_stmt = delete(Submission).where(Submission.user_id == user_id)
            await self.db.execute(delete_stmt)
            await self.db.commit()

        for raw in raw_submissions:
            try:
                problem = raw.get("problem", {})

                creation_unix = raw.get("creationTimeSeconds", 0)
                creation_time = datetime.fromtimestamp(creation_unix, tz=UTC)

                rows.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "cf_submission_id": raw["id"],
                    "contest_id": raw.get("contestId"),
                    "problem_index": problem.get("index", "?"),
                    "problem_name": problem.get("name", "Unknown Problem"),
                    "problem_rating": problem.get("rating"),
                    "tags": problem.get("tags", []),
                    "verdict": raw.get("verdict", "UNKNOWN"),
                    "passed_test_count": raw.get("passedTestCount", 0),
                    "time_consumed_millis": raw.get("timeConsumedMillis", 0),
                    "memory_consumed_bytes": raw.get("memoryConsumedBytes", 0),
                    "creation_time": creation_time,
                    "created_at": now,
                    "updated_at": now,
                })
            except Exception as e:
                logger.warning("Skipping malformed submission %s: %s", raw.get("id"), e)

        if not rows:
            return

        # Upsert in chunks to avoid blowing up memory or query length limits
        chunk_size = 1000
        for i in range(0, len(rows), chunk_size):
            chunk = rows[i:i + chunk_size]

            if is_sqlite:
                stmt = sqlite_insert(Submission).values(chunk)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["cf_submission_id"],
                    set_={
                        "verdict": stmt.excluded.verdict,
                        "passed_test_count": stmt.excluded.passed_test_count,
                        "time_consumed_millis": stmt.excluded.time_consumed_millis,
                        "memory_consumed_bytes": stmt.excluded.memory_consumed_bytes,
                        "updated_at": now,
                    },
                )
            else:
                stmt = pg_insert(Submission).values(chunk)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["cf_submission_id"],
                    set_={
                        "verdict": stmt.excluded.verdict,
                        "passed_test_count": stmt.excluded.passed_test_count,
                        "time_consumed_millis": stmt.excluded.time_consumed_millis,
                        "memory_consumed_bytes": stmt.excluded.memory_consumed_bytes,
                        "updated_at": now,
                    },
                )
            await self.db.execute(stmt)

        await self.db.commit()
        logger.info("Upserted %d submissions for user %s", len(rows), user_id)
