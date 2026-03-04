import { normalizeCmsHref } from "@/lib/routes";

type HomeCooperationCtaProps = {
  section: any;
};

const hasHtml = (value?: string | null) => Boolean(value && /<[^>]+>/.test(value));

export default function HomeCooperationCta({ section }: HomeCooperationCtaProps) {
  if (section?.isVisible === false) return null;
  const perks = Array.isArray(section.perks) ? section.perks : [];
  const titleHtml = String(section.title || "");
  const descHtml = String(section.description || "");

  return (
    <section className="py-32 relative overflow-hidden" data-home-cooperation>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
      <div className="container mx-auto px-6">
        <div className="relative bg-gradient-to-br from-[#0a1622] to-background-dark rounded-[3rem] p-12 md:p-20 border border-white/10 shadow-3xl overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-accent-red/10 blur-[100px] rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 blur-[100px] rounded-full"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="max-w-2xl">
              {section.title && (
                <h2
                  className="text-4xl md:text-6xl mts-bold text-white leading-tight mb-8"
                  data-home-coop-title
                  {...(hasHtml(titleHtml) ? { dangerouslySetInnerHTML: { __html: titleHtml } } : {})}
                >
                  {!hasHtml(titleHtml) ? titleHtml : null}
                </h2>
              )}
              {section.description && (
                <p
                  className="text-white/50 text-xl leading-relaxed font-medium"
                  data-home-coop-desc
                  {...(hasHtml(descHtml) ? { dangerouslySetInnerHTML: { __html: descHtml } } : {})}
                >
                  {!hasHtml(descHtml) ? descHtml : null}
                </p>
              )}
            </div>
            <div className="w-full max-w-md flex flex-col gap-6">
              {section.buttonText && (
                <div className="p-1.5 rounded-[2rem] bg-gradient-to-r from-primary to-accent-red">
                  <a
                    className="w-full bg-background-dark hover:bg-transparent text-white py-6 rounded-[1.8rem] text-xl mts-bold transition-all flex items-center justify-center gap-4 group"
                    href={normalizeCmsHref(section.buttonHref || "#")}
                    data-home-coop-button
                  >
                    {section.buttonIcon && (
                      <span className="material-symbols-outlined" data-home-coop-button-icon>
                        {section.buttonIcon}
                      </span>
                    )}
                    <span data-home-coop-button-text>{section.buttonText}</span>
                  </a>
                </div>
              )}
              {perks.length > 0 && (
                <div className="flex items-center justify-center gap-6 text-white/40" data-home-coop-perks>
                  {perks.map((perk: any, idx: number) => (
                    <div key={`${perk.label || "perk"}-${idx}`} className="flex items-center gap-2" data-home-coop-perk>
                      {perk.icon && (
                        <span className="material-symbols-outlined text-sm" data-home-coop-perk-icon>
                          {perk.icon}
                        </span>
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider" data-home-coop-perk-text>
                        {perk.label || perk.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="absolute bottom-6 right-10 text-white/5 select-none pointer-events-none">
            <span className="material-symbols-outlined text-8xl">ac_unit</span>
          </div>
        </div>
      </div>
    </section>
  );
}
