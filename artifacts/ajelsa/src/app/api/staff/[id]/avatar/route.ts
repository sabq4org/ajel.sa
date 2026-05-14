/**
 * POST /api/staff/[id]/avatar — upload avatar (square)
 *
 * Uses the shared upload chain (Cloudinary → Object Storage → R2 → local-FS)
 * so avatar upload works whenever any storage destination is configured.
 * Cloudinary applies the canonical 400×400 face-aware crop; other
 * destinations store the buffer as-is.
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ok, badRequest, notFound, fromError, ensureAuth } from "@/lib/api";
import { sessionHasPermission } from "@/lib/auth";
import { uploadWithFallback } from "@/lib/uploadChain";
import { StorageQuotaError } from "@/lib/objectStorage";
import { logActivity, requestMeta } from "@/lib/activity";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensureAuth();
    const { id } = await params;
    const isSelf = session.userId === id;
    const canEditAll = await sessionHasPermission(session, "staff.edit");
    const canSelf = await sessionHasPermission(session, "staff.edit_self");
    if (!canEditAll && !(isSelf && canSelf)) throw new Error("FORBIDDEN");

    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return badRequest("ملف مطلوب");
    if (!file.type.startsWith("image/")) return badRequest("يجب رفع صورة فقط");
    if (file.size > MAX_SIZE) return badRequest("الحجم الأقصى 5 ميجابايت");

    const buf = Buffer.from(await file.arrayBuffer());
    let result;
    try {
      result = await uploadWithFallback({
        buffer: buf,
        contentType: file.type,
        fileName: file.name || "avatar",
        folder: "staff/avatars",
        // Canonical avatar size: 400×400 square, face-aware crop.
        // Applied by Cloudinary only; other destinations store as-is.
        cloudinaryTransform: {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "face",
        },
      });
    } catch (e) {
      if (e instanceof StorageQuotaError) {
        return badRequest("مساحة التخزين وصلت للحد الأقصى. حاول لاحقاً أو احذف ملفات قديمة.");
      }
      throw e;
    }
    if (!result) return badRequest("تعذّر رفع الصورة، حاول مجدداً");

    const [row] = await db
      .update(users)
      .set({ avatarUrl: result.url, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, avatarUrl: users.avatarUrl });
    if (!row) return notFound("المنسوب غير موجود");

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "avatar_changed",
      actorId: session.userId,
      actorName: session.fullName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ avatarUrl: row.avatarUrl });
  } catch (e) {
    return fromError(e);
  }
}
