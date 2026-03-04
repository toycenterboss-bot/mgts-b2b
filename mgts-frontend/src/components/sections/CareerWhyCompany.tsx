import Icon from "@/components/ui/Icon";

type CareerWhyCompanyProps = {
  section: any;
};

export default function CareerWhyCompany({ section }: CareerWhyCompanyProps) {
  if (section?.isVisible === false) return null;
  const cards = Array.isArray(section.cards) ? section.cards : [];

  return (
    <section className="career-why-company py-20 bg-background-dark" data-career-section="why-company">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {section.title && (
          <h2 className="career-why-company__title text-3xl font-bold text-white mb-8 px-2">{section.title}</h2>
        )}
        <div className="career-why-company__grid">
          {cards.map((card: any, idx: number) => {
            const accentClass = card.accent ? `career-why-card--${card.accent}` : "";
            const items = Array.isArray(card.items) ? card.items : [];
            return (
              <div key={`why-card-${idx}`} className={`career-why-card ${accentClass}`}>
                {card.icon && (
                  <div className="career-why-card__icon">
                    <Icon name={card.icon} size={32} />
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
                        {item.icon && <Icon name={item.icon} size={18} />}
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
