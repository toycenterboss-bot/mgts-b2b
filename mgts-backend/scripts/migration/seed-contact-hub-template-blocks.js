/**
 * Seed contact hub pages with template block layout.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-contact-hub-template-blocks.js
 */

module.exports = async function seedContactHubTemplateBlocks({ strapi }) {
  const pages = await strapi.entityService.findMany("api::page.page", {
    filters: { template: "TPL_Contact_Hub" },
    limit: 1000,
  });

  if (!Array.isArray(pages) || pages.length === 0) {
    console.log("No TPL_Contact_Hub pages found.");
    return;
  }

  const blocks = [
    {
      __component: "page.template-block",
      template: "TPL_Contact_Hub",
      block: "contacts_with_interactive_3d_map",
    },
  ];

  let updated = 0;
  for (const page of pages) {
    if (!page?.id) continue;
    await strapi.entityService.update("api::page.page", page.id, {
      data: { sections: blocks },
    });
    updated += 1;
  }

  console.log(`Contact hub template blocks applied to ${updated} pages.`);
};
