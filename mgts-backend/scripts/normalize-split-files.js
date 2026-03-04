const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Импортируем константы из основного скрипта нормализации
const normalizeModule = require('./normalize-html-structure.js');

// Получаем необходимые константы из модуля
const INTERNAL_CLASSES_MAPPING = normalizeModule.INTERNAL_CLASSES_MAPPING || {};
const TARGET_COMPONENTS = normalizeModule.TARGET_COMPONENTS || [];

// Загружаем контекстно-зависимый маппинг
const CONTEXT_DEPENDENT_MAPPING_FILE = path.join(__dirname, '../../temp/services-extraction/context-dependent-mapping.json');
let CONTEXT_DEPENDENT_MAPPING = {};
if (fs.existsSync(CONTEXT_DEPENDENT_MAPPING_FILE)) {
    CONTEXT_DEPENDENT_MAPPING = JSON.parse(fs.readFileSync(CONTEXT_DEPENDENT_MAPPING_FILE, 'utf-8'));
}

/**
 * Преобразовать внутренний класс (полная копия из основного скрипта)
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
    return mapping[className] !== undefined ? mapping[className] : null;
}

/**
 * Преобразовать элемент (полная копия логики из normalize-html-structure.js)
 */
function transformElement(element, parentComponentType) {
    // Если это секция, создаем новую секцию
    if (element.tagName === 'SECTION') {
        const newSection = element.ownerDocument.createElement('section');
        const sectionClass = element.className ? element.className.split(' ')[0] : '';
        if (TARGET_COMPONENTS.includes(sectionClass)) {
            newSection.className = sectionClass;
        } else {
            // Определяем тип компонента на основе содержимого
            const componentType = detectComponentType(element);
            newSection.className = componentType;
        }
        
        // Копируем содержимое
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === 1) {
                newSection.appendChild(transformElement(node, newSection.className || parentComponentType));
            } else {
                newSection.appendChild(node.cloneNode(true));
            }
        });
        
        return newSection;
    }
    
    // Клонируем элемент БЕЗ классов, чтобы не копировать старые классы
    const newElement = element.cloneNode(false);
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
                // Для SVGAnimatedString - используем baseVal или getAttribute
                let className = '';
                if (element.classList.baseVal !== undefined) {
                    className = element.classList.baseVal || '';
                } else {
                    className = element.getAttribute('class') || '';
                }
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
            if (c.match(/^\d+$/) || c === 'c-6' || c === 'c-4' || c === 'mb-56' || c === 'mt-56') {
                return;
            }
            
            // Удаляем служебные классы для позиционирования и стилей
            if (c === 'full-width' || c === 'cards-vertical' || c === 'cards-scroll' || 
                c === 'cards-align-top' || c === 'element-positions-even' || c === 'element-positions-odd' ||
                c === 'all-services-section__cards' || c === 'default-button' || 
                c === 'size-S' || c === 'size-M' || c === 'p1-comp-med' ||
                c === 'banner-safe-region' || c === 'banner-safe-region-text') {
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
        const classes = Array.from(element.classList || [])
            .filter(c => !c.includes('mgts') && !c.includes('disable') && !c.includes('mr') && !c.includes('pd'))
            .map(c => c.replace(/^[a-z]+-/, ''));
        if (classes.length > 0) {
            newElement.className = classes.join(' ');
        }
    }
    
    // Копируем содержимое
    // Используем actualParentComponent, если он был определен, иначе parentComponentType
    const componentTypeForChildren = actualParentComponent || parentComponentType;
    Array.from(element.childNodes).forEach(node => {
        if (node.nodeType === 1) { // Element node
            newElement.appendChild(transformElement(node, componentTypeForChildren));
        } else {
            newElement.appendChild(node.cloneNode(true));
        }
    });
    
    return newElement;
}

/**
 * Определить тип компонента для секции на основе содержимого
 */
