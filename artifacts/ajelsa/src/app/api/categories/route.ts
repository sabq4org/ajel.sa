/**
 * /api/categories — list/create
 */
import { NextRequest } from "next/server";
import { db, categories, articles } from "@/lib/db";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, created, fromError, ensurePerm } from "@/lib/api";
import { arabicSlug } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  nameEn: z.string().max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#8c1d2b"),
  icon: z.string().max(50).optional(),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const items = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        nameEn: categories.nameEn,
        description: categories.description,
        parentId: categories.parentId,
        color: categories.color,
        icon: categories.icon,
        position: categories.position,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        articleCount: sql<number>`(select count(*)::int from ${articles} where ${articles.categoryId} = ${categories.id})`,
      })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name));
    return ok({ items });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePerm("articles.edit_any");
    const body = await req.json();
    const data = createSchema.parse(body);
    const slug = data.slug?.trim() || arabicSlug(data.name) || `cat-${Date.now().toString(36)}`;
    const [row] = await db
      .insert(categories)
      .values({
        slug,
        name: data.name,
        nameEn: data.nameEn,
        description: data.description,
        parentId: data.parentId ?? null,
        color: data.color,
        icon: data.icon,
        position: data.position,
        isActive: data.isActive,
      })
      .returning();
    return created({ category: row });
  } catch (e) {
    return fromError(e);
  }
}
