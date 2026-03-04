import Icon from "@/components/ui/Icon";
import { normalizeCmsHref } from "@/lib/routes";

type HomePrivateZoneProps = {
  section: any;
};

export default function HomePrivateZone({ section }: HomePrivateZoneProps) {
  if (section?.isVisible === false) return null;

  return (
    <section className="mt-16" data-home-private-zone>
      <div className="max-w-[1200px] mx-auto">
        <div
          className="p-10 glass-effect rounded-3xl border border-white/10 relative overflow-hidden"
          data-home-private-card
        >
          <div className="absolute -right-10 -top-10 size-32 bg-primary/30 blur-[80px]"></div>
          <div className="absolute -left-10 -bottom-10 size-32 bg-accent/30 blur-[80px]"></div>
          <div className="relative">
            <div
              className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 icon-3d"
              data-home-private-icon-wrap
            >
              {section.icon && (
                <span className="material-symbols-outlined text-primary text-3xl" data-home-private-icon>
                  {section.icon}
                </span>
              )}
              {!section.icon && <Icon name="lock_open" size={28} className="text-primary" />}
            </div>
            {section.title && (
              <h5 className="text-xl font-black mb-3" data-home-private-title>
                {section.title}
              </h5>
            )}
            {section.description && (
              <p className="text-sm text-slate-400 mb-8 leading-relaxed" data-home-private-desc>
                {section.description}
              </p>
            )}
            {section.buttonText && (
              <a
                className="w-full inline-flex justify-center py-4 bg-primary text-white hover:brightness-110 shadow-xl shadow-primary/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                href={normalizeCmsHref(section.buttonHref || "#")}
                data-home-private-button
              >
                {section.buttonText}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
