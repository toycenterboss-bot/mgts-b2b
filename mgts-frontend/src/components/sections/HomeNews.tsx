import { getNewsList, getNewsTags } from "@/lib/strapi";
import NewsListing from "@/components/news/NewsListing";

export default async function HomeNews() {
  const pageSize = 3;
  const page = 1;
  const [payload, tagsPayload] = await Promise.all([getNewsList({ page, pageSize }), getNewsTags()]);
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const meta = (payload as any)?.meta?.pagination || {};
  const tags = Array.isArray(tagsPayload) ? tagsPayload : [];

  return (
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
        <NewsListing initialItems={items} initialPagination={meta} tags={tags} showArchiveLink />
      </main>
    </section>
  );
}
