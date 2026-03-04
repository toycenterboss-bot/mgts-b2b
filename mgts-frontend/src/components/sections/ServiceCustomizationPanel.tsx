"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ServiceCustomizationPanelProps = {
  section: any;
};

type Option = {
  label: string;
  value: string;
};

const normalizeOptions = (raw: any): Option[] => {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const label = item.trim();
        return label ? { label, value: label.toLowerCase().replace(/\s+/g, "-") } : null;
      }
      const label = String(item.label || item.title || item.name || item.text || "").trim();
      const value = String(item.value || item.key || label).trim();
      if (!label) return null;
      return { label, value: value || label };
    })
    .filter(Boolean) as Option[];
};

export default function ServiceCustomizationPanel({ section }: ServiceCustomizationPanelProps) {
  if (section?.isVisible === false) return null;
  const options = useMemo(() => normalizeOptions(section?.dropdownOptions), [section?.dropdownOptions]);
  const toggles = Array.isArray(section?.toggles) ? section.toggles.filter(Boolean) : [];
  const [selected, setSelected] = useState<Option | null>(options[0] || null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toggleState, setToggleState] = useState<boolean[]>(toggles.map((t: any) => Boolean(t?.enabled)));
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelected(options[0] || null);
  }, [options]);

  useEffect(() => {
    setToggleState(toggles.map((t: any) => Boolean(t?.enabled)));
  }, [section?.toggles]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const el = event.target as HTMLElement | null;
      if (el && rootRef.current?.contains(el)) return;
      setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const filtered = options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <section
      className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100"
      data-stitch-block="service_customization_panel"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-12" ref={rootRef}>
        <div className="max-w-xl">
          <h3 className="text-xl font-bold mb-6" data-service-customization-title>
            {section?.title || "Кастомизация"}
          </h3>
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6 space-y-6">
            <div className="space-y-2">
              <label
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
                data-service-customization-dropdown-label
              >
                {section?.dropdownLabel || "Тип подключения"}
              </label>
              <div className="relative" data-dropdown>
                <button
                  className="flex items-center justify-between w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark px-4 py-3 rounded-lg cursor-pointer hover:border-primary transition-colors"
                  type="button"
                  data-dropdown-trigger
                  aria-expanded={open}
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <span className="text-sm" data-dropdown-label>
                    {selected?.label || "Выберите опцию"}
                  </span>
                  <span className="material-symbols-outlined text-slate-400" data-dropdown-icon>
                    unfold_more
                  </span>
                </button>
                <div
                  className={`absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg shadow-xl overflow-hidden z-20${
                    open ? "" : " hidden"
                  }`}
                  data-dropdown-menu
                >
                  <div className="p-2 border-b border-slate-100 dark:border-border-dark">
                    <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-background-dark rounded-md">
                      <span className="material-symbols-outlined text-lg text-slate-400 mr-2">search</span>
                      <input
                        className="bg-transparent border-none text-xs focus:ring-0 p-0 w-full"
                        placeholder="Поиск..."
                        type="text"
                        data-dropdown-search
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                  </div>
                  <ul className="max-h-48 overflow-y-auto custom-scrollbar" data-service-customization-options>
                    {filtered.map((opt) => (
                      <li key={opt.value}>
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-primary hover:text-white cursor-pointer transition-colors"
                          type="button"
                          data-dropdown-option
                          data-service-customization-option
                          data-value={opt.value}
                          data-label={opt.label}
                          onClick={() => {
                            setSelected(opt);
                            setOpen(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-4 py-2 text-xs text-slate-400">Ничего не найдено</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4" data-service-customization-toggles>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {section?.togglesLabel || "Дополнительные опции"}
              </label>
              {toggles.map((toggle: any, idx: number) => {
                const enabled = toggleState[idx] ?? Boolean(toggle?.enabled);
                return (
                  <div key={`toggle-${idx}`} className="flex items-center justify-between" data-service-customization-toggle>
                    <span className="text-sm font-medium" data-service-customization-toggle-label>
                      {toggle?.label || `Опция ${idx + 1}`}
                    </span>
                    <button
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        enabled ? "bg-primary" : "bg-slate-300 dark:bg-border-dark"
                      }`}
                      type="button"
                      data-switch
                      aria-pressed={enabled}
                      data-switch-on-class="bg-primary"
                      data-switch-off-class="bg-slate-300 dark:bg-border-dark"
                      data-switch-thumb-on-class="right-1"
                      data-switch-thumb-off-class="left-1"
                      onClick={() =>
                        setToggleState((prev) => prev.map((val, i) => (i === idx ? !val : val)))
                      }
                    >
                      <span
                        className={`absolute top-1 size-3 bg-white rounded-full ${enabled ? "right-1" : "left-1"}`}
                        data-switch-thumb
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              className="w-full py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all text-sm"
              data-service-customization-apply
            >
              {section?.applyText || "Применить настройки"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
