type ScenarioFaqProps = {
  section: any;
};

export default function ScenarioFaq({ section }: ScenarioFaqProps) {
  if (section?.isVisible === false) return null;
  const items = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
  if (!section?.title && items.length === 0) return null;
  const subtitle =
    String(section?.subtitle || "").trim() ||
    "Ответы на частые вопросы по сценарию и подключению услуг MGTS.";

  return (
    <section
      className="bg-background-light dark:bg-background-dark font-display text-fg dark:text-fg"
      data-stitch-block="scenario_faq_block"
    >
      <div className="max-w-5xl mx-auto px-10 py-12" data-scenario-faq>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black tracking-tight mb-4">{section?.title || "FAQ / Поддержка"}</h2>
            <p className="text-fg-subtle dark:text-fg-muted text-lg leading-relaxed">{subtitle}</p>
          </div>
          <button className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-lg">support_agent</span>
            Связаться с нами
          </button>
        </div>
        <div className="flex flex-col gap-4" data-accordion data-accordion-multiple="false">
          {items.map((item: any, idx: number) => (
            <details
              key={`${item.question || "faq"}-${idx}`}
              className="group bg-primary/[0.03] dark:bg-primary/[0.05] rounded-xl border border-primary/30 dark:border-primary/40 overflow-hidden transition-all shadow-sm"
              open={idx === 0}
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-bold text-accent-text dark:text-accent-text">{item.question}</span>
                <span className="material-symbols-outlined text-accent-text group-open:rotate-180 transition-transform duration-300">
                  expand_more
                </span>
              </summary>
              {item.answer && (
                <div
                  className="px-5 pb-6 text-fg dark:text-fg-muted text-sm leading-relaxed border-t border-primary/10 mt-1 pt-4"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
