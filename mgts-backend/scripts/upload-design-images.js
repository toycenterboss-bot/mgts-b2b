#!/usr/bin/env node
/**
 * Upload images from design assets and code*.html into Strapi media library.
 * - Scans design/assets/images
 * - Extracts image refs from code*.html (src, href, data-src, url(...))
 * - Extracts inline <svg> blocks from code*.html
 * - Skips duplicates by Strapi file name (and in-run content hash)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const ROOT = path.resolve(__dirname, "..", "..");
const DESIGN_DIR = path.join(ROOT, "design");
const SOURCES = [path.join(DESIGN_DIR, "assets", "images")];
const CODE_HTML_PREFIX = "code";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

const mimeByExt = (ext) => {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
};

const walkDir = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) files.push(full);
    }
  }
  return files;
};

const walkHtml = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(full, files);
    } else if (entry.isFile()) {
      const name = entry.name.toLowerCase();
      if (name.startsWith(CODE_HTML_PREFIX) && name.endsWith(".html")) {
        files.push(full);
      }
    }
  }
  return files;
};

const stripQuery = (value) => {
  const idx = value.indexOf("?");
  return idx >= 0 ? value.slice(0, idx) : value;
};

const isImagePath = (value) => {
  const cleaned = stripQuery(value);
  const ext = path.extname(cleaned).toLowerCase();
  return IMAGE_EXTS.has(ext);
};

const resolveLocalPath = (value, htmlDir) => {
  if (!value) return null;
  const cleaned = stripQuery(value.trim());
  if (!cleaned) return null;
  if (cleaned.startsWith("data:") || cleaned.startsWith("http")) return null;
  if (cleaned.startsWith("/assets/")) {
    return path.join(DESIGN_DIR, cleaned.replace(/^\/assets\//, "assets/"));
  }
  if (cleaned.startsWith("assets/")) {
    return path.join(DESIGN_DIR, cleaned);
  }
  if (cleaned.startsWith("./") || cleaned.startsWith("../")) {
    return path.resolve(htmlDir, cleaned);
  }
  return path.resolve(DESIGN_DIR, cleaned);
};

const collectImageRefsFromHtml = (htmlPath) => {
  const html = fs.readFileSync(htmlPath, "utf-8");
  const refs = new Set();
  const attrRegex =
    /(src|data-src|data-background|href|xlink:href)\s*=\s*["']([^"']+)["']/gi;
  const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let match = null;
  while ((match = attrRegex.exec(html))) {
    refs.add(match[2]);
  }
  while ((match = urlRegex.exec(html))) {
    refs.add(match[1]);
  }
  return Array.from(refs);
};

const collectInlineSvgsFromHtml = (htmlPath) => {
  const html = fs.readFileSync(htmlPath, "utf-8");
  const svgs = [];
  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  let match = null;
  while ((match = svgRegex.exec(html))) {
    svgs.push(match[0]);
  }
  return svgs;
};

const md5Buffer = (buffer) => crypto.createHash("md5").update(buffer).digest("hex");

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
};

const hasRemoteName = async (name) => {
  const url = `${STRAPI_BASE}/api/upload/files?filters[name][$eq]=${encodeURIComponent(
    name
  )}&pagination[pageSize]=1`;
  const data = await fetchJson(url);
  return Array.isArray(data) && data.length > 0;
};

const uploadImage = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath);
  const filename = path.basename(filePath);
  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeByExt(ext) });
  form.append("files", blob, filename);
  const res = await fetch(`${STRAPI_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data[0];
};

const uploadBuffer = async (buffer, filename, mimeType) => {
  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
  form.append("files", blob, filename);
  const res = await fetch(`${STRAPI_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data[0];
};

const downloadToBuffer = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
};

const parseDataUri = (value) => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(value);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3] || "";
  const buffer = isBase64 ? Buffer.from(data, "base64") : Buffer.from(data, "utf8");
  return { buffer, mimeType };
};

const extFromMime = (mimeType) => {
  if (!mimeType) return ".bin";
  if (mimeType.includes("image/")) {
    const ext = mimeType.split("/")[1];
    if (!ext) return ".bin";
    return `.${ext.split(";")[0]}`;
  }
  return ".bin";
};

async function main() {
  const assetFiles = SOURCES.flatMap((dir) => walkDir(dir)).filter(Boolean);
  const codeHtmlFiles = walkHtml(DESIGN_DIR);
  const htmlImageRefs = [];
  const htmlSvgRefs = [];
  codeHtmlFiles.forEach((htmlPath) => {
    const refs = collectImageRefsFromHtml(htmlPath);
    refs.forEach((ref) => htmlImageRefs.push({ ref, htmlPath }));
    const svgs = collectInlineSvgsFromHtml(htmlPath);
    svgs.forEach((svg) => htmlSvgRefs.push({ svg, htmlPath }));
  });

  const jobs = [];
  const localSet = new Set();
  const urlSet = new Set();
  const dataSet = new Set();
  const svgSet = new Set();

  for (const filePath of assetFiles) {
    const abs = path.resolve(filePath);
    if (!localSet.has(abs)) {
      localSet.add(abs);
      jobs.push({ type: "file", value: abs });
    }
  }

  for (const { ref, htmlPath } of htmlImageRefs) {
    if (!ref || typeof ref !== "string") continue;
    const trimmed = ref.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("data:")) {
      if (dataSet.has(trimmed)) continue;
      dataSet.add(trimmed);
      jobs.push({ type: "data", value: trimmed });
      continue;
    }
    if (trimmed.startsWith("http")) {
      if (!isImagePath(trimmed)) continue;
      if (urlSet.has(trimmed)) continue;
      urlSet.add(trimmed);
      jobs.push({ type: "url", value: trimmed });
      continue;
    }
    const local = resolveLocalPath(trimmed, path.dirname(htmlPath));
    if (!local || !isImagePath(local)) continue;
    const abs = path.resolve(local);
    if (!fs.existsSync(abs)) continue;
    if (localSet.has(abs)) continue;
    localSet.add(abs);
    jobs.push({ type: "file", value: abs });
  }

  for (const { svg, htmlPath } of htmlSvgRefs) {
    if (!svg || typeof svg !== "string") continue;
    if (svgSet.has(svg)) continue;
    svgSet.add(svg);
    jobs.push({ type: "svg", value: svg, htmlPath });
  }

  if (!jobs.length) {
    console.log("No images found.");
    return;
  }

  console.log(
    `Found ${jobs.length} images (assets=${assetFiles.length}, htmlRefs=${htmlImageRefs.length}, inlineSvg=${htmlSvgRefs.length}). Checking Strapi per-file to avoid duplicates...`
  );
  const knownNames = new Set();

  const seenLocal = new Set();
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  const total = jobs.length;
  let index = 0;

  for (const job of jobs) {
    index += 1;
    let buffer = null;
    let mimeType = null;
    let hash = null;
    let label = "";
    let desiredName = "";

    try {
      if (job.type === "file") {
        label = path.relative(ROOT, job.value);
        buffer = fs.readFileSync(job.value);
        mimeType = mimeByExt(path.extname(job.value));
        hash = md5Buffer(buffer);
        desiredName = path.basename(job.value);
      } else if (job.type === "url") {
        label = job.value;
        const downloaded = await downloadToBuffer(job.value);
        buffer = downloaded.buffer;
        mimeType = downloaded.contentType;
        hash = md5Buffer(buffer);
        try {
          desiredName = path.basename(new URL(job.value).pathname) || "";
        } catch {
          desiredName = "";
        }
      } else if (job.type === "data") {
        label = "data-uri";
        const parsed = parseDataUri(job.value);
        if (!parsed) throw new Error("Invalid data URI");
        buffer = parsed.buffer;
        mimeType = parsed.mimeType;
        hash = md5Buffer(buffer);
        desiredName = "";
      } else if (job.type === "svg") {
        label = path.relative(ROOT, job.htmlPath || "inline-svg");
        buffer = Buffer.from(job.value, "utf8");
        mimeType = "image/svg+xml";
        hash = md5Buffer(buffer);
        desiredName = "";
      } else {
        throw new Error("Unknown job type");
      }
    } catch (err) {
      failed += 1;
      console.error(`[${index}/${total}] read failed: ${label} -> ${err.message || err}`);
      continue;
    }

    if (seenLocal.has(hash)) {
      skipped += 1;
      console.log(`[${index}/${total}] skip (duplicate local): ${label}`);
      continue;
    }
    seenLocal.add(hash);

    if (!desiredName) {
      const ext = extFromMime(mimeType);
      const prefix = job.type === "svg" ? "inline_svg" : "inline_asset";
      desiredName = `${prefix}_${hash.slice(0, 8)}${ext}`;
    }

    if (!knownNames.has(desiredName)) {
      try {
        const exists = await hasRemoteName(desiredName);
        if (exists) knownNames.add(desiredName);
      } catch (err) {
        failed += 1;
        console.error(`[${index}/${total}] check failed: ${label} -> ${err.message || err}`);
        continue;
      }
    }

    if (knownNames.has(desiredName)) {
      skipped += 1;
      console.log(
        `[${index}/${total}] skip (already in Strapi): ${label} -> ${desiredName}`
      );
      continue;
    }

    try {
      let res = null;
      if (job.type === "file") {
        res = await uploadImage(job.value);
      } else {
        res = await uploadBuffer(buffer, desiredName, mimeType);
      }
      uploaded += 1;
      if (res && res.name) knownNames.add(String(res.name));
      console.log(`[${index}/${total}] uploaded: ${label}`);
    } catch (err) {
      failed += 1;
      console.error(`[${index}/${total}] failed: ${label} -> ${err.message || err}`);
    }
  }

  console.log(`Done. Uploaded=${uploaded} Skipped=${skipped} Failed=${failed}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
