-- Staff Management — extend users + create user_activity
-- Idempotent: safe to re-run.

-- ── Extend users table ──
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" varchar(200);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slug" varchar(200);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "short_bio" varchar(280);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cover_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "custom_permissions" jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(40);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "alternate_email" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "job_title" varchar(200);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" varchar(120);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebook_handle" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "instagram_handle" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedin_handle" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "youtube_handle" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tiktok_handle" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "website_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "joined_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "left_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "internal_notes" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by" uuid;

-- Backfill joined_at from created_at for existing rows
UPDATE "users" SET "joined_at" = "created_at" WHERE "joined_at" IS NULL;

-- Backfill slugs from email local-part for existing rows that lack one
UPDATE "users"
SET "slug" = lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL OR "slug" = '';

-- De-dupe slugs by appending a short id suffix where collisions occur
WITH dups AS (
  SELECT id, slug,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM "users"
)
UPDATE "users" u
SET "slug" = u.slug || '-' || substring(u.id::text, 1, 4)
FROM dups
WHERE dups.id = u.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "users_slug_idx" ON "users" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "users_department_idx" ON "users" USING btree ("department");
CREATE INDEX IF NOT EXISTS "users_active_idx" ON "users" USING btree ("is_active");

-- ── user_activity table ──
CREATE TABLE IF NOT EXISTS "user_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "action" varchar(80) NOT NULL,
  "actor_id" uuid,
  "actor_name" varchar(200),
  "details" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_activity_user_id_fk'
      AND table_name = 'user_activity'
  ) THEN
    ALTER TABLE "user_activity"
      ADD CONSTRAINT "user_activity_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "user_activity_user_idx" ON "user_activity" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "user_activity_action_idx" ON "user_activity" USING btree ("action");
CREATE INDEX IF NOT EXISTS "user_activity_created_idx" ON "user_activity" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "user_activity_user_created_idx" ON "user_activity" USING btree ("user_id", "created_at");
