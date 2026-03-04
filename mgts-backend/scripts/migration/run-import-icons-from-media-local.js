#!/usr/bin/env node
/**
 * Runner for import-icons-from-media-local.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-import-icons-from-media-local.js
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
      const script = require("./import-icons-from-media-local.js");
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error("\n❌ import-icons-from-media-local failed:", err?.message || err);
  process.exit(1);
});
