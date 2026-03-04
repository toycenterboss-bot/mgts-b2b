"use client";

import { useEffect, useMemo, useState } from "react";

type DocumentTabsProps = {
  section: any;
  template?: string;
  onTabChange?: (filterKey: string) => void;
  pageTitle?: string;
  pageSubtitle?: string;
};

type DocItem = {
  title: string;
  href: string;
  isImage?: boolean;
  isPdf?: boolean;
};

const extractIntro = (html: string) => {
  if (!html || typeof window === "undefined") return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const p = doc.querySelector("p");
    return (p?.textContent || "").trim();
  } catch {
    return "";
  }
};

const extractDocs = (html: string): DocItem[] => {
  if (!html || typeof window === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a[href]"));
    return anchors
      .map((a) => {
        const href = a.getAttribute("href") || "";
        const title = (a.textContent || "").trim();
        if (!href) return null;
        const fallback = href.split("/").pop() || "Документ";
        return { title: title || fallback, href };
      })
      .filter(Boolean) as DocItem[];
  } catch {
    return [];
  }
};

const getDocMeta = (href: string) => {
  const clean = href.split("?")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase();
  if (ext.includes("pdf")) return { icon: "picture_as_pdf", color: "text-red-500", bg: "bg-red-500/10", label: "PDF" };
  if (ext.includes("doc")) return { icon: "description", color: "text-blue-500", bg: "bg-blue-500/10", label: "DOCX" };
  if (ext.includes("xls") || ext.includes("csv"))
    return { icon: "table_chart", color: "text-amber-500", bg: "bg-amber-500/10", label: "XLSX" };
  if (ext.includes("zip") || ext.includes("rar"))
    return { icon: "inventory_2", color: "text-primary", bg: "bg-primary/10", label: "ARCHIVE" };
  return { icon: "insert_drive_file", color: "text-slate-500", bg: "bg-slate-500/10", label: ext.toUpperCase() || "DOC" };
};

