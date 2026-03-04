export type StrapiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type StrapiListResponse<T> = {
  data: T[];
  meta?: Record<string, unknown>;
};

export type StrapiMedia = {
  id: number;
  url?: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string;
};

export type StrapiIcon = {
  id: number;
  name?: string;
  label?: string;
  preview?: StrapiMedia | null;
};

export type StrapiNavigation = Record<string, unknown>;
export type StrapiFooter = Record<string, unknown>;
export type StrapiPage = Record<string, unknown>;
export type StrapiNews = Record<string, unknown>;
export type StrapiDeepNav = Record<string, unknown>;

const STRAPI_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_BASE_URL ||
  process.env.STRAPI_BASE_URL ||
  "http://localhost:1337";

const normalizeUrl = (path: string) =>
  path.startsWith("http") ? path : `${STRAPI_BASE_URL}${path}`;

const defaultRevalidate = {
  navigation: 300,
  footer: 300,
  page: 300,
  news: 120,
};

async function fetchJson<T>(
  path: string,
  options: {
    revalidate?: number;
    tags?: string[];
    cache?: RequestCache;
  } = {}
): Promise<T> {
  const url = normalizeUrl(path);
  const res = await fetch(url, {
    cache: options.cache ?? "force-cache",
    next: {
      revalidate: options.revalidate,
      tags: options.tags,
    },
  });
  if (!res.ok) {
    throw new Error(`Strapi fetch failed: ${res.status} ${url}`);
  }
  return (await res.json()) as T;
}

export const unwrapData = <T>(payload: StrapiResponse<T> | StrapiListResponse<T>) =>
  payload?.data ?? null;

export async function getNavigation() {
  const payload = await fetchJson<StrapiResponse<StrapiNavigation>>("/api/navigation", {
    revalidate: defaultRevalidate.navigation,
    tags: ["navigation"],
  });
  return unwrapData(payload);
}

export async function getFooter() {
  const payload = await fetchJson<StrapiResponse<StrapiFooter>>("/api/footer", {
    revalidate: defaultRevalidate.footer,
    tags: ["footer"],
  });
  return unwrapData(payload);
}

export async function getDeepNav(key: string) {
  if (!key) return null;
  try {
    const payload = await fetchJson<StrapiResponse<StrapiDeepNav>>(
      `/api/navigation/deep-nav/${encodeURIComponent(key)}?populate=deep`,
      {
        revalidate: defaultRevalidate.navigation,
        tags: [`deepnav:${key}`],
      }
    );
    return unwrapData(payload);
  } catch {
    return null;
  }
}

export async function getPageBySlug(slug: string) {
  const payload = await fetchJson<StrapiResponse<StrapiPage>>(
    `/api/pages/by-slug?slug=${encodeURIComponent(slug)}`,
    {
      revalidate: defaultRevalidate.page,
      tags: [`page:${slug}`],
      cache: process.env.NODE_ENV === "development" ? "no-store" : undefined,
    }
  );
  return unwrapData(payload);
}

const normalizeSlug = (value: string) =>
  String(value || "").trim().replace(/^\/+|\/+$/g, "");

const slugVariants = (value: string) => {
  const s = normalizeSlug(value);
  if (!s) return [];
  const base = s.split("/").filter(Boolean).pop() || s;
  const underscored = s.replace(/\//g, "_");
  const slashed = s.replace(/_/g, "/");
  const baseUnderscored = base.replace(/\//g, "_");
  return [s, underscored, slashed, base, baseUnderscored].filter(Boolean);
};

const PATH_SLUG_OVERRIDES: Record<string, string[]> = {
  "partners/all_services": ["developers_all_services"],
};

async function getPageBySlugSafe(slug: string) {
  try {
    return await getPageBySlug(slug);
  } catch {
    return null;
  }
}

export async function resolvePageByPath(path: string) {
  const normalized = normalizeSlug(path);
  const overrides = normalized ? PATH_SLUG_OVERRIDES[normalized] : undefined;
  const variants = [...(overrides || []), ...slugVariants(path)];
  for (const v of variants) {
    const page = await getPageBySlugSafe(v);
    if (page) return page;
  }
  return null;
}

export async function getIconByName(name: string) {
  const payload = await fetchJson<StrapiListResponse<StrapiIcon>>(
    `/api/icons?filters[name][$eq]=${encodeURIComponent(name)}&populate=preview`,
    {
      revalidate: defaultRevalidate.page,
      tags: [`icon:${name}`],
    }
  );
  const list = unwrapData(payload);
  return Array.isArray(list) ? list[0] || null : null;
}

export async function getNewsList(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  tag?: string;
  year?: number;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.q) query.set("q", params.q);
  if (params?.category) query.set("category", params.category);
  if (params?.tag) query.set("tag", params.tag);
  if (params?.year) query.set("year", String(params.year));

  const payload = await fetchJson<StrapiListResponse<StrapiNews>>(
    `/api/news/list${query.toString() ? `?${query}` : ""}`,
    {
      revalidate: defaultRevalidate.news,
      tags: ["news"],
    }
  );
  return payload;
}

export async function getNewsBySlug(slug: string) {
  try {
    const payload = await fetchJson<StrapiResponse<StrapiNews>>(`/api/news/slug/${slug}`, {
      revalidate: defaultRevalidate.news,
      tags: [`news:${slug}`],
    });
    return unwrapData(payload);
  } catch {
    return null;
  }
}

export async function getNewsTags() {
  const payload = await fetchJson<StrapiListResponse<any>>(`/api/news/tags`, {
    revalidate: defaultRevalidate.news,
    tags: ["news:tags"],
  });
  return unwrapData(payload);
}

export async function getNewsYears() {
  const payload = await fetchJson<StrapiListResponse<any>>(`/api/news/years`, {
    revalidate: defaultRevalidate.news,
    tags: ["news:years"],
  });
  return unwrapData(payload);
}

export { STRAPI_BASE_URL };
