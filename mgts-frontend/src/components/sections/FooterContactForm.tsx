type FooterContactFormProps = {
  section?: any;
};

export default function FooterContactForm({ section }: FooterContactFormProps) {
  if (section?.isVisible === false) return null;
  const badge = section?.badgeText || section?.badge || "Готовы к масштабированию?";
  const title = section?.title || "Обсудим ваш проект";
  const accent = section?.accent || "прямо сейчас";
  const subtitle =
    section?.subtitle ||
    "Оставьте заявку, и наш персональный менеджер свяжется с вами для детальной консультации по инфраструктурным решениям МГТС.";
  const phoneLabel = section?.supportPhoneLabel || section?.phoneLabel || "Поддержка 24/7";
  const phoneValue = section?.supportPhoneValue || section?.phoneValue || "8 800 250 0890";
  const emailLabel = section?.supportEmailLabel || section?.emailLabel || "Email для бизнеса";
  const emailValue = section?.supportEmailValue || section?.emailValue || "b2b@mgts.ru";
  const buttonText = section?.buttonText || "Отправить заявку";
  const disclaimer =
    section?.disclaimerHtml ||
    section?.disclaimer ||
    "Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных";
  const formAction = section?.formAction || "#";
  const method = (section?.formMethod || "POST").toUpperCase();

  return (
    <section
      className="bg-premium-dark text-white selection:bg-primary/30"
      data-stitch-block="footer_and_contact_form"
    >
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-400 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span
                  className="text-xs font-bold uppercase tracking-wider text-primary"
                  data-cms-order-badge
                >
                  {badge}
                </span>
              </div>
              <h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
                data-cms-order-title
              >
                {title} <br />
                <span className="text-primary">{accent}</span>
              </h2>
              <p className="text-lg text-gray-400 max-w-md leading-relaxed" data-cms-order-subtitle>
                {subtitle}
              </p>
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-primary">support_agent</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500" data-cms-order-phone-label>
                      {phoneLabel}
                    </p>
                    <p className="font-medium" data-cms-order-phone-value>
                      {phoneValue}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-primary">mail</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500" data-cms-order-email-label>
                      {emailLabel}
                    </p>
                    <p className="font-medium" data-cms-order-email-value>
                      {emailValue}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-glass p-8 md:p-10 rounded-xl shadow-2xl">
              <form
                className="flex flex-col gap-6"
                data-cms-order-form
                action={formAction}
                method={method}
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">Имя</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder={section?.namePlaceholder || "Иван Иванов"}
                    maxLength={section?.nameMaxLength || 300}
                    required={section?.nameRequired}
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">Номер телефона</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder={section?.phonePlaceholder || "+7 (___) ___-__-__"}
                    maxLength={section?.phoneMaxLength || 18}
                    required={section?.phoneRequired}
                    type="tel"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">Название компании</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder={section?.companyPlaceholder || 'ООО "ТехноПрогресс"'}
                    maxLength={section?.companyMaxLength || 300}
                    required={section?.companyRequired}
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-4 pt-2">
                  <button
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group"
                    type="submit"
                  >
                    <span data-cms-order-button-text>{buttonText}</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </button>
                  <p
                    className="text-[10px] text-gray-500 text-center leading-relaxed uppercase tracking-widest"
                    data-cms-order-disclaimer
                    dangerouslySetInnerHTML={{ __html: disclaimer }}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
