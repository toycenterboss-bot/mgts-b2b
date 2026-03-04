"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type ImageSwitcherProps = {
  section: any;
};

export default function ImageSwitcher({ section }: ImageSwitcherProps) {
  if (section?.isVisible === false) return null;
  const items = useMemo(() => (Array.isArray(section.items) ? section.items : []), [section.items]);
  const safeDefault = Math.min(Math.max(section.defaultImage || 0, 0), Math.max(items.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(safeDefault);
  const active = items[activeIndex];
  const activeUrl = resolveMediaUrl(active?.image || null);

  return (
    <section className="image-switcher">
      {section.title && <h2 className="image-switcher__title">{section.title}</h2>}
      <div className="image-switcher__container">
        <div className="image-switcher__items">
          {items.map((item: any, idx: number) => (
            <button
              key={`${item.title || "switcher"}-${idx}`}
              className={`image-switcher__item ${idx === activeIndex ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <div className="image-switcher__preview">
          {activeUrl && (
            <Image
              src={activeUrl}
              alt={resolveMediaAlt(active?.image || null, active?.title)}
              width={900}
              height={560}
            />
          )}
          {active?.description && <p className="image-switcher__description">{active.description}</p>}
        </div>
      </div>
    </section>
  );
}
