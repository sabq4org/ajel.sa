export const revalidate = 60;

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PenTool,
  Clock,
  Twitter,
  Mail,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Eye,
  FileText,
} from "lucide-react";
import { RelativeTime } from "@/components/public/RelativeTime";
import {
  getAuthorBySlug,
  getAuthorOpinions,
  countAuthorOpinions,
} from "@/lib/queries/opinions";

type Params = { slug: string };
type SearchParams = Promise<{ page?: string }>;

const PAGE_SIZE = 10;

function formatViews(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const author = await getAuthorBySlug(slug);
    if (!author) return { title: "كاتب رأي · صحيفة عاجل" };
    return {
      title: `${author.fullName} · مقالات الرأي · عاجل`,
      description: author.shortBio || author.bio || undefined,
    };
  } catch {
    return { title: "كاتب رأي · صحيفة عاجل" };
  }
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pageRaw = parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  let authorData: Awaited<ReturnType<typeof getAuthorBySlug>> | null = null;
  let pageItems: Awaited<ReturnType<typeof getAuthorOpinions>> = [];
  let totalCount = 0;
  let stats: { totalViews: number; avgReadingTime: number | null } = {
    totalViews: 0,
    avgReadingTime: null,
  };

  const offset = (page - 1) * PAGE_SIZE;

  try {
    authorData = await getAuthorBySlug(slug);
    if (!authorData) return notFound();
    // Fetch the visible page from the DB + a separate stats sample.
    // For the author hero stats line we sample up to 100 most recent pieces
    // — enough for representative averages without scanning the entire archive.
    const [items, count, sample] = await Promise.all([
      getAuthorOpinions(authorData.id, PAGE_SIZE, offset),
      countAuthorOpinions(authorData.id),
      getAuthorOpinions(authorData.id, 100, 0),
    ]);
    pageItems = items;
    totalCount = count;
    const totalViews = sample.reduce((acc, op) => acc + (op.viewCount || 0), 0);
    const withTime = sample.filter((o) => o.readingTimeMinutes);
    const avgReadingTime = withTime.length
      ? Math.round(
          withTime.reduce((acc, o) => acc + (o.readingTimeMinutes || 0), 0) / withTime.length
        )
      : null;
    stats = { totalViews, avgReadingTime };
  } catch {
    return notFound();
  }
  const author = authorData;
  const totalViews = stats.totalViews;
  const avgReadingTime = stats.avgReadingTime;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10 space-y-10">
      <nav className="flex items-center gap-2 text-xs text-ink-soft" dir="rtl">
        <Link href="/" className="hover:text-burgundy">الرئيسية</Link>
        <span>·</span>
        <Link href="/opinions" className="hover:text-burgundy">مقالات الرأي</Link>
        <span>·</span>
        <span className="text-ink-2">{author.fullName}</span>
      </nav>

      {/* Author hero */}
      <header className="bg-gradient-to-br from-rose-cream/60 to-paper border border-burgundy/15 rounded-3xl p-8 md:p-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold text-3xl flex-shrink-0 overflow-hidden ring-4 ring-rose-cream">
            {author.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.fullName} className="w-full h-full object-cover" />
            ) : (
              author.fullName[0]
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2" dir="rtl">
            <div className="inline-flex items-center gap-1.5 bg-burgundy text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
              <PenTool size={10} />
              كاتب رأي
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-ink -tracking-[0.02em]">
              {author.fullName}
            </h1>
            {author.position && (
              <div className="text-sm font-bold text-burgundy">{author.position}</div>
            )}
            {(author.bio || author.shortBio) && (
              <p className="text-[13px] text-ink-2 leading-relaxed max-w-3xl">
                {author.bio || author.shortBio}
              </p>
            )}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              {author.twitter && (
                <a
                  href={`https://x.com/${author.twitter}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-burgundy transition-colors"
                >
                  <Twitter size={13} />
                  @{author.twitter}
                </a>
              )}
              {author.email && (
                <a
                  href={`mailto:${author.email}`}
                  className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-burgundy transition-colors"
                >
                  <Mail size={13} />
                  {author.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats line */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-burgundy/15" dir="rtl">
          <Stat
            icon={<FileText size={18} />}
            value={String(totalCount)}
            label="مقال منشور"
          />
          <Stat
            icon={<Eye size={18} />}
            value={formatViews(totalViews)}
            label="إجمالي المشاهدات"
          />
          <Stat
            icon={<BookOpen size={18} />}
            value={avgReadingTime ? `${avgReadingTime} د` : "—"}
            label="متوسط وقت القراءة"
          />
        </div>
      </header>

      {/* Opinions list */}
      <section>
        <h2 className="text-xl font-extrabold text-ink mb-5 pb-3 border-b-2 border-burgundy/30 -tracking-[0.01em]">
          مقالات {author.fullName}{" "}
          <span className="text-sm font-normal text-ink-soft">({totalCount})</span>
        </h2>

        {pageItems.length === 0 ? (
          <div className="card p-10 text-center text-ink-soft">
            لا توجد مقالات منشورة لهذا الكاتب حاليًا.
          </div>
        ) : (
          <div className="space-y-4">
            {pageItems.map((op) => (
              <Link
                key={op.id}
                href={`/opinion/${op.slug}`}
                className="group block bg-paper border border-line rounded-2xl overflow-hidden hover:border-burgundy/40 hover:shadow-md transition-all"
                dir="rtl"
              >
                <div className="flex flex-col md:flex-row gap-0">
                  {op.featuredImageUrl && (
                    <div className="md:w-64 md:flex-shrink-0 aspect-[16/10] md:aspect-square bg-rose-cream overflow-hidden">
                      <img
                        src={op.featuredImageUrl}
                        alt={op.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-5 space-y-2.5">
                    <h3 className="text-lg md:text-xl font-extrabold text-ink leading-snug group-hover:text-burgundy transition-colors -tracking-[0.01em]">
                      {op.title}
                    </h3>
                    {op.excerpt && (
                      <p className="text-[13px] text-ink-2 leading-relaxed line-clamp-2">
                        {op.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-ink-soft pt-2 border-t border-line-soft flex-wrap">
                      {op.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          <RelativeTime date={op.publishedAt} />
                        </span>
                      )}
                      {op.readingTimeMinutes && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={10} /> {op.readingTimeMinutes} دقيقة
                        </span>
                      )}
                      {op.viewCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Eye size={10} /> {formatViews(op.viewCount)}
                        </span>
                      )}
                      <span className="mr-auto inline-flex items-center gap-1 text-burgundy font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        قراءة
                        <ArrowLeft size={11} />
                      </span>
                    </div>
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
                href={pageHref(slug, page - 1)}
                label={<><ArrowRight size={13} /> السابق</>}
              />
            )}
            <div className="text-[12px] font-bold text-ink-soft px-3 py-2">
              صفحة {page} من {totalPages}
            </div>
            {page < totalPages && (
              <PageLink
                href={pageHref(slug, page + 1)}
                label={<>التالي <ArrowLeft size={13} /></>}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-burgundy/10 text-burgundy grid place-items-center">
        {icon}
      </div>
      <div className="text-xl font-extrabold text-ink -tracking-[0.01em]">{value}</div>
      <div className="text-[11px] text-ink-soft mt-0.5">{label}</div>
    </div>
  );
}

function pageHref(slug: string, page: number): string {
  return page > 1
    ? `/opinions/author/${slug}?page=${page}`
    : `/opinions/author/${slug}`;
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
