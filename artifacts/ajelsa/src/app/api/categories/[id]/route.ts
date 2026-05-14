/**
 * /api/categories/[id] — get/update/delete
 */
import { NextRequest } from "next/server";
import { db, categories, articles } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, noContent, notFound, conflict, fromError, ensurePerm } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameEn: z.string().max(100).optional().nullable(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  icon: z.string().max(50).optional().nullable(),
  position: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!row) return notFound("القسم غير موجود");
  return ok({ category: row });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("articles.edit_any");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const [row] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!row) return notFound("القسم غير موجود");
    return ok({ category: row });
  } catch (e) {
    return fromError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("articles.delete_any");
    const { id } = await params;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(eq(articles.categoryId, id));
    if (count > 0) {
      return conflict(`لا يمكن حذف القسم — يحتوي على ${count} خبر`);
    }
    await db.delete(categories).where(eq(categories.id, id));
    return noContent();
  } catch (e) {
    return fromError(e);
  }
}
