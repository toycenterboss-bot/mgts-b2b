/**
 * Seed demo content for a TPL_Contact_Hub page.
 *
 * Uses `page.section-map` markers JSON as the source of locations for the
 * Stitch contact hub template (`contacts_with_interactive_3d_map`).
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-contact-hub-page-demo.js
 *
 * Optional:
 *   MGTS_CONTACT_HUB_DEMO_SLUG="contact_details"
 */

module.exports = async function seedContactHubPageDemo({ strapi }) {
  const slug = process.env.MGTS_CONTACT_HUB_DEMO_SLUG || 'contact_details';

  const existing = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    limit: 1,
    populate: '*',
  });

  // NOTE: `page.section-map.markers` is JSON in our schema.
  // For the contact hub we also allow extra fields (id/category/address/badge)
  // because it's still a JSON blob.
  const markers = [
    {
      id: 'office_north',
      category: 'offices',
      title: 'Офис "Северный"',
      address: 'ул. Тимирязевская, 2/3',
      lat: 55.818,
      lng: 37.574,
      badge: 'Открыто',
    },
    {
      id: 'dc_s1',
      category: 'network',
      title: 'Дата-центр "Южный"',
      address: 'пр-т Вернадского, 18',
      lat: 55.752,
      lng: 37.618,
      badge: 'Узел связи',
    },
    {
      id: 'node_misc',
      category: 'offices',
      title: 'Центр "Восток"',
      address: 'ш. Энтузиастов, 56',
      lat: 55.75,
      lng: 37.64,
      badge: 'Открыто',
    },
  ];

  const data = {
    template: 'TPL_Contact_Hub',
    slug,
    title: 'Контакты',
    hero: {
      title: 'Контакты',
      subtitle: 'Цифровая экосистема для вашего бизнеса (демо).',
      ctaButtons: [],
    },
    sections: [
      {
        __component: 'page.section-map',
        title: 'Локации',
        mapType: 'custom',
        centerLat: 55.751244,
        centerLng: 37.618423,
        zoom: 10,
        markers,
        description: 'Демо-локации для TPL_Contact_Hub (contacts hub).',
      },
    ],
  };

  let page;
  if (existing && existing.length > 0) {
    page = existing[0];
    await strapi.entityService.update('api::page.page', page.id, { data });
  } else {
    page = await strapi.entityService.create('api::page.page', { data });
  }

  if (!page.publishedAt) {
    await strapi.entityService.update('api::page.page', page.id, { data: { publishedAt: new Date().toISOString() } });
  }

  console.log(`✅ Seeded demo TPL_Contact_Hub into slug=${slug} (id=${page.id}) with ${markers.length} markers`);
};

