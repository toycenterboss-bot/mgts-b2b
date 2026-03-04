/**
 * Seed demo content for one TPL_Scenario page using the new Dynamic Zone sections.
 *
 * Usage:
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-scenario-page-demo.js
 *
 * Optional:
 *   MGTS_SCENARIO_DEMO_SLUG="scenario_demo"
 */

module.exports = async function seedScenarioPageDemo({ strapi }) {
  const slug = process.env.MGTS_SCENARIO_DEMO_SLUG || 'scenario_demo';

  const existing = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    limit: 10,
    populate: '*',
  });

  const data = {
    template: 'TPL_Scenario',
    slug,
    title: 'Сценарий (демо)',
    hero: {
      title: 'Гигабитный <span class="text-primary italic">интернет</span> для офиса',
      subtitle:
        'Сценарий использования: подключение, тарифы, FAQ и поддержка — показываем работу типовых секций.',
      ctaButtons: [
        { text: 'Подключить сейчас', href: '/contact', style: 'primary' },
        { text: 'Посмотреть тарифы', href: '/services', style: 'secondary' },
      ],
    },
    sections: [
      {
        __component: 'page.service-tabs',
        title: 'Панели сценария',
        defaultTab: 0,
        tabs: [
          {
            name: 'Что входит',
            order: 0,
            content:
              '<p><strong>В сценарий</strong> входит подключение, SLA, мониторинг и поддержка.</p><ul><li>Канал связи</li><li>Резервирование</li><li>Интеграция</li></ul>',
          },
          {
            name: 'Требования',
            order: 1,
            content:
              '<p>Минимальные требования: доступ в здание, согласования, точка ввода. Демо‑контент.</p>',
          },
          {
            name: 'Как подключиться',
            order: 2,
            content:
              '<ol><li>Оставьте заявку</li><li>Получите аудит</li><li>Подключим и настроим</li></ol>',
          },
        ],
      },
      {
        __component: 'page.service-faq',
        title: 'FAQ',
        items: [
          {
            question: 'Какая максимальная скорость?',
            answer: '<p>До 10 Гбит/с в зависимости от площадки и технических условий.</p>',
          },
          {
            question: 'Есть ли SLA?',
            answer: '<p>Да, SLA зависит от выбранного тарифа и уровня резервирования.</p>',
          },
          {
            question: 'Можно ли подключить резервный канал?',
            answer: '<p>Да, доступны варианты LTE/радио/вторая линия с автопереключением.</p>',
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

  console.log(`✅ Seeded demo TPL_Scenario into slug=${slug} (ids=${updatedIds.join(',') || 'n/a'})`);
};

