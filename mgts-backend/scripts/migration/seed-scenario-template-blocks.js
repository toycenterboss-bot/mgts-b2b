/**
 * Seed scenario pages with template-block sections (TPL_Scenario).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-scenario-template-blocks.js
 */

module.exports = async function seedScenarioTemplateBlocks({ strapi }) {
  const forceSlug = String(process.env.MGTS_SCENARIO_FORCE_SLUG || "").trim();
  const pages = await strapi.entityService.findMany("api::page.page", {
    filters: { template: "TPL_Scenario" },
    populate: ["sections"],
    limit: 1000,
  });

  if (!Array.isArray(pages) || pages.length === 0) {
    console.log("No TPL_Scenario pages found.");
    return;
  }

  const blocks = [
    {
      __component: "page.template-block",
      template: "TPL_Scenario",
      block: "connectivity_hero_variant",
    },
    {
      __component: "page.template-block",
      template: "TPL_Scenario",
      block: "service_and_scenario_cards_1",
    },
    {
      __component: "page.template-block",
      template: "TPL_Scenario",
      block: "scenario_faq_block",
    },
  ];

  let updated = 0;
  for (const page of pages) {
    if (!page?.id) continue;
    const existing = Array.isArray(page.sections) ? page.sections : [];
    if (existing.length > 0 && page.slug !== forceSlug) continue;
    await strapi.entityService.update("api::page.page", page.id, {
      data: { sections: blocks },
    });
    updated += 1;
  }

  if (updated > 0) {
    console.log(`Seeded template blocks for ${updated} scenario pages.`);
  } else {
    console.log("Scenario pages already had sections; nothing updated.");
  }
};
