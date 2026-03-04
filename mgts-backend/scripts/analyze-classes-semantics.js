const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const TARGET_COMPONENTS = [
    'hero', 'section-text', 'section-cards', 'service-tariffs', 'service-faq',
    'service-order-form', 'section-map', 'history-timeline', 'mobile-app-section',
    'crm-cards', 'files-table', 'tariff-table'
];

console.log('🔍 Семантический анализ классов из нормализованного HTML...\n');

// Собираем все уникальные классы по компонентам
const componentClasses = new Map();
const classAnalysis = new Map();

const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');

console.log(`📁 Обработка ${files.length} файлов...\n`);

files.forEach((file, fileIndex) => {
    const filePath = path.join(NORMALIZED_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!data.normalizedHTML) return;
    
    if ((fileIndex + 1) % 20 === 0) {
        console.log(`  Обработано: ${fileIndex + 1}/${files.length} файлов...`);
    }
    
    const dom = new JSDOM(data.normalizedHTML);
    const doc = dom.window.document;
    
    const sections = doc.querySelectorAll('section');
    sections.forEach(section => {
        const sectionClass = section.className.split(' ')[0];
        if (TARGET_COMPONENTS.includes(sectionClass)) {
            if (!componentClasses.has(sectionClass)) {
                componentClasses.set(sectionClass, new Set());
            }
            
            // Собираем все элементы с классами внутри секции
            const allElements = section.querySelectorAll('*');
            allElements.forEach(element => {
                if (!element.classList) return;
                
                let classes = [];
                if (typeof element.classList.forEach === 'function') {
                    element.classList.forEach(c => classes.push(c));
                } else if (Array.isArray(element.classList)) {
                    classes = element.classList;
                } else {
                    let className = '';
                    if (element.classList.baseVal !== undefined) {
                        className = element.classList.baseVal || '';
                    } else {
                        className = element.getAttribute('class') || '';
                    }
                    classes = className.split(' ').filter(c => c.trim());
                }
                
                classes.forEach(className => {
                    if (className && (className === sectionClass || className.startsWith(sectionClass + '__') || className.startsWith(sectionClass + '--'))) {
                        componentClasses.get(sectionClass).add(className);
                        
                        // Анализируем элемент
                        if (!classAnalysis.has(className)) {
                            classAnalysis.set(className, {
                                className: className,
                                component: sectionClass,
                                tagName: element.tagName.toLowerCase(),
                                usageCount: 0,
                                contexts: [],
                                contentSamples: [],
                                parentElements: new Set(),
                                childElements: new Set(),
                                attributes: new Map(),
                                textLength: { min: Infinity, max: 0, avg: 0, samples: [] },
                                hasImages: false,
                                hasLinks: false,
                                hasForms: false,
                                hasButtons: false,
                                hasLists: false,
                                hasTables: false
                            });
                        }
                        
                        const analysis = classAnalysis.get(className);
                        analysis.usageCount++;
                        
                        // Анализ контекста
                        const parent = element.parentElement;
                        if (parent) {
                            let parentClass = '';
                            if (parent.className) {
                                if (typeof parent.className === 'string') {
                                    parentClass = parent.className.split(' ')[0];
                                } else if (parent.className.baseVal !== undefined) {
                                    parentClass = (parent.className.baseVal || '').split(' ')[0];
                                } else {
                                    parentClass = String(parent.className).split(' ')[0];
                                }
                            }
                            if (parentClass && parentClass.startsWith(sectionClass)) {
                                analysis.parentElements.add(parentClass);
                            }
                        }
                        
                        // Анализ дочерних элементов
                        Array.from(element.children).forEach(child => {
                            let childClass = '';
                            if (child.className) {
                                if (typeof child.className === 'string') {
                                    childClass = child.className.split(' ')[0];
                                } else if (child.className.baseVal !== undefined) {
                                    childClass = (child.className.baseVal || '').split(' ')[0];
                                } else {
                                    childClass = String(child.className).split(' ')[0];
                                }
                            }
                            if (childClass && childClass.startsWith(sectionClass)) {
                                analysis.childElements.add(childClass);
                            }
                        });
                        
                        // Анализ содержимого
                        const text = element.textContent || '';
                        const textLength = text.trim().length;
                        if (textLength > 0) {
                            analysis.textLength.samples.push(textLength);
                            analysis.textLength.min = Math.min(analysis.textLength.min, textLength);
                            analysis.textLength.max = Math.max(analysis.textLength.max, textLength);
                            
                            if (analysis.contentSamples.length < 5) {
                                const sample = text.trim().substring(0, 100);
                                if (sample && !analysis.contentSamples.includes(sample)) {
                                    analysis.contentSamples.push(sample);
                                }
                            }
                        }
                        
                        // Проверка наличия различных элементов
                        if (element.querySelector('img') || element.tagName.toLowerCase() === 'img') {
                            analysis.hasImages = true;
                        }
                        if (element.querySelector('a') || element.tagName.toLowerCase() === 'a') {
                            analysis.hasLinks = true;
                        }
                        if (element.querySelector('input, select, textarea') || ['input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
                            analysis.hasForms = true;
                        }
                        if (element.querySelector('button') || element.tagName.toLowerCase() === 'button') {
                            analysis.hasButtons = true;
                        }
                        if (element.querySelector('ul, ol') || ['ul', 'ol'].includes(element.tagName.toLowerCase())) {
                            analysis.hasLists = true;
                        }
                        if (element.querySelector('table') || element.tagName.toLowerCase() === 'table') {
                            analysis.hasTables = true;
                        }
                        
                        // Анализ атрибутов
                        Array.from(element.attributes).forEach(attr => {
                            if (!analysis.attributes.has(attr.name)) {
                                analysis.attributes.set(attr.name, new Set());
                            }
                            analysis.attributes.get(attr.name).add(attr.value);
                        });
                    }
                });
            });
        }
    });
});

// Вычисляем среднюю длину текста
classAnalysis.forEach(analysis => {
    if (analysis.textLength.samples.length > 0) {
        analysis.textLength.avg = Math.round(
            analysis.textLength.samples.reduce((a, b) => a + b, 0) / analysis.textLength.samples.length
        );
    }
});

console.log(`\n✅ Анализ завершен. Найдено ${classAnalysis.size} уникальных классов.\n`);

// Генерируем семантический анализ для каждого класса
const semanticAnalysis = [];

classAnalysis.forEach((analysis, className) => {
    // Определяем семантику на основе имени класса
    const classParts = className.split('__');
    const componentName = classParts[0];
    const elementName = classParts[1] || '';
    const modifier = classParts[2] || '';
    
    // Анализ назначения
    let purpose = '';
    let semanticRole = '';
    let visualRole = '';
    
    // Определяем семантическую роль
    if (elementName.includes('title') || elementName.includes('heading')) {
        semanticRole = 'heading';
        purpose = 'Заголовок секции или подраздела';
    } else if (elementName.includes('content') || elementName.includes('text') || elementName.includes('description')) {
        semanticRole = 'content';
        purpose = 'Основной текстовый контент';
    } else if (elementName.includes('button') || elementName.includes('btn')) {
        semanticRole = 'action';
        purpose = 'Интерактивная кнопка для действий';
    } else if (elementName.includes('input') || elementName.includes('field') || elementName.includes('form')) {
        semanticRole = 'form-control';
        purpose = 'Элемент формы ввода данных';
    } else if (elementName.includes('card')) {
        semanticRole = 'card';
        purpose = 'Карточка с информацией';
    } else if (elementName.includes('container') || elementName.includes('wrapper')) {
        semanticRole = 'container';
        purpose = 'Контейнер для группировки элементов';
    } else if (elementName.includes('image') || elementName.includes('img')) {
        semanticRole = 'media';
        purpose = 'Изображение или медиа-контент';
    } else if (elementName.includes('link') || elementName.includes('icon')) {
        semanticRole = 'navigation';
        purpose = 'Ссылка или иконка';
    } else if (elementName.includes('list') || elementName.includes('item')) {
        semanticRole = 'list';
        purpose = 'Элемент списка';
    } else if (elementName.includes('table')) {
        semanticRole = 'table';
        purpose = 'Таблица данных';
    } else if (elementName.includes('map')) {
        semanticRole = 'map';
        purpose = 'Карта или геолокация';
    } else {
        semanticRole = 'generic';
        purpose = 'Общий элемент компонента';
    }
    
    // Определяем визуальную роль на основе модификаторов
    if (modifier) {
        if (modifier.includes('narrow') || modifier.includes('small')) {
            visualRole = 'Ограниченная ширина';
        } else if (modifier.includes('large') || modifier.includes('xl')) {
            visualRole = 'Увеличенный размер';
        } else if (modifier.includes('primary')) {
            visualRole = 'Основной стиль';
        } else if (modifier.includes('secondary')) {
            visualRole = 'Вторичный стиль';
        } else if (modifier.includes('white') || modifier.includes('gray')) {
            visualRole = 'Цветовая модификация';
        }
    }
    
    // Определяем способ применения CSS на основе семантики
    let cssRecommendations = {
        display: '',
        positioning: '',
        spacing: '',
        typography: '',
        colors: '',
        layout: '',
        other: []
    };
    
    // Рекомендации по display
    if (semanticRole === 'container' || semanticRole === 'card') {
        cssRecommendations.display = 'block или flex (в зависимости от содержимого)';
    } else if (semanticRole === 'heading') {
        cssRecommendations.display = 'block';
    } else if (semanticRole === 'action' || semanticRole === 'button') {
        cssRecommendations.display = 'inline-block или flex';
    } else if (semanticRole === 'form-control') {
        cssRecommendations.display = 'block';
    } else if (semanticRole === 'list' || semanticRole === 'item') {
        cssRecommendations.display = 'block или list-item';
    } else if (semanticRole === 'navigation' || semanticRole === 'link') {
        cssRecommendations.display = 'inline или inline-block';
    } else {
        cssRecommendations.display = 'block';
    }
    
    // Рекомендации по spacing
    if (semanticRole === 'heading') {
        cssRecommendations.spacing = 'margin-bottom для отступа после заголовка';
    } else if (semanticRole === 'content' || semanticRole === 'text') {
        cssRecommendations.spacing = 'margin для вертикальных отступов, padding для внутренних отступов';
    } else if (semanticRole === 'container') {
        cssRecommendations.spacing = 'padding для внутренних отступов';
    } else if (semanticRole === 'card') {
        cssRecommendations.spacing = 'margin для отступов между карточками, padding для внутренних отступов';
    } else if (semanticRole === 'form-control') {
        cssRecommendations.spacing = 'margin-bottom для отступа после поля';
    }
    
    // Рекомендации по typography
    if (semanticRole === 'heading') {
        if (elementName.includes('title') && !elementName.includes('subtitle')) {
            cssRecommendations.typography = 'font-size: крупный (h1/h2 размер), font-weight: bold/semibold';
        } else if (elementName.includes('subtitle')) {
            cssRecommendations.typography = 'font-size: средний (h2/h3 размер), font-weight: medium';
        }
    } else if (semanticRole === 'content' || semanticRole === 'text') {
        cssRecommendations.typography = 'font-size: базовый размер текста, line-height: 1.5-1.6';
    } else if (semanticRole === 'action' || semanticRole === 'button') {
        cssRecommendations.typography = 'font-size: средний, font-weight: medium/semibold, text-align: center';
    }
    
    // Рекомендации по colors
    if (modifier.includes('white')) {
        cssRecommendations.colors = 'background-color: white, color: темный текст';
    } else if (modifier.includes('gray')) {
        cssRecommendations.colors = 'background-color: серый, color: темный текст';
    } else if (modifier.includes('primary')) {
        cssRecommendations.colors = 'background-color: primary цвет, color: white';
    } else if (semanticRole === 'heading') {
        cssRecommendations.colors = 'color: темный текст (gray-900)';
    } else if (semanticRole === 'content' || semanticRole === 'text') {
        cssRecommendations.colors = 'color: базовый цвет текста (gray-700)';
    }
    
    // Рекомендации по layout
    if (semanticRole === 'container') {
        cssRecommendations.layout = 'max-width для ограничения ширины, margin: 0 auto для центрирования';
    } else if (modifier.includes('narrow')) {
        cssRecommendations.layout = 'max-width: ограниченная ширина (например, 600-800px)';
    } else if (semanticRole === 'card') {
        cssRecommendations.layout = 'border-radius для скругления, box-shadow для тени';
    }
    
    // Дополнительные рекомендации
    if (analysis.hasImages) {
        cssRecommendations.other.push('object-fit: cover для изображений');
    }
    if (analysis.hasButtons) {
        cssRecommendations.other.push('cursor: pointer, transition для hover эффектов');
    }
    if (analysis.hasForms) {
        cssRecommendations.other.push('border для полей ввода, focus состояния');
    }
    if (analysis.hasLinks) {
        cssRecommendations.other.push('text-decoration для ссылок, hover состояния');
    }
    
    semanticAnalysis.push({
        className: className,
        component: componentName,
        tagName: analysis.tagName,
        usageCount: analysis.usageCount,
        semanticRole: semanticRole,
        purpose: purpose,
        visualRole: visualRole || 'Стандартный стиль',
        contentAnalysis: {
            hasText: analysis.textLength.samples.length > 0,
            textLength: analysis.textLength,
            hasImages: analysis.hasImages,
            hasLinks: analysis.hasLinks,
            hasForms: analysis.hasForms,
            hasButtons: analysis.hasButtons,
            hasLists: analysis.hasLists,
            hasTables: analysis.hasTables,
            contentSamples: analysis.contentSamples.slice(0, 3)
        },
        structure: {
            parentElements: Array.from(analysis.parentElements),
            childElements: Array.from(analysis.childElements),
            commonAttributes: Array.from(analysis.attributes.keys())
        },
        cssRecommendations: cssRecommendations
    });
});

// Сортируем по компонентам и использованию
semanticAnalysis.sort((a, b) => {
    if (a.component !== b.component) {
        return a.component.localeCompare(b.component);
    }
    return b.usageCount - a.usageCount;
});

// Сохраняем результаты
const outputPath = path.join(OUTPUT_DIR, 'classes-semantic-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalClasses: semanticAnalysis.length,
    components: Array.from(componentClasses.keys()).map(comp => ({
        component: comp,
        classesCount: componentClasses.get(comp).size
    })),
    analysis: semanticAnalysis
}, null, 2), 'utf-8');

