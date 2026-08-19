"use client";

import { DEFAULT_HERO_FALLBACK_URL, resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type SegmentLandingHeroProps = {
  hero?: any;
};

const hasHtml = (value?: string | null) => Boolean(value && /<[^>]+>/.test(value));

const resolveCtaClass = (style?: string) => {
  const normalized = String(style || "").toLowerCase();
  if (normalized === "outline") {
    return "flex min-w-[200px] items-center justify-center rounded-lg h-14 px-8 border border-line dark:border-line bg-fg/5 dark:bg-surface-2/50 text-fg dark:text-fg text-base font-bold hover:bg-surface-2 dark:hover:bg-surface-2 transition-colors";
  }
  return "flex min-w-[200px] items-center justify-center rounded-lg h-14 px-8 bg-primary text-on-primary text-base font-bold hover:scale-[1.02] transition-transform shadow-xl shadow-primary/30";
};

export default function SegmentLandingHero({ hero }: SegmentLandingHeroProps) {
  if (!hero) return null;
  const bgUrl = resolveMediaUrl(hero.backgroundImage || null) || DEFAULT_HERO_FALLBACK_URL;
  const bgAlt = resolveMediaAlt(hero.backgroundImage || null, hero.title);
  const ctas = Array.isArray(hero.ctaButtons) ? hero.ctaButtons : [];
  const slaItems = Array.isArray(hero.slaItems) ? hero.slaItems : [];
  const badgeText = hero.badgeText;
  const badgeIcon = hero.badgeIcon;
  const titleHtml = String(hero.title || "");
  const subtitleHtml = String(hero.subtitle || "");

  return (
    <div className="relative flex h-auto min-h-[60vh] w-full flex-col overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <main className="flex-1 flex flex-col items-start">
          <div className="w-full max-w-7xl mx-auto px-6 py-6 md:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-8 z-10">
                {badgeText && (
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-accent-text text-xs font-bold uppercase tracking-widest w-fit"
                    data-seg-hero-badge
                  >
                    {badgeIcon && <span className="material-symbols-outlined text-sm">{badgeIcon}</span>}
                    {badgeText}
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  {hero.title && (
                    <h1
                      className="text-fg dark:text-fg text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter"
                      data-seg-hero-title
                      {...(hasHtml(titleHtml) ? { dangerouslySetInnerHTML: { __html: titleHtml } } : {})}
                    >
                      {!hasHtml(titleHtml) ? titleHtml : null}
                    </h1>
                  )}
                  {hero.subtitle && (
                    <p
                      className="text-fg-subtle dark:text-fg-muted text-lg md:text-xl font-normal leading-relaxed max-w-[540px]"
                      data-seg-hero-subtitle
                      {...(hasHtml(subtitleHtml) ? { dangerouslySetInnerHTML: { __html: subtitleHtml } } : {})}
                    >
                      {!hasHtml(subtitleHtml) ? subtitleHtml : null}
                    </p>
                  )}
                </div>
                {ctas.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    {ctas.map((cta: any, idx: number) => (
                      <a
                        key={`${cta.text || cta.label || "cta"}-${idx}`}
                        href={cta.href || "#"}
                        className={resolveCtaClass(cta.style)}
                      >
                        <span>{cta.text || cta.label || "Подробнее"}</span>
                      </a>
                    ))}
                  </div>
                )}
                {slaItems.length > 0 && (
                  <div
                    className="flex flex-wrap gap-8 mt-4 pt-8 border-t border-line dark:border-line"
                    data-seg-hero-sla
                  >
                    {slaItems.map((item: any, idx: number) => (
                      <div key={`${item.label || "sla"}-${idx}`} className="flex flex-col" data-seg-hero-sla-item>
                        {item.value && (
                          <span className="text-accent-text text-2xl font-bold" data-seg-hero-sla-value>
                            {item.value}
                          </span>
                        )}
                        {item.label && (
                          <span className="text-fg-subtle text-xs font-medium uppercase tracking-wider" data-seg-hero-sla-label>
                            {item.label}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative h-[400px] md:h-[600px] w-full flex items-center justify-center group">
                <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full opacity-30"></div>
                <div
                  className="relative w-full h-full rounded-2xl overflow-hidden border border-fg/10 glass-panel shadow-2xl flex items-center justify-center"
                  data-seg-hero-bg
                  aria-label={bgAlt}
                  style={{ backgroundImage: `url('${bgUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-background-dark/60 via-transparent to-primary/20 pointer-events-none"></div>
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    <div className="w-64 h-64 border-2 border-primary/40 glass-panel rotate-45 flex items-center justify-center">
                      <div className="w-48 h-48 border border-fg/20 glass-panel flex items-center justify-center">
                        <div className="w-24 h-24 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                      </div>
                    </div>
                    <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                    <div className="absolute top-3/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                    <div className="absolute left-1/3 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-30"></div>
                    <div className="absolute right-1/3 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-30"></div>
                  </div>
                  {hero.featureLabel && (
                    <div className="relative z-10 glass-panel p-6 rounded-xl border border-fg/20 max-w-[240px] text-center transform translate-y-24">
                      <span className="material-symbols-outlined text-accent-text text-4xl mb-2">
                        {hero.featureIcon || "blur_on"}
                      </span>
                      <p className="text-fg text-sm font-bold tracking-tight">{hero.featureLabel}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
