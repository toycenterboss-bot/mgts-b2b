/**
 * Create/refresh deep-nav tree for partners_documents and set page deepNavKey.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/update-partners-documents-deepnav.js
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   MGTS_PAGE_ANALYSIS_DIR (default branches/2026-01-22)
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const DEFAULT_DIR = path.join(__dirname, '../data/page-analysis-llm/branches/2026-01-22');

const DEEPNAV_KEY = 'partners_documents';
const PAGE_SLUG = 'documents';

if (!API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
  process.exit(1);
}

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

function stripComponentIds(value) {
  if (Array.isArray(value)) return value.map(stripComponentIds);
  if (value && typeof value === 'object') {
    const next = {};
    Object.entries(value).forEach(([key, val]) => {
      if (key === 'id') return;
      next[key] = stripComponentIds(val);
    });
    return next;
  }
  return value;
}

async function fetchDeepNavTree(key) {
  try {
    const res = await api.get(`/navigation/deep-nav/${encodeURIComponent(key)}`);
    return res.data?.data || null;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

async function main() {
  const specPath = path.join(DEFAULT_DIR, `${PAGE_SLUG}_spec.json`);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec not found: ${specPath}`);
  }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  const sidebar = (spec.sections || []).find((s) => s?.type === 'sidebar-menu');
  const cards = Array.isArray(sidebar?.cards) ? sidebar.cards : [];
  if (!cards.length) {
    throw new Error('Sidebar cards not found in spec.');
  }

  const navRes = await api.get('/navigation');
  const nav = navRes.data?.data;
  if (!nav) throw new Error('Navigation entry not found');

  const existingKeys = ['contacts', 'documents', 'about_company', 'disclosure', DEEPNAV_KEY];
  const existingTrees = [];
  for (const key of existingKeys) {
    const tree = await fetchDeepNavTree(key);
    if (tree) existingTrees.push(tree);
  }

  const newTree = {
    key: DEEPNAV_KEY,
    title: sidebar?.title || 'Раздел',
    items: cards.map((card, idx) => ({
      kind: 'link',
      label: card?.title || `Раздел ${idx + 1}`,
      href: `#doc-tab-${idx + 1}`,
      isExternal: false,
      order: idx,
      children: [],
    })),
  };

  const merged = [];
  const seen = new Set();
  for (const tree of existingTrees) {
    const key = tree.key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(stripComponentIds(tree));
  }
  if (!seen.has(DEEPNAV_KEY)) {
    merged.push(newTree);
  } else {
    const idx = merged.findIndex((t) => t.key === DEEPNAV_KEY);
    merged[idx] = newTree;
  }

  await api.put(`/navigation`, { data: { deepNavTrees: merged } });

  const pageRes = await api.get('/pages', {
    params: { 'filters[slug][$eq]': PAGE_SLUG },
  });
  const page = Array.isArray(pageRes.data?.data) ? pageRes.data.data[0] : null;
  if (!page) throw new Error(`Page not found: ${PAGE_SLUG}`);
  const pageId = page.documentId || page.id;

  await api.put(`/pages/${pageId}`, {
    data: { deepNavKey: DEEPNAV_KEY },
  });

  console.log(`✅ DeepNav updated: ${DEEPNAV_KEY} and page deepNavKey set`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Ошибка:', error.response?.data || error.message);
    process.exit(1);
  });
}
