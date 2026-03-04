import { normalizeCmsHref } from "@/lib/routes";

type ServiceConsultationCardProps = {
  section: any;
};

export default function ServiceConsultationCard({ section }: ServiceConsultationCardProps) {
  if (section?.isVisible === false) return null;

  return (
    <section
      className="py-24 bg-background-light dark:bg-background-dark relative"
      data-stitch-block="service_consultation_card"
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <div className="relative rounded-[2rem] overflow-hidden p-8 md:p-16 border border-white/5 shadow-2xl">
          <div className="absolute inset-0 tech-gradient z-0"></div>
          <div
            className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #0066cc 0%, transparent 50%)" }}
          ></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl text-center lg:text-left">
              {section.title && (
                <h2
                  className="text-4xl md:text-5xl font-black text-white leading-tight mb-6 tracking-tight"
                  data-service-consult-title
                >
                  {section.title}
                </h2>
              )}
              {section.subtitle && (
                <p className="text-slate-400 text-lg md:text-xl leading-relaxed" data-service-consult-subtitle>
                  {section.subtitle}
                </p>
              )}
            </div>
            {section.buttonText && (
              <div className="flex flex-col gap-6 w-full max-w-sm">
                <a
                  className="w-full bg-primary hover:bg-primary/90 text-white py-5 px-8 rounded-xl text-xl font-bold transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-3"
                  href={normalizeCmsHref(section.buttonHref || "#")}
                  data-service-consult-button
                >
                  <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3 8.5 12 13.5 21 8.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{section.buttonText}</span>
                </a>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-4 text-white/5">
            <span className="material-symbols-outlined text-4xl">cloud_queue</span>
          </div>
        </div>
      </div>
    </section>
  );
}
