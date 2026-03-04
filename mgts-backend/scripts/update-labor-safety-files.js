/**
 * Upload labor_safety file links to Strapi Media Library and add a documents table section.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node update-labor-safety-files.js --slug labor_safety
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   MGTS_FILES_BASE (default https://business.mgts.ru)
 *   MGTS_PAGE_ANALYSIS_DIR (default branches/2026-01-22)
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

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const slug = getArg('--slug') || 'labor_safety';
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

const CACHE_FILE = path.join(__dirname, '../temp/labor-safety-files-cache.json');
const DOWNLOAD_DIR = path.join(__dirname, '../temp/labor-safety-files-downloads');

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

async function resolveUploadedUrl(link, cache) {
  const rawHref = String(link?.href || '').trim();
  const normalized = normalizeUrl(rawHref);
  if (!normalized) return null;
  if (cache[normalized]) return cache[normalized];

  ensureDir(DOWNLOAD_DIR);
  const filename = fileNameFromUrl(normalized);
  const filePath = path.join(DOWNLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  • download: ${normalized}`);
    await downloadFile(normalized, filePath);
  }
  console.log(`  • upload: ${filename}`);
  const uploaded = await uploadToStrapi(filePath, filename);
  if (!uploaded?.url) return null;
  const strapiUrl = uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`;
  cache[normalized] = strapiUrl;
  return strapiUrl;
}

async function main() {
  const specPath = path.join(specDir, `${slug}_spec.json`);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  const hero = (spec.sections || []).find((s) => s?.type === 'hero');
  const fileLinks = hero?.links?.fileLinks || [];
  if (!fileLinks.length) {
    console.log('⚠️  Нет fileLinks в hero, пропускаем.');
    return;
  }

  const cache = loadCache();
  for (const link of fileLinks) {
    const strapiUrl = await resolveUploadedUrl(link, cache);
    if (strapiUrl) link.href = strapiUrl;
  }
  saveCache(cache);

  const res = await api.get('/pages', {
    params: {
      'filters[slug][$eq]': slug,
      'populate[sections][populate]': '*',
    },
  });
  const page = Array.isArray(res.data?.data) ? res.data.data[0] : null;
  if (!page) throw new Error(`Page not found: ${slug}`);
  const pageId = page.documentId || page.id;
  const sections = Array.isArray(page.sections) ? page.sections : page.attributes?.sections || [];

  const tableData = [
    ['Документ', 'Описание', 'Файл'],
    ...fileLinks.map((file) => [
      file?.text || 'Документ',
      file?.purpose || '',
      {
        text: file?.text || 'Скачать',
        href: file?.href || '',
        isExternal: true,
        download: true,
      },
    ]),
  ];

  const docsSection = {
    __component: 'page.section-table',
    title: 'Документы',
    description: '',
    tableData,
  };

  const filtered = sections.filter(
    (section) =>
      !(
        section?.__component === 'page.section-table' &&
        String(section?.title || '').toLowerCase().includes('документ')
      )
  );
  filtered.push(docsSection);

  await api.put(`/pages/${pageId}`, { data: { sections: stripComponentIds(filtered) } });
  console.log('✅ Документы добавлены в Strapi страницу.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  });
}
