"use client";

import { useMemo, useState } from "react";

type SectionMapProps = {
  section: any;
};

const normalizeMapEmbedUrl = (base: string) => {
  if (!base) return "";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(base, origin);
    if (/yandex\.ru$/i.test(url.hostname) && url.pathname.startsWith("/maps")) {
      const embed = new URL("https://yandex.ru/map-widget/v1/");
      ["ll", "z", "l", "text"].forEach((key) => {
        const val = url.searchParams.get(key);
        if (val) embed.searchParams.set(key, val);
      });
      return embed.toString();
    }
    return url.toString();
  } catch {
    return base;
  }
};

export default function SectionMap({ section }: SectionMapProps) {
  if (section?.isVisible === false) return null;
  const markers = Array.isArray(section.markers) ? section.markers.filter(Boolean) : [];
  const mapUrl = String(section?.mapUrl || "").trim();

  const buildMapUrl = (base: string, marker: any) => {
    if (!base) return "";
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
      const url = new URL(base, origin);
      const lat = marker?.lat;
      const lng = marker?.lng;
      const address = marker?.address || marker?.title || "";
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        url.searchParams.set("ll", `${lng},${lat}`);
        url.searchParams.set("z", String(section?.zoom || 17));
        url.searchParams.delete("text");
      } else if (address) {
        url.searchParams.set("text", address);
        url.searchParams.delete("ll");
      }
      return normalizeMapEmbedUrl(url.toString());
    } catch {
      return normalizeMapEmbedUrl(base);
    }
  };

  const initialSrc = useMemo(() => {
    const marker = markers[0];
    return buildMapUrl(mapUrl, marker) || normalizeMapEmbedUrl(mapUrl) || mapUrl;
  }, [mapUrl, markers]);

  const [activeSrc, setActiveSrc] = useState(initialSrc);

  return (
    <section className="section-map">
      {section.title && <h2 className="section-map__title">{section.title}</h2>}
      {section.description && <p className="section-map__description">{section.description}</p>}
      <div className="section-map__container">
        {markers.length > 0 && (
          <div className="section-map__objects">
            <ul className="section-map__objects-list">
              {markers.map((marker: any, idx: number) => {
                const title = marker.title || marker.label || `Точка ${idx + 1}`;
                const desc = marker.description || marker.address || "";
                const showDesc = desc && String(desc).trim() !== String(title).trim();
                return (
                  <li key={`marker-${idx}`} className="section-map__object-item">
                    <button
                      type="button"
                      className="text-left w-full"
                      data-map-marker
                      data-map-marker-idx={idx}
                      onClick={() => {
                        const nextUrl = buildMapUrl(mapUrl, marker);
                        if (nextUrl) setActiveSrc(nextUrl);
                      }}
                    >
                      <div className="section-map__object-title">{title}</div>
                      {showDesc && <div className="section-map__object-address">{desc}</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="section-map__map-wrapper">
          {activeSrc ? (
            <iframe
              title={section.title || "Карта"}
              src={activeSrc}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="section-map__map-placeholder">
              Карта будет добавлена после настройки ссылки в Strapi.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
