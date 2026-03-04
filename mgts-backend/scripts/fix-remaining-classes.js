const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-non-normalized-classes.json');
const NORMALIZE_SCRIPT = path.join(__dirname, 'normalize-html-structure.js');

// Загружаем анализ
const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));

// Загружаем скрипт
let scriptContent = fs.readFileSync(NORMALIZE_SCRIPT, 'utf-8');

console.log('🔧 ИСПРАВЛЕНИЕ ОСТАВШИХСЯ КЛАССОВ');
console.log('='.repeat(70));

// Собираем все оставшиеся классы с их контекстом
const classesToFix = new Map();

analysis.files.forEach(file => {
    file.nonNormalizedClasses.forEach(classInfo => {
        const className = classInfo.className;
        if (!classesToFix.has(className)) {
            classesToFix.set(className, {
                className: className,
                parentComponents: new Set(),
                examples: [],
            });
        }
        
        const info = classesToFix.get(className);
        // Извлекаем родительские компоненты из примеров элементов
        classInfo.elements.forEach(element => {
            if (element.parentComponent) {
                info.parentComponents.add(element.parentComponent);
            }
        });
        
        if (info.examples.length < 3 && classInfo.elements && classInfo.elements.length > 0) {
            info.examples.push({
                parentComponent: classInfo.elements[0].parentComponent || 'unknown',
                html: classInfo.elements[0].html || '',
            });
        }
    });
});

console.log(`\nНайдено классов для исправления: ${classesToFix.size}\n`);

// Определяем маппинги для каждого класса
const finalMappings = {};

Array.from(classesToFix.values()).forEach(classInfo => {
    const className = classInfo.className;
    const parentComponents = Array.from(classInfo.parentComponents);
    
    console.log(`\n${className}:`);
    console.log(`  Родительские компоненты: ${parentComponents.join(', ')}`);
    
    // Определяем маппинг для каждого родительского компонента
    parentComponents.forEach(parentComponent => {
        let targetClass = null;
        
        // Специальные случаи
        if (className === 'file-item__type-img') {
            // Всегда files-table, независимо от родителя
            targetClass = 'files-table__item-icon';
            if (!finalMappings['files-table']) {
                finalMappings['files-table'] = {};
            }
            finalMappings['files-table'][className] = targetClass;
        } else if (className === 'bread-crumbs-row') {
            // Удаляем везде
            parentComponents.forEach(pc => {
                if (!finalMappings[pc]) {
                    finalMappings[pc] = {};
                }
                finalMappings[pc][className] = '';
            });
            return;
        } else if (className === 'b2b_connection_request') {
            // Удаляем везде
            parentComponents.forEach(pc => {
                if (!finalMappings[pc]) {
                    finalMappings[pc] = {};
                }
                finalMappings[pc][className] = '';
            });
            return;
        } else if (className === 'title-margin-top') {
            // Удаляем везде
            parentComponents.forEach(pc => {
                if (!finalMappings[pc]) {
                    finalMappings[pc] = {};
                }
                finalMappings[pc][className] = '';
            });
            return;
        } else if (className.startsWith('title-h1-wide')) {
            // Заголовки - маппинг зависит от родительского компонента
            if (!finalMappings[parentComponent]) {
                finalMappings[parentComponent] = {};
            }
            if (className === 'title-h1-wide') {
                targetClass = `${parentComponent}__title-wrapper`;
            } else if (className === 'title-h1-wide__title-text') {
                targetClass = `${parentComponent}__title`;
            } else if (className === 'title-h1-wide__description-text') {
                targetClass = `${parentComponent}__description`;
            }
            finalMappings[parentComponent][className] = targetClass;
        } else if (className === 'link-img') {
            // Иконка ссылки
            if (!finalMappings[parentComponent]) {
                finalMappings[parentComponent] = {};
            }
            finalMappings[parentComponent][className] = `${parentComponent}__link-icon`;
        } else if (className === 'select-chevron') {
            // Селектор
            if (!finalMappings[parentComponent]) {
                finalMappings[parentComponent] = {};
            }
            finalMappings[parentComponent][className] = `${parentComponent}__select-chevron`;
        } else if (className === 'input-box') {
            // Уже есть маппинг, но проверим
            if (parentComponent === 'service-order-form') {
                if (!finalMappings[parentComponent]) {
                    finalMappings[parentComponent] = {};
                }
                finalMappings[parentComponent][className] = 'service-order-form__input-wrapper';
            }
        } else if (className === 'mb-120') {
            // Удаляем
            if (!finalMappings[parentComponent]) {
                finalMappings[parentComponent] = {};
            }
            finalMappings[parentComponent][className] = '';
        } else if (className === 'h2-comp-med' || className === 'p1-comp-reg' || className === 'h1-wide-med') {
            // Эти классы уже должны быть в маппинге, но проверим
            if (!finalMappings[parentComponent]) {
                finalMappings[parentComponent] = {};
            }
            if (className === 'h2-comp-med') {
                finalMappings[parentComponent][className] = `${parentComponent}__subtitle`;
            } else if (className === 'p1-comp-reg') {
                finalMappings[parentComponent][className] = `${parentComponent}__content`;
            } else if (className === 'h1-wide-med') {
                finalMappings[parentComponent][className] = `${parentComponent}__title`;
            }
        } else if (className === 'all-services-section__title') {
            // Уже есть в section-cards
            if (parentComponent === 'section-cards') {
                if (!finalMappings[parentComponent]) {
                    finalMappings[parentComponent] = {};
                }
                finalMappings[parentComponent][className] = 'section-cards__title';
            }
        } else {
            // Общий случай
            if (!finalMappings[parentComponent]) {
                finalMappings[parentComponent] = {};
            }
            // Преобразуем имя класса
            let baseName = className.replace(/^(request-|form-|input-|button-|tariff-|accordion-|advantage-|file-|news-|information-|shares-|tag-)/, '');
            if (baseName.includes('__')) {
                baseName = baseName.split('__')[1];
            }
            finalMappings[parentComponent][className] = `${parentComponent}__${baseName}`;
        }
        
        if (targetClass) {
            console.log(`  → ${parentComponent}: ${targetClass}`);
        }
    });
});

