"use client";

import { useEffect, useMemo, useRef } from "react";
import { resolveMediaUrl } from "@/lib/media";

type ImageCarouselProps = {
  section: any;
};

export default function ImageCarousel({ section }: ImageCarouselProps) {
  if (section?.isVisible === false) return null;
  const items = useMemo(
    () =>
      (Array.isArray(section.items) ? section.items : [])
        .filter(Boolean)
        .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0)),
    [section.items]
  );
  const showNavigation = section?.showNavigation !== false;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const stepRef = useRef<number>(420);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
    if (!slides.length) return;
    const total = slides.length;
    const gap = Number.parseFloat(getComputedStyle(track).gap || "0") || 0;
    const step = slides[0].getBoundingClientRect().width + gap;
    stepRef.current = Number.isFinite(step) && step > 0 ? step : 420;

    let raf = 0;
    const update = () => {
        const index = Math.min(total, Math.max(1, Math.round(track.scrollLeft / stepRef.current) + 1));
      if (progressRef.current) {
        progressRef.current.style.width = `${Math.min(100, (index / total) * 100)}%`;
      }
      if (counterRef.current) {
        counterRef.current.textContent = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    track.addEventListener("scroll", onScroll, { passive: true });

    let intervalId: number | null = null;
    if (section?.autoPlay) {
      const interval = Number(section?.interval) || 6000;
      intervalId = window.setInterval(() => {
        track.scrollBy({ left: stepRef.current, behavior: "smooth" });
      }, interval);
    }

    return () => {
      track.removeEventListener("scroll", onScroll);
      if (intervalId) window.clearInterval(intervalId);
      cancelAnimationFrame(raf);
    };
  }, [section?.autoPlay, section?.interval, items.length]);

  if (!items.length) return null;

  return (
    <section
      className="image-carousel space-y-6"
      data-carousel
      data-carousel-step="420"
      data-carousel-autoplay={section?.autoPlay ? "true" : undefined}
      data-carousel-interval={section?.interval ? String(section.interval) : undefined}
    >
      <div className="flex items-end justify-between px-2">
        <div>
          {section.title && (
            <h2 className="image-carousel__title text-white text-3xl lg:text-4xl font-bold tracking-tight">
              {section.title}
            </h2>
          )}
          {section.subtitle && <p className="text-slate-500 dark:text-slate-400 mt-2">{section.subtitle}</p>}
        </div>
        {showNavigation && (
          <div className="flex gap-3">
            <button
              className="glass size-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              data-carousel-prev
              aria-label="Предыдущий слайд"
              type="button"
              onClick={() =>
                trackRef.current?.scrollBy({ left: -stepRef.current, behavior: "smooth" })
              }
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              className="glass size-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              data-carousel-next
              aria-label="Следующий слайд"
              type="button"
              onClick={() =>
                trackRef.current?.scrollBy({ left: stepRef.current, behavior: "smooth" })
              }
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        <div
          ref={trackRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 hide-scrollbar"
          data-carousel-track
        >
          {items.map((item: any, idx: number) => {
            const url = resolveMediaUrl(item.image || null);
            return (
              <div
                key={`${item.title || "slide"}-${idx}`}
                className="image-carousel__item min-w-[85%] lg:min-w-[70%] aspect-[21/9] rounded-xl overflow-hidden snap-start relative group/card"
                data-carousel-slide
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/card:scale-105"
                  style={url ? { backgroundImage: `url('${url}')` } : undefined}
                ></div>
                <div className="absolute bottom-0 left-0 p-8 lg:p-12 z-20 max-w-2xl">
                  {(item.badge || item.tag) && (
                    <span className="inline-block px-3 py-1 bg-primary text-[10px] font-bold uppercase tracking-widest rounded mb-4">
                      {item.badge || item.tag}
                    </span>
                  )}
                  {item.title && <h3 className="text-3xl font-bold text-white mb-4">{item.title}</h3>}
                  {item.description && <p className="text-slate-200 text-lg mb-6">{item.description}</p>}
                  {item?.ctaText && item?.ctaHref && (
                    <a
                      className="bg-white text-black px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors inline-flex"
                      href={item.ctaHref}
                    >
                      {item.ctaText}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showNavigation && (
          <div className="mt-8 flex items-center gap-4 px-2">
            <div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div ref={progressRef} className="h-full bg-primary tab-glow transition-all duration-500" />
            </div>
            <div className="text-xs font-bold text-slate-500 tracking-widest">
              <span ref={counterRef} data-carousel-counter />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
