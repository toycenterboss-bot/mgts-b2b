import { STRAPI_BASE_URL, StrapiMedia } from "@/lib/strapi";

export const resolveMediaUrl = (media?: StrapiMedia | null) => {
  if (!media?.url) return null;
  if (media.url.startsWith("http")) return media.url;
  return `${STRAPI_BASE_URL}${media.url}`;
};

export const resolveMediaAlt = (media?: StrapiMedia | null, fallback?: string) =>
  media?.alternativeText || media?.caption || fallback || "";
