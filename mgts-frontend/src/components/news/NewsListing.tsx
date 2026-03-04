"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type NewsItem = any;
type NewsTag = { slug?: string; name?: string } | null;
type NewsYear = { year?: number } | number | null;
type Pagination = {
  page?: number;
  pageCount?: number;
  total?: number;
  pageSize?: number;
};

type NewsListingProps = {
  initialItems: NewsItem[];
  initialPagination: Pagination;
  tags?: NewsTag[];
  years?: NewsYear[];
  initialTag?: string;
  initialYear?: string;
  showYears?: boolean;
  showArchiveLink?: boolean;
};

const STRAPI_BASE = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

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

const buildPageModel = (page: number, pageCount: number) => {
  const p = Math.max(1, page || 1);
  const last = Math.max(1, pageCount || 1);
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const out = [1];
  const add = (v: number) => {
    if (out[out.length - 1] !== v) out.push(v);
  };
  if (p > 3) add(0);
  add(Math.max(2, p - 1));
  add(p);
  add(Math.min(last - 1, p + 1));
  if (p < last - 2) add(0);
  add(last);

  const seen = new Set<string>();
  return out
    .filter((x) => (x === 0 ? true : x >= 1 && x <= last))
    .filter((x) => {
      const key = String(x);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeTag = (tag?: NewsTag) => {
  if (!tag) return null;
  const slug = (tag as any).slug || (tag as any)?.attributes?.slug;
  const name = (tag as any).name || (tag as any)?.attributes?.name;
  return { slug: String(slug || "").trim(), name: String(name || "").trim() };
};

const normalizeYear = (year?: NewsYear) => {
  if (!year) return "";
  if (typeof year === "number") return String(year);
  const raw = (year as any)?.year || (year as any)?.attributes?.year;
  return raw ? String(raw) : "";
};

export default function NewsListing({
  initialItems,
  initialPagination,
  tags = [],
  years = [],
  initialTag = "",
  initialYear = "",
  showYears = false,
  showArchiveLink = false,
}: NewsListingProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems || []);
  const [pagination, setPagination] = useState<Pagination>(initialPagination || {});
  const [activeTag, setActiveTag] = useState<string>(initialTag);
  const [activeYear, setActiveYear] = useState<string>(initialYear);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalItem, setModalItem] = useState<NewsItem | null>(null);

  useEffect(() => {
    setItems(initialItems || []);
    setPagination(initialPagination || {});
  }, [initialItems, initialPagination]);

  useEffect(() => {
    setActiveTag(initialTag || "");
    setActiveYear(initialYear || "");
  }, [initialTag, initialYear]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const normalizedTags = useMemo(
    () => tags.map(normalizeTag).filter((t) => t && (t.slug || t.name)) as { slug: string; name: string }[],
    [tags]
  );
  const normalizedYears = useMemo(
    () => years.map(normalizeYear).filter(Boolean) as string[],
    [years]
  );

  const page = pagination?.page || 1;
  const pageCount = pagination?.pageCount || 1;
  const total = pagination?.total ?? items.length;
  const pageSize = pagination?.pageSize || 12;
  const pagesModel = buildPageModel(page, pageCount);

  const updateUrl = (nextPage: number, nextTag: string, nextYear: string) => {
    const sp = new URLSearchParams(window.location.search);
    if (nextPage > 1) sp.set("page", String(nextPage));
    else sp.delete("page");
    if (nextTag) sp.set("tag", nextTag);
    else sp.delete("tag");
    if (showYears) {
      if (nextYear) sp.set("year", nextYear);
      else sp.delete("year");
    }
    const qs = sp.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", url);
  };

  const loadNewsPage = async (nextPage: number, nextTag = activeTag, nextYear = activeYear) => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(nextPage));
      qs.set("pageSize", String(pageSize));
      if (nextTag) qs.set("tag", nextTag);
      if (nextYear) qs.set("year", nextYear);
      const res = await fetch(`${STRAPI_BASE}/api/news/list?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json?.data) ? json.data : []);
      setPagination(json?.meta?.pagination || {});
      updateUrl(nextPage, nextTag, nextYear);
    } catch (err) {
      console.error("[NewsListing] loadNewsPage failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagChange = (tag: string) => {
    setActiveTag(tag);
    loadNewsPage(1, tag, activeYear).catch(() => undefined);
  };

  const handleYearChange = (year: string) => {
    setActiveYear(year);
    loadNewsPage(1, activeTag, year).catch(() => undefined);
  };

  const openModal = async (slug: string) => {
    if (!slug) return;
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await fetch(`${STRAPI_BASE}/api/news/slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setModalItem(json?.data || null);
    } catch (err) {
      console.error("[NewsListing] loadNewsDetail failed", err);
      setModalItem(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItem(null);
    setModalLoading(false);
  };

  const renderImage = (item: NewsItem) => {
    const url = resolveMediaUrl(item?.featuredImage || null);
    return url ? { backgroundImage: `url('${url}')` } : undefined;
  };

  const modalImageUrl = resolveMediaUrl(modalItem?.featuredImage || null);
  const modalImageAlt = resolveMediaAlt(modalItem?.featuredImage || null, modalItem?.title || "Новость");

  return (
    <>
      <div className="mb-16">
        <div className="flex gap-4 p-1.5 bg-white/5 rounded-2xl w-fit border border-white/10" data-news-tags>
          <button
            className={`px-8 py-3 text-sm font-bold rounded-xl transition-all${
              !activeTag
                ? " bg-primary shadow-lg shadow-primary/20 text-white"
                : " text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            type="button"
            data-news-tag
            data-news-tag-slug=""
            onClick={() => handleTagChange("")}
          >
            Все материалы
          </button>
          {normalizedTags.map((tag) => (
            <button
              key={tag.slug || tag.name}
              className={`px-8 py-3 text-sm font-bold rounded-xl transition-all${
                activeTag === tag.slug
                  ? " bg-primary shadow-lg shadow-primary/20 text-white"
                  : " text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              type="button"
              data-news-tag
              data-news-tag-slug={tag.slug}
              onClick={() => handleTagChange(tag.slug)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {showYears && (
        <div className={`mb-10 ${normalizedYears.length ? "" : "hidden"}`} data-news-years>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 text-xs font-black rounded-xl border border-white/10 transition-all${
                !activeYear ? " bg-white/10 text-white" : " bg-white/5 text-white/80 hover:bg-white/10"
              }`}
              type="button"
              data-news-year
              data-news-year-value=""
              onClick={() => handleYearChange("")}
            >
              Все годы
            </button>
            {normalizedYears.map((year) => (
              <button
                key={year}
                className={`px-4 py-2 text-xs font-black rounded-xl border border-white/10 transition-all${
                  activeYear === year ? " bg-white/10 text-white" : " bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                type="button"
                data-news-year
                data-news-year-value={year}
                onClick={() => handleYearChange(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 perspective-1000">
        <div className="space-y-12">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-4">
              <span className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">dynamic_feed</span>
              </span>
              Свежие публикации
            </h3>
            {showArchiveLink && (
              <a
                className="group flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase"
                href="/news/archive"
                data-news-archive-link
              >
                Архив новостей
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </a>
            )}
          </div>
          <div className={`grid grid-cols-1 gap-8 ${isLoading ? "opacity-60" : ""}`} data-news-cards>
            {items.map((item) => (
              <button
                key={item.slug || item.id}
                type="button"
                onClick={() => openModal(item.slug)}
                className="news-card-3d glass-effect group cursor-pointer rounded-2xl overflow-hidden flex flex-col md:flex-row text-left"
                role="button"
                data-route-open={item.slug ? `/news/${item.slug}` : undefined}
                data-content-type="news"
                data-content-id={item.slug || item.id}
              >
                <div className="md:w-[45%] h-64 md:h-auto overflow-hidden relative">
                  <div
                    className="w-full h-full bg-center bg-no-repeat bg-cover transform group-hover:scale-110 transition-transform duration-700"
                    style={renderImage(item)}
                  ></div>
                  <div className="absolute inset-0 image-overlay opacity-40"></div>
                </div>
                <div className="p-10 md:w-[55%] flex flex-col justify-center relative">
                  <div className="flex items-center justify-between mb-6">
                    <span className="category-tag-glow bg-white/5 border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-md">
                      {item.category?.name || "Новости"}
                    </span>
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                      {formatDate(item.publishDate)}
                    </span>
                  </div>
                  <h4 className="text-3xl font-black leading-tight group-hover:text-primary transition-colors mb-4">
                    {item.title}
                  </h4>
                  {item.shortDescription && <p className="text-slate-400 text-base font-light mb-0">{item.shortDescription}</p>}
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400 text-sm">
                Новостей пока нет.
              </div>
            )}
          </div>
          <div className="mt-10 flex flex-col gap-4" data-news-pagination-root>
            <div className="flex items-center gap-3">
              <button
                className="glass-button flex items-center gap-2 px-4 h-10 rounded-lg text-white text-sm font-bold transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                aria-label="Предыдущая страница"
                disabled={page <= 1}
                data-news-prev
                onClick={() => loadNewsPage(Math.max(1, page - 1))}
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
                Назад
              </button>
              <div className="flex items-center gap-1" data-news-pages>
                {pagesModel.map((num, idx) =>
                  num === 0 ? (
                    <span key={`dots-${idx}`} className="flex size-10 items-center justify-center text-white/40 text-sm">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${num}`}
                      type="button"
                      className={`glass-button h-10 w-10 rounded-lg text-sm font-bold transition-all${
                        num === page ? " bg-primary text-white" : " text-white/70 hover:text-white"
                      }`}
                      data-news-page={num}
                      aria-pressed={num === page}
                      onClick={() => loadNewsPage(num)}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
              <button
                className="glass-button flex items-center gap-2 px-4 h-10 rounded-lg text-white text-sm font-bold transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                aria-label="Следующая страница"
                disabled={page >= pageCount}
                data-news-next
                onClick={() => loadNewsPage(Math.min(pageCount, page + 1))}
              >
                Вперед
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider" data-news-summary>
              {total
                ? `Показано ${(page - 1) * pageSize + 1}-${Math.min(total, page * pageSize)} из ${total} новостей`
                : "Нет новостей"}
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50" data-news-modal>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={closeModal}
          ></div>
          <div className="relative mx-auto flex h-full w-full max-w-[1100px] items-center justify-center p-6">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl"
              style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
              role="dialog"
              aria-modal="true"
              aria-label="Новость"
            >
              <div className="flex items-center justify-end border-b border-white/10 px-6 py-4">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                  type="button"
                  onClick={closeModal}
                  aria-label="Закрыть"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-8 space-y-6" style={{ overflow: "auto", flex: "1 1 auto", minHeight: 0 }}>
                {modalLoading && <div className="text-slate-400">Загрузка...</div>}
                {!modalLoading && modalItem && (
                  <>
                    <h2 className="text-3xl font-black tracking-tight text-white">{modalItem.title || "Новость"}</h2>
                    {modalItem.content && (
                      <div
                        className="text-slate-300 leading-relaxed space-y-4"
                        dangerouslySetInnerHTML={{ __html: modalItem.content }}
                      />
                    )}
                    <div
                      className={`aspect-[16/9] rounded-xl bg-white/5 border border-white/10 overflow-hidden ${
                        modalImageUrl ? "" : "hidden"
                      }`}
                    >
                      {modalImageUrl && (
                        <img className="h-full w-full object-cover" alt={modalImageAlt} src={modalImageUrl} />
                      )}
                    </div>
                  </>
                )}
                {!modalLoading && !modalItem && <div className="text-slate-400">Новость не найдена.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
