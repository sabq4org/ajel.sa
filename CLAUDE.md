# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Overview

`ajelsa` is a pnpm-workspace monorepo for **صحيفة عاجل الإلكترونية** (Ajel Saudi newspaper). Three deployable artifacts plus four shared libraries, deployed on Replit. Node 24, TypeScript 5.9, package manager is **pnpm only** (a `preinstall` hook hard-fails on npm/yarn).

```
artifacts/
  ajelsa/          Next.js 15 app (Arabic RTL newsroom + admin) — main app, port 23233
  api-server/      Express 5 API (storage endpoints, OpenAPI-driven) — port 8080
  mockup-sandbox/  Vite design sandbox (infinite canvas for component prototyping) — port 8081
lib/
  api-spec/        OpenAPI 3.1 source of truth + Orval codegen config
  api-zod/         Generated Zod schemas + TS types (output of orval `zod`)
  api-client-react/ Generated React Query hooks (output of orval `react-query`)
  db/              Shared Drizzle schema package (`@workspace/db`)
  shared/          Pure utilities shared across ajelsa + api-server
                   (`@workspace/shared`) — JWT, password, RBAC registry
scripts/           Workspace scripts (tsx)
```

## Key Commands

Run from repo root unless noted. Always use `pnpm` (npm/yarn are blocked by `preinstall`).

```bash
pnpm install                                           # install all deps
pnpm run typecheck                                     # full typecheck across all packages
pnpm run build                                         # typecheck + build all artifacts

# Codegen — regenerates lib/api-zod and lib/api-client-react from openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# DB — push schema to DATABASE_URL (uses lib/db schema)
pnpm --filter db run push
pnpm --filter db run push-force                        # bypass interactive prompts

# Run a single artifact in dev
pnpm --filter @workspace/ajelsa run dev                # Next.js dev (turbo)
pnpm --filter @workspace/api-server run dev            # builds + starts express
pnpm --filter @workspace/mockup-sandbox run dev        # vite dev

# Ajelsa app — Drizzle (uses its OWN local schema in src/lib/db/schema.ts, separate from lib/db)
pnpm --filter @workspace/ajelsa run db:push            # push schema (dev)
pnpm --filter @workspace/ajelsa run db:generate        # generate migrations
pnpm --filter @workspace/ajelsa run db:migrate         # apply migrations
pnpm --filter @workspace/ajelsa run db:studio          # open Drizzle Studio
pnpm --filter @workspace/ajelsa run db:seed            # seed users
pnpm --filter @workspace/ajelsa run db:seed-roles      # seed RBAC roles + permissions

# Tests (vitest, ajelsa only)
pnpm --filter @workspace/ajelsa run test               # all tests
pnpm --filter @workspace/ajelsa exec vitest run src/lib/objectStorage.test.ts   # single file
pnpm --filter @workspace/ajelsa exec vitest                                     # watch mode

# After git merge, .replit hook runs scripts/post-merge.sh which re-installs and pushes lib/db
```

## Architecture — The Big Picture

### Two schema copies during the Vercel/Railway split — keep them in sync

There are **two parallel Drizzle schema files**, both with the full 832-line newsroom schema:

1. `artifacts/ajelsa/src/lib/db/schema.ts` — consumed by ajelsa (pinned to **drizzle-orm ^0.38.3**, postgres-js client).
2. `lib/db/src/schema/index.ts` — exported as `@workspace/db/schema`, consumed by api-server (catalog **drizzle-orm ^0.45.2**, pg Pool client).

The two copies exist because of the drizzle-orm version mismatch — importing the 0.45 schema into ajelsa's 0.38 drizzle client causes type and runtime incompatibilities. **Any schema change MUST be mirrored in both files** until ajelsa is bumped to the catalog drizzle version (part of the in-progress Vercel/Railway split, after which the ajelsa copy is deleted).

When editing data models: edit BOTH files, then push migrations from whichever artifact owns the target DB. Currently ajelsa owns migrations via `pnpm --filter @workspace/ajelsa run db:push`; once the API moves to Railway, `pnpm --filter db run push` against the Railway DB takes over.

### Two API surfaces, one container

Both `ajelsa` (Next.js) and `api-server` (Express) run in the **same Replit container** and split the `/api/*` prefix by most-specific-prefix routing (see `artifacts/ajelsa/.replit-artifact/artifact.toml`):

- `api-server` owns `/api` generally and **all of `/api/storage/*`** (presigned uploads, object serving, ACLs — backed by GCS / Replit Object Storage).
- `ajelsa` owns explicit sub-paths: `/api/admin`, `/api/ai`, `/api/articles`, `/api/auth`, `/api/authors`, `/api/comments`, `/api/me`, `/api/media`, `/api/newsletter`, `/api/opinions`, `/api/permissions`, `/api/polls`, `/api/revalidate`, `/api/roles`, `/api/settings`, `/api/staff`, `/api/tags`, `/api/upload`, `/api/users`, `/api/analytics`, `/api/ads`, `/api/categories`.

