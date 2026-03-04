const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-non-normalized-classes.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/complete-class-mapping.json');

// Загружаем анализ
const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));

// Загружаем текущий маппинг
const { INTERNAL_CLASSES_MAPPING } = require('./normalize-html-structure.js');

// Целевые компоненты
const TARGET_COMPONENTS = [
    'section-text',
    'section-cards',
    'section-map',
    'service-tariffs',
    'service-faq',
    'service-order-form',
    'hero',
    'history-timeline',
    'how-to-connect',
    'image-carousel',
    'mobile-app-section',
    'crm-cards',
    'files-table',
    'tariff-table',
];

// Создаем полный маппинг для всех оставшихся классов
const completeMapping = {};

// Группируем классы по паттернам и контексту
analysis.classSummary.forEach(classInfo => {
    const className = classInfo.className;
    const parentComponents = classInfo.parentComponents || [];
    const tagNames = classInfo.tagNames || [];
    
    // Пропускаем уже обработанные классы
    let hasMapping = false;
    for (const component of parentComponents) {
        if (INTERNAL_CLASSES_MAPPING[component] && INTERNAL_CLASSES_MAPPING[component][className]) {
            hasMapping = true;
            break;
        }
    }
    
    if (hasMapping) {
        return; // Уже есть маппинг
    }
    
    // Определяем целевой компонент
    let targetComponent = parentComponents[0] || 'section-text';
    
    // Специальные правила для определения компонента
    if (className.startsWith('file-') || className === 'files-list' || className.includes('file-item')) {
        targetComponent = 'files-table';
    } else if (className.startsWith('request-') || className.startsWith('form-') || className.includes('input-') || className.includes('button-request')) {
        targetComponent = 'service-order-form';
    } else if (className.startsWith('tariff-') || className.includes('tariff-card')) {
        targetComponent = 'service-tariffs';
    } else if (className.startsWith('accordion-')) {
        targetComponent = 'service-faq';
    } else if (className.startsWith('advantage-') || className.includes('card') || className.includes('cards-')) {
        targetComponent = 'section-cards';
    } else if (className.includes('map') || className === 'marker' || className.includes('object-')) {
        targetComponent = 'section-map';
    } else if (className.startsWith('title-') || className.startsWith('h1-') || className.startsWith('h2-') || className.startsWith('h3-')) {
        // Заголовки - используем родительский компонент
        targetComponent = parentComponents[0] || 'section-text';
    } else if (className.startsWith('p1-') || className.startsWith('p2-') || className.startsWith('p3-')) {
        // Параграфы - используем родительский компонент
        targetComponent = parentComponents[0] || 'section-text';
    } else if (className.includes('breadcrumb') || className.includes('crumb')) {
        // Хлебные крошки - удаляем
        if (!completeMapping[targetComponent]) {
            completeMapping[targetComponent] = {};
        }
        completeMapping[targetComponent][className] = '';
        return;
    }
    
    // Генерируем целевой класс
    let targetClass = null;
    
    // Специальные случаи
    if (className === 'link-img') {
        // Иконка ссылки - зависит от контекста
        if (targetComponent === 'files-table') {
            targetClass = 'files-table__item-link-icon';
        } else {
            targetClass = `${targetComponent}__link-icon`;
        }
    } else if (className === 'file-item__type-img') {
        targetClass = 'files-table__item-icon';
    } else if (className.startsWith('title-h1-wide')) {
        if (targetComponent === 'service-tariffs') {
            if (className === 'title-h1-wide') {
                targetClass = 'service-tariffs__title-wrapper';
            } else if (className === 'title-h1-wide__title-text') {
                targetClass = 'service-tariffs__title';
            } else if (className === 'title-h1-wide__description-text') {
                targetClass = 'service-tariffs__description';
            }
        } else if (targetComponent === 'service-faq') {
            if (className === 'title-h1-wide') {
                targetClass = 'service-faq__title-wrapper';
            } else if (className === 'title-h1-wide__title-text') {
                targetClass = 'service-faq__title';
            } else if (className === 'title-h1-wide__description-text') {
                targetClass = 'service-faq__description';
            }
        } else {
            if (className === 'title-h1-wide') {
                targetClass = 'section-text__title-wrapper';
            } else if (className === 'title-h1-wide__title-text') {
                targetClass = 'section-text__title';
            } else if (className === 'title-h1-wide__description-text') {
                targetClass = 'section-text__description';
            }
        }
    } else if (className.startsWith('information-list-row')) {
        targetClass = `section-text__${className.replace('information-list-row', 'info-row').replace(/-/g, '-')}`;
    } else if (className.startsWith('news-row-item')) {
        targetClass = `section-text__${className.replace('news-row-item', 'news-item').replace(/-/g, '-')}`;
    } else if (className === 'p1-comp-med') {
        targetClass = `${targetComponent}__content--medium`;
    } else if (className.startsWith('p1-') || className.startsWith('p2-') || className.startsWith('p3-')) {
        // Параграфы
        if (className.includes('med')) {
            targetClass = `${targetComponent}__content--medium`;
        } else if (className.includes('small')) {
            targetClass = `${targetComponent}__content--small`;
        } else {
            targetClass = `${targetComponent}__content`;
        }
    } else if (className.startsWith('h1-') || className.startsWith('h2-') || className.startsWith('h3-')) {
        // Заголовки
        if (className.includes('title')) {
            targetClass = `${targetComponent}__title`;
        } else {
            targetClass = `${targetComponent}__subtitle`;
        }
    } else {
        // Общий случай - преобразуем имя класса
        let baseName = className;
        
        // Удаляем префиксы
        baseName = baseName.replace(/^(request-|form-|input-|button-|tariff-|accordion-|advantage-|file-|news-|information-|shares-|tag-)/, '');
        
        // Преобразуем в BEM-нотацию
        if (baseName.includes('__')) {
            // Уже в BEM-нотации
            targetClass = `${targetComponent}__${baseName.split('__')[1]}`;
        } else if (baseName.includes('-')) {
            // Преобразуем kebab-case в BEM
            const parts = baseName.split('-');
            if (parts.length > 1) {
                targetClass = `${targetComponent}__${parts.slice(1).join('-')}`;
            } else {
                targetClass = `${targetComponent}__${baseName}`;
            }
        } else {
            targetClass = `${targetComponent}__${baseName}`;
        }
    }
    
    if (targetClass) {
        if (!completeMapping[targetComponent]) {
            completeMapping[targetComponent] = {};
        }
        completeMapping[targetComponent][className] = targetClass;
    }
});

// Сохраняем результат
const result = {
    timestamp: new Date().toISOString(),
    totalClasses: analysis.classSummary.length,
    mappedClasses: Object.values(completeMapping).reduce((sum, comp) => sum + Object.keys(comp).length, 0),
    mapping: completeMapping,
    statistics: Object.keys(completeMapping).map(component => ({
        component: component,
        classes: Object.keys(completeMapping[component]).length,
    })),
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

console.log('📋 СОЗДАНИЕ ПОЛНОГО МАППИНГА КЛАССОВ');
console.log('='.repeat(70));
console.log(`Всего уникальных классов: ${result.totalClasses}`);
console.log(`Создано маппингов: ${result.mappedClasses}`);
console.log(`\nМаппинг по компонентам:`);
result.statistics.forEach(stat => {
    console.log(`  ${stat.component}: ${stat.classes} классов`);
});
console.log(`\n📁 Результаты сохранены в: ${OUTPUT_FILE}`);
console.log('='.repeat(70));
