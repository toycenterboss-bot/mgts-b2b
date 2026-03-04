"use client";

import { useMemo, useState } from "react";
import { resolveMediaUrl } from "@/lib/media";

type FilesTableProps = {
  section: any;
  defaultFilterKey?: string;
};

export default function FilesTable({ section, defaultFilterKey = "" }: FilesTableProps) {
  if (section?.isVisible === false) return null;
  const files = useMemo(() => (Array.isArray(section.files) ? section.files : []), [section.files]);
  const [filterKey, setFilterKey] = useState(defaultFilterKey);
  const [search, setSearch] = useState("");
  const [activeFile, setActiveFile] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return files.filter((file: any) => {
      const matchKey = !filterKey || file.categoryKey === filterKey;
      const name = String(file.name || "").toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase());
      return matchKey && matchSearch;
    });
  }, [files, filterKey, search]);

  const getFileMeta = (file: any) => {
    const rawType = String(file.fileType || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    const type = rawType || (name.split(".").pop() || "");
    if (type.includes("pdf")) return { icon: "picture_as_pdf", color: "red" };
    if (type.includes("doc")) return { icon: "description", color: "blue" };
    if (type.includes("xls") || type.includes("csv")) return { icon: "table_chart", color: "emerald" };
    if (type.includes("ppt")) return { icon: "slideshow", color: "amber" };
    return { icon: "insert_drive_file", color: "slate" };
  };

  const openPreview = (file: any) => {
    const url = resolveMediaUrl(file.file || null);
    if (!url) return;
    setActiveFile({ ...file, url });
  };

  const colorClasses = {
    red: {
      border: "border-l-red-500/50",
      glow: "bg-red-500/20",
      gradient: "from-red-600 to-red-800",
      hover: "group-hover:text-red-400",
    },
    blue: {
      border: "border-l-blue-500/50",
      glow: "bg-blue-500/20",
      gradient: "from-blue-600 to-blue-800",
      hover: "group-hover:text-blue-400",
    },
    amber: {
      border: "border-l-amber-500/50",
      glow: "bg-amber-500/20",
      gradient: "from-amber-500 to-amber-700",
      hover: "group-hover:text-amber-400",
    },
    emerald: {
      border: "border-l-emerald-500/50",
      glow: "bg-emerald-500/20",
      gradient: "from-emerald-600 to-emerald-800",
      hover: "group-hover:text-emerald-400",
    },
    slate: {
      border: "border-l-slate-500/50",
      glow: "bg-slate-500/20",
      gradient: "from-slate-600 to-slate-800",
      hover: "group-hover:text-slate-400",
    },
  } as const;

  return (
    <section>
      {section.title && (
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">folder_open</span>
            <span data-doc-docs-title>{section.title}</span>
          </h3>
          <span className="text-slate-400 text-sm" data-doc-docs-count>
            Найдено: {filtered.length} файлов
          </span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          className="w-full md:w-1/2 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl h-12 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          placeholder="Поиск по документам"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full md:w-1/3 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl h-12 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
        >
          <option value="">Все категории</option>
          {[...new Set(files.map((f: any) => f.categoryKey).filter(Boolean))].map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((file: any, idx: number) => {
          const url = resolveMediaUrl(file.file || null);
          const meta = getFileMeta(file);
          const palette = colorClasses[meta.color as keyof typeof colorClasses] || colorClasses.slate;
          return (
            <div
              key={`${file.name || "file"}-${idx}`}
              className={`group flex items-center justify-between p-5 glass-effect rounded-2xl hover:bg-white/10 transition-all border-l-4 ${palette.border}`}
              role="button"
              tabIndex={0}
              onClick={() => openPreview(file)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openPreview(file);
              }}
            >
              <div className="flex items-center gap-5">
                <div className="size-14 relative flex items-center justify-center">
                  <div
                    className={`absolute inset-0 ${palette.glow} blur-xl opacity-0 group-hover:opacity-100 transition-opacity`}
                  ></div>
                  <div className={`relative bg-gradient-to-br ${palette.gradient} p-3 rounded-lg shadow-2xl icon-3d`}>
                    <span className="material-symbols-outlined text-white text-2xl fill-1">{meta.icon}</span>
                  </div>
                </div>
                <div>
                  <h5
                    className={`text-[15px] font-bold text-white mb-1 ${palette.hover} transition-colors`}
                  >
                    {file.name || "Документ"}
                  </h5>
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                    {file.fileType || "DOC"}{file.size ? ` • ${file.size}` : ""}
                  </p>
                  {file.description && <p className="text-xs text-slate-400 mt-2">{file.description}</p>}
                </div>
              </div>
              <button
                className="size-10 flex items-center justify-center bg-white/5 border border-white/10 text-white rounded-full hover:bg-primary hover:border-primary transition-all shadow-lg"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (url) window.open(url, "_blank");
                }}
              >
                <span className="material-symbols-outlined text-lg">download</span>
              </button>
            </div>
          );
        })}
      </div>

      {activeFile && (
        <div className="fixed inset-0 z-50" data-doc-modal>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setActiveFile(null)}
          ></div>
          <div className="relative mx-auto flex h-full w-full max-w-[1100px] items-center justify-center p-6">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl"
              style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="text-sm font-bold text-white">{activeFile.name || "Документ"}</div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                  type="button"
                  onClick={() => setActiveFile(null)}
                  aria-label="Закрыть"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4" style={{ overflow: "auto", flex: "1 1 auto", minHeight: 0 }}>
                <div className="aspect-[16/9] rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  {activeFile.url ? (
                    <iframe
                      title={activeFile.name || "Документ"}
                      src={activeFile.url}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      Просмотр недоступен
                    </div>
                  )}
                </div>
                {activeFile.url && (
                  <a
                    className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                    href={activeFile.url}
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
