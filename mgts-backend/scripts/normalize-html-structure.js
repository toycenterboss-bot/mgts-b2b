const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Загружаем контекстно-зависимый маппинг
const CONTEXT_DEPENDENT_MAPPING_FILE = path.join(__dirname, '../../temp/services-extraction/context-dependent-mapping.json');
let CONTEXT_DEPENDENT_MAPPING = {};
if (fs.existsSync(CONTEXT_DEPENDENT_MAPPING_FILE)) {
    CONTEXT_DEPENDENT_MAPPING = JSON.parse(fs.readFileSync(CONTEXT_DEPENDENT_MAPPING_FILE, 'utf-8'));
}

const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const DETAILED_CLASSIFICATION_FILE = path.join(__dirname, '../../temp/services-extraction/detailed-sections-classification.json');

// Список целевых компонентов Strapi
const TARGET_COMPONENTS = [
    'hero',
    'section-text',
    'section-cards',
    'service-tariffs',
    'service-faq',
    'service-order-form',
    'section-map',
    'history-timeline',
    'how-to-connect',
    'image-carousel',
    'mobile-app-section',
    'crm-cards',
    'files-table',
    'tariff-table',
    'document-tabs',
    'service-tabs',
];

// Создаем директорию для нормализованного контента
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Элементы для удаления
// ВАЖНО: Удаляем только явно служебные элементы, НЕ контейнеры с контентом внутри секций
const REMOVE_SELECTORS = [
    'nav.bread-crumbs-row',
    'nav[class*="breadcrumb"]',
    '[class*="bread-crumbs-row"]', // Удаляем все элементы с классом bread-crumbs-row
    '[class*="breadcrumb"]',
    'footer',
    '.footer',
    'header',
    '.header',
    '.banner-cookie-container',
    '.mega-menu',
    'script[src*="yandex"]',
    '.sidebar-menu-desktop',
    '.sidebar-content-container',
    'aside.sidebar-menu-desktop',
    // НЕ удаляем .container-mgts - это контейнеры с контентом внутри секций!
    // Удаляем только верхнеуровневый .container-mgts, если он не содержит секций
];

// Маппинг классов старого сайта на новые компоненты
// Приоритет: более специфичные селекторы идут первыми
const CLASS_MAPPING = [
    // Нестандартные элементы (высокий приоритет)
    { selector: '.block-mgts-history', type: 'history-timeline' },
    { selector: '[class*="block-mgts-history"]', type: 'history-timeline' },
    { selector: '.files-list', type: 'files-table' },
    { selector: '.tariff-table', type: 'tariff-table' },
    { selector: '.block-tariff-table', type: 'tariff-table' },
    { selector: '.call-management-slider', type: 'image-carousel' },
    { selector: '.mobile-app-slider', type: 'mobile-app-section' },
    { selector: '.crm-integration-container', type: 'crm-cards' },
    { selector: '[class*="how-to-connect"]', type: 'how-to-connect' },
    { selector: '[class*="подключ"]', type: 'how-to-connect' },
    
    // Hero секции
    { selector: '.title-promo-long', type: 'hero' },
    { selector: '[class*="title-promo"]', type: 'hero' },
    
    // Секции с тарифами
    { selector: '.tariff-cards-container', type: 'service-tariffs' },
    
    // FAQ секции
    { selector: '.accordion-row', type: 'service-faq' },
    { selector: '[class*="accordion"]', type: 'service-faq' },
    
    // Секции с карточками
    { selector: '.advantage-cards-container', type: 'section-cards' },
    { selector: '[class*="cards-container"]', type: 'section-cards' },
    
    // Формы заказа
    { selector: '.request-form-container', type: 'service-order-form' },
    { selector: '.section-request-container', type: 'service-order-form' },
    
    // Карты
    { selector: '.section-addresses-objects-map', type: 'section-map' },
    { selector: '[class*="map"]', type: 'section-map' },
    
    // Табы документов (для document_tabs)
    { selector: '.documents-tabs-container', type: 'document-tabs' },
    { selector: '[class*="documents-tab"]', type: 'document-tabs' },
    { selector: '.files-list[class*="tab"]', type: 'document-tabs' },
    
    // Табы услуг (для service_tabs)
    { selector: '.service-tabs-container', type: 'service-tabs' },
    { selector: '[class*="service-tab"]', type: 'service-tabs' },
    { selector: '.cards-container[class*="tab"]', type: 'service-tabs' },
    
    // Текстовые секции (низкий приоритет, используется по умолчанию)
    { selector: '.title-h1-wide', type: 'section-text' },
    { selector: '.h1-wide-med', type: 'section-text' },
    { selector: '.block-about-mgts', type: 'section-text' },
    { selector: '[class*="block-"]', type: 'section-text' },
];

