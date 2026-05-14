/**
 * /api/ai/generate-image
 * واقعية  → Imagen 4 (Google)
 * رسومية  → DALL-E 3 (OpenAI) — أفضل نموذج للـ flat illustration
 *
 * Returns: { url, model, width, height, sizeKB }
 *   - `url` is a CDN URL (Cloudinary / Object Storage / R2). Never a data: URL.
 *   - `model` is a short label suitable for an admin caption
 *     (e.g. "DALL-E 3 HD" or "Imagen 4").
 *   - `width`/`height` are the actual pixel dimensions of the generated image
 *     (parsed from the raw bytes, not what the model claims).
 *   - `sizeKB` is the encoded payload size in kilobytes.
 *
 * If the returned aspect ratio is not within ~0.05 of 1.777 (16:9), the route
 * rejects the result with HTTP 502 so the client can surface a retry instead
 * of saving a wrong-shape image.
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { uploadFile, isR2Configured } from "@/lib/storage";
import { uploadToCloudinary, isCloudinaryReady } from "@/lib/cloudinary";
import { uploadToObjectStorage, isObjectStorageReady } from "@/lib/objectStorage";
import { db, media } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";

// 16:9 = 1.7777…  Allow a tiny tolerance for rounding/encoder quirks.
const TARGET_ASPECT = 16 / 9;
const ASPECT_TOLERANCE = 0.05;

export async function POST(req: NextRequest) {
  // ── 1. حماية: يحتاج صلاحية media.ai_generate ─────────────────────────
  let session: SessionPayload;
  try {
    session = await requirePerm("media.ai_generate");
  } catch (e: any) {
    const status = e?.message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: "ليس لديك صلاحية توليد الصور" }, { status });
  }

  // ── 2. قراءة الطلب ────────────────────────────────────────────────────
  let title = "", excerpt = "", category = "", style = "photorealistic";
  try {
    const body = await req.json();
    title    = body.title?.trim()    ?? "";
    excerpt  = body.excerpt?.trim()  ?? "";
    category = body.category?.trim() ?? "";
    style    = body.style?.trim()    || "photorealistic";
  } catch {
    return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "العنوان مطلوب لتوليد الصورة" }, { status: 400 });
  }

  const isIllustration = style === "illustration";

  // ── تفرقة النموذج حسب النمط ───────────────────────────────────────────
  if (isIllustration) {
    return generateIllustration({ title, excerpt, category }, session);
  } else {
    return generatePhoto({ title, excerpt, category }, session);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// رسومية — DALL-E 3 (OpenAI)
// ══════════════════════════════════════════════════════════════════════════
async function generateIllustration(
  { title, excerpt, category }: Record<string, string>,
  session: SessionPayload,
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ميزة توليد الصور الرسومية غير مفعّلة — يحتاج المشرف ضبط مفتاح OpenAI",
        code: "ai_unavailable",
        missing: "OPENAI_API_KEY",
      },
      { status: 503 }
    );
  }

  // لا نرسل عنوان الخبر للنموذج — فقط وصف الموضوع لتفادي كتابة العنوان داخل الصورة
  const visualSubject = excerpt || title;
  const topic = category ? `${visualSubject} (${category})` : visualSubject;

  // Structured "topic / style / quality / negative rules" prompt — gives
  // DALL-E 3 a clear, ordered list of constraints. The negative rules are
  // intentionally repeated and exhaustive because DALL-E often hallucinates
  // text into editorial illustrations otherwise.
  const prompt = `TOPIC:
${topic}

STYLE:
- Modern flat editorial illustration, vector aesthetic
- Clean geometric shapes, professional infographic look
- Soft pastel palette with subtle gradients and soft shadows
- 2D minimalist characters and icons where they help tell the story
- Light, friendly, contemporary aesthetic suitable for a Saudi Arabian news platform
- Balanced 16:9 horizontal composition, generous breathing room, no cropped subjects

QUALITY:
- Sharp vector-quality edges, crisp shapes, smooth gradients
- High level of detail in the illustration but no visual noise or grain
- Designed to fill the entire 16:9 frame edge-to-edge with no borders, frames, padding, or letterboxing

NEGATIVE RULES — ABSOLUTELY DO NOT INCLUDE:
- No text of any kind (no Arabic script, no English script, no other languages)
- No words, no letters, no numbers, no punctuation, no symbols
- No captions, no labels, no titles, no headlines, no slogans, no taglines
- No logos, no watermarks, no signatures, no credits
- No street signs, no billboards, no posters, no banners with text
- No newspapers, no documents, no papers with visible writing
- No TV screens, no phone screens, no computer screens displaying text
- No book covers, no menus, no price tags, no license plates
- No solid colored borders, no white margins, no letterbox bars`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        // 1792×1024 is DALL-E 3's native 16:9 size.
        size: "1792x1024",
        // HD doubles render time but produces noticeably crisper output —
        // worth it for editorial featured images.
        quality: "hd",
        style: "vivid",
        response_format: "b64_json",
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: `فشل الاتصال بـ DALL-E: ${e.message}` }, { status: 502 });
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `DALL-E رفض الطلب (${res.status}) — ${err.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json as string | undefined;
  if (!b64) {
    return NextResponse.json({ error: "لم يُرجع DALL-E صورة" }, { status: 422 });
  }

  return saveAndReturn(b64, "image/png", "png", session, "illustration", "DALL-E 3 HD");
}

// ══════════════════════════════════════════════════════════════════════════
// واقعية — Imagen 4 (Google)
// ══════════════════════════════════════════════════════════════════════════
async function generatePhoto(
  { title, excerpt, category }: Record<string, string>,
  session: SessionPayload,
) {
  const apiKey = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  ].map((k) => k?.trim()).find((k) => k && k.length > 10);

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ميزة توليد الصور الواقعية غير مفعّلة — يحتاج المشرف ضبط مفتاح Gemini",
        code: "ai_unavailable",
        missing: "GEMINI_API_KEY",
      },
      { status: 503 }
    );
  }

  // لا نرسل العنوان حرفياً — فقط وصف المشهد
  const visualSubject = excerpt || title;
  const topic = category ? `${visualSubject} (${category})` : visualSubject;

  // Structured "topic / style / quality / negative rules" prompt for Imagen 4.
  // Imagen 4 honours explicit negative guidance much better than Imagen 3 did,
  // so we lean on it heavily to suppress text artifacts in news photography.
  const prompt = `TOPIC:
${topic}

STYLE:
- Photorealistic professional news photograph, documentary photojournalism
- Natural realistic lighting and accurate skin tones
- Clean composition with a clear focal subject and uncluttered background
- Culturally authentic to Saudi Arabia and the wider Gulf region (clothing, architecture, environment)
- Balanced 16:9 horizontal framing, generous breathing room, no cropped or cut-off subjects

QUALITY:
- Sharp focus on the main subject, gentle natural depth of field
- Highest fidelity, fine detail, no compression artifacts, no over-sharpening
- Accurate colors, no oversaturation, no HDR halos
- Designed to fill the entire 16:9 frame edge-to-edge with no borders, frames, padding, or letterboxing

NEGATIVE RULES — ABSOLUTELY DO NOT INCLUDE:
- No text of any kind (no Arabic script, no English script, no other languages)
- No words, no letters, no numbers, no punctuation, no symbols
- No captions, no labels, no titles, no headlines, no slogans
- No logos, no watermarks, no signatures, no photo credits
- No street signs, no billboards, no posters, no banners with text
- No newspapers, no magazines, no documents, no papers with visible writing
- No TV screens, no phone screens, no laptop screens displaying text
- No book covers, no menus, no price tags, no license plates with readable characters
- No solid colored borders, no white margins, no letterbox bars
- No deformed faces, no extra limbs, no fused fingers, no anatomical errors
- No cartoon/illustration look — must be a real-looking photograph`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          // sampleCount=1 keeps quotas predictable.
          // aspectRatio "16:9" produces ~1408×768 on Imagen 4 (the largest 16:9
          // variant the API currently emits).
          // sampleImageSize "2K" requests Imagen 4's highest-resolution output
          // when available — falls back gracefully if the deployment hasn't
          // enabled it yet (the response just comes back at the standard size).
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            sampleImageSize: "2K",
          },
        }),
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: `فشل الاتصال بـ Imagen 4: ${e.message}` }, { status: 502 });
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Imagen 4 رفض الطلب (${res.status}) — ${err.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const prediction = data?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    return NextResponse.json({ error: "لم يُرجع Imagen 4 صورة — جرب عنواناً مختلفاً" }, { status: 422 });
  }

  return saveAndReturn(
    prediction.bytesBase64Encoded,
    prediction.mimeType ?? "image/jpeg",
    "jpg",
    session,
    "photo",
    "Imagen 4",
  );
}

// ══════════════════════════════════════════════════════════════════════════
// قراءة أبعاد الصورة من البايتات (PNG / JPEG) — بدون أي مكتبة خارجية
// ══════════════════════════════════════════════════════════════════════════
function readImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG — magic 89 50 4E 47 0D 0A 1A 0A, then IHDR chunk at offset 8 starts
  // with [4 bytes length][4 bytes "IHDR"][4 bytes width BE][4 bytes height BE].
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
  }

  // JPEG — magic FF D8 FF. Walk the markers until we hit a SOFn frame.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 9) {
      if (buf[offset] !== 0xff) {
        // Out of sync — bail rather than risk reading garbage.
        return null;
      }
      // Skip fill bytes (0xFF run-on).
      while (offset < buf.length && buf[offset] === 0xff) offset++;
      const marker = buf[offset];
      offset++;

      // Standalone markers (no length): RST0..7 (D0..D7), SOI (D8), EOI (D9), TEM (01)
      if (marker === 0xd9 || marker === 0xda) return null;
      if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;

      if (offset + 1 >= buf.length) return null;
      const segLen = buf.readUInt16BE(offset);

      // SOF0..SOF15, excluding DHT(C4), JPG(C8), DAC(CC) → frame headers.
      const isSof =
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        // SOFn payload: [precision:1][height:2 BE][width:2 BE]…
        if (offset + 7 >= buf.length) return null;
        const height = buf.readUInt16BE(offset + 3);
        const width = buf.readUInt16BE(offset + 5);
        if (width > 0 && height > 0) return { width, height };
        return null;
      }

      offset += segLen;
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// حفظ الصورة وإرجاع الـ URL
// ══════════════════════════════════════════════════════════════════════════
async function saveAndReturn(
  base64: string,
  mime: string,
  ext: string,
  session: SessionPayload,
  kind: "illustration" | "photo",
  modelLabel: string,
): Promise<NextResponse> {
  const buffer = Buffer.from(base64, "base64");

  // ── ① تحقق من أبعاد ونسبة العرض إلى الارتفاع قبل أي رفع ──────────────
  // We parse dimensions from the raw bytes (not from what the model claims)
  // so we catch any size mismatch — e.g. an Imagen 4 deployment that doesn't
  // honour `aspectRatio: "16:9"` and silently returns a square image.
  const dims = readImageDimensions(buffer);
  if (!dims) {
    console.error(
      `[generate-image] ${modelLabel} returned a buffer we couldn't parse (mime=${mime}, bytes=${buffer.length})`,
    );
    return NextResponse.json(
      { error: "تعذّر قراءة أبعاد الصورة، حاول مجدداً", code: "invalid_image" },
      { status: 502 },
    );
  }

  const aspect = dims.width / dims.height;
  if (Math.abs(aspect - TARGET_ASPECT) > ASPECT_TOLERANCE) {
    // Reject anything that isn't close to 16:9 — saving it would look wrong
    // in the 16:9 frames on the public site.
    console.warn(
      `[generate-image] rejected ${modelLabel} result with bad aspect ratio: ${dims.width}×${dims.height} → aspect=${aspect.toFixed(3)} (target=${TARGET_ASPECT.toFixed(3)})`,
    );
    return NextResponse.json(
      {
        error: `الصورة المُولَّدة لم تأتِ بنسبة 16:9 (الأبعاد: ${dims.width}×${dims.height}) — جرّب مرة أخرى`,
        code: "wrong_aspect_ratio",
      },
      { status: 502 },
    );
  }

  const sizeKB = Math.round(buffer.length / 1024);

  // Single structured log line per successful generation — easy to grep.
  console.log(
    `[generate-image] ok model=${modelLabel} kind=${kind} ${dims.width}x${dims.height} ${sizeKB}KB aspect=${aspect.toFixed(3)}`,
  );

  const attempted: string[] = [];
  let url: string | null = null;
  let key: string | null = null;
  let storageSource: "cloudinary" | "object_storage" | "r2" | "local" | null = null;
  const fileName = `ai-${kind}-${Date.now()}.${ext}`;

  // ② Cloudinary — التفضيل الأول
  if (isCloudinaryReady()) {
    attempted.push("Cloudinary");
    try {
      url = await uploadToCloudinary(buffer, "ai-generated");
      key = url.split("/").slice(-2).join("/");
      storageSource = "cloudinary";
    } catch (e: any) {
      console.error("[generate-image] Cloudinary upload failed:", e.message);
    }
  }

  // ③ Replit Object Storage — التفضيل الثاني
  if (url === null && isObjectStorageReady()) {
    attempted.push("Object Storage");
    try {
      url = await uploadToObjectStorage(buffer, mime, fileName);
      key = url;
      storageSource = "object_storage";
    } catch (e: any) {
      console.error("[generate-image] Object Storage upload failed:", e.message);
    }
  }

  // ④ R2 — التفضيل الثالث (نتحقق صراحةً من R2 لئلا نسقط إلى التخزين المحلي)
  if (url === null && isR2Configured()) {
    attempted.push("R2");
    try {
      const result = await uploadFile(buffer, { folder: "ai-generated", extension: ext, contentType: mime });
      url = result.url;
      key = result.key;
      storageSource = "r2";
    } catch (e: any) {
      console.error("[generate-image] R2 upload failed:", e.message);
    }
  }

  // ⑤ لا يوجد مكان للحفظ — نرجع خطأ واضح بدلاً من data: URL وهمية
  if (url === null || key === null || storageSource === null) {
    console.error(
      "[generate-image] No storage destination succeeded.",
      attempted.length === 0
        ? "No storage providers configured."
        : `Tried: ${attempted.join(", ")}`,
    );
    return NextResponse.json(
      {
        error: "تعذّر حفظ الصورة، حاول مجدداً",
        code: "storage_unavailable",
      },
      { status: 503 },
    );
  }

  // ⑥ سجّل الصورة في مكتبة الوسائط لتظهر في /admin/media وتُتتبَّع للحذف
  try {
    await db.insert(media).values({
      filename: key,
      originalFilename: fileName,
      url,
      mimeType: mime,
      sizeBytes: buffer.length,
      storageSource,
      uploadedBy: session.userId,
      altText:
        kind === "photo"
          ? "صورة مولدة بالذكاء الاصطناعي"
          : "رسم توضيحي مولد بالذكاء الاصطناعي",
    });
  } catch (e: any) {
    // فشل التسجيل في DB لا يمنع إرجاع الـ URL — الصورة محفوظة فعلاً
    // اطبع الـ key للتمكن من التنظيف اليدوي إذا لزم
    console.error(
      `[generate-image] Failed to record media row (file saved at ${storageSource}: ${key}):`,
      e.message,
    );
  }

  return NextResponse.json({
    url,
    model: modelLabel,
    width: dims.width,
    height: dims.height,
    sizeKB,
  });
}
