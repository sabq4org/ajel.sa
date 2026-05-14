/**
 * /api/ai/ask-article — اسأل الخبر
 * AI يجيب من محتوى الخبر فقط (RAG على خبر واحد)
 */

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `أنت مساعد ذكي في صحيفة عاجل السعودية.

⚠️ القاعدة الأساسية:
أجب فقط من محتوى الخبر المعطى لك. لا تستخدم معلومات خارجية مهما كان السؤال.

📝 أسلوب الإجابة:
- إجابة قصيرة جداً: 2-4 جمل كحد أقصى
- لغة فصحى سهلة وواضحة
- إذا السؤال خارج الخبر تماماً: قل "لم يتناول الخبر هذه النقطة"
- إذا الإجابة موجودة جزئياً: اذكر ما هو موجود واعترف بحدود الخبر
- بدون مقدمات أو خواتيم
- بدون قائمة نقاط (نص متصل)

🚫 ممنوع:
- لا تخمن، لا تضيف معلومات من معرفتك العامة
- لا تذكر مصادر خارجية
- لا تكرر السؤال`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "خدمة المساعد غير مفعلة حالياً" }, { status: 503 });
    }

    const client = new OpenAI({ apiKey });
    const { question, articleTitle, articleContent } = await req.json();

    if (!question?.trim() || !articleContent?.trim()) {
      return NextResponse.json({ error: "السؤال ومحتوى الخبر مطلوبان" }, { status: 400 });
    }

    if (question.length > 300) {
      return NextResponse.json({ error: "السؤال طويل جداً" }, { status: 400 });
    }

    // تنظيف محتوى الخبر من HTML
    const plainContent = articleContent
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const userMessage = `📰 عنوان الخبر:
${articleTitle}

📦 محتوى الخبر:
${plainContent}

❓ سؤال القارئ:
${question}

أجب من محتوى الخبر فقط، بإيجاز شديد (2-4 جمل).`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 250,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const answer = response.choices[0].message.content?.trim() ?? "تعذر الإجابة";

    return NextResponse.json({ answer });
  } catch (e: any) {
    console.error("[ask-article]", e);
    return NextResponse.json({ error: e.message ?? "خطأ في المساعد" }, { status: 500 });
  }
}
