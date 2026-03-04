const fs = require('fs');
const path = require('path');

const REMAINING_ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-classes-analysis.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/final-class-mapping.json');
const REPORT_FILE = path.join(__dirname, '../../docs/FINAL_CLASS_MAPPING_PROPOSAL.md');

// Загружаем анализ
const analysis = JSON.parse(fs.readFileSync(REMAINING_ANALYSIS_FILE, 'utf-8'));

// Формируем финальный маппинг для всех классов, которые можно добавить
const finalMapping = {};

// Добавляем маппинги для классов, которые можно добавить в существующие компоненты
analysis.mappableToExisting.forEach(item => {
    if (!finalMapping[item.suggestedTarget]) {
        finalMapping[item.suggestedTarget] = {};
    }
    finalMapping[item.suggestedTarget][item.className] = item.suggestedMapping;
});

// Обрабатываем структурные классы
analysis.structural.forEach(item => {
    const className = item.className;
    const components = item.components;
    
    // Определяем целевой компонент на основе контекста
    let targetComponent = null;
    if (components.length > 0) {
        targetComponent = components[0];
    } else {
        // По умолчанию - section-text
        targetComponent = 'section-text';
    }
    
    if (!finalMapping[targetComponent]) {
        finalMapping[targetComponent] = {};
    }
    
    // Генерируем маппинг для структурного класса
    const name = className.toLowerCase();
    let mapping = null;
    
    if (name.includes('container') || name.includes('wrapper')) {
        mapping = `${targetComponent}__container`;
    } else if (name.includes('row')) {
        mapping = `${targetComponent}__row`;
    } else if (name.includes('column')) {
        mapping = `${targetComponent}__column`;
    } else if (name.includes('box')) {
        mapping = `${targetComponent}__box`;
    } else if (name === 'section') {
        // Класс 'section' сам по себе - не преобразуем
        return;
    } else {
        mapping = `${targetComponent}__${className.replace(/^[^_]+__?/, '')}`;
    }
    
    if (mapping) {
        finalMapping[targetComponent][className] = mapping;
    }
});

// Сохраняем финальный маппинг
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalMapping, null, 2), 'utf-8');
console.log(`✅ Финальный маппинг сохранен в: ${OUTPUT_FILE}\n`);

// Генерируем отчет
let report = `# Финальное предложение по маппингу классов\n\n`;
report += `**Дата:** ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Сводка\n\n`;
report += `- **Всего нецелевых классов:** ${analysis.summary.totalInvalidClasses}\n`;
report += `- **Можно добавить в существующие:** ${analysis.summary.mappableToExisting}\n`;
report += `- **Структурные классы:** ${analysis.summary.structural}\n`;
report += `- **Требуют новых компонентов:** ${analysis.summary.needNewComponent}\n`;
report += `- **Служебные:** ${analysis.summary.utility}\n\n`;

report += `## Маппинг для добавления в существующие компоненты\n\n`;

Object.keys(finalMapping).sort().forEach(component => {
    const mappings = finalMapping[component];
    report += `### ${component}\n\n`;
    report += `**Всего маппингов:** ${Object.keys(mappings).length}\n\n`;
    
    Object.keys(mappings).sort().forEach(oldClass => {
        report += `- \`${oldClass}\` → \`${mappings[oldClass]}\`\n`;
    });
    report += `\n`;
});

report += `## Классы, требующие новых компонентов или дополнительного анализа\n\n`;
report += `Всего: **${analysis.summary.needNewComponent}** классов\n\n`;

// Группируем по категориям
const needNewByCategory = {
    'files-table': [],
    'section-cards': [],
    'section-text': [],
    'service-tariffs': [],
    'service-faq': [],
    'service-order-form': [],
    'breadcrumbs': [],
    'lists': [],
    'other': []
};

analysis.needNewComponent.forEach(item => {
    const name = item.className.toLowerCase();
    if (name.includes('file-') || name.includes('files-list')) {
        needNewByCategory['files-table'].push(item);
    } else if (name.includes('card-') || name.includes('all-services-card')) {
        needNewByCategory['section-cards'].push(item);
    } else if (name.includes('breadcrumb') || name.includes('bread-crumb')) {
        needNewByCategory['breadcrumbs'].push(item);
    } else if (name.includes('list') || name.includes('unordered')) {
        needNewByCategory['lists'].push(item);
    } else if (name.includes('service-row') || name.includes('tariff')) {
        needNewByCategory['service-tariffs'].push(item);
    } else if (name.includes('accordion')) {
        needNewByCategory['service-faq'].push(item);
    } else if (name.includes('form') || name.includes('input') || name.includes('radio')) {
        needNewByCategory['service-order-form'].push(item);
    } else if (name.includes('text') || name.includes('content') || name.includes('section-text')) {
        needNewByCategory['section-text'].push(item);
    } else {
        needNewByCategory['other'].push(item);
    }
});

Object.keys(needNewByCategory).sort().forEach(category => {
    const items = needNewByCategory[category];
    if (items.length === 0) return;
    
    report += `### ${category}\n\n`;
    report += `**Всего классов:** ${items.length}\n\n`;
    
    items.slice(0, 20).forEach(item => {
        report += `- \`${item.className}\` (${item.count} раз в ${item.totalFiles} файлах)\n`;
        if (item.components.length > 0) {
            report += `  - Используется в: ${item.components.join(', ')}\n`;
        }
        if (item.suggestedNewComponent) {
            report += `  - Предлагаемый компонент: \`${item.suggestedNewComponent}\`\n`;
        }
    });
    
    if (items.length > 20) {
        report += `\n*... и еще ${items.length - 20} классов*\n`;
    }
    report += `\n`;
});

fs.writeFileSync(REPORT_FILE, report, 'utf-8');
console.log(`✅ Отчет сохранен в: ${REPORT_FILE}\n`);

console.log('📊 Статистика финального маппинга:');
console.log(`   Компонентов с маппингами: ${Object.keys(finalMapping).length}`);
let totalMappings = 0;
Object.values(finalMapping).forEach(m => {
    totalMappings += Object.keys(m).length;
});
console.log(`   Всего маппингов: ${totalMappings}`);