// Маппинг внутренних классов компонентов на правильные классы Strapi
const INTERNAL_CLASSES_MAPPING = {
    // History timeline
    'history-timeline': {
        'data-title': 'history-timeline__period-title',
        'data-info-item': 'history-timeline__period',
        'p1-text-reg': 'history-timeline__period-content',
        'image-note-container': 'history-timeline__image-container',
        'image-box': 'history-timeline__image',
        'image-box__image': 'history-timeline__image-img',
        'image-box__description-text': 'history-timeline__image-description',
        'note-info': 'history-timeline__note',
        'tabs-row-selection': 'history-timeline__tabs',
        'tab-buttons-container': 'history-timeline__tabs-container',
        'tab-button-item': 'history-timeline__tab-button',
        'history-content': 'history-timeline__content',
        'content-box': 'history-timeline__content-box',
        'data-content-list': 'history-timeline__periods-list',
        'h2-comp-med': 'history-timeline__title', // для h2 тегов
        'h1-wide-med': 'history-timeline__period-title', // для div/h1 тегов внутри периодов
        'type-size-L': '', // служебный класс, удаляем
        'last-data-item': 'history-timeline__period--last',
    },
    // Hero
    'hero': {
        'title-promo-long': 'hero__container',
        'title-promo-long__title-text': 'hero__title',
        'title-promo-long__description-text': 'hero__subtitle',
        'mb-default': '', // служебный класс, удаляем
    },
    // Service tariffs
    'service-tariffs': {
        'tariff-card': 'service-tariffs__tariff',
        'tariff-cards-container': 'service-tariffs__container',
        'h1-wide-title-text': 'service-tariffs__title', // для h1 тегов
        'h1-wide': 'service-tariffs__title-wrapper', // для div тегов
        'h3-comp-med': 'service-tariffs__tariff-title', // для h3 тегов
        'title-h1-wide': 'service-tariffs__title-wrapper',
        'title-h1-wide__title-text': 'service-tariffs__title',
        'title-h1-wide__description-text': 'service-tariffs__description',
        'p1-comp-reg': 'service-tariffs__description',
        'p2-comp-reg': 'service-tariffs__description',
        // Дополнительные маппинги из анализа
        'b2b_connection_request': '', // служебный класс, удаляем
        // Дополнительные маппинги из анализа
        'tariff-card__services-box': 'service-tariffs__tariff-services',
        'tariff-card__tariff': 'service-tariffs__tariff',
        'tariff-card__tariff-text': 'service-tariffs__tariff-price',
        'tariff-card__tariff-text-price': 'service-tariffs__tariff-price-value',
        'tariff-card__tariff-text-periods': 'service-tariffs__tariff-price-period',
        'tariff-card__comment': 'service-tariffs__tariff-comment',
        'tariff-card__footer-comment': 'service-tariffs__tariff-footer-comment',
        'tariff-cards-container-scroll': 'service-tariffs__container',
    
        'block-tariff-table': 'service-tariffs__table-wrapper',
        'p3-comp-reg': 'service-tariffs__description',
        'h2-comp-med': 'service-tariffs__subtitle',
        'block-text-box': 'service-tariffs__text-box',
        'p1-comp-reg': 'service-tariffs__description',
        'h1-wide-med': 'service-tariffs__title',
    },
    // Section cards
    'section-cards': {
        'advantage-card': 'section-cards__card',
        'advantage-cards-container': 'section-cards__container',
        'h1-wide-title-text': 'section-cards__title', // для h1 тегов
        'h1-wide': 'section-cards__title-wrapper', // для div тегов
        'h2-comp-med': 'section-cards__card-title', // для h2 тегов
        'h3-comp-med': 'section-cards__card-title', // для h3 тегов
        'circle-icon': 'section-cards__card-icon',
        'big-circle': 'section-cards__card-icon--big',
        'p2-comp-reg': 'section-cards__card-text', // для текста в карточках
        'title-h1-wide': 'section-cards__title-wrapper',
        'title-h1-wide__title-text': 'section-cards__title',
        'title-h1-wide__description-text': 'section-cards__description',
        'card-content': 'section-cards__card-content',
        'card-content__title': 'section-cards__card-title',
        'card-content__text': 'section-cards__card-text',
        'service-card-type-2__header': 'section-cards__card-header',
        'service-card-type-2__content-wrapper': 'section-cards__card-content',
        'advantage-card__header': 'section-cards__card-title',
        'advantage-card__content-wrapper': 'section-cards__card-content',
        'all-services-card__content-wrapper': 'section-cards__card-content',
        'card-base-style': '', // служебный класс, удаляем
        // Дополнительные маппинги из анализа оставшихся классов
        'advantage-card': 'section-cards__card',
        'advantage-card__header': 'section-cards__card-title',
        'image-chevron': 'section-cards__card-icon',
        'btn-full-width': 'section-cards__button',
        'btn-primary': 'section-cards__button--primary',
        'btn-size-L': 'section-cards__button--large',
        'btn-size-XL': 'section-cards__button--xlarge',
        'default-button': 'section-cards__button',
        'realized-object-card__img': 'section-cards__card-image',
        'information-text-cards': 'section-cards__card-content',
        'system-advantage-card': 'section-cards__card',
        // Структурные классы для section-cards
        'advantage-card__content-wrapper': 'section-cards__card-content',
        'all-services-card__content-wrapper': 'section-cards__container',
        'cards-container-scroll': 'section-cards__container',
        'service-cards-1-containers': 'section-cards__container',
        'service-cards-2-container': 'section-cards__container',
        'cards-scroll-container': 'section-cards__container',
        'block-text-box': 'section-cards__container',
        'service-cards-3-container': 'section-cards__container',
        'content-container': 'section-cards__container',
        'advantage-row-item': 'section-cards__card',
        'advantage-row-item__image': 'section-cards__card-image',
        'advantage-row-item__text-box': 'section-cards__card-content',
        'info-container': 'section-cards__container',
        'info-container__text': 'section-cards__card-text',
        'realized-object-card__img-wrapper': 'section-cards__card-image-wrapper',
        'realized-object-card__info-box': 'section-cards__card-content',
        'column-text-box': 'section-cards__container',
        'system-advantage-card__text-list-wrapper': 'section-cards__card-content',
        'columns-text-box': 'section-cards__container',
        'system-advantage-cards-container': 'section-cards__container',
        'our-advantages-container': 'section-cards__container',
        'advantages-row-column': 'section-cards__container',
        'guide-cards-container': 'section-cards__container',
        'demonstration-work-card__img-wrapper': 'section-cards__card-image-wrapper',
    
        'mt-80': '', // служебный класс, удаляем
        'title-margin-top': '', // служебный класс, удаляем
        'p1-comp-reg': 'section-cards__card-text',
        'h1-wide-med': 'section-cards__title',
        'all-services-section__title': 'section-cards__title',
        'mb-120': '', // служебный класс, удаляем
        'p1-comp-reg': 'section-cards__card-text',
        'p2-comp-reg': 'section-cards__card-text',
        // Дополнительные маппинги из второго определения section-cards
        'advantage-card-title-wrapper': 'section-cards__card-header',
        'advantage-card-text-list-wrapper': 'section-cards__card-content',
        'card-type-1': 'section-cards__card',
        'card-type-2': 'section-cards__card',
        'card-type-3': 'section-cards__card',
        'card-type-1-header': 'section-cards__card-header',
        'card-type-2-header': 'section-cards__card-header',
        'card-type-3-header': 'section-cards__card-header',
        'card-type-1-content-wrapper': 'section-cards__card-content',
        'card-type-2-content-wrapper': 'section-cards__card-content',
        'card-type-3-text': 'section-cards__card-content',
        'card-type-3-header-title': 'section-cards__card-title',
        'card-header': 'section-cards__card-title',
        'card-content-wrapper': 'section-cards__card-content',
        'content-wrapper': 'section-cards__card-content',
        'content': 'section-cards__card-content',
        'content-title': 'section-cards__card-title',
        'content-text': 'section-cards__card-text',
        'cards-1-containers': 'section-cards__container',
        'cards-2-container': 'section-cards__container',
        'cards-3-container': 'section-cards__container',
        'container-scroll': 'section-cards__container',
        'services-card': 'section-cards__card',
        'services-card-content-wrapper': 'section-cards__card-content',
        'services-cards': 'section-cards__container',
        'services-section-cards': 'section-cards__container',
        'services-section-title': 'section-cards__title',
        'scroll-container': 'section-cards__container',
        'text-card': 'section-cards__card',
        'text-cards': 'section-cards__container',
        'object-card': 'section-cards__card',
        'object-card-img-wrapper': 'section-cards__card-image-wrapper',
        'object-card-img': 'section-cards__card-image',
        'object-card-info-box': 'section-cards__card-content',
        'gray-card-item': 'section-cards__card',
        'gray-card-item-title': 'section-cards__card-title',
        'gray-card-item-info': 'section-cards__card-content',
        'row-item': 'section-cards__card',
        'row-item-image': 'section-cards__card-image',
        'row-item-text-box': 'section-cards__card-content',
        'row-column': 'section-cards__container',
        'icon': 'section-cards__card-icon',
        'circle': 'section-cards__card-icon--circle',
        'h1-wide': 'section-cards__title-wrapper',
        'h1-wide-title-text': 'section-cards__title',
        'h1-wide-description-text': 'section-cards__description',
    },
    // Service FAQ
    'service-faq': {
        'accordion-row': 'service-faq__item',
        'accordion-row__header': 'service-faq__question',
        'accordion-row__content': 'service-faq__answer',
        'row-header-text': 'service-faq__question',
        'h1-wide-title-text': 'service-faq__title', // для h1 тегов
        'h1-wide': 'service-faq__title-wrapper', // для div тегов
        'title-h1-wide': 'service-faq__title-wrapper',
        'title-h1-wide__title-text': 'service-faq__title',
        'p1-comp-reg': 'service-faq__text',
        'p2-comp-reg': 'service-faq__answer-text', // для текста в ответах FAQ
        'link-img': 'service-faq__link-icon',
        'h2-comp-med': 'service-faq__subtitle',
        'step-title-block': 'service-faq__title',
        'mb-32': '', // служебный класс, удаляем
        'block-text-box': 'service-faq__text-box',
        'nolink_inmobile': '', // служебный класс, удаляем
        // Дополнительные маппинги из анализа
        'accordion-row__header-text': 'service-faq__question',
        'accordion-row__header-chevron': 'service-faq__question-icon',
        'accordion-row__container-collapse': 'service-faq__answer',
        'accordion-rows-column': 'service-faq__container',
        // Дополнительные маппинги из анализа оставшихся классов
        'short-text-width': 'service-faq__content--narrow',
    
        'link-img': 'service-faq__link-icon',
        'h2-comp-med': 'service-faq__subtitle',
        'step-title-block': 'service-faq__title',
        'mb-32': '', // служебный класс, удаляем
        'block-text-box': 'service-faq__text-box',
        'nolink_inmobile': '', // служебный класс, удаляем
        'h1-wide-med': 'service-faq__title',
    },
    // Service order form
    'service-order-form': {
        'form-container': 'service-order-form__form',
        'form-container-row-box': 'service-order-form__form-row',
        'wrapper': 'service-order-form__field-wrapper',
        'label': 'service-order-form__label',
        'box': 'service-order-form__input-wrapper',
        'item': 'service-order-form__input',
        'item--select': 'service-order-form__select',
        'item-placeholder': 'service-order-form__select-placeholder',
        'box-input': 'service-order-form__checkbox',
        'box-text': 'service-order-form__checkbox-label',
        'box-style': 'service-order-form__checkbox-style',
        'button': 'service-order-form__button',
        'text': 'service-order-form__button-text',
        'header': 'service-order-form__header',
        'header-title': 'service-order-form__header-title',
        'header-title-html-text': 'service-order-form__header-title-content',
        'header-title-text': 'service-order-form__header-title',
        'header-note': 'service-order-form__header-note',
        'contacts': 'service-order-form__contacts',
        'contacts-column': 'service-order-form__contacts-column',
        'contacts-column-title': 'service-order-form__contacts-column-title',
        'contacts-column-text': 'service-order-form__contacts-column-text',
        'list-row': 'service-order-form__info-row',
        'list-row-title': 'service-order-form__info-row-title',
        'list-row-text': 'service-order-form__info-row-text',
        'request-lk': 'service-order-form__lk-section',
        'lk-button-box': 'service-order-form__lk-button-wrapper',
        'lk-button-box-label': 'service-order-form__lk-label',
        'lk-qr-img': 'service-order-form__lk-qr',
        'h1-wide-med': 'service-order-form__title',
        'high': 'service-order-form__title--high',
        'low': 'service-order-form__title--low',
        'input-wrapper': 'service-order-form__field-wrapper',
        'input-size-XL': 'service-order-form__field-wrapper--xl',
        'input-label': 'service-order-form__label',
        'input-box': 'service-order-form__input-wrapper',
        'input-item': 'service-order-form__input',
        'input-white': 'service-order-form__input--white',
        'default-button': 'service-order-form__button',
        'btn-primary': 'service-order-form__button--primary',
        'btn-size-L': 'service-order-form__button--large',
        'btn-size-M': 'service-order-form__button--medium',
        'btn-size-S': 'service-order-form__button--small',
        'btn-size-XL': 'service-order-form__button--xlarge',
        'btn-text': 'service-order-form__button-text',
        'button-request-form': 'service-order-form__button',
        'btn-secondary': 'service-order-form__button--secondary',
        'btn-full-width': 'service-order-form__button--full-width',
        'input-gray': 'service-order-form__input--gray',
        'input-size-L': 'service-order-form__field-wrapper--large',
        'input-size-S': 'service-order-form__field-wrapper--small',
        'input-size-M': 'service-order-form__field-wrapper--medium',
        'textarea-size-M': 'service-order-form__textarea--medium',
        'textarea-gray': 'service-order-form__textarea--gray',
        // Дополнительные маппинги для input-box (может использоваться в разных контекстах)
        'input-box': 'service-order-form__input-wrapper',
        // Дополнительные маппинги для классов, которые могут использоваться в формах
        'short-text-width': 'service-order-form__content--narrow',
        // Дополнительные маппинги для классов, которые могут использоваться в формах
        'short-text-width': 'service-order-form__content--narrow',
        'request-form-container': 'service-order-form__form',
        'request-form-container__row-box': 'service-order-form__form-row',
        'request-header': 'service-order-form__header',
        'request-header__title': 'service-order-form__header-title',
        'request-header__title-html-text': 'service-order-form__header-title-content',
        'request-header__note': 'service-order-form__header-note',
        'block-text-box': 'service-order-form__text-box',
        'button-request-form': 'service-order-form__button',
        'btn-text': 'service-order-form__button-text',
        'p1-comp-reg': 'service-order-form__text',
        'p2-comp-reg': 'service-order-form__text',
        'p3-comp-reg': 'service-order-form__text',
        // Дополнительные маппинги из анализа
        'mb-32': '', // служебный класс, удаляем
        'mt-32': '', // служебный класс, удаляем
        'request-contacts': 'service-order-form__contacts',
        'request-contacts__column': 'service-order-form__contacts-column',
        'request-contacts__column-title': 'service-order-form__contacts-column-title',
        'request-contacts__column-text': 'service-order-form__contacts-column-text',
        'request-contacts__column-description': 'service-order-form__contacts-column-description',
        'request-lk__qr-img': 'service-order-form__lk-qr-img',
        'request-lk__button-box': 'service-order-form__lk-button-box',
        'request-lk__button-box-label': 'service-order-form__lk-button-box-label',
    
        'information-list-row': 'service-order-form__info-row',
        'information-list-row__title': 'service-order-form__info-row-title',
        'information-list-row__text': 'service-order-form__info-row-text',
        'p1-comp-med': 'service-order-form__text--medium',
        'input-item--select': 'service-order-form__select',
        'select-item-placeholder': 'service-order-form__select-placeholder',
        'request-header__title-description': 'service-order-form__header-description',
        'drag-and-drop': 'service-order-form__drag-drop',
        'drag-and-drop__item': 'service-order-form__drag-drop-item',
        'drag-and-drop__item-button': 'service-order-form__drag-drop-button',
        'drag-and-drop__item-button-input': 'service-order-form__drag-drop-input',
        'drag-and-drop__description': 'service-order-form__drag-drop-description',
        'label-not-required': 'service-order-form__label--optional',
        'upload-completed-application-form': 'service-order-form__upload-completed',
        'underlining': 'service-order-form__underline',
        'textarea-box': 'service-order-form__textarea-wrapper',
        'textarea-box__label': 'service-order-form__label',
        'textarea-box__input': 'service-order-form__textarea',
        'textarea-box__text-description': 'service-order-form__textarea-description',

        'title-h1-wide': 'service-order-form__title-wrapper',
        'title-h1-wide__title-text': 'service-order-form__title',
        'title-h1-wide__description-text': 'service-order-form__description',
        'link-img': 'service-order-form__link-icon',
        'h2-comp-med': 'service-order-form__subtitle',
        'select-chevron': 'service-order-form__select-chevron',
},
    // Mobile app section
    'mobile-app-section': {
        'app-slider-header': 'mobile-app-section__header',
        'app-slider-header-title': 'mobile-app-section__title-wrapper',
        'app-slider-header-download-box': 'mobile-app-section__download',
        'app-stores': 'mobile-app-section__stores',
        'app-stores-box': 'mobile-app-section__stores',
        'h1-wide': 'mobile-app-section__title-wrapper', // для div тегов
        'h1-wide-title-text': 'mobile-app-section__title', // для h1 тегов
        'qr-code-item': 'mobile-app-section__qr-item',
        // Дополнительные маппинги из второго определения mobile-app-section
        'title-h1-wide': 'mobile-app-section__title-wrapper',
        'title-h1-wide__title-text': 'mobile-app-section__title',
        'mobile-app-slider__header': 'mobile-app-section__header',
        'mobile-app-slider__header-download-box': 'mobile-app-section__download',
        'mobile-app-stores': 'mobile-app-section__stores',
        'mobile-app-stores-box': 'mobile-app-section__stores',
        'mobile-app-slider__content': 'mobile-app-section__content',
        'mobile-app-store': 'mobile-app-section__store',
        'mobile-app-stores__item': 'mobile-app-section__store-item',
        'video-surveillance-app__download-app-box': 'mobile-app-section__download',
        'mobile-app-slider__header-title': 'mobile-app-section__title',
        'slider-selectors-line__item': 'mobile-app-section__selector-item',
        'slider-image': 'mobile-app-section__image',
        'call-management-slider': 'mobile-app-section__slider',
        'slider-selectors-line': 'mobile-app-section__selectors-line',
        'slider-images-line': 'mobile-app-section__images-line',
        'slider-smartphone-container': 'mobile-app-section__container',
        'qr-code-item': 'mobile-app-section__qr-item',
    },
    // Section text
    'section-text': {
        'h1-wide-med': 'section-text__title',
        'h2-comp-med': 'section-text__subtitle',
        'h3-comp-med': 'section-text__subtitle',
        'p1-text-reg': 'section-text__content',
        'p1-comp-reg': 'section-text__content',
        'p1-comp-med': 'section-text__content--medium',
        'p2-comp-reg': 'section-text__content',
        'p2-comp-med': 'section-text__content--medium',
        'p3-comp-reg': 'section-text__content--small',
        'short-text-width': 'section-text__content--narrow',
        'text-width': 'section-text__content--narrow',
        // Дополнительные маппинги для классов, которые могут использоваться в текстовых секциях
        'qr-code-item': 'section-text__qr-item',
        'input-gray': 'section-text__input--gray',
        'input-size-S': 'section-text__input-wrapper--small',
        'input-white': 'section-text__input--white',
        'input-size-L': 'section-text__input-wrapper--large',
        'promo-long': 'section-text__hero',
        'promo-long-title-text': 'section-text__title',
        'promo-long-description-text': 'section-text__content',
        'default': 'section-text__hero--default',
        'h1-wide': 'section-text__title-wrapper',
        'h1-wide-title-text': 'section-text__title',
        'h1-wide-description-text': 'section-text__description',
        'column-info': 'section-text__column',
        'column-info-title': 'section-text__subtitle',
        'column-info-info': 'section-text__content',
        'content-tags': 'section-text__tags',
        'content-buttons': 'section-text__buttons',
        'content-text': 'section-text__content',
        'content-title': 'section-text__subtitle',
        'text-box': 'section-text__text-box',
        'banner': 'section-text__banner',
        'gray': 'section-text__banner--gray',
        'form-question': 'section-text__form-question',
        'box-container': 'section-text__box-container',
        'box-item': 'section-text__tag',
        'box-description': 'section-text__box-description',
        'item': 'section-text__item',
        'item-title': 'section-text__item-title',
        'item-text': 'section-text__item-text',
        'item-input': 'section-text__item-input',
        'item-label': 'section-text__item-label',
        'button-item': 'section-text__button',
        'buttons-container': 'section-text__buttons',
        'buttons-box': 'section-text__buttons-box',
        'buttons-box-item': 'section-text__button-nav',
        'buttons-box-item--left': 'section-text__button-nav--left',
        'row-selection': 'section-text__row-selection',
        'list': 'section-text__list',
        'crumbs-row': 'section-text__breadcrumbs',
        'crumb-item': 'section-text__breadcrumb-item',
        'crumb-item-text': 'section-text__breadcrumb-link',
        'images-container': 'section-text__images',
        'images-scroll-container': 'section-text__images-scroll',
        'images-line': 'section-text__images-line',
        'image': 'section-text__image',
        'section-img': 'section-text__image',
        'management-slider': 'section-text__slider',
        'selectors-container': 'section-text__slider-container',
        'selectors-scroll-container': 'section-text__slider-scroll',
        'selectors-line': 'section-text__slider-line',
        'selectors-line-item': 'section-text__slider-item',
        'blur': 'section-text__slider-scroll--blur',
        'message-content': 'section-text__message',
        'message-content-img': 'section-text__message-image',
        'message-content-card': 'section-text__message-card',
        'message-content-card-title': 'section-text__message-title',
        'message-content-card-note': 'section-text__message-note',
        'message-gray-line': 'section-text__message-divider',
        'note-title': 'section-text__note-title',
        'note-text': 'section-text__note-text',
        'mgts-value-row': 'section-text__value-row',
        'mgts-value-row__tag': 'section-text__value-tag',
        'objects-container': 'section-text__objects',
        'objects-list': 'section-text__objects-list',
        'object-item': 'section-text__object-item',
        'objects-wrapper': 'section-text__map-wrapper',
        'surveillance-app': 'section-text__app',
        'surveillance-app-content-box': 'section-text__app-content',
        'surveillance-app-download-app-box': 'section-text__app-download',
        'work-step-title': 'section-text__step-title',
        'work-step-link': 'section-text__step-link',
        'shareholders_meeting_scheme': 'section-text__scheme-image',
        'name': 'section-text__file-name',
        'size': 'section-text__file-size',
        'unordered-list': 'section-text__list',
        // Дополнительные маппинги из анализа
        'tag-box': 'section-text__tag',
        'tag-box-item': 'section-text__tag-item',
        'shares-item': 'section-text__share',
        'shares-item__title': 'section-text__share-title',
        'shares-item__text': 'section-text__share-text',
        'information-list-row': 'section-text__info-row',
        'information-list-row__title': 'section-text__info-row-title',
        'information-list-row__text': 'section-text__info-row-text',
        'news-row-item': 'section-text__news-item',
        'news-row-item__date': 'section-text__news-date',
        'news-row-item__content': 'section-text__news-content',
        'news-row-item__content-wrapper': 'section-text__news-content-wrapper',
        'bread-crumbs-row': '', // хлебные крошки, удаляем
        // Дополнительные маппинги из первого определения section-text
        'tablet-content': 'section-text__tablet', // контейнер для планшетного контента
        'tablet-content__title': 'section-text__tablet-title',
        'tablet-content__tags': 'section-text__tablet-tags',
        'tablet-content__buttons': 'section-text__buttons',
        'header-text-km': 'section-text__title',
        'secondary-banner__text-title': 'section-text__title',
        'secondary-banner__text-description': 'section-text__content',
        'ceo-message-content__img': 'section-text__image',
        'about-company__content-text-title': 'section-text__title',
        'about-company__content-text-description': 'section-text__content',
        'about-company__content-btn': 'section-text__button',
        'block-high-ethical-standards__img': 'section-text__image',
        'title-promo-long': 'section-text__hero',
        'title-promo-long__title-text': 'section-text__title',
        'title-promo-long__description-text': 'section-text__content',
        'title-h1-wide': 'section-text__title-wrapper',
        'title-h1-wide__title-text': 'section-text__title',
        'block-text-box': 'section-text__text-box',
        'content-box': 'section-text__content-box',
        'content-box__text': 'section-text__content',
        'content-box__banner': 'section-text__banner',
        'content-box__banner-title': 'section-text__banner-title',
        'content-box__banner-description': 'section-text__banner-description',
        'step-title-block': 'section-text__title',
        'link-img': 'section-text__link-icon',
        'tab-button-item': 'section-text__tab-item',
        'middle-text-width': 'section-text__content--medium',
        'bread-crumb-item__text--last': 'section-text__breadcrumb-text',
        'step-section__img': 'section-text__image',
        'btn-text': 'section-text__button-text',
    
        'title-h1-wide__description-text': 'section-text__description',
        'news-title': 'section-text__title',
        'news-info-box': 'section-text__news-info',
        'news-info-box__text': 'section-text__news-info-text',
        'news-info-box__chevron': 'section-text__news-info-chevron',
        'news-item-page': 'section-text__news-page',
        'news-item-page__content': 'section-text__news-page-content',
        'content-header': 'section-text__header',
        'header__title': 'section-text__header-title',
        'header__date': 'section-text__header-date',
        'feedback-form-question': 'section-text__form-question',
        'radios-box': 'section-text__radios',
        'radios-box-container': 'section-text__radios-container',
        'radios-box-description': 'section-text__radios-description',
        'mt-48': '', // служебный класс, удаляем
        'admission-work-step-title': 'section-text__step-title',
        'admission-work-step-link': 'section-text__step-link',
        'mb-24': '', // служебный класс, удаляем
        'tabs-row-selection': 'section-text__tabs',
        'tab-buttons-container': 'section-text__tabs-container',
        'tablet-content__text': 'section-text__tablet-text',
        'mb-120': '', // служебный класс, удаляем
        'select-chevron': 'section-text__select-chevron',
        'slider-selectors-line__item': 'section-text__slider-item',
        'slider-image': 'section-text__slider-image',
        'step-section__text': 'section-text__step-text',
        'statistic-item': 'section-text__statistic-item',
        'header-text': 'section-text__header-text',
        'footer-text': 'section-text__footer-text',
        'content-container': 'section-text__container',
        'news-list-column': 'section-text__news-column',
        'column-text-box': 'section-text__column-text',
        'mobile-app-store': 'section-text__app-store',
        'arrow-buttons-box__item': 'section-text__arrow-button',
        'banner-safe-region': 'section-text__banner-safe-region',
        'banner-safe-region-text': 'section-text__banner-safe-region-text',
        'ceo-message-content': 'section-text__message-content',
        'message-note-title': 'section-text__note-title',
        'message-note-text': 'section-text__note-text',
        'about-company__content-logo': 'section-text__content-logo',
        'about-company__content-text': 'section-text__content-text',
        'news-page': 'section-text__news-page',
        'news-page-header': 'section-text__news-page-header',
        'header-select-wrapper': 'section-text__select-wrapper',
        'select-item-text': 'section-text__select-item-text',
        'news-list-end': 'section-text__news-list-end',
        'spinner': 'section-text__spinner',
        'type-spinner-L': 'section-text__spinner--large',
        'color-spinner-black': 'section-text__spinner--black',
        'documents-container': 'section-text__documents-container',
        'feedback-form-container': 'section-text__form-container',
        'mb-80': '', // служебный класс, удаляем
        'columns-text-box': 'section-text__columns-text',
        'video-surveillance-app': 'section-text__surveillance-app',
        'video-surveillance-app__content-box': 'section-text__surveillance-app-content',
        'video-surveillance-app__download-app-box': 'section-text__surveillance-app-download',
        'mobile-app-stores-box': 'section-text__app-stores',
        'our-advantages-container': 'section-text__advantages-container',
        'advantages-row-column': 'section-text__advantages-column',
        'call-management-slider': 'section-text__slider',
        'slider-selectors-container': 'section-text__slider-selectors',
        'slider-selectors-line': 'section-text__slider-line',
        'arrow-buttons-box': 'section-text__arrow-buttons',
        'arrow-buttons-box__item--left': 'section-text__arrow-button--left',
        'slider-images-container': 'section-text__slider-images',
        'slider-images-line': 'section-text__slider-images-line',

        'input-item': 'section-text__item',
        'input-item--select': 'section-text__item--select',
        'input-box': 'section-text__input-wrapper',
        'service-row-item': 'section-text__row-item',
        'service-row-item__text': 'section-text__row-item-text',
        'service-row-item__info-box': 'section-text__row-item-info',
        'service-row-item__info-box-unit': 'section-text__row-item-unit',
        'service-row-item__info-box-period': 'section-text__row-item-period',
        'big-circle': 'section-text__icon--big',
        'image-chevron': 'section-text__icon',
        'full-width': 'section-text__full-width',
        'short-text-width': 'section-text__content--narrow',
        'mobile-app-stores__item': 'section-text__store-item',
        'selector-item': 'section-text__selector-item',
        'selector-item__title': 'section-text__selector-title',
        'selector-item__text': 'section-text__selector-text',
        'selector-item__line': 'section-text__selector-line',
        'cards-vertical': 'section-text__cards--vertical',
        'cards-scroll': 'section-text__cards--scroll',
        'cards-align-top': 'section-text__cards--align-top',
        'all-services-section__cards': 'section-text__cards',
        'type-size-S': 'section-text__type--small',
        'element-positions-even': 'section-text__element--even',
        'element-positions-odd': 'section-text__element--odd',
        'column-selectors': 'section-text__column-selectors',
        'right-blur': 'section-text__blur--right',
        'smartphone-screen': 'section-text__smartphone-screen',
        'size-S': 'section-text__size--small',
        'size-M': 'section-text__size--medium',
        'secondary-banner': 'section-text__banner--secondary',
        'secondary-banner__icon': 'section-text__banner-icon',
        'secondary-banner__text': 'section-text__banner-text',
        'type-gray': 'section-text__type--gray',
        'drag-and-drop': 'section-text__drag-drop',
        'drag-and-drop__item': 'section-text__drag-drop-item',
        'drag-and-drop__item-button': 'section-text__drag-drop-button',
        'drag-and-drop__item-button-input': 'section-text__drag-drop-input',
        'drag-and-drop__description': 'section-text__drag-drop-description',
        'banner-safe-region': 'section-text__banner-safe-region',
        'banner-safe-region-text': 'section-text__banner-safe-region-text',
        'two-column-info': 'section-text__two-column',
        'two-column-info__title': 'section-text__two-column-title',
        'two-column-info__info': 'section-text__two-column-info',
        'ceo-message-gray-line': 'section-text__ceo-line',
        'block-high-ethical-standards__title': 'section-text__title',
        'default-button': 'section-text__button',
        'btn-primary': 'section-text__button--primary',
        'btn-secondary': 'section-text__button--secondary',
        'btn-size-L': 'section-text__button--large',
        'btn-size-M': 'section-text__button--medium',
        'btn-size-S': 'section-text__button--small',
        'btn-size-XL': 'section-text__button--xlarge',
        'btn-full-width': 'section-text__button--full-width',
        'title-h1-wide': 'section-text__title-wrapper',
        'title-h1-wide__title-text': 'section-text__title',
        'p1-comp-med': 'section-text__content--medium',
    },
    // Section map
    'section-map': {
        'objects-container': 'section-map__objects',
        'objects-list': 'section-map__objects-list',
        'object-item': 'section-map__object-item',
        'objects-wrapper': 'section-map__map-wrapper',
        // Дополнительные маппинги из анализа
        'addresses-object-item': 'section-map__item',
        'addresses-objects-container': 'section-map__container',
        'addresses-objects-list': 'section-map__objects-list',
        'map-objects-wrapper': 'section-map__map-wrapper',
        'realized-objects-container': 'section-map__container',
        'marker': 'section-map__marker',
        // Дополнительные маппинги для классов, которые могут использоваться в картах
        'title-h1-wide': 'section-map__title-wrapper',
        'title-h1-wide__title-text': 'section-map__title',
        'title-h1-wide__description-text': 'section-map__description',
    },
    // Files table
    'files-table': {
        'file-item': 'files-table__item',
        'file-item__type-img': 'files-table__item-icon',
        'file-item__section-info': 'files-table__item-info',
        'file-text-box': 'files-table__item-text',
        'file-name': 'files-table__item-name',
        'file-size': 'files-table__item-size',
        'link-img': 'files-table__item-link',
        'files-list': 'files-table__container',
        // Также обрабатываем классы, которые могут быть внутри section-text, но относятся к files-table
        'file-item__type-img': 'files-table__item-icon',
        'file-item__section-info': 'files-table__item-info',
    },
    // CRM cards
    'crm-cards': {
        'crm-card': 'crm-cards__card',
        'crm-card-img': 'crm-cards__card-image',
        'crm-integration-container__header': 'crm-cards__header',
        'crm-integration-container__cards': 'crm-cards__container',
        'content-box': 'crm-cards__content',
        'content-box__text': 'crm-cards__text',
        'content-box__banner': 'crm-cards__banner',
        'content-box__banner-title': 'crm-cards__banner-title',
        'content-box__banner-description': 'crm-cards__banner-description',
    
        'title-h1-wide': 'crm-cards__title-wrapper',
        'title-h1-wide__title-text': 'crm-cards__title',
        'p1-comp-reg': 'crm-cards__content',
    },
    // Document tabs
    'document-tabs': {
        'tabs-row-selection': 'document-tabs__tabs',
        'tab-buttons-container': 'document-tabs__tabs-container',
        'tab-button-item': 'document-tabs__tab-button',
        'documents-tab-content': 'document-tabs__tab-content',
        'documents-tabs-container': 'document-tabs__container',
        'files-list': 'document-tabs__files-list',
        'files-table': 'document-tabs__files-table',
        'documents-table': 'document-tabs__table',
        'documents-container': 'document-tabs__container',
        'h2-comp-med': 'document-tabs__title',
        'h1-wide-med': 'document-tabs__title',
        // Классы для контента внутри табов (используем files-table)
        'file-item': 'files-table__item',
        'file-item__type-img': 'files-table__item-icon',
        'file-item__section-info': 'files-table__item-info',
        'file-text-box': 'files-table__item-text',
        'file-name': 'files-table__item-name',
        'file-size': 'files-table__item-size',
        'link-img': 'files-table__item-link',
        'type-size-L': '', // служебный класс, удаляем
        'disable-selection': '', // служебный класс, удаляем
    },
    // Service tabs
    'service-tabs': {
        'tabs-row-selection': 'service-tabs__tabs',
        'tab-buttons-container': 'service-tabs__tabs-container',
        'tab-button-item': 'service-tabs__tab-button',
        'service-tabs-container': 'service-tabs__container',
        'cards-container': 'service-tabs__container',
        'service-card': 'section-cards__card',
        'advantage-card': 'section-cards__card',
        'h2-comp-med': 'service-tabs__title',
        'h1-wide-med': 'service-tabs__title',
        // Классы для контента внутри табов (используем section-cards)
        'service-card__title': 'section-cards__card-title',
        'service-card__content': 'section-cards__card-content',
        'advantage-card__header': 'section-cards__card-title',
        'advantage-card__content-wrapper': 'section-cards__card-content',
        'type-size-L': '', // служебный класс, удаляем
        'disable-selection': '', // служебный класс, удаляем
    },
};

