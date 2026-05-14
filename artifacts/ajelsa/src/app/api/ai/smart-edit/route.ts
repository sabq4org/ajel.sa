import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePerm } from "@/lib/auth";

// ── Post-processing rules ─────────────────────────────────────────────────
function trimTitle(text: string, maxWords = 20, maxChars = 120): string {
  const words = text.trim().split(/\s+/).slice(0, maxWords).join(" ");
  if (words.length <= maxChars) return words;
  let cut = words.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

function trimSubtitle(text: string): string {
  return text.trim().split(/\s+/).slice(0, 10).join(" ");
}

// ── System prompts ────────────────────────────────────────────────────────
const SYSTEM_SMART = `🎯 الدور: أنت محرر خبير في صحيفة "عاجل" الإلكترونية السعودية، متخصص في كتابة الأخبار بأسلوب صحفي احترافي وسهل الفهم، يدعم تحسين محركات البحث (SEO) ويجذب القارئ العربي.

⚠️ تعليمات أساسية:
- اقرأ المحتوى كاملاً من أوله إلى آخره قبل كتابة أي شيء.
- حدد جميع النقاط المهمة (القرارات، الأرقام، الأسماء، التواريخ، التفاصيل الفريدة).
- اختر الزاوية الأقوى للعنوان الرئيسي — قد تكون في المنتصف أو النهاية!

✳️ المطلوب:

1. main_title — العنوان الرئيسي:
   - 15-20 كلمة، 120 حرفاً كحد أقصى
   - يبدأ بفعل قوي أو اسم فاعل
   - جذّاب، شامل، بدون ":" أو "..."
   - يتضمن كلمة مفتاحية رئيسية

2. sub_title — العنوان الفرعي:
   - 6-10 كلمات فقط، معلومة إضافية واحدة
   - لا يكرر العنوان الرئيسي

3. smart_summary — الموجز:
   - فقرة واحدة، 35-50 كلمة
   - فصحى سلسة، حقائق واضحة

4. keywords — الكلمات المفتاحية:
   - 6-10 كلمات/عبارات للـ SEO

5. seo:
   - meta_title: 55-60 حرفاً
   - meta_description: 140-155 حرفاً

6. suggested_category — اختر واحداً:
   "politics" | "economy" | "sports" | "technology" | "entertainment" | "health" | "world" | "local" | "education" | "environment" | "saudi-arabia" | "middle-east"

أعد النتيجة بصيغة JSON فقط:
{
  "main_title": "",
  "sub_title": "",
  "smart_summary": "",
  "keywords": [],
  "seo": { "meta_title": "", "meta_description": "" },
  "suggested_category": ""
}`;

const SYSTEM_REWRITE = `🎯 الدور: محرر صحفي محترف في صحيفة "عاجل" السعودية، متخصص في إعادة صياغة الأخبار.

✳️ مهمتك: إعادة تحرير المحتوى مع الحفاظ على جميع الحقائق والأرقام والأسماء.

📝 معايير:
- الهرم المقلوب (الأهم أولاً)
- فقرات قصيرة 3-4 جمل
- فعل مبني للمعلوم
- لا حشو، لا تكرار
- أجب على: من؟ ماذا؟ متى؟ أين؟ لماذا؟

⚠️ ممنوعات: لا تضف معلومات جديدة، لا تغير الأرقام، لا رأي شخصي.

JSON فقط:
{ "enhanced_content": "HTML بفقرات <p>", "improvements_summary": ["..."] }`;

const SYSTEM_FULL_EDIT = `🎯 الدور: أنت محرر صحفي خبير في صحيفة "عاجل" الإلكترونية السعودية، عملت أكثر من 20 سنة في تحرير الأخبار. تتقن الصياغة الصحفية الاحترافية، الهرم المقلوب، وكتابة العناوين الجاذبة.

🎯 مهمتك المزدوجة:

الأولى — تحرير النص:
- أعد صياغة نص الخبر بأسلوب صحفي احترافي
- حافظ على جميع الحقائق والأرقام والأسماء دون تغيير
- استخدم الهرم المقلوب: الأهم أولاً
- فقرات قصيرة (3-4 جمل لكل فقرة)
- أفعال مبنية للمعلوم
- لا حشو ولا تكرار
- اكتب بفصحى سلسة يفهمها القارئ السعودي
- أرجع النص بصيغة HTML فقرات <p>

🚨 قاعدة صارمة: لا تخترع أي معلومة. كل كلمة يجب أن تكون من النص الأصلي.

الثانية — استخراج العناصر التحريرية:
main_title: 15-20 كلمة، يبدأ بفعل قوي، جذّاب، كلمة مفتاحية رئيسية، لا ":" أو "..."
sub_title: 6-10 كلمات، معلومة إضافية واحدة، لا يكرر العنوان
smart_summary: فقرة 35-50 كلمة، فصحى سلسة، حقائق واضحة
keywords: 6-10 كلمات/عبارات للـ SEO
seo.meta_title: 55-60 حرف
seo.meta_description: 140-155 حرف
suggested_category: واحد من: politics|economy|sports|technology|entertainment|health|world|local|education|environment|saudi-arabia|middle-east

أعد النتيجة بـ JSON فقط:
{
  "edited_content": "<p>...</p>",
  "main_title": "",
  "sub_title": "",
  "smart_summary": "",
  "keywords": [],
  "seo": { "meta_title": "", "meta_description": "" },
  "suggested_category": "",
  "improvements_summary": ["تحسين 1", "تحسين 2"]
}`;

const SYSTEM_TITLES = `أنت محرر عناوين خبير في صحيفة "عاجل". قواعد صارمة:
- اقرأ كل النص قبل الكتابة
- 15-20 كلمة أو 120 حرف كحد أقصى
- يبدأ بفعل قوي أو اسم فاعل
- بدون ":" أو "..." أو أقواس
- كل عنوان يركز على زاوية مختلفة
- لا تكرر نفس الكلمات بين العناوين

أعد مصفوفة JSON من 3 عناوين فقط: ["عنوان 1", "عنوان 2", "عنوان 3"]`;

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await requirePerm("ai.smart_edit");
  } catch (e: any) {
    const status = e?.message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: "ليس لديك صلاحية" }, { status });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY غير مضبوط في متغيرات البيئة" }, { status: 500 });
  }

  try {
    const client = new OpenAI({ apiKey });
    const { content, mode = "smart" } = await req.json();

    if (!content || content.trim().length < 30) {
      return NextResponse.json({ error: "النص قصير جداً — أضف محتوى الخبر أولاً" }, { status: 400 });
    }

    // ── SMART EDIT (default) ──────────────────────────────────────────────
    if (mode === "smart") {
      const response = await client.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 2048,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_SMART },
          { role: "user", content: `📦 النص:\n\n${content}\n\nولّد جميع العناصر بصيغة JSON.` },
        ],
      });

      const raw = response.choices[0].message.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("لم يُرجع النموذج JSON صحيح");

      const data = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        main_title: trimTitle(data.main_title ?? ""),
        sub_title: trimSubtitle(data.sub_title ?? ""),
        smart_summary: data.smart_summary ?? "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        seo: {
          meta_title: (data.seo?.meta_title ?? "").slice(0, 60),
          meta_description: (data.seo?.meta_description ?? "").slice(0, 160),
        },
        suggested_category: data.suggested_category ?? "",
      });
    }

    // ── FULL EDIT (one-shot: rewrite text + extract all editorial fields) ─
    if (mode === "full_edit") {
      const response = await client.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 6000,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_FULL_EDIT },
          {
            role: "user",
            content: `📦 نص الخبر:\n\n${content}\n\nأنجز المهمة المزدوجة وأعد JSON.`,
          },
        ],
      });

      const raw = response.choices[0].message.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("لم يُرجع النموذج JSON صحيح");

      const data = JSON.parse(jsonMatch[0]);

      return NextResponse.json({
        edited_content: data.edited_content ?? "",
        main_title: trimTitle(data.main_title ?? ""),
        sub_title: trimSubtitle(data.sub_title ?? ""),
        smart_summary: data.smart_summary ?? "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        seo: {
          meta_title: (data.seo?.meta_title ?? "").slice(0, 60),
          meta_description: (data.seo?.meta_description ?? "").slice(0, 160),
        },
        suggested_category: data.suggested_category ?? "",
        improvements_summary: Array.isArray(data.improvements_summary)
          ? data.improvements_summary
          : [],
      });
    }

    // ── REWRITE ───────────────────────────────────────────────────────────
    if (mode === "rewrite") {
      const response = await client.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_REWRITE },
          { role: "user", content: `📦 المحتوى:\n\n${content}\n\nأعد التحرير بصيغة JSON.` },
        ],
      });

      const raw = response.choices[0].message.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("لم يُرجع النموذج JSON صحيح");

      const data = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        enhanced_content: data.enhanced_content ?? "",
        improvements_summary: Array.isArray(data.improvements_summary) ? data.improvements_summary : [],
      });
    }

    // ── TITLES ────────────────────────────────────────────────────────────
    if (mode === "titles") {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_TITLES },
          {
            role: "user",
            content: `اقترح 3 عناوين مختلفة. مصفوفة JSON فقط.\n\nالخبر:\n${content}`,
          },
        ],
      });

      const raw = response.choices[0].message.content ?? "";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("لم يُرجع النموذج JSON صحيح");

      const titles: string[] = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ titles: titles.map(t => trimTitle(t)) });
    }

    return NextResponse.json({ error: "mode غير معروف" }, { status: 400 });
  } catch (e: any) {
    console.error("[ai/smart-edit]", e);
    return NextResponse.json({ error: e.message ?? "خطأ في الذكاء الاصطناعي" }, { status: 500 });
  }
}
