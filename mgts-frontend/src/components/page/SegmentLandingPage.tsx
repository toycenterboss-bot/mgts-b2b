import SegmentLandingHero from "@/components/hero/SegmentLandingHero";
import SegmentLandingCta from "@/components/sections/SegmentLandingCta";
import SegmentScenarioCards from "@/components/sections/SegmentScenarioCards";
import SegmentServicesGrid from "@/components/sections/SegmentServicesGrid";
import SectionRenderer from "@/components/sections/SectionRenderer";

type SegmentLandingPageProps = {
  page: any;
  hero?: any;
  sections?: any[];
  breadcrumbs?: React.ReactNode;
};

export default function SegmentLandingPage({
  page,
  hero,
  sections = [],
  breadcrumbs,
}: SegmentLandingPageProps) {
  const safeSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
  const cardSections = safeSections.filter((s) => s.__component === "page.section-cards");
  const scenarioSection = cardSections.find((s) => String(s?.title || "").trim() === "Сценарии");
  const showFilters = Boolean(scenarioSection);
  const serviceSections = cardSections.filter((s) => s !== scenarioSection);
  const primaryServices = serviceSections[0];
  const secondaryServices = serviceSections.slice(1);
  const consultation = safeSections.find((s) => s.__component === "page.service-consultation-card");

  const extraSections = safeSections.filter(
    (s) =>
      ![
        "page.section-cards",
        "page.service-consultation-card",
        "page.home-cooperation-cta",
        "page.home-industry-scenarios",
        "page.home-private-zone",
      ].includes(s.__component)
  );

  return (
    <div data-page-template={page.template || "TPL_Segment_Landing"}>
      {breadcrumbs}
      <section
        className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-300"
        data-stitch-block="developers_industry_hero"
      >
        <SegmentLandingHero hero={hero} />
      </section>
      <section
        className="bg-background-light dark:bg-background-dark min-h-screen text-white"
        data-stitch-block="service_and_scenario_cards_2"
      >
        <div className="layout-container flex h-full grow flex-col">
          <main className="max-w-[1200px] mx-auto w-full px-4 py-12">
            <div className="flex flex-col md:flex-row gap-6 items-center mb-10">
              <div className="w-full md:flex-1">
                <label className="flex flex-col w-full h-14">
                  <div className="flex w-full flex-1 items-stretch rounded-xl h-full overflow-hidden border border-white/10 bg-[#1a232e]">
                    <div className="text-[#9aabbc] flex items-center justify-center pl-4 bg-transparent">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input
                      className="form-input flex w-full flex-1 border-none bg-transparent text-white focus:outline-0 focus:ring-0 placeholder:text-[#9aabbc] px-4 text-base font-normal"
                      placeholder="Поиск B2B решений..."
                    />
                  </div>
                </label>
              </div>
              {showFilters && (
                <div className="flex gap-2 p-1 bg-[#1a232e] rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto">
                  {["Все услуги", "Инфраструктура", "Безопасность", "Облако"].map((filter) => (
                    <button
                      key={filter}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                        filter === "Все услуги" ? "bg-primary text-white" : "text-[#9aabbc] hover:text-white"
                      }`}
                      type="button"
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {primaryServices && <SegmentServicesGrid section={primaryServices} />}

            {scenarioSection && (
              <SegmentScenarioCards section={scenarioSection} showFilters={false} showAction={false} />
            )}

            {secondaryServices.map((section, idx) => (
              <SegmentServicesGrid key={`${section.title || "services"}-${idx}`} section={section} />
            ))}

            {extraSections.length > 0 && (
              <div className="space-y-10 mb-16" data-seg-extra-sections>
                <SectionRenderer sections={extraSections} template={page.template} />
              </div>
            )}

            {consultation && <SegmentLandingCta section={consultation} />}
          </main>
        </div>
      </section>
    </div>
  );
}
