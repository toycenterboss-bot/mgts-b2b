import { DEFAULT_HERO_FALLBACK_URL, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type ScenarioHeroProps = {
  hero?: any;
  title?: string;
  subtitle?: string;
  featureCards?: any[];
};

const resolveCtaClass = (style?: string) => {
  const normalized = String(style || "").toLowerCase();
  if (normalized === "secondary" || normalized === "outline") {
    return "flex min-w-[180px] items-center justify-center rounded-lg h-14 px-8 bg-fg/10 border border-fg/20 text-fg text-lg font-bold backdrop-blur-sm transition-all hover:bg-fg/20";
  }
  return "flex min-w-[180px] items-center justify-center rounded-lg h-14 px-8 bg-primary text-on-primary text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/30";
};

const resolveFeatureIcon = (index: number, icon?: string) => {
  if (icon) return icon;
  if (index === 1) return "security";
  if (index === 2) return "trending_up";
  return "router";
};

export default function ScenarioHero({ hero, title, subtitle, featureCards = [] }: ScenarioHeroProps) {
  const bgUrl = resolveMediaUrl(hero?.backgroundImage || null) || DEFAULT_HERO_FALLBACK_URL;
  const ctas = Array.isArray(hero?.ctaButtons) ? hero.ctaButtons.filter(Boolean) : [];
  const primary = ctas.find((cta: any) => cta?.style === "primary") || ctas[0] || null;
  const secondary =
    ctas.find((cta: any) => cta?.style === "secondary" || cta?.style === "outline") || ctas[1] || null;
  const slaItems = Array.isArray(hero?.slaItems) ? hero.slaItems.filter(Boolean) : [];
  const heading = String(hero?.title || title || "");
  const subheading = String(hero?.subtitle || subtitle || "");
  const cards = Array.isArray(featureCards) ? featureCards.slice(0, 3) : [];

  return (
    <>
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      >
        <div className="absolute inset-0 bg-bg/40"></div>
        <div className="absolute inset-0 hero-gradient"></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-8 max-w-[640px]">
          {heading && (
            <h1 className="text-fg text-5xl md:text-7xl font-black leading-[1.1] tracking-tight" data-cms-hero-title>
              {heading}
            </h1>
          )}
          {subheading && (
            <p className="text-fg-muted text-lg md:text-xl font-normal leading-relaxed" data-cms-hero-subtitle>
              {subheading}
            </p>
          )}
          {(primary || secondary) && (
            <div className="flex flex-wrap gap-4 mt-4">
              {primary && (
                <a className={resolveCtaClass(primary.style)} href={normalizeCmsHref(primary.href || "#")}>
                  {primary.text || primary.label || "Подключить сейчас"}
                </a>
              )}
              {secondary && (
                <a className={resolveCtaClass(secondary.style)} href={normalizeCmsHref(secondary.href || "#")}>
                  {secondary.text || secondary.label || "Посмотреть тарифы"}
                </a>
              )}
            </div>
          )}
          {slaItems.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-8">
              {slaItems.map((item: any, idx: number) => (
                <div
                  key={`${item.label || "sla"}-${idx}`}
                  className="flex flex-col gap-1 p-4 rounded-xl border border-fg/10 bg-fg/5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-accent-text text-xl">
                      {item.icon || item.iconName || "verified"}
                    </span>
                    <span className="text-fg font-bold text-xl tracking-tight">{item.value}</span>
                  </div>
                  <p className="text-fg-subtle text-xs font-medium uppercase tracking-widest">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {cards.length > 0 && (
          <div className="hidden lg:grid grid-cols-2 gap-4 h-full py-12">
            <div className="flex flex-col gap-4 translate-y-8">
              {cards.slice(0, 2).map((card: any, idx: number) => (
                <div
                  key={`${card.title || "feature"}-${idx}`}
                  className="bg-surface/80 backdrop-blur-md border border-fg/10 p-6 rounded-2xl flex flex-col gap-4 hover:border-primary/50 transition-all group"
                >
                  <span className="material-symbols-outlined text-4xl text-accent-text group-hover:scale-110 transition-transform">
                    {resolveFeatureIcon(idx, card.icon)}
                  </span>
                  <h3 className="text-xl font-bold text-fg leading-tight">{card.title}</h3>
                  <p className="text-fg-subtle text-sm">{card.description}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {cards.slice(2, 3).map((card: any, idx: number) => (
                <div
                  key={`${card.title || "feature"}-${idx}`}
                  className="bg-surface/80 backdrop-blur-md border border-fg/10 p-6 rounded-2xl flex flex-col gap-4 hover:border-primary/50 transition-all group"
                >
                  <span className="material-symbols-outlined text-4xl text-accent-text group-hover:scale-110 transition-transform">
                    {resolveFeatureIcon(idx + 2, card.icon)}
                  </span>
                  <h3 className="text-xl font-bold text-fg leading-tight">{card.title}</h3>
                  <p className="text-fg-subtle text-sm">{card.description}</p>
                </div>
              ))}
              <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex flex-col justify-end gap-2 relative overflow-hidden h-48">
                <div className="absolute -top-4 -right-4 size-32 bg-primary/20 blur-3xl"></div>
                <span className="text-4xl font-black text-fg italic">MGTS</span>
                <p className="text-accent-text text-sm font-bold uppercase tracking-widest">Business Elite</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
