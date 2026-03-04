const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-non-normalized-classes.json');

// Загружаем маппинг из normalize-html-structure.js
const { INTERNAL_CLASSES_MAPPING: MAPPING, TARGET_COMPONENTS: TARGETS } = require('./normalize-html-structure.js');
const INTERNAL_CLASSES_MAPPING = MAPPING || {};
const TARGET_COMPONENTS = TARGETS || [];

let CONTEXT_DEPENDENT_MAPPING = {};

// Загружаем CONTEXT_DEPENDENT_MAPPING
const contextMappingPath = path.join(__dirname, '../../temp/services-extraction/context-dependent-mapping.json');
if (fs.existsSync(contextMappingPath)) {
    CONTEXT_DEPENDENT_MAPPING = JSON.parse(fs.readFileSync(contextMappingPath, 'utf-8'));
}

// Целевые префиксы компонентов (извлекаем из TARGET_COMPONENTS)
const TARGET_COMPONENT_PREFIXES = TARGET_COMPONENTS.length > 0 
    ? TARGET_COMPONENTS.map(comp => comp.replace(/-/g, '-'))
    : [
        'section-',
        'service-',
        'hero',
        'history-',
        'how-to-',
        'image-',
        'crm-',
        'mobile-app-',
        'files-',
        'tariff-',
    ];

// Игнорируемые классы (служебные, внешние библиотеки)
const IGNORE_CLASSES = [
    'mgts',
    'disable',
    'mr',
    'pd',
    'active',
    'container-mgts',
    'ymaps3x0--',
    'Logo_svg__',
    '__cls-',
    'size-L',
    'size-M',
    'size-S',
    'size-XL',
    'primary',
    'secondary',
    'white',
    'gray',
    'vertical',
    'scroll',
    'align-top',
    'default',
    'high',
    'low',
    'width',
    'blur',
    'card-1',
    'card-2',
    'base-style',
    'card',
];

/**
 * Проверить, является ли класс целевым
 */
function isTargetClass(className) {
    // Проверяем, является ли класс одним из целевых компонентов
    if (TARGET_COMPONENTS.includes(className)) {
        return true;
    }
    
    // Проверяем префиксы компонентов
    if (TARGET_COMPONENTS.some(comp => className.startsWith(comp + '__') || className.startsWith(comp + '--'))) {
        return true;
    }
    
    // Проверяем старые префиксы
    if (TARGET_COMPONENT_PREFIXES.some(prefix => className.startsWith(prefix))) {
        return true;
    }
    
    // Проверяем, является ли это модификатором целевого класса
    if (className.includes('__') || className.includes('--')) {
        const baseClass = className.split('__')[0].split('--')[0];
        if (TARGET_COMPONENTS.includes(baseClass) || TARGET_COMPONENT_PREFIXES.some(prefix => baseClass.startsWith(prefix))) {
            return true;
        }
    }
    
    return false;
}

/**
 * Проверить, нужно ли игнорировать класс
 */
function shouldIgnoreClass(className) {
    return IGNORE_CLASSES.some(ignore => 
        className.includes(ignore) || 
        className.match(/^\d+$/) || 
        className === 'c-6' || 
        className === 'c-4' || 
        className === 'mb-56' || 
        className === 'mt-56'
    );
}

/**
 * Проверить, есть ли маппинг для класса
 */
function hasMapping(className, parentComponentType) {
    // Проверяем контекстно-зависимый маппинг
    if (CONTEXT_DEPENDENT_MAPPING[parentComponentType] && 
        CONTEXT_DEPENDENT_MAPPING[parentComponentType][className]) {
        return true;
    }
    
    // Проверяем обычный маппинг
    if (INTERNAL_CLASSES_MAPPING[parentComponentType] && 
        INTERNAL_CLASSES_MAPPING[parentComponentType][className]) {
        return true;
    }
    
    return false;
}

/**
 * Найти родительский компонент для элемента
 */
function findParentComponent(element) {
    let parent = element.parentElement;
    while (parent) {
        if (parent.tagName === 'SECTION' && parent.className) {
            const sectionClass = parent.className.split(' ')[0];
            if (TARGET_COMPONENTS.includes(sectionClass) || TARGET_COMPONENT_PREFIXES.some(prefix => sectionClass.startsWith(prefix))) {
                return sectionClass;
            }
        }
        parent = parent.parentElement;
    }
    return null;
}

/**
 * Анализировать файл
 */