/**
 * Удалить элементы из DOM
 */
function removeElements(doc, selectors) {
    selectors.forEach(selector => {
        try {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        } catch (e) {
            // Игнорируем ошибки селекторов
        }
    });
}

/**
 * Нормализовать класс элемента
 */
function normalizeClass(oldClass, element) {
    // Проверяем маппинг (теперь это массив)
    const classes = Array.from(element.classList);
    
    for (const mapping of CLASS_MAPPING) {
        const selector = mapping.selector;
        const newClass = mapping.type;
        
        // Проверяем точное совпадение класса
        if (selector.startsWith('.') && !selector.includes('*')) {
            const className = selector.replace('.', '');
            if (classes.includes(className)) {
                return newClass;
            }
        }
        
        // Проверяем частичное совпадение
        if (selector.includes('*')) {
            const pattern = selector.replace(/\[class\*="([^"]+)"\]/, '$1');
            if (classes.some(c => c.includes(pattern))) {
                return newClass;
            }
        }
    }
    return null;
}

/**
 * Преобразовать секцию в компонент
 */
function transformSection(section, componentType) {
    const newSection = section.ownerDocument.createElement('section');
    newSection.className = componentType;
    
    // Копируем содержимое
    Array.from(section.childNodes).forEach(node => {
        if (node.nodeType === 1) { // Element node
            const newNode = transformElement(node, componentType);
            newSection.appendChild(newNode);
        } else {
            newSection.appendChild(node.cloneNode(true));
        }
    });
    
    return newSection;
}

