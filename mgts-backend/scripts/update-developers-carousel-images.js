#!/usr/bin/env node
/**
 * Upload carousel images for developers_digital_solutions and attach to image-carousel items.
 */

const fs = require("fs");
const path = require("path");
const { createStrapi } = require("@strapi/strapi");

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const SLUG = "developers_digital_solutions";
const SPEC_PATH = path.resolve(
  __dirname,
  "../data/page-analysis-llm/branches/2026-01-22/developers_digital_solutions_spec.json"
);
const createStrapiApp = async () =>
  createStrapi({
    distDir: "./dist",
    autoReload: false,
    serveAdminPanel: false,
  }).load();

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
};

const downloadImage = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const findExistingUpload = async (filename) => {
  const url =
    `${STRAPI_BASE}/api/upload/files?` +
    `filters[name][$eq]=${encodeURIComponent(filename)}` +
    `&pagination[limit]=1&sort=createdAt:desc`;
  try {
    const data = await fetchJson(url);
    if (Array.isArray(data) && data.length) return data[0];
  } catch {
    // ignore
  }
  return null;
};

const uploadImage = async (buffer, filename, contentType = "image/png") => {
  const form = new FormData();
  const blob = new Blob([buffer], { type: contentType });
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

async function main() {
  if (!fs.existsSync(SPEC_PATH)) {
    throw new Error(`Spec not found: ${SPEC_PATH}`);
  }
  const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf-8"));
  const sliderSection = (spec?.sections || []).find((s) => s && s.type === "projects-slider");
  if (!sliderSection) {
    throw new Error("projects-slider section not found in spec");
  }
  const images = Array.isArray(sliderSection.images) ? sliderSection.images.filter(Boolean) : [];
  if (!images.length) {
    throw new Error("No images found in spec projects-slider section");
  }

  const pageRes = await fetchJson(
    `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(SLUG)}`
  );
  const page = pageRes?.data;
  if (!page) throw new Error("Page not found");

  const sections = Array.isArray(page.sections) ? page.sections : [];
  const carouselIdx = sections.findIndex((s) => s && s.__component === "page.image-carousel");
  if (carouselIdx < 0) throw new Error("image-carousel section not found on page");
  const carousel = sections[carouselIdx];
  const items = Array.isArray(carousel.items) ? carousel.items.slice() : [];
  if (!items.length) throw new Error("image-carousel items not found on page");

  const sortedItems = items.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (sortedItems.length !== images.length) {
    console.warn(
      `Warning: items count (${sortedItems.length}) != images count (${images.length}). Mapping by index.`
    );
  }

  const uploads = [];
  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    const src = String(img.src || "").trim();
    if (!src) {
      uploads.push(null);
      continue;
    }
    const filename = `developers_digital_solutions_${i + 1}.png`;
    const existing = await findExistingUpload(filename);
    if (existing) {
      uploads.push(existing);
      console.log(`Reusing ${filename} -> ${existing.url}`);
      continue;
    }
    const buffer = await downloadImage(src);
    const upload = await uploadImage(buffer, filename);
    uploads.push(upload);
    console.log(`Uploaded ${filename} -> ${upload.url}`);
  }

  const itemIds = sortedItems.map((item) => item?.id).filter(Boolean);
  const fileIds = uploads.map((upload) => (upload ? upload.id : null));
  const app = await createStrapiApp();
  try {
    const db = app.db.connection;
    if (!itemIds.length) throw new Error("No carousel item ids found.");
    await db("files_related_mph")
      .whereIn("related_id", itemIds)
      .andWhere({ related_type: "page.carousel-item", field: "image" })
      .del();
    for (let idx = 0; idx < itemIds.length; idx += 1) {
      const relatedId = itemIds[idx];
      const fileId = fileIds[idx];
      if (!relatedId || !fileId) continue;
      await db("files_related_mph").insert({
        file_id: fileId,
        related_id: relatedId,
        related_type: "page.carousel-item",
        field: "image",
        order: 1.0,
      });
    }
  } finally {
    if (process.env.MGTS_STRAPI_DESTROY === "1") {
      try {
        await app.destroy();
      } catch (e) {
        console.warn("⚠️  Strapi shutdown warning:", e?.message || e);
      }
    }
  }

  console.log("Carousel images attached successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
