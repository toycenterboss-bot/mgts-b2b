"use client";

import { useMemo, useState } from "react";

type ServiceTabsProps = {
  section: any;
};

export default function ServiceTabs({ section }: ServiceTabsProps) {
  if (section?.isVisible === false) return null;
  const tabs = useMemo(() => {
    const list = Array.isArray(section.tabs) ? section.tabs : [];
    return [...list].sort((a, b) => (a?.order || 0) - (b?.order || 0));
  }, [section.tabs]);
  const defaultIndex = Number.isFinite(section?.defaultTab) ? section.defaultTab : 0;
  const [activeIndex, setActiveIndex] = useState(Math.min(defaultIndex, tabs.length - 1));

  if (tabs.length === 0) return null;
  const activeTab = tabs[activeIndex] || tabs[0];

  return (
    <section className="service-tabs">
      {section.title && <h2 className="service-tabs__title">{section.title}</h2>}
      <div className="service-tabs__tabs">
        {tabs.map((tab: any, idx: number) => (
          <button
            key={`${tab.name || "tab"}-${idx}`}
            type="button"
            className={`service-tabs__tab-button${idx === activeIndex ? " is-active" : ""}`}
            onClick={() => setActiveIndex(idx)}
          >
            {tab.name || `Таб ${idx + 1}`}
          </button>
        ))}
      </div>
      <div className="service-tabs__tab-content">
        {activeTab?.content && (
          <div
            className="service-tabs__container"
            dangerouslySetInnerHTML={{ __html: activeTab.content }}
          />
        )}
      </div>
    </section>
  );
}
