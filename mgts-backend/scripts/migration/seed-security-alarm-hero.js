/**
 * Seed CTA buttons and SLA items for security_alarm hero.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-security-alarm-hero.js
 */

module.exports = async function seedSecurityAlarmHero({ strapi }) {
  const slug = "security_alarm";
  const pages = await strapi.entityService.findMany("api::page.page", {
    filters: { slug },
    populate: ["hero"],
    limit: 5,
  });

  const page = Array.isArray(pages) ? pages[0] : pages;
  if (!page?.id || !page?.hero) {
    console.log("security_alarm page or hero not found.");
    return;
  }

  const hero = page.hero;
  const ctaButtons = [
    { text: "Заказать услугу", href: "/contact", style: "primary" },
    { text: "Получить расчет", href: "/contact", style: "outline" },
  ];
  const slaItems = [
    { value: "24/7", label: "Техподдержка" },
    { value: "10 мин", label: "Время реакции" },
    { value: "99.9%", label: "Гарантия аптайма" },
    { value: "SLA", label: "Контроль качества" },
  ];

  await strapi.entityService.update("api::page.page", page.id, {
    data: { hero: { ...hero, ctaButtons, slaItems } },
  });

  console.log("security_alarm hero CTA + SLA updated.");
};
