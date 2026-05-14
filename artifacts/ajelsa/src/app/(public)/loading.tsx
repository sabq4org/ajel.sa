/**
 * Public-pages loading skeleton.
 *
 * Next renders this synchronously while the new server component is being
 * fetched, replacing the old page content the moment a Link is clicked.
 * Without it, the browser shows the previous page until the new HTML
 * arrives — which on Vercel↔Railway transatlantic queries can be
 * 300–600ms and reads as "frozen".
 *
 * The SiteHeader / SiteFooter from the public layout keep painting on
 * top of this — only the main slot is replaced.
 */
export default function PublicLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">جاري التحميل…</span>

      {/* Hero placeholder */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 aspect-[16/9] rounded-2xl bg-bg-2 animate-pulse" />
        <div className="space-y-4">
          <div className="aspect-[4/3] rounded-2xl bg-bg-2 animate-pulse" />
          <div className="h-5 rounded bg-bg-2 animate-pulse" />
          <div className="h-5 rounded bg-bg-2 animate-pulse w-3/4" />
        </div>
      </div>

      {/* Story cards row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] rounded-xl bg-bg-2 animate-pulse" />
            <div className="h-4 rounded bg-bg-2 animate-pulse" />
            <div className="h-4 rounded bg-bg-2 animate-pulse w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
