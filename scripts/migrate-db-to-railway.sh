#!/usr/bin/env bash
# Migrate the production database from Neon to Railway.
#
# Strategy: pg_dump (custom format, no roles/grants, no ownership) from
# Neon → pg_restore into Railway. Custom format is portable across PG
# minor versions and lets us run with `--clean --if-exists` to make the
# restore idempotent.
#
# Usage:
#   SOURCE_URL='postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require' \
#   TARGET_URL='postgresql://user:pass@host.railway.internal:5432/db' \
#     ./scripts/migrate-db-to-railway.sh
#
# Pre-flight:
#   - pg_dump/pg_restore version >= the source server's major version
#     (`pg_dump --version`). If you hit "server version mismatch", use
#     the Postgres client tools that ship with the same major version
#     as the source.
#   - On the source side, run with `--no-owner --no-privileges` so we
#     don't try to recreate the Neon-specific role.
#   - Schedule a brief read-only window in ajelsa before flipping
#     `DATABASE_URL` to Railway, otherwise writes during the dump are lost.

set -euo pipefail

: "${SOURCE_URL:?SOURCE_URL is required (Neon connection string)}"
: "${TARGET_URL:?TARGET_URL is required (Railway connection string)}"

DUMP_FILE="${DUMP_FILE:-/tmp/ajelsa-migration-$(date +%Y%m%d-%H%M%S).dump}"

echo "==> Source server version:"
pg_dump --version

echo "==> Dumping from Neon → $DUMP_FILE"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$DUMP_FILE" \
  "$SOURCE_URL"

echo ""
echo "==> Dump size:"
ls -lh "$DUMP_FILE"

echo ""
echo "==> Restoring to Railway"
pg_restore \
  --dbname="$TARGET_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --exit-on-error \
  --verbose \
  "$DUMP_FILE"

echo ""
echo "==> Verifying critical tables"
psql "$TARGET_URL" -c "
  SELECT 'users' AS table, COUNT(*) FROM users
  UNION ALL SELECT 'roles', COUNT(*) FROM roles
  UNION ALL SELECT 'permissions', COUNT(*) FROM permissions
  UNION ALL SELECT 'role_permissions', COUNT(*) FROM role_permissions
  UNION ALL SELECT 'articles', COUNT(*) FROM articles
  UNION ALL SELECT 'authors', COUNT(*) FROM authors
  UNION ALL SELECT 'opinion_articles', COUNT(*) FROM opinion_articles;
"

echo ""
echo "Migration complete. Dump kept at $DUMP_FILE for rollback."
echo ""
echo "Next steps:"
echo "  1. Set DATABASE_URL on Railway api-server to TARGET_URL."
echo "  2. Set DATABASE_URL on Vercel ajelsa to TARGET_URL."
echo "  3. Smoke-test: ./artifacts/api-server/scripts/smoke-test.sh against TARGET_URL."
echo "  4. Roll back: replay this script with SOURCE_URL=Railway, TARGET_URL=Neon"
echo "     (only if you haven't accepted writes on Railway yet)."
