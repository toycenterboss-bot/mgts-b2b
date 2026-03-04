/**
 * Force scenario_demo page to use TPL_Scenario template blocks.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-scenario-demo-template-blocks.js
 */

module.exports = async function seedScenarioDemoTemplateBlocks({ strapi }) {
  const slug = "scenario_demo";
  const pages = await strapi.entityService.findMany("api::page.page", {
    filters: { slug },
    limit: 5,
  });

  const page = Array.isArray(pages) ? pages[0] : pages;
  if (!page?.id) {
    console.log("scenario_demo page not found.");
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

  await strapi.entityService.update("api::page.page", page.id, {
    data: { sections: blocks },
  });

  console.log("scenario_demo updated with template blocks.");
};
