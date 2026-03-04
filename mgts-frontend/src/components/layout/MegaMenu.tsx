import Icon from "@/components/ui/Icon";
import ClientIcon from "@/components/ui/ClientIcon";
import { normalizeCmsHref } from "@/lib/routes";

type MegaMenuProps = {
  menu: any;
  cta?: any;
};

export default function MegaMenu({ menu, cta }: MegaMenuProps) {
  if (!menu) return null;
  const sections = Array.isArray(menu.sections) ? menu.sections.filter(Boolean) : [];
  const showCta = cta && cta.isVisible !== false;
  const panelTitle = menu.panelTitle || menu.title || "Основные услуги";
  const resolveIconName = (link: any) => {
    const direct =
      (typeof link?.icon === "string" && link.icon) ||
      (typeof link?.iconName === "string" && link.iconName) ||
      (typeof link?.iconSymbol === "string" && link.iconSymbol) ||
      "";
    if (direct) return String(direct).trim();

    const label = String(link?.label || link?.title || "").toLowerCase();
    const href = String(link?.href || link?.url || link?.link || link?.slug || "").toLowerCase();
    const hay = `${label} ${href}`;
    const rules: Array<[string, string]> = [
      ["видеонаблю", "videocam"],
      ["скуд", "shield_lock"],
      ["асу", "settings"],
      ["аскуэ", "bolt"],
      ["сопряж", "sync_alt"],
      ["громкоговор", "campaign"],
      ["оповещ", "campaign"],
      ["оборудован", "memory"],
      ["документ", "description"],
      ["рамочн", "description"],
      ["закуп", "shopping_cart"],
      ["допуск", "rule"],
      ["реализац", "inventory_2"],
      ["тариф", "request_quote"],
      ["кабель", "settings_input_antenna"],
      ["проектирован", "engineering"],
      ["строитель", "construction"],
      ["присоедин", "sync_alt"],
      ["трафик", "sync_alt"],
      ["передач", "swap_horiz"],
      ["данн", "swap_horiz"],
      ["доступ", "vpn_key"],
      ["видео", "videocam"],
      ["связ", "call"],
      ["инфраструктур", "hub"],
      ["безопас", "shield"],
      ["компенсац", "payments"],
      ["цифров", "devices"],
      ["объект", "location_city"],
    ];
    for (const [needle, icon] of rules) {
      if (hay.includes(needle)) return icon;
    }
    return "bolt";
  };
  const sectionEntries = sections.map((section: any, idx: number) => {
    const raw = String(section?.title || section?.titleHref || idx);
    const key =
      raw
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9а-яё]+/gi, "-")
        .replace(/^-+|-+$/g, "") || `section-${idx}`;
    return { ...section, __key: key };
  });
  const firstKey = sectionEntries[0]?.__key || "";

  return (
    <div className="mega-menu-panel absolute top-full left-0 w-full mega-menu-blur bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xl z-40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-3 flex flex-col gap-1 border-r border-slate-200 dark:border-slate-800 pr-6">
            {sectionEntries.map((section: any, idx: number) => (
              <button
                key={`category-${section.__key}`}
                type="button"
                className="p-3 rounded-lg flex items-center justify-between group cursor-pointer transition-colors text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                data-mega-category={section.__key}
                data-mega-label={section.title || `Раздел ${idx + 1}`}
                data-mega-active-classes="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                data-mega-inactive-classes="text-slate-500"
                aria-pressed={section.__key === firstKey}
              >
                <span className="font-bold">{section.title || `Раздел ${idx + 1}`}</span>
                <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
          <div className={`${showCta ? "col-span-6" : "col-span-9"}`}>
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-6">
              <span data-mega-title>{panelTitle}</span>
            </h3>
            <div data-mega-sections="true">
              {sectionEntries.map((section: any, idx: number) => (
                <div
                  key={`section-${section.__key}`}
                  className={`grid grid-cols-2 gap-6${idx === 0 ? "" : " hidden"}`}
                  data-mega-section={section.__key}
                  aria-hidden={idx === 0 ? "false" : "true"}
                >
                  {(section.links || []).map((link: any, ldx: number) => {
                    const iconName = resolveIconName(link);
                    return (
                    <a
                      key={`${link.label || "link"}-${ldx}`}
                      href={normalizeCmsHref(link.href || "#")}
                      className="block w-full flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div
                        className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"
                        suppressHydrationWarning
                      >
                        {iconName && (
                          <Icon
                            name={iconName}
                            size={28}
                            className="mgts-nav-icon w-7 h-7 object-contain"
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold mb-1 group-hover:text-primary transition-colors">
                          {link.label}
                        </h4>
                        {link.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">{link.description}</p>
                        )}
                      </div>
                    </a>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {showCta && (
            <div className="col-span-3">
              <div className="h-[280px] min-h-[280px] max-h-[280px] rounded-2xl bg-gradient-to-br from-primary to-blue-800 p-6 text-white flex flex-col justify-between overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <Icon name={cta?.backgroundIcon || "cell_tower"} size={140} className="w-32 h-32 object-contain" />
                </div>
                <div className="relative z-10">
                  {cta.title && <div className="text-xl font-bold mb-3">{cta.title}</div>}
                  {cta.description && (
                    <div className="text-sm text-blue-100 opacity-90 leading-relaxed">
                      {cta.description}
                    </div>
                  )}
                </div>
                <div className="relative z-10 flex flex-col gap-3 mt-8">
                  {cta.buttonText && (
                    <a
                      href={normalizeCmsHref(cta.buttonHref || "#")}
                      className="w-full bg-white text-primary font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors text-center"
                    >
                      {cta.buttonText}
                    </a>
                  )}
                  {cta.phoneText && (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium" suppressHydrationWarning>
                      {cta.phoneIcon && <ClientIcon name={cta.phoneIcon} size={16} />}
                      <span>{cta.phoneText}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
