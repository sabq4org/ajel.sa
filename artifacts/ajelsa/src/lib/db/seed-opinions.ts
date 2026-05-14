/**
 * Seed for مقالات الرأي — 5 columnists + 5 opinion pieces.
 * Idempotent: skips inserts when records already exist (by slug).
 *
 * Run: pnpm --filter @workspace/ajelsa exec tsx src/lib/db/seed-opinions.ts
 */

import { db, authors, opinionArticles } from "./index";
import { eq } from "drizzle-orm";
import { arabicSlug, readingTimeMinutes, stripHtml } from "@/lib/utils";

const COLUMNISTS = [
  {
    fullName: "د. خالد الحريري",
    position: "كاتب اقتصادي · مستشار تخطيط استراتيجي",
    shortBio: "متخصص في السياسات الاقتصادية الكلية ورؤية 2030.",
    bio: "أكاديمي وكاتب اقتصادي، شغل سابقًا مواقع استشارية في عدد من الجهات الحكومية. تتركز كتاباته على تحليل السياسات المالية، وتنويع مصادر الدخل، ودور القطاع الخاص في التحول الاقتصادي السعودي.",
    twitter: "k_alhariri",
    avatarUrl: null,
  },
  {
    fullName: "أ. منى الزهراني",
    position: "كاتبة في الشؤون الاجتماعية",
    shortBio: "تكتب عن قضايا المرأة والأسرة والمجتمع المعاصر.",
    bio: "كاتبة وباحثة اجتماعية، لها مساهمات في عدد من الصحف الخليجية. تعنى مقالاتها بالتحولات الاجتماعية في المملكة، وقضايا تمكين المرأة، والأبوة الواعية في عصر التقنية.",
    twitter: "mona_alzahrani",
    avatarUrl: null,
  },
  {
    fullName: "د. عبدالله القحطاني",
    position: "محلل سياسي · أستاذ العلاقات الدولية",
    shortBio: "متخصص في الشؤون الإقليمية والعلاقات الخليجية.",
    bio: "أستاذ جامعي ومحلل سياسي، يشارك بانتظام في النقاشات حول مستقبل المنطقة. يكتب عن الدبلوماسية السعودية، وتوازنات الأمن الإقليمي، وتحولات النظام الدولي.",
    twitter: "a_alqahtani",
    avatarUrl: null,
  },
  {
    fullName: "أ. ريم العتيبي",
    position: "كاتبة تقنية · مهتمة بالذكاء الاصطناعي",
    shortBio: "تكتب عن مستقبل التقنية في المملكة والعالم العربي.",
    bio: "كاتبة متخصصة في الشؤون التقنية، شاركت في عدد من المؤتمرات حول الذكاء الاصطناعي وريادة الأعمال الرقمية. تركز كتاباتها على الفجوة الرقمية، وأخلاقيات التقنية، وحوكمة البيانات.",
    twitter: "reem_alotaibi",
    avatarUrl: null,
  },
  {
    fullName: "أ. سعد الشمري",
    position: "كاتب رياضي · محرر تحليلي سابق",
    shortBio: "تحليلات ومقالات في عوالم كرة القدم السعودية والعالمية.",
    bio: "صحفي رياضي مخضرم، عمل في عدد من المنصات الرياضية. تتميز كتاباته بالتحليل التكتيكي وقراءة المشهد الإداري للأندية، خصوصًا في الدوري السعودي للمحترفين.",
    twitter: "saad_alshamri",
    avatarUrl: null,
  },
];

type SeedOpinion = {
  authorIndex: number;
  title: string;
  subtitle?: string;
  excerpt: string;
  contentHtml: string;
  isFeatured?: boolean;
};

