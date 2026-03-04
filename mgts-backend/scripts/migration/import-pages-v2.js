/**
 * Import v2: create Pages from page-analysis-llm specs into the new Page schema:
 * - page.template
 * - page.hero (component)
 * - page.sections (dynamic zone)
 *
 * Data sources:
 * - docs/project/PAGE_CONTENT_MAPPING.md (route -> template -> spec filename)
 * - MGTS_PAGE_ANALYSIS_DIR (defaults to latest snapshot branch under mgts-backend/data/page-analysis-llm/branches/)
 *
 * Runs via entityService inside Strapi context (no API token needed).
 */

const fs = require('fs');
const path = require('path');

function getDefaultAnalysisDir() {
  const base = path.join(__dirname, '..', '..', 'data', 'page-analysis-llm');
  const branches = path.join(base, 'branches');
  try {
    const dirs = fs
      .readdirSync(branches, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    if (dirs.length > 0) return path.join(branches, dirs[dirs.length - 1]);
  } catch {
    // ignore
  }
  return path.join(__dirname, '..', 'temp', 'page-analysis-llm');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function asParagraphs(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return `<p>${escapeHtml(t).replace(/\n+/g, '</p><p>')}</p>`;
}

function linksToHtml(links) {
  const l = links || {};
  const items = []
    .concat(l.internalLinks || [])
    .concat(l.externalLinks || [])
    .concat(l.fileLinks || []);
  if (!items.length) return '';
  const lis = items
    .map((it) => {
      const text = escapeHtml(it.text || it.title || it.href || 'link');
      const href = escapeHtml(it.href || '');
      if (!href) return '';
      return `<li><a href="${href}">${text}</a></li>`;
    })
    .filter(Boolean)
    .join('\n');
  if (!lis) return '';
  return `<ul>\n${lis}\n</ul>`;
}

function sectionToRichtext(sec) {
  const parts = [];
  if (sec.text) parts.push(asParagraphs(sec.text));
  if (sec.description && !sec.text) parts.push(asParagraphs(sec.description));
  const linksHtml = linksToHtml(sec.links);
  if (linksHtml) parts.push(linksHtml);
  return parts.filter(Boolean).join('\n');
}

function tabToRichtext(tab) {
  if (!tab) return '';
  if (tab.content) return sectionToRichtext(tab.content);
  return sectionToRichtext(tab);
}

function routeToSlug(route) {
  const r = String(route || '').trim();
  const noSlash = r.replace(/^\/+/, '').replace(/\/+$/, '');
  return noSlash || 'home';
}

function inferDeepNavKey(template, route) {
  if (template !== 'TPL_DeepNav') return null;
  const r = String(route || '');
  const about = new Set([
    '/about_mgts',
    '/mgts_values',
    '/general_director_message',
    '/mgts_compliance_policies',
    '/interaction_with_partners',
    '/partners_feedback_form',
    '/single_hotline',
    '/principles_corporate_manage',
    '/corporate_documents',
    '/decisions_meetings_shareholders',
    '/infoformen',
    '/about_registrar',
  ]);
  const docs = new Set([
    '/documents',
    '/licenses',
    '/offers',
    '/forms_doc',
    '/operinfo',
    '/wca',
    '/stockholder_copies_document',
    '/timing_malfunctions',
    '/data_processing',
    '/cookie_processing',
    '/labor_safety',
  ]);
  const disclosure = new Set([
    '/essential_facts',
    '/affiliated_persons',
    '/stocks_reports',
    '/reports',
    '/emission',
  ]);

  if (about.has(r)) return 'about_company';
  if (docs.has(r)) return 'documents';
  if (disclosure.has(r)) return 'disclosure';
  // default fallback
  return 'about_company';
}

function parseContentMapping(mdText) {
  const rows = [];
  const lines = mdText.split('\n');

  // | `/about_mgts` | `TPL_DeepNav` | `tpl_deepnav.html` | `index_spec.json` | **OK** | `api::page.page` |
  const re =
    /^\|\s+`([^`]+)`\s+\|\s+`([^`]+)`\s+\|\s+`([^`]+)`\s+\|\s+`([^`]*)`\s+\|\s+\*\*(OK|MISSING_SPEC|NEEDS_REVIEW)\*\*/;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const route = m[1];
    const template = m[2];
    const assembled = m[3];
    const specFile = m[4] || '';
    const status = m[5];
    rows.push({ route, template, assembled, specFile, status });
  }

  return rows;
}

module.exports = async ({ strapi }) => {
  const analysisDir = process.env.MGTS_PAGE_ANALYSIS_DIR || getDefaultAnalysisDir();
  const mappingPath = path.join(__dirname, '..', '..', '..', 'docs', 'project', 'PAGE_CONTENT_MAPPING.md');

  const dryRun = process.env.MGTS_IMPORT_DRY_RUN === '1';
  const limit = Number(process.env.MGTS_IMPORT_LIMIT || '0');
  const onlySlug = String(process.env.MGTS_IMPORT_ONLY_SLUG || '').trim();
  const onlySlugs = String(process.env.MGTS_IMPORT_ONLY_SLUGS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log('\n📥 Import pages v2\n');
  console.log('- analysisDir:', analysisDir);
  console.log('- mappingPath:', mappingPath);
  console.log('- dryRun:', dryRun);
  console.log('- limit:', limit || '(no limit)');
  console.log('- onlySlug:', onlySlug || '(all)');
  console.log('- onlySlugs:', onlySlugs.length ? onlySlugs.join(', ') : '(all)');

  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping not found: ${mappingPath}`);
  }

  const rows = parseContentMapping(fs.readFileSync(mappingPath, 'utf-8'));
  const targets = rows.filter((r) => r.status === 'OK' && r.specFile);

  console.log(`- mapping rows: ${rows.length}`);
  console.log(`- importable (OK + spec): ${targets.length}\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const t of targets) {
    if (limit && imported >= limit) break;
    const slug = routeToSlug(t.route);
    if (onlySlug && slug !== onlySlug) continue;
    if (onlySlugs.length && !onlySlugs.includes(slug)) continue;

    const specPath = path.join(analysisDir, t.specFile);
    if (!fs.existsSync(specPath)) {
      console.warn(`⚠️  missing spec: ${t.route} -> ${t.specFile}`);
      skipped++;
      continue;
    }

    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    const title = (spec.metadata && spec.metadata.title) || slug;

    const sections = Array.isArray(spec.sections) ? spec.sections : [];
    const heroSec = sections.find((s) => s && s.type === 'hero');
    const hero =
      heroSec && (heroSec.title || heroSec.text)
        ? {
            title: heroSec.title || title,
            subtitle: heroSec.text ? String(heroSec.text).slice(0, 240) : null,
          }
        : null;

    const dz = [];

    // If hero has KPI cards, render them as a cards section.
    if (heroSec && Array.isArray(heroSec.cards) && heroSec.cards.length) {
      dz.push({
        __component: 'page.section-cards',
        title: '',
        cards: heroSec.cards.map((c) => ({
          title: String(c.title || c.value || '—'),
          description: String(c.text || c.label || ''),
          link: '',
          cardType: 'info',
        })),
      });
    }

    for (const sec of sections) {
      if (!sec || !sec.type) continue;
      if (sec.type === 'hero' || sec.type === 'sidebar') continue;

      if (sec.type === 'cards' && Array.isArray(sec.cards) && sec.cards.length) {
        dz.push({
          __component: 'page.section-cards',
          title: sec.title || '',
          cards: sec.cards.map((c) => ({
            title: String(c.title || '—'),
            description: String(c.text || c.description || ''),
            link: String(c.href || c.link || ''),
            cardType: 'info',
          })),
        });
        continue;
      }

      if (sec.type === 'tabs' && Array.isArray(sec.tabs) && sec.tabs.length) {
        const intro = sectionToRichtext(sec);
        if (intro) {
          dz.push({
            __component: 'page.section-text',
            title: sec.title || '',
            content: intro,
          });
        }

        const tabs = sec.tabs
          .map((t, idx) => ({
            name: String(t?.title || `Tab ${idx + 1}`),
            content: tabToRichtext(t) || '<p></p>',
            order: idx,
          }))
          .filter((t) => t.name);

        if (tabs.length) {
          const defaultTabIdx = sec.tabs.findIndex((t) => t && t.isActive);
          dz.push({
            __component: 'page.document-tabs',
            title: sec.title || '',
            tabs,
            defaultTab: defaultTabIdx >= 0 ? defaultTabIdx : 0,
          });
        }
        continue;
      }

      // Default fallback: section-text richtext
      const content = sectionToRichtext(sec);
      if (!content) continue;
      dz.push({
        __component: 'page.section-text',
        title: sec.title || '',
        content,
      });
    }

    const data = {
      slug,
      title,
      template: t.template,
      deepNavKey: inferDeepNavKey(t.template, t.route),
      hero,
      sections: dz,
      publishedAt: new Date().toISOString(),
    };

    try {
      if (dryRun) {
        console.log(`DRY: create page ${slug} (${t.template}) sections=${dz.length}`);
        imported++;
        continue;
      }

      const existing = await strapi.entityService.findMany('api::page.page', {
        filters: { slug },
        limit: 1,
        publicationState: 'preview',
      });
      if (existing && existing.length) {
        await strapi.entityService.update('api::page.page', existing[0].id, { data });
        console.log(`↻ updated: ${slug} sections=${dz.length}`);
      } else {
        await strapi.entityService.create('api::page.page', { data });
        console.log(`+ created: ${slug} sections=${dz.length}`);
      }

      imported++;
    } catch (e) {
      errors++;
      console.error(`❌ failed: ${slug}`, e?.message || e);
    }
  }

  console.log('\n✅ Import v2 done');
  console.log('- imported:', imported);
  console.log('- skipped:', skipped);
  console.log('- errors:', errors);
};