function detectComponentType(section) {
    const sectionHTML = section.outerHTML;
    const sectionClass = section.className ? section.className.split(' ')[0] : '';
    
    // Если секция уже имеет целевой класс, используем его
    if (TARGET_COMPONENTS.includes(sectionClass)) {
        return sectionClass;
    }
    
    // Определяем тип компонента на основе содержимого
    // Hero секции
    if (sectionHTML.includes('title-promo-long') || sectionHTML.includes('title-promo')) {
        return 'hero';
    }
    
    // Тарифы
    if (sectionHTML.includes('tariff-card') || sectionHTML.includes('tariff-cards-container') || 
        sectionHTML.includes('tariff-table') || sectionHTML.includes('block-tariff-table')) {
        return 'service-tariffs';
    }
    
    // FAQ
    if (sectionHTML.includes('accordion-row') || sectionHTML.includes('accordion')) {
        return 'service-faq';
    }
    
    // Карточки
    if (sectionHTML.includes('advantage-card') || sectionHTML.includes('card-base-style') || 
        sectionHTML.includes('service-card') || sectionHTML.includes('cards-container')) {
        return 'section-cards';
    }
    
    // Формы заказа
    if (sectionHTML.includes('request-form-container') || sectionHTML.includes('form-container') ||
        sectionHTML.includes('section-request-container')) {
        return 'service-order-form';
    }
    
    // Карты
    if (sectionHTML.includes('map') || sectionHTML.includes('addresses-objects') ||
        sectionHTML.includes('objects-wrapper')) {
        return 'section-map';
    }
    
    // История
    if (sectionHTML.includes('block-mgts-history') || sectionHTML.includes('history-timeline')) {
        return 'history-timeline';
    }
    
    // Файлы
    if (sectionHTML.includes('files-list') || sectionHTML.includes('file-item')) {
        return 'files-table';
    }
    
    // По умолчанию - текстовая секция
    return 'section-text';
}

/**
 * Нормализовать HTML для split файлов
 */
function normalizeHTML(html) {
    if (!html) return '';
    
    try {
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        // Находим все секции
        const sections = doc.querySelectorAll('section');
        
        if (sections.length === 0) {
            // Если нет секций, возвращаем HTML как есть
            return html;
        }
        
        const normalizedSections = [];
        
        sections.forEach(section => {
            // Определяем тип компонента для секции
            const componentType = detectComponentType(section);
            
            // Создаем новую секцию с правильным классом
            const normalizedSection = doc.createElement('section');
            normalizedSection.className = componentType;
            
            // Преобразуем содержимое секции
            Array.from(section.childNodes).forEach(node => {
                if (node.nodeType === 1) {
                    normalizedSection.appendChild(transformElement(node, componentType));
                } else {
                    normalizedSection.appendChild(node.cloneNode(true));
                }
            });
            
            normalizedSections.push(normalizedSection.outerHTML);
        });
        
        const result = normalizedSections.join('');
        return result || html; // Если результат пустой, возвращаем исходный HTML
    } catch (error) {
        console.error('Ошибка при нормализации HTML:', error.message);
        return html; // Возвращаем исходный HTML в случае ошибки
    }
}

const SPLIT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized-split');

console.log('🔄 Нормализация файлов из pages-content-normalized-split...\n');

if (!fs.existsSync(SPLIT_DIR)) {
    console.error(`❌ Директория не найдена: ${SPLIT_DIR}`);
    process.exit(1);
}

const files = fs.readdirSync(SPLIT_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json');

console.log(`Найдено файлов: ${files.length}\n`);

let successCount = 0;
let failedCount = 0;
const results = [];

for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(SPLIT_DIR, file);
    
    try {
        const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const slug = pageData.slug || file.replace('.json', '');
        
        if ((i + 1) % 10 === 0 || i === 0) {
            console.log(`[${i + 1}/${files.length}] Обработка: ${slug}...`);
        }
        
        // Проверяем, есть ли normalizedHTML
        const html = pageData.normalizedHTML || '';
        
        if (!html) {
            console.log(`   ⚠️  Нет normalizedHTML для нормализации`);
            failedCount++;
            results.push({ file, status: 'failed', reason: 'no normalizedHTML' });
            continue;
        }
        
        // Нормализуем HTML (применяем нормализацию классов)
        const normalizedHTML = normalizeHTML(html);
        
        if (!normalizedHTML) {
            console.log(`   ⚠️  Не удалось нормализовать HTML`);
            failedCount++;
            results.push({ file, status: 'failed', reason: 'normalization failed' });
            continue;
        }
        
        // Обновляем файл
        const updatedData = {
            ...pageData,
            normalizedHTML: normalizedHTML,
            normalizedAt: new Date().toISOString(),
            normalizedFrom: 'split'
        };
        
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');
        successCount++;
        results.push({ file, status: 'success' });
    } catch (error) {
        console.error(`   ❌ Ошибка при обработке ${file}:`, error.message);
        failedCount++;
        results.push({ file, status: 'failed', reason: error.message });
    }
}

console.log(`\n✅ Успешно нормализовано: ${successCount}`);
console.log(`❌ Ошибок: ${failedCount}`);
console.log(`\n📁 Результаты сохранены в: ${SPLIT_DIR}`);

// Сохраняем отчет
const reportPath = path.join(__dirname, '../../temp/services-extraction/split-normalization-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    successful: successCount,
    failed: failedCount,
    results: results
}, null, 2), 'utf-8');

console.log(`📊 Отчет сохранен в: ${reportPath}`);