const OPINIONS: SeedOpinion[] = [
  {
    authorIndex: 0,
    title: "الاقتصاد السعودي 2026: من النمو الكمي إلى الجودة الإنتاجية",
    subtitle: "كيف تنتقل المملكة إلى المرحلة التالية من التحول؟",
    excerpt: "بلغ الاقتصاد السعودي محطة فارقة، تستوجب الانتقال من قياس النمو بالأرقام المطلقة إلى قياسه بجودة المخرجات الإنتاجية واستدامتها.",
    contentHtml: `
      <p>لم يعد كافيًا الحديث عن نسب النمو الإجمالي للناتج المحلي بمعزل عن جودة هذا النمو ومصادره الحقيقية. الاقتصاد السعودي اليوم في مرحلة دقيقة، يُطلب منها أن تنتقل من النمو الكمي القائم على الإنفاق الحكومي والتدفقات النفطية، إلى نمو نوعي قائم على الإنتاجية والابتكار وتوسع القطاع الخاص.</p>
      <h3>تحدي الإنتاجية</h3>
      <p>الإحصاءات تشير إلى أن إنتاجية العامل في القطاعات غير النفطية لا تزال أقل من المعدلات المستهدفة في رؤية 2030. ومعالجة هذه الفجوة لا تتحقق فقط بضخ المزيد من رؤوس الأموال، بل بإصلاحات هيكلية تطال التعليم وسوق العمل ومنظومة الابتكار.</p>
      <h3>دور القطاع الخاص</h3>
      <p>المرحلة المقبلة تتطلب قطاعًا خاصًا لا يكتفي بدور المنفذ للمشاريع الحكومية، بل يقود الاستثمار في القطاعات التصديرية ذات القيمة المضافة العالية. وهذا يستلزم بيئة تنظيمية مرنة، وحوافز ذكية، وتمويلًا مغامرًا.</p>
      <h3>خلاصة</h3>
      <p>الانتقال من النمو الكمي إلى الجودة الإنتاجية ليس خيارًا، بل هو الطريق الوحيد لاستدامة المنجزات وتعميقها في العقد المقبل.</p>
    `,
    isFeatured: true,
  },
  {
    authorIndex: 1,
    title: "الأسرة السعودية في زمن الشاشات: تحدي إعادة الاتصال",
    excerpt: "تواجه الأسرة السعودية تحديًا جديدًا لا يقل عن تحديات الأجيال السابقة: كيف تحافظ على التواصل العميق في ظل هيمنة الشاشات على التفاصيل اليومية.",
    contentHtml: `
      <p>تتغير ملامح الحياة الأسرية بصمت لكن بسرعة لافتة. الجلسات العائلية لم تعد كما كانت، والأحاديث المسائية باتت تنقطع كل بضع دقائق لإلقاء نظرة على الهاتف. ليست مشكلة سعودية وحدها، لكنها في مجتمعنا تتقاطع مع خصوصيات ثقافية تستحق التأمل.</p>
      <h3>أرقام تستوقف</h3>
      <p>تشير الدراسات الميدانية إلى أن متوسط استخدام الفرد للهاتف الذكي في المملكة يتجاوز ست ساعات يوميًا، وهي ساعات تُقتطع غالبًا من وقت الأسرة وممارسات الفراغ المشتركة.</p>
      <h3>من المسؤول؟</h3>
      <p>الإجابة ليست بسيطة. الآباء يتحملون جزءًا من المسؤولية، لكن المنظومة التعليمية والإعلامية والمؤسسات الاجتماعية مطالبة بدور تربوي يعيد للعلاقات الأسرية عمقها.</p>
      <p>إعادة الاتصال داخل البيت هي أول خطوة في إعادة الاتصال بأنفسنا.</p>
    `,
  },
  {
    authorIndex: 2,
    title: "السياسة السعودية الخارجية: عقد من إعادة الترتيب",
    subtitle: "قراءة في تحولات الدبلوماسية الإقليمية",
    excerpt: "شهدت السياسة الخارجية السعودية في السنوات الأخيرة تحولات عميقة، أعادت تعريف موقع المملكة في الإقليم والعالم.",
    contentHtml: `
      <p>لا يمكن قراءة السياسة الخارجية السعودية اليوم بأدوات تحليل العقود الماضية. المملكة انتقلت من سياسة الحياد المحسوب إلى دور إقليمي ودولي أكثر فاعلية، يقوم على الموازنة الدقيقة بين الشراكات التاريخية والانفتاح على شركاء جدد.</p>
      <h3>محاور التحول</h3>
      <p>أبرز ملامح هذا التحول تتجلى في تنويع علاقات المملكة الدولية، وفي قيادتها لعدد من المبادرات الإقليمية المتعلقة بالأمن الغذائي، والمناخ، والاستقرار الاقتصادي.</p>
      <h3>رهانات المرحلة</h3>
      <p>الرهان الأكبر اليوم هو تحويل هذه المبادرات إلى منظومة مؤسسية مستدامة، تتجاوز اللحظات الدبلوماسية إلى أطر تعاون طويلة الأمد.</p>
    `,
  },
  {
    authorIndex: 3,
    title: "الذكاء الاصطناعي في المملكة: الفرصة الأكبر والمخاطر الأخفى",
    excerpt: "بين موجة التفاؤل بإمكانات الذكاء الاصطناعي، تظل أسئلة جوهرية مفتوحة حول حوكمة البيانات وأخلاقيات التطبيق.",
    contentHtml: `
      <p>تحتل المملكة موقعًا متقدمًا عالميًا في الاستثمار في الذكاء الاصطناعي، ويُنتظر أن يساهم القطاع بنسبة معتبرة في الناتج المحلي بحلول عام 2030. لكن خلف هذه الأرقام المتفائلة، توجد طبقة من التحديات تستحق نقاشًا أعمق.</p>
      <h3>سؤال البيانات</h3>
      <p>أي ذكاء اصطناعي محلي يحتاج إلى بيانات محلية. والسؤال هنا: هل لدينا منظومة حوكمة بيانات تضمن الاستفادة من هذه الثروة دون المساس بخصوصية الأفراد أو سيادة المعلومة الوطنية؟</p>
      <h3>الفجوة المهارية</h3>
      <p>التحدي الثاني يتعلق برأس المال البشري. لا يكفي استقطاب الكفاءات من الخارج، بل يلزم تأهيل جيل من المتخصصين السعوديين قادر على قيادة مرحلة ما بعد التبني التقني.</p>
    `,
    isFeatured: true,
  },
  {
    authorIndex: 4,
    title: "الدوري السعودي: من جذب النجوم إلى صناعة المنتج المحلي",
    excerpt: "نجح الدوري السعودي للمحترفين في استقطاب نجوم عالميين، لكن التحدي الحقيقي هو تحويل هذا الزخم إلى صناعة كروية مستدامة.",
    contentHtml: `
      <p>المرحلة الذهبية التي يعيشها الدوري السعودي للمحترفين منذ موسم 2023 لا يمكن إنكارها. الحضور الجماهيري ارتفع، الحقوق الإعلامية تضاعفت، والاهتمام العالمي بالكرة السعودية لم يكن بهذا المستوى من قبل.</p>
      <h3>ما الخطوة التالية؟</h3>
      <p>تحويل هذا الزخم إلى منتج كروي مستدام يتطلب ثلاثة محاور: تطوير الإدارات الفنية، الاستثمار في الأكاديميات، وتطوير البنية التحتية في المدن الناشئة كرويًا.</p>
      <h3>المنتخب أولًا</h3>
      <p>في النهاية، النجاح الحقيقي يقاس بحال المنتخب الوطني. وأي تطوير حقيقي للدوري لن يكتمل إلا إذا انعكس على بطولات الأخضر الكبرى في السنوات المقبلة.</p>
    `,
  },
];

