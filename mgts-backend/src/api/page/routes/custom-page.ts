/**
 * Custom page routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/pages/slug/:slug',
      handler: 'page.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      // Same as /pages/slug/:slug but supports slugs containing "/" via query param.
      // Example: /api/pages/by-slug?slug=business/access_internet
      method: 'GET',
      path: '/pages/by-slug',
      handler: 'page.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/pages/sections-stats',
      handler: 'page.getSectionsStats',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/menu',
      handler: 'page.getMenu',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/pages/delete-all',
      handler: 'page.deleteAll',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/pages/update-parent-relations',
      handler: 'page.updateParentRelations',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/pages/check-parent-relations',
      handler: 'page.checkParentRelations',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/pages/main-menu',
      handler: 'page.getMainMenu',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      // Seed 1–2 service pages with structured sections (tariff-table, FAQ, lead form)
      // so tpl_service becomes CMS-driven.
      // Example: POST /api/pages/seed-service-sections?slug=business/access_internet
      method: 'POST',
      path: '/pages/seed-service-sections',
      handler: 'page.seedServiceSections',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      // Seed doc pages with document-tabs + files-table (uploads small sample files)
      // so tpl_doc_page becomes CMS-driven.
      // Example: POST /api/pages/seed-doc-sections?slug=partners/documents
      method: 'POST',
      path: '/pages/seed-doc-sections',
      handler: 'page.seedDocSections',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      // Seed contact hub pages with section-map markers JSON (offices/network)
      // so tpl_contact_hub becomes CMS-driven.
      // Example: POST /api/pages/seed-contact-hub?slug=contact_details
      method: 'POST',
      path: '/pages/seed-contact-hub',
      handler: 'page.seedContactHub',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      // Seed segment landing pages with section-cards blocks (services + scenarios)
      // so tpl_segment_landing becomes CMS-driven.
      // Example: POST /api/pages/seed-segment-landing?slug=business
      method: 'POST',
      path: '/pages/seed-segment-landing',
      handler: 'page.seedSegmentLanding',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/pages/footer',
      handler: 'page.getFooter',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};





