# Deployment — Vercel (frontend) + Railway (backend)

This is the live runbook for getting ajelsa onto Vercel and api-server onto
Railway, plus DB migration from Neon. Run the steps in order; each step
either is idempotent or notes its rollback.

## What's deployed where

| Surface | Host | Origin (prod) |
|---|---|---|
| Public site (Arabic RTL) + admin UI | Vercel | `https://ajel.sa` |
| Express API (auth, RBAC, users, storage) | Railway | `https://api.ajel.sa` |
| Postgres | Railway Postgres | private network only |
| Object storage (media uploads) | Cloudflare R2 / Cloudinary | (later batch) |

ajelsa still owns these `/api/*` sub-paths until they're ported:
`/api/admin`, `/api/ai`, `/api/ads`, `/api/articles`, `/api/authors`,
`/api/analytics`, `/api/categories`, `/api/comments`, `/api/me`,
`/api/media`, `/api/newsletter`, `/api/opinions`, `/api/polls`,
`/api/revalidate`, `/api/settings`, `/api/staff`, `/api/tags`,
`/api/upload`.

These run as Next.js route handlers on Vercel and hit Railway Postgres
directly (same `DATABASE_URL` as api-server). Browser-side cross-origin
fetches go through `apiFetch` from `@/lib/apiClient`, which prepends
`NEXT_PUBLIC_API_URL` only for ported routes.

## Prerequisites

- Railway CLI: `npm i -g @railway/cli && railway login`
- Vercel CLI: `npm i -g vercel && vercel login`
- Postgres client tools (`pg_dump`/`pg_restore`/`psql`) with version
  matching the source DB major version
- The current Neon `DATABASE_URL` (read-only is fine for the dump)
- DNS access for `ajel.sa` (Cloudflare / Route53 / etc.)
- A 32+ character `AUTH_SECRET` shared between both deployments

## 1. Provision Railway

```bash
railway init  # in repo root; pick "Empty Project"
railway add   # add a Postgres plugin; copy the connection string
```

In the Railway dashboard for the api-server service:

1. Connect the GitHub repo, branch `main` (or your default).
2. Set **Service Root Directory** to repository root `/` so Nixpacks
   sees `pnpm-workspace.yaml`. `railway.toml` at the root drives build
   and start.
3. Set service variables (from `artifacts/api-server/.env.example`):
   - `DATABASE_URL` — Railway Postgres `DATABASE_PRIVATE_URL` (preferred;
     stays on the internal network).
   - `AUTH_SECRET` — 32+ random chars; keep identical to Vercel's.
   - `FRONTEND_ORIGIN` — `https://ajel.sa`.
   - `COOKIE_DOMAIN` — `.ajel.sa` (leading dot, shares with subdomain).
   - `NODE_ENV` — `production`.
   - `PORT` — leave blank, Railway injects it.
4. Add a custom domain → `api.ajel.sa`. Railway issues the cert.

Smoke test: `curl https://api.ajel.sa/api/healthz` → `{"status":"ok"}`.

## 2. Migrate the database (Neon → Railway)

Schedule a short read-only window in ajelsa (or pause writes) to avoid
losing rows committed between dump start and ajelsa cutover.

```bash
SOURCE_URL='postgresql://...neon.tech/db?sslmode=require' \
TARGET_URL='postgresql://...railway.app/railway' \
  ./scripts/migrate-db-to-railway.sh
```

The script does:
1. `pg_dump --format=custom --no-owner --no-privileges` from Neon.
2. `pg_restore --clean --if-exists --no-owner --no-privileges` into Railway.
3. Runs row-count verification on critical tables.
4. Leaves the dump file in `/tmp/` for rollback.

If row counts disagree on any table, abort and investigate — DO NOT flip
`DATABASE_URL` on ajelsa yet.

## 3. Provision Vercel

```bash
cd /path/to/repo
vercel link
```

In the Vercel dashboard:

1. **Framework Preset**: Next.js (auto-detected).
2. **Root Directory**: `.` (repo root). `vercel.json` already targets
   `artifacts/ajelsa` via `outputDirectory` and overrides the build
   command for the workspace filter.
3. **Install Command**: `pnpm install --frozen-lockfile` (set in vercel.json).
4. **Build Command**: `pnpm --filter @workspace/ajelsa run build` (set
   in vercel.json).
5. **Output Directory**: `artifacts/ajelsa/.next` (set in vercel.json).
6. Environment variables (from `artifacts/ajelsa/.env.example`):
   - `NEXT_PUBLIC_API_URL` → `https://api.ajel.sa`
   - `AUTH_SECRET` → same value as Railway's
   - `DATABASE_URL` → Railway Postgres **PUBLIC** URL (Vercel can't
     reach the Railway private network — use the public endpoint with
     SSL; expect higher latency than api-server's internal connection)
   - `REVALIDATE_SECRET` → fresh 32+ chars; api-server will use this to
     trigger ISR after publishing (later batch)
   - `NODE_ENV` → `production`
7. Add custom domain `ajel.sa` (and `www.ajel.sa` redirecting to apex).

## 4. DNS

In your DNS provider:

```
ajel.sa          A     <vercel-anycast-ip>     (or follow Vercel's CNAME)
www.ajel.sa      CNAME cname.vercel-dns.com
api.ajel.sa      CNAME <railway-domain>        (Railway shows it on the service)
```

Wait until both `ajel.sa` and `api.ajel.sa` resolve. Each provider
issues its own cert via Let's Encrypt; usually < 5 minutes.

## 5. Smoke-test the wired-up stack

From your machine:

```bash
DATABASE_URL='<railway public url>' \
AUTH_SECRET='<the shared secret>' \
TEST_EMAIL='admin@example.com' TEST_PASSWORD='...' \
  ./artifacts/api-server/scripts/smoke-test.sh
```

Then from a browser:

1. `https://ajel.sa/login` — submit your credentials.
2. After redirect to `/admin`, open devtools → Network → request to
   `https://api.ajel.sa/api/auth/me` should succeed (200) and the
   response should set/refresh `ajel_session` with `Domain=.ajel.sa`.
3. Visit `/admin/roles` (still owned by ajelsa today — page rendered
   server-side from the same DB) and confirm role data loads.

## 6. Rollback procedures

**Cookie / CORS broken on Vercel:** roll back `FRONTEND_ORIGIN` /
`COOKIE_DOMAIN` on Railway and redeploy api-server. Cookies set with
the wrong Domain attribute won't be sent back; the browser silently
drops them.

**DB row-count mismatch after migration:** keep ajelsa pointed at Neon
(`DATABASE_URL` unchanged on Vercel side) and re-run the migration
script after fixing the source of the divergence. The Railway DB can
be re-restored from the saved `/tmp/ajelsa-migration-*.dump`.

**api-server bundle broken on Railway:** Railway keeps previous
deploys; revert via the Railway dashboard. `healthcheckPath` ensures
broken bundles never receive traffic — they fail the rollout instead.

**Need to fully revert Vercel cutover:** point `ajel.sa` DNS back to
the Replit deployment. The Replit container still has the legacy
"both surfaces in one box" wiring as long as `.replit` is unchanged.

## What still runs on Replit (during the transition)

Until `staff`, `articles`, `opinions`, `authors`, `media`, `ai`,
`admin`, `comments`, `ads`, `polls`, `newsletter`, `analytics`,
`categories`, `tags`, `settings`, `revalidate`, and `upload` are
ported into api-server, the Replit container remains an option for:

- Running `pnpm --filter @workspace/ajelsa run db:seed` /
  `db:seed-roles` against the new Railway Postgres (the ajelsa Drizzle
  schema is identical to `@workspace/db/schema`).
- Hosting `mockup-sandbox` (the design canvas — not production).

After the porting is complete and the routes deleted from ajelsa, the
Replit configuration files (`.replit`, `artifact.toml`s) can be
removed in a single commit.
