const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const pixelmatchModule = require("pixelmatch");
const pixelmatch = pixelmatchModule.default || pixelmatchModule;
const { PNG } = require("pngjs");

const STRAPI_BASE = "http://localhost:1337";
const REACT_BASE = "http://localhost:3000";
const STATIC_BASE = "http://localhost:8002";

const ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "project", "visual-compare");
const OUT_STATIC = path.join(OUT_DIR, "static");
const OUT_REACT = path.join(OUT_DIR, "react");
const OUT_DIFF = path.join(OUT_DIR, "diff");
const OUT_LOG = path.join(OUT_DIR, "progress.log");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const TEMPLATE_FILES = {
  TPL_Home: "tpl_home.html",
  TPL_Segment_Landing: "tpl_segment_landing.html",
  TPL_Service: "tpl_service.html",
  TPL_Scenario: "tpl_scenario.html",
  TPL_News_List: "tpl_news_list.html",
  TPL_News_Detail: "tpl_news_detail.html",
  TPL_Contact_Hub: "tpl_contact_hub.html",
  TPL_CMS_Page: "tpl_cms_page.html",
  TPL_Doc_Page: "tpl_doc_page.html",
  TPL_Form_Page: "tpl_form_page.html",
  TPL_Search_Results: "tpl_search_results.html",
  TPL_AI_Chat: "tpl_ai_chat.html",
  TPL_DeepNav: "tpl_deepnav.html",
  TPL_Career_List: "page_career.html",
  TPL_Career_Detail: "page_career.html",
};

const logLine = (line) => {
  const text = `[${new Date().toISOString()}] ${line}`;
  console.log(text);
  fs.appendFileSync(OUT_LOG, `${text}\n`);
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.json();
};

const loadHierarchyMap = () => {
  const map = new Map();
  const file = path.join(REPO_ROOT, "mgts-backend", "temp", "services-extraction", "pages-hierarchy.json");
  if (!fs.existsSync(file)) return map;
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const flat = Array.isArray(data?.flat) ? data.flat : [];
  flat.forEach((item) => {
    if (item?.slug && item?.path) map.set(item.slug, item.path);
  });
  return map;
};

const getPages = async () => {
  const pageSize = 100;
  let page = 1;
  let results = [];
  while (true) {
    const payload = await fetchJson(
      `${STRAPI_BASE}/api/pages?pagination[page]=${page}&pagination[pageSize]=${pageSize}`
    );
    const data = Array.isArray(payload?.data) ? payload.data : [];
    results = results.concat(data);
    const totalPages = payload?.meta?.pagination?.pageCount || 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return results;
};

const getNewsSlugs = async () => {
  const payload = await fetchJson(`${STRAPI_BASE}/api/news/list?pageSize=100`);
  return Array.isArray(payload?.data) ? payload.data.map((n) => n.slug).filter(Boolean) : [];
};

const toPath = (slug, slugMap) => {
  if (!slug) return null;
  if (slug === "home" || slug === "index") return "/";
  const direct = slugMap.get(slug);
  if (direct) return direct;
  if (slug.includes("/")) return `/${slug}`;
  return `/${slug.replace(/_/g, "/")}`;
};

const buildStaticUrl = (page, pathValue) => {
  const template = String(page?.template || "").trim();
  const slug = String(page?.slug || "").trim();
  if (template === "TPL_Home") return `${STATIC_BASE}/`;
  if (template === "TPL_News_List") return `${STATIC_BASE}/news`;
  if (template === "TPL_News_Detail") return `${STATIC_BASE}/news/${slug}`;
  const file = TEMPLATE_FILES[template];
  if (file) return `${STATIC_BASE}/html_pages/${file}?slug=${encodeURIComponent(slug)}`;
  if (pathValue) return `${STATIC_BASE}${pathValue}`;
  return `${STATIC_BASE}/`;
};

const safeName = (urlPath) => {
  if (urlPath === "/") return "home";
  return urlPath.replace(/^\//, "").replace(/[/?#]+/g, "__");
};

const fillWhite = (png) => {
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 255;
    png.data[i + 2] = 255;
    png.data[i + 3] = 255;
  }
};

const padPng = (img, width, height) => {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  fillWhite(out);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
};

const capturePage = async (page, url, filePath) => {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, fullPage: true });
};

