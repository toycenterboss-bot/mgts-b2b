/**
 * Seed Navigation/Footer structured fields from existing artifacts.
 *
 * Sources:
 * - docs/project/TECHNICAL_TASK_NEW_SITE.md (menu/footer structure)
 *
 * Goal: ensure Navigation/Footer single types exist and are populated with
 * structured components (no raw JSON fields).
 *
 * Runs via entityService inside Strapi context (no API token needed).
 */

const makeMenuItem = (label, href, order, opts = {}) => ({
  __component: 'navigation.menu-item',
  label,
  href,
  isExternal: Boolean(opts.isExternal),
  hasMegaMenu: Boolean(opts.hasMegaMenu),
  megaMenuId: opts.megaMenuId || null,
  order,
  isVisible: opts.isVisible ?? true,
});

const makeMenuLink = (label, href, isExternal = false) => ({
  __component: 'navigation.menu-link',
  label,
  href,
  isExternal,
});

function buildNavigationFromTechnicalTask() {
  const phone = '+74957007070';
  const phoneDisplay = '+7 495 700-70-70';

  const mainMenuItems = [
    makeMenuItem('О компании', '/about_mgts', 0),
    makeMenuItem('Новости', '/news', 1),
    makeMenuItem('Контакты', '/contact', 2),
    makeMenuItem('Найм / Карьера', '/career', 3),
    makeMenuItem('Недискриминационный доступ', '/operators/nondiscriminatory_access', 4),
    makeMenuItem('AI‑чат', '/ai-chat', 5),
    makeMenuItem('Подобрать решение', '/contact', 6),
    makeMenuItem('Решения / Каталог', '/services', 7, { hasMegaMenu: true, megaMenuId: 'services' }),
    makeMenuItem('Застройщикам', '/developers', 8, { hasMegaMenu: true, megaMenuId: 'developers' }),
    makeMenuItem('Операторам связи', '/operators', 9, { hasMegaMenu: true, megaMenuId: 'operators' }),
    makeMenuItem('Госзаказчикам', '/government', 10, { hasMegaMenu: true, megaMenuId: 'government' }),
    makeMenuItem('Партнерам', '/partners', 11, { hasMegaMenu: true, megaMenuId: 'partners' }),
  ];

  const megaMenus = [
    {
      __component: 'navigation.mega-menu',
      menuId: 'services',
      title: 'Решения / Каталог',
      sections: [
        {
          __component: 'navigation.mega-menu-section',
          title: 'Сценарии',
          titleHref: '/services',
          links: [
            makeMenuLink('Подключить объект', '/services/scenario-connecting-object'),
            makeMenuLink('Инфраструктура 360', '/services/scenario-infrastructure-360'),
            makeMenuLink('Безопасный объект', '/services/scenario-safe-object'),
            makeMenuLink('Связь/данные', '/services/scenario-connectivity-data'),
            makeMenuLink('Видео‑наблюдение и доступ', '/services/scenario-video-access'),
            makeMenuLink('Эксплуатация сети', '/services/scenario-network-ops'),
          ],
        },
        {
          __component: 'navigation.mega-menu-section',
          title: 'CTA',
          links: [makeMenuLink('Подобрать решение', '/contact'), makeMenuLink('Связаться', '/contact')],
        },
      ],
    },
    {
      __component: 'navigation.mega-menu',
      menuId: 'developers',
      title: 'Застройщикам',
      sections: [
        {
          __component: 'navigation.mega-menu-section',
          title: 'Инфраструктура',
          titleHref: '/developers/connecting_objects',
          links: [
            makeMenuLink('Подключение объектов', '/developers/connecting_objects'),
            makeMenuLink('Компенсация убытков', '/developers/compensation_for_losses'),
          ],
        },
        {
          __component: 'navigation.mega-menu-section',
          title: 'Инфраструктурные продукты и решения',
          titleHref: '/developers/digital_solutions',
          links: [makeMenuLink('Цифровые решения', '/developers/digital_solutions')],
        },
      ],
    },
    {
      __component: 'navigation.mega-menu',
      menuId: 'operators',
      title: 'Операторам связи',
      sections: [
        {
          __component: 'navigation.mega-menu-section',
          title: 'Инфраструктура',
          titleHref: '/operators/infrastructure',
          links: [
            makeMenuLink('Размещение на объектах', '/operators/infrastructure/accommodation_at_sites'),
            makeMenuLink('Кабельная канализация', '/operators/infrastructure/lks_kr'),
            makeMenuLink('Проектирование и строительство сетей', '/operators/infrastructure/pir_smr_mgts'),
          ],
        },
        {
          __component: 'navigation.mega-menu-section',
          title: 'Присоединение и пропуск трафика',
          titleHref: '/operators/joining_and_passing_traffic',
          links: [makeMenuLink('Присоединение и пропуск трафика', '/operators/joining_and_passing_traffic')],
        },
        {
          __component: 'navigation.mega-menu-section',
          title: 'Передача данных',
          titleHref: '/operators/data_transfer',
          links: [makeMenuLink('Передача данных', '/operators/data_transfer')],
        },
      ],
    },
    {
      __component: 'navigation.mega-menu',
      menuId: 'government',
      title: 'Госзаказчикам',
      sections: [
        {
          __component: 'navigation.mega-menu-section',
          title: 'Цифровые сервисы',
          titleHref: '/government/digital_services',
          links: [
            makeMenuLink('Подъездное видеонаблюдение', '/government/digital_services/entrance_video_surveillance'),
            makeMenuLink('Видеонаблюдение на объектах строительства', '/government/digital_services/video_surveillance_building'),
            makeMenuLink('Тех. обслуживание видеонаблюдения', '/government/digital_services/video_surveillance_maintenance'),
            makeMenuLink('Оборудование', '/government/digital_services/equipment'),
            makeMenuLink('Сопряжение', '/government/digital_services/main_and_backup_data_transmission'),
            makeMenuLink('Тех. обслуживание', '/government/digital_services/maintenance_interface_device'),
            makeMenuLink('Громкоговорящая связь', '/government/digital_services/speakerphone'),
            makeMenuLink('СКУД', '/government/digital_services/access_control_systems'),
            makeMenuLink('АСУ', '/government/digital_services/automated_control_systems'),
            makeMenuLink('АСКУЭ', '/government/digital_services/automated_system_monitoring_accounting'),
            makeMenuLink('COT', '/government/digital_services/introduction_security_tv_systems'),
          ],
        },
        {
          __component: 'navigation.mega-menu-section',
          title: 'Инфраструктура связи',
          titleHref: '/government/communications_infrastructure',
          links: [
            makeMenuLink('Наружные сети', '/government/communications_infrastructure/external_communication'),
            makeMenuLink('СКС', '/government/communications_infrastructure/structured_cabling_networks'),
            makeMenuLink('ЛВС', '/government/communications_infrastructure/local_computing_network'),
            makeMenuLink('Эксплуатация сети', '/government/communications_infrastructure/network_operation'),
          ],
        },
        {
          __component: 'navigation.mega-menu-section',
          title: 'Индивидуальные решения',
          titleHref: '/government/customized_solutions',
          links: [makeMenuLink('Индивидуальные решения', '/government/customized_solutions')],
        },
      ],
    },
    {
      __component: 'navigation.mega-menu',
      menuId: 'partners',
      title: 'Партнерам',
      sections: [
        {
          __component: 'navigation.mega-menu-section',
          title: 'Раздел для партнеров',
          titleHref: '/partners',
          links: [
            makeMenuLink('Порядок допуска к проведению работ', '/partners/procedure_admission_work'),
            makeMenuLink('Реализация ТМЦ', '/partners/realization'),
            makeMenuLink('Рамочный договор', '/partners/ramochnie_dogovori'),
            makeMenuLink('Документация', '/partners/documents'),
            makeMenuLink('Закупки', '/partners/purchas'),
            makeMenuLink('Тарифы', '/partners/tariffs'),
          ],
        },
      ],
    },
  ];

  return { phone, phoneDisplay, mainMenuItems, megaMenus };
}

