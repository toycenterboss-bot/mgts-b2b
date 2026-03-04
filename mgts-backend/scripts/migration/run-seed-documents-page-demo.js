#!/usr/bin/env node
/**
 * Runner for seed-documents-page-demo.js (entityService + upload service).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-documents-page-demo.js
 *
 * Optional:
 *   MGTS_DOC_DEMO_SLUG="documents"
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
      const script = require('./seed-documents-page-demo.js');
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error('\n❌ seed-documents-page-demo failed:', err?.message || err);
  process.exit(1);
});

