/**
 * Attach featured images to all news items (round-robin).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-news-featured-images-all.js
 */

const fs = require("fs");
const path = require("path");

module.exports = async function seedNewsFeaturedImagesAll({ strapi }) {
  const files = [
    "60b54c10dd84.png",
    "6eeb437dfc85.png",
    "59b1b16623f4.png",
  ];
  const baseDir = path.resolve(process.cwd(), "..", "design", "assets", "images", "external");
  const uploadService = strapi.plugin("upload")?.service("upload");
  if (!uploadService || typeof uploadService.upload !== "function") {
    console.log("Upload plugin not available.");
    return;
  }

  const uploads = [];
  for (const filename of files) {
    const existing = await strapi.db.query("plugin::upload.file").findMany({
      where: { name: filename },
      limit: 1,
    });
    if (existing && existing.length) {
      uploads.push(existing[0]);
      continue;
    }

    const fullPath = path.join(baseDir, filename);
    if (!fs.existsSync(fullPath)) {
      uploads.push(null);
      console.log(`Missing image: ${fullPath}`);
      continue;
    }
    const stat = fs.statSync(fullPath);
    const file = {
      path: fullPath,
      filepath: fullPath,
      name: filename,
      originalFilename: filename,
      type: "image/png",
      mimetype: "image/png",
      size: stat.size,
    };
    const uploaded = await uploadService.upload({
      data: { fileInfo: { name: filename, alternativeText: "News cover" } },
      files: file,
    });
    const media = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    uploads.push(media || null);
  }

  const newsItems = await strapi.entityService.findMany("api::news.news", {
    sort: ["publishDate:desc"],
    limit: 1000,
  });

  if (!Array.isArray(newsItems) || newsItems.length === 0) {
    console.log("No news items found.");
    return;
  }

  let updated = 0;
  for (let i = 0; i < newsItems.length; i += 1) {
    const item = newsItems[i];
    const media = uploads[i % uploads.length];
    if (!item?.id || !media?.id) continue;
    if (item.featuredImage) continue;
    await strapi.entityService.update("api::news.news", item.id, {
      data: { featuredImage: media.id },
    });
    updated += 1;
  }

  console.log(`Updated ${updated} news items with featured images.`);
};
