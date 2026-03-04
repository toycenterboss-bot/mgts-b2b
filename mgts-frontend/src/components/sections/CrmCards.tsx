import Image from "next/image";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type CrmCardsProps = {
  section: any;
};

export default function CrmCards({ section }: CrmCardsProps) {
  if (section?.isVisible === false) return null;
  const cards = Array.isArray(section.cards) ? section.cards.filter(Boolean) : [];
  if (!cards.length) return null;

  const sorted = [...cards].sort((a, b) => (a?.order || 0) - (b?.order || 0));

  return (
    <section className="crm-cards rounded-2xl border border-white/10 bg-white/5 p-6">
      {section.title && <h2 className="crm-cards__title text-xl font-black tracking-tight mb-2">{section.title}</h2>}
      {section.description && <p className="text-sm text-white/60 mb-5">{section.description}</p>}
      <div className="crm-cards__container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sorted.map((card: any, idx: number) => {
          const imgUrl = resolveMediaUrl(card.image || null);
          const href = card.link ? normalizeCmsHref(card.link) : "";
          const isExternal = /^https?:\/\//i.test(card.link || "");
          const Tag = href ? "a" : "div";
          return (
            <Tag
              key={`${card.title || "crm"}-${idx}`}
              className="crm-cards__card flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-4 min-h-[84px]"
              href={href || undefined}
              target={href && isExternal ? "_blank" : undefined}
              rel={href && isExternal ? "noreferrer" : undefined}
            >
              {imgUrl ? (
                <Image
                  className="crm-cards__card-image max-h-10 max-w-full object-contain"
                  src={imgUrl}
                  alt={resolveMediaAlt(card.image || null, card.title || "CRM")}
                  width={160}
                  height={80}
                />
              ) : (
                <span className="font-black text-white/80 text-sm text-center">{card.title || "CRM"}</span>
              )}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
