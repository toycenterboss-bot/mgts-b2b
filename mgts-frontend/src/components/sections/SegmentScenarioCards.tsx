"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";

type SegmentScenarioCardsProps = {
  section: any;
  showFilters?: boolean;
  showAction?: boolean;
};

const FILTERS = ["Все услуги", "Инфраструктура", "Безопасность", "Облако"];

export default function SegmentScenarioCards({
  section,
  showFilters = true,
  showAction = true,
}: SegmentScenarioCardsProps) {
  if (section?.isVisible === false) return null;
  const cards = useMemo(() => (Array.isArray(section.cards) ? section.cards.filter(Boolean) : []), [section]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card: any) => String(card?.title || "").toLowerCase().includes(q));
  }, [cards, query]);

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-6">
      {showFilters && (
        <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
          <div className="w-full md:flex-1">
            <label className="flex flex-col w-full h-12">
              <div className="flex w-full flex-1 items-stretch rounded-xl h-full overflow-hidden border border-white/10 bg-[#1a232e]">
                <div className="text-[#9aabbc] flex items-center justify-center pl-4 bg-transparent">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="form-input flex w-full flex-1 border-none bg-transparent text-white focus:outline-0 focus:ring-0 placeholder:text-[#9aabbc] px-4 text-base font-normal"
                  placeholder="Поиск B2B решений..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </label>
          </div>
          <div className="flex gap-2 p-1 bg-[#1a232e] rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto">
            {FILTERS.map((filter) => {
              const isActive = filter === activeFilter;
              return (
                <button
                  key={filter}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive ? "bg-primary text-white" : "text-[#9aabbc] hover:text-white"
                  }`}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-bold tracking-tight">{section.title || "Сценарии"}</h2>
        {showAction && (
          <span className="text-primary text-sm font-bold flex items-center gap-1">
            Смотреть все <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((card: any, idx: number) => (
          <div
            key={`${card.title || "scenario"}-${idx}`}
            className="bg-[#1a232e] border border-white/5 p-5 rounded-xl flex flex-col gap-3"
          >
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {card.icon ? <Icon name={card.icon} size={22} /> : <span className="material-symbols-outlined">hub</span>}
            </div>
            <h3 className="text-white text-sm font-bold leading-snug">{card.title || "Сценарий"}</h3>
            {card.description && (
              <p className="text-[#9aabbc] text-xs leading-relaxed line-clamp-3">{card.description}</p>
            )}
            <span className="mt-auto text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
              Подробнее <span className="material-symbols-outlined text-xs">chevron_right</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
