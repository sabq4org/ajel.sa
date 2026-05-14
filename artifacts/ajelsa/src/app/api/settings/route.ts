/**
 * /api/settings — site settings (key/value JSON store)
 */
import { NextRequest } from "next/server";
import { db, settings } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";
import { z } from "zod";

const KEYS = [
  "siteName",
  "siteTagline",
  "siteDescription",
  "siteUrl",
  "logoUrl",
  "faviconUrl",
  "contactEmail",
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "footerText",
  "showLivePulseBar",
];

const updateSchema = z.record(z.string(), z.any());

export async function GET() {
  try {
    const rows = await db.select().from(settings);
    const out: Record<string, unknown> = {};
    for (const r of rows) out[r.key] = r.value;
    // ensure all known keys exist
    for (const k of KEYS) if (!(k in out)) out[k] = "";
    return ok({ settings: out });
  } catch (e) {
    return fromError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensurePerm("settings.edit");
    const body = await req.json();
    const data = updateSchema.parse(body);
    for (const [k, v] of Object.entries(data)) {
      // upsert
      await db.execute(sql`
        insert into ${settings} (key, value, updated_at)
        values (${k}, ${JSON.stringify(v)}::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `);
    }
    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
