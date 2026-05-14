/**
 * /api/ai/key-points — استخراج 3-5 نقاط رئيسية من الخبر
 */

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePerm } from "@/lib/auth";

const SYSTEM_PROMPT = `أنت محرر صحفي خبير في صحيفة عاجل السعودية.

مهمتك: استخراج 3-5 نقاط رئيسية من الخبر.

📝 معايير النقاط:
- كل نقطة جملة واحدة قصيرة (15-25 كلمة)
- تركز على الأرقام والأسماء والقرارات والتواريخ
- بترتيب الأهمية (الأهم أولاً)
- بلغة فصحى واضحة
- بدون كلمات حشو

أعد النتيجة JSON بهذا الشكل فقط:
{ "points": ["...", "...", "..."] }`;

export async function POST(req: NextRequest) {
  try {
    try {
      await requirePerm("ai.key_points");
    } catch (e: any) {
      const status = e?.message === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: "ليس لديك صلاحية" }, { status });
    }
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ points: [] }, { status: 200 });
    }

    const client = new OpenAI({ apiKey });
    const { articleTitle, articleContent } = await req.json();

    if (!articleContent?.trim()) {
      return NextResponse.json({ error: "محتوى الخبر مطلوب" }, { status: 400 });
    }

    const plainContent = articleContent
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `📰 العنوان: ${articleTitle}\n\n📦 المحتوى:\n${plainContent}\n\nاستخرج 3-5 نقاط رئيسية بصيغة JSON.`,
        },
      ],
    });

    const raw = response.choices[0].message.content ?? "";
    const data = JSON.parse(raw);
    const points = Array.isArray(data.points) ? data.points.filter((p: any) => typeof p === "string") : [];

    return NextResponse.json({ points });
  } catch (e: any) {
    console.error("[key-points]", e);
    return NextResponse.json({ points: [] }, { status: 200 });
  }
}
