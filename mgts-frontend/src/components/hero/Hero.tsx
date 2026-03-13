import { DEFAULT_HERO_FALLBACK_URL, resolveMediaUrl } from "@/lib/media";

type HeroProps = {
  hero?: any;
};

const resolveCtaClass = (style?: string) => {
  const normalized = String(style || "").toLowerCase();
  if (normalized === "outline") {
    return "bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-lg font-bold text-base backdrop-blur-sm transition-all";
  }
  if (normalized === "secondary") {
    return "bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-bold text-base transition-all";
  }
  return "bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-lg font-bold text-base transition-all";
};

export default function Hero({ hero }: HeroProps) {
  if (!hero) return null;
  const bgUrl = resolveMediaUrl(hero.backgroundImage || null) || DEFAULT_HERO_FALLBACK_URL;
  const ctas = Array.isArray(hero.ctaButtons) ? hero.ctaButtons : [];

  const heroStyle = bgUrl
    ? {
        backgroundImage:
          "linear-gradient(180deg, rgba(6,10,18,0.55) 0%, rgba(6,10,18,0.65) 100%), " +
          `url('${bgUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <section
      className="relative overflow-hidden min-h-[60vh] flex items-center py-16 lg:py-24 bg-background-dark w-full text-left"
      data-cms-hero
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        ...heroStyle,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 w-full text-left">
        {hero.title && (
          <h1 className="text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white mb-6 text-left">
            {hero.title}
          </h1>
        )}
        {hero.subtitle && (
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed mb-8 text-left">
            {hero.subtitle}
          </p>
        )}
        {ctas.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {ctas.map((cta: any, idx: number) => (
              <a
                key={`${cta.text || cta.label || "cta"}-${idx}`}
                href={cta.href || "#"}
                className={resolveCtaClass(cta.style)}
              >
                {cta.text || cta.label || "Подробнее"}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
