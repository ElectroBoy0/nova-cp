# NovaCP v1.0 — Production Deployment Guide

This guide provides step-by-step instructions for deploying NovaCP to production using the managed cloud stack:
- **Frontend**: [Vercel](https://vercel.com) (Next.js 15)
- **Backend API**: [Railway](https://railway.app) (FastAPI / Python 3.12)
- **Database**: [Neon](https://neon.tech) (Serverless PostgreSQL 16)
- **Cache**: [Upstash](https://upstash.com) (Serverless Redis / TLS)
- **DNS & Edge**: [Cloudflare](https://cloudflare.com)

---

## 1. Architecture & Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Client                           │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 1. Requests /api/v1/*        │
               │ (Standard HTTPS, Cookies)    │
┌──────────────▼──────────────────────────────┴───────────────┐
│              Next.js Frontend (Vercel)                      │
│ - Serves UI & Static Assets                                 │
│ - Handles Auth.js Sessions & OAuth Callbacks                │
│ - BFF Proxy (`app/api/v1/[...path]/route.ts`)               │
│ - Injects `X-Internal-API-Key` (Server Secret Only)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ 2. Proxied API Calls
                               │ (HTTPS with Internal Key)
┌──────────────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Railway)                      │
│ - Validates `X-Internal-API-Key`                            │
│ - Executes Sandboxed Code & Analytics Calculations          │
│ - Background Scheduler (Periodic Contests / Sync)           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     Neon PostgreSQL         ││      Upstash Redis           │
│ (Pooled, SSL Required)      ││   (TLS Enabled, Serverless)  │
└─────────────────────────────┘└──────────────────────────────┘
```

> [!IMPORTANT]
> - `INTERNAL_API_KEY` and `API_URL` are strictly server-only and NEVER exposed to the browser.
> - Browser clients communicate exclusively with the Next.js domain (`/api/v1/...`).

---

## 2. Step-by-Step Deployment Guide

### Step 1: Provision Neon PostgreSQL
1. Sign in to [Neon](https://neon.tech) and create a new project named `novacp-prod`.
2. Under **Connection Details**, copy the pooled connection string (e.g. `postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`).
3. For SQLAlchemy `asyncpg`, convert the protocol prefix to:
   ```
   postgresql+asyncpg://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

### Step 2: Provision Upstash Redis
1. Sign in to [Upstash](https://upstash.com) and create a Redis database named `novacp-redis`.
2. Under **Details**, copy the `rediss://` connection URL (e.g. `rediss://default:password@xyz.upstash.io:6379`).

---

### Step 3: Deploy Backend on Railway
1. Sign in to [Railway](https://railway.app) and create a new project $\rightarrow$ **Deploy from GitHub repo**.
2. Set **Root Directory** to `/apps/api`.
3. Configure the **Build & Start Commands** (or use the included `Dockerfile`):
   - **Build Command**: `uv sync --no-dev`
   - **Start Command**: `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Add the following **Environment Variables** in Railway Dashboard:
   ```env
   APP_NAME="NovaCP API"
   APP_VERSION="1.0.0"
   DEBUG="false"
   DATABASE_URL="postgresql+asyncpg://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   REDIS_URL="rediss://default:password@xyz.upstash.io:6379"
   INTERNAL_API_KEY="<generate-random-32-char-secret>"
   ALLOWED_ORIGINS="https://your-app.vercel.app,https://your-custom-domain.com"
   GEMINI_API_KEY="<your-gemini-api-key>"
   ```
5. Run database migrations on Railway:
   - In the Railway service terminal (or via Railway CLI):
     ```bash
     uv run alembic -c migrations/alembic.ini upgrade head
     ```
6. Copy your public Railway URL (e.g. `https://novacp-api-production.up.railway.app`).

---

### Step 4: Deploy Frontend on Vercel
1. Sign in to [Vercel](https://vercel.com) and click **Add New Project** $\rightarrow$ Import your GitHub repository.
2. In the project setup configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click `Edit` and select `apps/web`
   - **Build Command**: Leave default (`pnpm build`)
   - **Install Command**: Leave default (`pnpm install`)
3. Add the following **Environment Variables** in Vercel:

| Variable Name | Scope | Value / Format |
| :--- | :---: | :--- |
| `AUTH_SECRET` | Secret | Run `openssl rand -hex 32` |
| `AUTH_TRUST_HOST` | Secret | `true` |
| `AUTH_GOOGLE_ID` | Secret | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Secret | Google OAuth Client Secret |
| `AUTH_GITHUB_ID` | Secret | (Optional) GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | Secret | (Optional) GitHub OAuth Client Secret |
| `API_URL` | Secret | `https://your-railway-app.up.railway.app` |
| `INTERNAL_API_KEY` | Secret | Must match `INTERNAL_API_KEY` set in Railway |
| `NEXT_PUBLIC_APP_URL` | Public | `https://your-app.vercel.app` (or custom domain) |

4. Click **Deploy**. Vercel will build and assign your production deployment URL.

---

### Step 5: Configure OAuth Providers

#### A. Google Cloud Console
1. Navigate to **Google Cloud Console** $\rightarrow$ **APIs & Services** $\rightarrow$ **Credentials**.
2. Under your OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**:
     - `https://your-app.vercel.app`
     - `https://your-custom-domain.com`
   - **Authorized redirect URIs**:
     - `https://your-app.vercel.app/api/auth/callback/google`
     - `https://your-custom-domain.com/api/auth/callback/google`

#### B. GitHub Developer Settings (Optional)
1. Navigate to **GitHub Settings** $\rightarrow$ **Developer settings** $\rightarrow$ **OAuth Apps**.
2. Under your OAuth App:
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://your-app.vercel.app/api/auth/callback/github`

---

### Step 6: Cloudflare DNS & SSL Configuration (For Custom Domains)
1. Add CNAME records pointing your custom domain to `cname.vercel-dns.com`.
2. Set SSL/TLS encryption mode to **Full (strict)** in Cloudflare.
3. Enable **Always Use HTTPS** and **HTTP/3 (with QUIC)**.

---

## 3. Post-Deployment Verification Checklist

- [ ] **Health Checks**:
  - Railway API: `https://your-api.up.railway.app/health` returns `{"status": "ok"}`.
  - Detailed Health: `https://your-api.up.railway.app/health/detailed` verifies DB & Redis connectivity.
- [ ] **Frontend Load**: Landing page loads at `https://your-app.vercel.app` with zero browser console errors.
- [ ] **OAuth Authentication**: Sign-in via Google/GitHub redirects back and persists user session.
- [ ] **Codeforces Handle Verification**: User verification token is generated, checked against Codeforces profile, and linked.
- [ ] **Problem Explorer & Solving**: Browse problems and execute code against test cases in the solve workspace.
- [ ] **Settings & Bug Reports**: Update profile settings and submit bug reports successfully.