console.log(`📊 Результаты сохранены в: ${outputPath}`);

// Генерируем отчет в Markdown
const reportPath = path.join(__dirname, '../../docs/CLASSES_SEMANTIC_ANALYSIS.md');
let report = `# Семантический анализ классов из нормализованного HTML

**Дата анализа:** ${new Date().toISOString()}  
**Всего классов:** ${semanticAnalysis.length}  
**Компонентов:** ${componentClasses.size}

## 📊 Статистика по компонентам

`;

componentClasses.forEach((classes, component) => {
    report += `- **${component}**: ${classes.size} классов\n`;
});

report += `\n## 🔍 Детальный анализ классов\n\n`;

// Группируем по компонентам
const byComponent = new Map();
semanticAnalysis.forEach(analysis => {
    if (!byComponent.has(analysis.component)) {
        byComponent.set(analysis.component, []);
    }
    byComponent.get(analysis.component).push(analysis);
});

byComponent.forEach((analyses, component) => {
    report += `### ${component} (${analyses.length} классов)\n\n`;
    
    analyses.forEach(analysis => {
        report += `#### \`${analysis.className}\`\n\n`;
        report += `- **Тег:** \`<${analysis.tagName}>\`\n`;
        report += `- **Использований:** ${analysis.usageCount}\n`;
        report += `- **Семантическая роль:** ${analysis.semanticRole}\n`;
        report += `- **Назначение:** ${analysis.purpose}\n`;
        report += `- **Визуальная роль:** ${analysis.visualRole}\n\n`;
        
        report += `**Анализ контента:**\n`;
        report += `- Текст: ${analysis.contentAnalysis.hasText ? `Да (мин: ${analysis.contentAnalysis.textLength.min}, макс: ${analysis.contentAnalysis.textLength.max}, сред: ${analysis.contentAnalysis.textLength.avg} символов)` : 'Нет'}\n`;
        report += `- Изображения: ${analysis.contentAnalysis.hasImages ? 'Да' : 'Нет'}\n`;
        report += `- Ссылки: ${analysis.contentAnalysis.hasLinks ? 'Да' : 'Нет'}\n`;
        report += `- Формы: ${analysis.contentAnalysis.hasForms ? 'Да' : 'Нет'}\n`;
        report += `- Кнопки: ${analysis.contentAnalysis.hasButtons ? 'Да' : 'Нет'}\n`;
        report += `- Списки: ${analysis.contentAnalysis.hasLists ? 'Да' : 'Нет'}\n`;
        report += `- Таблицы: ${analysis.contentAnalysis.hasTables ? 'Да' : 'Нет'}\n`;
        
        if (analysis.contentAnalysis.contentSamples.length > 0) {
            report += `\n**Примеры контента:**\n`;
            analysis.contentAnalysis.contentSamples.forEach((sample, i) => {
                report += `${i + 1}. "${sample}"\n`;
            });
        }
        
        report += `\n**Структура:**\n`;
        if (analysis.structure.parentElements.length > 0) {
            report += `- Родительские элементы: ${analysis.structure.parentElements.join(', ')}\n`;
        }
        if (analysis.structure.childElements.length > 0) {
            report += `- Дочерние элементы: ${analysis.structure.childElements.join(', ')}\n`;
        }
        
        report += `\n**Рекомендации по CSS:**\n`;
        report += `- **Display:** ${analysis.cssRecommendations.display}\n`;
        if (analysis.cssRecommendations.spacing) {
            report += `- **Spacing:** ${analysis.cssRecommendations.spacing}\n`;
        }
        if (analysis.cssRecommendations.typography) {
            report += `- **Typography:** ${analysis.cssRecommendations.typography}\n`;
        }
        if (analysis.cssRecommendations.colors) {
            report += `- **Colors:** ${analysis.cssRecommendations.colors}\n`;
        }
        if (analysis.cssRecommendations.layout) {
            report += `- **Layout:** ${analysis.cssRecommendations.layout}\n`;
        }
        if (analysis.cssRecommendations.other.length > 0) {
            report += `- **Дополнительно:** ${analysis.cssRecommendations.other.join(', ')}\n`;
        }
        
        report += `\n---\n\n`;
    });
});

fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`📄 Отчет сохранен в: ${reportPath}`);

// Генерируем краткую сводку
console.log(`\n📊 Краткая сводка:`);
console.log(`  Всего классов: ${semanticAnalysis.length}`);
console.log(`  Компонентов: ${componentClasses.size}`);
console.log(`  Наиболее используемые классы:`);
semanticAnalysis
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)
    .forEach((analysis, i) => {
        console.log(`    ${i + 1}. ${analysis.className}: ${analysis.usageCount} раз (${analysis.semanticRole})`);
    });

console.log(`\n✅ Анализ завершен!`);
