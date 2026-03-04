import SectionCards from "@/components/sections/SectionCards";
import SectionGrid from "@/components/sections/SectionGrid";
import HomeCooperationCta from "@/components/sections/HomeCooperationCta";
import HomeIndustryScenarios from "@/components/sections/HomeIndustryScenarios";
import HomePrivateZone from "@/components/sections/HomePrivateZone";
import ImageCarousel from "@/components/sections/ImageCarousel";
import ImageSwitcher from "@/components/sections/ImageSwitcher";
import ServiceOrderForm from "@/components/sections/ServiceOrderForm";
import ServiceFaq from "@/components/sections/ServiceFaq";
import DocumentTabs from "@/components/sections/DocumentTabs";
import FilesTable from "@/components/sections/FilesTable";
import SectionText from "@/components/sections/SectionText";
import SectionTable from "@/components/sections/SectionTable";
import ServiceConsultationCard from "@/components/sections/ServiceConsultationCard";
import ServiceCustomizationPanel from "@/components/sections/ServiceCustomizationPanel";
import ServiceStatsCard from "@/components/sections/ServiceStatsCard";
import FormSection from "@/components/sections/FormSection";
import HowToConnect from "@/components/sections/HowToConnect";
import TariffTable from "@/components/sections/TariffTable";
import ServiceTabs from "@/components/sections/ServiceTabs";
import CeoFeedback from "@/components/sections/CeoFeedback";
import HistoryTimeline from "@/components/sections/HistoryTimeline";
import CrmCards from "@/components/sections/CrmCards";
import CareerValues from "@/components/sections/CareerValues";
import CareerVacancies from "@/components/sections/CareerVacancies";
import CareerWhyCompany from "@/components/sections/CareerWhyCompany";
import CareerCvForm from "@/components/sections/CareerCvForm";
import SectionMap from "@/components/sections/SectionMap";
import SegmentScenarioCards from "@/components/sections/SegmentScenarioCards";
import TemplateBlock from "@/components/template/TemplateBlock";

type SectionRendererProps = {
  sections?: any[];
  template?: string;
  deepNavKey?: string | null;
  rootSlug?: string;
  currentSlug?: string;
  pageTitle?: string;
  pageSubtitle?: string;
};

export default function SectionRenderer({
  sections = [],
  template = "",
  deepNavKey,
  rootSlug,
  currentSlug,
  pageTitle,
  pageSubtitle,
}: SectionRendererProps) {
  if (!Array.isArray(sections) || sections.length === 0) return null;
  const safeSections = sections.filter(Boolean);
  const normalizedTemplate = String(template || "").trim();

  return (
    <>
      {safeSections.map((section: any, idx: number) => {
        if (!section || !section.__component) return null;
        const key = `${section.__component || "section"}-${idx}`;
        switch (section.__component) {
          case "template.block":
            return <TemplateBlock key={key} section={section} />;
          case "page.template-block":
            return <TemplateBlock key={key} section={section} />;
          case "page.section-cards":
            if (normalizedTemplate === "TPL_Service" || normalizedTemplate === "TPL_DeepNav") {
              return <SectionCards key={key} section={{ ...section, variant: "service-cards" }} />;
            }
            if (normalizedTemplate === "TPL_Segment_Landing" && section?.title === "Сценарии") {
              return <SegmentScenarioCards key={key} section={section} />;
            }
            return <SectionCards key={key} section={section} />;
          case "page.section-grid":
            return <SectionGrid key={key} section={section} />;
          case "page.section-text":
            return <SectionText key={key} section={section} />;
          case "page.section-table":
            return <SectionTable key={key} section={section} />;
          case "page.section-map":
            return <SectionMap key={key} section={section} />;
          case "page.home-cooperation-cta":
            return <HomeCooperationCta key={key} section={section} />;
          case "page.home-industry-scenarios":
            return <HomeIndustryScenarios key={key} section={section} />;
          case "page.home-private-zone":
            return <HomePrivateZone key={key} section={section} />;
          case "page.image-carousel":
            return <ImageCarousel key={key} section={section} />;
          case "page.image-switcher":
            return <ImageSwitcher key={key} section={section} />;
          case "page.tariff-table":
            return <TariffTable key={key} section={section} />;
          case "page.service-tabs":
            return <ServiceTabs key={key} section={section} />;
          case "page.service-order-form":
            return <ServiceOrderForm key={key} section={section} />;
          case "page.service-faq":
            return <ServiceFaq key={key} section={section} />;
          case "page.service-consultation-card":
            return <ServiceConsultationCard key={key} section={section} />;
          case "page.service-customization-panel":
            return <ServiceCustomizationPanel key={key} section={section} />;
          case "page.service-stats-card":
            return <ServiceStatsCard key={key} section={section} />;
          case "page.form-section":
            return (
              <FormSection
                key={key}
                section={section}
                deepNavKey={deepNavKey}
                rootSlug={rootSlug}
                currentSlug={currentSlug}
              />
            );
          case "page.how-to-connect":
            return <HowToConnect key={key} section={section} />;
          case "page.document-tabs":
            return (
              <DocumentTabs
                key={key}
                section={section}
                template={normalizedTemplate}
                pageTitle={pageTitle}
                pageSubtitle={pageSubtitle}
              />
            );
          case "page.files-table":
            return <FilesTable key={key} section={section} />;
          case "page.ceo-feedback":
            return <CeoFeedback key={key} section={section} />;
          case "page.history-timeline":
            return <HistoryTimeline key={key} section={section} />;
          case "page.crm-cards":
            return <CrmCards key={key} section={section} />;
          case "page.career-values":
            return <CareerValues key={key} section={section} />;
          case "page.career-vacancies":
            return <CareerVacancies key={key} section={section} />;
          case "page.career-why-company":
            return <CareerWhyCompany key={key} section={section} />;
          case "page.career-cv-form":
            return <CareerCvForm key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
