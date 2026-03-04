import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type SectionGridProps = {
  section: any;
};

export default function SectionGrid({ section }: SectionGridProps) {
  if (section?.isVisible === false) return null;
  const items = Array.isArray(section.items) ? section.items : [];
  const gridType = String(section.gridType || "").trim();
  const sectionClass = `section-cards section-grid${gridType ? ` section-grid--${gridType}` : ""}`;

  return (
    <section className={sectionClass} data-section-grid-type={gridType || undefined}>
      {section.title && <h2 className="section-cards__title">{section.title}</h2>}
      <div className="section-cards__container">
        {items.map((card: any, idx: number) => {
          const imageUrl = resolveMediaUrl(card.image || null);
          const bgUrl = resolveMediaUrl(card.backgroundImage || null);
          return (
            <a
              key={`${card.title || "card"}-${idx}`}
              href={normalizeCmsHref(card.link || "#")}
              className="section-cards__card"
            >
              {bgUrl && (
                <Image
                  src={bgUrl}
                  alt={resolveMediaAlt(card.backgroundImage || null, card.title)}
                  width={1200}
                  height={720}
                  className="section-cards__card-bg"
                />
              )}
              {card.icon && (
                <span className="section-cards__card-icon">
                  <Icon name={card.icon} size={28} />
                </span>
              )}
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={resolveMediaAlt(card.image || null, card.title)}
                  width={400}
                  height={260}
                  className="section-cards__card-image"
                />
              )}
              {card.title && <h3 className="section-cards__card-title">{card.title}</h3>}
              {card.subtitle && <p className="section-cards__card-subtitle">{card.subtitle}</p>}
              {card.description && <p className="section-cards__card-content">{card.description}</p>}
            </a>
          );
        })}
      </div>
    </section>
  );
}
