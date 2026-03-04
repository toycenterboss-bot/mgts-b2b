import Image from "next/image";
import Hero from "@/components/hero/Hero";
import CareerHero from "@/components/hero/CareerHero";
import ServiceHero from "@/components/hero/ServiceHero";
import HomePage from "@/components/page/HomePage";
import SegmentLandingPage from "@/components/page/SegmentLandingPage";
import SectionRenderer from "@/components/sections/SectionRenderer";
import FormSection from "@/components/sections/FormSection";
import FooterContactForm from "@/components/sections/FooterContactForm";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import LeftMenu from "@/components/navigation/LeftMenu";
import { applyPageFallbacks } from "@/lib/fallbacks";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";
import PartnersFeedbackSurvey from "@/components/forms/PartnersFeedbackSurvey";

type PageRendererProps = {
  page: any;
};

const buildBreadcrumbs = (page: any) => {
  const items: { label: string; href?: string }[] = [{ label: "Главная", href: "/" }];
  const chain: any[] = [];
  let current = page?.parent || null;
  while (current) {
    chain.push(current);
    current = current.parent || null;
  }
  chain.reverse().forEach((p) => {
    if (p?.title && p?.slug) {
      items.push({ label: p.title, href: p.slug });
    }
  });
  if (page?.title) items.push({ label: page.title });
  return items;
};

const stripHtml = (value: string) =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCeoMessage = (html: string) => {
  const raw = String(html || "");
  const blocks = raw.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const paragraphs = blocks.map(stripHtml).filter(Boolean);
  const quote = paragraphs[0] || "";
  const author = paragraphs[1] || "";
  const tail = stripHtml(raw.replace(blocks.join(""), ""));
  return { quote, author, role: tail };
};

