"use client";

import { useState } from "react";

type SectionTableProps = {
  section: any;
};

const extFromUrl = (url: string) => {
  const clean = String(url || "").split("?")[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
};

const fileTypeIcon = (ext: string) => {
  if (ext === "pdf") return "picture_as_pdf";
  if (ext === "doc" || ext === "docx") return "description";
  if (ext === "xls" || ext === "xlsx") return "grid_on";
  if (ext === "zip") return "folder_zip";
  return "attach_file";
};

const humanFileType = (ext: string) => {
  if (ext === "pdf") return "PDF";
  if (ext === "doc") return "DOC";
  if (ext === "docx") return "DOCX";
  if (ext === "xls") return "XLS";
  if (ext === "xlsx") return "XLSX";
  if (ext === "zip") return "ZIP";
  return ext.toUpperCase() || "FILE";
};

const docIconColors = (ext: string) => {
  if (ext === "pdf") return ["bg-red-500/10", "text-red-500"];
  if (ext === "doc" || ext === "docx") return ["bg-blue-500/10", "text-blue-500"];
  if (ext === "xls" || ext === "xlsx") return ["bg-emerald-500/10", "text-emerald-400"];
  return ["bg-slate-500/10", "text-slate-400"];
};

const isDocExt = (ext: string) => ["pdf", "doc", "docx", "xls", "xlsx", "zip"].includes(ext);

const normalizeTableData = (tableData: any[]) => {
  if (!Array.isArray(tableData) || !tableData.length) return { columns: [], rows: [] };
  if (Array.isArray(tableData[0])) {
    const columns = tableData[0].map((name: any, idx: number) => ({
      key: `col-${idx}`,
      name,
    }));
    return { columns, rows: tableData.slice(1) };
  }
  if (tableData[0] && typeof tableData[0] === "object") {
    const keys = Object.keys(tableData[0] || {});
    const columns = keys.map((key) => ({ key, name: key }));
    return { columns, rows: tableData };
  }
  return { columns: [], rows: [] };
};

type DocPreview = {
  title: string;
  href: string;
  isPdf: boolean;
  isImage: boolean;
};

const renderDocList = (
  links: { href: string; label: string }[],
  onPreview: (doc: DocPreview) => void
) => (
  <div className="space-y-4">
    {links.map((link, idx) => {
      const href = link.href;
      const ext = extFromUrl(href);
      const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
      const isPdf = ext === "pdf";
      const [bgCls, textCls] = docIconColors(ext);
      return (
        <div
          key={`${href}-${idx}`}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          data-doc-file-item
          data-file-name={String(link.label || "").toLowerCase()}
          data-file-type={ext}
          data-route-open={href}
        >
          <div className="flex items-center gap-4">
            <div className={`size-10 flex items-center justify-center ${bgCls} ${textCls} rounded-lg`}>
              <span className="material-symbols-outlined">{fileTypeIcon(ext)}</span>
            </div>
            <div>
              <button
                type="button"
                className="text-sm font-bold leading-none mb-1 text-left hover:text-primary transition-colors"
                onClick={() => onPreview({ title: link.label, href, isPdf, isImage })}
              >
                {link.label}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400">{humanFileType(ext)} • документ</p>
            </div>
          </div>
          <a
            className="size-9 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all"
            href={href}
            download
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </a>
        </div>
      );
    })}
  </div>
);

const renderLink = (item: any, key: string) => {
  const label = item.text || item.label || item.href || "Ссылка";
  const href = item.href || item.url || "#";
  const isExternal = item.isExternal || String(href).startsWith("http");
  const isDownload =
    Boolean(item.download) ||
    /\.(pdf|docx?|xlsx?|csv|zip|rar)$/i.test(String(href).split("?")[0] || "");
  const linkClass = isDownload
    ? "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs font-bold text-slate-200 hover:bg-primary/20 hover:border-primary/40 transition-colors"
    : "text-primary hover:underline";
  return (
    <a
      key={key}
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      download={item.download || undefined}
      className={linkClass}
    >
      {isDownload && <span className="material-symbols-outlined text-sm">download</span>}
      <span>{label}</span>
    </a>
  );
};

const renderCell = (
  cell: any,
  idx: number,
  isFirst: boolean,
  onPreview: (doc: DocPreview) => void
) => {
  const cellClass = isFirst
    ? "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-slate-900 dark:text-slate-100 font-semibold"
    : "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-center text-slate-900 dark:text-slate-100";
  if (Array.isArray(cell)) {
    const links = cell.filter((item) => item && typeof item === "object" && (item.href || item.text || item.url));
    const docLinks = links
      .map((item) => ({ href: item.href || item.url || "", label: item.text || item.label || item.href || "" }))
      .filter((link) => link.href && isDocExt(extFromUrl(link.href)));
    return (
      <td key={`cell-${idx}`} className={cellClass}>
        {docLinks.length > 0 ? (
          renderDocList(docLinks, onPreview)
        ) : links.length > 0 ? (
          <div className="flex flex-col gap-1">
            {links.map((item, linkIdx) => renderLink(item, `cell-${idx}-link-${linkIdx}`))}
          </div>
        ) : (
          cell.join(", ")
        )}
      </td>
    );
  }
  if (cell && typeof cell === "object" && (cell.href || cell.text || cell.url)) {
    const link = { href: cell.href || cell.url || "", label: cell.text || cell.label || cell.href || "" };
    if (link.href && isDocExt(extFromUrl(link.href))) {
      return (
        <td key={`cell-${idx}`} className={cellClass}>
          {renderDocList([link], onPreview)}
        </td>
      );
    }
    return (
      <td key={`cell-${idx}`} className={cellClass}>
        {renderLink(cell, `cell-${idx}-link`)}
      </td>
    );
  }
  return (
    <td key={`cell-${idx}`} className={cellClass}>
      {cell ?? ""}
    </td>
  );
};

export default function SectionTable({ section }: SectionTableProps) {
  if (section?.isVisible === false) return null;
  const tableData = Array.isArray(section.tableData) ? section.tableData : [];
  const { columns, rows } = normalizeTableData(tableData);
  const [activeDoc, setActiveDoc] = useState<DocPreview | null>(null);

  return (
    <section className="section-table max-w-[1200px] mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark p-6 md:p-8 shadow-2xl shadow-primary/5">
      {section.title && (
        <h2 className="section-table__title text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-4">
          {section.title}
        </h2>
      )}
      {section.description && (
        <p className="section-table__description text-slate-500 dark:text-slate-400 text-lg font-normal max-w-2xl mb-6">
          {section.description}
        </p>
      )}
      {columns.length > 0 && (
        <div className="section-table__table w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shadow-2xl shadow-primary/5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse section-table__table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  {columns.map((col: any, idx: number) => (
                    <th
                      key={`head-${idx}`}
                      className={
                        idx === 0
                          ? "p-6 text-left text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest"
                          : "p-6 text-center text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest"
                      }
                    >
                      {col.name || col.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, rowIdx: number) => (
                  <tr key={`row-${rowIdx}`} className="row-hover transition-colors">
                    {Array.isArray(row)
                      ? row.map((cell: any, idx: number) => renderCell(cell, idx, idx === 0, setActiveDoc))
                      : columns.map((col: any, idx: number) =>
                          renderCell(row?.[col.key], idx, idx === 0, setActiveDoc)
                        )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {section.showCustomization !== false && (
        <div className="mt-12 p-8 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
          <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-3xl">info</span>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {section.customizationTitle || "Нужна индивидуальная конфигурация?"}
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              {section.customizationText ||
                "Мы можем подготовить специфическое решение под ваши задачи: от выделенных каналов связи до гибридных облачных инфраструктур с особыми требованиями безопасности."}
            </p>
          </div>
          <a
            className="shrink-0 px-8 h-14 rounded-lg bg-transparent border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center"
            href={section.customizationButtonHref || "/contact"}
          >
            {section.customizationButtonText || "Заказать консультацию"}
          </a>
        </div>
      )}
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
                  {!activeDoc.href && <div className="text-slate-400">Просмотр недоступен</div>}
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
                  <a className="inline-flex items-center gap-2 text-primary font-bold text-sm" href={activeDoc.href} download>
                    <span className="material-symbols-outlined text-base">download</span>
                    Скачать файл
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
