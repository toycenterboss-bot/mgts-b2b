#!/usr/bin/env node
/**
 * Runner for enable-developers-digital-sections.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-enable-developers-digital-sections.js
 */

const { createStrapi } = require("@strapi/strapi");

async function main() {
  await createStrapi({
    distDir: "./dist",
    autoReload: false,
    serveAdminPanel: false,
  })
    .load()
    .then(async (app) => {
      const script = require("./enable-developers-digital-sections.js");
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error("\n❌ enable-developers-digital-sections failed:", err?.message || err);
  process.exit(1);
});
