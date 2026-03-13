import Icon from "@/components/ui/Icon";

type CareerWhyCompanyProps = {
  section: any;
};

const resolveAccentKey = (accent: any) => String(accent || "").trim();

export default function CareerWhyCompany({ section }: CareerWhyCompanyProps) {
  if (section?.isVisible === false) return null;
  const cards = Array.isArray(section.cards) ? section.cards : [];

  return (
    <section className="career-why-company py-20 bg-background-dark" data-career-section="why-company">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {section.title && (
          <h2 className="career-why-company__title text-3xl font-bold text-white mb-12 text-center">
            {section.title}
          </h2>
        )}
        <div className="career-why-company__grid">
          {cards.map((card: any, idx: number) => {
            const accentKey = resolveAccentKey(card.accent);
            const accentClass = accentKey ? `career-why-card--${accentKey}` : "";
            const isBrandRed = accentKey === "brand-red";
            const items = Array.isArray(card.items) ? card.items : [];
            const cardIconName = card.icon || (isBrandRed ? "bolt" : "architecture");
            const listIconClass = isBrandRed ? "text-[#E30611]" : "text-primary";

            return (
              <div key={`why-card-${idx}`} className={`career-why-card ${accentClass}`}>
                {cardIconName && (
                  <div className={`career-why-card__icon ${listIconClass}`}>
                    <Icon name={cardIconName} size={180} />
                  </div>
                )}
                {card.title && <h3 className="career-why-card__title">{card.title}</h3>}
                {card.description && (
                  <p className="career-why-card__description">{card.description}</p>
                )}
                {items.length > 0 && (
                  <ul className="career-why-card__list">
                    {items.map((item: any, itemIdx: number) => (
                      <li key={`why-item-${itemIdx}`} className="career-why-card__list-item">
                        <Icon name={item.icon || "check_circle"} size={18} className={listIconClass} />
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
