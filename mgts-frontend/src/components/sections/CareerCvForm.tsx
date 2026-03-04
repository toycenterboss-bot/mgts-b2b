type CareerCvFormProps = {
  section: any;
};

export default function CareerCvForm({ section }: CareerCvFormProps) {
  if (section?.isVisible === false) return null;

  return (
    <section className="career-cv-form py-24 relative overflow-hidden" data-career-section="cv-form">
      <div className="absolute inset-0 bg-primary/10"></div>
      <div className="mx-auto max-w-[800px] px-6 relative z-10 text-center">
        {section.title && (
          <h2 className="career-cv-form__title text-4xl font-bold text-white mb-6" data-career-cv-title>
            {section.title}
          </h2>
        )}
        {section.description && (
          <p className="career-cv-form__description text-slate-400 mb-10 text-lg" data-career-cv-description>
            {section.description}
          </p>
        )}
        <form className="career-cv-form__form flex flex-col sm:flex-row gap-4 justify-center" action="#" method="post">
          <input
            className="career-cv-form__input bg-white/5 border border-white/20 rounded-lg px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[300px]"
            data-career-cv-input
            type={section.inputType || "email"}
            placeholder={section.inputPlaceholder || ""}
          />
          <button
            className="career-cv-form__submit bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-lg font-bold text-base transition-all"
            type="submit"
          >
            {section.buttonLabel || "Отправить"}
          </button>
        </form>
        {section.disclaimerHtml && (
          <div
            className="career-cv-form__disclaimer mt-4 text-xs text-slate-500"
            data-career-cv-disclaimer
            dangerouslySetInnerHTML={{ __html: section.disclaimerHtml }}
          />
        )}
      </div>
    </section>
  );
}
