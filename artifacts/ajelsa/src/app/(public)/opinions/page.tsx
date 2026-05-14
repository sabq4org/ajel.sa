export const revalidate = 60;

import Link from "next/link";
import type { Metadata } from "next";
import { PenTool, Clock, ArrowLeft, ArrowRight, BookOpen, Eye, Award, Quote, Flame } from "lucide-react";
import { RelativeTime } from "@/components/public/RelativeTime";
import {
  getAllOpinions,
  getAuthorOpinions,
  getActiveAuthors,
  countPublishedOpinions,
  countAuthorOpinions,
  getTopAuthors,
  getFeaturedAuthor,
  getMostReadAuthors,
  type OpinionListItem,
  type TopAuthorStat,
  type FeaturedAuthorStat,
  type MostReadAuthor,
} from "@/lib/queries/opinions";

export const metadata: Metadata = {
  title: "مقالات الرأي · صحيفة عاجل",
  description: "أحدث مقالات الرأي والتحليلات بأقلام نخبة من الكتّاب والمحللين.",
};

const PAGE_SIZE = 12;

type SearchParams = Promise<{
  page?: string;
  author?: string;
}>;

function formatViews(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default async function OpinionsIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const pageRaw = parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const authorFilter = sp.author?.trim() || "";

  let pageItems: OpinionListItem[] = [];
  let allAuthors: Array<{ id: string; slug: string; fullName: string; position: string | null; avatarUrl: string | null; shortBio: string | null }> = [];
  let topAuthors: TopAuthorStat[] = [];
  let featuredColumnist: FeaturedAuthorStat | null = null;
  let mostReadAuthors: MostReadAuthor[] = [];
  let total = 0;
  let filteredAuthor: { id: string; fullName: string } | null = null;

  try {
    // First load: authors registry + top-author rankings + featured columnist
    // (كاتب الأسبوع — most-viewed in the last 7 days) + most-read writers
    // widget. All are needed regardless of the active author filter.
    const [au, top, featured, mostRead] = await Promise.all([
      getActiveAuthors(),
      getTopAuthors(5),
      getFeaturedAuthor(),
      getMostReadAuthors(5),
    ]);
    allAuthors = au.map((a) => ({
      id: a.id,
      slug: a.slug,
      fullName: a.fullName,
      position: a.position,
      avatarUrl: a.avatarUrl,
      shortBio: a.shortBio,
    }));
    topAuthors = top;
    featuredColumnist = featured;
    mostReadAuthors = mostRead;

    if (authorFilter) {
      // Per-author paginated query + per-author count.
      const a = au.find((x) => x.slug === authorFilter);
      if (a) {
        filteredAuthor = { id: a.id, fullName: a.fullName };
        const [items, count] = await Promise.all([
          getAuthorOpinions(a.id, PAGE_SIZE, offset),
          countAuthorOpinions(a.id),
        ]);
        pageItems = items;
        total = count;
      }
    } else {
      // Global paginated query + global count.
      const [items, count] = await Promise.all([
        getAllOpinions(PAGE_SIZE, offset),
        countPublishedOpinions(),
      ]);
      pageItems = items;
      total = count;
    }
  } catch {
    // DB unreachable — render empty state
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-[1320px] mx-auto px-4 lg:px-8 py-10 space-y-12">
      {/* Page header */}
      <header className="text-center space-y-3 pb-6 border-b-2 border-burgundy/30">
        <div className="inline-flex items-center gap-2.5 bg-rose-cream text-burgundy px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest">
          <PenTool size={14} />
          مقالات الرأي
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink -tracking-[0.02em]">
          آراء كتّاب عاجل
        </h1>
        <p className="text-sm text-ink-soft max-w-xl mx-auto">
          تحليلات ومقالات رأي بأقلام نخبة من الكتّاب والمحللين السعوديين والعرب.
        </p>
      </header>

      {/* Featured columnist of the week */}
      {featuredColumnist && (
        <section className="relative bg-gradient-to-br from-burgundy via-burgundy-dark to-burgundy-dark text-white rounded-3xl p-7 md:p-10 overflow-hidden">
          <Quote
            className="absolute top-4 left-4 text-rose-cream/15 pointer-events-none"
            size={140}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6" dir="rtl">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-rose-cream text-burgundy grid place-items-center font-bold text-3xl flex-shrink-0 overflow-hidden ring-4 ring-rose-cream/30">
              {featuredColumnist.avatarUrl ? (
                <img
                  src={featuredColumnist.avatarUrl}
                  alt={featuredColumnist.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                featuredColumnist.fullName[0]
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-rose-cream text-burgundy px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
                <Award size={11} />
                كاتب الأسبوع
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold -tracking-[0.02em]">
                {featuredColumnist.fullName}
              </h2>
              {featuredColumnist.position && (
                <div className="text-sm text-rose-cream/90">{featuredColumnist.position}</div>
              )}
              <div className="flex items-center gap-4 text-[12px] text-rose-cream/90 pt-1 flex-wrap">
                {featuredColumnist.recentCount > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={12} /> {featuredColumnist.recentCount} مقال هذا الأسبوع
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} /> {formatViews(featuredColumnist.recentViews)} مشاهدة (٧ أيام)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={12} /> {featuredColumnist.opinionCount} مقال
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} /> {formatViews(featuredColumnist.totalViews)} مشاهدة
                    </span>
                  </>
                )}
              </div>
            </div>
            <Link
              href={`/opinions/author/${featuredColumnist.slug}`}
              className="inline-flex items-center gap-1.5 bg-rose-cream text-burgundy px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-white transition-colors"
            >
              قراءة مقالاته
              <ArrowLeft size={13} />
            </Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8" dir="rtl">
        {/* Main column — filter chips + grid + pagination */}
        <div className="space-y-6 min-w-0">
          {/* Author filter chips */}
          {allAuthors.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[12px] font-bold text-ink-soft ml-1">تصفية حسب الكاتب:</span>
              <Link
                href="/opinions"
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                  !authorFilter
                    ? "bg-burgundy text-white shadow-sm"
                    : "bg-bg-2 text-ink-2 hover:bg-rose-cream hover:text-burgundy"
                }`}
              >
                الكل
              </Link>
              {allAuthors.map((a) => (
                <Link
                  key={a.id}
                  href={`/opinions?author=${encodeURIComponent(a.slug)}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                    authorFilter === a.slug
                      ? "bg-burgundy text-white shadow-sm"
                      : "bg-bg-2 text-ink-2 hover:bg-rose-cream hover:text-burgundy"
                  }`}
                >
                  {a.fullName}
                </Link>
              ))}
            </div>
          )}

          {/* Opinions grid */}
          <section>
            <h2 className="text-lg font-extrabold text-ink mb-4 -tracking-[0.01em] pb-3 border-b border-line">
              {authorFilter
                ? `مقالات ${filteredAuthor?.fullName ?? ""}`
                : "أحدث المقالات"}
              <span className="text-sm font-normal text-ink-soft mr-2">
                ({total})
              </span>
            </h2>

            {pageItems.length === 0 ? (
              <div className="card p-10 text-center text-ink-soft">
                {authorFilter
                  ? "لا توجد مقالات منشورة لهذا الكاتب حاليًا."
                  : "لا توجد مقالات رأي منشورة حاليًا."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pageItems.map((op) => (
                  <Link
                    key={op.id}
                    href={`/opinion/${op.slug}`}
                    className="group bg-paper border border-line rounded-2xl overflow-hidden hover:border-burgundy/40 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[16/10] bg-rose-cream overflow-hidden">
                      {op.featuredImageUrl ? (
                        <img
                          src={op.featuredImageUrl}
                          alt={op.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-burgundy/20 to-rose-cream flex items-center justify-center">
                          <PenTool size={48} className="text-burgundy/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-burgundy text-white px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
                        <PenTool size={9} />
                        رأي
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center text-xs font-bold overflow-hidden flex-shrink-0">
                          {op.author.avatarUrl ? (
                            <img
                              src={op.author.avatarUrl}
                              alt={op.author.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            op.author.fullName[0]
                          )}
                        </div>
                        <div className="text-[12px] font-bold text-burgundy truncate">
                          {op.author.fullName}
                        </div>
                      </div>
                      <h3 className="text-base font-extrabold text-ink leading-snug line-clamp-2 group-hover:text-burgundy transition-colors -tracking-[0.01em]">
                        {op.title}
                      </h3>
                      {op.excerpt && (
                        <p className="text-[12px] text-ink-2 leading-relaxed line-clamp-2">
                          {op.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-3 text-[10px] text-ink-soft border-t border-line-soft">
                        {op.publishedAt && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} />
                            <RelativeTime date={op.publishedAt} />
                          </span>
                        )}
                        {op.readingTimeMinutes ? (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen size={10} /> {op.readingTimeMinutes} د
                          </span>
                        ) : null}
                        {op.viewCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Eye size={10} /> {formatViews(op.viewCount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8" dir="ltr">
                {page > 1 && (
                  <PageLink
                    href={pageHref(page - 1, authorFilter)}
                    label={<><ArrowRight size={13} /> السابق</>}
                  />
                )}
                <div className="text-[12px] font-bold text-ink-soft px-3 py-2">
                  صفحة {page} من {totalPages}
                </div>
                {page < totalPages && (
                  <PageLink
                    href={pageHref(page + 1, authorFilter)}
                    label={<>التالي <ArrowLeft size={13} /></>}
                  />
                )}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Most-read writers (last 7 days, with all-time fallback) */}
          {mostReadAuthors.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[14px] font-extrabold text-ink mb-1 flex items-center gap-2 -tracking-[0.01em]">
                <Flame size={14} className="text-burgundy" />
                {mostReadAuthors[0].windowDays === 7
                  ? "الأكثر قراءة هذا الأسبوع"
                  : "الكتّاب الأكثر قراءة"}
              </h3>
              <p className="text-[10px] text-ink-soft mb-4" dir="rtl">
                {mostReadAuthors[0].windowDays === 7
                  ? "ترتيب بحسب إجمالي مشاهدات مقالات آخر ٧ أيام"
                  : "ترتيب بحسب إجمالي المشاهدات الكلية"}
              </p>
              <ol className="space-y-3">
                {mostReadAuthors.map((a, i) => (
                  <li key={a.id}>
                    <Link
                      href={`/opinions/author/${a.slug}`}
                      className="group flex items-center gap-3 hover:bg-rose-cream/30 rounded-xl p-2 -m-2 transition-colors"
                    >
                      <div className="text-[14px] font-extrabold text-burgundy w-5 text-center" dir="ltr">
                        {i + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold overflow-hidden flex-shrink-0">
                        {a.avatarUrl ? (
                          <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                        ) : (
                          a.fullName[0]
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-ink group-hover:text-burgundy transition-colors truncate">
                          {a.fullName}
                        </div>
                        <div className="text-[10px] text-ink-soft inline-flex items-center gap-1" dir="ltr">
                          <Eye size={9} />
                          <span>{formatViews(a.totalViews)}</span>
                          <span className="text-ink-soft/70">reads</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Top authors */}
          {topAuthors.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[14px] font-extrabold text-ink mb-4 flex items-center gap-2 -tracking-[0.01em]">
                <Award size={14} className="text-burgundy" />
                الكتّاب الأكثر نشاطاً
              </h3>
              <div className="space-y-3">
                {topAuthors.map((a, i) => (
                  <Link
                    key={a.id}
                    href={`/opinions/author/${a.slug}`}
                    className="group flex items-center gap-3 hover:bg-rose-cream/30 rounded-xl p-2 -m-2 transition-colors"
                  >
                    <div className="text-[14px] font-extrabold text-burgundy w-5 text-center">
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold overflow-hidden flex-shrink-0">
                      {a.avatarUrl ? (
                        <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                      ) : (
                        a.fullName[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-ink group-hover:text-burgundy transition-colors truncate">
                        {a.fullName}
                      </div>
                      <div className="text-[10px] text-ink-soft flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={9} /> {a.opinionCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye size={9} /> {formatViews(a.totalViews)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All authors strip */}
          {allAuthors.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[14px] font-extrabold text-ink mb-4 -tracking-[0.01em]">
                كل الكتّاب
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {allAuthors.map((a) => (
                  <Link
                    key={a.id}
                    href={`/opinions/author/${a.slug}`}
                    className="group text-center"
                  >
                    <div className="w-12 h-12 mx-auto mb-1.5 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold text-base overflow-hidden ring-2 ring-transparent group-hover:ring-burgundy transition-all">
                      {a.avatarUrl ? (
                        <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                      ) : (
                        a.fullName[0]
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-ink group-hover:text-burgundy transition-colors line-clamp-2 leading-tight">
                      {a.fullName}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function pageHref(page: number, author: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (author) params.set("author", author);
  const qs = params.toString();
  return qs ? `/opinions?${qs}` : "/opinions";
}

function PageLink({ href, label }: { href: string; label: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line bg-paper text-[12px] font-bold text-ink-2 hover:bg-rose-cream hover:text-burgundy hover:border-burgundy/30 transition-all"
      dir="rtl"
    >
      {label}
    </Link>
  );
}
