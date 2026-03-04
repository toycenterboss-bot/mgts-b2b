#!/usr/bin/env node
/**
 * Runner for seed-contact-hub-page-demo.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-contact-hub-page-demo.js
 *
 * Optional:
 *   MGTS_CONTACT_HUB_DEMO_SLUG="contact_details"
 */

const { createStrapi } = require('@strapi/strapi');

async function main() {
  await createStrapi({
    distDir: './dist',
    autoReload: false,
    serveAdminPanel: false,
  })
    .load()
    .then(async (app) => {
      const script = require('./seed-contact-hub-page-demo.js');
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error('\n❌ seed-contact-hub-page-demo failed:', err?.message || err);
  process.exit(1);
});

