/**
 * Seed demo content for a TPL_Doc_Page "documents" page.
 *
 * Creates/updates a Page entry and uploads a few local files into Media Library
 * to use as demo "documents" in `page.files-table`.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-documents-page-demo.js
 *
 * Optional:
 *   MGTS_DOC_DEMO_SLUG="documents"
 */
const path = require('path');

module.exports = async function seedDocumentsPageDemo({ strapi }) {
  const slug = process.env.MGTS_DOC_DEMO_SLUG || 'documents';

  // Reuse existing Media Library files (plugin::upload.file) to avoid dealing with
  // internal upload service signature differences across Strapi versions.
  const media = await strapi.entityService.findMany('plugin::upload.file', {
    limit: 8,
    sort: { createdAt: 'desc' },
  });
  const uploaded = Array.isArray(media) ? media.filter(Boolean) : [];
  if (uploaded.length === 0) {
    throw new Error('Media Library is empty: cannot seed documents page without files.');
  }

  // Find or create page.
  // NOTE: a slug may have both a draft + a published entry (same documentId).
  // Our API prefers the draft, so we update ALL matching entries to keep them consistent.
  const existing = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    limit: 10,
    populate: '*',
  });

  const data = {
    template: 'TPL_Doc_Page',
    slug,
    title: 'Документы',
    hero: {
      title: 'Документы',
      subtitle: 'Официальные документы и материалы компании (демо).',
      ctaButtons: [],
    },
    sections: [
      {
        __component: 'page.section-text',
        title: 'Раздел “Документы”',
        content:
          '<p>Демо-страница для проверки рендера <code>page.document-tabs</code> и <code>page.files-table</code> в <code>tpl_doc_page</code>.</p>',
      },
      {
        __component: 'page.document-tabs',
        title: 'Категории',
        defaultTab: 0,
        tabs: [
          {
            name: 'Все',
            order: 0,
            filterKey: '',
            content:
              '<p>Ниже — список демо-файлов (пока это картинки из репозитория, загруженные в Media Library).</p>',
          },
          {
            name: 'Оферты',
            order: 1,
            filterKey: 'offers',
            content: '<p>Здесь позже будут оферты / условия использования (демо).</p>',
          },
        ],
      },
      {
        __component: 'page.files-table',
        title: 'Файлы',
        columns: [
          { name: 'Название', key: 'name' },
          { name: 'Тип', key: 'fileType' },
          { name: 'Размер', key: 'size' },
        ],
        files: uploaded.map((u, idx) => {
          const ext = String(u.ext || '').toLowerCase();
          const mapType = (x) => {
            if (x === '.pdf') return 'pdf';
            if (x === '.doc') return 'doc';
            if (x === '.docx') return 'docx';
            if (x === '.xls') return 'xls';
            if (x === '.xlsx') return 'xlsx';
            if (x === '.zip') return 'zip';
            return 'other';
          };
          return {
            name: u.name || `Файл ${idx + 1}`,
            file: u.id,
            fileType: mapType(ext),
            categoryKey: idx < 3 ? 'offers' : '',
            size: u.size ? `${u.size} MB` : '',
            description: '',
            order: idx,
          };
        }),
      },
    ],
  };

  /** @type {any[]} */
  const updatedIds = [];
  if (existing && existing.length > 0) {
    for (const p of existing) {
      if (!p || !p.id) continue;
      await strapi.entityService.update('api::page.page', p.id, { data });
      updatedIds.push(p.id);
    }
  } else {
    const created = await strapi.entityService.create('api::page.page', { data });
    if (created?.id) updatedIds.push(created.id);
  }

  // Publish at least one entry for convenience (if none is published yet).
  const hasPublished = (existing || []).some((p) => !!p?.publishedAt);
  if (!hasPublished && updatedIds.length > 0) {
    await strapi.entityService.update('api::page.page', updatedIds[0], {
      data: { publishedAt: new Date().toISOString() },
    });
  }

  console.log(`✅ Seeded demo TPL_Doc_Page into slug=${slug} (ids=${updatedIds.join(',')}) with ${uploaded.length} media files`);
};

