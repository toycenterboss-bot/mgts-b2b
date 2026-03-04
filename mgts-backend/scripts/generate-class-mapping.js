const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/comprehensive-classes-analysis.json');
const MAPPING_OUTPUT = path.join(__dirname, '../../temp/services-extraction/generated-class-mapping.json');

// Загружаем анализ
const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));

// Определяем маппинг на основе анализа
const mapping = {
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
    },
    // Section cards
    'section-cards': {
        'card-base-style': '', // служебный класс, удаляем
        'card-content': 'section-cards__card-content',
        'card-content__title': 'section-cards__card-title',
        'card-content__text': 'section-cards__card-text',
        'p2-comp-reg': 'section-cards__card-text', // если внутри card-content
        'circle-icon': 'section-cards__card-icon',
        'big-circle': 'section-cards__card-icon--big',
        'advantage-card__content-wrapper': 'section-cards__card-content',
        'advantage-card__header': 'section-cards__card-title',
        'service-card-type-2__header': 'section-cards__card-header',
        'service-card-type-2__content-wrapper': 'section-cards__card-content',
        'all-services-card__content-wrapper': 'section-cards__card-content',
    },
    // Section text
    'section-text': {
        'title-promo-long': 'section-text__hero',
        'title-promo-long__title-text': 'section-text__title',
        'title-promo-long__description-text': 'section-text__content',
        'title-h1-wide': 'section-text__title-wrapper',
        'title-h1-wide__title-text': 'section-text__title',
        'p1-comp-reg': 'section-text__content',
        'p2-comp-reg': 'section-text__content',
        'block-text-box': 'section-text__text-box',
        'content-box': 'section-text__content-box',
        'content-box__text': 'section-text__content',
        'content-box__banner': 'section-text__banner',
        'content-box__banner-title': 'section-text__banner-title',
        'content-box__banner-description': 'section-text__banner-description',
    },
    // Service order form
    'service-order-form': {
        'p1-comp-reg': 'service-order-form__text',
        'p2-comp-reg': 'service-order-form__text',
        'p3-comp-reg': 'service-order-form__text',
    },
    // Service tariffs
    'service-tariffs': {
        'title-h1-wide': 'service-tariffs__title-wrapper',
        'title-h1-wide__title-text': 'service-tariffs__title',
        'p1-comp-reg': 'service-tariffs__description',
        'p2-comp-reg': 'service-tariffs__description',
    },
    // Service FAQ
    'service-faq': {
        'title-h1-wide': 'service-faq__title-wrapper',
        'title-h1-wide__title-text': 'service-faq__title',
        'p1-comp-reg': 'service-faq__text',
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
    },
    // Mobile app section
    'mobile-app-section': {
        'title-h1-wide': 'mobile-app-section__title-wrapper',
        'title-h1-wide__title-text': 'mobile-app-section__title',
        'mobile-app-slider__header': 'mobile-app-section__header',
        'mobile-app-slider__header-download-box': 'mobile-app-section__download',
        'mobile-app-stores': 'mobile-app-section__stores',
        'mobile-app-stores-box': 'mobile-app-section__stores',
        'mobile-app-slider__content': 'mobile-app-section__content',
    },
    // History timeline
    'history-timeline': {
        'type-size-L': '', // служебный класс
        'last-data-item': 'history-timeline__period--last',
    },
};

// Сохраняем маппинг
fs.writeFileSync(MAPPING_OUTPUT, JSON.stringify(mapping, null, 2), 'utf-8');
console.log(`✅ Маппинг сохранен в: ${MAPPING_OUTPUT}\n`);

// Статистика
let totalMappings = 0;
Object.values(mapping).forEach(componentMapping => {
    totalMappings += Object.keys(componentMapping).length;
});

console.log('📊 Статистика маппинга:');
console.log(`   Компонентов: ${Object.keys(mapping).length}`);
console.log(`   Всего маппингов: ${totalMappings}\n`);

// Проверяем покрытие топ-10 нецелевых классов
console.log('🔍 Покрытие топ-10 нецелевых классов:');
const top10 = analysis.invalidClasses.slice(0, 10);
top10.forEach(item => {
    let found = false;
    let targetComponent = null;
    let targetClass = null;
    
    // Ищем в маппинге
    Object.keys(mapping).forEach(component => {
        if (mapping[component][item.className]) {
            found = true;
            targetComponent = component;
            targetClass = mapping[component][item.className];
        }
    });
    
    if (found) {
        console.log(`   ✅ ${item.className} → ${targetComponent}::${targetClass}`);
    } else {
        console.log(`   ❌ ${item.className} (${item.count} раз) - не найден маппинг`);
    }
});
