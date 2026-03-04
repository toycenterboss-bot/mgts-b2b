import { normalizeCmsHref } from "@/lib/routes";

type SegmentLandingCtaProps = {
  section: any;
};

export default function SegmentLandingCta({ section }: SegmentLandingCtaProps) {
  if (section?.isVisible === false) return null;

  return (
    <section
      className="bg-primary rounded-2xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
      data-stitch-block="service_cta_banner"
    >
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
        <svg fill="white" height="400" viewBox="0 0 100 100" width="400">
          <circle cx="100" cy="0" r="80"></circle>
        </svg>
      </div>
      <div className="z-10 text-center md:text-left">
        {section.title && (
          <h2 className="text-white text-3xl font-bold mb-2" data-service-cta-title>
            {section.title}
          </h2>
        )}
        {section.subtitle && (
          <p className="text-white/80 text-lg" data-service-cta-subtitle>
            {section.subtitle}
          </p>
        )}
      </div>
      <div className="z-10 flex flex-col sm:flex-row gap-4">
        {section.buttonText && (
          <a
            className="px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-white/90 transition-all"
            href={normalizeCmsHref(section.buttonHref || "#")}
            data-service-cta-button
          >
            <span data-service-cta-button-text>{section.buttonText}</span>
          </a>
        )}
        {section.secondaryButtonText && (
          <a
            className="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
            href={normalizeCmsHref(section.secondaryButtonHref || "#")}
            data-service-cta-secondary
          >
            {section.secondaryButtonText}
          </a>
        )}
      </div>
    </section>
  );
}
