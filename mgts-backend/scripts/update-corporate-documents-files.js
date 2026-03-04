/**
 * Upload corporate_documents file links to Strapi Media Library and replace fileLinks in spec.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node update-corporate-documents-files.js --slug corporate_documents
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   MGTS_FILES_BASE (default https://business.mgts.ru)
 *   MGTS_PAGE_ANALYSIS_DIR (default branches/2026-01-22)
 *   ALLOW_REMOTE_FILES (default true)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const FILES_BASE_URL = process.env.MGTS_FILES_BASE || 'https://business.mgts.ru';
const DEFAULT_DIR = path.join(__dirname, '../data/page-analysis-llm/branches/2026-01-22');
const ALLOW_REMOTE = String(process.env.ALLOW_REMOTE_FILES || 'true').toLowerCase() !== 'false';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const slug = getArg('--slug') || 'corporate_documents';
const specDir = getArg('--dir') || process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;

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

const CACHE_FILE = path.join(__dirname, '../temp/corporate-documents-files-cache.json');
const DOWNLOAD_DIR = path.join(__dirname, '../temp/corporate-documents-files-downloads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) || {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  ensureDir(path.dirname(CACHE_FILE));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function normalizeUrl(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${FILES_BASE_URL}${raw}`;
  return `${FILES_BASE_URL}/${raw}`;
}

function fileNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || '';
    return path.basename(pathname) || 'file';
  } catch {
    return path.basename(String(url || 'file'));
  }
}

function truncateFilename(filename, maxLen = 120) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  if (filename.length <= maxLen) return filename;
  const keep = Math.max(1, maxLen - ext.length);
  return `${base.slice(0, keep)}${ext}`;
}

function safeFilenameFromUrl(url) {
  let name = fileNameFromUrl(url);
  try {
    name = decodeURIComponent(name);
  } catch {
    // ignore decode errors
  }
  name = name.replace(/[\\\/?%*:|"<>]/g, '_').replace(/\s+/g, '_');
  if (!name) name = 'file';
  return truncateFilename(name);
}

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    file.on('error', (err) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(err);
    });
    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          if (response.headers.location) {
            return downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
          }
        }
        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return reject(new Error(`HTTP ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });
  });
}

async function uploadToStrapi(filePath, filename) {
  const FormData = require('form-data');
  const safeName = truncateFilename(filename);
  const form = new FormData();
  form.append('files', fs.createReadStream(filePath), safeName);
  const response = await axios.post(`${STRAPI_URL}/api/upload`, form, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      ...form.getHeaders(),
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return Array.isArray(response.data) ? response.data[0] : null;
}

async function uploadWithRetry(filePath, filename, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await uploadToStrapi(filePath, filename);
    } catch (err) {
      lastErr = err;
      const wait = 500 + i * 800;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastErr;
}

function collectFileLinks(obj, list) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectFileLinks(item, list));
    return;
  }
  if (typeof obj !== 'object') return;
  if (Array.isArray(obj.fileLinks)) {
    obj.fileLinks.forEach((link) => list.push(link));
  }
  Object.entries(obj).forEach(([key, val]) => {
    if (key === 'fileLinks') return;
    if (val && typeof val === 'object') collectFileLinks(val, list);
  });
}

function isStrapiLink(href) {
  const raw = String(href || '').trim();
  if (!raw) return false;
  if (raw.startsWith(STRAPI_URL)) return true;
  if (raw.startsWith('/uploads/')) return true;
  return false;
}

async function resolveUploadedUrl(link, cache) {
  const rawHref = String(link?.href || '').trim();
  if (!rawHref) return null;
  if (isStrapiLink(rawHref)) return rawHref.startsWith('http') ? rawHref : `${STRAPI_URL}${rawHref}`;
  if (!ALLOW_REMOTE) return null;

  const remoteUrl = normalizeUrl(rawHref);
  if (!remoteUrl) return null;
  if (cache[remoteUrl]) return cache[remoteUrl];

  ensureDir(DOWNLOAD_DIR);
  const filename = safeFilenameFromUrl(remoteUrl);
  const filePath = path.join(DOWNLOAD_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  • download: ${remoteUrl}`);
      await downloadFile(remoteUrl, filePath);
    }
    console.log(`  • upload: ${filename}`);
    const uploaded = await uploadWithRetry(filePath, filename, 3);
    if (!uploaded?.url) return null;
    const strapiUrl = uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`;
    cache[remoteUrl] = strapiUrl;
    return strapiUrl;
  } catch (err) {
    const status = err?.response?.status;
    const detail =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.response?.statusText ||
      '';
    const code = err?.code;
    const msg = err?.message || err;
    const note = [status, code, detail || msg].filter(Boolean).join(' ');
    console.error(`  ✖ failed: ${remoteUrl} (${note || 'error'})`);
    return null;
  }
}

async function main() {
  const specPath = path.join(specDir, `${slug}_spec.json`);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  const fileLinks = [];
  collectFileLinks(spec, fileLinks);
  if (!fileLinks.length) {
    console.log('⚠️  Нет fileLinks, пропускаем.');
    return;
  }

  const cache = loadCache();
  const missing = [];
  let updated = 0;
  const total = fileLinks.length;
  for (let idx = 0; idx < total; idx += 1) {
    const link = fileLinks[idx];
    const label = String(link?.text || link?.href || '').trim();
    console.log(`\n[${idx + 1}/${total}] ${label || 'file'}`);
    const strapiUrl = await resolveUploadedUrl(link, cache);
    if (strapiUrl) {
      link.href = strapiUrl;
      updated += 1;
    } else {
      missing.push(link?.href || link?.text || 'unknown');
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  saveCache(cache);

  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(`✅ Spec updated: ${specPath}`);
  console.log(`✅ Updated links: ${updated}`);

  if (missing.length) {
    console.log('\n⚠️  Не удалось загрузить некоторые файлы:');
    missing.slice(0, 20).forEach((item) => console.log(`  - ${item}`));
    if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);
  }

  const importScript = path.join(__dirname, 'migration/import-spec-pages.js');
  console.log(`\n➡️  Import spec via ${importScript}`);
  const { spawnSync } = require('child_process');
  const result = spawnSync('node', [importScript, '--slug', slug, '--dir', specDir], {
    stdio: 'inherit',
    env: { ...process.env, STRAPI_API_TOKEN: API_TOKEN },
  });
  if (result.status !== 0) {
    throw new Error('import-spec-pages.js failed');
  }

  console.log(`✅ Page updated: ${slug}`);
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
