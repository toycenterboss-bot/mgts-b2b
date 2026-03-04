import HomeHero from "@/components/hero/HomeHero";
import HomeCooperationCta from "@/components/sections/HomeCooperationCta";
import HomeIndustryScenarios from "@/components/sections/HomeIndustryScenarios";
import HomeNews from "@/components/sections/HomeNews";
import HomePrivateZone from "@/components/sections/HomePrivateZone";
import HomeServiceCards from "@/components/sections/HomeServiceCards";
import SectionRenderer from "@/components/sections/SectionRenderer";
import ServiceOrderForm from "@/components/sections/ServiceOrderForm";

type HomePageProps = {
  page: any;
  hero?: any;
  sections?: any[];
};

export default function HomePage({ page, hero, sections = [] }: HomePageProps) {
  const safeSections = Array.isArray(sections) ? sections.filter(Boolean) : [];
  const cooperation = safeSections.find((s) => s.__component === "page.home-cooperation-cta");
  const industry = safeSections.find((s) => s.__component === "page.home-industry-scenarios");
  const privateZone = safeSections.find((s) => s.__component === "page.home-private-zone");
  const orderForm = safeSections.find((s) => s.__component === "page.service-order-form");
  const serviceSections = safeSections.filter((s) => s.__component === "page.section-cards");
  const showNewsBlock = page?.showNewsBlock !== false;

  const extraSections = safeSections.filter(
    (s) =>
      ![
        "page.home-cooperation-cta",
        "page.home-industry-scenarios",
        "page.home-private-zone",
        "page.section-cards",
        "page.image-carousel",
        "page.image-switcher",
        "page.service-order-form",
      ].includes(s.__component)
  );

  return (
    <div data-page-template={page.template || "TPL_Home"}>
      <section className="selection:bg-primary selection:text-white" data-stitch-block="hero_section_and_cta_banner_1">
        <main className="relative">
          <HomeHero hero={hero} />
          {cooperation && <HomeCooperationCta section={cooperation} />}
        </main>
      </section>

      <section className="bg-background-dark text-white min-h-screen" data-stitch-block="service_and_scenario_cards_1">
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
                  <span className="text-accent text-xs font-bold uppercase tracking-[0.1em]">Инфраструктура будущего</span>
                </div>
                <h1 className="text-white text-6xl font-black leading-tight tracking-[-0.03em] max-w-3xl">
                  Технологии, которые <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    двигают ваш бизнес
                  </span>
                </h1>
                <p className="text-[#9aabbc] text-xl font-normal leading-relaxed max-w-2xl">
                  Интеллектуальная экосистема сервисов: от квантово-защищенных каналов связи до облачных вычислений
                  нового поколения.
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-6 items-center mb-20 relative z-10">
                <div className="w-full md:flex-1">
                  <div className="flex w-full items-stretch rounded-2xl h-16 border border-white/10 bg-white/5 backdrop-blur-md focus-within:border-primary/50 transition-all">
                    <div className="text-[#9aabbc] flex items-center justify-center pl-6">
                      <span className="material-symbols-outlined text-2xl">search</span>
                    </div>
                    <input
                      className="form-input flex w-full border-none bg-transparent text-white focus:outline-0 focus:ring-0 placeholder:text-[#9aabbc]/60 px-6 text-lg"
                      placeholder="Найти инновационное решение..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md overflow-x-auto w-full md:w-auto">
                  <button className="px-6 py-3 rounded-xl bg-primary shadow-lg shadow-primary/25 text-white text-sm font-bold whitespace-nowrap">
                    Все услуги
                  </button>
                  <button className="px-6 py-3 rounded-xl text-[#9aabbc] hover:text-white hover:bg-white/5 text-sm font-semibold transition-all whitespace-nowrap">
                    Инфраструктура
                  </button>
                  <button className="px-6 py-3 rounded-xl text-[#9aabbc] hover:text-white hover:bg-white/5 text-sm font-semibold transition-all whitespace-nowrap">
                    Безопасность
                  </button>
                  <button className="px-6 py-3 rounded-xl text-[#9aabbc] hover:text-white hover:bg-white/5 text-sm font-semibold transition-all whitespace-nowrap">
                    Облако
                  </button>
                </div>
              </div>
              {serviceSections.map((section: any, idx: number) => (
                <HomeServiceCards key={`${section.title || "services"}-${idx}`} section={section} />
              ))}

              <section className="mt-20" data-home-extra-sections>
                {extraSections.length > 0 && <SectionRenderer sections={extraSections} template={page.template} />}
              </section>

              {industry && <HomeIndustryScenarios section={industry} />}
              {privateZone && <HomePrivateZone section={privateZone} />}
              <section className="mt-32 relative group overflow-hidden rounded-[2.5rem] p-16">
                <div className="absolute inset-0 bg-primary/90"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,#00f2ff_0%,transparent_50%)] opacity-30"></div>
                <div className="absolute top-0 right-0 p-8 icon-3d opacity-20 group-hover:scale-110 transition-transform duration-700">
                  <svg className="size-64" fill="none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="80" stroke="white" strokeDasharray="10 20" strokeWidth="2"></circle>
                    <circle cx="100" cy="100" r="60" stroke="white" strokeDasharray="5 15" strokeWidth="1"></circle>
                    <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="0.5"></circle>
                  </svg>
                </div>
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                  <div className="max-w-2xl text-center lg:text-left">
                    <h2 className="text-white text-4xl font-black mb-4">Начните цифровую трансформацию сегодня</h2>
                    <p className="text-white/80 text-xl">
                      Наши эксперты помогут спроектировать инфраструктуру любой сложности.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <button className="px-10 py-5 bg-white text-primary font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-black/20">
                      ОСТАВИТЬ ЗАЯВКУ
                    </button>
                    <button className="px-10 py-5 border-2 border-white/30 text-white font-black rounded-2xl hover:bg-white/10 transition-all">
                      СВЯЗАТЬСЯ С НАМИ
                    </button>
                  </div>
                </div>
              </section>
            </section>
          </main>
        </div>
      </section>

      {orderForm && <ServiceOrderForm section={orderForm} />}
      {showNewsBlock && <HomeNews />}
    </div>
  );
}