export default function PageRenderer({ page }: PageRendererProps) {
  if (!page) return null;
  const { hero, sections } = applyPageFallbacks(page);
  const serviceOrderSection = Array.isArray(sections)
    ? sections.find((section: any) => section?.__component === "page.service-order-form" && section?.isVisible !== false)
    : null;
  const contentSections = Array.isArray(sections)
    ? sections.filter((section: any) => section?.__component !== "page.service-order-form")
    : [];
  const showBreadcrumbs = page.showBreadcrumbs !== false;
  const breadcrumbs = showBreadcrumbs ? buildBreadcrumbs(page) : [];

  const template = String(page.template || "").trim();
  const deepNavKey = String(page?.deepNavKey || "").trim();
  const leftMenuRoot = String(page?.section || "").trim();
  const hasLeftMenu = template === "TPL_DeepNav" || template === "TPL_CMS_Page";
  const isCmsTemplate = hasLeftMenu;

  const heroTemplates = new Set(["TPL_Home", "TPL_CMS_Page"]);
  const shouldRenderHero = Boolean(hero && heroTemplates.has(template));
  const isDocTemplate = template === "TPL_Doc_Page";
  const isFormTemplate = template === "TPL_Form_Page";
  const isHomeTemplate = template === "TPL_Home";
  const isSearchTemplate = template === "TPL_Search_Results";
  const isAiChatTemplate = template === "TPL_AI_Chat";
  const isServiceTemplate = template === "TPL_Service";
  const isScenarioTemplate = template === "TPL_Scenario";
  const isContactTemplate = template === "TPL_Contact_Hub";
  const isSegmentLanding = template === "TPL_Segment_Landing";
  const hasDocSidebar = Boolean(deepNavKey);
  const isCeoMessagePage = isCmsTemplate && String(page.slug || "").trim() === "general_director_message";
  const isPartnersFeedbackPage =
    isCmsTemplate && String(page.slug || "").trim() === "partners_feedback_form";
  const cmsTextClass =
    "cms-text-content prose prose-lg max-w-none text-slate-800 dark:text-white prose-p:leading-relaxed prose-a:text-primary";
  const useWideBreadcrumbs =
    isDocTemplate ||
    isFormTemplate ||
    isSearchTemplate ||
    isAiChatTemplate ||
    isCmsTemplate ||
    isScenarioTemplate ||
    isContactTemplate ||
    isServiceTemplate ||
    isSegmentLanding;
  const breadcrumbsNode = <Breadcrumbs items={breadcrumbs} className={useWideBreadcrumbs ? "mb-0" : "mb-4"} />;
  const breadcrumbsMarkup = showBreadcrumbs ? (
    useWideBreadcrumbs ? (
      <section className="bg-background-light dark:bg-background-dark" data-stitch-block="breadcrumbs">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-10 py-4">{breadcrumbsNode}</div>
      </section>
    ) : (
      breadcrumbsNode
    )
  ) : null;

  if (isHomeTemplate) {
    return (
      <>
        <HomePage page={page} hero={hero} sections={contentSections} />
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </>
    );
  }

  if (isSegmentLanding) {
    return (
      <>
        <SegmentLandingPage
          page={page}
          hero={hero}
          sections={contentSections}
          breadcrumbs={breadcrumbsMarkup}
        />
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </>
    );
  }

  if (isFormTemplate) {
    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        <SectionRenderer
          sections={contentSections}
          template={template}
          deepNavKey={deepNavKey}
          rootSlug={leftMenuRoot}
          currentSlug={page.slug}
        />
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </div>
    );
  }

  if (isDocTemplate) {
    const docTailComponents = new Set([
      "page.service-consultation-card",
      "page.service-order-form",
    ]);
    const docMainSections = Array.isArray(contentSections)
      ? contentSections.filter((section: any) => !docTailComponents.has(section?.__component))
      : [];
    const docTailSections = Array.isArray(contentSections)
      ? contentSections.filter((section: any) => docTailComponents.has(section?.__component))
      : [];

    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        <section
          className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen"
          data-stitch-block="news_and_documents_list_1"
        >
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className={`grid grid-cols-1${hasDocSidebar ? " lg:grid-cols-12" : ""} gap-8`}>
              {hasDocSidebar && (
                <LeftMenu
                  rootSlug={leftMenuRoot}
                  currentSlug={page.slug}
                  deepNavKey={deepNavKey}
                  variant="doc"
                  asideClassName="lg:col-span-3 pr-6 border-r border-slate-200 dark:border-slate-800"
                />
              )}
              <div
                className={hasDocSidebar ? "lg:col-span-9 lg:pl-6 space-y-8" : "space-y-8"}
                data-doc-content
              >
                {page.content && <div className={cmsTextClass} dangerouslySetInnerHTML={{ __html: page.content }} />}
                <div data-doc-host>
                  <SectionRenderer
                    sections={docMainSections}
                    template={template}
                    deepNavKey={deepNavKey}
                    rootSlug={leftMenuRoot}
                    currentSlug={page.slug}
                    pageTitle={page.title}
                    pageSubtitle={page.subtitle}
                  />
                </div>
              </div>
            </div>
          </main>
        </section>
        {docTailSections.length > 0 && (
          <SectionRenderer
            sections={docTailSections}
            template={template}
            deepNavKey={deepNavKey}
            rootSlug={leftMenuRoot}
            currentSlug={page.slug}
            pageTitle={page.title}
            pageSubtitle={page.subtitle}
          />
        )}
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </div>
    );
  }

  if (isCmsTemplate) {
    const isCareerPage = String(page.slug || "").trim() === "career";
    if (isPartnersFeedbackPage) {
      const formSection = contentSections.find(
        (section: any) => section?.__component === "page.form-section"
      );
      const elements = Array.isArray(formSection?.elements) ? formSection.elements : [];
      const questions = elements.filter((el: any) => el && (el.text || el.label));
      const subtitle = formSection?.subtitle || page.subtitle || "";

      return (
        <div data-page-template={page.template || "default"}>
          {breadcrumbsMarkup}
          <section
            className="bg-background-light dark:bg-background-dark font-display text-white min-h-screen relative overflow-x-hidden"
            data-stitch-block="b2b_survey_and_feedback_form"
          >
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] light-leak-1 -z-10" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] light-leak-2 -z-10" />
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root">
              <div className="layout-container flex h-full grow flex-col">
                <main className="max-w-7xl mx-auto px-6 py-8">
                  <div className="w-full">
                    <div className="mb-10">
                      <div className="flex min-w-72 flex-col gap-3">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                          {page.title || formSection?.title || "Опрос"}
                        </h1>
                        {subtitle && (
                          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl font-light">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`grid grid-cols-1${hasLeftMenu ? " lg:grid-cols-12" : ""} gap-8`}>
                      {hasLeftMenu && (
                        <LeftMenu
                          rootSlug={leftMenuRoot}
                          currentSlug={page.slug}
                          deepNavKey={deepNavKey}
                          variant="form"
                          asideClassName="lg:col-span-3 pr-6 border-r border-white/10"
                        />
                      )}
                      <div className={hasLeftMenu ? "lg:col-span-9 lg:pl-6" : ""} data-form-content>
                        <PartnersFeedbackSurvey
                          questions={questions}
                          submitText={formSection?.submitText}
                          disclaimerHtml={formSection?.disclaimerHtml}
                        />
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </section>
        </div>
      );
    }
    if (isCeoMessagePage) {
      const textSections = contentSections.filter(
        (section: any) => section?.__component === "page.section-text"
      );
      const mainText = textSections[0] || null;
      const noteText = textSections[1] || null;
      const ceoForm = contentSections.find(
        (section: any) => section?.__component === "page.ceo-feedback"
      );
      const message = extractCeoMessage(mainText?.content || "");
      const portraitUrl = resolveMediaUrl(ceoForm?.portraitImage || null);
      const videoUrl = resolveMediaUrl(ceoForm?.video || null);
      const noteHtml = String(noteText?.content || "").trim();

      return (
        <div data-page-template={page.template || "default"}>
          {breadcrumbsMarkup}
          <section
            className="bg-background-dark text-slate-100 min-h-screen relative overflow-x-hidden"
            data-stitch-block="ceo_address_and_feedback_page"
          >
            <div className="light-leak light-leak-1 top-[-100px] left-[-100px]" />
            <div className="light-leak light-leak-2 bottom-[-100px] right-[-100px]" />
            <main className="max-w-[1400px] mx-auto px-8 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {hasLeftMenu && (
                  <LeftMenu
                    rootSlug={leftMenuRoot}
                    currentSlug={page.slug}
                    deepNavKey={deepNavKey}
                    variant="cms"
                    asideClassName="lg:col-span-3"
                  />
                )}
                <div className={hasLeftMenu ? "lg:col-span-9 space-y-16" : "space-y-16"}>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-5 lg:sticky top-28">
                      <div className="relative group">
                        <div className="relative z-10 glass-effect p-2 rounded-xl overflow-hidden aspect-[3/4]">
                          <div className="w-full h-full rounded-lg overflow-hidden relative">
                            {portraitUrl ? (
                              <Image
                                src={portraitUrl}
                                alt={resolveMediaAlt(ceoForm?.portraitImage || null, ceoForm?.title)}
                                fill
                                sizes="(min-width: 1024px) 40vw, 100vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800/40" />
                            )}
                            {videoUrl && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                                <a
                                  href={videoUrl}
                                  className="flex items-center justify-center rounded-full size-20 bg-primary text-white shadow-2xl shadow-primary/50 transform group-hover:scale-110 transition-all"
                                >
                                  <span className="material-symbols-outlined !text-4xl fill-[1]">
                                    play_arrow
                                  </span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="absolute -inset-4 bg-primary/10 blur-3xl -z-10 rounded-full" />
                      </div>
                    </div>
                    <div className="lg:col-span-7 flex flex-col gap-8">
                      <div>
                        <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight mb-4">
                          {page.title || "Обращение генерального директора"}
                        </h1>
                        <div className="h-1 w-20 bg-primary rounded-full" />
                      </div>
                      <div className="space-y-6 text-lg text-[#9dabb9] leading-relaxed font-light">
                        {message.quote ? (
                          <blockquote className="relative py-8 px-10 border-l-4 border-primary bg-primary/5 rounded-r-xl my-10">
                            <span className="material-symbols-outlined absolute top-4 left-4 text-primary/20 text-6xl">
                              format_quote
                            </span>
                            <p className="text-2xl lg:text-3xl font-bold text-white italic leading-snug relative z-10">
                              {message.quote}
                            </p>
                          </blockquote>
                        ) : (
                          mainText?.content && (
                            <div
                              className="cms-text-content prose prose-lg max-w-none text-white/80 prose-p:leading-relaxed prose-a:text-primary"
                              dangerouslySetInnerHTML={{ __html: mainText.content }}
                            />
                          )
                        )}
                      </div>
                      {(message.author || message.role) && (
                        <div className="flex items-center gap-8 mt-6 pt-8 border-t border-white/10">
                          <div className="flex flex-col">
                            {message.author && (
                              <p className="text-white font-bold text-xl">{message.author}</p>
                            )}
                            {message.role && (
                              <p className="text-[#9dabb9] text-sm">{message.role}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {noteHtml && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                          <div dangerouslySetInnerHTML={{ __html: noteHtml }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {ceoForm && (
                    <section className="mt-12">
                      <div className="relative glass-effect p-8 lg:p-12 rounded-xl overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 blur-[80px] rounded-full" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                          <div>
                            {ceoForm.title && (
                              <h2 className="text-3xl font-bold mb-4">{ceoForm.title}</h2>
                            )}
                            {ceoForm.description && (
                              <p className="text-[#9dabb9] text-lg mb-8">{ceoForm.description}</p>
                            )}
                            {ceoForm.note && (
                              <div className="flex items-center gap-4 text-primary font-medium">
                                {ceoForm.noteIcon && <Icon name={ceoForm.noteIcon} size={20} />}
                                <span>{ceoForm.note}</span>
                              </div>
                            )}
                          </div>
                          <form className="space-y-4" action="#" method="post">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-2">
                                <label className="text-sm text-[#9dabb9] font-medium ml-1">
                                  {ceoForm.nameLabel || "Имя и фамилия"}
                                </label>
                                <input
                                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white transition-all"
                                  placeholder={ceoForm.namePlaceholder || ""}
                                  type="text"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-sm text-[#9dabb9] font-medium ml-1">
                                  {ceoForm.companyLabel || "Компания"}
                                </label>
                                <input
                                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white transition-all"
                                  placeholder={ceoForm.companyPlaceholder || ""}
                                  type="text"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-sm text-[#9dabb9] font-medium ml-1">
                                {ceoForm.emailLabel || "Ваш E-mail"}
                              </label>
                              <input
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white transition-all"
                                placeholder={ceoForm.emailPlaceholder || ""}
                                type="email"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-sm text-[#9dabb9] font-medium ml-1">
                                {ceoForm.messageLabel || "Сообщение"}
                              </label>
                              <textarea
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white transition-all"
                                placeholder={ceoForm.messagePlaceholder || ""}
                                rows={4}
                              />
                            </div>
                            <button
                              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4"
                              type="submit"
                            >
                              <span>{ceoForm.submitLabel || "Отправить обращение"}</span>
                              <span className="material-symbols-outlined">send</span>
                            </button>
                            {ceoForm.disclaimer && (
                              <p className="text-xs text-[#9dabb9] text-center mt-4">
                                {ceoForm.disclaimer}
                              </p>
                            )}
                          </form>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </main>
          </section>
          {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
        </div>
      );
    }
    if (isPartnersFeedbackPage) {
      const formSection = contentSections.find(
        (section: any) => section?.__component === "page.form-section"
      );
      const patchedForm =
        formSection && !formSection.title
          ? { ...formSection, title: page.title || formSection.title }
          : formSection;
      return (
        <div data-page-template={page.template || "default"}>
          {breadcrumbsMarkup}
          {patchedForm && (
            <FormSection
              section={patchedForm}
              deepNavKey={deepNavKey}
              rootSlug={leftMenuRoot}
              currentSlug={page.slug}
            />
          )}
          {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
        </div>
      );
    }
    if (isCareerPage) {
      return (
        <>
          <div data-page-template={page.template || "default"}>
            {breadcrumbsMarkup}
            <CareerHero hero={hero} />
            <SectionRenderer
              sections={contentSections}
              template={template}
              deepNavKey={deepNavKey}
              rootSlug={leftMenuRoot}
              currentSlug={page.slug}
            />
          </div>
          {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
        </>
      );
    }
    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        {shouldRenderHero && <Hero hero={hero} />}
        <div className="light-leak light-leak-1 top-[-100px] left-[-100px]" />
        <div className="light-leak light-leak-2 bottom-[-100px] right-[-100px]" />
        <section
          className="bg-background-dark text-slate-100 min-h-screen relative overflow-x-hidden"
          data-stitch-block="cms_page_renderer"
        >
          <div className="fixed top-0 right-0 w-[500px] h-[500px] glow-leak pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2" />
          <div className="fixed bottom-0 left-0 w-[800px] h-[800px] glow-leak pointer-events-none -z-10 -translate-x-1/4 translate-y-1/4" />
          <main className="max-w-[1400px] mx-auto px-8 py-12" data-cms-page>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {hasLeftMenu && (
                <LeftMenu
                  rootSlug={leftMenuRoot}
                  currentSlug={page.slug}
                  deepNavKey={deepNavKey}
                  variant="cms"
                  asideClassName="lg:col-span-3"
                />
              )}
              <div className="lg:col-span-9" data-cms-content>
                {(page.title || page.subtitle) && (
                  <div className="flex flex-wrap justify-between items-end gap-3 p-4 mb-6">
                    <div className="flex min-w-72 flex-col gap-3">
                      {page.title && (
                        <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                          {page.title}
                        </h1>
                      )}
                      {page.subtitle && (
                        <p className="text-white/60 text-base font-normal leading-normal max-w-xl">{page.subtitle}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-10" data-cms-sections>
                  {page.content && <div className={cmsTextClass} dangerouslySetInnerHTML={{ __html: page.content }} />}
                  <SectionRenderer
                    sections={contentSections}
                    template={template}
                    deepNavKey={deepNavKey}
                    rootSlug={leftMenuRoot}
                    currentSlug={page.slug}
                  />
                </div>
              </div>
            </div>
          </main>
        </section>
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </div>
    );
  }

  if (isServiceTemplate) {
    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        <div className="light-leak top-[-100px] left-[-100px]" />
        <div className="light-leak bottom-[-100px] right-[-100px]" />
        {hero && <ServiceHero hero={hero} />}
        <section className="bg-background-light dark:bg-background-dark">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10 space-y-10" data-service-sections>
            <SectionRenderer
              sections={contentSections}
              template={template}
              deepNavKey={deepNavKey}
              rootSlug={leftMenuRoot}
              currentSlug={page.slug}
            />
          </div>
        </section>
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </div>
    );
  }

  if (isScenarioTemplate) {
    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        <SectionRenderer
          sections={contentSections}
          template={template}
          deepNavKey={deepNavKey}
          rootSlug={leftMenuRoot}
          currentSlug={page.slug}
        />
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </div>
    );
  }

  if (isContactTemplate) {
    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        <SectionRenderer
          sections={contentSections}
          template={template}
          deepNavKey={deepNavKey}
          rootSlug={leftMenuRoot}
          currentSlug={page.slug}
        />
        {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
      </div>
    );
  }

  if (isSearchTemplate || isAiChatTemplate) {
    const hasTemplateBlocks = Array.isArray(sections)
      ? sections.some((section: any) => section?.__component === "page.template-block")
      : false;
    if (hasTemplateBlocks) {
      return (
        <div data-page-template={page.template || "default"}>
          {breadcrumbsMarkup}
          <SectionRenderer
        sections={contentSections}
            template={template}
            deepNavKey={deepNavKey}
            rootSlug={leftMenuRoot}
            currentSlug={page.slug}
          />
      {serviceOrderSection && <FooterContactForm section={serviceOrderSection} />}
        </div>
      );
    }
    const sectionClass = isSearchTemplate
      ? "bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen"
      : "bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-[85vh] overflow-x-hidden";
    const blockName = isSearchTemplate ? "search_results_layout" : "ai_assistant_landing_page";
    const containerClass = isSearchTemplate
      ? "max-w-[1440px] mx-auto px-6 md:px-20 py-8"
      : "max-w-[1200px] mx-auto px-4 pt-20 pb-16";
    return (
      <div data-page-template={page.template || "default"}>
        {breadcrumbsMarkup}
        {isAiChatTemplate && (
          <>
            <div className="fixed inset-0 tech-pattern pointer-events-none" />
            <div className="fixed inset-0 hero-gradient pointer-events-none" />
          </>
        )}
        <section className={sectionClass} data-stitch-block={blockName}>
          <main className={containerClass}>
          {page.content && <div className={cmsTextClass} dangerouslySetInnerHTML={{ __html: page.content }} />}
            <SectionRenderer
              sections={sections}
              template={template}
              deepNavKey={deepNavKey}
              rootSlug={leftMenuRoot}
              currentSlug={page.slug}
            />
          </main>
        </section>
      </div>
    );
  }

  return (
    <div className="page" data-page-template={page.template || "default"}>
      {breadcrumbsMarkup}
      {shouldRenderHero && <Hero hero={hero} />}
      <div className={`page__body${hasLeftMenu ? " page__body--with-sidebar" : ""}`}>
        {hasLeftMenu && (
          <LeftMenu rootSlug={leftMenuRoot} currentSlug={page.slug} deepNavKey={deepNavKey} />
        )}
        <div className="page__content" data-stitch-block={isCmsTemplate ? "cms_page_renderer" : undefined}>
          {page.content && (
            <div className="page__content-html" dangerouslySetInnerHTML={{ __html: page.content }} />
          )}
          <SectionRenderer
            sections={sections}
            template={template}
            deepNavKey={deepNavKey}
            rootSlug={leftMenuRoot}
            currentSlug={page.slug}
          />
        </div>
      </div>
    </div>
  );
}
