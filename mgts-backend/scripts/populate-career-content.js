#!/usr/bin/env node
/**
 * Populate Career page sections in Strapi from static template content.
 */

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";

const careerContent = {
  sections: [
    {
      __component: "page.career-values",
      isVisible: true,
      eyebrow: "Наши фундаменты",
      title: "Ценности, которые нас объединяют",
      description: "Мы объединяем фундаментальный опыт связи и гибкость современных IT-процессов.",
      items: [
        {
          icon: "verified_user",
          title: "Надежность",
          description:
            "Фундамент нашего успеха и безусловная стабильность для каждого сотрудника в любые времена.",
        },
        {
          icon: "psychology",
          title: "Инновации",
          description:
            "Внедряем решения, которые меняют облик современного города и делают жизнь миллионов проще.",
        },
        {
          icon: "rocket_launch",
          title: "Масштаб",
          description: "Проекты национального уровня с влиянием на инфраструктуру целого мегаполиса.",
        },
      ],
    },
    {
      __component: "page.career-vacancies",
      isVisible: true,
      title: "Открытые вакансии",
      filters: [
        { label: "Все направления", key: "all", isActive: true },
        { label: "Инженеры", key: "engineers" },
        { label: "IT & Data Science", key: "it-data-science" },
        { label: "Менеджмент", key: "management" },
      ],
      vacancies: [
        {
          title: "Senior Network Engineer (Backbone)",
          tags: [
            { label: "Инженеры", key: "engineers" }
          ],
          meta: [
            { icon: "location_on", text: "Москва" },
            { icon: "schedule", text: "Полный день" },
          ],
          salaryText: "от 180 000 ₽",
          ctaLabel: "Откликнуться",
          ctaUrl: "#",
        },
        {
          title: "Ведущий инженер ВОЛС",
          tags: [
            { label: "Инженеры", key: "engineers" }
          ],
          meta: [
            { icon: "location_on", text: "Москва" },
            { icon: "work_history", text: "Опыт 3+ года" },
          ],
          salaryText: "от 120 000 ₽",
          ctaLabel: "Откликнуться",
          ctaUrl: "#",
        },
        {
          title: "Frontend Developer (React)",
          tags: [
            { label: "IT & Data Science", key: "it-data-science" }
          ],
          meta: [
            { icon: "location_on", text: "Удаленно" },
            { icon: "apartment", text: "IT департамент" },
          ],
          salaryText: "по итогам собеседования",
          ctaLabel: "Откликнуться",
          ctaUrl: "#",
        },
      ],
      initialVisible: 3,
      showMoreLabel: "Показать все",
      totalCount: 3,
      totalSuffix: "вакансии",
    },
    {
      __component: "page.career-why-company",
      isVisible: true,
      title: "Почему мы?",
      cards: [
        {
          title: "Для опытных профи",
          description:
            "Мы ценим наследие и фундаментальные знания. Стабильность крупнейшего оператора столицы.",
          icon: "architecture",
          accent: "primary",
          items: [
            { icon: "check_circle", text: "ДМС со стоматологией и страховкой для семьи" },
            { icon: "check_circle", text: "Корпоративная пенсионная программа" },
            { icon: "check_circle", text: "Участие в проектах «Умный город»" },
          ],
        },
        {
          title: "Для молодых талантов",
          description:
            "Быстрый старт карьеры в масштабных IT-проектах. Наставничество от лучших экспертов рынка.",
          icon: "bolt",
          accent: "brand-red",
          items: [
            { icon: "check_circle", text: "Программа стажировок и оплачиваемое обучение" },
            { icon: "check_circle", text: "Гибридный график работы и гибкое начало дня" },
            { icon: "check_circle", text: "Доступ к MTS University и курсам по Soft/Hard skills" },
          ],
        },
      ],
    },
    {
      __component: "page.career-cv-form",
      isVisible: true,
      title: "Не нашли подходящую вакансию?",
      description:
        "Оставьте свои контакты, и наш HR-специалист свяжется с вами, когда появится роль, соответствующая вашему опыту.",
      inputPlaceholder: "Ваш e-mail",
      inputType: "email",
      buttonLabel: "Отправить резюме",
      disclaimerHtml:
        "Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных",
    },
  ],
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  const slug = "career";
  const pageRes = await fetchJson(`${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`);
  const page = pageRes?.data;
  if (!page) throw new Error("Career page not found");
  const documentId = page.documentId || page.id;

  const payload = { data: { sections: careerContent.sections } };
  const updated = await fetchJson(`${STRAPI_BASE}/api/pages/${documentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log(`Updated career page sections. Sections count: ${updated?.data?.sections?.length || 0}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
