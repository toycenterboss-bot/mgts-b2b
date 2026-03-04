import { getNewsList, getNewsTags, getNewsYears } from "@/lib/strapi";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import NewsListing from "@/components/news/NewsListing";

type NewsArchivePageProps = {
  searchParams?: { page?: string; tag?: string; year?: string };
};

export default async function NewsArchivePage({ searchParams }: NewsArchivePageProps) {
  const pageSize = 12;
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);
  const tag = (searchParams?.tag || "").trim();
  const year = (searchParams?.year || "").trim();
  const [payload, tagsPayload, yearsPayload] = await Promise.all([
    getNewsList({ page, pageSize, tag, year: year ? parseInt(year, 10) : undefined }),
    getNewsTags(),
    getNewsYears(),
  ]);
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const meta = (payload as any)?.meta?.pagination || {};
  const tags = Array.isArray(tagsPayload) ? tagsPayload : [];
  const years = Array.isArray(yearsPayload) ? yearsPayload : [];

  return (
    <div className="news-archive">
      <section className="bg-background-light dark:bg-background-dark" data-stitch-block="breadcrumbs">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-10 py-4">
          <Breadcrumbs
            items={[{ label: "Главная", href: "/" }, { label: "Новости", href: "/news" }, { label: "Архив" }]}
            className="mb-0"
          />
        </div>
      </section>
      <section
        className="bg-background-dark text-slate-100 min-h-screen relative overflow-x-hidden"
        data-stitch-block="news_and_documents_list_2"
      >
        <div className="fixed top-0 right-0 w-[500px] h-[500px] glow-leak pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="fixed bottom-0 left-0 w-[800px] h-[800px] glow-leak pointer-events-none -z-10 -translate-x-1/4 translate-y-1/4"></div>
        <main className="max-w-[1400px] mx-auto px-8 py-12">
          <div className="mb-16 relative">
            <div className="absolute -left-8 top-0 h-full w-1 bg-primary rounded-full"></div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-white to-white/30 bg-clip-text text-transparent">
              Новости и
              <br />
              Медиа-ресурсы
            </h1>
            <p className="text-slate-400 text-xl max-w-2xl font-light leading-relaxed">
              Интеллектуальная среда MGTS: последние технологические прорывы, отраслевая экспертиза и полный доступ к
              нормативной базе.
            </p>
          </div>
          <NewsListing
            initialItems={items}
            initialPagination={meta}
            tags={tags}
            years={years}
            initialTag={tag}
            initialYear={year}
            showYears
          />
        </main>
      </section>
    </div>
  );
}
