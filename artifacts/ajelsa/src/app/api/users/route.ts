/**
 * /api/users — list/create
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { ok, created, fromError, ensurePerm } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "8 أحرف على الأقل"),
  fullName: z.string().min(2).max(200),
  bio: z.string().optional(),
  twitterHandle: z.string().max(50).optional(),
  role: z.enum(["super_admin", "editor_in_chief", "editor", "writer", "contributor"]).default("writer"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await ensurePerm("users.view");
    const items = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        twitterHandle: users.twitterHandle,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    return ok({ items });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePerm("users.create");
    const body = await req.json();
    const data = createSchema.parse(body);
    const passwordHash = await hashPassword(data.password);
    const [row] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        bio: data.bio,
        twitterHandle: data.twitterHandle,
        role: data.role,
        isActive: data.isActive,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });
    return created({ user: row });
  } catch (e) {
    return fromError(e);
  }
}
