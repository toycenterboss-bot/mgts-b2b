const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/all-invalid-classes-analysis.json');
const COMPLETE_MAPPING_FILE = path.join(__dirname, '../../temp/services-extraction/complete-class-mapping.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-classes-analysis.json');
const REPORT_FILE = path.join(__dirname, '../../docs/REMAINING_CLASSES_ANALYSIS.md');

// Загружаем анализ и существующий маппинг
const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
const existingMapping = fs.existsSync(COMPLETE_MAPPING_FILE) 
    ? JSON.parse(fs.readFileSync(COMPLETE_MAPPING_FILE, 'utf-8'))
    : {};

// Целевые компоненты
const TARGET_COMPONENTS = [
    'section-text', 'section-cards', 'section-map', 'section-grid', 'section-table',
    'service-tariffs', 'service-faq', 'service-order-form', 'hero',
    'history-timeline', 'how-to-connect', 'image-carousel', 'image-switcher',
    'crm-cards', 'mobile-app-section', 'files-table', 'tariff-table'
];

// Проверяем, есть ли класс уже в маппинге
function isInMapping(className) {
    for (const component in existingMapping) {
        if (existingMapping[component][className]) {
            return true;
        }
    }
    return false;
}

// Классифицируем классы
const classified = {
    // Классы, которые можно добавить в существующие компоненты
    mappableToExisting: [],
    // Классы, которые требуют новых компонентов
    needNewComponent: [],
    // Служебные классы (можно оставить или удалить)
    utility: [],
    // Классы, которые являются частью структуры (section, container и т.д.)
    structural: [],
    // Неопределенные (требуют ручного анализа)
    unknown: []
};

