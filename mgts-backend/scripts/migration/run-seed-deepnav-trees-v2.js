#!/usr/bin/env node
/**
 * Runner for seed-deepnav-trees-v2.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-deepnav-trees-v2.js
 */

const { createStrapi } = require('@strapi/strapi');

async function main() {
  await createStrapi({
    distDir: './dist',
    autoReload: false,
    serveAdminPanel: false,
  }).load().then(async (app) => {
    const script = require('./seed-deepnav-trees-v2.js');
    await script({ strapi: app });
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('\n❌ seed-deepnav-trees-v2 failed:', err?.message || err);
  process.exit(1);
});

