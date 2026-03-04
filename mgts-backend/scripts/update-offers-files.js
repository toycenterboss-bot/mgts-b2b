/**
 * Upload offers file links to Strapi Media Library and replace fileLinks in spec.
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node update-offers-files.js --slug offers
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

const slug = getArg('--slug') || 'offers';
const specDir = getArg('--dir') || process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;

if (!API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
  process.exit(1);
}

const CACHE_FILE = path.join(__dirname, `../temp/${slug}-files-cache.json`);
const DOWNLOAD_DIR = path.join(__dirname, `../temp/${slug}-files-downloads`);
const SPINNER_FRAMES = ['-', '\\', '|', '/'];
const SPINNER_INTERVAL_MS = Number(process.env.SPINNER_INTERVAL_MS || 2000);
const UPLOAD_TIMEOUT_MS = Number(process.env.STRAPI_UPLOAD_TIMEOUT_MS || 90000);
const UPLOAD_RESPONSE_WAIT_MS = Number(process.env.STRAPI_UPLOAD_RESPONSE_WAIT_MS || 30000);

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function startSpinner(label, getStatus) {
  const start = Date.now();
  let frame = 0;
  let lastLen = 0;
  const timer = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const status = getStatus ? String(getStatus() || '') : '';
    const line = `${label} ${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]} ${elapsed}s${status ? ` ${status}` : ''}`;
    const pad = lastLen > line.length ? ' '.repeat(lastLen - line.length) : '';
    process.stdout.write(`\r${line}${pad}`);
    lastLen = line.length;
    frame += 1;
  }, SPINNER_INTERVAL_MS);
  return (status = 'OK', suffix = '') => {
    clearInterval(timer);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const tail = suffix ? ` ${suffix}` : '';
    const line = `${label} ${status} ${elapsed}s${tail}`;
    const pad = lastLen > line.length ? ' '.repeat(lastLen - line.length) : '';
    process.stdout.write(`\r${line}${pad}\n`);
  };
}

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
    // ignore
  }
  name = name.replace(/[\\\/?%*:|"<>]/g, '_').replace(/\s+/g, '_');
  if (!name) name = 'file';
  return truncateFilename(name);
}

async function downloadFile(url, filePath, progress) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    file.on('error', (err) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(err);
    });
    const req = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (response.headers.location) {
          return downloadFile(response.headers.location, filePath, progress).then(resolve).catch(reject);
        }
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      if (progress) {
        progress.total = Number(response.headers['content-length'] || 0);
        response.on('data', (chunk) => {
          progress.received += chunk.length;
        });
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(err);
    });
    req.setTimeout(60000, () => {
      req.destroy(new Error('Timeout'));
    });
  });
}

async function uploadToStrapi(filePath, filename, progress) {
  const FormData = require('form-data');
  const safeName = truncateFilename(filename);
  const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  const form = new FormData();
  const stream = fs.createReadStream(filePath);
  if (progress) {
    progress.sent = 0;
    progress.total = fileSize;
    progress.lastAt = Date.now();
    progress.doneAt = null;
    stream.on('data', (chunk) => {
      progress.sent += chunk.length;
      progress.lastAt = Date.now();
      if (progress.sent >= progress.total && !progress.doneAt) {
        progress.doneAt = Date.now();
      }
    });
  }
  form.append('files', stream, safeName);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let watchdog = null;
  if (controller && progress) {
    watchdog = setInterval(() => {
      if (!progress.doneAt) return;
      const waited = Date.now() - progress.doneAt;
      if (waited > UPLOAD_RESPONSE_WAIT_MS) {
        controller.abort(new Error(`Response wait timeout after ${Math.round(waited / 1000)}s`));
      }
    }, 1000);
  }
  const response = await axios.post(`${STRAPI_URL}/api/upload`, form, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      ...form.getHeaders(),
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: UPLOAD_TIMEOUT_MS,
    signal: controller ? controller.signal : undefined,
  });
  if (watchdog) clearInterval(watchdog);
  return Array.isArray(response.data) ? response.data[0] : null;
}

async function uploadWithRetry(filePath, filename, attempts = 3, progress) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (i > 0) {
        console.log(`  • retry upload (${i + 1}/${attempts})`);
      }
      return await uploadToStrapi(filePath, filename, progress);
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
      const progress = { received: 0, total: 0 };
      const stop = startSpinner('  • download', () => {
        const total = progress.total;
        const received = progress.received;
        if (total > 0) {
          const pct = Math.floor((received / total) * 100);
          return `${formatBytes(received)}/${formatBytes(total)} ${pct}%`;
        }
        return formatBytes(received);
      });
      try {
        await downloadFile(remoteUrl, filePath, progress);
        stop('OK', remoteUrl);
      } catch (err) {
        stop('FAIL', String(err?.message || err));
        throw err;
      }
    } else {
      console.log(`  • download: cached ${filename}`);
    }
    const uploadProgress = {
      sent: 0,
      total: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      lastAt: Date.now(),
    };
    const stopUpload = startSpinner(`  • upload ${filename}`, () => {
      const sent = uploadProgress.sent;
      const total = uploadProgress.total;
      if (total > 0) {
        const pct = Math.floor((sent / total) * 100);
        const idle = Math.max(0, Math.floor((Date.now() - uploadProgress.lastAt) / 1000));
        const waiting = sent >= total ? `waiting ${idle}s` : `idle ${idle}s`;
        return `${formatBytes(sent)}/${formatBytes(total)} ${pct}% ${waiting}`;
      }
      return formatBytes(sent);
    });
    let uploaded;
    try {
      const startedAt = Date.now();
      uploaded = await uploadWithRetry(filePath, filename, 3, uploadProgress);
      stopUpload('OK');
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
      stopUpload('FAIL', note || 'error');
      throw err;
    }
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

  const linkGroups = new Map();
  fileLinks.forEach((link) => {
    if (!link) return;
    const rawHref = String(link.href || '').trim();
    if (!rawHref) return;
    const key = isStrapiLink(rawHref) ? rawHref : normalizeUrl(rawHref) || rawHref;
    if (!linkGroups.has(key)) linkGroups.set(key, []);
    linkGroups.get(key).push(link);
  });

  const entries = Array.from(linkGroups.entries());
  const total = entries.length;
  console.log(`Found ${fileLinks.length} links, ${total} unique file URLs.`);

  for (let idx = 0; idx < total; idx += 1) {
    const [key, group] = entries[idx];
    const sample = group[0];
    const label = String(sample?.text || sample?.href || '').trim();
    const suffix = group.length > 1 ? ` (x${group.length})` : '';
    console.log(`\n[${idx + 1}/${total}] ${label || key}${suffix}`);
    const strapiUrl = await resolveUploadedUrl(sample, cache);
    if (strapiUrl) {
      group.forEach((link) => {
        link.href = strapiUrl;
      });
      updated += 1;
    } else {
      missing.push(sample?.href || sample?.text || key || 'unknown');
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  saveCache(cache);
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  console.log(`\n✅ Updated ${updated}/${total} file links in ${specPath}`);
  if (missing.length) {
    console.log(`⚠️  Missing ${missing.length}:`);
    missing.slice(0, 15).forEach((m) => console.log(`  - ${m}`));
  }
}

main().catch((err) => {
  console.error('\n❌ Failed:', err);
  process.exit(1);
});
