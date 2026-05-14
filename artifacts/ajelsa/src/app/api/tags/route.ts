/**
 * /api/tags — list/create
 */
import { NextRequest } from "next/server";
import { db, tags, articleTags } from "@/lib/db";
import { asc, eq, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { ok, created, fromError, ensurePerm } from "@/lib/api";
import { arabicSlug } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const items = await db
      .select({
        id: tags.id,
        slug: tags.slug,
        name: tags.name,
        description: tags.description,
        usageCount: tags.usageCount,
        createdAt: tags.createdAt,
        articleCount: sql<number>`(select count(*)::int from ${articleTags} where ${articleTags.tagId} = ${tags.id})`,
      })
      .from(tags)
      .orderBy(desc(tags.usageCount), asc(tags.name));
    return ok({ items });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePerm("articles.create");
    const body = await req.json();
    const data = createSchema.parse(body);
    const slug = data.slug?.trim() || arabicSlug(data.name) || `tag-${Date.now().toString(36)}`;
    const [row] = await db
      .insert(tags)
      .values({ slug, name: data.name, description: data.description })
      .returning();
    return created({ tag: row });
  } catch (e) {
    return fromError(e);
  }
}
