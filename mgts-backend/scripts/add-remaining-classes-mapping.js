const fs = require('fs');
const path = require('path');

const REMAINING_ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-classes-analysis.json');
const NORMALIZE_SCRIPT = path.join(__dirname, 'normalize-html-structure.js');

// Загружаем анализ
const analysis = JSON.parse(fs.readFileSync(REMAINING_ANALYSIS_FILE, 'utf-8'));

// Читаем скрипт нормализации
let normalizeScript = fs.readFileSync(NORMALIZE_SCRIPT, 'utf-8');

// Обрабатываем классы, которые требуют новых компонентов или специальной обработки
const specialClasses = {
    // Классы, которые являются самими компонентами (не нужно преобразовывать)
    componentNames: ['section-text', 'section-cards', 'service-order-form', 'section'],
    
    // Классы, которые нужно преобразовать в зависимости от контекста
    contextDependent: {
        'circle-icon': {
            'section-cards': 'section-cards__card-icon',
            'section-text': 'section-text__icon',
            'service-faq': 'service-faq__icon',
        },
        'big-circle': {
            'section-cards': 'section-cards__card-icon--big',
        },
        'service-row-item': {
            'service-tariffs': 'service-tariffs__tariff-feature',
        },
        'service-row-item__text': {
            'service-tariffs': 'service-tariffs__tariff-feature-label',
        },
        'service-row-item__info-box': {
            'service-tariffs': 'service-tariffs__tariff-feature-value',
        },
        'all-services-card': {
            'section-cards': 'section-cards__card',
        },
        'all-services-card__chevron': {
            'section-cards': 'section-cards__card-chevron',
        },
        'files-list': {
            'files-table': 'files-table__container',
            'section-text': 'files-table__container',
            'service-faq': 'files-table__container',
            'service-order-form': 'files-table__container',
        },
        'bread-crumb-item': {
            'section-text': 'section-text__breadcrumb-item',
        },
        'bread-crumb-item__text': {
            'section-text': 'section-text__breadcrumb-link',
        },
        'bread-crumb-item__chevron': {
            'section-text': 'section-text__breadcrumb-icon',
        },
        'modified-unordered-list': {
            'section-cards': 'section-cards__list',
            'section-text': 'section-text__list',
        },
        'tag-size-L': {
            'section-text': 'section-text__tag--large',
        },
        'type-size-M': {
            'section-text': 'section-text__content--medium',
        },
        'content-text': {
            'section-text': 'section-text__content',
            'section-cards': 'section-cards__card-text',
        },
        'radio-item': {
            'section-text': 'section-text__radio-item',
        },
        'radio-size-M': {
            'section-text': 'section-text__radio--medium',
        },
        'radio-item__input': {
            'section-text': 'section-text__radio-input',
        },
        'radio-item__label': {
            'section-text': 'section-text__radio-label',
        },
        'white-card': {
            'section-cards': 'section-cards__card--white',
        },
        'check-box': {
            'service-order-form': 'service-order-form__checkbox',
        },
        'check-box__input': {
            'service-order-form': 'service-order-form__checkbox-input',
        },
        'check-box__style': {
            'service-order-form': 'service-order-form__checkbox-style',
        },
        'check-box__text': {
            'service-order-form': 'service-order-form__checkbox-label',
        },
    }
};

// Формируем маппинг для контекстно-зависимых классов
const contextMapping = {};

Object.keys(specialClasses.contextDependent).forEach(className => {
    const mappings = specialClasses.contextDependent[className];
    Object.keys(mappings).forEach(component => {
        if (!contextMapping[component]) {
            contextMapping[component] = {};
        }
        contextMapping[component][className] = mappings[component];
    });
});

// Сохраняем маппинг
const outputFile = path.join(__dirname, '../../temp/services-extraction/context-dependent-mapping.json');
fs.writeFileSync(outputFile, JSON.stringify(contextMapping, null, 2), 'utf-8');
console.log(`✅ Контекстно-зависимый маппинг сохранен в: ${outputFile}\n`);

// Генерируем отчет
let report = `# Маппинг для контекстно-зависимых классов\n\n`;
report += `**Дата:** ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Сводка\n\n`;
report += `- **Контекстно-зависимых классов:** ${Object.keys(specialClasses.contextDependent).length}\n\n`;

report += `## Маппинг по компонентам\n\n`;

Object.keys(contextMapping).sort().forEach(component => {
    const mappings = contextMapping[component];
    report += `### ${component}\n\n`;
    
    Object.keys(mappings).sort().forEach(oldClass => {
        report += `- \`${oldClass}\` → \`${mappings[oldClass]}\`\n`;
    });
    report += `\n`;
});

const reportFile = path.join(__dirname, '../../docs/CONTEXT_DEPENDENT_MAPPING.md');
fs.writeFileSync(reportFile, report, 'utf-8');
console.log(`✅ Отчет сохранен в: ${reportFile}\n`);

console.log('📊 Статистика:');
console.log(`   Контекстно-зависимых классов: ${Object.keys(specialClasses.contextDependent).length}`);
let totalMappings = 0;
Object.values(contextMapping).forEach(m => {
    totalMappings += Object.keys(m).length;
});
console.log(`   Всего маппингов: ${totalMappings}`);
