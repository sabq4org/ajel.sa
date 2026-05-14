// تحديث الصفحة كل 30 ثانية (ISR)
export const revalidate = 30;

import {
  getLatestArticles,
  getMostReadArticles,
  getFeaturedArticles,
  getCategoryArticles,
} from "@/lib/queries/articles";
import { getLatestOpinions, type OpinionListItem } from "@/lib/queries/opinions";
import { LivePulseBar } from "@/components/public/LivePulseBar";
import { db, settings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { HeroSection } from "@/components/public/HeroSection";
import { AIBriefWidget } from "@/components/public/AIBriefWidget";
import { EditorsPicks } from "@/components/public/EditorsPicks";
import { MostReadStrip } from "@/components/public/MostReadStrip";
import { NewsletterHero } from "@/components/public/NewsletterHero";
import { LatestNewsGrid } from "@/components/public/LatestNewsGrid";
import { SportsSection } from "@/components/public/SportsSection";
import { VideoSection } from "@/components/public/VideoSection";
import { OpinionsSection } from "@/components/public/OpinionsSection";

// Fallback demo data
const FALLBACK_LEAD: any = {
  slug: "saudi-private-sector-2026",
  title: "قرارات سعودية غير مسبوقة لدعم القطاع الخاص في 2026",
  excerpt: "حزمة تحفيزية شاملة تطلقها وزارة المالية بالشراكة مع 12 جهة حكومية، تستهدف رفع مساهمة القطاع الخاص في الناتج المحلي إلى 65%.",
  isBreaking: true,
  publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  viewCount: 128400,
  category: { name: "محليات", slug: "local" },
  author: { fullName: "أحمد العمري" },
};

export default async function HomePage() {
  let lead: any = null;
  let sideStories: any[] = [];
  let latest: any[] = [];
  let mostRead: any[] = [];
  let editorsPicks: any[] = [];
  let sportsArticles: any[] = [];
  let opinions: OpinionListItem[] = [];
  let hasRealData = false;
  let showLivePulse = true;

  try {
    const row = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "showLivePulseBar"))
      .limit(1);
    if (row.length > 0 && row[0].value === false) {
      showLivePulse = false;
    }
  } catch {
    // إذا فشل، اترك الشريط ظاهراً افتراضياً
  }

  try {
    const [featured, latestArticles, mostReadArticles, sports, latestOpinions] = await Promise.all([
      getFeaturedArticles(8),
      getLatestArticles(50),
      getMostReadArticles(5),
      getCategoryArticles("sports", 4, 0),
      getLatestOpinions(8).catch(() => [] as OpinionListItem[]),
    ]);

    hasRealData = featured.length > 0 || latestArticles.length > 0;

    if (featured.length > 0) {
      lead = featured[0];
      sideStories = featured.slice(1, 5);
      editorsPicks = featured.slice(5, 8);
    } else if (latestArticles.length > 0) {
      lead = latestArticles[0];
      sideStories = latestArticles.slice(1, 5);
    }

    latest = latestArticles;
    mostRead = mostReadArticles.length > 0 ? mostReadArticles : latestArticles.slice(0, 5);
    sportsArticles = sports as any[];
    opinions = latestOpinions;
  } catch {
    // DB غير متصلة
  }

  const showLead = lead ?? FALLBACK_LEAD;
  const showSide = sideStories;
  const briefArticles = hasRealData ? latest.slice(0, 5) : [];

  return (
    <>
      {/* Live Pulse Bar */}
      {showLivePulse && <LivePulseBar />}

      <div className="max-w-[1320px] mx-auto px-4 lg:px-8 py-8 space-y-12">

        {/* Hero Section */}
        <HeroSection lead={showLead} side={showSide} />

        {/* AI Daily Brief */}
        {briefArticles.length > 0 && (
          <AIBriefWidget articles={briefArticles} />
        )}

        {/* ━━━━━━━━━━━━ قسم الرياضة (خلفية ممتدة) ━━━━━━━━━━━━ */}
        {sportsArticles.length > 0 && (
          <SportsSection articles={sportsArticles} />
        )}

        {/* آخر الأخبار */}
        {latest.length > 0 && (
          <LatestNewsGrid articles={latest} />
        )}

        {/* ━━━━━━━━━━━━ قسم الفيديو (تجريبي) ━━━━━━━━━━━━ */}
        <VideoSection />

        {/* Editor's Picks */}
        {editorsPicks.length > 0 && (
          <EditorsPicks articles={editorsPicks} />
        )}

        {/* مقالات الرأي */}
        {opinions.length > 0 && (
          <OpinionsSection opinions={opinions} />
        )}

        {/* Most Read Today */}
        {mostRead.length > 0 && (
          <MostReadStrip articles={mostRead} />
        )}

        {/* Newsletter Hero */}
        <NewsletterHero />
      </div>
    </>
  );
}