/**
 * Преобразовать внутренний класс в правильный класс компонента
 */
function transformInternalClass(className, parentComponentType) {
    if (!parentComponentType) {
        return null;
    }
    
    // Сначала проверяем контекстно-зависимый маппинг
    if (CONTEXT_DEPENDENT_MAPPING[parentComponentType] && CONTEXT_DEPENDENT_MAPPING[parentComponentType][className]) {
        return CONTEXT_DEPENDENT_MAPPING[parentComponentType][className];
    }
    
    // Затем проверяем обычный маппинг
    if (!INTERNAL_CLASSES_MAPPING[parentComponentType]) {
        return null;
    }
    
    const mapping = INTERNAL_CLASSES_MAPPING[parentComponentType];
    return mapping[className] || null;
}

/**
 * Преобразовать элемент
 */
function transformElement(element, parentComponentType) {
    // Если это секция, создаем новую секцию
    if (element.tagName === 'SECTION') {
        const newSection = element.ownerDocument.createElement('section');
        const normalizedClass = normalizeClass(null, element);
        if (normalizedClass) {
            newSection.className = normalizedClass;
        } else {
            // Очищаем классы от старых префиксов
            const classes = Array.from(element.classList)
                .filter(c => !c.includes('mgts') && !c.includes('disable') && !c.includes('mr') && !c.includes('pd'))
                .map(c => c.replace(/^[a-z]+-/, ''));
            if (classes.length > 0) {
                newSection.className = classes.join(' ');
            }
        }
        
        // Копируем содержимое
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === 1) {
                newSection.appendChild(transformElement(node, normalizedClass || parentComponentType));
            } else {
                newSection.appendChild(node.cloneNode(true));
            }
        });
        
        return newSection;
    }
    
    // ВАЖНО: Для ссылок на файлы (a[href] с расширениями файлов) сохраняем их полностью
    // Проверяем, является ли элемент ссылкой на файл
    let isFileLink = false;
    if (element.tagName === 'A' || element.tagName === 'a') {
        const href = element.getAttribute('href');
        if (href) {
            const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt', 'odt', 'ods'];
            const ext = href.split('.').pop()?.toLowerCase();
            if (ext && fileExtensions.includes(ext)) {
                isFileLink = true;
            }
            // Также проверяем атрибут data-file-link
            if (element.getAttribute('data-file-link') === 'true') {
                isFileLink = true;
            }
        }
    }
    
    // Клонируем элемент БЕЗ классов, чтобы не копировать старые классы
    const newElement = element.cloneNode(false);
    
    // ВАЖНО: Для ссылок на файлы сохраняем атрибут data-file-link, если он есть
    if (isFileLink && element.getAttribute('data-file-link')) {
        newElement.setAttribute('data-file-link', element.getAttribute('data-file-link'));
    }
    
    // Очищаем классы из клонированного элемента
    if (newElement.hasAttribute && newElement.hasAttribute('class')) {
        newElement.removeAttribute('class');
    } else if (newElement.classList && newElement.classList.length > 0) {
        // Для элементов с classList удаляем все классы
        const classesToRemove = Array.from(newElement.classList);
        classesToRemove.forEach(cls => newElement.classList.remove(cls));
    }
    
    // Для элементов внутри секций - преобразуем классы в правильные классы компонентов
    // Определяем родительский компонент с учетом специальных случаев (например, files-list)
    let actualParentComponent = parentComponentType;
    
    // Сначала проверяем специальные случаи (например, files-list) - они имеют приоритет
    // Проверяем, является ли элемент частью файлового списка (по классам file-*)
    // Для SVG элементов classList может быть SVGAnimatedString, обрабатываем это
    let elementClasses = [];
    if (element.classList) {
        if (typeof element.classList.forEach === 'function') {
            element.classList.forEach(c => elementClasses.push(c));
        } else if (Array.isArray(element.classList)) {
            elementClasses = element.classList;
        } else {
            // Для SVGAnimatedString
            const className = element.getAttribute('class') || '';
            elementClasses = className.split(' ').filter(c => c.trim());
        }
    }
    const isFileElement = elementClasses.some(c => 
        c.startsWith('file-') || 
        c === 'files-list' || 
        c === 'file-item__type-img' || 
        c === 'file-item__section-info' ||
        c === 'file-text-box' ||
        c === 'file-name' ||
        c === 'file-size'
    );
    
    if (isFileElement) {
        // Если элемент имеет file-* классы, всегда используем files-table
        // Это имеет приоритет над parentComponentType
        actualParentComponent = 'files-table';
    } else {
        // Иначе ищем родительский компонент в DOM
        let parent = element.parentElement;
        while (parent && parent !== element.ownerDocument.body) {
            // Проверяем, есть ли родитель с классом files-list или files-table__container
            if (parent.classList && (parent.classList.contains('files-list') || parent.classList.contains('files-table__container'))) {
                actualParentComponent = 'files-table';
                break;
            }
            // Проверяем, есть ли родительская секция с целевым компонентом
            if (parent.tagName === 'SECTION' && parent.className) {
                const sectionClass = parent.className.split(' ')[0];
                if (TARGET_COMPONENTS.includes(sectionClass)) {
                    // Используем найденную секцию, если parentComponentType не задан
                    // Если parentComponentType задан, используем его (он более точный)
                    if (!actualParentComponent) {
                        actualParentComponent = sectionClass;
                    }
                    break;
                }
            }
            parent = parent.parentElement;
        }
    }
    
    // Если не нашли специальный случай и parentComponentType не задан, ищем вверх по дереву
    if (!actualParentComponent) {
        parent = element.parentElement;
        while (parent) {
            if (parent.tagName === 'SECTION' && parent.className) {
                const sectionClass = parent.className.split(' ')[0];
                if (TARGET_COMPONENTS.includes(sectionClass)) {
                    actualParentComponent = sectionClass;
                    break;
                }
            }
            parent = parent.parentElement;
        }
    }
    
    // Если parentComponentType задан, он имеет приоритет (более точный контекст)
    // НО для file-* элементов всегда используем files-table (это уже установлено выше)
    if (parentComponentType && !isFileElement) {
        actualParentComponent = parentComponentType;
    }
    
    // Для file-* элементов всегда используем files-table, даже если parentComponentType задан
    if (isFileElement) {
        actualParentComponent = 'files-table';
    }
    
    if (actualParentComponent) {
        // Для SVG элементов classList может быть SVGAnimatedString, обрабатываем это
        let classes = [];
        if (element.classList) {
            if (typeof element.classList.forEach === 'function') {
                element.classList.forEach(c => classes.push(c));
            } else if (Array.isArray(element.classList)) {
                classes = element.classList;
            } else {
                // Для SVGAnimatedString
                const className = element.getAttribute('class') || '';
                classes = className.split(' ').filter(c => c.trim());
            }
        }
        const transformedClasses = [];
        
        classes.forEach(c => {
            // Сначала проверяем маппинг - если класс нужно преобразовать, делаем это сразу
            const transformedClass = transformInternalClass(c, actualParentComponent);
            if (transformedClass !== null) {
                // Если класс преобразован в пустую строку, удаляем его
                if (transformedClass === '') {
                    return; // Пропускаем этот класс (удаляем)
                }
                // Если класс преобразован, добавляем только новый класс (не добавляем старый)
                if (!transformedClasses.includes(transformedClass)) {
                    transformedClasses.push(transformedClass);
                }
                return; // Класс обработан, переходим к следующему
            }
            
            // Пропускаем служебные классы (удаляем их)
            if (c.includes('mgts') || c.includes('disable') || c.includes('mr') || c.includes('pd') || 
                c === 'active' || c === 'container-mgts' || 
                c.match(/^mb-\d+$/) || c.match(/^mt-\d+$/) || // все классы отступов (mb-24, mb-32, mb-56, mb-80, mb-120, mt-32, mt-48, mt-80)
                c === 'mb-default' || c === 'mt-default' || // служебные классы отступов
                c === 'bread-crumbs-row' || c.startsWith('breadcrumb') ||
                c === 'title-margin-top' || c === 'nolink_inmobile' ||
                c === 'b2b_connection_request') {
                return; // Пропускаем этот класс (удаляем)
            }
            
            // Пропускаем классы, которые уже являются целевыми (начинаются с префикса компонента)
            // НО только если это НЕ старый класс, который нужно преобразовать
            const needsTransformation = transformInternalClass(c, actualParentComponent) !== null;
            if (!needsTransformation && (c === actualParentComponent || c.startsWith(actualParentComponent + '__') || c.startsWith(actualParentComponent + '--'))) {
                if (!transformedClasses.includes(c)) {
                    transformedClasses.push(c);
                }
                return;
            }
            
            // Пропускаем классы Яндекс карт и SVG (они используются внешними библиотеками)
            if (c.startsWith('ymaps3x0--') || c.startsWith('Logo_svg__') || c.includes('__cls-')) {
                transformedClasses.push(c);
                return;
            }
            
            // Пропускаем числовые классы и служебные
            if (c.match(/^\d+$/) || c === 'c-6' || c === 'c-4' || c === 'mb-56' || c === 'mt-56' ||
                c.match(/^c-\d+$/)) { // Удаляем все служебные классы c-3, c-5, c-7, c-8 и т.д.
                return;
            }
            
            // Удаляем служебные классы для позиционирования и стилей
            if (c === 'full-width' || c === 'cards-vertical' || c === 'cards-scroll' || 
                c === 'cards-align-top' || c === 'element-positions-even' || c === 'element-positions-odd' ||
                c === 'all-services-section__cards' || c === 'type-size-L' || c === 'middle-text-width' ||
                c === 'title-low' || c === 'title-high' || c === 'size-S' || c === 'size-M') {
                return; // Пропускаем этот класс (удаляем)
            }
            
            // Пропускаем модификаторы (они могут использоваться как модификаторы)
            // НО только если они не имеют маппинга
            const hasModifierMapping = transformInternalClass(c, actualParentComponent) !== null;
            if (!hasModifierMapping && (c === 'size-L' || c === 'size-XL' ||
                c === 'primary' || c === 'secondary' || c === 'white' || c === 'gray' ||
                c === 'vertical' || c === 'scroll' || c === 'align-top' || c === 'default' ||
                c === 'high' || c === 'low' || c === 'width' || c === 'blur' || c === 'card-1' || 
                c === 'card-2' || c === 'base-style' || c === 'card')) {
                transformedClasses.push(c);
                return;
            }
            
            // Если нет маппинга, проверяем дальше
            // НО сначала еще раз проверяем, не должен ли класс быть удален (на случай, если маппинг не сработал)
            const shouldBeRemoved = c === 'title-margin-top' || c === 'nolink_inmobile' || 
                                   c === 'b2b_connection_request' || 
                                   c.match(/^mb-\d+$/) || c.match(/^mt-\d+$/) ||
                                   c === 'mb-default' || c === 'mt-default' ||
                                   c === 'bread-crumbs-row' || c.startsWith('breadcrumb');
            if (shouldBeRemoved) {
                return; // Пропускаем этот класс (удаляем)
            }
            
            {
                // Если класс уже имеет правильный префикс компонента, оставляем как есть
                if (actualParentComponent && (c.startsWith(actualParentComponent + '__') || c.startsWith(actualParentComponent + '--'))) {
                    if (!transformedClasses.includes(c)) {
                        transformedClasses.push(c);
                    }
                } else if (actualParentComponent) {
                    // Если нет маппинга, пытаемся создать правильный класс на основе родительского компонента
                    // Но только если класс не является общим (например, 'container', 'content', 'text')
                    const commonClasses = ['container', 'content', 'text', 'title', 'image', 'button', 'item', 'list', 'row', 'column', 'box', 'wrapper', 'header', 'footer'];
                    if (commonClasses.includes(c)) {
                        // Для общих классов создаем правильный префикс
                        const newClass = `${actualParentComponent}__${c}`;
                        if (!transformedClasses.includes(newClass)) {
                            transformedClasses.push(newClass);
                        }
                    } else {
                        // Для специфичных классов, которые не преобразованы, оставляем как есть
                        // Но только если они не являются старыми классами, которые должны быть преобразованы
                        // Проверяем, не является ли это старым классом, который мы пропустили
                        const isOldClass = c.includes('-card') || c.includes('-container') || c.includes('-wrapper') || 
                                          c.includes('-header') || c.includes('-content') || c.includes('-title');
                        // Еще раз проверяем, не должен ли класс быть удален
                        const shouldBeRemovedHere = c === 'title-margin-top' || c === 'nolink_inmobile' || 
                                                   c === 'b2b_connection_request' || 
                                                   c.match(/^mb-\d+$/) || c.match(/^mt-\d+$/) ||
                                                   c === 'mb-default' || c === 'mt-default' ||
                                                   c === 'bread-crumbs-row' || c.startsWith('breadcrumb');
                        if (!isOldClass && !shouldBeRemovedHere && !transformedClasses.includes(c)) {
                            transformedClasses.push(c);
                        }
                    }
                }
            }
        });
        
        if (transformedClasses.length > 0) {
            // Для SVG элементов используем setAttribute
            if (newElement.tagName === 'svg' || newElement.tagName === 'SVG') {
                newElement.setAttribute('class', transformedClasses.join(' '));
            } else {
                newElement.className = transformedClasses.join(' ');
            }
        }
    } else {
        // Для элементов без родительского типа - просто очищаем классы
        const classes = Array.from(element.classList)
            .filter(c => !c.includes('mgts') && !c.includes('disable') && !c.includes('mr') && !c.includes('pd'))
            .map(c => c.replace(/^[a-z]+-/, ''));
        if (classes.length > 0) {
            newElement.className = classes.join(' ');
        }
    }
    
    // Копируем содержимое
    // Используем actualParentComponent, если он был определен, иначе parentComponentType
    const componentTypeForChildren = actualParentComponent || parentComponentType;
    
    // ВАЖНО: Для ссылок на файлы сохраняем содержимое полностью (текст ссылки)
    if (isFileLink) {
        // Копируем все дочерние узлы (текст и вложенные элементы)
        // Для ссылок на файлы сохраняем все вложенные элементы (например, span.file-name)
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
                // Для вложенных элементов сохраняем их тоже, но упрощаем структуру
                // Если это span.file-name, сохраняем только текст
                if (node.tagName === 'SPAN' || node.tagName === 'span') {
                    const classes = Array.from(node.classList || []);
                    if (classes.includes('file-name') || classes.some(c => c.includes('file-name'))) {
                        // Сохраняем только текст из span.file-name
                        const text = node.textContent.trim();
                        if (text) {
                            newElement.appendChild(element.ownerDocument.createTextNode(text));
                        }
                    } else {
                        // Для других span сохраняем через transformElement
                        newElement.appendChild(transformElement(node, componentTypeForChildren));
                    }
                } else {
                    newElement.appendChild(transformElement(node, componentTypeForChildren));
                }
            } else {
                newElement.appendChild(node.cloneNode(true));
            }
        });
    } else {
        // Обычная обработка дочерних элементов
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
                newElement.appendChild(transformElement(node, componentTypeForChildren));
            } else {
                newElement.appendChild(node.cloneNode(true));
            }
        });
    }
    
    return newElement;
}

