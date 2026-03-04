/**
 * Seed demo content for TPL_Home (create if missing).
 *
 * Usage (recommended):
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-home-page-demo.js
 */
 
module.exports = async function seedHomePageDemo({ strapi }) {
  const slug = process.env.MGTS_HOME_DEMO_SLUG || 'home';
 
  const existing = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    limit: 10,
    populate: '*',
  });
 
  const data = {
    template: 'TPL_Home',
    slug,
    title: 'Главная',
    hero: {
      // NOTE: `tpl_home` hero title has rich markup; for demo we allow HTML in this string.
      title:
        'ЭНЕРГИЯ <br/>' +
        '<span class="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">ТЕХНОЛОГИЙ</span> <br/>' +
        '<span class="text-primary">ДЛЯ БИЗНЕСА</span>',
      subtitle:
        'Высокоскоростные каналы передачи данных и комплексные IT‑решения от крупнейшего инфраструктурного оператора.',
      ctaButtons: [
        { text: 'Подобрать решение', href: '/services', style: 'primary' },
        { text: 'Оставить заявку', href: '/contact', style: 'secondary' },
      ],
    },
    sections: [
      {
        __component: 'page.section-cards',
        title: 'Сервисы MGTS 3.0',
        cards: [
          {
            title: 'Оптоволокно 10G',
            description: 'Сверхскоростные выделенные каналы с гарантированной пропускной способностью.',
            link: '/business/access_internet',
            cardType: 'service',
          },
          {
            title: 'Cloud Nodes',
            description: 'Экосистема облачных вычислений Tier III с мгновенным масштабированием.',
            link: '/services',
            cardType: 'service',
          },
          {
            title: 'Cyber Defense',
            description: 'Нейросетевая защита от DDoS‑атак и шифрование данных по ГОСТ.',
            link: '/services',
            cardType: 'service',
          },
          {
            title: 'Smart Sensors',
            description: 'Индустриальный интернет вещей (IIoT) для мониторинга активов в реальном времени.',
            link: '/services',
            cardType: 'service',
          },
        ],
      },
    ],
  };
 
  /** @type {number[]} */
  const updatedIds = [];
 
  if (existing && existing.length > 0) {
    for (const p of existing) {
      if (!p?.id) continue;
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
 
  console.log(`✅ Seeded demo TPL_Home into slug=${slug} (ids=${updatedIds.join(',') || 'n/a'})`);
};

