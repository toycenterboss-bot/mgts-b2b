#!/usr/bin/env node
/**
 * Remove duplicate Media Library files by name.
 * Keeps files referenced by pages; if none referenced, keeps newest (max id).
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/migration/cleanup-duplicate-media.js
 */
const http = require('http');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

if (!API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
  process.exit(1);
}

function requestJson(method, endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, STRAPI_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllPages() {
  const pageSize = 100;
  let page = 1;
  const pages = [];
  while (true) {
    const res = await requestJson(
      'GET',
      `/api/pages?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=sections.files`
    );
    const data = Array.isArray(res?.data) ? res.data : [];
    pages.push(...data);
    const total = res?.meta?.pagination?.total || 0;
    if (page * pageSize >= total) break;
    page += 1;
  }
  return pages;
}

async function fetchAllUploads() {
  const pageSize = 100;
  let page = 1;
  const files = [];
  while (true) {
    const res = await requestJson(
      'GET',
      `/api/upload/files?pagination[page]=${page}&pagination[pageSize]=${pageSize}`
    );
    const data = Array.isArray(res) ? res : res?.data || [];
    files.push(...data);
    const total = res?.meta?.pagination?.total || 0;
    if (page * pageSize >= total) break;
    if (!total && data.length < pageSize) break;
    page += 1;
  }
  return files;
}

function collectUsedFileIds(pages) {
  const used = new Set();
  for (const p of pages) {
    const sections = p?.sections || p?.attributes?.sections || [];
    for (const s of sections) {
      if (!s || s.__component !== 'page.files-table') continue;
      const files = s.files || [];
      for (const f of files) {
        const file = f?.file || f?.file?.data || null;
        const id = file?.id || file?.data?.id;
        if (id) used.add(Number(id));
      }
    }
  }
  return used;
}

async function deleteUpload(id) {
  await requestJson('DELETE', `/api/upload/files/${id}`);
}

async function main() {
  console.log('\n🧹 Cleanup duplicate Media Library files\n');
  const pages = await fetchAllPages();
  const usedIds = collectUsedFileIds(pages);
  const uploads = await fetchAllUploads();

  const byName = new Map();
  uploads.forEach((f) => {
    const name = f?.name || f?.attributes?.name || '';
    if (!name) return;
    const list = byName.get(name) || [];
    list.push(f);
    byName.set(name, list);
  });

  let removed = 0;
  for (const [name, list] of byName.entries()) {
    if (list.length <= 1) continue;
    const sorted = list
      .map((f) => ({ id: Number(f?.id || f?.attributes?.id), f }))
      .filter((x) => Number.isFinite(x.id))
      .sort((a, b) => b.id - a.id);

    const used = sorted.filter((x) => usedIds.has(x.id));
    const keepIds = new Set();
    if (used.length > 0) {
      used.forEach((x) => keepIds.add(x.id));
    } else if (sorted[0]) {
      keepIds.add(sorted[0].id);
    }

    for (const item of sorted) {
      if (keepIds.has(item.id)) continue;
      console.log(`- delete duplicate: ${name} (id=${item.id})`);
      await deleteUpload(item.id);
      removed += 1;
    }
  }

  console.log(`\n✅ Removed duplicates: ${removed}\n`);
}

main().catch((err) => {
  console.error(`\n❌ Ошибка: ${err.message}\n`);
  process.exit(1);
});
