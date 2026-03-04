/**
 * Import infoformen spec into Strapi, uploading all linked files to Media Library
 * and rewiring file links to Strapi URLs.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node import-infoformen-with-media.js --slug infoformen
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   STRAPI_API_TOKEN (required)
 *   MGTS_PAGE_ANALYSIS_DIR (default temp/page-analysis-llm)
 *   MGTS_FILES_BASE (default https://business.mgts.ru)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const axios = require('axios');
const { spawnSync } = require('child_process');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const FILES_BASE_URL = process.env.MGTS_FILES_BASE || 'https://business.mgts.ru';
const DEFAULT_DIR = path.join(__dirname, '../../temp/page-analysis-llm');

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const slug = getArg('--slug') || 'infoformen';
const specDir = getArg('--dir') || process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;

if (!API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
  process.exit(1);
}

const CACHE_FILE = path.join(__dirname, '../../temp/infoformen-files-cache.json');
const DOWNLOAD_DIR = path.join(__dirname, '../../temp/infoformen-files-downloads');
const REPORT_FILE = path.join(__dirname, '../../temp/infoformen-files-import-report.json');

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
    const base = path.basename(pathname);
    return base || 'file';
  } catch {
    return path.basename(String(url || 'file'));
  }
}

function trimFilename(filename, maxLength = 120) {
  const name = String(filename || 'file').trim() || 'file';
  if (name.length <= maxLength) return name;
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const maxBaseLength = Math.max(1, maxLength - ext.length);
  return `${base.slice(0, maxBaseLength)}${ext}`;
}

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
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
  const form = new FormData();
  form.append('files', fs.createReadStream(filePath), filename);
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

async function resolveUploadedUrl(link, cache, report) {
  const rawHref = String(link?.href || '').trim();
  const normalized = normalizeUrl(rawHref);
  if (!normalized) {
    report.failed.push({ url: rawHref, reason: 'invalid url' });
    return null;
  }
  if (cache[normalized]) return cache[normalized];

  ensureDir(DOWNLOAD_DIR);
  const filename = trimFilename(fileNameFromUrl(normalized));
  const filePath = path.join(DOWNLOAD_DIR, filename);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  • download: ${normalized}`);
      await downloadFile(normalized, filePath);
    }
  } catch (err) {
    report.failed.push({ url: normalized, filename, reason: err.message || 'download failed' });
    return null;
  }

  let uploaded;
  try {
    console.log(`  • upload: ${filename}`);
    uploaded = await uploadToStrapi(filePath, filename);
  } catch (err) {
    report.failed.push({ url: normalized, filename, reason: err.message || 'upload failed' });
    return null;
  }

  if (!uploaded?.url) {
    report.failed.push({ url: normalized, filename, reason: 'upload failed' });
    return null;
  }

  const strapiUrl = uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`;
  cache[normalized] = strapiUrl;
  report.uploaded.push({
    url: normalized,
    filename,
    strapiUrl,
  });
  return strapiUrl;
}

function collectFileLinkRefs(spec) {
  const refs = [];
  const sections = Array.isArray(spec?.sections) ? spec.sections : [];

  const pushLinks = (links) => {
    if (!Array.isArray(links)) return;
    links.forEach((link) => {
      if (link && link.href) refs.push(link);
    });
  };

  sections.forEach((section) => {
    if (!section) return;
    pushLinks(section?.links?.fileLinks);
    pushLinks(section?.content?.links?.fileLinks);

    if (Array.isArray(section?.elements)) {
      section.elements.forEach((el) => {
        if (el?.type === 'accordion' && Array.isArray(el?.items)) {
          el.items.forEach((item) => {
            pushLinks(item?.content?.fileLinks);
            pushLinks(item?.fileLinks);
          });
        }
      });
    }

    if (Array.isArray(section?.items)) {
      section.items.forEach((item) => {
        pushLinks(item?.content?.fileLinks);
        pushLinks(item?.fileLinks);
      });
    }
  });

  return refs;
}

async function main() {
  const specPath = path.join(specDir, `${slug}_spec.json`);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  console.log(`📄 Spec: ${specPath}`);
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

  const report = { uploaded: [], failed: [] };
  const cache = loadCache();

  const linkRefs = collectFileLinkRefs(spec);
  console.log(`📎 Найдено fileLinks: ${linkRefs.length}`);

  for (const link of linkRefs) {
    const strapiUrl = await resolveUploadedUrl(link, cache, report);
    if (strapiUrl) {
      link.href = strapiUrl;
    }
  }

  saveCache(cache);
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf-8');

  console.log(`✅ Обновлен spec с ссылками на Strapi Media: ${specPath}`);
  console.log(`📄 Отчет: ${REPORT_FILE}`);

  const importScript = path.join(__dirname, 'import-spec-pages.js');
  const result = spawnSync(
    process.execPath,
    [importScript, '--slug', slug, '--dir', specDir],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );

  if (result.status !== 0) {
    throw new Error(`import-spec-pages.js завершился с кодом ${result.status}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  });
}
