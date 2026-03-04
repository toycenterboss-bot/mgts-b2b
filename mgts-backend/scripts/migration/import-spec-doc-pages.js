/**
 * Import *_spec.json doc pages (TPL_Doc_Page) with file uploads.
 *
 * Usage:
 *   node import-spec-doc-pages.js --slug documents
 *   node import-spec-doc-pages.js --slugs documents,tariffs
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   STRAPI_API_TOKEN (required unless --dry-run)
 *   MGTS_PAGE_ANALYSIS_DIR (default branches/2026-01-22)
 *   MGTS_DOC_MAX_SIZE_MB (default 10)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const DEFAULT_DIR = path.join(
  __dirname,
  '../../data/page-analysis-llm/branches/2026-01-22'
);
const MAX_SIZE_MB = Number(process.env.MGTS_DOC_MAX_SIZE_MB || 0);
const FILES_BASE_URL = process.env.MGTS_FILES_BASE || 'https://business.mgts.ru';

const CACHE_FILE = path.join(__dirname, '../../temp/doc-files-cache.json');
const DOWNLOAD_DIR = path.join(__dirname, '../../temp/doc-files-downloads');
const REPORT_FILE = path.join(__dirname, '../../temp/doc-files-import-report.json');

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex((arg) => arg === name);
  return idx >= 0 ? args[idx + 1] : null;
};

const dryRun = args.includes('--dry-run');
const specDir = getArg('--dir') || process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;
const slugArg = getArg('--slug');
const slugsArg = getArg('--slugs');

if (!dryRun && !API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен. Используйте --dry-run или задайте токен.\n');
  process.exit(1);
}

function requestJson(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, STRAPI_URL);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 800)}`));
          }
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}

function saveCache(cache) {
  ensureDir(path.dirname(CACHE_FILE));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function toRichText(text) {
  if (!text) return '';
  const chunks = String(text)
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!chunks.length) return '';
  return chunks.map((chunk) => `<p>${chunk}</p>`).join('\n');
}

function slugifyKey(input) {
  const cleaned = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned;
}

function mapFileTypeFromLink(link) {
  const fromLink = String(link?.fileType || '').trim().toLowerCase();
  const ext = String(path.extname(String(link?.href || '')).toLowerCase()).replace('.', '');
  const raw = fromLink || ext;
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip'].includes(raw)) return raw;
  return 'other';
}

function extractYearFromLink(link) {
  const text = `${link?.text || ''} ${link?.href || ''}`;
  const match = text.match(/20\d{2}/);
  return match ? match[0] : '';
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);

    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return downloadFile(response.headers.location, filePath)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return reject(new Error(`HTTP ${response.statusCode}`));
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });
  });
}

async function uploadToStrapi(filePath, filename) {
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

  return response.data && response.data[0] ? response.data[0] : null;
}

function fileNameFromUrl(url) {
  const clean = String(url || '').split('?')[0];
  const base = path.basename(clean);
  const ext = path.extname(base) || path.extname(clean);
  const safeBase = String(base || '').replace(/[^a-z0-9._-]/gi, '_');
  if (safeBase && safeBase.length <= 80) return safeBase;
  const hash = crypto.createHash('sha1').update(clean).digest('hex');
  return `${hash}${ext || '.bin'}`;
}

function normalizeUrl(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^["']+|["']+$/g, '');
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    const rel = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    try {
      return new URL(rel, FILES_BASE_URL).toString();
    } catch (err) {
      return '';
    }
  }
  try {
    return new URL(cleaned).toString();
  } catch (err) {
    try {
      return new URL(encodeURI(cleaned)).toString();
    } catch (err2) {
      return '';
    }
  }
}

function resolveLocalFilePath(rawHref, specDirRoot, slug) {
  const href = String(rawHref || '').trim();
  if (!href) return '';
  const baseName = path.basename(href.split('?')[0]);
  if (!baseName) return '';

  const slugFolder = `${slug}_files`;
  const stripSuffix = (name) => name.replace(/_\d+(?=\.[^.]+$)/, '');
  const normalize = (name) => stripSuffix(name).replace(/__+/g, '_').toLowerCase();

  const candidates = [path.join(specDirRoot, slugFolder, baseName)];

  const match = href.match(/([^/]+_files)\/[^/]+$/);
  if (match && match[1]) {
    candidates.push(path.join(specDirRoot, match[1], baseName));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const folder = path.join(specDirRoot, slugFolder);
  if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
    const target = normalize(baseName);
    const files = fs.readdirSync(folder);
    const match = files.find((file) => normalize(file) === target);
    if (match) return path.join(folder, match);
  }
  return '';
}

async function resolveFileId(link, cache, report, knownYears) {
  const rawHref = link?.href || '';
  const localPath = resolveLocalFilePath(rawHref, specDir, String(link?.pageSlug || '') || '');
  if (localPath) {
    const localKey = `local:${path.resolve(localPath)}`;
    if (cache[localKey]) return cache[localKey];
    if (dryRun) return null;
    try {
      const localName = path.basename(localPath);
      console.log(`  • upload local: ${localName}`);
      const localUpload = await uploadToStrapi(localPath, localName);
      if (!localUpload?.id) {
        report.failed.push({ url: rawHref, filename: localName, reason: 'upload failed' });
        return null;
      }
      cache[localKey] = localUpload.id;
      report.uploaded.push({
        url: rawHref,
        filename: localName,
        id: localUpload.id,
        sizeMB: Number((fs.statSync(localPath).size / 1024 / 1024).toFixed(2)),
      });
      return localUpload.id;
    } catch (uploadErr) {
      report.failed.push({ url: rawHref, filename: path.basename(localPath), reason: uploadErr.message || 'upload failed' });
      return null;
    }
  }

  const url = normalizeUrl(rawHref);
  if (!url) {
    report.failed.push({ url: String(link?.href || ''), reason: 'invalid url' });
    return null;
  }

  if (cache[url]) return cache[url];
  if (dryRun) return null;

  ensureDir(DOWNLOAD_DIR);

  const filename = fileNameFromUrl(url);
  const filePath = path.join(DOWNLOAD_DIR, filename);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  • download: ${url}`);
      await downloadFile(url, filePath);
    }
  } catch (err) {
    const localPath = resolveLocalFilePath(rawHref, specDir, String(link?.pageSlug || '') || '');
    if (!localPath) {
      report.failed.push({ url, filename, reason: err.message || 'download failed' });
      return null;
    }
    report.fallbackLocal = report.fallbackLocal || [];
    report.fallbackLocal.push({ url, localPath });
    try {
      const localName = path.basename(localPath);
      const localUpload = await uploadToStrapi(localPath, localName);
      if (!localUpload?.id) {
        report.failed.push({ url, filename: localName, reason: 'upload failed' });
        return null;
      }
      cache[url] = localUpload.id;
      report.uploaded.push({
        url,
        filename: localName,
        id: localUpload.id,
        sizeMB: Number((fs.statSync(localPath).size / 1024 / 1024).toFixed(2)),
      });
      return localUpload.id;
    } catch (uploadErr) {
      report.failed.push({ url, filename, reason: uploadErr.message || 'upload failed' });
      return null;
    }
  }

  const stats = fs.statSync(filePath);
  const sizeMB = stats.size / 1024 / 1024;
  if (Number.isFinite(MAX_SIZE_MB) && MAX_SIZE_MB > 0 && sizeMB >= MAX_SIZE_MB) {
    report.skippedLarge.push({ url, filename, sizeMB });
    return null;
  }

  let uploaded = null;
  try {
    console.log(`  • upload: ${filename}`);
    uploaded = await uploadToStrapi(filePath, filename);
  } catch (err) {
    report.failed.push({ url, filename, reason: err.message || 'upload failed' });
    return null;
  }
  if (!uploaded?.id) {
    report.failed.push({ url, filename, reason: 'upload failed' });
    return null;
  }

  cache[url] = uploaded.id;
  report.uploaded.push({
    url,
    filename,
    id: uploaded.id,
    sizeMB: Number(sizeMB.toFixed(2)),
  });
  if (knownYears.size > 0) {
    const year = extractYearFromLink(link);
    if (year && knownYears.has(year)) report.yearMatched.push({ url, year });
  }
  return uploaded.id;
}

function buildDocumentTabs(section, typeLabel) {
  const tabs = Array.isArray(section?.tabs) ? section.tabs.filter(Boolean) : [];
  if (!tabs.length) return null;
  const defaultTab = Math.max(0, tabs.findIndex((tab) => tab?.isActive));

  return {
    __component: 'page.document-tabs',
    title: section?.title || typeLabel || '',
    defaultTab: defaultTab >= 0 ? defaultTab : 0,
    tabs: tabs.map((tab, idx) => {
      const name = tab?.title || `Tab ${idx + 1}`;
      const filterKey = slugifyKey(name);
      const contentTitle = tab?.content?.title || '';
      const contentText = tab?.content?.text || '';
      const content = [contentTitle, contentText].filter(Boolean).join('\n\n');
      return {
        name,
        order: idx,
        filterKey,
        content: toRichText(content),
      };
    }),
  };
}

function collectDocLinksFromSection(section, categoryKey) {
  const fileLinks = section?.content?.links?.fileLinks || section?.links?.fileLinks || [];
  return fileLinks.map((link) => ({
    ...link,
    categoryKey,
  }));
}

function collectGenericFileLinks(section) {
  const buckets = [];
  if (section?.links?.fileLinks) buckets.push(...section.links.fileLinks);
  if (section?.content?.links?.fileLinks) buckets.push(...section.content.links.fileLinks);
  return buckets;
}

async function buildFilesTable(fileLinks, knownYears, cache, report) {
  const files = [];
  const seen = new Set();
  for (const link of fileLinks) {
    const url = String(link?.href || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const fileId = await resolveFileId(link, cache, report, knownYears);
    if (!fileId) continue;

    const categoryKey =
      link?.categoryKey ||
      (knownYears.size > 0 ? extractYearFromLink(link) : '') ||
      '';

    files.push({
      name: link?.text || fileNameFromUrl(url),
      file: fileId,
      fileType: mapFileTypeFromLink(link),
      categoryKey,
      size: '',
      description: link?.purpose || '',
      order: files.length,
    });
  }

  if (!files.length) return null;
  return {
    __component: 'page.files-table',
    title: 'Документы',
    columns: [
      { name: 'Название', key: 'name' },
      { name: 'Тип', key: 'fileType' },
      { name: 'Размер', key: 'size' },
    ],
    files,
  };
}

function pickContentHeader(spec) {
  return (spec?.sections || []).find((s) => s?.type === 'content-header') || null;
}

function resolveSpecPath(slug) {
  return path.join(specDir, `${slug}_spec.json`);
}

async function importDocPage(spec, cache, report) {
  const slug = spec?.page?.slug;
  if (!slug) return;

  const contentHeader = pickContentHeader(spec);
  const title = spec?.metadata?.title || contentHeader?.title || slug;
  const subtitle = contentHeader?.text || '';

  const sections = [];
  if (contentHeader?.title || contentHeader?.text) {
    const content = [contentHeader?.title || '', contentHeader?.text || '']
      .filter(Boolean)
      .join('\n\n');
    sections.push({
      __component: 'page.section-text',
      title: contentHeader?.title || '',
      content: toRichText(content),
    });
  }

  const tabsSection = (spec?.sections || []).find((s) => s?.type === 'tabs-section');
  const yearTabsSection = (spec?.sections || []).find((s) => s?.type === 'year-filter-tabs');
  const tabsComponent = tabsSection ? buildDocumentTabs(tabsSection, 'Категории') : null;
  const yearTabsComponent = yearTabsSection ? buildDocumentTabs(yearTabsSection, 'Годы') : null;

  if (tabsComponent) sections.push(tabsComponent);
  if (yearTabsComponent) sections.push(yearTabsComponent);

  const knownYears = new Set(
    (yearTabsSection?.tabs || [])
      .map((t) => String(t?.title || '').trim())
      .filter((t) => /^\d{4}$/.test(t))
  );

  const fileLinks = [];
  if (tabsSection?.tabs) {
    tabsSection.tabs.forEach((tab) => {
      const key = slugifyKey(tab?.title || '');
      const links = collectDocLinksFromSection(tab, key).map((link) => ({
        ...link,
        pageSlug: slug,
      }));
      fileLinks.push(...links);
    });
  }

  const filesList = (spec?.sections || []).find((s) => s?.type === 'files-list');
  if (filesList?.links?.fileLinks) {
    filesList.links.fileLinks.forEach((link) =>
      fileLinks.push({
        ...link,
        pageSlug: slug,
      })
    );
  }

  for (const section of spec?.sections || []) {
    const links = collectGenericFileLinks(section);
    links.forEach((link) =>
      fileLinks.push({
        ...link,
        pageSlug: slug,
      })
    );
  }

  const filesTable = await buildFilesTable(fileLinks, knownYears, cache, report);
  if (filesTable) sections.push(filesTable);

  const payload = {
    slug,
    title,
    template: 'TPL_Doc_Page',
    section: 'other',
    hero: {
      title,
      subtitle,
      ctaButtons: [],
    },
    sections,
  };

  if (dryRun) {
    console.log(`· dry-run: ${slug}`);
    return;
  }

  const find = await requestJson('GET', `/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`);
  const existing = Array.isArray(find?.data) ? find.data[0] : null;
  if (existing?.id || existing?.documentId) {
    const targetId = existing?.documentId || existing?.id;
    console.log(`↺ Обновление страницы: ${slug}`);
    await requestJson('PUT', `/api/pages/${targetId}`, { data: payload });
  } else {
    console.log(`＋ Создание страницы: ${slug}`);
    await requestJson('POST', '/api/pages', { data: payload });
  }
}

async function main() {
  const slugs = [];
  if (slugArg) slugs.push(slugArg);
  if (slugsArg) slugs.push(...slugsArg.split(',').map((s) => s.trim()).filter(Boolean));

  if (!slugs.length) {
    console.error('\n❌ Укажите --slug или --slugs\n');
    process.exit(1);
  }

  console.log(`\n📦 Импорт doc spec из: ${specDir}`);
  console.log(`🔎 Страницы: ${slugs.join(', ')}\n`);

  const cache = loadCache();
  const report = {
    startedAt: new Date().toISOString(),
    uploaded: [],
    skippedLarge: [],
    failed: [],
    yearMatched: [],
  };

  for (const slug of slugs) {
    const filePath = resolveSpecPath(slug);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Spec не найден: ${filePath}`);
      continue;
    }
    const spec = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    await importDocPage(spec, cache, report);
    saveCache(cache);
  }

  ensureDir(path.dirname(REPORT_FILE));
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n📄 Отчет: ${REPORT_FILE}`);
}

main().catch((err) => {
  console.error(`\n❌ Ошибка: ${err.message}\n`);
  process.exit(1);
});
