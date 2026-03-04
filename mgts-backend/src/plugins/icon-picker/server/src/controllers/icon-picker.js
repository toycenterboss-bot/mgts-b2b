"use strict";

const resolvePreviewUrl = (file) => {
  if (!file || !file.url) return "";
  return file.url;
};

module.exports = {
  async list(ctx) {
    const icons = await strapi.entityService.findMany("api::icon.icon", {
      fields: ["name", "label"],
      populate: { preview: true },
      sort: { name: "asc" },
      limit: 1000,
    });

    const data = (icons || []).map((icon) => ({
      id: icon.id,
      name: icon.name,
      label: icon.label,
      previewUrl: resolvePreviewUrl(icon.preview),
    }));

    ctx.body = { data };
  },
};
