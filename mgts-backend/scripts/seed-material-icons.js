#!/usr/bin/env node
/**
 * Seed icon library from Material Symbols used in design templates.
 */

const fs = require("fs");
const path = require("path");

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN || "";
const ROOT = path.resolve(__dirname, "..", "..");
const DESIGN_DIR = path.join(ROOT, "design");
const SOURCES = [path.join(DESIGN_DIR, "html_pages"), path.join(DESIGN_DIR, "html_blocks")];

const iconRegex = /<span[^>]*class="[^"]*material-symbols[^"]*"[^>]*>([^<]+)<\/span>/gi;

const walkHtml = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(full, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
};

const toLabel = (name) =>
  String(name || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (m) => m.toUpperCase());

const fetchJson = async (url, options = {}) => {
  const headers = Object.assign({}, options.headers || {});
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
};

const existsIcon = async (name) => {
  const url = `${STRAPI_BASE}/api/icons?filters[name][$eq]=${encodeURIComponent(
    name
  )}&pagination[pageSize]=1`;
  const data = await fetchJson(url);
  return Array.isArray(data?.data) && data.data.length > 0;
};

const createIcon = async (name, label) => {
  const headers = { "Content-Type": "application/json" };
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  const res = await fetch(`${STRAPI_BASE}/api/icons`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { name, label } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create failed: ${res.status} ${text}`);
  }
  return res.json();
};

async function main() {
  const files = SOURCES.flatMap((dir) => walkHtml(dir));
  const icons = new Set();
  for (const file of files) {
    const html = fs.readFileSync(file, "utf-8");
    let match = null;
    while ((match = iconRegex.exec(html))) {
      const name = String(match[1] || "").trim();
      if (name) icons.add(name);
    }
  }

  const list = Array.from(icons).sort();
  console.log(`Found ${list.length} unique Material icons in templates.`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let idx = 0;

  for (const name of list) {
    idx += 1;
    try {
      const exists = await existsIcon(name);
      if (exists) {
        skipped += 1;
        console.log(`[${idx}/${list.length}] skip: ${name}`);
        continue;
      }
      const label = toLabel(name);
      await createIcon(name, label);
      created += 1;
      console.log(`[${idx}/${list.length}] created: ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`[${idx}/${list.length}] failed: ${name} -> ${err.message || err}`);
    }
  }

  console.log(`Done. Created=${created} Skipped=${skipped} Failed=${failed}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
