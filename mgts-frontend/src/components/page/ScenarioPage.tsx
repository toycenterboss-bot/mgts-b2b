import type { ReactNode } from "react";
import ScenarioHero from "@/components/hero/ScenarioHero";
import HomeServiceCards from "@/components/sections/HomeServiceCards";
import ScenarioFaq from "@/components/sections/ScenarioFaq";
import SectionRenderer from "@/components/sections/SectionRenderer";
import FooterContactForm from "@/components/sections/FooterContactForm";

type ScenarioPageProps = {
  page: any;
  hero?: any;
  sections?: any[];
  breadcrumbs?: ReactNode;
};

export default function ScenarioPage({ page, hero, sections = [], breadcrumbs }: ScenarioPageProps) {
  const safeSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
  const orderForm = safeSections.find((s) => s.__component === "page.service-order-form" && s?.isVisible !== false);
  const faqSection = safeSections.find((s) => s.__component === "page.service-faq");
  const contentSections = safeSections.filter(
    (s) => s.__component !== "page.service-order-form" && s.__component !== "page.service-faq"
  );
  const featureCards =
    contentSections.find((s) => s.__component === "page.section-cards")?.cards || [];

  const renderSection = (section: any, idx: number) => {
    if (section.__component === "page.section-cards") {
      return <HomeServiceCards key={`${section.title || "cards"}-${idx}`} section={section} />;
    }
    return (
      <SectionRenderer
        key={`${section.__component || "section"}-${idx}`}
        sections={[section]}
        template={page.template}
        deepNavKey={page?.deepNavKey}
        rootSlug={page?.section}
        currentSlug={page?.slug}
      />
    );
  };

  const heroSubtitle = hero?.subtitle || page?.subtitle;
  const headline = page?.title || hero?.title;
  const intro =
    String(heroSubtitle || "").trim() ||
    "Интеллектуальная экосистема сервисов: от защищенных каналов связи до облачных вычислений нового поколения.";

  return (
    <div data-page-template={page.template || "TPL_Scenario"}>
      {breadcrumbs}
      <section
        className="bg-background-light dark:bg-background-dark text-fg dark:text-fg antialiased font-display"
        data-stitch-block="connectivity_hero_variant"
      >
        <main className="relative pt-12 overflow-hidden min-h-[60vh] flex items-center">
          <ScenarioHero hero={hero} title={headline} subtitle={heroSubtitle} featureCards={featureCards} />
        </main>
      </section>

      <section className="bg-background-dark text-fg min-h-screen" data-stitch-block="service_and_scenario_cards_1">
        <div className="layout-container flex h-full grow flex-col">
          <main className="w-full">
            <section className="max-w-[1200px] mx-auto px-4 py-20">
              <div className="flex flex-col gap-6 mb-16 relative">
                <div className="absolute -top-20 -left-20 size-64 bg-primary/20 blur-[100px] rounded-full"></div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 w-fit backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                  <span className="text-accent-text text-xs font-bold uppercase tracking-[0.1em]">Решения MGTS</span>
                </div>
                {headline && (
                  <h1 className="text-fg text-6xl font-black leading-tight tracking-[-0.03em] max-w-3xl">
                    {headline}
                  </h1>
                )}
                <p className="text-fg-muted text-xl font-normal leading-relaxed max-w-2xl">{intro}</p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center mb-20 relative z-10">
                <div className="w-full md:flex-1">
                  <div className="flex w-full items-stretch rounded-2xl h-16 border border-fg/10 bg-fg/5 backdrop-blur-md focus-within:border-primary/50 transition-all">
                    <div className="text-fg-muted flex items-center justify-center pl-6">
                      <span className="material-symbols-outlined text-2xl">search</span>
                    </div>
                    <input
                      className="form-input flex w-full border-none bg-transparent text-fg focus:outline-0 focus:ring-0 placeholder:text-fg-muted/60 px-6 text-lg"
                      placeholder="Найти инновационное решение..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 p-1.5 bg-fg/5 rounded-2xl border border-fg/10 backdrop-blur-md overflow-x-auto w-full md:w-auto">
                  <button className="px-6 py-3 rounded-xl bg-primary shadow-lg shadow-primary/25 text-on-primary text-sm font-bold whitespace-nowrap">
                    Все услуги
                  </button>
                  <button className="px-6 py-3 rounded-xl text-fg-muted hover:text-fg hover:bg-fg/5 text-sm font-semibold transition-all whitespace-nowrap">
                    Инфраструктура
                  </button>
                  <button className="px-6 py-3 rounded-xl text-fg-muted hover:text-fg hover:bg-fg/5 text-sm font-semibold transition-all whitespace-nowrap">
                    Безопасность
                  </button>
                  <button className="px-6 py-3 rounded-xl text-fg-muted hover:text-fg hover:bg-fg/5 text-sm font-semibold transition-all whitespace-nowrap">
                    Облако
                  </button>
                </div>
              </div>

              {contentSections.map(renderSection)}
            </section>
          </main>
        </div>
      </section>

      {faqSection && <ScenarioFaq section={faqSection} />}
      {orderForm && <FooterContactForm section={orderForm} />}
    </div>
  );
}
