"use client";

import { useState } from "react";

type ServiceFaqProps = {
  section: any;
};

export default function ServiceFaq({ section }: ServiceFaqProps) {
  if (section?.isVisible === false) return null;
  const items = Array.isArray(section.items) ? section.items : [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="service-faq rounded-2xl border border-white/10 bg-white/5 p-6">
      {section.title && (
        <h2 className="service-faq__title text-2xl font-bold flex items-center gap-3 mb-6 text-white">
          {section.title}
        </h2>
      )}
      <div className="service-faq__items flex flex-col gap-3" data-accordion data-accordion-multiple="false">
        {items.map((item: any, idx: number) => {
          const isOpen = openIndex === idx;
          const hasAnswer = Boolean(item?.answer);
          return (
            <details
              key={`${item.question || "faq"}-${idx}`}
              className="service-faq__item group rounded-xl border border-white/10 bg-black/20 overflow-hidden"
              open={isOpen}
              onToggle={(event) => {
                const nextOpen = event.currentTarget.open;
                setOpenIndex(nextOpen ? idx : null);
              }}
            >
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none">
                <span className="service-faq__question font-bold text-white">{item.question}</span>
                <span className="material-symbols-outlined text-white/60 group-open:rotate-180 transition-transform duration-300">
                  expand_more
                </span>
              </summary>
              {hasAnswer && (
                <div
                  className="service-faq__answer px-5 pb-6 text-white/70 text-sm leading-relaxed border-t border-white/10 mt-1 pt-4"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
