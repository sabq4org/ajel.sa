/**
 * POST /api/staff/[id]/cover — upload cover (3:1 banner)
 *
 * Uses the shared upload chain (Cloudinary → Object Storage → R2 → local-FS).
 * Cloudinary applies the canonical 1500×500 banner crop; other destinations
 * store the buffer as-is.
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ok, badRequest, notFound, fromError, ensureAuth } from "@/lib/api";
import { sessionHasPermission } from "@/lib/auth";
import { uploadWithFallback } from "@/lib/uploadChain";
import { StorageQuotaError } from "@/lib/objectStorage";
import { logActivity, requestMeta } from "@/lib/activity";

const MAX_SIZE = 5 * 1024 * 1024;

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
        fileName: file.name || "cover",
        folder: "staff/covers",
        // Canonical cover size: 1500×500 (3:1 banner), auto-focus crop.
        // Applied by Cloudinary only; other destinations store as-is.
        cloudinaryTransform: {
          width: 1500,
          height: 500,
          crop: "fill",
          gravity: "auto",
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
      .set({ coverUrl: result.url, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, coverUrl: users.coverUrl });
    if (!row) return notFound("المنسوب غير موجود");

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "cover_changed",
      actorId: session.userId,
      actorName: session.fullName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ coverUrl: row.coverUrl });
  } catch (e) {
    return fromError(e);
  }
}
