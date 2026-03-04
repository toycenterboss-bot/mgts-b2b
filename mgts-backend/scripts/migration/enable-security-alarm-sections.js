/**
 * Enable hidden sections on security_alarm page.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-enable-security-alarm-sections.js
 */

module.exports = async function enableSecurityAlarmSections({ strapi }) {
  const slug = "security_alarm";
  const pages = await strapi.entityService.findMany("api::page.page", {
    filters: { slug },
    populate: ["sections"],
    limit: 5,
  });

  const page = Array.isArray(pages) ? pages[0] : pages;
  if (!page?.id) {
    console.log("security_alarm page not found.");
    return;
  }

  const sections = Array.isArray(page.sections) ? page.sections : [];
  let changed = 0;
  const nextSections = sections.map((section) => {
    if (section && section.isVisible === false) {
      changed += 1;
      return { ...section, isVisible: true };
    }
    return section;
  });

  if (!changed) {
    console.log("No hidden sections to enable.");
    return;
  }

  await strapi.entityService.update("api::page.page", page.id, {
    data: { sections: nextSections },
  });

  console.log(`Enabled ${changed} hidden sections for ${slug}.`);
};