/**
 * Определить тип компонента для секции на основе детальной классификации
 */
function getComponentTypeForSection(sectionHtml, pageSlug, detailedClassification) {
    if (!detailedClassification || !detailedClassification.pagesAnalysis) {
        return null;
    }
    
    // Ищем страницу в pagesAnalysis
    const pageAnalysis = detailedClassification.pagesAnalysis.find(p => p.pageSlug === pageSlug);
    if (!pageAnalysis || !pageAnalysis.sections) {
        return null;
    }
    
    // Ищем секцию, которая соответствует данному HTML
    for (const sectionData of pageAnalysis.sections) {
        const sectionInfo = sectionData.section || {};
        const classification = sectionData.classification || {};
        
        // Проверяем по HTML превью
        if (sectionInfo.html && sectionHtml.includes(sectionInfo.html.substring(0, 100))) {
            // Используем рекомендацию из классификации
            if (classification.recommendation) {
                return classification.recommendation.replace('page.', '');
            }
            // Или первый совпавший компонент
            if (classification.matchedComponents && classification.matchedComponents.length > 0) {
                return classification.matchedComponents[0].replace('page.', '');
            }
        }
        
        // Также проверяем по классам
        if (sectionInfo.classes && sectionInfo.classes.length > 0) {
            const sectionClasses = sectionInfo.classes.join(' ');
            if (sectionHtml.includes(sectionClasses) || sectionInfo.classes.some(c => sectionHtml.includes(c))) {
                if (classification.recommendation) {
                    return classification.recommendation.replace('page.', '');
                }
                if (classification.matchedComponents && classification.matchedComponents.length > 0) {
                    return classification.matchedComponents[0].replace('page.', '');
                }
            }
        }
    }
    
    return null;
}

