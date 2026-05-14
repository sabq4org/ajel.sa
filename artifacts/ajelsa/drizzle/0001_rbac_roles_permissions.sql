-- RBAC: roles, permissions, role_permissions + users.role_id FK
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(60) NOT NULL,
  "name_ar" varchar(100) NOT NULL,
  "name_en" varchar(100),
  "description" text,
  "level" integer DEFAULT 10 NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "roles_key_unique" UNIQUE("key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "roles_key_idx" ON "roles" USING btree ("key");
CREATE INDEX IF NOT EXISTS "roles_level_idx" ON "roles" USING btree ("level");

CREATE TABLE IF NOT EXISTS "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(80) NOT NULL,
  "category" varchar(40) NOT NULL,
  "label_ar" varchar(200) NOT NULL,
  "label_en" varchar(200),
  "description" text,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "permissions_key_unique" UNIQUE("key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_key_idx" ON "permissions" USING btree ("key");
CREATE INDEX IF NOT EXISTS "permissions_category_idx" ON "permissions" USING btree ("category");

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "role_permissions_pk" PRIMARY KEY ("role_id", "permission_id"),
  CONSTRAINT "role_permissions_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
  CONSTRAINT "role_permissions_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id");
CREATE INDEX IF NOT EXISTS "role_permissions_perm_idx" ON "role_permissions" USING btree ("permission_id");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_id_fk' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_role_id_fk"
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_role_id_idx" ON "users" USING btree ("role_id");
