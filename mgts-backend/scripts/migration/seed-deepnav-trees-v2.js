/**
 * Seed DeepNav trees into api::navigation.navigation.deepNavTrees.
 *
 * Source of truth: docs/project/TECHNICAL_TASK_NEW_SITE.md (section 5.1 Dropdown-блоки).
 *
 * Runs via entityService inside Strapi context (no API token needed).
 */

const fs = require('fs');
const path = require('path');

function link(label, href, isExternal = false) {
  return { __component: 'navigation.deep-nav-link', label, href, isExternal };
}

function itemLink(label, href, order, isExternal = false) {
  return {
    __component: 'navigation.deep-nav-item',
    kind: 'link',
    label,
    href,
    isExternal,
    children: [],
    order,
  };
}

function itemGroup(label, children, order) {
  return {
    __component: 'navigation.deep-nav-item',
    kind: 'group',
    label,
    href: null,
    isExternal: false,
    children,
    order,
  };
}

module.exports = async ({ strapi }) => {
  console.log('\n🌱 Seed deep-nav trees v2\n');

  const navExisting = await strapi.entityService.findMany('api::navigation.navigation', { limit: 1 });
  const nav = Array.isArray(navExisting) ? navExisting[0] : navExisting;
  if (!nav) throw new Error('Navigation single type not found. Run seed-navigation-footer-v2 first.');

  const aboutCompany = {
    __component: 'navigation.deep-nav-tree',
    key: 'about_company',
    title: 'О компании',
    items: [
      itemLink('О МГТС', '/about_mgts', 0),
      itemLink('Ценности МГТС', '/mgts_values', 1),
      itemGroup(
        'Деловая этика и комплаенс',
        [
          link('Обращение гендиректора', '/general_director_message'),
          link('Комплаенс‑политики МГТС', '/mgts_compliance_policies'),
          link('Взаимодействие с партнерами', '/interaction_with_partners'),
          link('Обратная связь', '/partners_feedback_form'),
          link('Единая горячая линия', '/single_hotline'),
        ],
        2
      ),
      itemGroup(
        'Корпоративное управление',
        [
          link('Принципы корпоративного управления', '/principles_corporate_manage'),
          link('Корпоративные документы', '/corporate_documents'),
          link('Решения общих собраний акционеров', '/decisions_meetings_shareholders'),
          link('Информация для акционеров', '/infoformen'),
          link('О регистраторе', '/about_registrar'),
        ],
        3
      ),
    ],
  };

  const documents = {
    __component: 'navigation.deep-nav-tree',
    key: 'documents',
    title: 'Документы',
    items: [
      itemLink('Документация', '/documents', 0),
      itemLink('Лицензии и СРО +', '/licenses', 1),
      itemLink('Оферты', '/offers', 2),
      itemLink('Формы типовых документов', '/forms_doc', 3),
      itemLink('Стандарты раскрытия информации', '/operinfo', 4),
      itemLink('Спецоценка условий труда', '/wca', 5),
      itemLink('Предоставление копий документов', '/stockholder_copies_document', 6),
      itemLink('Сроки устранения неисправностей', '/timing_malfunctions', 7),
      itemLink('Политика ПДн', '/data_processing', 8),
      itemLink('Политика cookies', '/cookie_processing', 9),
      itemLink('Политика охраны труда', '/labor_safety', 10),
    ],
  };

  const disclosure = {
    __component: 'navigation.deep-nav-tree',
    key: 'disclosure',
    title: 'Раскрытие информации',
    items: [
      itemLink('Существенные факты', '/essential_facts', 0),
      itemLink('Список аффилированных лиц', '/affiliated_persons', 1),
      itemLink('Отчеты эмитента', '/stocks_reports', 2),
      itemLink('Годовые отчеты/фин. отчетность', '/reports', 3),
      itemLink('Перечень инсайдерской информации', 'https://example.com/insiders', 4, true),
      itemLink('Структура акционерного капитала', 'https://example.com/share-capital', 5, true),
      itemLink('Выпуск ценных бумаг', '/emission', 6),
    ],
  };

  const developers = {
    __component: 'navigation.deep-nav-tree',
    key: 'developers',
    title: 'Застройщикам',
    items: [
      itemLink('Подключение объектов', '/developers/connecting_objects', 0),
      itemLink('Компенсация потерь', '/developers/compensation_for_losses', 1),
      itemLink('Цифровые решения', '/developers/digital_solutions', 2),
    ],
  };

  await strapi.entityService.update('api::navigation.navigation', nav.id, {
    data: { deepNavTrees: [aboutCompany, documents, disclosure, developers] },
  });

  console.log('✅ deepNavTrees updated:', ['about_company', 'documents', 'disclosure', 'developers'].join(', '));

  // Update pages to use the new deepNavKey
  const developersPages = await strapi.entityService.findMany('api::page.page', {
    filters: { slug: { $startsWith: 'developers' } },
  });

  console.log(`Found ${developersPages.length} developer pages to check.`);

  for (const page of developersPages) {
    if (page.deepNavKey !== 'developers') {
      await strapi.entityService.update('api::page.page', page.id, {
        data: { deepNavKey: 'developers' },
      });
      console.log(`  Updated deepNavKey='developers' for page: ${page.slug}`);
    }
  }

  console.log('✅ deepNavTrees updated:', ['about_company', 'documents', 'disclosure'].join(', '));
  console.log('\nNote: external placeholder links for insiders/share-capital need real URLs.\n');
};

