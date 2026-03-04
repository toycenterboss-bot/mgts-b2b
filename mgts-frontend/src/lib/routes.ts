const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export const toPrettyRoute = (slug: string) => {
  const s = trimSlashes(String(slug || "").trim());
  if (!s) return "/";
  if (s === "home") return "/";
  return `/${s.split("/").map(encodeURIComponent).join("/")}`;
};

const extractSlugFromHref = (rawHref: string) => {
  const s = String(rawHref || "").trim();
  if (!s) return "";
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(s, base);
    const qsSlug = (u.searchParams.get("slug") || "").trim();
    if (qsSlug) return qsSlug;
    const cleaned = u.pathname
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, "")
      .replace(/#.*$/, "")
      .replace(/\?.*$/, "")
      .replace(/index\.html$/i, "")
      .replace(/\.html$/i, "")
      .replace(/\/$/, "");
    return cleaned;
  } catch {
    return "";
  }
};

export const normalizeCmsHref = (rawHref: string) => {
  const s = String(rawHref || "").trim();
  if (!s) return "#";
  if (s.startsWith("#")) return s;
  if (/^(mailto|tel):/i.test(s)) return s;

  const isAbs = /^https?:\/\//i.test(s);
  if (isAbs) {
    try {
      const u = new URL(s);
      const host = u.hostname;
      const localHost =
        host === "localhost" ||
        host === "127.0.0.1" ||
        (typeof window !== "undefined" && host === window.location.hostname);
      if (!localHost) return s;
    } catch {
      return s;
    }
  }

  const slug = extractSlugFromHref(s);
  if (!slug) return s;
  return toPrettyRoute(slug);
};
