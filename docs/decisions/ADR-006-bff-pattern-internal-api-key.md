# ADR-006: BFF Pattern with Internal API Key Auth

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

We have two services:
- **Next.js** (`apps/web`) — public-facing, handles user authentication via Auth.js
- **FastAPI** (`apps/api`) — backend data service, not intended for public access

A naive approach would expose FastAPI directly to the browser. This creates several problems:
- FastAPI would need to re-implement session management duplicating Auth.js logic
- CORS rules become complex (browser → FastAPI cross-origin)
- API surface is unnecessarily public; rate-limiting and DDoS protection is harder

## Decision

Adopt the **Backend for Frontend (BFF)** pattern:

```
Browser
  │  (session cookie)
  ▼
Next.js API Routes  ──(X-Internal-API-Key header)──▶  FastAPI
  │
  └─ Auth.js handles all session management
```

The Next.js API routes act as the BFF layer. They:
1. Verify the user's session (via Auth.js)
2. Attach the `X-Internal-API-Key` header
3. Forward the request to FastAPI

FastAPI enforces the internal key on every endpoint via the `require_internal_key` FastAPI dependency (`middleware/auth.py`). The key comparison uses `hmac.compare_digest` to prevent timing attacks.

The API key is:
- Stored as `INTERNAL_API_KEY` environment variable
- **Never** exposed to the browser
- Rotated via environment variable update (no code changes needed)

FastAPI's docs (`/docs`, `/redoc`, `/openapi.json`) are only available when `DEBUG=true`, preventing schema discovery in production.

## Consequences

**Positive:**
- FastAPI has no session management complexity — it trusts the BFF implicitly via the shared key
- The FastAPI surface is not publicly routable (only `localhost:8000` in Docker network; in production, behind a private network/VPC)
- Auth.js handles all OAuth provider complexity (token refresh, PKCE, etc.) in one place
- Adding a new protected endpoint requires only applying `Depends(require_internal_key)` in FastAPI

**Negative:**
- Adds one network hop for every API call (browser → Next.js → FastAPI)
- The `INTERNAL_API_KEY` is a static shared secret — if compromised, all endpoints are accessible. Mitigation: use short-rotation practices and keep FastAPI off the public internet
- Testing FastAPI endpoints directly requires providing the key in request headers

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| FastAPI handles auth (JWTs) | Duplicates Auth.js session logic; more surface area for auth bugs |
| mTLS between Next.js and FastAPI | Much higher complexity for M0; overkill for a single-instance deployment |
| API Gateway (Kong, AWS API GW) | Adds infrastructure cost and complexity; not justified until M3+ |
| Public FastAPI with CORS | Exposes API schema; complicates user-facing rate limiting |
