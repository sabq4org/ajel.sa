/**
 * /api/ai/daily-brief — نشرة AI لأهم 5 أحداث اليوم
 */

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePerm } from "@/lib/auth";

const SYSTEM_PROMPT = `أنت مذيع نشرة أخبار في صحيفة عاجل السعودية.

مهمتك: كتابة نشرة موحدة من 4-5 جمل فقط تربط أهم الأخبار اليوم.

📝 المعايير:
- فقرة واحدة متصلة (ليس قائمة نقاط)
- 60 ثانية قراءة كحد أقصى (~80-100 كلمة)
- لغة فصحى راقية واضحة
- ربط الأحداث بأسلوب طبيعي (في حين، بينما، إلى جانب ذلك...)
- ابدأ بـ: "في نشرة اليوم..." أو "تتصدر اليوم..."
- بدون تمهيد أو تذييل

أعد JSON فقط:
{ "brief": "..." }`;

export async function POST(req: NextRequest) {
  try {
    try {
      await requirePerm("ai.daily_brief");
    } catch (e: any) {
      const status = e?.message === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: "ليس لديك صلاحية" }, { status });
    }
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ brief: "" }, { status: 200 });
    }

    const client = new OpenAI({ apiKey });
    const { articles } = await req.json();

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ brief: "" }, { status: 200 });
    }

    const articlesList = articles
      .slice(0, 5)
      .map((a: any, i: number) => `${i + 1}. ${a.title}${a.excerpt ? `\n   ${a.excerpt}` : ""}`)
      .join("\n\n");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 350,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `أهم أخبار اليوم:\n\n${articlesList}\n\nاكتب نشرة موحدة في فقرة واحدة (4-5 جمل).`,
        },
      ],
    });

    const raw = response.choices[0].message.content ?? "";
    const data = JSON.parse(raw);
    const brief = typeof data.brief === "string" ? data.brief : "";

    return NextResponse.json({ brief });
  } catch (e: any) {
    console.error("[daily-brief]", e);
    return NextResponse.json({ brief: "" }, { status: 200 });
  }
}