When adding a new Next.js `/api/*` sub-path in ajelsa, you **must** also add it to the `paths` array in `artifacts/ajelsa/.replit-artifact/artifact.toml` or it will be routed to api-server (404). Never put `/api/storage` there — that prefix belongs to api-server.

#### Server-to-server calls inside the container

When ajelsa calls api-server (e.g. for `/api/storage/*`), call **`localhost:<bound-port>` directly** via `process.env.INTERNAL_API_URL` (default `http://localhost:8080/api`). Do **not** go through the external proxy at `localhost:80` — it is unreachable from inside production deployment containers ("connection refused" / "fetch failed").

Internal-only mutating endpoints on api-server (e.g. `DELETE /api/storage/objects/*`) are gated by the `X-Internal-Token` header set to the shared `SESSION_SECRET`. Read-only routes can stay open.

### OpenAPI → Zod → React Query codegen

The api-server contract is defined in `lib/api-spec/openapi.yaml` (the title MUST stay `"Api"` — a transformer in `orval.config.ts` enforces this because export paths depend on it). Orval runs in two modes:

- `zod` → `lib/api-zod/src/generated/` (Zod schemas + TS types). Coerces query/param booleans/numbers/strings; coerces body/response `bigint`/`Date`.
- `react-query` → `lib/api-client-react/src/generated/` (hooks, using `customFetch` from `lib/api-client-react/src/custom-fetch.ts`, baseUrl `/api`).

After editing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` (it also runs `typecheck:libs`). Generated files are in source control — commit them.

**Naming collision pitfall**: orval derives Zod export names from `operationId` (e.g. `login` → `LoginResponse`, `requestUploadUrl` → `RequestUploadUrlResponse`). The TS interfaces come from `components.schemas.*` names. If a schema name matches the orval-derived Zod export name, `export * from "./generated/api"` and `export * from "./generated/types"` collide in `lib/api-zod/src/index.ts`. **Use a distinct schema name** — e.g. `LoginResult` (schema) ↔ `LoginResponse` (zod), `UploadUrlResponse` (schema) ↔ `RequestUploadUrlResponse` (zod), `HealthStatus` (schema) ↔ `HealthCheckResponse` (zod).

### api-server permission guards

`artifacts/api-server/src/middlewares/requirePerm.ts` exports `requirePerm(key)`, `requireAnyPerm(keys)`, `requireAuth()` as Express middleware. They read the session cookie, verify the JWT + session_epoch, and attach `req.session: SessionPayload` for handlers. Use the global-namespace pattern (`declare global { namespace Express { interface Request { session?: SessionPayload } } }`) to extend the Request type — augmenting `"express-serve-static-core"` directly fails because pnpm hoists those types under a `.pnpm/…` path that tsc can't resolve as a module name.

Express 5 typing pitfall: `req.params.id` is `string | string[]` by default. Type the handler as `Request<{ id: string }>` for `/foo/:id` to narrow it.

### Shared utilities — `@workspace/shared`

Pure helpers used by both ajelsa (Next.js) and api-server (Express) live in `lib/shared/src/`:

- `jwt.ts` — `signSession`, `verifySession`, `SessionPayload` type, `COOKIE_NAME`, `SESSION_DURATION`. Uses `jose` and reads `AUTH_SECRET` / `AUTH_COOKIE_NAME` from env.
- `password.ts` — bcrypt wrappers (`hashPassword`, `verifyPassword`).
- `permissions.ts` — `PERMISSION_REGISTRY`, `SYSTEM_ROLES`, `CATEGORY_LABELS_AR`, `LEGACY_ROLE_MAP`, `NON_PUBLISHING_ROLE_KEYS`, plus pure functions `applyPermissionOverrides` and `hasPermissionInList`.
- `legacy-roles.ts` — `ROLE_LEVELS`, `hasRole` (legacy enum role hierarchy, deprecated).

Nothing here touches a DB or framework request/response. DB-bound helpers (login, `resolveUserPermissionKeys`, the per-process permission cache, the `cookies()` integration) stay in each app — ajelsa's `src/lib/auth.ts` and `src/lib/permissions.ts` are thin DB-touching layers that re-export the pure pieces from `@workspace/shared`.

### Auth + RBAC (ajelsa)

- **JWT sessions** signed with `AUTH_SECRET`, stored as `httpOnly` cookie `ajel_session` (30d). Implemented in `artifacts/ajelsa/src/lib/auth.ts`.
- The JWT carries a **snapshot of the user's permission keys** at login (`permissionKeys: string[]`) for zero-DB checks, plus a `sessionEpoch`. Every `getSession()` re-reads `users.session_epoch` from the DB and rejects the token if the epoch was bumped (force-logout / password reset). No in-process cache for the epoch — it must be authoritative per request.
- **RBAC tables**: `roles`, `permissions`, `role_permissions`. Users have a `roleId` FK plus a `customPermissions` jsonb of per-user `{ add: [], remove: [] }` overrides. The canonical permission list lives in `PERMISSION_REGISTRY` in `artifacts/ajelsa/src/lib/permissions.ts`. System roles (`system_admin`, `supervisor`, `content_manager`, `reporter`, `columnist`) are also defined there and seeded with `isSystem=true`.
- The **legacy `users.role` enum** (`super_admin` / `editor_in_chief` / `editor` / `writer` / `contributor`) is kept for backward compatibility but marked `@deprecated`. **New code MUST use permission checks** via `requirePerm(key)`, `ensurePerm(key)`, `requireAnyPerm([...])`, or `sessionHasPermission(session, key)`.
- The `middleware.ts` matcher covers `/admin/:path*` and `/api/articles/:path*`. **Note**: the redirect to `/login` is currently commented out — admin pages are open during initial setup. Don't assume middleware blocks unauthenticated access.

### Route handler conventions (ajelsa Next.js)

`artifacts/ajelsa/src/lib/api.ts` exports the standard response helpers (`ok`, `created`, `noContent`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `serverError`) and the standard guards (`ensureAuth`, `ensurePerm`, `ensureAnyPerm`). Use `fromError(err)` to map `ZodError` → 400, `UNAUTHENTICATED`/`FORBIDDEN` thrown errors → 401/403, and anything else → 500.

### Image URLs — never use `z.string().url()`

Image fields (`featuredImageUrl`, `ogImageUrl`, `avatarUrl`, `coverUrl`, etc.) accept TWO formats:

- **Relative paths** like `/api/storage/objects/uploads/<uuid>` (Replit Object Storage / local-FS fallback).
- **Absolute http(s) URLs** (Cloudinary, R2, external CDNs).

**Always** use `imageUrlSchema` from `@/lib/api` for image URL fields. Plain `z.string().url()` rejects internal serving paths and causes 400s right after the editor uploads/generates an image. `imageUrlSchema` also rejects `data:` URLs and protocol-relative `//host` URLs.

