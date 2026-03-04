import Icon from "@/components/ui/Icon";
import { normalizeCmsHref } from "@/lib/routes";

type HomeIndustryScenariosProps = {
  section: any;
};

export default function HomeIndustryScenarios({ section }: HomeIndustryScenariosProps) {
  if (section?.isVisible === false) return null;
  const items = Array.isArray(section.items) ? section.items : [];

  return (
    <section className="mt-32" data-home-industry>
      {section.title && (
        <h2 className="text-white text-3xl font-bold tracking-tight mb-12" data-home-industry-title>
          {section.title}
        </h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8" data-home-industry-grid>
        {items.map((item: any, idx: number) => (
          <div
            key={`${item.title || "scenario"}-${idx}`}
            className={`glass-card h-[400px] rounded-3xl group cursor-pointer relative${
              item.tagTone === "primary" ? " border-accent/20" : ""
            }`}
            data-home-industry-card
          >
            <div className="light-sweep"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1923] via-transparent to-transparent z-10"></div>
            <div className="p-10 h-full flex flex-col relative z-20">
              <div className="icon-3d mb-auto">
                <div
                  className={`size-16 rounded-2xl ${
                    item.tagTone === "primary"
                      ? "bg-accent/10 border-accent/20 text-accent"
                      : "bg-primary/10 border-primary/20 text-primary"
                  } border flex items-center justify-center backdrop-blur-md`}
                  data-home-industry-card-icon-wrap
                >
                  {item.icon && (
                    <span className="material-symbols-outlined text-4xl" data-home-industry-card-icon>
                      {item.icon}
                    </span>
                  )}
                  {!item.icon && <Icon name="hub" size={36} className="text-current" />}
                </div>
              </div>
              <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                {item.tag && (
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 block ${
                      item.tagTone === "accent" ? "text-accent" : "text-primary"
                    }`}
                    data-home-industry-card-tag
                  >
                    {item.tag}
                  </span>
                )}
                {item.title && (
                  <h3 className="text-white text-2xl font-bold mb-4" data-home-industry-card-title>
                    {item.title}
                  </h3>
                )}
                {item.description && (
                  <p
                    className="text-[#9aabbc] text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    data-home-industry-card-desc
                  >
                    {item.description}
                  </p>
                )}
                {item.buttonText && (
                  <a
                    className="mt-6 inline-flex px-6 py-3 bg-white text-black text-xs font-black rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0"
                    href={normalizeCmsHref(item.buttonHref || "#")}
                    data-home-industry-card-button
                  >
                    {item.buttonText}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
