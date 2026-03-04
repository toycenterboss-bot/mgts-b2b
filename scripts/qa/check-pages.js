/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const STRAPI_BASE = process.env.STRAPI_BASE_URL || "http://localhost:1337";
const NEXT_BASE = process.env.NEXT_BASE_URL || "http://localhost:3000";

const hierarchyPath = path.join(
  __dirname,
  "..",
  "..",
  "mgts-backend",
  "temp",
  "services-extraction",
  "pages-hierarchy.json"
);

const loadHierarchy = () => {
  try {
    if (!fs.existsSync(hierarchyPath)) return new Map();
    const raw = JSON.parse(fs.readFileSync(hierarchyPath, "utf-8"));
    const flat = Array.isArray(raw?.flat) ? raw.flat : [];
    const map = new Map();
    flat.forEach((item) => {
      if (item?.slug && item?.path) {
        map.set(item.slug, item.path);
      }
    });
    return map;
  } catch {
    return new Map();
  }
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
};

const fetchStatus = async (url) => {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return res.status;
  } catch {
    return 0;
  }
};

const toPath = (slug, map) => {
  if (!slug || slug === "home") return "/";
  if (map.has(slug)) return map.get(slug);
  return `/${slug}`;
};

const run = async () => {
  const pagesUrl = `${STRAPI_BASE}/api/pages?pagination[pageSize]=500`;
  const data = await fetchJson(pagesUrl);
  const pages = Array.isArray(data?.data) ? data.data : [];
  const hierarchy = loadHierarchy();

  const results = [];
  for (const page of pages) {
    const slug = page.slug;
    if (!slug) continue;
    const path = toPath(slug, hierarchy);
    const url = `${NEXT_BASE}${path}`;
    const status = await fetchStatus(url);
    results.push({ slug, path, status });
  }

  const ok = results.filter((r) => r.status >= 200 && r.status < 400);
  const fail = results.filter((r) => !(r.status >= 200 && r.status < 400));

  const report = [
    "# Отчет проверки страниц",
    "",
    `Источник Strapi: ${STRAPI_BASE}`,
    `Frontend: ${NEXT_BASE}`,
    `Всего страниц: ${results.length}`,
    `Успешно: ${ok.length}`,
    `Ошибки: ${fail.length}`,
    "",
    "## Ошибки",
    "",
    ...fail.map((r) => `- ${r.status || "ERR"}: ${r.path} (slug: ${r.slug})`),
    "",
    "## Успешные проверки (выборка)",
    "",
    ...ok.slice(0, 30).map((r) => `- ${r.status}: ${r.path} (slug: ${r.slug})`),
    "",
  ].join("\n");

  const reportPath = path.join(__dirname, "..", "..", "docs", "project", "NEXTJS_QA_REPORT.md");
  fs.writeFileSync(reportPath, report, "utf-8");

  console.log(report);
  console.log(`\nReport saved: ${reportPath}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