/**
 * Нормализовать HTML страницы
 */
function normalizePageHTML(pageData, detailedClassification) {
    // ВАЖНО: Для повторной нормализации всегда используем исходный HTML из content.html
    // Это гарантирует, что мы нормализуем полный исходный контент, а не уже обработанный
    const html = pageData.content?.html || '';
    if (!html || html.trim().length === 0) {
        console.warn(`[normalizePageHTML] Нет исходного HTML для страницы ${pageData.slug}`);
        return null;
    }
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // ВАЖНО: Находим основной контейнер контента ДО удаления элементов
    // Приоритет: article > main > .page-column-container > .container-mgts > body
    let mainContent = doc.querySelector('article.article-about-mgts, main, article');
    
    // Если не нашли article или main, ищем по структуре
    if (!mainContent) {
        // Ищем контейнер с классом page-column-container (он содержит секции)
        const pageColumnContainer = doc.querySelector('.page-column-container');
        if (pageColumnContainer) {
            // Ищем article внутри, если его нет - используем сам контейнер
            mainContent = pageColumnContainer.querySelector('article') || pageColumnContainer;
        } else {
            // Если не нашли page-column-container, ищем container-mgts
            const container = doc.querySelector('.container-mgts');
            if (container) {
                // Ищем article или page-column-container внутри
                mainContent = container.querySelector('article, .page-column-container') || container;
            } else {
                // Fallback: используем body
                mainContent = doc.body;
            }
        }
    }
    
    // Теперь удаляем ненужные элементы только из основного контента
    // ВАЖНО: Удаляем только навигацию и служебные элементы, НЕ контейнеры с контентом внутри секций
    if (mainContent) {
        REMOVE_SELECTORS.forEach(selector => {
            try {
                const elements = mainContent.querySelectorAll(selector);
                elements.forEach(el => {
                    // ВАЖНО: Не удаляем элементы, которые находятся внутри секций (section)
                    // Секции содержат весь важный контент, и мы не должны удалять элементы внутри них
                    let isInsideSection = false;
                    let parent = el.parentElement;
                    while (parent && parent !== mainContent) {
                        if (parent.tagName && parent.tagName.toLowerCase() === 'section') {
                            isInsideSection = true;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    
                    // Удаляем только элементы вне секций или явно служебные элементы
                    if (!isInsideSection || selector.includes('breadcrumb') || selector.includes('sidebar') || selector.includes('nav') || selector.includes('menu')) {
                        el.remove();
                    }
                });
            } catch (e) {
                // Игнорируем ошибки селекторов
            }
        });
    }
    
    // Создаем новый контейнер для нормализованного контента
    const normalizedContainer = doc.createElement('div');
    normalizedContainer.className = 'normalized-content';
    
    // ВАЖНО: Обрабатываем ВСЕ элементы контента для сохранения 100% информации
    // Сначала пытаемся найти структурированные блоки - ВСЕ <section> элементы имеют приоритет
    // Затем ищем div с блоками, затем article
    
    // Приоритет 1: Все <section> элементы (они содержат основной контент)
    let sections = mainContent.querySelectorAll('section');
    let elementsToProcess = [];
    
    if (sections.length > 0) {
        // Используем все найденные секции, фильтруем только явно служебные элементы
        elementsToProcess = Array.from(sections).filter(el => {
            // Пропускаем уже удаленные элементы
            if (!el.parentNode || !mainContent.contains(el)) {
                return false;
            }
            
            // Фильтруем только явно служебные элементы
            const classes = Array.from(el.classList || []);
            const tagName = el.tagName.toLowerCase();
            
            // Пропускаем служебные теги
            if (tagName === 'nav' || tagName === 'aside' || tagName === 'header' || tagName === 'footer') {
                return false;
            }
            
            // Пропускаем только явно служебные классы
            // ВАЖНО: НЕ пропускаем main-section, так как это важные секции с контентом!
            if (classes.some(c => 
                c.includes('sidebar') || 
                c.includes('breadcrumb') || 
                c === 'nav' ||
                c.includes('menu') && !c.includes('main-section') ||
                (c === 'header' && !c.includes('section')) ||
                (c === 'footer' && !c.includes('section'))
            )) {
                return false;
            }
            
            // ВАЖНО: Проверяем, что секция не пустая - если есть содержимое, обрабатываем её
            // Но делаем это ПОСЛЕ удаления служебных элементов, так как они могут быть еще не удалены
            // Просто проверяем, что это реальная секция с контентом, а не служебный элемент
            return true;
        });
    }
    
    // Приоритет 2: Если не нашли секции, ищем div с блоками
    if (elementsToProcess.length === 0) {
        let blocks = mainContent.querySelectorAll('div[class*="block"], div[class*="main-section"], div[class*="section"], article');
        
        if (blocks.length > 0) {
            elementsToProcess = Array.from(blocks).filter(el => {
                if (!el.parentNode || !mainContent.contains(el)) {
                    return false;
                }
                
                const classes = Array.from(el.classList || []);
                const tagName = el.tagName.toLowerCase();
                
                if (tagName === 'nav' || tagName === 'aside' || tagName === 'header' || tagName === 'footer') {
                    return false;
                }
                
                if (classes.some(c => 
                    c.includes('sidebar') || 
                    c.includes('breadcrumb') || 
                    c.includes('nav') ||
                    c.includes('menu') ||
                    c.includes('header') ||
                    c.includes('footer') ||
                    c.includes('container-mgts')
                )) {
                    return false;
                }
                
                return true;
            });
        }
    }
    
    // Если не нашли структурированные блоки или их недостаточно, 
    // берем прямые дочерние элементы article или main
    if (elementsToProcess.length === 0) {
        const directChildren = Array.from(mainContent.children).filter(el => {
            const classes = Array.from(el.classList || []);
            const tagName = el.tagName.toLowerCase();
            
            // Пропускаем служебные элементы
            if (tagName === 'nav' || tagName === 'aside' || tagName === 'header' || tagName === 'footer') {
                return false;
            }
            
            if (classes.some(c => 
                c.includes('sidebar') || 
                c.includes('breadcrumb') || 
                c.includes('nav') ||
                c.includes('menu') ||
                c.includes('header') ||
                c.includes('footer')
            )) {
                return false;
            }
            
            return true;
        });
        
        elementsToProcess = directChildren;
    }
    
    // Если все еще ничего не найдено, берем весь контент mainContent (кроме уже удаленных элементов)
    if (elementsToProcess.length === 0) {
        console.warn(`[normalizePageHTML] Не найдены структурированные блоки для ${pageData.slug}, используем весь контент`);
        // Берем все элементы внутри mainContent, кроме служебных
        const allElements = mainContent.querySelectorAll('*');
        elementsToProcess = Array.from(allElements).filter(el => {
            const classes = Array.from(el.classList || []);
            const tagName = el.tagName.toLowerCase();
            
            if (tagName === 'nav' || tagName === 'aside' || tagName === 'header' || tagName === 'footer' || tagName === 'script' || tagName === 'style') {
                return false;
            }
            
            if (classes.some(c => 
                c.includes('sidebar') || 
                c.includes('breadcrumb') || 
                c.includes('nav') ||
                c.includes('menu') ||
                c.includes('header') ||
                c.includes('footer') ||
                c.includes('container-mgts')
            )) {
                return false;
            }
            
            return true;
        });
        
        // Фильтруем вложенные элементы (если родитель уже в списке, не добавляем дочерние)
        elementsToProcess = elementsToProcess.filter(el => {
            let current = el.parentElement;
            while (current && current !== mainContent) {
                if (elementsToProcess.includes(current)) {
                    return false; // Это дочерний элемент другого обрабатываемого элемента
                }
                current = current.parentElement;
            }
            return true;
        });
        
        // Если это не сработало, берем просто весь mainContent
        if (elementsToProcess.length === 0) {
            console.warn(`[normalizePageHTML] Не удалось извлечь элементы для ${pageData.slug}, используем весь mainContent`);
            elementsToProcess = [mainContent];
        }
    }
    
    elementsToProcess.forEach(element => {
        // Пропускаем уже удаленные элементы
        if (!element.parentNode || !mainContent.contains(element)) {
            return;
        }
        
        // ВАЖНО: Определяем тип компонента, проверяя как классы самой секции, так и содержимое
        const elementHtml = element.outerHTML;
        let componentType = getComponentTypeForSection(elementHtml, pageData.slug, detailedClassification);
        
        // Если не нашли тип по классификации, проверяем содержимое секции
        if (!componentType) {
            // Проверяем наличие контейнеров карточек внутри секции
            if (element.querySelector('.service-cards-2-container, .service-cards-3-container, .service-cards-container, .advantage-cards-container')) {
                componentType = 'section-cards';
            }
            // Проверяем наличие самих карточек
            else if (element.querySelector('.service-card-type-2, .advantage-card, .card-base-style')) {
                componentType = 'section-cards';
            }
            // Проверяем наличие тарифов
            else if (element.querySelector('.tariff-card, .tariff-cards-container')) {
                componentType = 'service-tariffs';
            }
            // Проверяем наличие FAQ
            else if (element.querySelector('.accordion-row, [class*="accordion"]')) {
                componentType = 'service-faq';
            }
            // Проверяем наличие форм
            else if (element.querySelector('form, .request-form-container, .section-request-container')) {
                componentType = 'service-order-form';
            }
            // Проверяем наличие hero элементов
            else if (element.querySelector('.title-promo-long, [class*="title-promo"]')) {
                componentType = 'hero';
            }
        }
        
        if (componentType) {
            // Преобразуем элемент в секцию с правильным типом
            const normalizedSection = doc.createElement('section');
            normalizedSection.className = componentType;
            
            // ВАЖНО: Копируем ВСЕ содержимое элемента (innerHTML), чтобы не потерять вложенные элементы
            // Используем innerHTML для копирования всей структуры, затем трансформируем классы напрямую
            const elementHTML = element.innerHTML;
            
            // Создаем временный документ для работы с содержимым
            const tempDom = new JSDOM(`<div>${elementHTML}</div>`);
            const tempDoc = tempDom.window.document;
            const tempContainer = tempDoc.body.firstChild;
            
            // Трансформируем все элементы внутри временного контейнера
            // Изменяем классы напрямую, не создавая новые элементы
            const allElements = tempContainer.querySelectorAll('*');
            allElements.forEach(el => {
                // Получаем классы элемента
                let classes = [];
                if (el.classList) {
                    if (typeof el.classList.forEach === 'function') {
                        el.classList.forEach(c => classes.push(c));
                    } else if (Array.isArray(el.classList)) {
                        classes = el.classList;
                    } else {
                        const className = el.getAttribute('class') || '';
                        classes = className.split(' ').filter(c => c.trim());
                    }
                }
                
                // Трансформируем классы через transformInternalClass
                const transformedClasses = [];
                classes.forEach(c => {
                    const transformedClass = transformInternalClass(c, componentType);
                    if (transformedClass === null) {
                        // Класс не трансформирован - проверяем, не является ли он служебным
                        if (!c.includes('mgts') && !c.includes('disable') && !c.includes('mr') && !c.includes('pd') &&
                            c !== 'active' && c !== 'container-mgts' && !c.match(/^mb-\d+$/) && !c.match(/^mt-\d+$/) &&
                            c !== 'mb-default' && c !== 'mt-default' && c !== 'bread-crumbs-row' && !c.startsWith('breadcrumb') &&
                            c !== 'title-margin-top' && c !== 'nolink_inmobile' && c !== 'b2b_connection_request') {
                            // Не служебный класс - сохраняем его
                            transformedClasses.push(c);
                        }
                        // Иначе пропускаем (удаляем служебный класс)
                    } else if (transformedClass === '') {
                        // Класс должен быть удален
                    } else {
                        // Класс трансформирован
                        if (!transformedClasses.includes(transformedClass)) {
                            transformedClasses.push(transformedClass);
                        }
                    }
                });
                
                // Применяем трансформированные классы
                if (transformedClasses.length > 0) {
                    el.className = transformedClasses.join(' ');
                } else {
                    el.removeAttribute('class');
                }
            });
            
            // Переносим все содержимое из трансформированного контейнера в нормализованную секцию
            // Используем innerHTML для сохранения всей структуры
            normalizedSection.innerHTML = tempContainer.innerHTML;
            
            // Проверяем, что секция не пустая перед добавлением
            if (normalizedSection.children.length > 0 || normalizedSection.textContent.trim().length > 0) {
                normalizedContainer.appendChild(normalizedSection);
            } else {
                console.warn(`[normalizePageHTML] Пустая секция ${componentType} для ${pageData.slug}, пропускаем`);
            }
        } else {
            // Пытаемся определить по классам
            const classes = Array.from(element.classList);
            let foundType = null;
            
            // Проверяем маппинг классов (в порядке приоритета)
            for (const mapping of CLASS_MAPPING) {
                const selector = mapping.selector;
                const newType = mapping.type;
                
                // Проверяем точное совпадение класса
                if (selector.startsWith('.') && !selector.includes('*')) {
                    const className = selector.replace('.', '');
                    if (classes.includes(className)) {
                        foundType = newType;
                        break;
                    }
                }
                
                // Проверяем частичное совпадение
                if (selector.includes('*')) {
                    const pattern = selector.replace(/\[class\*="([^"]+)"\]/, '$1');
                    if (classes.some(c => c.includes(pattern))) {
                        foundType = newType;
                        break;
                    }
                }
                
                // Проверяем по частичному совпадению класса
                if (selector.startsWith('.') && !selector.includes('*')) {
                    const className = selector.replace('.', '');
                    if (classes.some(c => c.includes(className) || className.includes(c))) {
                        foundType = newType;
                        break;
                    }
                }
            }
            
            if (foundType) {
                const normalizedSection = doc.createElement('section');
                normalizedSection.className = foundType;
                
                // ВАЖНО: Копируем ВСЕ содержимое элемента через innerHTML
                const elementHTML = element.innerHTML;
                const tempDom = new JSDOM(`<div>${elementHTML}</div>`);
                const tempDoc = tempDom.window.document;
                const tempContainer = tempDoc.body.firstChild;
                
                // Трансформируем классы всех элементов напрямую
                const allElements = tempContainer.querySelectorAll('*');
                allElements.forEach(el => {
                    let classes = [];
                    if (el.classList) {
                        if (typeof el.classList.forEach === 'function') {
                            el.classList.forEach(c => classes.push(c));
                        } else {
                            const className = el.getAttribute('class') || '';
                            classes = className.split(' ').filter(c => c.trim());
                        }
                    }
                    
                    const transformedClasses = [];
                    classes.forEach(c => {
                        const transformedClass = transformInternalClass(c, foundType);
                        if (transformedClass === null && !c.includes('mgts') && !c.includes('disable') && !c.includes('mr') && !c.includes('pd') &&
                            c !== 'active' && c !== 'container-mgts' && !c.match(/^mb-\d+$/) && !c.match(/^mt-\d+$/) &&
                            c !== 'mb-default' && c !== 'mt-default' && c !== 'bread-crumbs-row' && !c.startsWith('breadcrumb') &&
                            c !== 'title-margin-top' && c !== 'nolink_inmobile' && c !== 'b2b_connection_request') {
                            transformedClasses.push(c);
                        } else if (transformedClass && transformedClass !== '' && !transformedClasses.includes(transformedClass)) {
                            transformedClasses.push(transformedClass);
                        }
                    });
                    
                    if (transformedClasses.length > 0) {
                        el.className = transformedClasses.join(' ');
                    } else {
                        el.removeAttribute('class');
                    }
                });
                
                normalizedSection.innerHTML = tempContainer.innerHTML;
                
                if (normalizedSection.children.length > 0 || normalizedSection.textContent.trim().length > 0) {
                    normalizedContainer.appendChild(normalizedSection);
                }
            } else {
                // ВАЖНО: Если не нашли тип, пытаемся определить по содержимому секции
                // Проверяем наличие специфичных элементов внутри секции
                let inferredType = null;
                
                // Приоритет 1: Проверяем наличие контейнеров карточек (они определяют тип секции)
                if (element.querySelector('.service-cards-2-container, .service-cards-3-container, .service-cards-container')) {
                    inferredType = 'section-cards';
                }
                // Приоритет 2: Проверяем наличие карточек (service-card-type-2, advantage-card)
                else if (element.querySelector('.service-card-type-2, .advantage-card, .card-base-style, [class*="service-card"], [class*="advantage-card"]')) {
                    inferredType = 'section-cards';
                }
                // Приоритет 3: Проверяем наличие контейнеров карточек (advantage-cards-container)
                else if (element.querySelector('.advantage-cards-container, [class*="cards-container"]')) {
                    inferredType = 'section-cards';
                }
                // Приоритет 4: Проверяем наличие тарифов
                else if (element.querySelector('.tariff-card, .tariff-cards-container, [class*="tariff"]')) {
                    inferredType = 'service-tariffs';
                }
                // Приоритет 5: Проверяем наличие FAQ
                else if (element.querySelector('.accordion-row, [class*="accordion"]')) {
                    inferredType = 'service-faq';
                }
                // Приоритет 6: Проверяем наличие форм
                else if (element.querySelector('form, .request-form-container, .section-request-container, [class*="request-form"]')) {
                    inferredType = 'service-order-form';
                }
                // Приоритет 7: Проверяем наличие hero элементов (title-promo-long)
                else if (element.querySelector('.title-promo-long, [class*="title-promo"]')) {
                    inferredType = 'hero';
                }
                // Приоритет 8: Проверяем наличие заголовков h1/h2 - это текстовая секция
                else if (element.querySelector('h1, h2, .h1-wide-med, .title-h1-wide')) {
                    inferredType = 'section-text';
                }
                // По умолчанию - текстовая секция (но только если есть содержимое)
                else {
                    // Проверяем, есть ли вообще содержимое в секции
                    const hasContent = element.innerHTML.trim().length > 0 && 
                                      (element.children.length > 0 || element.textContent.trim().length > 0);
                    if (hasContent) {
                        inferredType = 'section-text';
                    } else {
                        // Пустая секция - пропускаем её
                        console.warn(`[normalizePageHTML] Пустая секция для ${pageData.slug}, пропускаем`);
                        return;
                    }
                }
                
                const normalizedSection = doc.createElement('section');
                normalizedSection.className = inferredType;
                
                // ВАЖНО: Копируем ВСЕ содержимое элемента через innerHTML
                const elementHTML = element.innerHTML;
                const tempDom = new JSDOM(`<div>${elementHTML}</div>`);
                const tempDoc = tempDom.window.document;
                const tempContainer = tempDoc.body.firstChild;
                
                // Трансформируем классы всех элементов напрямую
                const allElements = tempContainer.querySelectorAll('*');
                allElements.forEach(el => {
                    let classes = [];
                    if (el.classList) {
                        if (typeof el.classList.forEach === 'function') {
                            el.classList.forEach(c => classes.push(c));
                        } else {
                            const className = el.getAttribute('class') || '';
                            classes = className.split(' ').filter(c => c.trim());
                        }
                    }
                    
                    const transformedClasses = [];
                    classes.forEach(c => {
                        const transformedClass = transformInternalClass(c, inferredType);
                        if (transformedClass === null && !c.includes('mgts') && !c.includes('disable') && !c.includes('mr') && !c.includes('pd') &&
                            c !== 'active' && c !== 'container-mgts' && !c.match(/^mb-\d+$/) && !c.match(/^mt-\d+$/) &&
                            c !== 'mb-default' && c !== 'mt-default' && c !== 'bread-crumbs-row' && !c.startsWith('breadcrumb') &&
                            c !== 'title-margin-top' && c !== 'nolink_inmobile' && c !== 'b2b_connection_request') {
                            transformedClasses.push(c);
                        } else if (transformedClass && transformedClass !== '' && !transformedClasses.includes(transformedClass)) {
                            transformedClasses.push(transformedClass);
                        }
                    });
                    
                    if (transformedClasses.length > 0) {
                        el.className = transformedClasses.join(' ');
                    } else {
                        el.removeAttribute('class');
                    }
                });
                
                normalizedSection.innerHTML = tempContainer.innerHTML;
                
                if (normalizedSection.children.length > 0 || normalizedSection.textContent.trim().length > 0) {
                    normalizedContainer.appendChild(normalizedSection);
                }
            }
        }
    });
    
    // Если не нашли элементов, копируем весь контент mainContent
    if (normalizedContainer.children.length === 0) {
        // Создаем одну секцию section-text для всего контента
        const defaultSection = doc.createElement('section');
        defaultSection.className = 'section-text';
        
        Array.from(mainContent.childNodes).forEach(node => {
            if (node.nodeType === 1) {
                const classes = Array.from(node.classList || []);
                // Пропускаем навигацию и сайдбары
                if (!classes.some(c => c.includes('sidebar') || c.includes('breadcrumb') || c.includes('nav'))) {
                    defaultSection.appendChild(transformElement(node, 'section-text'));
                }
            } else if (node.nodeType === 3 && node.textContent.trim()) {
                // Сохраняем текстовые узлы
                defaultSection.appendChild(node.cloneNode(true));
            }
        });
        
        if (defaultSection.children.length > 0 || defaultSection.textContent.trim()) {
            normalizedContainer.appendChild(defaultSection);
        }
    }
    
    return normalizedContainer.innerHTML;
}

// Экспортируем функцию для использования в других скриптах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizePageHTML: normalizePageHTML
    };
}

