from __future__ import annotations

from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

from app.config import settings

# Header name used for internal service-to-service auth
_API_KEY_HEADER = APIKeyHeader(name="X-Internal-API-Key", auto_error=False)


async def require_internal_key(
    api_key: str | None = Security(_API_KEY_HEADER),
) -> None:
    """
    FastAPI dependency that validates the internal API key.

    This key is shared between the Next.js BFF (Backend for Frontend) and
    FastAPI. It ensures that only our own frontend can call these endpoints —
    end users cannot call the FastAPI backend directly.

    In production, this key must be rotated regularly and stored as a secret
    in the deployment environment.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing internal API key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Constant-time comparison prevents timing attacks
    import hmac

    if not hmac.compare_digest(api_key, settings.INTERNAL_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key.",
        )
