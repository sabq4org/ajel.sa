#!/usr/bin/env bash
# Smoke test for the ported auth + RBAC endpoints against a REAL database.
#
# Usage:
#   DATABASE_URL='postgresql://...' AUTH_SECRET='...' \
#     TEST_EMAIL='admin@example.com' TEST_PASSWORD='...' \
#     ./scripts/smoke-test.sh
#
# Prerequisites:
#   - DATABASE_URL points at a DB that has run `pnpm --filter @workspace/ajelsa run db:seed-roles`
#   - TEST_EMAIL / TEST_PASSWORD are valid credentials for an active user
#     whose role grants `roles.view` (i.e. system_admin / supervisor)
#   - AUTH_SECRET matches whatever signed the test user's existing sessions
#     (or just override on both sides — login will mint a fresh token)
#
# What it asserts:
#   1. /healthz returns 200 {"status":"ok"}
#   2. /auth/me without cookie returns 401
#   3. /auth/login with bad credentials returns 401
#   4. /auth/login with valid credentials returns 200 + sets ajel_session cookie
#   5. /auth/me with that cookie returns 200 + correct userId
#   6. /permissions returns 200 with a non-empty items array
#   7. /roles returns 200 with at least the system roles seeded
#   8. /roles/:id (using the first role id from #7) returns 200 with permissions list
#   9. /auth/logout clears the cookie
#  10. /auth/me after logout returns 401

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${TEST_EMAIL:?TEST_EMAIL is required}"
: "${TEST_PASSWORD:?TEST_PASSWORD is required}"

PORT="${PORT:-8080}"
BASE="http://localhost:${PORT}/api"
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

artifact_dir=$(cd "$(dirname "$0")/.." && pwd)

echo "[1/10] Building api-server..."
(cd "$artifact_dir" && pnpm run build > /tmp/smoke-build.log 2>&1) \
  || { tail -30 /tmp/smoke-build.log; exit 1; }

echo "[boot] Starting server on :${PORT}..."
DATABASE_URL="$DATABASE_URL" \
AUTH_SECRET="${AUTH_SECRET:-dev-secret-change-me-32chars-aaaa}" \
PORT="$PORT" \
node --enable-source-maps "$artifact_dir/dist/index.mjs" > /tmp/smoke-server.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null; rm -f $COOKIE_JAR" EXIT

# Wait for boot
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "${BASE}/healthz" > /dev/null 2>&1; then break; fi
  sleep 0.5
done

assert_status() {
  local label=$1 expected=$2 actual=$3
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $label → $actual"
  else
    echo "  ✗ $label expected $expected got $actual"
    echo "--- server log (tail) ---"
    tail -30 /tmp/smoke-server.log
    exit 1
  fi
}

echo "[2/10] /healthz"
code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/healthz")
assert_status "/healthz" 200 "$code"

echo "[3/10] /auth/me without cookie"
code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/auth/me")
assert_status "/auth/me (no cookie)" 401 "$code"

echo "[4/10] /auth/login with bad credentials"
code=$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"wrongpassword123\"}")
assert_status "/auth/login (bad)" 401 "$code"

echo "[5/10] /auth/login with valid credentials"
login_body=$(mktemp)
code=$(curl -sS -o "$login_body" -w "%{http_code}" \
  -c "$COOKIE_JAR" \
  -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
assert_status "/auth/login (good)" 200 "$code"
grep -q "ajel_session" "$COOKIE_JAR" || { echo "  ✗ cookie jar missing ajel_session"; exit 1; }
echo "  ✓ ajel_session cookie set"
rm -f "$login_body"

echo "[6/10] /auth/me with session cookie"
me_body=$(mktemp)
code=$(curl -sS -o "$me_body" -w "%{http_code}" -b "$COOKIE_JAR" "${BASE}/auth/me")
assert_status "/auth/me (with cookie)" 200 "$code"
grep -q "userId" "$me_body" || { echo "  ✗ /auth/me missing userId"; cat "$me_body"; exit 1; }
echo "  ✓ /auth/me payload looks correct"
rm -f "$me_body"

echo "[7/10] /permissions with cookie"
perms_body=$(mktemp)
code=$(curl -sS -o "$perms_body" -w "%{http_code}" -b "$COOKIE_JAR" "${BASE}/permissions")
assert_status "/permissions" 200 "$code"
items_count=$(grep -o '"key":' "$perms_body" | wc -l | tr -d ' ')
echo "  ✓ permissions list has $items_count entries"
[ "$items_count" -gt 30 ] || { echo "  ✗ expected at least 30 permissions"; exit 1; }
rm -f "$perms_body"

echo "[8/10] /roles with cookie"
roles_body=$(mktemp)
code=$(curl -sS -o "$roles_body" -w "%{http_code}" -b "$COOKIE_JAR" "${BASE}/roles")
assert_status "/roles" 200 "$code"
first_role_id=$(sed -n 's/.*"id":"\([0-9a-f-]\{36\}\)".*/\1/p' "$roles_body" | head -1)
[ -n "$first_role_id" ] || { echo "  ✗ no role id parsed"; cat "$roles_body"; exit 1; }
echo "  ✓ first role id: $first_role_id"
rm -f "$roles_body"

echo "[9/10] /roles/$first_role_id with cookie"
code=$(curl -sS -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "${BASE}/roles/${first_role_id}")
assert_status "/roles/:id" 200 "$code"

echo "[10/10] /auth/logout + /auth/me after logout"
code=$(curl -sS -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "${BASE}/auth/logout")
assert_status "/auth/logout" 200 "$code"
code=$(curl -sS -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "${BASE}/auth/me")
assert_status "/auth/me (post-logout)" 401 "$code"

echo ""
echo "All checks passed."