function analyzeFile(filePath) {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!data.normalizedHTML) {
            return null;
        }
        
        const dom = new JSDOM(data.normalizedHTML);
        const doc = dom.window.document;
        
        const nonNormalizedClasses = new Map(); // className -> { count, elements, parentComponents }
        
        // Находим все элементы с классами
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(element => {
            if (!element.classList || element.classList.length === 0) {
                return;
            }
            
            const parentComponent = findParentComponent(element) || 'unknown';
            
            Array.from(element.classList).forEach(className => {
                // Пропускаем целевые классы
                if (isTargetClass(className)) {
                    return;
                }
                
                // Пропускаем игнорируемые классы
                if (shouldIgnoreClass(className)) {
                    return;
                }
                
                // Проверяем, есть ли маппинг
                if (hasMapping(className, parentComponent)) {
                    return; // Есть маппинг, но класс все еще присутствует - возможно, маппинг не работает
                }
                
                // Это ненормализованный класс
                if (!nonNormalizedClasses.has(className)) {
                    nonNormalizedClasses.set(className, {
                        className: className,
                        count: 0,
                        elements: [],
                        parentComponents: new Set(),
                        tagNames: new Set(),
                    });
                }
                
                const classInfo = nonNormalizedClasses.get(className);
                classInfo.count++;
                classInfo.parentComponents.add(parentComponent);
                classInfo.tagNames.add(element.tagName.toLowerCase());
                
                // Сохраняем пример элемента (максимум 3)
                if (classInfo.elements.length < 3) {
                    classInfo.elements.push({
                        tag: element.tagName.toLowerCase(),
                        parentComponent: parentComponent,
                        html: element.outerHTML.substring(0, 200),
                    });
                }
            });
        });
        
        return {
            slug: data.slug || path.basename(filePath, '.json'),
            url: data.url,
            nonNormalizedClasses: Array.from(nonNormalizedClasses.values()),
        };
    } catch (error) {
        console.error(`Ошибка при анализе ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Проверить дублирующие определения в INTERNAL_CLASSES_MAPPING
 */
function checkDuplicateDefinitions() {
    const duplicates = [];
    const componentTypes = new Set();
    
    // Проверяем загруженный маппинг
    for (const componentType of Object.keys(INTERNAL_CLASSES_MAPPING)) {
        if (componentTypes.has(componentType)) {
            duplicates.push(componentType);
        } else {
            componentTypes.add(componentType);
        }
    }
    
    return duplicates;
}

/**
 * Основная функция
 */
async function analyzeAllFiles() {
    console.log('🔍 АНАЛИЗ НЕНОРМАЛИЗОВАННЫХ КЛАССОВ');
    console.log('='.repeat(70));
    
    // Проверяем дублирующие определения
    console.log('\n📋 Проверка дублирующих определений в маппинге...');
    const duplicates = checkDuplicateDefinitions();
    if (duplicates.length > 0) {
        console.log(`⚠️  Найдены дублирующие определения: ${duplicates.join(', ')}`);
    } else {
        console.log('✅ Дублирующих определений не найдено');
    }
    
    // Получаем все файлы
    const files = fs.readdirSync(NORMALIZED_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .sort();
    
    console.log(`\n📚 Найдено файлов для анализа: ${files.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        duplicates: duplicates,
        totalFiles: files.length,
        analyzedFiles: 0,
        totalNonNormalizedClasses: 0,
        files: [],
        classSummary: new Map(),
    };
    
    // Анализируем каждый файл
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(NORMALIZED_DIR, file);
        
        if ((i + 1) % 10 === 0 || i === 0) {
            console.log(`[${i + 1}/${files.length}] Обработка: ${file}...`);
        }
        
        const analysis = analyzeFile(filePath);
        if (analysis) {
            results.analyzedFiles++;
            results.totalNonNormalizedClasses += analysis.nonNormalizedClasses.length;
            
            if (analysis.nonNormalizedClasses.length > 0) {
                results.files.push(analysis);
                
                // Собираем статистику по классам
                analysis.nonNormalizedClasses.forEach(classInfo => {
                    if (!results.classSummary.has(classInfo.className)) {
                        results.classSummary.set(classInfo.className, {
                            className: classInfo.className,
                            totalCount: 0,
                            files: new Set(),
                            parentComponents: new Set(),
                            tagNames: new Set(),
                        });
                    }
                    
                    const summary = results.classSummary.get(classInfo.className);
                    summary.totalCount += classInfo.count;
                    summary.files.add(analysis.slug);
                    classInfo.parentComponents.forEach(pc => summary.parentComponents.add(pc));
                    classInfo.tagNames.forEach(tn => summary.tagNames.add(tn));
                });
            }
        }
    }
    
    // Преобразуем Map в массив для JSON
    results.classSummary = Array.from(results.classSummary.values()).map(summary => ({
        className: summary.className,
        totalCount: summary.totalCount,
        filesCount: summary.files.size,
        files: Array.from(summary.files).slice(0, 10), // Первые 10 файлов
        parentComponents: Array.from(summary.parentComponents),
        tagNames: Array.from(summary.tagNames),
    }));
    
    // Сортируем по количеству использований
    results.classSummary.sort((a, b) => b.totalCount - a.totalCount);
    
    // Сохраняем результаты
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(70));
    console.log(`Всего файлов: ${results.totalFiles}`);
    console.log(`Проанализировано: ${results.analyzedFiles}`);
    console.log(`Файлов с ненормализованными классами: ${results.files.length}`);
    console.log(`Всего ненормализованных классов: ${results.totalNonNormalizedClasses}`);
    console.log(`Уникальных классов: ${results.classSummary.length}`);
    console.log(`\n📁 Результаты сохранены в: ${OUTPUT_FILE}`);
    
    if (results.classSummary.length > 0) {
        console.log('\n🔝 Топ-20 наиболее часто встречающихся классов:');
        results.classSummary.slice(0, 20).forEach((cls, index) => {
            console.log(`  ${index + 1}. ${cls.className} (${cls.totalCount} раз, в ${cls.filesCount} файлах)`);
        });
    }
    
    console.log('='.repeat(70));
    
    return results;
}

if (require.main === module) {
    analyzeAllFiles().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { analyzeAllFiles };
