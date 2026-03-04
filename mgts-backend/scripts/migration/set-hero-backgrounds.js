/**
 * Bulk-sets Page.hero.backgroundImage in Strapi.
 *
 * Why:
 * - Some imported pages have `hero.backgroundImage = null`, so hero backgrounds look empty.
 *
 * Usage:
 *   STRAPI_URL=http://localhost:1337 STRAPI_API_TOKEN=... node scripts/migration/set-hero-backgrounds.js
 *
 * Optional:
 *   HERO_BG_DEFAULT_ID=498                      # overrides default image id
 *   HERO_BG_SLUGS=home,services,access_internet # overrides slugs list
 *   IMAGES_CACHE_PATH=temp/spec-images-cache.json
 */
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/+$/, "");
const STRAPI_API_TOKEN = (process.env.STRAPI_API_TOKEN || "").trim();

const DEFAULT_SLUGS = [
  "home",
  "services",
  "access_internet",
  "telephony",
  "mobile_connection",
  "virtual_ate",
  "video_surveillance_office",
];

function parseSlugs() {
  const raw = (process.env.HERO_BG_SLUGS || "").trim();
  if (!raw) return DEFAULT_SLUGS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function readImagesCacheId() {
  const explicit = parseInt(String(process.env.HERO_BG_DEFAULT_ID || ""), 10);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const cachePath = (process.env.IMAGES_CACHE_PATH || "temp/spec-images-cache.json").trim();
  const abs = path.isAbsolute(cachePath) ? cachePath : path.join(process.cwd(), cachePath);
  try {
    const raw = fs.readFileSync(abs, "utf-8");
    const obj = JSON.parse(raw);
    // Prefer MGTSBuild.jpg if present, else take the first numeric id.
    if (obj && typeof obj === "object") {
      if (obj["https://business.mgts.ru/images/MGTSBuild.jpg"]) {
        const id = parseInt(String(obj["https://business.mgts.ru/images/MGTSBuild.jpg"]), 10);
        if (Number.isFinite(id) && id > 0) return id;
      }
      for (const v of Object.values(obj)) {
        const id = parseInt(String(v), 10);
        if (Number.isFinite(id) && id > 0) return id;
      }
    }
  } catch (_e) {
    // ignore
  }
  return 0;
}

async function fetchJson(url, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (STRAPI_API_TOKEN) headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}\n${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url}: ${e.message}\n${text.slice(0, 500)}`);
  }
}

function deepOmitKeys(value, keysToOmit) {
  if (Array.isArray(value)) return value.map((v) => deepOmitKeys(v, keysToOmit));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (keysToOmit.has(k)) continue;
    out[k] = deepOmitKeys(v, keysToOmit);
  }
  return out;
}

async function setHeroBg(slug, imageId) {
  const getUrl = `${STRAPI_URL}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
  const json = await fetchJson(getUrl);
  const page = (json && json.data) || null;
  if (!page) {
    console.log(`- SKIP ${slug}: page not found`);
    return { slug, status: "not_found" };
  }

  const targetId = page.documentId || page.id;
  if (!targetId) {
    console.log(`- SKIP ${slug}: no documentId/id`);
    return { slug, status: "no_id" };
  }

  const hero = page.hero || null;
  const nextHero = hero
    ? { ...deepOmitKeys(hero, new Set(["id"])), backgroundImage: imageId }
    : {
        title: String(page.heroTitle || page.title || slug),
        subtitle: String(page.heroSubtitle || ""),
        ctaButtons: [],
        backgroundImage: imageId,
      };

  const putUrl = `${STRAPI_URL}/api/pages/${encodeURIComponent(String(targetId))}`;
  const payload = { data: { hero: nextHero } };

  const out = await fetchJson(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const updated = (out && out.data) || null;
  const updatedHero = updated && updated.hero ? updated.hero : null;
  const bg = updatedHero ? updatedHero.backgroundImage : undefined;
  console.log(`- OK   ${slug}: hero.backgroundImage set -> ${bg ? "[set]" : bg}`);
  return { slug, status: "ok" };
}

async function main() {
  const slugs = parseSlugs();
  const defaultImageId = readImagesCacheId();
  if (!defaultImageId) {
    throw new Error(
      "Could not determine default image id. Set HERO_BG_DEFAULT_ID or provide IMAGES_CACHE_PATH with at least one id."
    );
  }

  console.log(`STRAPI_URL=${STRAPI_URL}`);
  console.log(`defaultImageId=${defaultImageId}`);
  console.log(`slugs(${slugs.length})=${slugs.join(", ")}`);

  if (!STRAPI_API_TOKEN) {
    console.warn("WARN: STRAPI_API_TOKEN is not set; updates will likely fail with 401.");
  }

  const started = Date.now();
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const t0 = Date.now();
    process.stdout.write(`[${i + 1}/${slugs.length}] ${slug} ... `);
    try {
      await setHeroBg(slug, defaultImageId);
      console.log(`  (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
    } catch (e) {
      console.log(`ERR (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
      console.error(String(e && e.stack ? e.stack : e));
    }
  }
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exitCode = 1;
});

