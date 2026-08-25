# ADR-002: Next.js 15 as Frontend Framework

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Core team

---

## Context

NovaCP's frontend needs to:

- Serve a public landing page with good SEO
- Provide protected, data-rich dashboard views (analytics, contests, problems)
- Handle OAuth-based authentication
- Serve as the **Backend for Frontend (BFF)** — proxying calls to the FastAPI backend so users never interact with the API directly
- Run fast in development with hot module replacement

## Decision

Use **Next.js 15 with the App Router** as the frontend framework, running with **Turbopack** in development (`next dev --turbopack`).

Key sub-decisions:

| Concern | Choice |
|---|---|
| Routing | App Router (RSC-first) |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.25`) |
| UI components | shadcn/ui (Radix UI primitives + Tailwind) |
| Styling | TailwindCSS v3 |
| Icons | lucide-react |
| Type sharing | `@novacp/types` via workspace |

The Next.js API routes (`/api/*`) act as the BFF layer — they receive requests from the browser, attach the `X-Internal-API-Key` header, and forward to FastAPI. End users never call FastAPI directly.

Route groups are used to scope layouts:
- `(auth)` — unauthenticated layout (login page)
- `(dashboard)` — authenticated shell with sidebar + topbar

## Consequences

**Positive:**
- App Router allows React Server Components, reducing client-side JS bundle for data-heavy pages
- Auth.js v5 integrates seamlessly with Next.js middleware for route protection
- shadcn/ui components are copy-owned (not a runtime dependency), making customization trivial
- Turbopack gives ~3–5× faster HMR vs. Webpack in development

**Negative:**
- Auth.js v5 is still in beta — breaking changes are possible before stable release
- App Router's RSC mental model adds complexity for developers used to Pages Router
- Turbopack is also pre-stable; occasional edge cases may require falling back to Webpack

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Vite + React SPA | No SSR/SSG — poor SEO for landing page; no built-in BFF pattern |
| Remix | Smaller ecosystem; Auth.js integration less mature |
| SvelteKit | Team unfamiliar; smaller component ecosystem than React |
| Pages Router | App Router is the strategic direction for Next.js; RSC benefits outweigh migration cost |
