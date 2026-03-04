import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type HomeServiceCardsProps = {
  section: any;
};

export default function HomeServiceCards({ section }: HomeServiceCardsProps) {
  if (section?.isVisible === false) return null;
  const cards = Array.isArray(section.cards) ? section.cards : [];

  if (cards.length === 0) return null;

  return (
    <section className="section-gradient -mx-4 px-4 py-20 rounded-[3rem]" data-home-services>
      <div className="max-w-[1200px] mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" data-home-services-grid>
          {cards.map((card: any, idx: number) => {
            const href = normalizeCmsHref(card.link || "");
            const imageUrl = resolveMediaUrl(card.image || null);
            const Tag = href ? "a" : "div";
            const ctaLabel = card.ctaText || card.buttonText || card.ctaLabel || card.subtitle || "Подробнее";
            const isAccent = idx % 2 === 1;

            return (
              <Tag
                key={`${card.title || "service"}-${idx}`}
                href={href || undefined}
                className="glass-card p-8 rounded-3xl flex flex-col min-h-[320px] group"
                data-home-service-card
              >
                <div className="light-sweep"></div>
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
                {card.description && (
                  <p className="text-[#9aabbc] text-sm leading-relaxed mb-6" data-home-service-desc>
                    {card.description}
                  </p>
                )}
                <div
                  className="mt-auto flex items-center text-primary text-xs font-black uppercase tracking-widest group-hover:text-accent transition-colors"
                  data-home-service-cta
                >
                  {ctaLabel} <span className="material-symbols-outlined ml-1 text-sm">trending_flat</span>
                </div>
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
}
