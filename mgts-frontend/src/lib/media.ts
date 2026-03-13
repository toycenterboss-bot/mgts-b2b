import { STRAPI_BASE_URL, StrapiMedia } from "@/lib/strapi";

const resolveUrl = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${STRAPI_BASE_URL}${url}`;
};

export const resolveMediaUrl = (media?: StrapiMedia | null) => {
  if (!media) return null;
  if (Array.isArray(media)) {
    return resolveMediaUrl(media[0] as StrapiMedia);
  }
  const anyMedia: any = media;
  const directUrl = typeof anyMedia === "string" ? anyMedia : anyMedia.url;
  const attrs = anyMedia.attributes;
  const dataAttrs = anyMedia.data?.attributes;
  const formats = anyMedia.formats || attrs?.formats || dataAttrs?.formats;
  const formatUrl =
    formats?.large?.url ||
    formats?.medium?.url ||
    formats?.small?.url ||
    formats?.thumbnail?.url;
  const url = directUrl || attrs?.url || dataAttrs?.url || formatUrl;
  return resolveUrl(url);
};

export const DEFAULT_HERO_BG_URL = `${STRAPI_BASE_URL}/uploads/about_hero_48a20b5ede.jpg`;
export const DEFAULT_HERO_FALLBACK_URL = `${STRAPI_BASE_URL}/uploads/4dcbb3aa0967_15f7f8b9fc.png`;

export const resolveMediaAlt = (media?: StrapiMedia | null, fallback?: string) => {
  if (!media) return fallback || "";
  if (Array.isArray(media)) return resolveMediaAlt(media[0] as StrapiMedia, fallback);
  const anyMedia: any = media;
  return anyMedia?.alternativeText || anyMedia?.caption || anyMedia?.attributes?.alternativeText || fallback || "";
};