analysis.invalidClasses.forEach(item => {
    const className = item.className;
    const components = item.components;
    const count = item.count;
    
    // Пропускаем уже обработанные классы
    if (isInMapping(className)) {
        return;
    }
    
    // Классифицируем по имени и контексту
    const name = className.toLowerCase();
    
    // Служебные классы
    if (name.match(/^(mb-|mt-|mr-|pd-|c-\d+)$/) || 
        ['active', 'disable-selection', 'default', 'high', 'low', 'grey-card', 'section'].includes(className) ||
        name.includes('mgts') || name.includes('disable')) {
        classified.utility.push(item);
        return;
    }
    
    // Структурные классы
    if (name === 'section' || name.includes('container') || name.includes('wrapper') || 
        name.includes('row') || name.includes('column') || name.includes('box')) {
        // Но только если они не являются частью конкретного компонента
        if (components.length === 0 || components.includes('section-text') || components.includes('section-cards')) {
            classified.structural.push(item);
            return;
        }
    }
    
    // Анализируем контекст использования
    const example = item.examples[0];
    if (!example) {
        classified.unknown.push(item);
        return;
    }
    
    // Определяем, можно ли добавить в существующий компонент
    let canMap = false;
    let suggestedTarget = null;
    let suggestedMapping = null;
    
    // Анализ по имени и контексту
    if (name.includes('file-') && !name.includes('files-table')) {
        // Файловые классы - должны быть в files-table
        canMap = true;
        suggestedTarget = 'files-table';
        suggestedMapping = generateMapping(className, 'files-table', example);
    } else if ((name.includes('card-') || name.includes('advantage')) && !name.includes('section-cards') && !name.includes('crm-cards')) {
        // Карточки - должны быть в section-cards
        canMap = true;
        suggestedTarget = 'section-cards';
        suggestedMapping = generateMapping(className, 'section-cards', example);
    } else if (name.includes('tariff-') && !name.includes('service-tariffs') && !name.includes('tariff-table')) {
        // Тарифы - должны быть в service-tariffs или tariff-table
        canMap = true;
        suggestedTarget = name.includes('table') ? 'tariff-table' : 'service-tariffs';
        suggestedMapping = generateMapping(className, suggestedTarget, example);
    } else if (name.includes('accordion-') || name.includes('faq-')) {
        // FAQ - должны быть в service-faq
        canMap = true;
        suggestedTarget = 'service-faq';
        suggestedMapping = generateMapping(className, 'service-faq', example);
    } else if (name.includes('form-') || name.includes('request-') || name.includes('input-') || name.includes('feedback-')) {
        // Формы - должны быть в service-order-form
        canMap = true;
        suggestedTarget = 'service-order-form';
        suggestedMapping = generateMapping(className, 'service-order-form', example);
    } else if (name.includes('history-') || name.includes('timeline-') || name.includes('data-')) {
        // История - должны быть в history-timeline
        canMap = true;
        suggestedTarget = 'history-timeline';
        suggestedMapping = generateMapping(className, 'history-timeline', example);
    } else if (name.includes('crm-') && !name.includes('crm-cards')) {
        // CRM - должны быть в crm-cards
        canMap = true;
        suggestedTarget = 'crm-cards';
        suggestedMapping = generateMapping(className, 'crm-cards', example);
    } else if (name.includes('mobile-app-') || name.includes('app-') || name.includes('slider')) {
        // Мобильное приложение - должны быть в mobile-app-section
        canMap = true;
        suggestedTarget = 'mobile-app-section';
        suggestedMapping = generateMapping(className, 'mobile-app-section', example);
    } else if (name.includes('map-') || name.includes('addresses-') || name.includes('objects-')) {
        // Карты - должны быть в section-map
        canMap = true;
        suggestedTarget = 'section-map';
        suggestedMapping = generateMapping(className, 'section-map', example);
    } else if (name.includes('title-') || name.includes('h1-') || name.includes('h2-') || name.includes('h3-')) {
        // Заголовки - зависят от контекста
        if (components.length > 0) {
            canMap = true;
            suggestedTarget = components[0];
            suggestedMapping = generateMapping(className, suggestedTarget, example);
        }
    } else if (name.includes('p1-') || name.includes('p2-') || name.includes('p3-') || name.includes('text-')) {
        // Параграфы - зависят от контекста
        if (components.length > 0) {
            canMap = true;
            suggestedTarget = components[0];
            suggestedMapping = generateMapping(className, suggestedTarget, example);
        }
    } else if (name.includes('link-') || name.includes('href')) {
        // Ссылки - зависят от контекста
        if (components.length > 0) {
            canMap = true;
            suggestedTarget = components[0];
            suggestedMapping = generateMapping(className, suggestedTarget, example);
        }
    } else if (name.includes('button') || name.includes('btn')) {
        // Кнопки - зависят от контекста
        if (components.length > 0) {
            canMap = true;
            suggestedTarget = components[0];
            suggestedMapping = generateMapping(className, suggestedTarget, example);
        }
    } else if (name.includes('image') || name.includes('img') || name.includes('photo')) {
        // Изображения - зависят от контекста
        if (components.length > 0) {
            canMap = true;
            suggestedTarget = components[0];
            suggestedMapping = generateMapping(className, suggestedTarget, example);
        }
    }
    
    if (canMap && suggestedTarget && suggestedMapping) {
        classified.mappableToExisting.push({
            ...item,
            suggestedTarget,
            suggestedMapping
        });
    } else {
        // Требует нового компонента или дополнительного анализа
        const suggestedNewComponent = suggestNewComponent(className, example, components);
        classified.needNewComponent.push({
            ...item,
            suggestedNewComponent
        });
    }
});