// Добавляем маппинги в скрипт
Object.keys(finalMappings).forEach(component => {
    const componentMapping = finalMappings[component];
    const classCount = Object.keys(componentMapping).length;
    
    if (classCount === 0) return;
    
    console.log(`\nДобавление маппингов для ${component}: ${classCount} классов`);
    
    // Находим определение компонента
    const componentRegex = new RegExp(`(['"])${component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*:\\s*\\{`, 's');
    const match = scriptContent.match(componentRegex);
    
    if (match) {
        const startIndex = match.index + match[0].length - 1;
        
        // Находим закрывающую скобку
        let braceCount = 0;
        let inString = false;
        let stringChar = null;
        let endIndex = startIndex;
        
        for (let i = startIndex; i < scriptContent.length; i++) {
            const char = scriptContent[i];
            const prevChar = i > 0 ? scriptContent[i - 1] : '';
            
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = null;
            } else if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
        }
        
        const currentContent = scriptContent.substring(startIndex + 1, endIndex);
        
        // Добавляем новые маппинги
        let newMappings = [];
        Object.keys(componentMapping).forEach(oldClass => {
            const newClass = componentMapping[oldClass];
            const escapedOldClass = oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (!new RegExp(`['"]${escapedOldClass}['"]\\s*:`).test(currentContent)) {
                const comment = newClass === '' ? ' // служебный класс, удаляем' : '';
                newMappings.push(`        '${oldClass}': '${newClass}',${comment}`);
            }
        });
        
        if (newMappings.length > 0) {
            const insertIndex = endIndex;
            const needsComma = !currentContent.trim().endsWith(',') && currentContent.trim().length > 0;
            const insertText = (needsComma ? ',' : '') + '\n' + newMappings.join('\n') + '\n';
            
            scriptContent = scriptContent.substring(0, insertIndex) + insertText + scriptContent.substring(insertIndex);
            console.log(`  ✅ Добавлено ${newMappings.length} маппингов`);
        } else {
            console.log(`  ⚠️  Все маппинги уже присутствуют`);
        }
    } else {
        console.log(`  ❌ Не найдено определение компонента ${component}`);
    }
});

// Сохраняем обновленный скрипт
fs.writeFileSync(NORMALIZE_SCRIPT, scriptContent, 'utf-8');

console.log('\n✅ Все маппинги добавлены');
console.log('='.repeat(70));