User-typed external URLs (e.g. `websiteUrl`) may stay on `z.string().url()`.

### Server-side image uploads — use `uploadWithFallback`

Any new server endpoint accepting an image should call `uploadWithFallback` from `@/lib/uploadChain`. It mirrors `/api/upload`'s destination chain: **Cloudinary → Replit Object Storage → R2 → local-FS**, returning `{ url, key, source }` or `null`. Hardening rule: if ANY cloud destination is configured, the local-FS fallback is **disabled** so a configured cloud failure can't silently degrade to a `/uploads/...` URL that won't resolve in production. Cloudinary transforms (canonical crops) apply **only** when Cloudinary is the active destination — other destinations store the buffer as-is. Do not hard-require Cloudinary in any route; it isn't configured in the default Replit container (Object Storage is).

### Ajelsa app layout (Next.js App Router)

- `src/app/(public)/` — public-facing Arabic RTL site (homepage, article, opinion, category, keyword, latest).
- `src/app/admin/` — newsroom admin dashboards (articles, opinions, authors, staff, roles, users, ads, comments, analytics, settings, calendar, polls, newsletter, audit, workflow, etc.).
- `src/app/api/` — Next route handlers (see route list above). The `[id]` segment is used for single-resource endpoints.
- `src/components/public/` and `src/components/admin/` — feature components. `src/components/ui/` — shadcn-style primitives.
- `src/lib/` — domain logic (auth, permissions, db, queries, cloudinary, objectStorage, uploadChain, storage, redis, search, activity, etc.). Path alias `@/*` → `src/*`.
- `src/lib/queries/` — Drizzle query builders (only `articles.ts`, `opinions.ts` so far — most queries live in route handlers).

## Deployment Notes

- Replit ports: `8080` → api-server, `8081/externalPort=80` → mockup-sandbox, `8082/externalPort=3002` and `23233/externalPort=3000` → ajelsa.
- `pnpm-workspace.yaml` has `minimumReleaseAge: 1440` (24h) on most packages — newly published deps are blocked from install for a day. `@replit/*` and `stripe-replit-sync` are exempt.
- The workspace `overrides` map kills off every non-Linux native binary variant of esbuild/rollup/tailwindcss-oxide/lightningcss to slim the Replit image — when adding similar native-binary deps, add the equivalent exclusions.
