#!/usr/bin/env node
/**
 * Standalone runner for seed-navigation-footer-v2.js (entityService, no API token).
 *
 * Usage:
 *   cd mgts-backend
 *   export MGTS_PAGE_ANALYSIS_DIR="mgts-backend/data/page-analysis-llm/branches/2026-01-22"
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-navigation-footer-v2.js
 */

const { createStrapi } = require('@strapi/strapi');

async function main() {
  const app = await createStrapi({
    distDir: './dist',
    autoReload: false,
    serveAdminPanel: false,
  }).load();

  const script = require('./seed-navigation-footer-v2.js');
  await script({ strapi: app });

  // Avoid sqlite/knex/tarn destroy instability in CLI scripts
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ seed-navigation-footer-v2 failed:', err?.message || err);
  process.exit(1);
});

