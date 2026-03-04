/**
 * Seed demo content for one TPL_Service page using the new Dynamic Zone sections.
 *
 * Usage (recommended):
 *   cd mgts-backend
 *   MGTS_DISABLE_PAGE_LIFECYCLES=1 node scripts/migration/run-seed-service-page-demo.js
 */

module.exports = async function seedServicePageDemo({ strapi }) {
  const slug = process.env.MGTS_SERVICE_DEMO_SLUG || 'business/access_internet';

  const pages = await strapi.entityService.findMany('api::page.page', {
    filters: { slug },
    limit: 1,
    populate: '*',
  });

  if (!pages || pages.length === 0) {
    throw new Error(`Page not found by slug: ${slug}`);
  }

  const page = pages[0];

  const data = {
    // keep template as-is if already set; otherwise set to TPL_Service
    template: page.template || 'TPL_Service',
    hero: {
      title: page.title || 'Доступ в интернет',
      subtitle: 'Канал связи для бизнеса: стабильный, защищённый, с SLA.',
      ctaButtons: [],
    },
    sections: [
      {
        __component: 'page.section-text',
        title: 'Описание услуги',
        content:
          '<p>Доступ в интернет для бизнеса: выделенная линия, мониторинг, техническая поддержка и варианты резервирования канала.</p>',
      },
      {
        __component: 'page.service-consultation-card',
        title: 'Нужна персональная консультация?',
        subtitle: 'Наши технические специалисты готовы ответить на любые вопросы по интеграции 24/7.',
        buttonText: 'Связаться с нами',
        buttonHref: '/contact',
      },
      {
        __component: 'page.service-customization-panel',
        title: 'Кастомизация',
        dropdownLabel: 'Тип подключения',
        dropdownOptions: [
          { label: 'Оптоволокно (GPON)', value: 'gpon' },
          { label: 'Медная линия (VDSL)', value: 'vdsl' },
          { label: 'Спутниковая связь', value: 'sat' },
        ],
        toggles: [
          { label: 'Статический IP', enabled: true },
          { label: 'Круглосуточный SLA', enabled: false },
        ],
        applyText: 'Применить настройки',
      },
      {
        __component: 'page.service-stats-card',
        title: 'Пропускная способность',
        bars: [40, 60, 80, 50, 90, 100, 70],
        statLabel: 'Пиковая нагрузка',
        statValue: '942 Mb/s',
      },
      {
        __component: 'page.tariff-table',
        title: 'Тарифы',
        description: 'Пример таблицы. Дальше будем наполнять из реальных тарифов/спеков.',
        columns: [
          { name: 'Скорость', key: 'speed' },
          { name: 'SLA', key: 'sla' },
          { name: 'Цена', key: 'price' },
        ],
        rows: [
          { speed: '100 Мбит/с', sla: '99.5%', price: 'от 9 900 ₽/мес' },
          { speed: '300 Мбит/с', sla: '99.7%', price: 'от 14 900 ₽/мес' },
          { speed: '1 Гбит/с', sla: '99.9%', price: 'от 29 900 ₽/мес' },
        ],
      },
      {
        __component: 'page.service-faq',
        title: 'Часто задаваемые вопросы',
        items: [
          {
            question: 'Сколько времени занимает подключение?',
            answer: '<p>Сроки зависят от наличия инфраструктуры и согласований. Обычно 5–20 рабочих дней.</p>',
          },
          {
            question: 'Есть ли резервирование канала?',
            answer:
              '<p>Да, можно подключить резервный канал (LTE/радио/вторая линия) с автоматическим переключением.</p>',
          },
          {
            question: 'Какая поддержка включена?',
            answer: '<p>Круглосуточная поддержка, мониторинг и уведомления о событиях.</p>',
          },
        ],
      },
      {
        __component: 'page.service-order-form',
        title: 'Заказать услугу',
        subtitle: 'Оставьте заявку — свяжемся в течение 15 минут (демо).',
        formAction: '#',
        formMethod: 'POST',
        formType: 'business-request',
        section: 'business',
      },
    ],
  };

  await strapi.entityService.update('api::page.page', page.id, { data });

  // Publish if needed
  if (!page.publishedAt) {
    await strapi.entityService.update('api::page.page', page.id, { data: { publishedAt: new Date().toISOString() } });
  }

  console.log(`✅ Seeded demo TPL_Service content into page slug=${slug} (id=${page.id})`);
};

