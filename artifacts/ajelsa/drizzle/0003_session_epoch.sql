-- Session Epoch — adds a per-user revocation counter.
-- The current value is embedded in the JWT at login. getSession() compares
-- the JWT's epoch against the DB and returns null on mismatch, which lets
-- "force logout" and password reset invalidate existing cookies immediately.
-- Idempotent: safe to re-run.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "session_epoch" integer DEFAULT 0 NOT NULL;
