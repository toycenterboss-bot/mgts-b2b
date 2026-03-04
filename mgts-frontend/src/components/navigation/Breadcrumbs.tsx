import { Fragment } from "react";
import { toPrettyRoute } from "@/lib/routes";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items.length) return null;
  const navClassName = className ? className : "mb-4";
  return (
    <nav className={`flex items-center gap-2 text-sm font-medium ${navClassName}`} data-stitch-block="breadcrumbs">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const href = item.href ? toPrettyRoute(item.href) : "";
        const isHome = idx === 0 && item.label === "Главная";
        const textClass = isLast
          ? "text-primary font-bold"
          : "text-slate-500 dark:text-slate-400 hover:text-primary transition-colors";
        const content = (
          <>
            {isHome && <span className="material-symbols-outlined text-base">home</span>}
            <span>{item.label}</span>
          </>
        );

        return (
          <Fragment key={`${item.label}-${idx}`}>
            {isLast || !href ? (
              <span className={textClass}>{item.label}</span>
            ) : (
              <a href={href} className={`flex items-center gap-1 ${textClass}`}>
                {content}
              </a>
            )}
            {!isLast && (
              <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
