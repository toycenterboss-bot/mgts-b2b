/**
 * Upload purchas page files to Strapi Media Library and replace fileLinks in spec.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node update-purchas-files.js --slug purchas
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
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
const DEFAULT_DIR = path.join(__dirname, '../data/page-analysis-llm/branches/2026-01-22');
const ALLOW_REMOTE = String(process.env.ALLOW_REMOTE_FILES || 'true').toLowerCase() !== 'false';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const slug = getArg('--slug') || 'purchas';
const specDir = getArg('--dir') || process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;
const filesDir = getArg('--files-dir') || path.join(specDir, 'purchas_files');

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

const CACHE_FILE = path.join(__dirname, '../temp/purchas-files-cache.json');
const DOWNLOAD_DIR = path.join(__dirname, '../temp/purchas-files-downloads');

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

function normalizeKey(name) {
  const base = path.basename(String(name || '')).trim();
  if (!base) return '';
  const collapsed = base.replace(/\s+/g, '_').replace(/__+/g, '_');
  let cleaned = collapsed.replace(/_(\d+)(?=[_.]*\.[^.]+$)/g, '');
  cleaned = cleaned.replace(/_+(?=\.[^.]+$)/, '');
  return cleaned.toLowerCase();
}

function normalizeLooseKey(name) {
  return normalizeKey(name).replace(/[_-]/g, '');
}

function truncateFilename(filename, maxLen = 120) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  if (filename.length <= maxLen) return filename;
  const keep = Math.max(1, maxLen - ext.length);
  return `${base.slice(0, keep)}${ext}`;
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

function collectFileLinks(sections) {
  const list = [];
  (sections || []).forEach((section) => {
    const fileLinks = section?.links?.fileLinks || [];
    if (fileLinks.length) {
      fileLinks.forEach((link) => list.push({ link, sectionIndex: section.sectionIndex }));
    }
  });
  return list;
}

function buildLocalMap() {
  if (!fs.existsSync(filesDir)) return { map: new Map(), files: [] };
  const files = fs
    .readdirSync(filesDir)
    .filter((file) => !file.startsWith('.') && !file.endsWith('.crdownload'));
  const map = new Map();
  files.forEach((file) => {
    const key = normalizeKey(file);
    const looseKey = normalizeLooseKey(file);
    const rawKey = path.basename(file).toLowerCase();
    map.set(rawKey, file);
    map.set(key, file);
    map.set(looseKey, file);
  });
  return { map, files };
}

function resolveLocalFile(link, fileMap) {
  const candidates = [
    link?.href ? path.basename(link.href) : '',
    link?.fileName ? path.basename(link.fileName) : '',
  ].filter(Boolean);

  const expanded = [...candidates];
  candidates.forEach((candidate) => {
    const withoutDoubleSuffix = candidate.replace(/__\d+(?=\.[^.]+$)/g, '');
    if (withoutDoubleSuffix && withoutDoubleSuffix !== candidate) {
      expanded.push(withoutDoubleSuffix);
    }
  });

  for (const candidate of expanded) {
    const rawKey = candidate.toLowerCase();
    const normalized = normalizeKey(candidate);
    const loose = normalizeLooseKey(candidate);
    if (fileMap.has(rawKey)) return fileMap.get(rawKey);
    if (fileMap.has(normalized)) return fileMap.get(normalized);
    if (fileMap.has(loose)) return fileMap.get(loose);
  }
  return null;
}

async function resolveUploadedUrl(link, cache, fileMap) {
  const localMatch = resolveLocalFile(link, fileMap);
  if (localMatch) {
    const localPath = path.join(filesDir, localMatch);
    const cacheKey = `local:${localPath}`;
    if (cache[cacheKey]) return cache[cacheKey];
    console.log(`  • upload (local): ${localMatch}`);
    const uploaded = await uploadToStrapi(localPath, localMatch);
    if (!uploaded?.url) return null;
    const strapiUrl = uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`;
    cache[cacheKey] = strapiUrl;
    return strapiUrl;
  }

  const rawHref = String(link?.href || '').trim();
  if (!rawHref || !ALLOW_REMOTE) return null;

  const remoteUrl = rawHref.startsWith('http')
    ? rawHref
    : rawHref.startsWith('/')
      ? `https://business.mgts.ru${rawHref}`
      : `https://business.mgts.ru/${rawHref}`;
  const cacheKey = `remote:${remoteUrl}`;
  if (cache[cacheKey]) return cache[cacheKey];

  ensureDir(DOWNLOAD_DIR);
  const filename = path.basename(remoteUrl) || 'file';
  const filePath = path.join(DOWNLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  • download (remote): ${remoteUrl}`);
    await downloadFile(remoteUrl, filePath);
  }
  console.log(`  • upload (remote): ${filename}`);
  const uploaded = await uploadToStrapi(filePath, filename);
  if (!uploaded?.url) return null;
  const strapiUrl = uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`;
  cache[cacheKey] = strapiUrl;
  return strapiUrl;
}

async function main() {
  const specPath = path.join(specDir, `${slug}_spec.json`);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  const fileLinks = collectFileLinks(spec.sections || []);
  if (!fileLinks.length) {
    console.log('⚠️  Нет fileLinks, пропускаем.');
    return;
  }

  const { map: fileMap, files: localFiles } = buildLocalMap();
  console.log(`📁 Local files: ${localFiles.length} (${filesDir})`);

  const cache = loadCache();
  const missing = [];
  for (const item of fileLinks) {
    const strapiUrl = await resolveUploadedUrl(item.link, cache, fileMap);
    if (strapiUrl) {
      item.link.href = strapiUrl;
    } else {
      missing.push({ sectionIndex: item.sectionIndex, fileName: item.link?.fileName, href: item.link?.href });
    }
  }
  saveCache(cache);

  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  console.log(`✅ Spec updated: ${specPath}`);

  if (missing.length) {
    console.log('\n⚠️  Не удалось загрузить некоторые файлы:');
    missing.forEach((item) => {
      console.log(`  - section ${item.sectionIndex}: ${item.fileName || item.href || 'unknown'}`);
    });
  }

  const res = await api.get('/pages', {
    params: {
      'filters[slug][$eq]': slug,
      'populate[sections][populate]': '*',
    },
  });
  const page = Array.isArray(res.data?.data) ? res.data.data[0] : null;
  if (!page) throw new Error(`Page not found: ${slug}`);
  const pageId = page.documentId || page.id;

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

  console.log(`✅ Page updated: ${slug} (id=${pageId})`);
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
