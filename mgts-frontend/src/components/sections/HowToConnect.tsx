"use client";

import { useState } from "react";
import Image from "next/image";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type HowToConnectProps = {
  section: any;
};

export default function HowToConnect({ section }: HowToConnectProps) {
  if (section?.isVisible === false) return null;
  const steps = Array.isArray(section.steps) ? section.steps : [];
  const sortedSteps = [...steps].sort(
    (a, b) => (a?.stepNumber || 0) - (b?.stepNumber || 0)
  );
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeStep = activeIdx !== null ? sortedSteps[activeIdx] : null;
  const extractModalBody = (html: string) => {
    if (!html) return "";
    try {
      const doc = new DOMParser().parseFromString(String(html), "text/html");
      const body = doc.querySelector(".modal-container__content") || doc.body;
      return body?.innerHTML || String(html);
    } catch {
      return String(html);
    }
  };

  return (
    <section className="how-to-connect rounded-2xl border border-white/10 bg-white/5 p-6">
      {section.title && (
        <h2 className="how-to-connect__title text-xl font-black tracking-tight mb-2">{section.title}</h2>
      )}
      {section.description && <p className="text-sm text-white/60 mb-5">{section.description}</p>}
      {sortedSteps.length > 0 && (
        <div className="how-to-connect__steps grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedSteps.map((step: any, idx: number) => {
            const imageUrl = resolveMediaUrl(step.image || null);
            return (
              <div
                key={`step-${idx}`}
                className="how-to-connect__step rounded-2xl border border-white/10 bg-black/20 p-5 flex flex-col transition-all hover:border-primary hover:bg-primary/5 hover:shadow-xl hover:shadow-primary/20"
                style={{ minHeight: 190 }}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center font-black">
                    {step.stepNumber || idx + 1}
                  </div>
                  <div className="min-w-0 flex flex-col h-full">
                    {step.title && <div className="font-black text-white/90">{step.title}</div>}
                    {step.description && (
                      <div className="mt-3 text-sm text-white/65 leading-relaxed">{step.description}</div>
                    )}
                    {step.modalHtml && (
                      <button
                        type="button"
                        className="mt-auto text-primary text-sm font-medium flex items-center gap-2 hover:gap-3 transition-all"
                        onClick={() => setActiveIdx(idx)}
                      >
                        Подробнее <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
                {imageUrl && (
                  <Image
                    src={imageUrl}
                    alt={resolveMediaAlt(step.image || null, step.title)}
                    width={480}
                    height={320}
                    className="mt-4 w-full h-40 object-cover rounded-xl border border-white/10"
                  />
                )}
                {step.content && (
                  <div
                    className="mt-4 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: step.content }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      {section.content && (
        <div
          className="mt-6 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      )}
      {activeStep && (
        <div className="fixed inset-0 z-50" data-step-modal onClick={() => setActiveIdx(null)}>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          ></div>
          <div className="relative mx-auto flex h-full w-full max-w-[1100px] items-center justify-center p-6">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl"
              style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">Шаг</p>
                  <p className="text-base font-black tracking-tight text-white truncate">
                    {activeStep.title || ""}
                  </p>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-colors"
                  type="button"
                  onClick={() => setActiveIdx(null)}
                  aria-label="Закрыть"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div
                className="p-6 space-y-4 step-modal-body"
                style={{ overflow: "auto", flex: "1 1 auto", minHeight: 0 }}
                dangerouslySetInnerHTML={{ __html: extractModalBody(activeStep.modalHtml || "") }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
