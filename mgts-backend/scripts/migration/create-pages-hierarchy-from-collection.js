#!/usr/bin/env node
/**
 * Build pages-hierarchy.json from COLLECTION_TREE.json
 * so Strapi can update parent relations.
 */
const fs = require('fs');
const path = require('path');

const TREE_PATH = path.join(
  __dirname,
  '../../data/page-analysis-llm/branches/2026-01-22/COLLECTION_TREE.json'
);
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'pages-hierarchy.json');

function slugFromNode(node) {
  const p = node?.path || '';
  const metaSlug = node?.meta?.slug;
  if (!metaSlug && p && p !== '/') return '';
  if (metaSlug && metaSlug !== 'index') return metaSlug;
  if (p === '/' || p === '') return 'home';
  const parts = p.split('/').filter(Boolean);
  return parts[parts.length - 1] || metaSlug || '';
}

function walk(node, parentSlug, out) {
  const slug = slugFromNode(node);
  if (slug) {
    out.push({
      slug,
      parentSlug: parentSlug || null,
      path: node?.path || '',
      title: node?.meta?.title || '',
    });
  }
  const children = node?.children || {};
  for (const key of Object.keys(children)) {
    walk(children[key], slug || parentSlug, out);
  }
}

function main() {
  if (!fs.existsSync(TREE_PATH)) {
    console.error(`❌ Не найден файл: ${TREE_PATH}`);
    process.exit(1);
  }
  const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf-8'));
  const flat = [];
  walk(tree, null, flat);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    totalPages: flat.length,
    flat,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✅ Saved: ${OUTPUT_FILE} (${flat.length} items)`);
}

main();
