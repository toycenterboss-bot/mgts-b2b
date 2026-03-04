"use client";

import { useMemo, useState } from "react";
import ClientIcon from "@/components/ui/ClientIcon";
import { resolveMediaUrl } from "@/lib/media";

type HistoryTimelineProps = {
  section: any;
};

export default function HistoryTimeline({ section }: HistoryTimelineProps) {
  if (section?.isVisible === false) return null;
  const periods = useMemo(() => {
    const list = Array.isArray(section.periods) ? section.periods : [];
    return [...list].sort((a, b) => (a?.order || 0) - (b?.order || 0));
  }, [section.periods]);
  const defaultIndex = Number.isFinite(section?.defaultPeriod) ? section.defaultPeriod : 0;
  const [activeIndex, setActiveIndex] = useState(Math.min(defaultIndex, periods.length - 1));
  const activePeriod = periods[activeIndex] || periods[0];

  if (!activePeriod) return null;
  const introTitle = String(section?.introTitle || section?.title || "").trim();
  const introSubtitle = String(section?.introSubtitle || "").trim();
  const ctaLabel = String(section?.ctaLabel || "").trim();
  const ctaHref = String(section?.ctaHref || "#").trim();

  const extractParagraphs = (html: string) => {
    const matches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const cleaned = matches
      .map((m) => m.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);
    if (cleaned.length) return cleaned;
    const plain = html.replace(/<[^>]*>/g, "").trim();
    return plain ? [plain] : [];
  };

  const buildHighlights = (period: any) => {
    const list = Array.isArray(period?.highlights) ? period.highlights.filter(Boolean) : [];
    if (list.length) return list;
    const paragraphs = extractParagraphs(String(period?.content || ""));
    return paragraphs.slice(0, 4).map((text) => {
      const idx = text.indexOf(":");
      if (idx > 0) {
        return { title: text.slice(0, idx).trim(), description: text.slice(idx + 1).trim(), icon: "check" };
      }
      return { title: text.slice(0, 80).trim(), description: text, icon: "check" };
    });
  };

  const highlights = buildHighlights(activePeriod);
  const imageUrl = resolveMediaUrl(activePeriod.image || null);

  return (
    <section className="history-timeline w-full" style={{ minHeight: "calc(100vh - 220px)" }}>
      {introTitle && <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-6">{introTitle}</h2>}
      {introSubtitle && <p className="text-white/60 text-lg leading-relaxed mb-6 max-w-3xl">{introSubtitle}</p>}
      {ctaLabel && (
        <a
          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-xl transition-all text-sm font-bold mb-8"
          href={ctaHref || "#"}
        >
          <ClientIcon name={section?.icon || "mail"} size={20} />
          {ctaLabel}
        </a>
      )}

      <div className="flex flex-nowrap overflow-x-auto pb-4 gap-2 no-scrollbar mb-6">
        {periods.map((period: any, idx: number) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={`${period.period || "period"}-${idx}`}
              type="button"
              className={`flex-1 min-w-[160px] py-4 px-2 border-b-2 text-center transition-all ${
                isActive
                  ? "border-primary text-primary bg-primary/10"
                  : "border-white/20 text-white/40 hover:text-white"
              }`}
              onClick={() => setActiveIndex(idx)}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">
                {period.period || `Период ${idx + 1}`}
              </span>
              <span className="text-sm font-bold">{period.title || ""}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full relative h-12 mb-10 flex items-center">
        <div
          className="absolute left-4 right-4 h-px"
          style={{
            background:
              "linear-gradient(90deg, rgba(112,66,20,0.9) 0%, rgba(0,102,204,0.9) 100%)",
            boxShadow: "0 0 18px rgba(0, 102, 204, 0.35)",
          }}
          data-history-line
        ></div>
        <div className="absolute w-full flex justify-between px-4" data-history-dots>
          {periods.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div key={`dot-${idx}`} className="relative" data-history-dot>
                {isActive ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-primary border-4 border-white shadow-[0_0_20px_#0066cc] animate-pulse"></div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-primary text-xs font-bold uppercase">
                      Вы здесь
                    </div>
                  </>
                ) : (
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/20"
                    style={{
                      background:
                        "radial-gradient(circle at top left, rgba(112,66,20,0.7), rgba(0,102,204,0.7))",
                    }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="history-timeline__period">
        <div className="w-full glass-card rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
          <div className="lg:w-1/2 relative min-h-[360px]">
            {imageUrl ? (
              <img
                alt=""
                src={imageUrl}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                style={{ pointerEvents: "none", zIndex: 0 }}
              />
            ) : (
              <div className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 0 }}></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 via-transparent to-transparent"></div>
            <div className="relative h-full p-10 flex flex-col" style={{ zIndex: 2 }}>
              <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-md border border-primary/30 px-4 py-1.5 rounded-full w-fit mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span className="text-xs font-bold tracking-widest uppercase">
                  {activePeriod.badgeLabel || "Текущий этап"}
                </span>
              </div>
              {activePeriod.title && <h3 className="text-4xl font-black mb-4 leading-tight">{activePeriod.title}</h3>}
              <div className="text-white/70 text-lg max-w-md overflow-y-auto" style={{ maxHeight: 170 }}>
                {activePeriod.imageDescription || extractParagraphs(String(activePeriod.content || ""))[0] || ""}
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 p-8 lg:p-10 flex flex-col justify-between gap-10" style={{ maxHeight: 520 }}>
            <div className="flex flex-col gap-10 overflow-y-auto" style={{ maxHeight: 520 }}>
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">verified_user</span>
                Ключевые достижения
              </h4>
              {highlights.length > 0 && (
                <ul className="space-y-6">
                  {highlights.map((item: any, idx: number) => (
                    <li key={`highlight-${idx}`} className="flex items-start gap-4">
                      <div className="mt-1 w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                        <ClientIcon name={item.icon || "check"} size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-lg mb-1">{item.title}</p>
                        <p className="text-white/50 text-sm">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {activePeriod.factText && (
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 relative overflow-hidden group">
                  <p className="text-primary font-bold text-xs uppercase tracking-widest mb-2">
                    {activePeriod.factLabel || "Интересный факт"}
                  </p>
                  <p className="text-white/80 leading-relaxed italic">{activePeriod.factText}</p>
                </div>
              )}
            </div>
            <div
              className="pointer-events-none"
              style={{
                position: "relative",
                height: 40,
                marginTop: -40,
                background: "linear-gradient(180deg, rgba(15,25,35,0) 0%, rgba(15,25,35,0.9) 100%)",
              }}
            ></div>
          </div>
        </div>
      </div>

      {(section.secondaryCtaLabel || section.secondaryCtaSecondaryLabel) && (
        <div className="mt-12 text-center">
          <p className="text-white/40 mb-6 max-w-xl mx-auto">
            Хотите стать частью нашей истории и внедрить инновации в свой бизнес? Наши эксперты помогут подобрать
            оптимальное решение.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {section.secondaryCtaLabel && (
              <a
                className="bg-primary hover:bg-primary/80 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
                href={section.secondaryCtaHref || "#"}
              >
                {section.secondaryCtaLabel}
                <span className="material-symbols-outlined">trending_flat</span>
              </a>
            )}
            {section.secondaryCtaSecondaryLabel && (
              <a
                className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3"
                href={section.secondaryCtaSecondaryHref || "#"}
              >
                <span className="material-symbols-outlined">download</span>
                {section.secondaryCtaSecondaryLabel}
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
