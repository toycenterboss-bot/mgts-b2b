import { resolveMediaUrl } from "@/lib/media";

type ServiceHeroProps = {
  hero?: any;
};

const DEFAULT_SERVICE_BG = "http://localhost:8002/assets/images/external/60b54c10dd84.png";

const resolveSlaIcon = (label?: string, value?: string) => {
  const l = String(label || "").toLowerCase();
  const v = String(value || "").toLowerCase();
  if (l.includes("реакц") || l.includes("скорост") || v.includes("гбит")) return "speed";
  if (l.includes("аптайм") || l.includes("sla")) return "verified_user";
  if (l.includes("поддерж") || l.includes("24")) return "support_agent";
  if (l.includes("кач")) return "fact_check";
  return "info";
};

const resolveCtaClass = (style?: string) => {
  const base =
    "group flex min-w-[200px] cursor-pointer items-center justify-center rounded-lg h-14 px-8 text-base font-bold transition-all gap-2";
  if (style === "outline") {
    return `${base} border border-slate-300 dark:border-slate-700 bg-white/5 dark:bg-slate-800/50 text-white hover:bg-white/10 dark:hover:bg-slate-800`;
  }
  if (style === "secondary") {
    return `${base} bg-white/10 border border-white/20 text-white backdrop-blur-sm hover:bg-white/20`;
  }
  return `${base} bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30`;
};

export default function ServiceHero({ hero }: ServiceHeroProps) {
  if (!hero) return null;
  const bgUrl = resolveMediaUrl(hero.backgroundImage || null) || DEFAULT_SERVICE_BG;
  const ctas = Array.isArray(hero.ctaButtons) ? hero.ctaButtons : [];
  const slaItems = Array.isArray(hero.slaItems) ? hero.slaItems : [];
  const titleHtml = String(hero.title || "");
  const useHtmlTitle = titleHtml.includes("<");
  const showBadge = hero?.showBadge !== false;
  const badgeText = String(hero?.badge || hero?.badgeText || hero?.tagline || "Технологическое лидерство").trim();

  return (
    <section
      className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased"
      data-stitch-block="hero_section_and_cta_banner_2"
    >
      <main className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 winter-frost opacity-60"></div>
        <div className="absolute top-10 right-10 text-white/10 select-none">
          <span className="material-symbols-outlined text-6xl">ac_unit</span>
        </div>
        <section className="relative min-h-[85vh] flex items-center pt-20 pb-32">
          <div className="absolute inset-0 z-0">
            {bgUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-10 grayscale"
                style={{ backgroundImage: `url('${bgUrl}')` }}
                data-service-hero-bg
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-background-dark via-background-dark/90 to-primary/20" />
          </div>
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-12 md:py-24 relative z-10">
            <div className="max-w-[640px]">
              {showBadge && badgeText && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  {badgeText}
                </div>
              )}
              {hero.title && (
                useHtmlTitle ? (
                  <h1
                    className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-white mb-6"
                    data-cms-hero-title
                    dangerouslySetInnerHTML={{ __html: titleHtml }}
                  />
                ) : (
                  <h1
                    className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-white mb-6"
                    data-cms-hero-title
                  >
                    {hero.title}
                  </h1>
                )
              )}
              {hero.subtitle && (
                <p className="text-lg md:text-xl text-slate-400 max-w-[540px] mb-10 leading-relaxed" data-cms-hero-subtitle>
                  {hero.subtitle}
                </p>
              )}
              {ctas.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {ctas.map((cta: any, idx: number) => (
                    <a
                      key={`${cta?.text || "cta"}-${idx}`}
                      href={cta?.href || "#"}
                      className={resolveCtaClass(cta?.style)}
                      data-service-cta-href={cta?.href || undefined}
                    >
                  {cta?.text || "Подробнее"}
                  {String(cta?.style || "primary").toLowerCase() === "primary" && (
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
          {slaItems.length > 0 && (
            <div className="absolute bottom-0 left-0 w-full bg-white/5 backdrop-blur-xl border-t border-white/10 py-8 hidden lg:block">
              <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-4 gap-8">
                {slaItems.map((item: any, idx: number) => (
                  <div key={`${item?.label || "sla"}-${idx}`} className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      {resolveSlaIcon(item?.label, item?.value)}
                    </span>
                    <div>
                      <div className="text-white font-bold">{item?.value}</div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider">{item?.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </section>
  );
}
