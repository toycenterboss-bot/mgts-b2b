import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";

type SectionCardsProps = {
  section: any;
};

export default function SectionCards({ section }: SectionCardsProps) {
  const cards = Array.isArray(section.cards) ? section.cards : [];
  const hideShell =
    section?.isHidden === true || section?.is_hidden === true || section?.isVisible === false;
  if (!cards.length && !section?.title && !section?.subtitle) return null;
  const isInfoCards = cards.length > 0 && cards.every((card: any) => card?.cardType === "info");
  const isSegmentNavigation = cards.length > 0 && cards.every((card: any) => card?.cardType === "navigation");
  const shouldForceInfoCards = String(section?.title || "").trim() === "Контактные данные";
  const variant =
    section?.variant ||
    section?.style ||
    (isSegmentNavigation ? "segment-cards" : isInfoCards ? "info-cards" : "default");
  const columnsRaw = Number(section?.columns);
  const columns = Number.isFinite(columnsRaw)
    ? Math.min(4, Math.max(1, columnsRaw))
    : shouldForceInfoCards
      ? 1
      : variant === "segment-cards"
        ? 3
        : 3;
  const gridColsClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : columns === 3
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <section
      className={
        hideShell
          ? "section-cards w-full border-0 bg-transparent p-0 rounded-none"
          : variant === "service-cards"
            ? "section-cards w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10"
            : `section-cards w-full rounded-2xl border border-white/10 bg-white/5 p-6${
                shouldForceInfoCards ? " contact-details" : ""
              }`
      }
    >
      {section.title && (
        <h2
          className={
            variant === "service-cards"
              ? "text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-8"
              : variant === "segment-cards"
                ? "text-white text-xl font-bold tracking-tight mb-4"
                : "text-xl font-black tracking-tight mb-4"
          }
        >
          {section.title}
        </h2>
      )}
      {section.subtitle && (
        <p
          className={
            variant === "service-cards"
              ? "text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8"
              : "text-sm text-white/70 leading-relaxed mb-4"
          }
        >
          {section.subtitle}
        </p>
      )}
        <div
          className={`section-cards__grid grid ${gridColsClass} ${
            variant === "service-cards" ? "gap-8" : variant === "segment-cards" ? "gap-5" : "gap-4"
          }`}
        >
        {cards.map((card: any, idx: number) => {
          const resolveServiceIcon = () => {
            const raw = typeof card?.icon === "string" ? card.icon.trim() : "";
            if (raw) return raw;
            const t = String(card?.title || "").toLowerCase();
            if (t.includes("данн")) return "storage";
            if (t.includes("перифер") || t.includes("устрой") || t.includes("оборудован"))
              return "devices_other";
            if (t.includes("операцион") || t.includes("os") || t.includes("windows"))
              return "desktop_windows";
            if (t.includes("вирус") || t.includes("защит") || t.includes("антивирус"))
              return "bug_report";
            if (t.includes("монтаж") || t.includes("установ") || t.includes("сборк"))
              return "build";
            if (t.includes("поддерж") || t.includes("сервис"))
              return "support_agent";
            if (t.includes("интернет") || t.includes("gpon") || t.includes("канал")) return "language";
            if (t.includes("облак") || t.includes("cloud")) return "cloud";
            if (t.includes("безопас") || t.includes("ddos") || t.includes("защит")) return "security";
            if (t.includes("телефон") || t.includes("voice") || t.includes("sip")) return "call";
            if (t.includes("видео") || t.includes("камера")) return "videocam";
            if (t.includes("центр") || t.includes("data")) return "dns";
            if (t.includes("сеть") || t.includes("wifi") || t.includes("wi-fi")) return "wifi";
            if (t.includes("мониторинг") || t.includes("control")) return "monitoring";
            return "hub";
          };
          const linkifyContactText = (input: string) => {
            let out = String(input || "");
            out = out.replace(
              /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
              '<a href="mailto:$1">$1</a>'
            );
            out = out.replace(/(\+?\d[\d\s\-()]{8,}\d)/g, (match) => {
              const digits = match.replace(/[^\d+]/g, "");
              const tel = digits.startsWith("8") ? `+7${digits.slice(1)}` : digits;
              return `<a href="tel:${tel}">${match}</a>`;
            });
            return out;
          };
          const imageUrl = resolveMediaUrl(card.image || null);
          const bgUrl = resolveMediaUrl(card.backgroundImage || null);
          const href = normalizeCmsHref(card.link || "");
          const isInlineLink = /^mailto:|^tel:/i.test(href);
          const Tag = href && !isInlineLink ? "a" : "div";
          const descriptionHtml = String(card.description || "");
          const descriptionMarkup = descriptionHtml.includes("<")
            ? descriptionHtml
            : linkifyContactText(descriptionHtml).replace(/\n/g, "<br/>");
          const baseClass =
            variant === "service-cards"
              ? "section-cards__item relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 flex flex-col min-h-[320px] group transition-all hover:border-primary/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_0_30px_rgba(0,102,204,0.3)] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] hover:-translate-y-1.5 hover:scale-[1.03]"
              : variant === "segment-cards"
                ? "section-cards__item rounded-2xl border border-white/10 bg-[#1a232e] p-5 flex flex-col gap-4 hover:bg-[#202b38] transition-colors"
                : `section-cards__item block rounded-2xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-5${
                    bgUrl ? " relative overflow-hidden" : ""
                  }`;
          return (
            <Tag
              key={`${card.title || "card"}-${idx}`}
              href={href || undefined}
              className={baseClass}
              data-segment-card={variant === "segment-cards" ? card.title || "" : undefined}
            >
              {bgUrl && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.1) 100%), " +
                      `url('${bgUrl}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundBlendMode: "multiply",
                  }}
                />
              )}
              {variant === "service-cards" && (
                <div className="pointer-events-none absolute inset-y-0 -left-[60%] w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] transition-all duration-700 group-hover:left-[120%]" />
              )}
              {(imageUrl || variant === "service-cards") &&
                !shouldForceInfoCards &&
                variant !== "segment-cards" && (
                  <div
                    className={
                      variant === "service-cards"
                        ? "mb-8 relative h-16 w-16 flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 border border-white/10 text-primary group-hover:scale-110 transition-transform"
                        : "mb-4 h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10"
                    }
                  >
                    {variant === "service-cards" && (
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform" />
                    )}
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={resolveMediaAlt(card.image || null, card.title)}
                        width={variant === "service-cards" ? 64 : 400}
                        height={variant === "service-cards" ? 64 : 260}
                        className={
                          variant === "service-cards"
                            ? "h-16 w-16 object-contain relative z-10"
                            : "h-full w-full object-cover"
                        }
                      />
                    ) : (
                      <Icon
                        name={variant === "service-cards" ? resolveServiceIcon() : card.icon || "hub"}
                        size={variant === "service-cards" ? 40 : 24}
                        className={variant === "service-cards" ? "text-primary relative z-10" : ""}
                      />
                    )}
                  </div>
                )}
              {variant === "segment-cards" && (
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">hub</span>
                </div>
              )}
              <div className={bgUrl ? "relative z-10" : ""}>
                {card.title && (
                  <h3
                    className={
                      variant === "service-cards"
                        ? "text-slate-900 dark:text-white text-xl font-bold mb-3"
                        : shouldForceInfoCards
                          ? "section-cards__title text-sm font-bold text-white"
                          : variant === "segment-cards"
                            ? "text-base font-bold text-white"
                            : "text-base font-black tracking-tight"
                    }
                    style={
                      bgUrl
                        ? { color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }
                        : undefined
                    }
                  >
                    {card.title}
                  </h3>
                )}
                {card.subtitle && (
                  <p
                    className={
                      variant === "service-cards"
                        ? "text-slate-500 dark:text-slate-300 text-sm font-semibold mb-2"
                        : "mt-1 text-sm text-white/70 font-semibold"
                    }
                    style={
                      bgUrl
                        ? { color: "rgba(255,255,255,0.85)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }
                        : undefined
                    }
                  >
                    {card.subtitle}
                  </p>
                )}
                {card.description &&
                  (shouldForceInfoCards ? (
                    <div
                      className="section-cards__description text-xs text-white/70 leading-relaxed"
                      style={
                        bgUrl
                          ? { color: "rgba(255,255,255,0.82)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }
                          : undefined
                      }
                      dangerouslySetInnerHTML={{ __html: descriptionMarkup }}
                    />
                  ) : (
                    <p
                      className={
                        variant === "service-cards"
                          ? "text-slate-600 dark:text-[#9aabbc] text-sm leading-relaxed mb-6"
                          : variant === "segment-cards"
                            ? "text-xs text-[#9aabbc] leading-relaxed"
                            : "mt-2 text-sm text-white/60 leading-relaxed"
                      }
                      style={
                        bgUrl
                          ? { color: "rgba(255,255,255,0.82)", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }
                          : undefined
                      }
                    >
                      {card.description}
                    </p>
                  ))}
                {card.disclaimerHtml && (
                  <div
                    className={
                      variant === "service-cards"
                        ? "text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
                        : "mt-2 text-xs text-white/50 leading-relaxed"
                    }
                    dangerouslySetInnerHTML={{ __html: card.disclaimerHtml }}
                  />
                )}
              </div>
              {variant === "segment-cards" && (
                <span className="mt-auto text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  Подробнее <span className="material-symbols-outlined text-xs">chevron_right</span>
                </span>
              )}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
