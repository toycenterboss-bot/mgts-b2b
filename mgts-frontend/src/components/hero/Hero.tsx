import Image from "next/image";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type HeroProps = {
  hero?: any;
};

const resolveCtaClass = (style?: string) => {
  const normalized = String(style || "").toLowerCase();
  if (normalized === "outline") return "hero__cta-button hero__cta-button--outline";
  if (normalized === "secondary") return "hero__cta-button hero__cta-button--secondary";
  return "hero__cta-button";
};

export default function Hero({ hero }: HeroProps) {
  if (!hero) return null;
  const bgUrl = resolveMediaUrl(hero.backgroundImage || null);
  const bgAlt = resolveMediaAlt(hero.backgroundImage || null, hero.title);
  const ctas = Array.isArray(hero.ctaButtons) ? hero.ctaButtons : [];
  const slaItems = Array.isArray(hero.slaItems) ? hero.slaItems : [];

  return (
    <section className="hero" data-cms-hero>
      <div className="hero__content">
        {hero.title && <h1 className="hero__title">{hero.title}</h1>}
        {hero.subtitle && <p className="hero__subtitle">{hero.subtitle}</p>}
        {ctas.length > 0 && (
          <div className="hero__cta">
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
      {bgUrl && (
        <div className="hero__media">
          <Image src={bgUrl} alt={bgAlt} width={1200} height={720} className="hero__image" />
        </div>
      )}
      {slaItems.length > 0 && (
        <div className="hero__sla">
          {slaItems.map((item: any, idx: number) => (
            <div key={`${item.label || "sla"}-${idx}`} className="hero__sla-item">
              <div className="hero__sla-value">{item.value}</div>
              <div className="hero__sla-label">{item.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