// Генерируем маппинг для класса
function generateMapping(className, targetComponent, example) {
    const componentPrefix = targetComponent;
    const name = className.toLowerCase();
    
    // Определяем тип элемента по имени
    if (name.includes('title') || name.includes('header') || name.includes('h1') || name.includes('h2') || name.includes('h3')) {
        return `${componentPrefix}__title`;
    } else if (name.includes('text') || name.includes('content') || name.includes('description') || name.includes('p1') || name.includes('p2') || name.includes('p3')) {
        return `${componentPrefix}__content`;
    } else if (name.includes('item')) {
        return `${componentPrefix}__item`;
    } else if (name.includes('container') || name.includes('wrapper') || name.includes('box')) {
        return `${componentPrefix}__container`;
    } else if (name.includes('image') || name.includes('img')) {
        return `${componentPrefix}__image`;
    } else if (name.includes('button') || name.includes('btn')) {
        return `${componentPrefix}__button`;
    } else if (name.includes('link')) {
        return `${componentPrefix}__link`;
    } else if (name.includes('icon')) {
        return `${componentPrefix}__icon`;
    } else if (name.includes('list')) {
        return `${componentPrefix}__list`;
    } else if (name.includes('row')) {
        return `${componentPrefix}__row`;
    } else if (name.includes('column')) {
        return `${componentPrefix}__column`;
    } else {
        // Общий случай - используем имя класса с префиксом компонента
        const cleanName = className.replace(/^[^_]+__?/, '').replace(/--.*$/, '');
        if (cleanName && cleanName !== className) {
            return `${componentPrefix}__${cleanName}`;
        } else {
            // Используем последнюю часть имени класса
            const parts = className.split('-');
            const lastPart = parts[parts.length - 1];
            return `${componentPrefix}__${lastPart}`;
        }
    }
}

// Предлагаем новый компонент
function suggestNewComponent(className, example, components) {
    const name = className.toLowerCase();
    
    // Анализируем класс и предлагаем новый компонент
    if (name.includes('addresses-') || name.includes('objects-map') || name.includes('realized-objects')) {
        return 'section-map';
    } else if (name.includes('carousel') || name.includes('slider') || name.includes('call-management')) {
        return 'image-carousel';
    } else if (name.includes('switcher') || name.includes('switch') || name.includes('mobile-app-slider')) {
        return 'image-switcher';
    } else if (name.includes('how-to-connect') || name.includes('подключ') || name.includes('admission-work')) {
        return 'how-to-connect';
    } else if (name.includes('ceo-message') || name.includes('message-content')) {
        return 'section-text'; // Можно использовать section-text
    } else if (name.includes('breadcrumb') || name.includes('bread-crumb')) {
        return null; // Навигационные элементы, не нужен отдельный компонент
    } else if (name.includes('sidebar') || name.includes('menu')) {
        return null; // Навигационные элементы
    } else if (name.includes('footer') || name.includes('header')) {
        return null; // Общие элементы
    }
    
    return null;
}

// Формируем результат
const result = {
    summary: {
        totalInvalidClasses: analysis.summary.invalidClasses,
        mappableToExisting: classified.mappableToExisting.length,
        needNewComponent: classified.needNewComponent.length,
        utility: classified.utility.length,
        structural: classified.structural.length,
        unknown: classified.unknown.length
    },
    mappableToExisting: classified.mappableToExisting.sort((a, b) => b.count - a.count),
    needNewComponent: classified.needNewComponent.sort((a, b) => b.count - a.count),
    utility: classified.utility.sort((a, b) => b.count - a.count),
    structural: classified.structural.sort((a, b) => b.count - a.count),
    unknown: classified.unknown.sort((a, b) => b.count - a.count)
};

// Сохраняем результат
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
console.log(`✅ Результаты сохранены в: ${OUTPUT_FILE}\n`);

// Генерируем отчет
let report = `# Анализ оставшихся нецелевых классов\n\n`;
report += `**Дата:** ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Сводка\n\n`;
report += `- **Всего нецелевых классов:** ${result.summary.totalInvalidClasses}\n`;
report += `- **Можно добавить в существующие компоненты:** ${result.summary.mappableToExisting}\n`;
report += `- **Требуют новых компонентов:** ${result.summary.needNewComponent}\n`;
report += `- **Служебные классы:** ${result.summary.utility}\n`;
report += `- **Структурные классы:** ${result.summary.structural}\n`;
report += `- **Неопределенные:** ${result.summary.unknown}\n\n`;

