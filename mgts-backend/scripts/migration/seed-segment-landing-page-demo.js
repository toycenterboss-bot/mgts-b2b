/**
 * Seed demo content for one TPL_Segment_Landing page.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-segment-landing-page-demo.js
 *
 * Optional:
 *   MGTS_SEGMENT_DEMO_SLUG="developers"
 */

module.exports = async function seedSegmentLandingPageDemo({ strapi }) {
  const slug = process.env.MGTS_SEGMENT_DEMO_SLUG || 'developers';

  const existing = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    limit: 10,
    populate: '*',
  });

  const titleBySlug = {
    developers: 'Застройщикам',
    operators: 'Операторам',
    government: 'Госсектору',
    business: 'Бизнесу',
  };

  const humanTitle = titleBySlug[slug] || 'Сегмент';

  const data = {
    template: 'TPL_Segment_Landing',
    slug,
    title: humanTitle,
    hero: {
      title: `${humanTitle}: цифровая инфраструктура <span class="text-primary">будущего</span>`,
      subtitle:
        'Сегментная витрина: ключевые услуги, сценарии и быстрые входы (демо — дальше наполним реальным контентом).',
      ctaButtons: [
        { text: 'Получить консультацию', href: '/contact', style: 'primary' },
        { text: 'Портфолио проектов', href: '/about_mgts', style: 'secondary' },
      ],
    },
    sections: [
      {
        __component: 'page.section-cards',
        title: 'Основные услуги',
        cards: [
          {
            title: 'Высокоскоростной интернет',
            description: 'Оптоволоконные каналы до 10 Гбит/с с гарантированным аптаймом.',
            link: '/business/access_internet',
            cardType: 'service',
          },
          {
            title: 'Облачное хранилище',
            description: 'Хранение данных в защищённых дата-центрах Tier III.',
            link: '/services',
            cardType: 'service',
          },
          {
            title: 'Кибербезопасность',
            description: 'DDoS/WAF/SOC и аудит уязвимостей под требования бизнеса.',
            link: '/services',
            cardType: 'service',
          },
          {
            title: 'IP‑телефония',
            description: 'Виртуальная АТС, многоканальные номера и интеграция с CRM.',
            link: '/business/telephony',
            cardType: 'service',
          },
        ],
      },
      {
        __component: 'page.section-cards',
        title: 'Отраслевые сценарии',
        cards: [
          {
            title: 'Для Ритейла',
            description: 'Wi‑Fi аналитика, видеонаблюдение и кассовые решения для магазинов.',
            link: '/services',
            cardType: 'navigation',
          },
          {
            title: 'Для Застройщиков',
            description: 'Цифровизация ЖК: домофоны, диспетчеризация и безопасность.',
            link: '/developers',
            cardType: 'navigation',
          },
          {
            title: 'Для Госсектора',
            description: 'Защищённые каналы связи и суверенные облака.',
            link: '/government',
            cardType: 'navigation',
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

  const hasPublished = (existing || []).some((p) => !!p?.publishedAt);
  if (!hasPublished && updatedIds.length > 0) {
    await strapi.entityService.update('api::page.page', updatedIds[0], {
      data: { publishedAt: new Date().toISOString() },
    });
  }

  console.log(`✅ Seeded demo TPL_Segment_Landing into slug=${slug} (ids=${updatedIds.join(',') || 'n/a'})`);
};

