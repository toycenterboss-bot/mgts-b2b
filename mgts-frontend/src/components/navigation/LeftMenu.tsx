import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { findNodeBySlug, loadHierarchy } from "@/lib/hierarchy";
import { getDeepNav } from "@/lib/strapi";
import { normalizeCmsHref, toPrettyRoute } from "@/lib/routes";

type LeftMenuProps = {
  rootSlug?: string;
  currentSlug: string;
  deepNavKey?: string | null;
  variant?: "cms" | "doc" | "form";
  asideClassName?: string;
};

const hasActiveDescendant = (node: any, slug: string): boolean => {
  if (!node?.children?.length) return false;
  return node.children.some(
    (child: any) => child.slug === slug || hasActiveDescendant(child, slug)
  );
};

const renderNode = (node: any, currentSlug: string) => {
  if (!node) return null;
  const isActive = node.slug === currentSlug;
  const isParentActive = hasActiveDescendant(node, currentSlug);

  return (
    <li
      key={node.slug}
      className={`left-menu__item${isActive ? " is-active" : ""}${isParentActive ? " is-parent-active" : ""}`}
    >
      <a href={node.path || "#"} className="left-menu__link">
        {node.title || node.slug}
      </a>
      {Array.isArray(node.children) && node.children.length > 0 && (
        <ul className="left-menu__children">
          {node.children.map((child: any) => renderNode(child, currentSlug))}
        </ul>
      )}
    </li>
  );
};

const renderDeepNavItems = (items: any[], currentPath: string, variant: "cms" | "doc" | "form") => {
  const rows: ReactNode[] = [];
  const getIconName = (icon: any) => {
    if (!icon) return "";
    if (typeof icon === "string") return icon.trim();
    if (typeof icon === "object") {
      const name =
        icon.name ||
        icon.key ||
        icon.iconName ||
        icon.iconSymbol ||
        (icon.data &&
          (icon.data.name ||
            icon.data.key ||
            (icon.data.attributes && (icon.data.attributes.name || icon.data.attributes.key)))) ||
        "";
      return typeof name === "string" ? name.trim() : "";
    }
    return "";
  };
  const pickSidebarIcon = (label: string) => {
    const t = String(label || "").toLowerCase();
    if (t.includes("документ")) return "description";
    if (t.includes("контакт") || t.includes("связ")) return "call";
    if (t.includes("обрат") || t.includes("опрос")) return "chat";
    if (t.includes("комплаен") || t.includes("этик")) return "verified_user";
    if (t.includes("услуг") || t.includes("сервис")) return "hub";
    if (t.includes("новост")) return "newspaper";
    if (t.includes("истор")) return "history";
    return "lan";
  };

  const linkBaseClass =
    variant === "doc"
      ? "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27303a]"
      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#27303a]";
  const activeClass =
    variant === "doc"
      ? "bg-primary/10 text-primary border-l-4 border-primary dark:text-primary"
      : "bg-primary/10 text-primary border-l-4 border-primary dark:text-primary";

  const makeLink = (label: string, href: string | null, active: boolean, icon?: any, indent = 0) => {
    const iconName = getIconName(icon) || pickSidebarIcon(label);
    const content = iconName ? (
      <Icon
        name={iconName}
        size={20}
        className={`mgts-nav-icon ${active ? "text-primary" : "group-hover:text-primary"}`}
        allowFallback
      />
    ) : (
      <span
        className={`material-symbols-outlined text-xl mgts-nav-icon ${
          active ? "text-primary" : "group-hover:text-primary"
        }`}
      >
        lan
      </span>
    );

    return (
      <a
        key={`${label}-${href || "link"}`}
        href={href || "#"}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-display ${linkBaseClass}${
          indent ? " pl-6" : ""
        }${active ? ` ${activeClass}` : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {content}
        <span className={active ? "text-sm font-bold font-display" : "text-sm font-medium font-display"}>
          {label}
        </span>
      </a>
    );
  };

  const groupTitleClass =
    variant === "doc"
      ? "text-slate-400 dark:text-slate-500"
      : "text-white/60";
  const makeGroupTitle = (label: string, indent = 0) => (
    <div
      key={`group-${label}`}
      className={`${groupTitleClass} text-[10px] font-bold uppercase tracking-widest px-3 mb-2 mt-5 font-display${
        indent ? " pl-6" : ""
      }`}
    >
      {label || "Group"}
    </div>
  );

  for (const item of items) {
    if (!item) continue;
    if (item.kind === "group") {
      rows.push(makeGroupTitle(item.label || "Раздел"));
      const children = Array.isArray(item.children) ? item.children : [];
      for (const child of children) {
        const childHref = child?.href ? normalizeCmsHref(child.href) : "#";
        const isActive = childHref === currentPath;
        rows.push(makeLink(child.label || "Link", childHref, isActive, child.icon, 1));
      }
    } else {
      const href = item?.href ? normalizeCmsHref(item.href) : "#";
      const isActive = href === currentPath;
      rows.push(makeLink(item.label || "Link", href, isActive, item.icon));
    }
  }
  return rows;
};

export default async function LeftMenu({
  rootSlug,
  currentSlug,
  deepNavKey,
  variant = "cms",
  asideClassName = "",
}: LeftMenuProps) {
  const normalizedSlug = String(currentSlug || "").trim();
  const currentPath = toPrettyRoute(normalizedSlug);

  if (deepNavKey) {
    const tree = (await getDeepNav(deepNavKey)) as any;
    const items = Array.isArray(tree?.items) ? tree.items : [];
    if (items.length) {
      const titleClass =
        variant === "doc"
          ? "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/60 mb-3 font-display"
          : "text-xs font-bold uppercase tracking-widest text-white/60 mb-3 font-display";
      const wrapClass = variant === "cms" ? "rounded-2xl border border-white/10 bg-black/20 p-6" : "p-0";
      const asideClass = `hidden lg:block font-display${asideClassName ? ` ${asideClassName}` : ""}`;

      return (
        <aside className={asideClass} data-deepnav-sidebar>
          <div className={wrapClass}>
            <h3 className={titleClass} data-deepnav-title>
              {tree?.title || "Раздел"}
            </h3>
            <nav className="space-y-1" data-deepnav-nav>
              {renderDeepNavItems(items, currentPath, variant).map((node) => node)}
            </nav>
          </div>
        </aside>
      );
    }
  }

  const root = rootSlug ? String(rootSlug) : "";
  if (!root) return null;
  const roots = loadHierarchy();
  const rootNode = findNodeBySlug(roots, root);
  if (!rootNode) return null;

  return (
    <nav className="left-menu">
      <div className="left-menu__title">{rootNode.title || "Раздел"}</div>
      <ul className="left-menu__list">
        {rootNode.children.map((child: any) => renderNode(child, normalizedSlug))}
      </ul>
    </nav>
  );
}