// Группируем mappableToExisting по компонентам
const mappableByComponent = {};
result.mappableToExisting.forEach(item => {
    if (!mappableByComponent[item.suggestedTarget]) {
        mappableByComponent[item.suggestedTarget] = [];
    }
    mappableByComponent[item.suggestedTarget].push(item);
});

report += `## Классы, которые можно добавить в существующие компоненты\n\n`;
report += `Всего: **${result.summary.mappableToExisting}** классов\n\n`;

Object.keys(mappableByComponent).sort().forEach(component => {
    const items = mappableByComponent[component];
    report += `### ${component}\n\n`;
    report += `**Всего классов:** ${items.length}\n\n`;
    
    items.forEach(item => {
        report += `- \`${item.className}\` → \`${item.suggestedMapping}\` (${item.count} раз в ${item.totalFiles} файлах)\n`;
    });
    report += `\n`;
});

report += `## Классы, требующие новых компонентов\n\n`;
report += `Всего: **${result.summary.needNewComponent}** классов\n\n`;

// Группируем по предложенным компонентам
const needNewByComponent = {};
result.needNewComponent.forEach(item => {
    const component = item.suggestedNewComponent || 'unknown';
    if (!needNewByComponent[component]) {
        needNewByComponent[component] = [];
    }
    needNewByComponent[component].push(item);
});

Object.keys(needNewByComponent).sort().forEach(component => {
    const items = needNewByComponent[component];
    report += `### ${component === 'unknown' ? 'Неопределенные (требуют ручного анализа)' : `Предлагаемый компонент: ${component}`}\n\n`;
    report += `**Всего классов:** ${items.length}\n\n`;
    
    items.slice(0, 30).forEach(item => {
        report += `- \`${item.className}\` (${item.count} раз в ${item.totalFiles} файлах)\n`;
        if (item.components.length > 0) {
            report += `  - Используется в: ${item.components.join(', ')}\n`;
        }
    });
    
    if (items.length > 30) {
        report += `\n*... и еще ${items.length - 30} классов*\n`;
    }
    report += `\n`;
});

report += `## Служебные классы\n\n`;
report += `Всего: **${result.summary.utility}** классов\n\n`;
report += `Эти классы можно оставить как есть или удалить, так как они являются служебными.\n\n`;

result.utility.slice(0, 20).forEach(item => {
    report += `- \`${item.className}\` (${item.count} раз)\n`;
});

if (result.utility.length > 20) {
    report += `\n*... и еще ${result.utility.length - 20} классов*\n`;
}

report += `\n## Структурные классы\n\n`;
report += `Всего: **${result.summary.structural}** классов\n\n`;
report += `Эти классы являются частью структуры и могут быть преобразованы в целевые классы компонентов.\n\n`;

result.structural.slice(0, 20).forEach(item => {
    report += `- \`${item.className}\` (${item.count} раз в ${item.totalFiles} файлах)\n`;
    if (item.components.length > 0) {
        report += `  - Используется в: ${item.components.join(', ')}\n`;
    }
});

if (result.structural.length > 20) {
    report += `\n*... и еще ${result.structural.length - 20} классов*\n`;
}

fs.writeFileSync(REPORT_FILE, report, 'utf-8');
console.log(`✅ Отчет сохранен в: ${REPORT_FILE}\n`);

console.log('📊 Статистика:');
console.log(`   Всего нецелевых классов: ${result.summary.totalInvalidClasses}`);
console.log(`   Можно добавить в существующие: ${result.summary.mappableToExisting}`);
console.log(`   Требуют новых компонентов: ${result.summary.needNewComponent}`);
console.log(`   Служебные: ${result.summary.utility}`);
console.log(`   Структурные: ${result.summary.structural}`);
console.log(`   Неопределенные: ${result.summary.unknown}`);
