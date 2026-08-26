# ADR-007: Auth.js v5 with GitHub and Google OAuth

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

NovaCP needs user authentication to:

- Identify users across sessions
- Gate dashboard, analytics, contest, and problem pages
- Associate Codeforces handles with the correct user identity
- Support multiple OAuth providers (at minimum GitHub and Google) without managing passwords

Competitive programmers commonly have GitHub accounts; Google is the widest general-purpose provider.

## Decision

Use **Auth.js v5** (`next-auth@5.0.0-beta.25`) within Next.js for all session management.

Key design points:

**Providers:** GitHub OAuth and Google OAuth. No email/password. Passwordless sign-in keeps attack surface minimal and removes the need to store hashed passwords.

**Session strategy:** Auth.js default (JWT-based sessions stored in cookies). No server-side session store needed at this scale.

**Route protection:** Next.js middleware (`middleware.ts`) intercepts all non-static routes. Protected paths:

```
/dashboard, /analytics, /contests, /problems,
/battles, /coach, /community, /profile, /settings
```

Unauthenticated users are redirected to `/login?callbackUrl=<original_path>`. Authenticated users hitting `/login` are redirected to `/dashboard`.

**User sync:** On first sign-in, Auth.js calls a Next.js API route (BFF) which upserts the user record in FastAPI via `POST /api/v1/users`. The FastAPI `User` model stores `provider` + `provider_account_id` with a unique composite index to prevent duplicate records when the same person signs in with multiple providers sharing an email.

**`onboarding_completed` flag:** The `User` model has an `onboarding_completed` boolean. After the user links their Codeforces handle, this flag is set to `true`. The dashboard can redirect incomplete users to the onboarding flow.

## Consequences

**Positive:**

- Zero password management — no bcrypt, no password reset flows, no credential leaks
- Auth.js handles token refresh, PKCE, and CSRF automatically
- `auth()` middleware callback is the canonical v5 pattern — compatible with Edge runtime
- `callbackUrl` redirect preserves deep links through the login flow

**Negative:**

- Auth.js v5 is beta — breaking changes before stable release are possible
- GitHub and Google OAuth apps must be registered and secrets rotated — ops overhead
- Users who lose access to both OAuth providers lose access to their account (no recovery flow at M0)

## Alternatives Considered

| Option          | Reason Rejected                                                              |
| --------------- | ---------------------------------------------------------------------------- |
| Clerk           | Third-party dependency with per-MAU pricing; adds vendor lock-in             |
| Firebase Auth   | Ties frontend to Firebase ecosystem; overkill for M0                         |
| Custom JWT auth | High implementation cost; error-prone; not justified when Auth.js handles it |
| Lucia Auth      | Newer, less documentation; smaller community than Auth.js                    |