/**
 * Importable seeder used by the main `seed.ts`. Idempotent and side-effect
 * free besides the DB writes — does NOT call `process.exit`. Safe to invoke
 * multiple times: rows are skipped when their slug already exists.
 */
export async function seedOpinions() {
  console.log("🌱 Seeding opinion authors and articles...");

  // Insert authors (skip if slug-prefix already exists)
  const authorMap: Record<number, string> = {};
  for (let i = 0; i < COLUMNISTS.length; i++) {
    const c = COLUMNISTS[i];
    const slug = arabicSlug(c.fullName);
    const [existing] = await db
      .select()
      .from(authors)
      .where(eq(authors.slug, slug))
      .limit(1);
    if (existing) {
      authorMap[i] = existing.id;
      console.log(`  · author exists: ${c.fullName}`);
      continue;
    }
    const [created] = await db
      .insert(authors)
      .values({
        slug,
        fullName: c.fullName,
        position: c.position,
        shortBio: c.shortBio,
        bio: c.bio,
        avatarUrl: c.avatarUrl,
        twitter: c.twitter,
        isActive: true,
      })
      .returning();
    authorMap[i] = created.id;
    console.log(`  ✓ created author: ${c.fullName}`);
  }

  // Insert opinion articles
  for (const o of OPINIONS) {
    const slug = arabicSlug(o.title);
    const [existing] = await db
      .select()
      .from(opinionArticles)
      .where(eq(opinionArticles.slug, slug))
      .limit(1);
    if (existing) {
      console.log(`  · opinion exists: ${o.title}`);
      continue;
    }
    const cleanText = stripHtml(o.contentHtml);
    await db.insert(opinionArticles).values({
      slug,
      title: o.title,
      subtitle: o.subtitle,
      excerpt: o.excerpt,
      contentHtml: o.contentHtml,
      authorId: authorMap[o.authorIndex],
      status: "published",
      isFeatured: !!o.isFeatured,
      excludeFromHome: false,
      readingTimeMinutes: readingTimeMinutes(cleanText),
      publishedAt: new Date(),
    });
    console.log(`  ✓ created opinion: ${o.title}`);
  }

  console.log("✅ Opinion seed complete.");
}

// Allow running this file directly (legacy CLI invocation):
//   pnpm --filter @workspace/ajelsa exec tsx src/lib/db/seed-opinions.ts
const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  /seed-opinions\.(ts|js|mjs)$/.test(process.argv[1]);

if (isDirectRun) {
  seedOpinions()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
