/**
 * Reset Strapi content (keep uploads on disk).
 *
 * Goal: delete all Pages (and optionally other content) before import v2.
 * Runs via entityService (no API token needed).
 *
 * Usage:
 *   node scripts/migration/run-reset-content-v2.js
 */

module.exports = async ({ strapi }) => {
  console.log('\n🧹 Reset content v2 (entityService)\n');

  async function deleteAll(uid) {
    const items = await strapi.entityService.findMany(uid, {
      fields: ['id'],
      publicationState: 'preview',
      limit: 1000,
    });

    console.log(`- ${uid}: found ${items.length}`);
    let deleted = 0;
    for (const item of items) {
      await strapi.entityService.delete(uid, item.id);
      deleted++;
      if (deleted % 50 === 0) process.stdout.write(`  deleted ${deleted}...\n`);
    }
    console.log(`  deleted total: ${deleted}`);
  }

  // Pages are safe to wipe. This DOES NOT delete files in public/uploads.
  await deleteAll('api::page.page');

  console.log('\n✅ Reset done.\n');
};

