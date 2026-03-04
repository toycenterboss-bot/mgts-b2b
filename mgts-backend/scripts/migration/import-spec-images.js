#!/usr/bin/env node
/**
 * Import images referenced in *_spec.json (paths like /images/...).
 *
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/migration/import-spec-images.js
 *
 * Env:
 *   STRAPI_URL (default http://localhost:1337)
 *   MGTS_PAGE_ANALYSIS_DIR (default branches/2026-01-22)
 *   MGTS_IMAGES_BASE (default https://business.mgts.ru)
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
const IMAGES_BASE = process.env.MGTS_IMAGES_BASE || 'https://business.mgts.ru';
const DEFAULT_DIR = path.join(
  __dirname,
  '../../data/page-analysis-llm/branches/2026-01-22'
);
const SPEC_DIR = process.env.MGTS_PAGE_ANALYSIS_DIR || DEFAULT_DIR;
const DOWNLOAD_TIMEOUT_MS = Number(process.env.MGTS_IMAGES_TIMEOUT_MS || 20000);
const IMAGES_LIMIT = Number(process.env.MGTS_IMAGES_LIMIT || 0);
const RETRIES = Number(process.env.MGTS_IMAGES_RETRIES || 2);
const RETRY_DELAY_MS = Number(process.env.MGTS_IMAGES_RETRY_DELAY_MS || 400);
const USER_AGENT = process.env.MGTS_IMAGES_UA || 'Mozilla/5.0 (compatible; mgts-import/1.0)';

const DOWNLOAD_DIR = path.join(__dirname, '../../temp/spec-images-downloads');
const CACHE_FILE = path.join(__dirname, '../../temp/spec-images-cache.json');
const REPORT_FILE = path.join(__dirname, '../../temp/spec-images-import-report.json');

if (!API_TOKEN) {
  console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
  process.exit(1);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  ensureDir(path.dirname(CACHE_FILE));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function safeNameFromUrl(url) {
  const clean = String(url || '').split('?')[0];
  const base = path.basename(clean);
  const ext = path.extname(base) || '.bin';
  const normalized = String(base || '').replace(/[^a-z0-9._-]/gi, '_');
  if (normalized && normalized.length <= 100) return normalized;
  const hash = crypto.createHash('sha1').update(clean).digest('hex');
  return `${hash}${ext}`;
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    const req = protocol.get(
      url,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'image/*,*/*;q=0.8',
        },
      },
      (response) => {
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
      }
    );

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(err);
    });

    req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout after ${DOWNLOAD_TIMEOUT_MS}ms`));
    });
  });
}

async function uploadToStrapi(filePath, filename) {
  const form = new FormData();
  form.append('files', fs.createReadStream(filePath), filename);
  try {
    const res = await axios.post(`${STRAPI_URL}/api/upload`, form, {
      headers: { Authorization: `Bearer ${API_TOKEN}`, ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000,
    });
    return res.data && res.data[0] ? res.data[0] : null;
  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.error?.message || err?.message || 'upload failed';
    throw new Error(status ? `HTTP ${status}: ${msg}` : msg);
  }
}

function extractImagePathsFromSpec(specJson) {
  const content = JSON.stringify(specJson);
  // Only accept real image filenames (avoid truncated paths like "/images/ru" or "/images/win10-")
  const re = /\/images\/[A-Za-z0-9._-]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^"'\\s)]*)?/gi;
  const matches = content.match(re) || [];
  return matches;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetries(fn) {
  let lastErr = null;
  for (let i = 0; i <= RETRIES; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (i < RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

async function main() {
  ensureDir(DOWNLOAD_DIR);
  const cache = loadCache();
  const report = {
    startedAt: new Date().toISOString(),
    total: 0,
    uploaded: [],
    failed: [],
  };

  const files = fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith('_spec.json'));
  const urls = new Set();

  for (const file of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, file), 'utf-8'));
    extractImagePathsFromSpec(spec).forEach((p) => urls.add(p));
  }

  let urlList = Array.from(urls);
  if (IMAGES_LIMIT > 0) urlList = urlList.slice(0, IMAGES_LIMIT);
  report.total = urlList.length;
  console.log(`\n🖼️  Found image paths in specs: ${urls.size}`);
  if (IMAGES_LIMIT > 0) console.log(`🧪 Limit enabled: ${IMAGES_LIMIT}`);
  console.log('');

  let index = 0;
  for (const relPath of urlList) {
    index += 1;
    const abs = relPath.startsWith('http') ? relPath : `${IMAGES_BASE}${relPath.startsWith('/') ? '' : '/'}${relPath}`;
    if (cache[abs]) {
      console.log(`  • skip cached (${index}/${urlList.length})`);
      continue;
    }

    const filename = safeNameFromUrl(abs);
    const filePath = path.join(DOWNLOAD_DIR, filename);

    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).size === 0) {
        fs.unlinkSync(filePath);
      }
      if (!fs.existsSync(filePath)) {
        console.log(`  • download (${index}/${urlList.length}): ${abs}`);
        await withRetries(() => downloadFile(abs, filePath));
      }
      console.log(`  • upload (${index}/${urlList.length}): ${filename}`);
      const uploaded = await withRetries(() => uploadToStrapi(filePath, filename));
      if (!uploaded?.id) throw new Error('upload failed');
      cache[abs] = uploaded.id;
      report.uploaded.push({ url: abs, filename, id: uploaded.id });
    } catch (err) {
      // If we used a corrupted partial file, force re-download once.
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log(`  • retry fresh (${index}/${urlList.length}): ${abs}`);
        await downloadFile(abs, filePath);
        const uploaded = await uploadToStrapi(filePath, filename);
        if (!uploaded?.id) throw new Error('upload failed');
        cache[abs] = uploaded.id;
        report.uploaded.push({ url: abs, filename, id: uploaded.id, note: 'retry-fresh' });
        continue;
      } catch (err2) {
        report.failed.push({
          url: abs,
          reason: String(err2?.message || err2 || err?.message || err),
        });
      }
    }
  }

  saveCache(cache);
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report: ${REPORT_FILE}\n`);
}

main().catch((err) => {
  console.error(`\n❌ Ошибка: ${err.message}\n`);
  process.exit(1);
});
