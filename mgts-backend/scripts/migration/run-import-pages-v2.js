#!/usr/bin/env node
/**
 * Standalone runner for import-pages-v2.js (entityService, no API token).
 *
 * Usage:
 *   cd mgts-backend
 *   # optional:
 *   export MGTS_PAGE_ANALYSIS_DIR="mgts-backend/data/page-analysis-llm/branches/2026-01-22"
 *   export MGTS_IMPORT_DRY_RUN=1
 *   export MGTS_IMPORT_LIMIT=5
 *   node scripts/migration/run-import-pages-v2.js
 */

const { createStrapi } = require('@strapi/strapi');

// Knex/tarn can sometimes surface an 'aborted' error during shutdown as an unhandled rejection.
// For import scripts this is noise (work is already done), so we swallow it.
process.on('unhandledRejection', (reason) => {
  const msg = String(reason?.message || reason || '');
  if (msg.includes('aborted')) {
    console.warn('⚠️  Swallowed unhandledRejection during shutdown:', msg);
    return;
  }
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  const msg = String(err?.message || err || '');
  if (msg.includes('aborted')) {
    console.warn('⚠️  Swallowed uncaughtException during shutdown:', msg);
    process.exit(0);
  }
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

async function main() {
  let app;
  try {
    app = await createStrapi({
      distDir: './dist',
      autoReload: false,
      serveAdminPanel: false,
    }).load();

    const script = require('./import-pages-v2.js');
    await script({ strapi: app });
  } finally {
    // NOTE:
    // Calling app.destroy() intermittently crashes with sqlite/knex/tarn "Error: aborted"
    // after the import has already completed. For CLI import runs we prefer reliability.
    //
    // If you *really* want a clean shutdown, set MGTS_STRAPI_DESTROY=1.
    if (app && process.env.MGTS_STRAPI_DESTROY === '1') {
      try {
        await app.destroy();
      } catch (e) {
        console.warn('⚠️  Strapi shutdown warning:', e?.message || e);
      }
    }
  }
}

// Ensure the process terminates after import to avoid hanging handles
// (and to avoid destroy() abort crash when using sqlite).
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ import-pages-v2 failed:', err?.message || err);
    process.exit(1);
  });

