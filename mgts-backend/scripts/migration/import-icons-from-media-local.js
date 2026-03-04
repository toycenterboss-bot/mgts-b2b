/**
 * Import SVG files from Media Library into api::icon.icon.
 * Runs inside Strapi instance (no API token needed).
 */

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

module.exports = async function importIconsFromMedia({ strapi }) {
  const files = await strapi.entityService.findMany("plugin::upload.file", {
    limit: 1000,
    sort: { createdAt: "desc" },
  });

  const svgFiles = Array.isArray(files) ? files.filter(isSvg) : [];
  if (svgFiles.length === 0) {
    strapi.log.info("[icons] No SVG files found in Media Library.");
    return;
  }

  const icons = await strapi.entityService.findMany("api::icon.icon", {
    limit: 2000,
    populate: ["preview"],
  });
  const iconByName = new Map();
  (Array.isArray(icons) ? icons : []).forEach((icon) => {
    if (!icon?.name) return;
    iconByName.set(icon.name, {
      id: icon.id,
      name: icon.name,
      hasPreview: hasPreview(icon.preview),
    });
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
      strapi.log.warn(`[icons] skip: invalid name for file ${file?.id}`);
      continue;
    }

    let name = base;
    if (iconByName.has(name)) {
      const existing = iconByName.get(name);
      if (existing && !existing.hasPreview) {
        await strapi.entityService.update("api::icon.icon", existing.id, {
          data: { preview: file.id },
        });
        existing.hasPreview = true;
        updated += 1;
        strapi.log.info(`[icons] update preview: ${name}`);
      } else {
        skipped += 1;
        strapi.log.info(`[icons] skip exists: ${name}`);
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
    const createdIcon = await strapi.entityService.create("api::icon.icon", {
      data: {
        name: finalName,
        label,
        preview: file.id,
      },
    });
    iconByName.set(finalName, {
      id: createdIcon?.id,
      name: finalName,
      hasPreview: true,
    });
    created += 1;
    strapi.log.info(`[icons] created: ${finalName}`);
  }

  strapi.log.info(
    `[icons] Done. SVG files=${svgFiles.length} Created=${created} Updated=${updated} Skipped=${skipped}`
  );
};
