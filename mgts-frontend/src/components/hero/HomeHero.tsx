import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type HomeHeroProps = {
  hero?: any;
};

const hasHtml = (value?: string | null) => Boolean(value && /<[^>]+>/.test(value));

export default function HomeHero({ hero }: HomeHeroProps) {
  if (!hero) return null;
  const bgUrl = resolveMediaUrl(hero.backgroundImage || null);
  const bgAlt = resolveMediaAlt(hero.backgroundImage || null, hero.title);
  const slaItems = Array.isArray(hero.slaItems) ? hero.slaItems : [];
  const titleHtml = String(hero.title || "");
  const subtitleHtml = String(hero.subtitle || "");

  return (
    <section
      className="relative min-h-[70vh] lg:min-h-[75vh] flex items-center overflow-hidden hero-mesh pb-24 lg:pb-32"
      data-home-hero
    >
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={bgUrl ? { backgroundImage: `url('${bgUrl}')` } : undefined}
          data-home-hero-bg
          aria-label={bgAlt}
        />
        <div className="absolute top-1/4 right-0 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-40 rotate-12"></div>
        <div className="absolute top-1/3 right-10 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-30 -rotate-6"></div>
        <div className="absolute bottom-1/4 left-0 w-[1000px] h-[2px] bg-gradient-to-r from-primary/20 via-primary to-transparent opacity-20 rotate-[-15deg]"></div>
        <div className="absolute top-1/2 right-[10%] w-96 h-96 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-[5%] w-64 h-64 bg-primary/10 backdrop-blur-2xl rounded-2xl border border-white/5 rotate-45 -translate-y-1/2"></div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="frost-particle absolute top-10 right-20 w-4 h-4 opacity-40"></div>
          <div className="frost-particle absolute top-40 right-40 w-2 h-2 opacity-30"></div>
          <div className="frost-particle absolute bottom-20 left-10 w-3 h-3 opacity-20"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent)]"></div>
        </div>
      </div>
      <div className="container mx-auto px-6 relative z-10 pt-20">
        <div className="max-w-5xl">
          {hero.badgeText && (
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-[0.2em] mb-10">
              <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse"></span>
              {hero.badgeText}
            </div>
          )}
          {hero.title && (
            <h1
              className="text-6xl md:text-8xl lg:text-9xl mts-bold leading-[0.9] text-white mb-10"
              data-home-hero-title
              {...(hasHtml(titleHtml) ? { dangerouslySetInnerHTML: { __html: titleHtml } } : {})}
            >
              {!hasHtml(titleHtml) ? titleHtml : null}
            </h1>
          )}
          {hero.subtitle && (
            <p
              className="text-xl md:text-2xl text-white/60 max-w-2xl mb-14 leading-relaxed font-medium"
              data-home-hero-subtitle
              {...(hasHtml(subtitleHtml) ? { dangerouslySetInnerHTML: { __html: subtitleHtml } } : {})}
            >
              {!hasHtml(subtitleHtml) ? subtitleHtml : null}
            </p>
          )}
        </div>
      </div>
      {slaItems.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full border-t border-white/10 bg-white/5 backdrop-blur-md hidden lg:block">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
            {slaItems.map((item: any, idx: number) => (
              <div key={`${item.label || "sla"}-${idx}`} className="py-10 px-8">
                {item.value && <div className="text-3xl mts-bold mb-1">{item.value}</div>}
                {item.label && (
                  <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
