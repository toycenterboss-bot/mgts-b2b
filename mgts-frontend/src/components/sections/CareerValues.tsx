import Icon from "@/components/ui/Icon";

type CareerValuesProps = {
  section: any;
};

export default function CareerValues({ section }: CareerValuesProps) {
  if (section?.isVisible === false) return null;
  const items = Array.isArray(section.items) ? section.items : [];

  return (
    <section className="career-values py-20 bg-background-dark" data-career-section="values">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            {section.eyebrow && (
              <h3 className="text-primary font-bold text-sm tracking-widest uppercase">{section.eyebrow}</h3>
            )}
            {section.title && <h2 className="text-3xl font-bold text-white">{section.title}</h2>}
          </div>
          {section.description && <p className="text-slate-400 max-w-sm text-sm">{section.description}</p>}
        </div>
        <div className="career-values__grid">
          {items.map((item: any, idx: number) => (
            <div
              key={`value-${idx}`}
              className="career-values__item glass-card p-8 rounded-xl border border-white/5 hover:border-primary/50 transition-all group"
            >
              {item.icon && (
                <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                  <Icon name={item.icon} size={28} />
                </div>
              )}
              {item.title && <div className="career-values__item-title">{item.title}</div>}
              {item.description && <div className="career-values__item-text">{item.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
