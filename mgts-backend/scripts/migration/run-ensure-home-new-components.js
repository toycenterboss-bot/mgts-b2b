#!/usr/bin/env node
/**
 * Runner for ensure-home-new-components.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-ensure-home-new-components.js
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
      const script = require("./ensure-home-new-components.js");
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error("\n❌ ensure-home-new-components failed:", err?.message || err);
  process.exit(1);
});
