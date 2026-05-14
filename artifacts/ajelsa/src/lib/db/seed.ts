/**
 * Database seed — populate initial data
 * Run: pnpm db:seed
 */

import { db, users, categories, tags, articles } from "./index";
import { hashPassword } from "@/lib/auth";
import { arabicSlug, readingTimeMinutes, stripHtml } from "@/lib/utils";
import { seedOpinions } from "./seed-opinions";

const CATEGORIES = [
  { slug: "local", name: "محليات", nameEn: "Local", color: "#8c1d2b", position: 1 },
  { slug: "business", name: "اقتصاد", nameEn: "Business", color: "#3a4a5e", position: 2 },
  { slug: "sports", name: "رياضة", nameEn: "Sports", color: "#b8924a", position: 3 },
  { slug: "world", name: "عالم", nameEn: "World", color: "#7a9081", position: 4 },
  { slug: "tech", name: "تقنية", nameEn: "Technology", color: "#b094c5", position: 5 },
  { slug: "lifestyle", name: "منوعات", nameEn: "Lifestyle", color: "#d8a5aa", position: 6 },
  { slug: "opinion", name: "آراء", nameEn: "Opinion", color: "#6b1421", position: 7 },
  { slug: "video", name: "فيديو", nameEn: "Video", color: "#1f1a1c", position: 8 },
];

const USERS = [
  {
    email: "Sultanm4u@gmail.com",
    password: "Almalki@99",
    fullName: "سلطان المالكي",
    bio: "رئيس تحرير صحيفة عاجل",
    role: "editor_in_chief" as const,
  },
  {
    email: "ahmed@ajel.sa",
    password: "Ajel@2026",
    fullName: "أحمد العمري",
    bio: "محرر أول · محليات",
    role: "editor" as const,
  },
  {
    email: "reem@ajel.sa",
    password: "Ajel@2026",
    fullName: "ريم الشهري",
    bio: "محللة اقتصادية",
    role: "writer" as const,
  },
];

const TAGS = ["السعودية", "الرياض", "نيوم", "أرامكو", "رؤية 2030", "الذكاء الاصطناعي", "الرياضة"];

async function main() {
  console.log("🌱 Seeding database...");

  // Categories
  console.log("Inserting categories...");
  const insertedCats = await db.insert(categories).values(CATEGORIES).returning();
  console.log(`  ✓ ${insertedCats.length} categories`);

  // Users
  console.log("Inserting users...");
  const insertedUsers = await db
    .insert(users)
    .values(
      await Promise.all(
        USERS.map(async (u) => ({
          email: u.email,
          passwordHash: await hashPassword(u.password),
          fullName: u.fullName,
          bio: u.bio,
          role: u.role,
          isActive: true,
          emailVerifiedAt: new Date(),
        }))
      )
    )
    .returning();
  console.log(`  ✓ ${insertedUsers.length} users`);

  // Tags
  console.log("Inserting tags...");
  const insertedTags = await db
    .insert(tags)
    .values(TAGS.map((t) => ({ slug: arabicSlug(t), name: t })))
    .returning();
  console.log(`  ✓ ${insertedTags.length} tags`);

  // Sample articles
  console.log("Inserting sample articles...");
  const localCat = insertedCats.find((c) => c.slug === "local")!;
  const econCat = insertedCats.find((c) => c.slug === "business")!;
  const techCat = insertedCats.find((c) => c.slug === "tech")!;
  const ahmed = insertedUsers.find((u) => u.email === "ahmed@ajel.sa")!;
  const reem = insertedUsers.find((u) => u.email === "reem@ajel.sa")!;

  const sampleArticles = [
    {
      slug: "saudi-private-sector-2026-" + Date.now().toString(36),
      title: "قرارات سعودية غير مسبوقة لدعم القطاع الخاص في 2026",
      subtitle: "حزمة تحفيزية شاملة بقيمة 50 مليار ريال",
      excerpt: "حزمة تحفيزية شاملة تُطلقها وزارة المالية بالشراكة مع 12 جهة حكومية، تستهدف رفع مساهمة القطاع الخاص في الناتج المحلي إلى 65% خلال السنوات الخمس القادمة.",
      contentHtml: "<p>أعلنت وزارة المالية عن حزمة تحفيزية شاملة لدعم القطاع الخاص...</p>",
      contentJson: { type: "doc", content: [] },
      categoryId: localCat.id,
      authorId: ahmed.id,
      type: "breaking" as const,
      status: "published" as const,
      isBreaking: true,
      isFeatured: true,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      viewCount: 128400,
      commentCount: 234,
    },
    {
      slug: "tasi-banking-rally-" + Date.now().toString(36),
      title: "تاسي يقفز 1.8% بدعم من القطاع المصرفي",
      excerpt: "ارتفاع جماعي للأسواق الخليجية في تعاملات اليوم بقيادة الأسهم المصرفية.",
      contentHtml: "<p>سجل المؤشر العام للسوق السعودية تاسي ارتفاعاً ملحوظاً...</p>",
      contentJson: { type: "doc", content: [] },
      categoryId: econCat.id,
      authorId: reem.id,
      type: "regular" as const,
      status: "published" as const,
      isFeatured: true,
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      viewCount: 67000,
      commentCount: 89,
    },
    {
      slug: "saudi-ai-platform-" + Date.now().toString(36),
      title: "المملكة تُطلق منصة وطنية للذكاء الاصطناعي",
      excerpt: "إطلاق منصة وطنية للذكاء الاصطناعي خلال أسابيع تعيد تعريف الخدمات الرقمية.",
      contentHtml: "<p>كشفت الهيئة السعودية للبيانات والذكاء الاصطناعي عن إطلاق منصة وطنية موحدة...</p>",
      contentJson: { type: "doc", content: [] },
      categoryId: techCat.id,
      authorId: ahmed.id,
      type: "exclusive" as const,
      status: "published" as const,
      isFeatured: true,
      publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      viewCount: 41000,
      commentCount: 38,
    },
  ];

  for (const a of sampleArticles) {
    const cleanText = stripHtml(a.contentHtml);
    await db.insert(articles).values({
      ...a,
      readingTimeMinutes: readingTimeMinutes(cleanText),
    });
  }
  console.log(`  ✓ ${sampleArticles.length} articles`);

  // Opinion authors + opinion articles (5 columnists / 5 published pieces).
  // seedOpinions is idempotent: it skips rows that already exist by slug, so
  // re-running `db:seed` is safe.
  console.log("");
  await seedOpinions();

  console.log("\n✅ Seed complete!");
  console.log("\nLogin credentials:");
  USERS.forEach((u) => console.log(`  ${u.email} / ${u.password}`));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