/**
 * Основная функция
 */
async function normalizeAllPages() {
    console.log('🔄 НОРМАЛИЗАЦИЯ HTML СТРУКТУРЫ');
    console.log('='.repeat(70));
    
    // Загружаем детальную классификацию
    let detailedClassification = {};
    if (fs.existsSync(DETAILED_CLASSIFICATION_FILE)) {
        try {
            detailedClassification = JSON.parse(fs.readFileSync(DETAILED_CLASSIFICATION_FILE, 'utf-8'));
            console.log('✅ Загружена детальная классификация секций\n');
        } catch (e) {
            console.log('⚠️  Не удалось загрузить детальную классификацию, используем базовые правила\n');
        }
    }
    
    // Получаем все JSON файлы страниц
    const files = fs.readdirSync(PAGES_CONTENT_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .sort();
    
    console.log(`📚 Найдено страниц для нормализации: ${files.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        totalPages: files.length,
        successful: 0,
        failed: 0,
        pages: []
    };
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(PAGES_CONTENT_DIR, file);
        
        try {
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const slug = pageData.slug || file.replace('.json', '');
            
            if ((i + 1) % 10 === 0 || i === 0) {
                console.log(`[${i + 1}/${files.length}] Обработка: ${slug}...`);
            }
            
            // Нормализуем HTML
            const normalizedHTML = normalizePageHTML(pageData, detailedClassification);
            
            if (!normalizedHTML) {
                console.log(`   ⚠️  Нет контента для нормализации`);
                results.failed++;
                continue;
            }
            
            // Сохраняем нормализованный контент
            const normalizedData = {
                ...pageData,
                normalizedHTML: normalizedHTML,
                normalizedAt: new Date().toISOString()
            };
            
            const outputPath = path.join(OUTPUT_DIR, file);
            fs.writeFileSync(outputPath, JSON.stringify(normalizedData, null, 2), 'utf-8');
            
            results.successful++;
            results.pages.push({
                slug: slug,
                url: pageData.url,
                title: pageData.title,
                section: pageData.section
            });
            
        } catch (error) {
            console.error(`   ❌ Ошибка при обработке ${file}: ${error.message}`);
            results.failed++;
        }
    }
    
    // Сохраняем индекс
    const indexPath = path.join(OUTPUT_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(70));
    console.log(`Всего страниц: ${results.totalPages}`);
    console.log(`✅ Успешно нормализовано: ${results.successful}`);
    console.log(`❌ Ошибок: ${results.failed}`);
    console.log(`\n📁 Результаты сохранены в: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
    
    return results;
}

if (require.main === module) {
    normalizeAllPages().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { 
    normalizeAllPages, 
    normalizePageHTML,
    transformElement,
    transformInternalClass,
    INTERNAL_CLASSES_MAPPING,
    TARGET_COMPONENTS
};
