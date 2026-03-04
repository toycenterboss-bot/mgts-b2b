#!/usr/bin/env node
/**
 * Runner for seed-scenario-demo-template-blocks.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-scenario-demo-template-blocks.js
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
      const script = require("./seed-scenario-demo-template-blocks.js");
      await script({ strapi: app });
      process.exit(0);
    });
}

main().catch((err) => {
  console.error("\n❌ seed-scenario-demo-template-blocks failed:", err?.message || err);
  process.exit(1);
});
