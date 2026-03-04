const puppeteer = require("puppeteer");

const STRAPI_BASE = "http://localhost:1337";
const FRONT_BASE = "http://localhost:8002/html_pages";

const TEMPLATE_TO_HTML = {
  TPL_CMS_Page: "tpl_cms_page.html",
  TPL_DeepNav: "tpl_deepnav.html",
  TPL_Service: "tpl_service.html",
  TPL_Doc_Page: "tpl_doc_page.html",
  TPL_Form_Page: "tpl_form_page.html",
  TPL_Contact_Hub: "tpl_contact_hub.html",
  TPL_Home: "tpl_home.html",
  TPL_Segment_Landing: "tpl_segment_landing.html",
  TPL_Scenario: "tpl_scenario.html",
  TPL_News_List: "tpl_news_list.html",
  TPL_News_Archive: "tpl_news_archive.html",
  TPL_News_Detail: "tpl_news_detail.html",
};

const TEXT_KEYS = new Set([
  "title",
  "subtitle",
  "text",
  "label",
  "question",
  "name",
  "heading",
  "caption",
  "badgeText",
]);
const STOP_TOKENS = new Set([
  "подробнее",
  "читать далее",
  "заголовок",
  "описание",
  "текст",
  "документ",
]);

const stripHtml = (value) =>
  String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const addToken = (set, value) => {
  const raw = stripHtml(value);
  if (!raw || raw.length < 6) return;
  const norm = raw.toLowerCase();
  if (STOP_TOKENS.has(norm)) return;
  const truncated = raw.length > 120 ? raw.slice(0, 120) : raw;
  set.add(truncated);
};

const extractTokensFromSection = (section, limit = 20) => {
  const tokens = new Set();
  const walk = (node, key = "") => {
    if (tokens.size >= limit) return;
    if (typeof node === "string") {
      if (!key || TEXT_KEYS.has(key) || /title|label|text|name/i.test(key)) {
        addToken(tokens, node);
      }
      return;
    }
    if (typeof node === "number") return;
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, key));
      return;
    }
    if (!node || typeof node !== "object") return;
    Object.entries(node).forEach(([k, v]) => {
      if (tokens.size >= limit) return;
      walk(v, k);
    });
  };
  walk(section);
  return Array.from(tokens);
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

const fetchAllPages = async () => {
  const first = await fetchJson(
    `${STRAPI_BASE}/api/pages?pagination[page]=1&pagination[pageSize]=100`
  );
  const total = first?.meta?.pagination?.total || 0;
  const pages = first?.data || [];
  let page = 2;
  while (pages.length < total) {
    const data = await fetchJson(
      `${STRAPI_BASE}/api/pages?pagination[page]=${page}&pagination[pageSize]=100`
    );
    pages.push(...(data?.data || []));
    page += 1;
  }
  return pages;
};

const buildPageUrl = (tpl, slug) => {
  const html = TEMPLATE_TO_HTML[tpl];
  if (!html) return null;
  if (tpl === "TPL_News_Detail") {
    return `${FRONT_BASE}/${html}`;
  }
  const safeSlug = encodeURIComponent(String(slug || "").trim());
  return `${FRONT_BASE}/${html}?slug=${safeSlug}`;
};

const collectPageTokens = (page) => {
  const tokens = new Set();
  if (page.title) addToken(tokens, page.title);
  if (page.hero?.title) addToken(tokens, page.hero.title);
  if (page.hero?.subtitle) addToken(tokens, page.hero.subtitle);
  if (Array.isArray(page.sections)) {
    page.sections.forEach((section) => {
      extractTokensFromSection(section, 10).forEach((t) => tokens.add(t));
    });
  }
  return Array.from(tokens).slice(0, 60);
};

const evaluateTokensOnPage = async (page, tokens) => {
  const bodyText = await page.evaluate(() => {
    const text = document.body ? document.body.innerText || "" : "";
    return text.toLowerCase();
  });
  const missing = [];
  for (const token of tokens) {
    const t = token.toLowerCase();
    if (!t || t.length < 6) continue;
    if (!bodyText.includes(t)) missing.push(token);
  }
  return missing;
};

async function auditRenderedContent() {
  const pages = await fetchAllPages();
  const browser = await puppeteer.launch({ headless: "new" });
  const results = [];
  const issues = [];
  try {
    for (let i = 0; i < pages.length; i += 1) {
      const item = pages[i];
      const slug = item.slug;
      const template = item.template;
      const url = buildPageUrl(template, slug);
      if (!url) {
        console.log(`[audit] skip ${slug} (${template}) - no template url`);
        continue;
      }

      console.log(`[audit] ${i + 1}/${pages.length} ${slug} -> ${url}`);
      const pageRes = await fetchJson(
        `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`
      );
      const pageData = pageRes?.data || null;
      if (!pageData) {
        console.log(`[audit] skip ${slug} - no page data`);
        continue;
      }
      const tokens = collectPageTokens(pageData);
      if (!tokens.length) {
        results.push({
          slug,
          template,
          url,
          totalTokens: 0,
          missingCount: 0,
          missing: [],
        });
        continue;
      }

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((resolve) => setTimeout(resolve, 800));
      const missing = await evaluateTokensOnPage(page, tokens);
      await page.close();

      const ratio = tokens.length ? missing.length / tokens.length : 0;
      const entry = {
        slug,
        template,
        url,
        missingCount: missing.length,
        totalTokens: tokens.length,
        missing: missing.slice(0, 50),
      };
      results.push(entry);
      if (missing.length && ratio >= 0.35) issues.push(entry);
    }
  } finally {
    await browser.close();
  }

  const fs = require("fs");
  const path = require("path");
  const outDir = path.join(__dirname, "..", "data", "audit");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fullPath = path.join(outDir, `rendered-content-full-${stamp}.json`);
  const issuesPath = path.join(outDir, `rendered-content-issues-${stamp}.json`);
  fs.writeFileSync(fullPath, JSON.stringify(results, null, 2));
  fs.writeFileSync(issuesPath, JSON.stringify(issues, null, 2));
  console.log(`[audit] full report: ${fullPath}`);
  console.log(`[audit] issues report: ${issuesPath}`);
}

auditRenderedContent().catch((err) => {
  console.error("Audit failed:", err);
  process.exitCode = 1;
});
