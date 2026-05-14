# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Inter-artifact server-to-server calls

For server-to-server calls between artifacts in the same container (e.g.
ajelsa -> api-server for `/api/storage/*`), call the target's bound port
directly via `localhost:<port>` instead of going through the shared
proxy at `localhost:80`. The proxy is reachable from outside the
container but is NOT reliably reachable from inside production
deployment containers (observed: connection refused, "fetch failed").

- ajelsa -> api-server: `process.env.INTERNAL_API_URL` (default
  `http://localhost:8080/api`). Set explicitly in
  `artifacts/ajelsa/.replit-artifact/artifact.toml` for both dev and
  prod env blocks.

### Internal-only mutating endpoints

When api-server exposes a mutating endpoint that is meant to be called
only by ajelsa (e.g. `DELETE /api/storage/objects/*`), gate it behind
the shared `SESSION_SECRET` via the `X-Internal-Token` header. Both
artifacts run in the same container so the secret is available to both
processes; external callers cannot read it. Read-only routes can stay
open since the data is already user-facing through ajelsa.

### Image-URL validation

Image fields (`featuredImageUrl`, `ogImageUrl`, `avatarUrl`, `coverUrl`,
etc.) accept TWO formats:

- **Relative paths** like `/api/storage/objects/uploads/<uuid>` — produced
  by our internal storage (Replit Object Storage, local-FS fallback).
- **Absolute http(s) URLs** — produced by Cloudinary, R2, and external CDNs.

Use `imageUrlSchema` from `@/lib/api` for any new article/staff/author/SEO
field that holds an image URL. **Never** use `z.string().url()` — it
rejects our internal serving paths and causes 400s on save/publish right
after an editor uploads or generates an image. The shared schema also
rejects `data:` URLs and protocol-relative `//host` URLs for safety.

Routes already converted: `articles`, `staff`, `authors`, `opinions`
(featured + OG). User-typed external URLs like `websiteUrl` may stay on
`z.string().url()`.

### Server-side image uploads

Use `uploadWithFallback` from `@/lib/uploadChain` for any new server
endpoint that accepts an image. It mirrors `/api/upload`'s destination
chain (Cloudinary → Object Storage → R2 → local-FS) and returns
`{ url, key, source }` or `null`. Cloudinary transforms (e.g. canonical
crops) are applied **only** when Cloudinary is the active destination;
other destinations store the buffer as-is. Do **not** hard-require
Cloudinary in a route — that breaks every environment without a
Cloudinary key (including this Replit container, where Object Storage
is the active destination).
