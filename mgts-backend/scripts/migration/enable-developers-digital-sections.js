/**
 * Enable hidden sections on developers_digital_solutions page.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-enable-developers-digital-sections.js
 */

module.exports = async function enableDevelopersDigitalSections({ strapi }) {
  const slug = "developers_digital_solutions";
  const pages = await strapi.entityService.findMany("api::page.page", {
    filters: { slug },
    populate: ["sections"],
    limit: 5,
  });

  const page = Array.isArray(pages) ? pages[0] : pages;
  if (!page?.id) {
    console.log("developers_digital_solutions page not found.");
    return;
  }

  const sections = Array.isArray(page.sections) ? page.sections : [];
  let changed = 0;

  const nextSections = sections.map((section) => {
    if (section?.__component === "page.section-cards" && section.isVisible === false) {
      changed += 1;
      return { ...section, isVisible: true };
    }
    return section;
  });

  if (!changed) {
    console.log("No hidden section-cards to enable.");
    return;
  }

  await strapi.entityService.update("api::page.page", page.id, {
    data: { sections: nextSections },
  });

  console.log(`Enabled ${changed} section-cards blocks for ${slug}.`);
};
