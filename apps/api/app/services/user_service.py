import hashlib
import hmac
import logging
import secrets

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import CFHandle, User
from app.schemas.user import AuthPayload

logger = logging.getLogger(__name__)


class UserService:
    """
    Business logic for user management.

    Separating service logic from route handlers makes it easier to:
    - Test business logic independently of HTTP concerns
    - Reuse logic across multiple routes or background jobs
    - Swap implementations (e.g., for different auth providers)
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: str) -> User | None:
        """Fetch a user by their internal UUID, eagerly loading their CF handle."""
        result = await self.db.execute(
            select(User).options(selectinload(User.cf_handle)).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email."""
        result = await self.db.execute(
            select(User).options(selectinload(User.cf_handle)).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_provider(self, provider: str, provider_account_id: str) -> User | None:
        """
        Fetch a user by OAuth provider + account ID.
        This is the primary key for deduplication across auth sessions.
        """
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.cf_handle))
            .where(
                User.provider == provider,
                User.provider_account_id == provider_account_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert_from_auth(self, payload: AuthPayload) -> User:
        """
        Create or update a user from an Auth.js session payload.

        Lookup order:
        1. By provider + provider_account_id (most specific)
        2. By email (handles edge case of same email, different provider)

        On first sign-in: creates the record.
        On subsequent sign-ins: updates name/image (they may have changed on GitHub/Google).
        """
        # Try to find by provider first (most reliable)
        user = await self.get_by_provider(payload.provider, payload.user_id)

        if user is None:
            # Try by email as fallback
            user = await self.get_by_email(payload.email)

        if user is None:
            # First sign-in — create the user
            user = User(
                email=payload.email,
                name=payload.name,
                image=payload.image,
                provider=payload.provider,
                provider_account_id=payload.user_id,
                timezone=payload.timezone,
            )
            self.db.add(user)
        else:
            # Returning user — update profile fields that may have changed
            if payload.name:
                user.name = payload.name
            # Preserve custom avatar image if set
            if payload.image and not user.image:
                user.image = payload.image
            elif payload.image and not (user.image and user.image.startswith("data:")):
                user.image = payload.image
            if payload.timezone:
                user.timezone = payload.timezone

        await self.db.flush()
        await self.db.refresh(user, attribute_names=["cf_handle"])
        return user

    async def generate_cf_verification_token(self, user_id: str, handle: str) -> str:
        """
        Generate a cryptographically secure verification token for a Codeforces handle,
        save its SHA-256 hash in Redis, and return the token.
        """
        from app.redis import redis_client
        from app.services.codeforces_service import CodeforcesService

        clean_handle = handle.strip()

        # 1. Prevent claiming a handle already linked to another user
        conflict_stmt = select(CFHandle).where(
            func.lower(CFHandle.handle) == clean_handle.lower(),
            CFHandle.user_id != user_id,
        )
        conflict_res = await self.db.execute(conflict_stmt)
        if conflict_res.scalar_one_or_none():
            raise ValueError(f"Codeforces handle '{clean_handle}' is already linked to another NovaCP account.")

        # 2. Rate limit token generation per user (max 5 tokens per 5 mins)
        gen_limit_key = f"cf_verify_gen_limit:{user_id}"
        gen_count = await redis_client.incr(gen_limit_key)
        if gen_count == 1:
            await redis_client.expire(gen_limit_key, 300)
        elif gen_count > 5:
            raise ValueError("Too many token generation attempts. Please wait a few minutes before trying again.")

        # 3. Verify handle exists on Codeforces
        async with CodeforcesService() as cf:
            info = await cf.fetch_user_info(clean_handle, force_refresh=True)
            if not info:
                raise ValueError(f"Codeforces handle '{clean_handle}' not found or Codeforces API is currently unavailable.")

        # 4. Generate cryptographically random token: novacp-verify-<12-hex-chars>
        token = f"novacp-verify-{secrets.token_hex(6)}"
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        cache_key = f"cf_verify:{user_id}:{clean_handle.lower()}"
        attempts_key = f"cf_verify_attempts:{user_id}:{clean_handle.lower()}"

        # 5. Store hashed token with 15-minute expiration (900 seconds)
        await redis_client.set(cache_key, token_hash, ex=900)
        # Reset attempt counter
        await redis_client.delete(attempts_key)

        return token

    async def link_cf_handle(self, user_id: str, handle: str) -> User:
        """
        Link or update a Codeforces handle for a user by verifying ownership.
        Fetches the user profile synchronously for an instant 'Aha Moment'.
        """
        user = await self.get_by_id(user_id)
        if user is None:
            msg = f"User {user_id!r} not found"
            raise ValueError(msg)

        import datetime
        import re

        from app.redis import redis_client
        from app.services.codeforces_service import CodeforcesService

        clean_handle = handle.strip()

        # 1. Conflict check
        conflict_stmt = select(CFHandle).where(
            func.lower(CFHandle.handle) == clean_handle.lower(),
            CFHandle.user_id != user_id,
        )
        conflict_res = await self.db.execute(conflict_stmt)
        if conflict_res.scalar_one_or_none():
            raise ValueError(f"Codeforces handle '{clean_handle}' is already linked to another NovaCP account.")

        cache_key = f"cf_verify:{user_id}:{clean_handle.lower()}"
        attempts_key = f"cf_verify_attempts:{user_id}:{clean_handle.lower()}"

        # 2. Check failed attempts / brute-force lockout
        attempts_str = await redis_client.get(attempts_key)
        attempts = int(attempts_str) if attempts_str else 0
        if attempts >= 5:
            await redis_client.delete(cache_key)
            raise ValueError(
                "Too many failed verification attempts. This verification token has been invalidated. "
                "Please generate a new token."
            )

        # 3. Retrieve expected hashed token
        expected_token_hash = await redis_client.get(cache_key)
        if not expected_token_hash:
            raise ValueError(
                "Verification token has expired or is invalid. "
                "Please request a new verification token."
            )

        # 4. Fetch Codeforces profile (force_refresh=True ensures fresh fetch from Codeforces)
        async with CodeforcesService() as cf:
            info = await cf.fetch_user_info(clean_handle, force_refresh=True)

        if not info:
            raise ValueError(f"Codeforces API is currently unavailable or handle '{clean_handle}' was not found. Please try again shortly.")

        first_name = (info.get("firstName") or "").strip()
        last_name = (info.get("lastName") or "").strip()
        full_name = f"{first_name} {last_name}".strip()
        org = (info.get("organization") or "").strip()

        # Extract any token patterns from names or organization fields
        tokens_found = re.findall(r"novacp-verify-[a-f0-9]+", f"{first_name} {last_name} {org}", re.IGNORECASE)

        raw_candidates = [
            first_name,
            first_name.lower(),
            last_name,
            last_name.lower(),
            full_name,
            full_name.lower(),
            *first_name.split(),
            *last_name.split(),
            *tokens_found,
            *[t.lower() for t in tokens_found],
        ]
        candidate_hashes = [hashlib.sha256(c.strip().encode("utf-8")).hexdigest() for c in raw_candidates if c.strip()]

        # 5. Constant-time hash comparison
        is_verified = any(hmac.compare_digest(ch, expected_token_hash) for ch in candidate_hashes)
        logger.info(
            "CF handle verification for %s: firstName=%r, lastName=%r, verified=%s",
            clean_handle,
            first_name,
            last_name,
            is_verified,
        )

        if not is_verified:
            new_attempts = await redis_client.incr(attempts_key)
            await redis_client.expire(attempts_key, 900)
            remaining = 5 - new_attempts
            if remaining <= 0:
                await redis_client.delete(cache_key)
                raise ValueError(
                    "Verification failed. Maximum attempts reached. Your token has been invalidated. "
                    "Please generate a new token."
                )
            raise ValueError(
                f"Verification failed. Your Codeforces First Name does not match the token. "
                f"Please ensure you saved the changes on Codeforces ({remaining} attempt{'s' if remaining > 1 else ''} remaining)."
            )

        # 6. Single-use: immediately delete token and attempts upon success
        await redis_client.delete(cache_key)
        await redis_client.delete(attempts_key)

        logger.info("Successfully verified and linked Codeforces handle for user %s", user_id)

        now = datetime.datetime.now(datetime.UTC)
        rating = info.get("rating")
        max_rating = info.get("maxRating")

        # Transform Codeforces ranks (e.g. "candidate master") to our enum format ("candidate_master")
        rank = info.get("rank")
        if rank:
            rank = rank.replace(" ", "_").lower()
            if rank == "tourist":
                rank = "legendary_grandmaster"

        max_rank = info.get("maxRank")
        if max_rank:
            max_rank = max_rank.replace(" ", "_").lower()
            if max_rank == "tourist":
                max_rank = "legendary_grandmaster"

        # Fetch rating history synchronously for immediate graph display
        extracted_rating_history = []
        try:
            async with CodeforcesService() as cf_hist:
                hist_data = await cf_hist.fetch_rating_history(clean_handle)
                extracted_rating_history = [
                    {
                        "contest_id": r.get("contestId"),
                        "contest_name": r.get("contestName"),
                        "old_rating": r.get("oldRating"),
                        "new_rating": r.get("newRating"),
                        "rank": r.get("rank"),
                        "time": r.get("ratingUpdateTimeSeconds"),
                    }
                    for r in hist_data if "newRating" in r
                ]
        except Exception:
            pass

        if user.cf_handle is None:
            # Create new handle record
            cf_handle = CFHandle(
                user_id=user_id,
                handle=info.get("handle", handle),  # use exact casing from CF
                rating=rating,
                max_rating=max_rating,
                rank=rank,
                max_rank=max_rank,
                rating_history=extracted_rating_history if extracted_rating_history else None,
                sync_status="pending",
                last_synced_at=now,
            )
            self.db.add(cf_handle)
        else:
            old_handle = user.cf_handle.handle
            new_handle = info.get("handle", handle)

            if old_handle.lower() != new_handle.lower():
                from sqlalchemy import delete

                from app.models.analytics import UserAnalytics
                from app.models.submission import Submission
                from app.redis import CacheKey, redis_client

                # Delete old submissions and analytics
                await self.db.execute(delete(Submission).where(Submission.user_id == user_id))
                await self.db.execute(delete(UserAnalytics).where(UserAnalytics.user_id == user_id))

                # Clear Redis caches
                await redis_client.delete(
                    CacheKey.user_activity(user_id),
                    CacheKey.user_profile(user_id)
                )

            # Update existing handle
            user.cf_handle.handle = new_handle
            user.cf_handle.rating = rating
            user.cf_handle.max_rating = max_rating
            user.cf_handle.rank = rank
            user.cf_handle.max_rank = max_rank
            if extracted_rating_history:
                user.cf_handle.rating_history = extracted_rating_history
            user.cf_handle.sync_status = "pending"
            user.cf_handle.last_synced_at = now
            user.cf_handle.sync_error = None

        # Mark onboarding complete
        user.onboarding_completed = True

        await self.db.flush()
        await self.db.refresh(user, attribute_names=["cf_handle"])
        return user

    async def delink_cf_handle(self, user_id: str) -> User:
        """
        Delinks / removes the Codeforces handle and associated synced data for a user.
        """
        user = await self.get_by_id(user_id)
        if user is None:
            msg = f"User {user_id!r} not found"
            raise ValueError(msg)

        if user.cf_handle is not None:
            from sqlalchemy import delete

            from app.models.analytics import UserAnalytics
            from app.models.submission import Submission
            from app.models.upsolve import UpsolveItem
            from app.redis import CacheKey, redis_client

            # Delete submissions, analytics, upsolve items
            await self.db.execute(delete(Submission).where(Submission.user_id == user_id))
            await self.db.execute(delete(UserAnalytics).where(UserAnalytics.user_id == user_id))
            await self.db.execute(delete(UpsolveItem).where(UpsolveItem.user_id == user_id))
            await self.db.execute(delete(CFHandle).where(CFHandle.user_id == user_id))

            user.cf_handle = None
            user.onboarding_completed = False

            # Clear Redis caches
            await redis_client.delete(
                CacheKey.user_activity(user_id),
                CacheKey.user_profile(user_id),
                CacheKey.sync_status(user_id),
            )

            await self.db.flush()
            await self.db.refresh(user, attribute_names=["cf_handle"])

        return user
