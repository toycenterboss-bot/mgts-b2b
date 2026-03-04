import Image from "next/image";
import MegaMenu from "@/components/layout/MegaMenu";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import { normalizeCmsHref } from "@/lib/routes";
import ThemeToggle from "@/components/theme/ThemeToggle";
import MegaMenuController from "@/components/layout/MegaMenuController";

type HeaderProps = {
  navigation: any;
};

const defaultLogo = "/assets/img/mgts-logo.svg";

const renderLogo = (logoUrl: string | null, logoAlt: string) => {
  const src = logoUrl || defaultLogo;
  return <Image src={src} alt={logoAlt} width={44} height={44} />;
};

export default function Header({ navigation }: HeaderProps) {
  if (!navigation) return null;
  const menuItems = Array.isArray(navigation.mainMenuItems) ? navigation.mainMenuItems : [];
  const megaMenus = Array.isArray(navigation.megaMenus) ? navigation.megaMenus : [];
  const topItems = menuItems
    .filter((item: any) => item?.isVisible !== false)
    .sort((a: any, b: any) => (a?.order || 0) - (b?.order || 0));
  const cta = navigation.megaMenuCta || null;
  const logoUrl = resolveMediaUrl(navigation.logo || null);
  const logoAlt = resolveMediaAlt(navigation.logo || null, navigation.logoAlt || "МГТС");

  return (
    <section
      className="mgts-header bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100"
      data-stitch-block="header_and_mega_menu"
    >
      <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/50">
        <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-between text-xs font-medium tracking-wide">
          <div className="flex items-center gap-6">
            {topItems.map((item: any, idx: number) => (
              <a
                key={`${item.label || "top"}-${idx}`}
                className="hover:text-primary transition-colors"
                href={normalizeCmsHref(item.href || "#")}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-6">
            {navigation.phone && (
              <a className="hover:text-primary transition-colors" href={`tel:${navigation.phone}`}>
                {navigation.phoneDisplay || navigation.phone}
              </a>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
      <header
        className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shadow-sm relative"
        data-mega-root
      >
        <MegaMenuController />
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center gap-2" aria-label="МГТС">
              {renderLogo(logoUrl, logoAlt)}
            </a>
            <nav className="hidden lg:flex items-center gap-8" data-mega-triggers>
              {megaMenus.map((menu: any, idx: number) => (
                <details key={`${menu.menuId || "mega"}-${idx}`} className="group">
                  <summary className="text-sm font-semibold text-slate-500 hover:text-primary transition-colors pb-1 border-b-2 border-transparent cursor-pointer list-none">
                    {menu.title}
                  </summary>
                  <MegaMenu menu={menu} cta={cta} />
                </details>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden xl:block">
              <input
                className="w-64 bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 text-sm focus:ring-2 focus:ring-primary"
                placeholder="Поиск услуг..."
                type="text"
              />
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400">search</span>
            </div>
            <a
              className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              href={normalizeCmsHref("/contact_details")}
            >
              Стать клиентом
            </a>
          </div>
        </div>
      </header>
    </section>
  );
}
