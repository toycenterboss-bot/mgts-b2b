import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type HomeServiceCardsProps = {
  section: any;
  respectVisibility?: boolean;
  compactSpacing?: boolean;
  hideShell?: boolean;
};

export default function HomeServiceCards({
  section,
  respectVisibility = true,
  compactSpacing = false,
  hideShell = false,
}: HomeServiceCardsProps) {
  const hideShellFromVisibility = respectVisibility && section?.isVisible === false;
  const shouldHideShell = hideShell || hideShellFromVisibility;
  const cards = Array.isArray(section.cards) ? section.cards : [];
  const columnsRaw = Number(section?.columns);
  const columns = Number.isFinite(columnsRaw) ? Math.min(4, Math.max(1, columnsRaw)) : 4;
  const gridColsClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : columns === 3
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  if (cards.length === 0) return null;

  const content = (
    <div className="max-w-[1200px] mx-auto">
      {(section.title || (section.linkText && section.linkHref)) && (
        <div className="flex items-center justify-between mb-12">
          {section.title && (
            <h2 className="text-white text-3xl font-bold tracking-tight" data-home-services-title>
              {section.title}
            </h2>
          )}
          {section.linkText && section.linkHref && (
            <a
              className="text-accent text-sm font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"
              href={normalizeCmsHref(section.linkHref)}
            >
              {section.linkText} <span className="material-symbols-outlined text-lg">arrow_right_alt</span>
            </a>
          )}
        </div>
      )}
      {section.subtitle && (
        <p className="text-[#9aabbc] text-sm leading-relaxed mb-8 max-w-2xl">{section.subtitle}</p>
      )}
      <div className={`grid ${gridColsClass} gap-8`} data-home-services-grid>
        {cards.map((card: any, idx: number) => {
          const rawLink = String(card.link || "").trim();
          const href = rawLink ? normalizeCmsHref(rawLink) : "";
          const imageUrl = resolveMediaUrl(card.image || null);
            const bgUrl = resolveMediaUrl(card.backgroundImage || null);
          const Tag = rawLink ? "a" : "div";
          const description = card.description || card.subtitle || "";
          const ctaLabel = card.ctaText || card.buttonText || card.ctaLabel || "Подробнее";
          const showCta = Boolean(rawLink) && Boolean(ctaLabel);
          const isAccent = idx % 2 === 1;

          return (
            <Tag
              key={`${card.title || "service"}-${idx}`}
              href={rawLink ? href : undefined}
                className="glass-card border border-white/10 dark:border-white/20 p-8 rounded-3xl flex flex-col min-h-[320px] group relative overflow-hidden"
              data-home-service-card
            >
              <div className="light-sweep"></div>
                {bgUrl && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.5) 100%), " +
                        `url('${bgUrl}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundBlendMode: "multiply",
                    }}
                  />
                )}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="icon-3d mb-8 relative">
                    <div
                      className={`absolute inset-0 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform ${
                        isAccent ? "bg-accent/20" : "bg-primary/20"
                      }`}
                    ></div>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={resolveMediaAlt(card.image || null, card.title)}
                        width={64}
                        height={64}
                        className="size-16 object-contain relative z-10"
                      />
                    ) : (
                      <Icon
                        name={card.icon || "hub"}
                        size={64}
                        className={`relative z-10 ${isAccent ? "text-accent" : "text-primary"}`}
                      />
                    )}
                  </div>
                  {card.title && (
                    <h3 className="text-white text-xl font-bold mb-3" data-home-service-title>
                      {card.title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-[#9aabbc] text-sm leading-relaxed mb-6" data-home-service-desc>
                      {description}
                    </p>
                  )}
                  {showCta && (
                    <div
                      className="mt-auto flex items-center text-primary text-xs font-black uppercase tracking-widest group-hover:text-accent transition-colors"
                      data-home-service-cta
                    >
                      {ctaLabel} <span className="material-symbols-outlined ml-1 text-sm">trending_flat</span>
                    </div>
                  )}
                </div>
            </Tag>
          );
        })}
      </div>
    </div>
  );

  if (shouldHideShell) {
    return (
      <div className="mb-6" data-home-services>
        {content}
      </div>
    );
  }

  return (
    <section
      className={`section-gradient -mx-4 px-4 py-20 rounded-[3rem] border border-white/10 dark:border-white/20${
        compactSpacing ? " -mb-24" : ""
      }`}
      data-home-services
    >
      {content}
    </section>
  );
}