const run = async () => {
  ensureDir(OUT_DIR);
  ensureDir(OUT_STATIC);
  ensureDir(OUT_REACT);
  ensureDir(OUT_DIFF);
  fs.writeFileSync(OUT_LOG, "");

  const slugMap = loadHierarchyMap();
  const pages = await getPages();
  const newsSlugs = await getNewsSlugs();

  const taskMap = new Map();
  pages.forEach((p) => {
    const slug = p?.slug || "";
    const pathValue = toPath(slug, slugMap);
    if (!pathValue) return;
    const normalizedSlug = String(slug || "").trim().toLowerCase();
    if (pathValue === "/" && normalizedSlug === "index") return;
    if (!taskMap.has(pathValue) || (pathValue === "/" && normalizedSlug === "home")) {
      taskMap.set(pathValue, {
        path: pathValue,
        reactUrl: `${REACT_BASE}${pathValue}`,
        staticUrl: buildStaticUrl(p, pathValue),
        name: safeName(pathValue),
      });
    }
  });
  taskMap.set("/news", {
    path: "/news",
    reactUrl: `${REACT_BASE}/news`,
    staticUrl: `${STATIC_BASE}/news`,
    name: safeName("/news"),
  });
  taskMap.set("/news/archive", {
    path: "/news/archive",
    reactUrl: `${REACT_BASE}/news/archive`,
    staticUrl: `${STATIC_BASE}/news/archive`,
    name: safeName("/news/archive"),
  });
  newsSlugs.forEach((slug) => {
    const pathValue = `/news/${slug}`;
    if (!taskMap.has(pathValue)) {
      taskMap.set(pathValue, {
        path: pathValue,
        reactUrl: `${REACT_BASE}${pathValue}`,
        staticUrl: `${STATIC_BASE}${pathValue}`,
        name: safeName(pathValue),
      });
    }
  });

  const list = Array.from(taskMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  logLine(`Total paths: ${list.length}`);
  const results = [];

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (let i = 0; i < list.length; i += 1) {
    const task = list[i];
    const name = task.name;
    const staticPath = path.join(OUT_STATIC, `${name}.png`);
    const reactPath = path.join(OUT_REACT, `${name}.png`);
    const diffPath = path.join(OUT_DIFF, `${name}.png`);
    const entry = { path: task.path, name, staticPath, reactPath, diffPath };
    const indexLabel = `${i + 1}/${list.length}`;
    const startedAt = Date.now();

    try {
      logLine(`[${indexLabel}] Capture ${task.path}`);
      await capturePage(page, task.staticUrl, staticPath);
      await capturePage(page, task.reactUrl, reactPath);

      const img1 = PNG.sync.read(fs.readFileSync(staticPath));
      const img2 = PNG.sync.read(fs.readFileSync(reactPath));
      const width = Math.max(img1.width, img2.width);
      const height = Math.max(img1.height, img2.height);
      const p1 = padPng(img1, width, height);
      const p2 = padPng(img2, width, height);
      const diff = new PNG({ width, height });
      const mismatch = pixelmatch(p1.data, p2.data, diff.data, width, height, { threshold: 0.1 });
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      const totalPixels = width * height;
      entry.mismatch = mismatch;
      entry.mismatchRatio = totalPixels ? mismatch / totalPixels : 0;
      entry.size = { width, height };
      logLine(
        `[${indexLabel}] Diff ${task.path} mismatch ${(entry.mismatchRatio * 100).toFixed(2)}% (${Date.now() - startedAt}ms)`
      );
    } catch (error) {
      entry.error = String(error?.message || error);
      logLine(`[${indexLabel}] Error ${task.path}: ${entry.error}`);
    }
    results.push(entry);
  }

  await browser.close();

  const reportJson = path.join(OUT_DIR, "report.json");
  fs.writeFileSync(reportJson, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const reportMd = path.join(OUT_DIR, "report.md");
  const sorted = results
    .filter((r) => typeof r.mismatchRatio === "number")
    .sort((a, b) => (b.mismatchRatio || 0) - (a.mismatchRatio || 0));
  const lines = [
    "# Visual compare report",
    "",
    `Total pages: ${results.length}`,
    "",
    "| Path | Mismatch % | Size |",
    "| --- | ---: | --- |",
  ];
  sorted.forEach((r) => {
    const percent = ((r.mismatchRatio || 0) * 100).toFixed(2);
    const size = r.size ? `${r.size.width}x${r.size.height}` : "-";
    lines.push(`| ${r.path} | ${percent}% | ${size} |`);
  });
  const failures = results.filter((r) => r.error);
  if (failures.length) {
    lines.push("", "## Errors");
    failures.forEach((r) => lines.push(`- ${r.path}: ${r.error}`));
  }
  fs.writeFileSync(reportMd, lines.join("\n"));

  logLine(`Report JSON: ${reportJson}`);
  logLine(`Report MD: ${reportMd}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
