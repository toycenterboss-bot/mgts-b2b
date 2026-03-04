import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type SegmentServicesGridProps = {
  section: any;
};

export default function SegmentServicesGrid({ section }: SegmentServicesGridProps) {
  if (section?.isVisible === false) return null;
  const cards = Array.isArray(section.cards) ? section.cards : [];

  if (cards.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        {section.title && (
          <h2 className="text-white text-2xl font-bold tracking-tight" data-seg-services-title>
            {section.title}
          </h2>
        )}
        {section.linkText && section.linkHref && (
          <a
            className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            href={normalizeCmsHref(section.linkHref)}
          >
            {section.linkText} <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-seg-services-grid>
        {cards.map((card: any, idx: number) => {
          const href = normalizeCmsHref(card.link || "");
          const imageUrl = resolveMediaUrl(card.image || null);
          const Tag = href ? "a" : "div";
          const ctaText =
            card.buttonText || card.ctaText || card.ctaLabel || card.linkLabel || card.moreLabel;
          const resolveIcon = () => {
            const raw = typeof card?.icon === "string" ? card.icon.trim() : "";
            if (raw) return raw;
            const t = String(card?.title || "").toLowerCase();
            if (t.includes("интернет") || t.includes("gpon") || t.includes("канал")) return "language";
            if (t.includes("облак") || t.includes("cloud")) return "cloud_queue";
            if (t.includes("безопас") || t.includes("ddos") || t.includes("защит")) return "shield_person";
            if (t.includes("телефон") || t.includes("voice") || t.includes("sip")) return "call";
            if (t.includes("видео") || t.includes("камера")) return "videocam";
            if (t.includes("центр") || t.includes("data")) return "dns";
            if (t.includes("сеть") || t.includes("wifi") || t.includes("wi-fi")) return "wifi";
            if (t.includes("мониторинг") || t.includes("control")) return "monitoring";
            return "hub";
          };

          return (
            <Tag
              key={`${card.title || "service"}-${idx}`}
              href={href || undefined}
              className="bg-[#1a232e] border border-white/5 p-6 rounded-xl flex flex-col gap-4 card-hover"
              data-seg-service-card
            >
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={resolveMediaAlt(card.image || null, card.title)}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <Icon name={resolveIcon()} size={26} />
                )}
              </div>
              {card.title && (
                <h3 className="text-white text-lg font-bold leading-snug" data-seg-service-title>
                  {card.title}
                </h3>
              )}
              {card.description && (
                <p className="text-[#9aabbc] text-sm leading-relaxed" data-seg-service-desc>
                  {card.description}
                </p>
              )}
              {ctaText && (
                <div className="mt-auto text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  {ctaText} <span className="material-symbols-outlined text-xs">chevron_right</span>
                </div>
              )}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
