#!/usr/bin/env node
/**
 * Backfill icon relations for components that used string icons before.
 */

const STRAPI_BASE = process.env.STRAPI_BASE || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN || "";

const fetchJson = async (url, options = {}) => {
  const headers = Object.assign({}, options.headers || {});
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
};

const stripIds = (value) => {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "id" || k === "documentId") continue;
      out[k] = stripIds(v);
    }
    return out;
  }
  return value;
};

const listAllIcons = async () => {
  const map = new Map();
  let page = 1;
  const pageSize = 100;
  while (true) {
    const url = `${STRAPI_BASE}/api/icons?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const data = await fetchJson(url);
    const items = data?.data || [];
    for (const it of items) {
      const attrs = it.attributes || it;
      const name = attrs.name;
      if (name) map.set(String(name), it.id || attrs.id);
    }
    const meta = data?.meta?.pagination;
    if (!meta || meta.page >= meta.pageCount) break;
    page += 1;
  }
  return map;
};

const listPageSlugs = async () => {
  const out = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const url = `${STRAPI_BASE}/api/pages?pagination[page]=${page}&pagination[pageSize]=${pageSize}&fields[0]=slug`;
    const data = await fetchJson(url);
    const items = data?.data || [];
    for (const it of items) {
      const attrs = it.attributes || it;
      if (attrs.slug) out.push(String(attrs.slug));
    }
    const meta = data?.meta?.pagination;
    if (!meta || meta.page >= meta.pageCount) break;
    page += 1;
  }
  return out;
};

const defaults = {
  careerValue: "verified_user",
  careerWhyItem: "check_circle",
  careerWhyCard: "architecture",
  serviceCta: "mail",
  megaMenuPhone: "call",
  megaMenuBg: "cell_tower",
};

async function main() {
  const iconMap = await listAllIcons();
  const getIconId = (name) => iconMap.get(name) || null;

  const slugs = await listPageSlugs();
  let updatedPages = 0;
  for (const slug of slugs) {
    let pageJson = null;
    try {
      pageJson = await fetchJson(
        `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`
      );
    } catch {
      continue;
    }
    const page = pageJson?.data;
    if (!page) continue;
    const sections = Array.isArray(page.sections) ? page.sections : [];
    let changed = false;
    const updatedSections = sections.map((s) => {
      if (!s || !s.__component) return stripIds(s);
      if (s.__component === "page.career-values") {
        const items = Array.isArray(s.items) ? s.items : [];
        const iconId = getIconId(defaults.careerValue);
        const nextItems = items.map((it) => {
          if (!it || it.icon || !iconId) return stripIds(it);
          changed = true;
          return { ...stripIds(it), icon: iconId };
        });
        return { ...stripIds(s), items: nextItems };
      }
      if (s.__component === "page.career-why-company") {
        const iconId = getIconId(defaults.careerWhyCard);
        const itemIconId = getIconId(defaults.careerWhyItem);
        const cards = Array.isArray(s.cards) ? s.cards : [];
        const nextCards = cards.map((card) => {
          if (!card) return stripIds(card);
          const nextCard = stripIds(card);
          if (!nextCard.icon && iconId) {
            nextCard.icon = iconId;
            changed = true;
          }
          const items = Array.isArray(card.items) ? card.items : [];
          nextCard.items = items.map((it) => {
            if (!it) return stripIds(it);
            if (it.icon || !itemIconId) return stripIds(it);
            changed = true;
            return { ...stripIds(it), icon: itemIconId };
          });
          return nextCard;
        });
        return { ...stripIds(s), cards: nextCards };
      }
      if (s.__component === "page.service-cta-banner") {
        const iconId = getIconId(defaults.serviceCta);
        const next = stripIds(s);
        if (!next.icon && iconId) {
          next.icon = iconId;
          changed = true;
        }
        return next;
      }
      return stripIds(s);
    });

    if (!changed) continue;
    const documentId = page.documentId || page.id;
    await fetchJson(`${STRAPI_BASE}/api/pages/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { sections: updatedSections } }),
    });
    updatedPages += 1;
    console.log(`Updated page icons: ${slug}`);
  }

  // Update navigation megaMenuCta defaults
  const navJson = await fetchJson(`${STRAPI_BASE}/api/navigation`);
  const nav = navJson?.data;
  if (nav && nav.megaMenuCta) {
    const phoneIcon = getIconId(defaults.megaMenuPhone);
    const bgIcon = getIconId(defaults.megaMenuBg);
    const payload = {
      data: {
        megaMenuCta: {
          ...stripIds(nav.megaMenuCta),
          phoneIcon: nav.megaMenuCta.phoneIcon || phoneIcon || null,
          backgroundIcon: nav.megaMenuCta.backgroundIcon || bgIcon || null,
        },
      },
    };
    await fetchJson(`${STRAPI_BASE}/api/navigation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("Updated navigation megaMenuCta icons.");
  }

  console.log(`Done. Updated pages=${updatedPages}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
