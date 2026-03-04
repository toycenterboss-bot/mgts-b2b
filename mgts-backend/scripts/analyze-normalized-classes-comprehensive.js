const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/comprehensive-classes-analysis.json');
const REPORT_FILE = path.join(__dirname, '../../docs/COMPREHENSIVE_CLASSES_ANALYSIS.md');

// Загружаем маппинг из скрипта нормализации
const normalizeScript = fs.readFileSync(path.join(__dirname, 'normalize-html-structure.js'), 'utf-8');
const INTERNAL_CLASSES_MAPPING = {};

// Извлекаем INTERNAL_CLASSES_MAPPING из скрипта
const mappingMatch = normalizeScript.match(/const INTERNAL_CLASSES_MAPPING = \{([\s\S]*?)\};/);
if (mappingMatch) {
    try {
        // Пытаемся извлечь объект маппинга
        const mappingStr = 'const INTERNAL_CLASSES_MAPPING = ' + mappingMatch[0].replace('const INTERNAL_CLASSES_MAPPING = ', '');
        eval(mappingStr);
    } catch (e) {
        console.error('Ошибка при извлечении маппинга:', e.message);
    }
}

// Целевые компоненты
const TARGET_COMPONENTS = [
    'section-text',
    'section-cards',
    'section-map',
    'section-grid',
    'section-table',
    'service-tariffs',
    'service-faq',
    'service-order-form',
    'hero',
    'history-timeline',
    'how-to-connect',
    'image-carousel',
    'image-switcher',
    'crm-cards',
    'mobile-app-section',
    'files-table',
    'tariff-table'
];

// Собираем все классы и элементы
const allClasses = new Set();
const allElements = new Set();
const classesByElement = new Map();
const classesByComponent = new Map();
const invalidClasses = new Map(); // классы, которые не соответствуют целевым

// Служебные классы, которые можно игнорировать
const IGNORE_CLASSES = [
    'container-mgts', 'mb-default', 'mb-32', 'mb-56', 'mt-56', 'mr-bottom',
    'c-4', 'c-6', 'disable-selection', 'active',
    'default', 'high', 'low', 'size-L', 'size-M', 'size-S', 'size-XL',
    'primary', 'secondary', 'white', 'gray', 'vertical', 'scroll', 'align-top',
    'blur', 'card-1', 'card-2', 'base-style', 'card'
];

// Классы внешних библиотек
const EXTERNAL_CLASSES = [
    'ymaps3x0--', 'Logo_svg__', '__cls-'
];

function isExternalClass(className) {
    return EXTERNAL_CLASSES.some(prefix => className.startsWith(prefix));
}

function isIgnoreClass(className) {
    return IGNORE_CLASSES.includes(className) || 
           className.includes('mgts') || 
           className.includes('disable') || 
           className.includes('mr') || 
           className.includes('pd') ||
           /^\d+$/.test(className);
}

function isTargetClass(className) {
    // Проверяем, является ли класс целевым (начинается с имени компонента)
    return TARGET_COMPONENTS.some(component => 
        className.startsWith(component + '__') || 
        className.startsWith(component + '--')
    );
}

function findParentComponent(element) {
    let parent = element.parentElement;
    while (parent) {
        if (parent.tagName === 'SECTION' && parent.className) {
            const sectionClass = parent.className.split(' ')[0];
            if (TARGET_COMPONENTS.includes(sectionClass)) {
                return sectionClass;
            }
        }
        parent = parent.parentElement;
    }
    return null;
}

function analyzeFile(filePath) {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const html = data.normalizedHTML || '';
        
        if (!html) return;
        
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        // Анализируем все элементы
        const allElementsInDoc = doc.querySelectorAll('*');
        
        allElementsInDoc.forEach(element => {
            const tagName = element.tagName.toLowerCase();
            allElements.add(tagName);
            
            const classes = Array.from(element.classList);
            const parentComponent = findParentComponent(element);
            
            classes.forEach(className => {
                if (isIgnoreClass(className) || isExternalClass(className)) {
                    return;
                }
                
                allClasses.add(className);
                
                // Группируем по элементам
                if (!classesByElement.has(tagName)) {
                    classesByElement.set(tagName, new Set());
                }
                classesByElement.get(tagName).add(className);
                
                // Группируем по компонентам
                if (parentComponent) {
                    if (!classesByComponent.has(parentComponent)) {
                        classesByComponent.set(parentComponent, new Set());
                    }
                    classesByComponent.get(parentComponent).add(className);
                }
                
                // Проверяем, является ли класс целевым
                if (!isTargetClass(className)) {
                    if (!invalidClasses.has(className)) {
                        invalidClasses.set(className, {
                            count: 0,
                            elements: new Set(),
                            components: new Set(),
                            examples: []
                        });
                    }
                    const info = invalidClasses.get(className);
                    info.count++;
                    info.elements.add(tagName);
                    if (parentComponent) {
                        info.components.add(parentComponent);
                    }
                    if (info.examples.length < 3) {
                        const context = element.outerHTML.substring(0, 200);
                        info.examples.push({
                            element: tagName,
                            component: parentComponent || 'none',
                            context: context
                        });
                    }
                }
            });
        });
    } catch (error) {
        console.error(`Ошибка при анализе ${filePath}:`, error.message);
    }
}

