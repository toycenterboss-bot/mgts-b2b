"use client";

import { useMemo, useState } from "react";
import ClientIcon from "@/components/ui/ClientIcon";

type CareerVacanciesProps = {
  section: any;
};

export default function CareerVacancies({ section }: CareerVacanciesProps) {
  if (section?.isVisible === false) return null;
  const filters = Array.isArray(section.filters) ? section.filters : [];
  const vacancies = Array.isArray(section.vacancies) ? section.vacancies : [];
  const initialVisible = Number.isFinite(section?.initialVisible) ? section.initialVisible : 2;
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState(() => {
    const active = filters.find((f: any) => f?.isActive);
    return active?.key || "";
  });

  const filteredVacancies = useMemo(() => {
    if (!activeFilter) return vacancies;
    return vacancies.filter((vacancy: any) =>
      (vacancy.tags || []).some((tag: any) => tag?.key === activeFilter)
    );
  }, [activeFilter, vacancies]);

  const visibleVacancies = showAll
    ? filteredVacancies
    : filteredVacancies.slice(0, initialVisible);

  return (
    <section className="career-vacancies py-20 bg-[#0b0e14]" data-career-section="vacancies">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {section.title && (
          <h2 className="career-vacancies__title text-3xl font-bold text-white mb-8 px-2">
            {section.title}
          </h2>
        )}
        {filters.length > 0 && (
          <div className="career-vacancies__filters flex flex-wrap gap-2 mb-10 px-2">
            {filters.map((filter: any, idx: number) => {
              const isActive = filter.key === activeFilter;
              return (
                <button
                  key={`${filter.key || "filter"}-${idx}`}
                  type="button"
                  className={`career-vacancies__filter px-6 py-2 rounded-full text-sm transition-all ${
                    isActive
                      ? "bg-primary text-white font-bold"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 font-medium border border-white/10"
                  }`}
                  onClick={() => setActiveFilter(filter.key || "")}
                >
                  {filter.label || "Все"}
                </button>
              );
            })}
          </div>
        )}
        <div className="career-vacancies__list" data-vacancy-table>
          {visibleVacancies.map((vacancy: any, idx: number) => (
            <article key={`vacancy-${idx}`} className="career-vacancies__item" data-vacancy-row>
              <div className="career-vacancies__item-header">
                {vacancy.title && (
                  <h3 className="career-vacancies__item-title" data-vacancy-title>
                    {vacancy.title}
                  </h3>
                )}
                {vacancy.salaryText && (
                  <div className="career-vacancies__item-salary" data-vacancy-salary>
                    {vacancy.salaryText}
                  </div>
                )}
              </div>
              {Array.isArray(vacancy.meta) && vacancy.meta.length > 0 && (
                <ul className="career-vacancies__meta" data-vacancy-meta>
                  {vacancy.meta.map((meta: any, metaIdx: number) => (
                    <li key={`meta-${metaIdx}`} className="career-vacancies__meta-item">
                      {meta.icon && <ClientIcon name={meta.icon} size={18} />}
                      <span>{meta.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {Array.isArray(vacancy.tags) && vacancy.tags.length > 0 && (
                <div className="career-vacancies__tags">
                  {vacancy.tags.map((tag: any, tagIdx: number) => (
                    <span key={`tag-${tagIdx}`} className="career-vacancies__tag">
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
              {vacancy.ctaLabel && (
                <a className="career-vacancies__cta" data-vacancy-cta href={vacancy.ctaUrl || "#"}>
                  {vacancy.ctaLabel}
                </a>
              )}
            </article>
          ))}
        </div>
        {filteredVacancies.length > initialVisible && (
          <div className="career-vacancies__actions">
            <button type="button" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Скрыть" : section.showMoreLabel || "Показать все"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
