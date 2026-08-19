import Image from "next/image";
import { DEFAULT_HERO_FALLBACK_URL, resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type CareerHeroProps = {
  hero?: any;
};

const CAREER_HERO_BADGES = [
  {
    key: "lead-engineer",
    name: "Александр",
    role: "Ведущий Инженер, 15 лет в МГТС",
    image: "/assets/images/external/8f18f563d6b2.png",
    borderClass: "border-primary",
    positionClass: "top-10 right-10",
    pulse: true,
  },
  {
    key: "devops",
    name: "Мария",
    role: "Senior DevOps, 2 года в МГТС",
    image: "/assets/images/external/b4e4d0d17c1c.png",
    borderClass: "border-brand-red",
    positionClass: "bottom-10 left-10",
  },
];

const formatCareerTitle = (title: string) => {
  const raw = String(title || "").trim();
  if (!raw) return raw;
  const parts = raw.split(":");
  if (parts.length < 2) return raw;
  const head = `${parts[0].trim()}:`;
  const tail = parts.slice(1).join(":").trim();
  const highlighted = tail
    .replace(/инженеры/gi, '<span class="text-accent-text">инженеры</span>')
    .replace(/it-?лидеры/gi, '<span class="text-accent-text">IT-лидеры</span>');
  return `${head}<br/>${highlighted}`;
};

const resolveCtaClass = (style?: string) => {
  const normalized = String(style || "").toLowerCase();
  if (normalized === "outline") {
    return "bg-fg/5 hover:bg-fg/10 border border-fg/10 text-fg px-8 py-4 rounded-lg font-bold text-base backdrop-blur-sm transition-all";
  }
  return "bg-primary hover:bg-primary/90 text-on-primary px-8 py-4 rounded-lg font-bold text-base transition-all transform hover:-translate-y-1";
};

export default function CareerHero({ hero }: CareerHeroProps) {
  if (!hero) return null;
  const bgUrl = resolveMediaUrl(hero.backgroundImage || null) || DEFAULT_HERO_FALLBACK_URL;
  const bgAlt = resolveMediaAlt(hero.backgroundImage || null, hero.title);
  const titleHtml = formatCareerTitle(hero.title);
  const ctas = Array.isArray(hero.ctaButtons) ? hero.ctaButtons : [];

  return (
    <section className="relative min-h-[60vh] overflow-hidden blueprint-pattern bg-background-light dark:bg-background-dark text-fg dark:text-fg font-display">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-accent-text text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Карьера в МГТС
            </div>
            {hero.title && (
              <h1
                className="text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight text-fg"
                dangerouslySetInnerHTML={{ __html: titleHtml }}
              />
            )}
            {hero.subtitle && (
              <p className="text-lg text-fg-muted max-w-xl leading-relaxed">{hero.subtitle}</p>
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
          <div className="flex-1 relative w-full aspect-square max-w-[500px] lg:max-w-none">
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-fg/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-background-dark/70 via-transparent to-primary/20"></div>
              {bgUrl && (
                <Image
                  src={bgUrl}
                  alt={bgAlt}
                  width={900}
                  height={900}
                  className="w-full h-full object-cover grayscale opacity-55 mix-blend-overlay"
                />
              )}
              {CAREER_HERO_BADGES.map((badge) => (
                <div
                  key={badge.key}
                  className={`absolute ${badge.positionClass} glass-card p-4 rounded-xl flex items-center gap-4 ${
                    badge.pulse ? "animate-pulse" : ""
                  }`}
                >
                  <Image
                    src={badge.image}
                    alt=""
                    width={48}
                    height={48}
                    className={`w-12 h-12 rounded-full border-2 ${badge.borderClass}`}
                  />
                  <div>
                    <p className="text-xs font-bold text-fg">{badge.name}</p>
                    <p className="text-[10px] text-fg-muted">{badge.role}</p>
                  </div>
                </div>
              ))}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                <span className="material-symbols-outlined text-[200px] text-fg">hub</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
