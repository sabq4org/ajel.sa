/**
 * /api/tags/[id] — update/delete
 */
import { NextRequest } from "next/server";
import { db, tags } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, noContent, notFound, fromError, ensurePerm } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("articles.edit_any");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const [row] = await db.update(tags).set(data).where(eq(tags.id, id)).returning();
    if (!row) return notFound("الوسم غير موجود");
    return ok({ tag: row });
  } catch (e) {
    return fromError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("articles.edit_any");
    const { id } = await params;
    await db.delete(tags).where(eq(tags.id, id));
    return noContent();
  } catch (e) {
    return fromError(e);
  }
}
