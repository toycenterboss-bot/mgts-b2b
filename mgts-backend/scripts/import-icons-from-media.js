#!/usr/bin/env node
/**
 * Import SVGs from Media Library into api::icon.icon.
 * Uses REST API so Strapi can stay running.
 */

const fs = require("fs");
const path = require("path");

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";

function getApiToken() {
  const contextPath = path.join(__dirname, "../../docs/project/CONTEXT.md");
  if (fs.existsSync(contextPath)) {
    const context = fs.readFileSync(contextPath, "utf-8");
    const patterns = [
      /export STRAPI_API_TOKEN="([^"]+)"/i,
      /STRAPI_API_TOKEN[:\s=]+([a-zA-Z0-9]{200,})/i,
      /STRAPI_API_TOKEN[:\s=]+([^\s\n]+)/i,
    ];
    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match && match[1]) return match[1].trim();
    }
  }
  return process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN || "";
}

const STRAPI_TOKEN = getApiToken();

if (!STRAPI_TOKEN) {
  console.error(
    "\n❌ Missing STRAPI_API_TOKEN. Set env var or add to docs/project/CONTEXT.md\n"
  );
  process.exit(1);
}

const defaultHeaders = {
  Authorization: `Bearer ${STRAPI_TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function listAll(urlBase, params = {}) {
  const pageSize = params.pageSize || 100;
  let page = 1;
  const items = [];
  while (true) {
    const query = new URLSearchParams();
    query.set("pagination[page]", String(page));
    query.set("pagination[pageSize]", String(pageSize));
    Object.entries(params).forEach(([key, value]) => {
      if (key === "pageSize") return;
      if (value === undefined || value === null || value === "") return;
      query.set(key, String(value));
    });
    const url = `${urlBase}?${query.toString()}`;
    const json = await fetchJson(url);
    const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    items.push(...data);
    const meta = json?.meta?.pagination;
    if (!meta) break;
    if (page >= meta.pageCount) break;
    page += 1;
  }
  return items;
}

const isSvg = (file) => {
  const mime = String(file?.mime || file?.mimeType || "").toLowerCase();
  const ext = String(file?.ext || "").toLowerCase();
  return mime === "image/svg+xml" || ext === ".svg" || ext === "svg";
};

const normalizeName = (raw) => {
  const base = String(raw || "")
    .replace(/\.svg$/i, "")
    .trim();
  if (!base) return "";
  return base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
};

const buildLabel = (file, fallback) => {
  const raw =
    file?.caption ||
    file?.alternativeText ||
    file?.alternative_text ||
    file?.name ||
    fallback ||
    "";
  return String(raw).replace(/\.svg$/i, "").trim();
};

const hasPreview = (preview) => {
  if (!preview) return false;
  if (preview?.data) return true;
  if (preview?.id) return true;
  if (preview?.url) return true;
  if (preview?.attributes?.url) return true;
  return false;
};

const normalizeIcon = (icon) => {
  if (!icon) return null;
  const attrs = icon.attributes || icon;
  const id = icon.id || attrs.id;
  const name = attrs.name || attrs.key || "";
  const preview = attrs.preview || icon.preview || null;
  return { id, name, preview, hasPreview: hasPreview(preview) };
};

async function createIcon(name, label, fileId) {
  return fetchJson(`${STRAPI_BASE}/api/icons`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        name,
        label,
        preview: fileId,
      },
    }),
  });
}

async function updatePreview(iconId, fileId) {
  return fetchJson(`${STRAPI_BASE}/api/icons/${iconId}`, {
    method: "PUT",
    body: JSON.stringify({
      data: {
        preview: fileId,
      },
    }),
  });
}

async function main() {
  const files = await listAll(`${STRAPI_BASE}/api/upload/files`, {
    pageSize: 100,
  });
  const svgFiles = files.filter(isSvg);
  if (!svgFiles.length) {
    console.log("No SVG files found in Media Library.");
    return;
  }

  const icons = await listAll(`${STRAPI_BASE}/api/icons`, {
    pageSize: 200,
    "populate[preview]": "true",
  });

  const iconByName = new Map();
  icons
    .map(normalizeIcon)
    .filter(Boolean)
    .forEach((icon) => {
      if (icon.name) iconByName.set(icon.name, icon);
    });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let idx = 0;

  for (const file of svgFiles) {
    idx += 1;
    const rawName = file?.name || file?.hash || file?.documentId || `file_${file?.id}`;
    const base = normalizeName(rawName);
    if (!base) {
      skipped += 1;
      console.log(`[${idx}/${svgFiles.length}] skip: invalid name for file ${file?.id}`);
      continue;
    }

    let name = base;
    if (iconByName.has(name)) {
      const existing = iconByName.get(name);
      if (existing && !existing.hasPreview) {
        await updatePreview(existing.id, file.id);
        existing.hasPreview = true;
        updated += 1;
        console.log(`[${idx}/${svgFiles.length}] update preview: ${name}`);
      } else {
        skipped += 1;
        console.log(`[${idx}/${svgFiles.length}] skip exists: ${name}`);
      }
      continue;
    }

    let finalName = name;
    if (iconByName.has(finalName)) {
      finalName = `media_${name}`;
    }
    let suffix = 2;
    while (iconByName.has(finalName)) {
      finalName = `media_${name}_${suffix}`;
      suffix += 1;
    }

    const label = buildLabel(file, finalName || name);
    await createIcon(finalName, label, file.id);
    iconByName.set(finalName, { id: null, name: finalName, hasPreview: true });
    created += 1;
    console.log(`[${idx}/${svgFiles.length}] created: ${finalName}`);
  }

  console.log(
    `Done. SVG files=${svgFiles.length} Created=${created} Updated=${updated} Skipped=${skipped}`
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