function buildFooterFromTechnicalTask() {
  const sections = [
    {
      __component: 'footer.footer-section',
      title: 'Быстрые ссылки',
      order: 0,
      links: [
        makeMenuLink('Контакты', '/contact'),
        makeMenuLink('Подобрать решение', '/contact'),
        makeMenuLink('Найм / Карьера', '/career'),
        makeMenuLink('О компании', '/about_mgts'),
        makeMenuLink('Новости', '/news'),
        makeMenuLink('Документы', '/documents'),
        makeMenuLink('Раскрытие информации', '/disclosure'),
        makeMenuLink('Актив‑отель Искра', 'https://www.pansionatiskra.ru/', true),
        makeMenuLink('Для дома', 'https://mts.ru/', true),
        makeMenuLink('Коммерческая недвижимость', 'https://arenda.mgts.ru/', true),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'О компании',
      order: 1,
      links: [
        makeMenuLink('О МГТС', '/about_mgts'),
        makeMenuLink('Ценности МГТС', '/mgts_values'),
        makeMenuLink('Обращение гендиректора', '/general_director_message'),
        makeMenuLink('Комплаенс‑политики МГТС', '/mgts_compliance_policies'),
        makeMenuLink('Взаимодействие с партнерами', '/interaction_with_partners'),
        makeMenuLink('Обратная связь', '/partners_feedback_form'),
        makeMenuLink('Единая горячая линия', '/single_hotline'),
        makeMenuLink('Принципы корпоративного управления', '/principles_corporate_manage'),
        makeMenuLink('Корпоративные документы', '/corporate_documents'),
        makeMenuLink('Решения общих собраний акционеров', '/decisions_meetings_shareholders'),
        makeMenuLink('Информация для акционеров', '/infoformen'),
        makeMenuLink('О регистраторе', '/about_registrar'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Документы',
      order: 2,
      links: [
        makeMenuLink('Лицензии и СРО', '/licenses'),
        makeMenuLink('Оферты', '/offers'),
        makeMenuLink('Формы типовых документов', '/forms_doc'),
        makeMenuLink('Стандарты раскрытия информации', '/operinfo'),
        makeMenuLink('Спецоценка условий труда', '/wca'),
        makeMenuLink('Предоставление копий документов', '/stockholder_copies_document'),
        makeMenuLink('Сроки устранения неисправностей', '/timing_malfunctions'),
        makeMenuLink('Политика ПДн', '/data_processing'),
        makeMenuLink('Политика cookies', '/cookie_processing'),
        makeMenuLink('Политика охраны труда', '/labor_safety'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Раскрытие информации',
      order: 3,
      links: [
        makeMenuLink('Существенные факты', '/essential_facts'),
        makeMenuLink('Список аффилированных лиц', '/affiliated_persons'),
        makeMenuLink('Отчеты эмитента', '/stocks_reports'),
        makeMenuLink('Годовые отчеты/фин. отчетность', '/reports'),
        makeMenuLink('Выпуск ценных бумаг', '/emission'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Застройщикам',
      order: 4,
      links: [
        makeMenuLink('Подключение объектов', '/developers/connecting_objects'),
        makeMenuLink('Компенсация убытков', '/developers/compensation_for_losses'),
        makeMenuLink('Цифровые решения', '/developers/digital_solutions'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Операторам связи',
      order: 5,
      links: [
        makeMenuLink('Присоединение и пропуск трафика', '/operators/joining_and_passing_traffic'),
        makeMenuLink('Передача данных', '/operators/data_transfer'),
        makeMenuLink('Инфраструктура', '/operators/infrastructure'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Госзаказчикам',
      order: 6,
      links: [
        makeMenuLink('Инфраструктура связи', '/government/communications_infrastructure'),
        makeMenuLink('Цифровые сервисы', '/government/digital_services'),
        makeMenuLink('Индивидуальные решения', '/government/customized_solutions'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Бизнесу',
      order: 7,
      links: [
        makeMenuLink('Телефония', '/business/telephony'),
        makeMenuLink('Мобильная связь', '/business/mobile_connection'),
        makeMenuLink('Виртуальная АТС', '/virtual_ate'),
        makeMenuLink('Доступ в интернет', '/business/access_internet'),
        makeMenuLink('Телевидение', '/business/digital_television'),
        makeMenuLink('Видеонаблюдение', '/business/video_surveillance_office'),
        makeMenuLink('Охрана', '/business/security_alarm'),
        makeMenuLink('Компьютерная помощь', '/business/equipment_setup/computer_help'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Партнерам',
      order: 8,
      links: [
        makeMenuLink('Закупки', '/partners/purchas'),
        makeMenuLink('Допуск к проведению работ', '/partners/procedure_admission_work'),
        makeMenuLink('Реализация ТМЦ', '/partners/realization'),
        makeMenuLink('Тарифы', '/partners/tariffs'),
        makeMenuLink('Документация', '/partners/documents'),
        makeMenuLink('Рамочный договор', '/partners/ramochnie_dogovori'),
      ],
    },
    {
      __component: 'footer.footer-section',
      title: 'Каталог услуг',
      order: 9,
      links: [
        makeMenuLink('Подключить объект', '/services/scenario-connecting-object'),
        makeMenuLink('Инфраструктура 360', '/services/scenario-infrastructure-360'),
        makeMenuLink('Безопасный объект', '/services/scenario-safe-object'),
        makeMenuLink('Связь/данные', '/services/scenario-connectivity-data'),
        makeMenuLink('Видео‑наблюдение и доступ', '/services/scenario-video-access'),
        makeMenuLink('Эксплуатация сети', '/services/scenario-network-ops'),
      ],
    },
  ];

  const legalLinks = [
    { __component: 'footer.legal-link', label: 'Политика обработки персональных данных', href: '/data_processing' },
    { __component: 'footer.legal-link', label: 'Политика cookies', href: '/cookie_processing' },
    { __component: 'footer.legal-link', label: 'Пользовательское соглашение', href: '/terms' },
    { __component: 'footer.legal-link', label: 'Карта сайта', href: '/sitemap' },
  ];

  return {
    sections,
    legalLinks,
    socialLinks: [],
  };
}

module.exports = async ({ strapi }) => {
  console.log('\n🌱 Seed navigation/footer v2\n');

  // Navigation (single type)
  const navExisting = await strapi.entityService.findMany('api::navigation.navigation', { limit: 1 });
  const nav = Array.isArray(navExisting) ? navExisting[0] : navExisting;

  const { phone, phoneDisplay, mainMenuItems, megaMenus } = buildNavigationFromTechnicalTask();

  const navData = {
    logoAlt: 'МГТС',
    phone,
    phoneDisplay,
    mainMenuItems,
    megaMenus,
  };

  if (nav) {
    await strapi.entityService.update('api::navigation.navigation', nav.id, { data: navData });
    console.log(`↻ navigation updated (mainMenuItems=${mainMenuItems.length})`);
  } else {
    await strapi.entityService.create('api::navigation.navigation', { data: navData });
    console.log(`+ navigation created (mainMenuItems=${mainMenuItems.length})`);
  }

  // Footer (single type)
  const footerExisting = await strapi.entityService.findMany('api::footer.footer', { limit: 1 });
  const footer = Array.isArray(footerExisting) ? footerExisting[0] : footerExisting;

  const footerData = {
    copyright: '© 2025 МГТС. Все права защищены.',
    ...buildFooterFromTechnicalTask(),
  };

  if (footer) {
    await strapi.entityService.update('api::footer.footer', footer.id, { data: footerData });
    console.log(`↻ footer updated (sections=${footerData.sections.length})`);
  } else {
    await strapi.entityService.create('api::footer.footer', { data: footerData });
    console.log(`+ footer created (sections=${footerData.sections.length})`);
  }

  console.log('\n✅ Seed navigation/footer v2 done\n');
};

