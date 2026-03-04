#!/usr/bin/env node
/**
 * Runner for enable-security-alarm-sections.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-enable-security-alarm-sections.js
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
      const script = require("./enable-security-alarm-sections.js");
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error("\n❌ enable-security-alarm-sections failed:", err?.message || err);
  process.exit(1);
});