// Анализируем все файлы
console.log('🔍 Анализ всех нормализованных HTML файлов...\n');

const files = fs.readdirSync(NORMALIZED_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(NORMALIZED_DIR, f));

console.log(`Найдено файлов: ${files.length}\n`);

files.forEach((file, index) => {
    if ((index + 1) % 10 === 0) {
        process.stdout.write(`\rОбработано: ${index + 1}/${files.length}`);
    }
    analyzeFile(file);
});

process.stdout.write(`\rОбработано: ${files.length}/${files.length}\n\n`);

// Сортируем результаты
const sortedInvalidClasses = Array.from(invalidClasses.entries())
    .sort((a, b) => b[1].count - a[1].count);

// Формируем результат
const result = {
    summary: {
        totalFiles: files.length,
        totalClasses: allClasses.size,
        totalElements: allElements.size,
        invalidClasses: invalidClasses.size,
        targetComponents: TARGET_COMPONENTS.length
    },
    classesByElement: Object.fromEntries(
        Array.from(classesByElement.entries()).map(([tag, classes]) => [
            tag,
            Array.from(classes).sort()
        ])
    ),
    classesByComponent: Object.fromEntries(
        Array.from(classesByComponent.entries()).map(([component, classes]) => [
            component,
            Array.from(classes).sort()
        ])
    ),
    invalidClasses: sortedInvalidClasses.map(([className, info]) => ({
        className,
        count: info.count,
        elements: Array.from(info.elements),
        components: Array.from(info.components),
        examples: info.examples
    }))
};

// Сохраняем JSON
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
console.log(`✅ Результаты сохранены в: ${OUTPUT_FILE}\n`);

// Генерируем отчет
let report = `# Комплексный анализ классов в нормализованном HTML\n\n`;
report += `**Дата:** ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Сводка\n\n`;
report += `- **Всего файлов:** ${result.summary.totalFiles}\n`;
report += `- **Всего уникальных классов:** ${result.summary.totalClasses}\n`;
report += `- **Всего уникальных элементов:** ${result.summary.totalElements}\n`;
report += `- **Нецелевых классов:** ${result.summary.invalidClasses}\n`;
report += `- **Целевых компонентов:** ${result.summary.targetComponents}\n\n`;

report += `## Нецелевые классы (требуют преобразования)\n\n`;
report += `Всего найдено **${result.summary.invalidClasses}** нецелевых классов.\n\n`;

// Группируем по компонентам
const invalidByComponent = {};
result.invalidClasses.forEach(item => {
    item.components.forEach(component => {
        if (!invalidByComponent[component]) {
            invalidByComponent[component] = [];
        }
        invalidByComponent[component].push(item);
    });
    if (item.components.length === 0) {
        if (!invalidByComponent['none']) {
            invalidByComponent['none'] = [];
        }
        invalidByComponent['none'].push(item);
    }
});

Object.keys(invalidByComponent).sort().forEach(component => {
    const items = invalidByComponent[component];
    report += `### ${component === 'none' ? 'Без родительского компонента' : `Компонент: ${component}`}\n\n`;
    report += `**Всего классов:** ${items.length}\n\n`;
    
    items.slice(0, 20).forEach(item => {
        report += `- **\`${item.className}\`** (встречается ${item.count} раз)\n`;
        report += `  - Элементы: ${item.elements.join(', ')}\n`;
        if (item.components.length > 0) {
            report += `  - Компоненты: ${item.components.join(', ')}\n`;
        }
        if (item.examples.length > 0) {
            report += `  - Пример: \`${item.examples[0].element}\` в \`${item.examples[0].component}\`\n`;
        }
        report += `\n`;
    });
    
    if (items.length > 20) {
        report += `*... и еще ${items.length - 20} классов*\n\n`;
    }
});

report += `## Классы по элементам\n\n`;
Object.keys(result.classesByElement).sort().forEach(tag => {
    const classes = result.classesByElement[tag];
    if (classes.length > 0) {
        report += `### \`<${tag}>\`\n\n`;
        report += `Всего классов: ${classes.length}\n\n`;
        classes.slice(0, 10).forEach(className => {
            const isTarget = isTargetClass(className);
            report += `- ${isTarget ? '✅' : '❌'} \`${className}\`\n`;
        });
        if (classes.length > 10) {
            report += `\n*... и еще ${classes.length - 10} классов*\n`;
        }
        report += `\n`;
    }
});

fs.writeFileSync(REPORT_FILE, report, 'utf-8');
console.log(`✅ Отчет сохранен в: ${REPORT_FILE}\n`);

console.log('📊 Статистика:');
console.log(`   Всего классов: ${result.summary.totalClasses}`);
console.log(`   Нецелевых классов: ${result.summary.invalidClasses}`);
console.log(`   Топ-10 нецелевых классов:`);
result.invalidClasses.slice(0, 10).forEach(item => {
    console.log(`   - ${item.className} (${item.count} раз)`);
});
