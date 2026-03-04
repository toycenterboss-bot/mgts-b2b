type TariffTableProps = {
  section: any;
};

export default function TariffTable({ section }: TariffTableProps) {
  if (section?.isVisible === false) return null;
  const columns = Array.isArray(section.columns) ? section.columns : [];
  const rows = Array.isArray(section.rows) ? section.rows : [];

  const showCustomization =
    section?.showCustomization !== false &&
    !/абонентская плата/i.test(String(section?.title || ""));
  const customizationTitle =
    section?.customizationTitle || "Нужна индивидуальная конфигурация?";
  const customizationText =
    section?.customizationText ||
    "Мы можем подготовить специфическое решение под ваши задачи: от выделенных каналов связи до гибридных облачных инфраструктур с особыми требованиями безопасности.";
  const customizationButtonText =
    section?.customizationButtonText || "Заказать консультацию";
  const customizationButtonHref = section?.customizationButtonHref || "/contact";

  return (
    <section className="tariff-table max-w-[1200px] mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark p-6 md:p-8 shadow-2xl shadow-primary/5">
      {section.title && (
        <h2 className="tariff-table__title text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-4">
          {section.title}
        </h2>
      )}
      {section.description && (
        <p className="text-slate-500 dark:text-slate-400 text-lg font-normal max-w-2xl mb-6">
          {section.description}
        </p>
      )}
      <div className="tariff-table__table w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shadow-2xl shadow-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse tariff-table__table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                {columns.map((col: any, idx: number) => (
                  <th
                    key={`${col.key || col.name}-${idx}`}
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
              {rows.map((row: any, idx: number) => (
                <tr key={`row-${idx}`} className="row-hover transition-colors">
                  {columns.map((col: any, cIdx: number) => (
                    <td
                      key={`cell-${idx}-${cIdx}`}
                      className={
                        cIdx === 0
                          ? "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-slate-900 dark:text-slate-100 font-semibold"
                          : "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-center text-slate-900 dark:text-slate-100"
                      }
                    >
                      {row?.[col.key] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showCustomization && (
        <div className="mt-12 p-8 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
          <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-3xl">info</span>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {customizationTitle}
            </h4>
            <p className="text-slate-500 dark:text-slate-400">{customizationText}</p>
          </div>
          <a
            className="shrink-0 px-8 h-14 rounded-lg bg-transparent border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center"
            href={customizationButtonHref}
          >
            {customizationButtonText}
          </a>
        </div>
      )}
    </section>
  );
}
