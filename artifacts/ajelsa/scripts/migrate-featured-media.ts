/**
 * Migration: add articles.featured_media_id (FK -> media.id, ON DELETE SET NULL)
 * + index + backfill from articles.featured_image_url where it matches a media.url.
 *
 * Idempotent — safe to re-run.
 */

import postgres from "postgres";

async function main() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL or DATABASE_URL is not set");

  const sql = postgres(url, { ssl: "require", max: 1 });

  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(`
        ALTER TABLE articles
          ADD COLUMN IF NOT EXISTS featured_media_id uuid;
      `);

      // Add FK only if missing
      await tx.unsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'articles_featured_media_id_media_id_fk'
          ) THEN
            ALTER TABLE articles
              ADD CONSTRAINT articles_featured_media_id_media_id_fk
              FOREIGN KEY (featured_media_id)
              REFERENCES media(id)
              ON DELETE SET NULL;
          END IF;
        END $$;
      `);

      await tx.unsafe(`
        CREATE INDEX IF NOT EXISTS articles_featured_media_idx
          ON articles (featured_media_id);
      `);

      // Backfill: link articles whose URL matches an existing media row.
      const updated = await tx.unsafe(`
        UPDATE articles a
           SET featured_media_id = m.id
          FROM media m
         WHERE a.featured_media_id IS NULL
           AND a.featured_image_url IS NOT NULL
           AND a.featured_image_url = m.url
        RETURNING a.id
      `);
      console.log(`[migrate-featured-media] Linked ${updated.length} article(s) to existing media records.`);
    });

    console.log("[migrate-featured-media] OK");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[migrate-featured-media] FAILED:", err);
  process.exit(1);
});
