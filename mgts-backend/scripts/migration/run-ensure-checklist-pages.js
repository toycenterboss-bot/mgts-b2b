#!/usr/bin/env node
/**
 * Runner for ensure-checklist-pages.js (entityService).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-ensure-checklist-pages.js
 */

const { createStrapi } = require('@strapi/strapi');
const net = require('net');

function withTimeout(promise, ms, label) {
  const timeoutMs = Math.max(1, Number(ms) || 60000);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms${label ? ` (${label})` : ''}`));
    }, timeoutMs);
    Promise.resolve(promise)
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

async function isPortOpen(port, host = '127.0.0.1', timeoutMs = 300) {
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (_e) {}
      resolve(v);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function main() {
  const hasRunning = await isPortOpen(1337);
  if (hasRunning) {
    // eslint-disable-next-line no-console
    const allow = String(process.env.MGTS_ALLOW_PARALLEL_STRAPI || '').trim() === '1';
    const msg =
      '\n⚠️  Detected Strapi already listening on :1337. ' +
      'If you use sqlite, running this script in parallel with `strapi develop` may hang on DB locks.\n' +
      'Recommendation: stop `strapi develop`, run ALL batches, then start Strapi again.\n';
    if (!allow) {
      // eslint-disable-next-line no-console
      console.error(msg + 'Set MGTS_ALLOW_PARALLEL_STRAPI=1 to bypass (not recommended).\n');
      process.exit(2);
    } else {
      // eslint-disable-next-line no-console
      console.warn(msg + 'Continuing due to MGTS_ALLOW_PARALLEL_STRAPI=1.\n');
    }
  }

  // eslint-disable-next-line no-console
  console.log('▶ Loading Strapi (standalone) ...');
  const app = await withTimeout(createStrapi({
    distDir: './dist',
    autoReload: false,
    serveAdminPanel: false,
  }).load(), Number(process.env.MGTS_ENSURE_LOAD_TIMEOUT_MS || 60000), 'strapi.load');
  // eslint-disable-next-line no-console
  console.log('✅ Strapi loaded\n');

  const script = require('./ensure-checklist-pages.js');
  await script({ strapi: app });

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ ensure-checklist-pages failed:', err?.message || err);
  process.exit(1);
});

