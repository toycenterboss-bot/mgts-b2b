import { normalizeCmsHref } from "@/lib/routes";

type FooterProps = {
  footer: any;
};

export default function Footer({ footer }: FooterProps) {
  if (!footer) return null;
  const sections = Array.isArray(footer.sections)
    ? [...footer.sections].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    : [];
  const legal = Array.isArray(footer.legalLinks) ? footer.legalLinks : [];
  const socials = Array.isArray(footer.socialLinks) ? footer.socialLinks : [];
  const legalLabels = new Set(
    legal
      .map((link: any) => String(link?.label || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const filteredSections = sections.map((section: any) => ({
    ...section,
    links: Array.isArray(section?.links)
      ? section.links.filter(
          (link: any) => !legalLabels.has(String(link?.label || "").trim().toLowerCase())
        )
      : [],
  }));
  const description =
    footer?.description ||
    "Лидер телекоммуникационных решений в Москве. Надежная инфраструктура для вашего бизнеса с 1882 года.";
  const socialDefaults = [
    { icon: "public", href: "#", label: "Public" },
    { icon: "rss_feed", href: "#", label: "RSS" },
    { icon: "video_library", href: "#", label: "Video" },
  ];
  const socialItems = socials.length > 0 ? socials : socialDefaults;

  return (
    <footer className="bg-[#0a0f18] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 lg:col-span-1 flex flex-col gap-6">
            <div className="flex items-center gap-2" aria-label="МГТС">
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
                <span className="text-white font-black text-xl">M</span>
              </div>
              <span className="text-2xl font-bold tracking-tighter">МГТС</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {description}
            </p>
            <div className="flex items-center gap-3">
              {socialItems.map((link: any, idx: number) => (
                <a
                  key={`${link.label || "social"}-${idx}`}
                  href={normalizeCmsHref(link.href || "#")}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 transition-all text-gray-400 hover:text-white"
                >
                  {link.icon && <span className="material-symbols-outlined text-xl">{link.icon}</span>}
                </a>
              ))}
            </div>
          </div>
          {filteredSections.map((section: any, idx: number) => (
            <div key={`${section.title || "section"}-${idx}`}>
              {section.title && (
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{section.title}</h3>
              )}
              <ul className="flex flex-col">
                {(section.links || []).map((link: any, ldx: number) => (
                  <li key={`${link.label || "link"}-${ldx}`}>
                    <a
                      className="text-xs leading-[1.1] text-gray-400 hover:text-white transition-colors"
                      href={normalizeCmsHref(link.href || "#")}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            {footer.copyright && (
              <p className="text-xs text-gray-600 uppercase tracking-widest">{footer.copyright}</p>
            )}
            <div className="flex items-center gap-4">
              {legal.map((link: any, idx: number) => (
                <a
                  key={`${link.label || "legal"}-${idx}`}
                  href={normalizeCmsHref(link.href || "#")}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-xs text-green-500">lock</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">
              Соединение защищено SSL-шифрованием
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
