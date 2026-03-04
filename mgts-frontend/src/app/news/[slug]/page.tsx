import { notFound } from "next/navigation";
import { getNewsBySlug } from "@/lib/strapi";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
type NewsDetailProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
};

export default async function NewsDetailPage({ params }: NewsDetailProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const news = (await getNewsBySlug(slug)) as any;
  if (!news) return notFound();

  const imageUrl = resolveMediaUrl(news.featuredImage || null);
  const imageAlt = resolveMediaAlt(news.featuredImage || null, news.title);

  return (
    <article>
      <section className="bg-background-light dark:bg-background-dark" data-stitch-block="breadcrumbs">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-10 py-4">
          <nav className="flex items-center gap-2 text-sm font-medium">
            <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1" href="/">
              <span className="material-symbols-outlined text-base">home</span>
              Главная
            </a>
            <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
            <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="/news">
              Раздел
            </a>
            <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
            <span className="text-primary font-bold">Страница</span>
          </nav>
        </div>
      </section>
      <section
        className="bg-background-dark text-slate-100 min-h-screen relative overflow-x-hidden"
        data-stitch-block="news_detail_page"
      >
        <div className="fixed top-0 right-0 w-[500px] h-[500px] glow-leak pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="fixed bottom-0 left-0 w-[800px] h-[800px] glow-leak pointer-events-none -z-10 -translate-x-1/4 translate-y-1/4"></div>

        <main className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="mb-8">
            <a
              className="text-xs font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
              href="/news/archive"
              data-news-back
            >
              ← Архив новостей
            </a>
          </div>

          <div className="flex flex-col gap-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50" data-news-meta>
              <span data-news-meta-category>{news.category?.name || "Новости"}</span>
              <span className="mx-2">•</span>
              <span data-news-meta-date>{formatDate(news.publishDate)}</span>
            </p>

            {news.title && (
              <h1 className="text-4xl md:text-5xl font-black tracking-tight" data-cms-title>
                {news.title}
              </h1>
            )}

            <div
              className={`aspect-[16/9] rounded-2xl bg-white/5 border border-white/10 overflow-hidden ${
                imageUrl ? "" : "hidden"
              }`}
              data-cms-media
            >
              {imageUrl && <img className="h-full w-full object-cover" alt={imageAlt} src={imageUrl} data-cms-image />}
            </div>

            {news.content && (
              <div
                className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary"
                data-cms-body
                dangerouslySetInnerHTML={{ __html: news.content }}
              />
            )}
          </div>
        </main>
      </section>
    </article>
  );
}
