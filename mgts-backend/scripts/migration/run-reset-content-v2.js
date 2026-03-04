#!/usr/bin/env node
/**
 * Standalone runner for reset-content-v2.js
 *
 * Usage:
 *   node scripts/migration/run-reset-content-v2.js
 */

const { createStrapi } = require('@strapi/strapi');

async function main() {
  let app;
  try {
    app = await createStrapi({
      distDir: './dist',
      autoReload: false,
      serveAdminPanel: false,
    }).load();

    const script = require('./reset-content-v2.js');
    await script({ strapi: app });
  } finally {
    if (app) await app.destroy();
  }
}

main().catch((err) => {
  console.error('\n❌ reset-content-v2 failed:', err?.message || err);
  process.exit(1);
});