export default function DocumentTabs({
  section,
  template = "",
  onTabChange,
  pageTitle,
  pageSubtitle,
}: DocumentTabsProps) {
  if (section?.isVisible === false) return null;
  const normalizedTemplate = String(template || "").trim();
  const isDocPage = normalizedTemplate === "TPL_Doc_Page";
  const tabs = useMemo(() => (Array.isArray(section.tabs) ? section.tabs : []), [section.tabs]);
  const safeDefault = 0;
  const [activeIndex, setActiveIndex] = useState(safeDefault);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);

  const active = tabs[activeIndex];
  const activeChildren = useMemo(
    () => (Array.isArray(active?.children) ? active.children.filter(Boolean) : []),
    [active?.children]
  );

  useEffect(() => {
    setActiveChildIndex(0);
  }, [activeIndex]);

  const activeContent = activeChildren.length > 0 ? activeChildren[activeChildIndex]?.content || "" : active?.content || "";
  const docs = useMemo(() => extractDocs(activeContent), [activeContent]);
  const intro = useMemo(() => extractIntro(activeContent), [activeContent]);
  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((doc) => doc.title.toLowerCase().includes(q));
  }, [docs, search]);

  const headerTitle = pageTitle || section.title;
  const headerSubtitle = pageSubtitle || section.subtitle;
  const showTabsLabel = Boolean(pageTitle && section.title && pageTitle !== section.title);

  return (
    <section>
      {headerTitle && isDocPage && (
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            {headerTitle}
          </h1>
          {headerSubtitle && (
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl font-light">
              {headerSubtitle}
            </p>
          )}
        </div>
      )}
      <div className={isDocPage ? "" : "document-tabs rounded-2xl border border-white/10 bg-white/5 p-6"}>
        {!isDocPage && section.title && (
          <h2 className="document-tabs__title text-xl font-black tracking-tight mb-4">{section.title}</h2>
        )}
        {showTabsLabel && (
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">{section.title}</div>
        )}
        <div className={isDocPage ? "" : "document-tabs__tabs-stack space-y-2 mb-4"}>
          <div
            className={
              isDocPage
                ? "border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto"
                : "overflow-x-auto"
            }
            data-doc-top-tabs
          >
            <div
              className={
                isDocPage
                  ? "flex gap-10 whitespace-nowrap min-w-max"
                  : "document-tabs__tabs flex flex-wrap gap-2"
              }
            >
              {tabs.map((tab: any, idx: number) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${tab.name || "tab"}-${idx}`}
                    className={
                      isDocPage
                        ? isActive
                          ? "relative pb-4 text-sm font-bold text-primary"
                          : "pb-4 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        : `document-tabs__tab-button px-4 py-2 rounded-lg transition-colors border text-sm font-black ${
                            isActive
                              ? "bg-primary/20 border-primary/40 text-white"
                              : "bg-black/20 border-white/10 text-white/70 hover:bg-black/10"
                          }`
                    }
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      onTabChange?.(tab.filterKey || "");
                    }}
                  >
                    {tab.name || "Категория"}
                    {isDocPage && isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isDocPage && (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              className="w-full md:flex-1 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl h-12 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Поиск по документам"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="w-full md:w-64 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl h-12 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={activeIndex}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) {
                  setActiveIndex(next);
                  onTabChange?.(tabs[next]?.filterKey || "");
                }
              }}
            >
              {tabs.map((tab: any, idx: number) => (
                <option key={`${tab.name || "tab"}-${idx}`} value={idx}>
                  {tab.name || "Категория"}
                </option>
              ))}
            </select>
          </div>
        )}

        {isDocPage && activeChildren.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeChildren.map((child: any, idx: number) => {
              const isActive = idx === activeChildIndex;
              return (
                <button
                  key={`${child.name || "child"}-${idx}`}
                  type="button"
                  className={
                    isActive
                      ? "px-4 py-2 rounded-full bg-primary text-white text-xs font-bold"
                      : "px-4 py-2 rounded-full border border-slate-700 text-slate-300 text-xs font-bold hover:border-primary/60 hover:text-white transition-colors"
                  }
                  onClick={() => setActiveChildIndex(idx)}
                >
                  {child.name || "Категория"}
                </button>
              );
            })}
          </div>
        )}

        {isDocPage && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">folder_open</span>
              <span data-doc-docs-title>Документация</span>
            </h3>
            <span className="text-slate-400 text-sm" data-doc-docs-count>
              Найдено: {filteredDocs.length} файлов
            </span>
          </div>
        )}

        {intro && isDocPage && (
          <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {intro}
          </p>
        )}

        {filteredDocs.length > 0 && (
          <div className={isDocPage ? "space-y-4" : "document-tabs__tab-content"}>
            <div className="space-y-4">
              {filteredDocs.map((doc) => {
                const meta = getDocMeta(doc.href);
                const ext = (doc.href.split("?")[0].split(".").pop() || "").toLowerCase();
                const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
                const isPdf = ext === "pdf";
                const itemClass =
                  "flex items-center justify-between p-4 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";
                return (
                  <div
                    key={`${doc.href}-${doc.title}`}
                    className={itemClass}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveDoc({ ...doc, isImage, isPdf })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setActiveDoc({ ...doc, isImage, isPdf });
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`size-10 flex items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}>
                        <span className="material-symbols-outlined">{meta.icon}</span>
                      </div>
                      <div>
                        <h5 className={`text-sm font-bold leading-none mb-1 ${isDocPage ? "" : "text-white"}`}>
                          {doc.title}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {meta.label} • документ
                        </p>
                      </div>
                    </div>
                    <button
                      className={
                        isDocPage
                          ? "size-9 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all"
                          : "size-9 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all"
                      }
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(doc.href, "_blank");
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredDocs.length === 0 && active?.content && (
          <div
            className="text-slate-600 dark:text-slate-400 text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: active.content }}
          />
        )}
      </div>

      {activeDoc && (
        <div className="fixed inset-0 z-50" data-doc-modal>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setActiveDoc(null)}
          ></div>
          <div className="relative mx-auto flex h-full w-full max-w-[1100px] items-center justify-center p-6">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl"
              style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="text-sm font-bold text-white">{activeDoc.title || "Документ"}</div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                  type="button"
                  onClick={() => setActiveDoc(null)}
                  aria-label="Закрыть"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4" style={{ overflow: "auto", flex: "1 1 auto", minHeight: 0 }}>
                <div className="aspect-[16/9] rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                  {!activeDoc.href && (
                    <div className="text-slate-400">Просмотр недоступен</div>
                  )}
                  {activeDoc.href && activeDoc.isPdf && (
                    <iframe title={activeDoc.title || "Документ"} src={activeDoc.href} className="w-full h-full" />
                  )}
                  {activeDoc.href && activeDoc.isImage && (
                    <img src={activeDoc.href} alt={activeDoc.title || "Документ"} className="w-full h-full object-contain" />
                  )}
                  {activeDoc.href && !activeDoc.isPdf && !activeDoc.isImage && (
                    <div className="text-slate-400 text-sm text-center px-6">
                      Предпросмотр доступен только для PDF и изображений. Используйте кнопку для открытия файла.
                    </div>
                  )}
                </div>
                {activeDoc.href && (
                  <a
                    className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                    href={activeDoc.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть в новой вкладке
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
