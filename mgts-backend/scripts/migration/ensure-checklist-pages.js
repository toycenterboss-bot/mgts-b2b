/**
 * Ensure pages required by QA checklist exist and have correct templates.
 *
 * This script is intentionally minimal: it creates placeholder pages (drafts)
 * for missing slugs and fixes template/deepNavKey for known mismatches.
 *
 * Usage (from mgts-backend):
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-ensure-checklist-pages.js
 */

function now() {
  return new Date().toISOString();
}

function withTimeout(promise, ms, label) {
  const timeoutMs = Math.max(1, Number(ms) || 30000);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms${label ? ` (${label})` : ''}`));
    }, timeoutMs);
    Promise.resolve(promise)
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

function parseCsv(v) {
  return String(v || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function titleFromSlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return 'Страница';
  const last = s.split('/').filter(Boolean).slice(-1)[0] || s;
  const nice = last
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return nice ? nice.charAt(0).toUpperCase() + nice.slice(1) : 'Страница';
}

async function findAnyBySlug(strapi, slug) {
  const list = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    sort: { id: 'desc' },
    limit: 10,
  });
  const arr = Array.isArray(list) ? list : [];
  // Prefer draft
  return arr.find((p) => !p?.publishedAt) || arr.find((p) => !!p?.publishedAt) || arr[0] || null;
}

async function upsertPage(strapi, { slug, template, title, deepNavKey }) {
  const existing = await findAnyBySlug(strapi, slug);

  const data = {
    slug,
    title: title || titleFromSlug(slug),
    template,
    showBreadcrumbs: true,
    ...(deepNavKey ? { deepNavKey } : {}),
    // Provide a minimal hero to satisfy component requirements when present.
    // Hero is not required on Page, but when provided the hero.title is required.
    hero: {
      title: title || titleFromSlug(slug),
      subtitle: '',
      ctaButtons: [],
    },
    // Keep sections empty; content will be filled later.
    sections: [],
  };

  if (existing && existing.id) {
    return await strapi.entityService.update('api::page.page', existing.id, { data });
  }
  return await strapi.entityService.create('api::page.page', { data });
}

module.exports = async function ensureChecklistPages({ strapi }) {
  const plan = [
    // Fix known mismatches (template)
    { slug: 'offers', template: 'TPL_News_List', title: 'Спецпредложения' },
    { slug: 'documents', template: 'TPL_DeepNav', title: 'Документы', deepNavKey: 'documents' },

    // DeepNav containers
    { slug: 'disclosure', template: 'TPL_DeepNav', title: 'Раскрытие информации', deepNavKey: 'disclosure' },

    // Contact hub routes
    { slug: 'contact', template: 'TPL_Contact_Hub', title: 'Контакты' },

    // Missing segment/service container pages
    { slug: 'partners/all_services', template: 'TPL_Segment_Landing', title: 'Партнерам — все услуги' },
    { slug: 'operators/infrastructure', template: 'TPL_Service', title: 'Инфраструктура' },

    // READY pages (Strapi-side placeholders)
    { slug: 'ai-chat', template: 'TPL_AI_Chat', title: 'AI‑чат' },
    { slug: 'career', template: 'TPL_Career_List', title: 'Карьера' },
    { slug: 'search', template: 'TPL_Search_Results', title: 'Поиск' },

    // Scenario placeholders (MISSING_SPEC in mapping, but should exist)
    { slug: 'services/scenario-connecting-object', template: 'TPL_Scenario' },
    { slug: 'services/scenario-connectivity-data', template: 'TPL_Scenario' },
    { slug: 'services/scenario-infrastructure-360', template: 'TPL_Scenario' },
    { slug: 'services/scenario-network-ops', template: 'TPL_Scenario' },
    { slug: 'services/scenario-safe-object', template: 'TPL_Scenario' },
    { slug: 'services/scenario-video-access', template: 'TPL_Scenario' },

    // Doc pages placeholders (MISSING_SPEC in mapping, but should exist)
    { slug: 'about', template: 'TPL_Doc_Page', title: 'О компании' },
    { slug: 'affiliated_persons', template: 'TPL_Doc_Page', title: 'Аффилированные лица' },
    { slug: 'emission', template: 'TPL_Doc_Page', title: 'Эмиссия' },
    { slug: 'essential_facts', template: 'TPL_Doc_Page', title: 'Существенные факты' },
    { slug: 'reports', template: 'TPL_Doc_Page', title: 'Отчеты' },
    { slug: 'stocks_reports', template: 'TPL_Doc_Page', title: 'Отчеты по акциям' },
    { slug: 'terms', template: 'TPL_Doc_Page', title: 'Правовая информация' },
    { slug: 'sitemap', template: 'TPL_Doc_Page', title: 'Карта сайта' },
  ];

  // Batch controls:
  // - MGTS_ENSURE_SLUGS="a,b,c" -> run only those slugs (in that order)
  // - MGTS_ENSURE_OFFSET=0 MGTS_ENSURE_LIMIT=7 -> run plan.slice(offset, offset+limit)
  let planToRun = plan.slice();
  const only = parseCsv(process.env.MGTS_ENSURE_SLUGS);
  if (only.length) {
    const bySlug = new Map(plan.map((x) => [x.slug, x]));
    planToRun = only.map((s) => bySlug.get(s)).filter(Boolean);
  } else {
    const offset = Math.max(0, parseInt(process.env.MGTS_ENSURE_OFFSET || '0', 10) || 0);
    const limitRaw = process.env.MGTS_ENSURE_LIMIT;
    const limit = limitRaw == null ? plan.length : Math.max(0, parseInt(limitRaw, 10) || 0);
    planToRun = plan.slice(offset, offset + limit);
  }

  const results = {
    updated: [],
    failed: [],
  };

  // eslint-disable-next-line no-console
  console.log(`\n▶ ensure-checklist-pages: ${planToRun.length} items (of ${plan.length})\n`);

  for (let i = 0; i < planToRun.length; i++) {
    const item = planToRun[i];
    try {
      // eslint-disable-next-line no-console
      console.log(`[${i + 1}/${planToRun.length}] → ${item.slug} (${item.template}) @ ${now()}`);
      const res = await withTimeout(
        upsertPage(strapi, item),
        Number(process.env.MGTS_ENSURE_STEP_TIMEOUT_MS || 60000),
        item.slug
      );
      results.updated.push({ slug: item.slug, id: res?.id, template: item.template });
      // eslint-disable-next-line no-console
      console.log(`[${i + 1}/${planToRun.length}] ✅ ensured ${item.slug} (${item.template}) id=${res?.id ?? 'n/a'}\n`);
    } catch (e) {
      results.failed.push({ slug: item.slug, error: e?.message || String(e) });
      // eslint-disable-next-line no-console
      console.error(`[${i + 1}/${planToRun.length}] ❌ ensure failed: ${item.slug}:`, e?.message || e);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n■ ensure-checklist-pages done: updated=${results.updated.length} failed=${results.failed.length}\n`
  );
  return results;
};

