const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const NORMALIZED_SPLIT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized-split');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/all-invalid-classes-analysis.json');
const REPORT_FILE = path.join(__dirname, '../../docs/ALL_INVALID_CLASSES_ANALYSIS.md');

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

// Служебные классы, которые можно игнорировать
const IGNORE_CLASSES = [
    'container-mgts', 'mb-default', 'mb-32', 'mb-56', 'mt-56', 'mr-bottom', 'mb-24', 'mb-80', 'mb-120', 'mt-32', 'mt-80',
    'c-4', 'c-6', 'c-2', 'c-3', 'c-5', 'c-7', 'c-8', 'c-11',
    'disable-selection', 'active',
    'default', 'high', 'low', 'size-L', 'size-M', 'size-S', 'size-XL',
    'primary', 'secondary', 'white', 'gray', 'vertical', 'scroll', 'align-top',
    'blur', 'card-1', 'card-2', 'base-style', 'card',
    'btn-primary', 'btn-secondary', 'btn-size-L', 'btn-size-M', 'btn-size-XL',
    'default-button', 'full-width', 'full-container', 'limited-container'
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
           (className.startsWith('mr') && className.length <= 10) ||
           (className.startsWith('pd') && className.length <= 10) ||
           (className.startsWith('mb-') && /^\d+$/.test(className.substring(3))) ||
           (className.startsWith('mt-') && /^\d+$/.test(className.substring(3))) ||
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

function analyzeFile(filePath, sourceDir) {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // Проверяем normalizedHTML, а не весь JSON
        const html = data.normalizedHTML || '';
        
        if (!html) {
            console.warn(`⚠️  Файл ${path.basename(filePath)} не содержит normalizedHTML`);
            return;
        }
        
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        // Анализируем все элементы
        const allElementsInDoc = doc.querySelectorAll('*');
        
        allElementsInDoc.forEach(element => {
            const tagName = element.tagName.toLowerCase();
            const classes = Array.from(element.classList);
            const parentComponent = findParentComponent(element);
            
            classes.forEach(className => {
                if (isIgnoreClass(className) || isExternalClass(className)) {
                    return;
                }
                
                // Проверяем, является ли класс целевым
                if (!isTargetClass(className)) {
                    const key = className;
                    if (!invalidClasses.has(key)) {
                        invalidClasses.set(key, {
                            count: 0,
                            elements: new Set(),
                            components: new Set(),
                            files: new Set(),
                            examples: []
                        });
                    }
                    const info = invalidClasses.get(key);
                    info.count++;
                    info.elements.add(tagName);
                    if (parentComponent) {
                        info.components.add(parentComponent);
                    }
                    info.files.add(path.basename(filePath));
                    if (info.examples.length < 5) {
                        const context = element.outerHTML.substring(0, 300);
                        info.examples.push({
                            element: tagName,
                            component: parentComponent || 'none',
                            file: path.basename(filePath),
                            sourceDir: path.basename(sourceDir),
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

// Собираем все нецелевые классы
const invalidClasses = new Map();

// Анализируем файлы из pages-content-normalized
console.log('🔍 Анализ файлов из pages-content-normalized...\n');

const normalizedFiles = fs.existsSync(NORMALIZED_DIR) 
    ? fs.readdirSync(NORMALIZED_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(NORMALIZED_DIR, f))
    : [];

console.log(`Найдено файлов в normalized: ${normalizedFiles.length}\n`);

normalizedFiles.forEach((file, index) => {
    if ((index + 1) % 10 === 0) {
        process.stdout.write(`\rОбработано normalized: ${index + 1}/${normalizedFiles.length}`);
    }
    analyzeFile(file, NORMALIZED_DIR);
});

if (normalizedFiles.length > 0) {
    process.stdout.write(`\rОбработано normalized: ${normalizedFiles.length}/${normalizedFiles.length}\n\n`);
}

// Анализируем файлы из pages-content-normalized-split
console.log('🔍 Анализ файлов из pages-content-normalized-split...\n');

const splitFiles = fs.existsSync(NORMALIZED_SPLIT_DIR)
    ? fs.readdirSync(NORMALIZED_SPLIT_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(NORMALIZED_SPLIT_DIR, f))
    : [];

console.log(`Найдено файлов в normalized-split: ${splitFiles.length}\n`);

splitFiles.forEach((file, index) => {
    if ((index + 1) % 10 === 0) {
        process.stdout.write(`\rОбработано normalized-split: ${index + 1}/${splitFiles.length}`);
    }
    analyzeFile(file, NORMALIZED_SPLIT_DIR);
});

if (splitFiles.length > 0) {
    process.stdout.write(`\rОбработано normalized-split: ${splitFiles.length}/${splitFiles.length}\n\n`);
}

// Сортируем результаты
const sortedInvalidClasses = Array.from(invalidClasses.entries())
    .sort((a, b) => b[1].count - a[1].count);

// Формируем результат
const result = {
    summary: {
        totalFiles: normalizedFiles.length + splitFiles.length,
        normalizedFiles: normalizedFiles.length,
        splitFiles: splitFiles.length,
        invalidClasses: invalidClasses.size
    },
    invalidClasses: sortedInvalidClasses.map(([className, info]) => ({
        className,
        count: info.count,
        elements: Array.from(info.elements).sort(),
        components: Array.from(info.components).sort(),
        files: Array.from(info.files).slice(0, 10), // Первые 10 файлов
        totalFiles: info.files.size,
        examples: info.examples
    }))
};

// Сохраняем JSON
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
console.log(`✅ Результаты сохранены в: ${OUTPUT_FILE}\n`);

// Генерируем отчет
let report = `# Анализ всех нецелевых классов\n\n`;
report += `**Дата:** ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Сводка\n\n`;
report += `- **Всего файлов:** ${result.summary.totalFiles}\n`;
report += `  - В \`pages-content-normalized\`: ${result.summary.normalizedFiles}\n`;
report += `  - В \`pages-content-normalized-split\`: ${result.summary.splitFiles}\n`;
report += `- **Нецелевых классов:** ${result.summary.invalidClasses}\n\n`;

report += `## Все нецелевые классы\n\n`;
report += `Всего найдено **${result.summary.invalidClasses}** нецелевых классов.\n\n`;

// Группируем по компонентам
const invalidByComponent = {};
result.invalidClasses.forEach(item => {
    if (item.components.length > 0) {
        item.components.forEach(component => {
            if (!invalidByComponent[component]) {
                invalidByComponent[component] = [];
            }
            invalidByComponent[component].push(item);
        });
    } else {
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
    
    items.forEach(item => {
        report += `- **\`${item.className}\`** (встречается ${item.count} раз в ${item.totalFiles} файлах)\n`;
        report += `  - Элементы: ${item.elements.join(', ')}\n`;
        if (item.components.length > 0) {
            report += `  - Компоненты: ${item.components.join(', ')}\n`;
        }
        if (item.examples.length > 0) {
            const example = item.examples[0];
            report += `  - Пример: \`<${example.element}>\` в \`${example.component}\` (файл: ${example.file}, источник: ${example.sourceDir})\n`;
        }
        report += `\n`;
    });
});

fs.writeFileSync(REPORT_FILE, report, 'utf-8');
console.log(`✅ Отчет сохранен в: ${REPORT_FILE}\n`);

console.log('📊 Статистика:');
console.log(`   Всего файлов: ${result.summary.totalFiles}`);
console.log(`   Нецелевых классов: ${result.summary.invalidClasses}`);
console.log(`   Топ-20 нецелевых классов:`);
result.invalidClasses.slice(0, 20).forEach(item => {
    console.log(`   - ${item.className} (${item.count} раз в ${item.totalFiles} файлах)`);
});
