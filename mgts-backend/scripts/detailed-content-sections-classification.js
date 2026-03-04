/**
 * Детальная классификация секций контента внутри каждой страницы
 * Анализирует HTML каждой страницы, разбивает на секции и классифицирует каждую секцию
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const INDEX_FILE = path.join(PAGES_CONTENT_DIR, 'index.json');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'detailed-sections-classification.json');
const COMPONENTS_DIR = path.join(__dirname, '../src/components/page');

/**
 * Загрузить существующие компоненты из schema.json файлов
 */
function loadExistingComponents() {
    const components = {};
    
    if (!fs.existsSync(COMPONENTS_DIR)) {
        console.warn(`⚠️  Директория компонентов не найдена: ${COMPONENTS_DIR}`);
        return components;
    }
    
    // Список компонентов для анализа (только те, которые используются как секции страниц)
    const componentDirs = [
        'hero',
        'section-text',
        'section-cards',
        'section-grid',
        'section-table',
        'service-tariffs',
        'service-faq',
        'service-order-form'
    ];
    
    // Маппинг имен компонентов на CSS селекторы для классификации
    // Селекторы основаны на реальных классах из собранных страниц
    const componentSelectors = {
        'hero': [
            '.hero', '.hero-content', 
            '.title-promo-long', '.title-promo-long__title-text',
            '[class*="hero"]', '[class*="title-promo"]'
        ],
        'section-text': [
            '.section-text', 
            'section > div > h1', 'section > div > h2',
            '.title-h1-wide', '.title-h1-wide__title-text',
            '.block-text-box', '.article-container', '.content-container',
            '[class*="text-box"]', '[class*="article"]'
        ],
        'section-cards': [
            '.section-cards', 
            '.advantage-cards-container', '.advantage-card',
            '.cards-container', '.card-base-style',
            '[class*="cards"]', '[class*="advantage-card"]', '[class*="card-"]'
        ],
        'section-grid': [
            '.section-grid', 
            '.grid', '.grid-item',
            '[class*="grid"]', '[class*="-grid"]'
        ],
        'section-table': [
            'table', '.table', '.data-table',
            '[class*="table"]'
        ],
        'service-tariffs': [
            '.service-tariffs',
            '.tariff-cards-container', '.tariff-card',
            '.tariff-cards-container-scroll',
            '[class*="tariff"]', '[class*="tariff-card"]'
        ],
        'service-faq': [
            '.service-faq',
            '.accordion-row', '.accordion-row__header',
            '.faq-list', '.faq-item',
            '[class*="accordion"]', '[class*="faq"]'
        ],
        'service-order-form': [
            '.service-order',
            '.request-form-container', '.request-header',
            '.section-request-container',
            '.order-form', '.button-request-form',
            '[class*="request-form"]', '[class*="request-container"]',
            '[class*="order"]', 'form[class*="request"]'
        ]
    };
    
    for (const componentName of componentDirs) {
        const schemaPath = path.join(COMPONENTS_DIR, componentName, 'schema.json');
        
        if (fs.existsSync(schemaPath)) {
            try {
                const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                const componentKey = `page.${componentName}`;
                
                components[componentKey] = {
                    name: schema.info.displayName || componentName,
                    description: schema.info.description || '',
                    selectors: componentSelectors[componentName] || [],
                    mapping: componentName,
                    schema: schema
                };
            } catch (error) {
                console.warn(`⚠️  Ошибка при чтении schema.json для ${componentName}: ${error.message}`);
            }
        }
    }
    
    return components;
}

// Загружаем существующие компоненты из файловой системы
const EXISTING_COMPONENTS = loadExistingComponents();

// Элементы, которые игнорируются (общие для всех страниц)
const IGNORED_ELEMENTS = [
    'footer',
    '.footer',
    'header',
    '.header',
    'nav',
    '.nav-menu',
    '.nav-search',
    '.bread-crumbs-row',
    '.banner-cookie-container',
    '.mega-menu',
    '.menu-item'
];

/**
 * Разбить HTML на секции
 */
function extractSections(html) {
    const dom = new JSDOM(html, { 
        resources: 'usable',
        runScripts: 'outside-only'
    });
    const doc = dom.window.document;
    
    // Удаляем игнорируемые элементы
    IGNORED_ELEMENTS.forEach(selector => {
        try {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        } catch (e) {
            // Игнорируем ошибки селекторов
        }
    });
    
    const sections = [];
    
    // Ищем все секции (расширенный поиск для страниц с разной структурой)
    let sectionElements = doc.querySelectorAll('section.main-section');
    
    // Если не найдено секций с main-section, ищем альтернативные структуры
    if (sectionElements.length === 0) {
        // Пробуем другие варианты структуры
        const candidates = doc.querySelectorAll('article.article-container, article.content-container, section, article, div.article-container, div.content-container');
        
        // Фильтруем только значимые элементы
        sectionElements = Array.from(candidates).filter(el => {
            // Пропускаем игнорируемые элементы
            const shouldIgnore = IGNORED_ELEMENTS.some(selector => {
                try {
                    return el.matches(selector) || el.closest(selector);
                } catch (e) {
                    return false;
                }
            });
            if (shouldIgnore) return false;
            
            // Проверяем, что это контентный элемент
            const text = el.textContent ? el.textContent.trim() : '';
            const hasContent = text.length > 50;
            
            // Проверяем, что это не вложенный элемент внутри другого контентного
            const isNested = Array.from(candidates).some(other => 
                other !== el && other.contains(el) && other.textContent && other.textContent.trim().length > 50
            );
            
            const isContainer = el.classList.contains('article-container') || 
                               el.classList.contains('content-container') ||
                               el.classList.contains('article') ||
                               el.classList.contains('container') ||
                               el.tagName === 'SECTION' || 
                               el.tagName === 'ARTICLE';
            
            return hasContent && isContainer && !isNested;
        });
    }
    
    sectionElements.forEach((section, index) => {
        // Пропускаем пустые секции
        const text = section.textContent ? section.textContent.trim() : '';
        if (text.length < 10) {
            return;
        }
        
        // Извлекаем структуру секции (минимальная обработка)
        const sectionData = {
            index: index + 1,
            html: section.outerHTML.substring(0, 5000), // Ограничиваем размер HTML
            text: text.substring(0, 200),
            classes: Array.from(section.classList),
            id: section.id || null,
            hasTitle: !!section.querySelector('h1, h2, h3'),
            title: section.querySelector('h1, h2, h3')?.textContent?.trim() || null,
            hasCards: !!section.querySelector('[class*="card"]'),
            hasForm: !!section.querySelector('form'),
            hasTable: !!section.querySelector('table'),
            hasAccordion: !!section.querySelector('[class*="accordion"]'),
            hasTariffs: !!section.querySelector('[class*="tariff"]'),
            hasImages: section.querySelectorAll('img').length > 0,
            imagesCount: section.querySelectorAll('img').length,
            hasLinks: section.querySelectorAll('a').length > 0,
            linksCount: section.querySelectorAll('a').length,
            // Ограничиваем дочерние элементы для экономии памяти
            childElements: Array.from(section.children).slice(0, 10).map(child => ({
                tag: child.tagName,
                classes: Array.from(child.classList).slice(0, 5), // Первые 5 классов
                id: child.id || null
            }))
        };
        
        sections.push(sectionData);
    });
    
    // Освобождаем память
    dom.window.close();
    
    return sections;
}

/**
 * Классифицировать секцию (без создания нового DOM)
 */
function classifySection(section, pageInfo) {
    const classification = {
        sectionIndex: section.index,
        sectionTitle: section.title,
        matchedComponents: [],
        possibleComponents: [],
        unmatchedElements: [],
        recommendation: null
    };
    
    // Проверяем соответствие существующим компонентам (без создания DOM)
    for (const [componentKey, component] of Object.entries(EXISTING_COMPONENTS)) {
        let matched = false;
        let matchReason = '';
        
        // Проверяем по классам секции (быстро, без DOM)
        for (const selector of component.selectors) {
            const selectorClass = selector.replace(/[.#]/g, '').toLowerCase();
            
            // Проверяем по классам
            if (section.classes.some(cls => {
                const clsLower = cls.toLowerCase();
                return clsLower.includes(selectorClass) || selectorClass.includes(clsLower) || 
                       clsLower === selectorClass;
            })) {
                matched = true;
                matchReason = `Class match: ${selector}`;
                break;
            }
        }
        
        // Дополнительная проверка по структуре (без DOM)
        if (!matched) {
            try {
                // Проверяем по структуре HTML (без полного парсинга)
                const htmlLower = section.html.toLowerCase();
                
                for (const selector of component.selectors) {
                    const selectorClean = selector.replace(/[.#\[\]]/g, '').toLowerCase();
                    if (htmlLower.includes(selectorClean)) {
                        matched = true;
                        matchReason = `HTML contains: ${selector}`;
                        break;
                    }
                }
            } catch (e) {
                // Игнорируем ошибки
            }
        }
        
        // Дополнительная проверка по структуре секции (улучшенная логика)
        if (!matched) {
            // Улучшенная логика определения по структуре
            if (componentKey === 'page.service-tariffs') {
                if (section.hasTariffs || 
                    section.classes.some(c => c.includes('tariff') || c.includes('title-h1-wide'))) {
                    // Дополнительная проверка: есть ли заголовок "Тарифы"
                    if (section.title && (section.title.toLowerCase().includes('тариф') || section.title.toLowerCase().includes('цена'))) {
                        matched = true;
                        matchReason = 'Has tariffs section with title';
                    } else if (section.hasTariffs) {
                        matched = true;
                        matchReason = 'Has tariff elements';
                    }
                }
            } else if (componentKey === 'page.service-faq') {
                if (section.hasAccordion || 
                    section.classes.some(c => c.includes('accordion'))) {
                    // Дополнительная проверка: есть ли заголовок "FAQ" или "Вопросы"
                    if (section.title && (section.title.toLowerCase().includes('вопрос') || section.title.toLowerCase().includes('faq') || section.title.toLowerCase().includes('часто'))) {
                        matched = true;
                        matchReason = 'Has FAQ section with accordion';
                    } else if (section.hasAccordion) {
                        matched = true;
                        matchReason = 'Has accordion structure';
                    }
                }
            } else if (componentKey === 'page.service-order-form') {
                if (section.hasForm || 
                    section.classes.some(c => c.includes('request') || c.includes('order') || c.includes('form'))) {
                    matched = true;
                    matchReason = 'Has form element';
                }
            } else if (componentKey === 'page.section-cards') {
                if (section.hasCards && !section.hasTariffs && 
                    !section.classes.some(c => c.includes('tariff'))) {
                    // Проверяем, что это не FAQ и не форма
                    if (!section.hasAccordion && !section.hasForm) {
                        matched = true;
                        matchReason = 'Has cards without tariffs/faq/form';
                    }
                }
            } else if (componentKey === 'page.section-table') {
                if (section.hasTable) {
                    matched = true;
                    matchReason = 'Has table element';
                }
            } else if (componentKey === 'page.hero') {
                // Hero - первая секция с заголовком, но без карточек/тарифов/форм/аккордеонов
                if (section.index === 1 && section.hasTitle && 
                    !section.hasCards && !section.hasForm && 
                    !section.hasTariffs && !section.hasAccordion &&
                    !section.hasTable) {
                    // Проверяем, есть ли классы hero или title-promo
                    if (section.classes.some(c => c.includes('hero') || c.includes('title-promo') || c.includes('promo'))) {
                        matched = true;
                        matchReason = 'First section with hero/promo classes';
                    } else if (section.text.length < 500) { // Hero обычно короткий
                        matched = true;
                        matchReason = 'First section with title only (likely hero)';
                    }
                }
            } else if (componentKey === 'page.section-grid') {
                // Grid - секция с сеткой элементов
                if (section.hasCards && section.childElements && section.childElements.length > 3) {
                    if (section.classes.some(c => c.includes('grid') || c.includes('container'))) {
                        matched = true;
                        matchReason = 'Has grid structure with multiple items';
                    }
                }
            } else if (componentKey === 'page.section-text') {
                // Section Text - текстовая секция без специальных элементов
                if (!section.hasCards && !section.hasForm && 
                    !section.hasTariffs && !section.hasAccordion &&
                    !section.hasTable && section.hasTitle &&
                    section.text.length > 100) {
                    // Проверяем, что это не hero (не первая секция)
                    if (section.index > 1) {
                        matched = true;
                        matchReason = 'Text section without special elements';
                    }
                }
            }
        }
        
        if (matched) {
            classification.matchedComponents.push({
                component: componentKey,
                name: component.name,
                confidence: 'high',
                reason: matchReason || 'Matches pattern'
            });
        } else {
            // Проверяем частичное соответствие по структуре (без DOM)
            const partialMatch = component.selectors.some(selector => {
                const selectorParts = selector.replace(/[.#]/g, '').toLowerCase().split(/-|_/);
                const htmlLower = section.html.toLowerCase();
                const classesLower = section.classes.map(c => c.toLowerCase()).join(' ');
                
                return selectorParts.some(part => 
                    part.length > 3 && (
                        classesLower.includes(part) || 
                        htmlLower.includes(part)
                    )
                );
            });
            
            if (partialMatch) {
                classification.possibleComponents.push({
                    component: componentKey,
                    name: component.name,
                    confidence: 'medium',
                    reason: 'Partial match'
                });
            }
        }
        
        // Проверяем по структуре секции (быстро, без DOM)
        if (!matched && !classification.possibleComponents.find(c => c.component === componentKey)) {
            if (componentKey === 'page.service-tariffs' && section.hasTariffs) {
                matched = true;
                matchReason = 'Has tariff elements';
            } else if (componentKey === 'page.service-faq' && section.hasAccordion) {
                matched = true;
                matchReason = 'Has accordion structure';
            } else if (componentKey === 'page.service-order-form' && section.hasForm) {
                matched = true;
                matchReason = 'Has form element';
            } else if (componentKey === 'page.section-cards' && section.hasCards && !section.hasTariffs) {
                matched = true;
                matchReason = 'Has cards without tariffs';
            } else if (componentKey === 'page.section-table' && section.hasTable) {
                matched = true;
                matchReason = 'Has table element';
            } else if (componentKey === 'page.hero' && section.index === 1 && section.hasTitle && !section.hasCards && !section.hasForm) {
                matched = true;
                matchReason = 'First section with title only';
            }
            
            if (matched && !classification.matchedComponents.find(c => c.component === componentKey)) {
                classification.matchedComponents.push({
                    component: componentKey,
                    name: component.name,
                    confidence: 'medium',
                    reason: matchReason
                });
            }
        }
    }
    
    // Определяем рекомендацию
    if (classification.matchedComponents.length > 0) {
        // Берем первое совпадение с высокой уверенностью
        classification.recommendation = classification.matchedComponents[0];
    } else if (classification.possibleComponents.length > 0) {
        classification.recommendation = classification.possibleComponents[0];
    } else {
        // Анализируем структуру для определения нового типа
        const structure = analyzeSectionStructure(section);
        classification.recommendation = {
            component: null,
            name: 'Unknown Section',
            confidence: 'low',
            reason: 'Does not match existing components',
            structure: structure,
            suggestedComponent: suggestNewComponent(structure)
        };
    }
    
    return classification;
}

/**
 * Анализировать структуру секции для определения типа
 */
function analyzeSectionStructure(section) {
    const structure = {
        type: 'unknown',
        hasTitle: section.hasTitle,
        hasCards: section.hasCards,
        hasForm: section.hasForm,
        hasTable: section.hasTable,
        hasAccordion: section.hasAccordion,
        hasTariffs: section.hasTariffs,
        hasImages: section.hasImages,
        hasLinks: section.hasLinks,
        mainElements: section.childElements.map(el => el.tag).filter((v, i, a) => a.indexOf(v) === i),
        commonClasses: section.classes.filter(cls => !cls.includes('main-section') && !cls.includes('mr-') && !cls.includes('mb-'))
    };
    
    // Определяем тип по структуре
    if (section.hasForm) {
        structure.type = 'form-section';
    } else if (section.hasAccordion) {
        structure.type = 'accordion-section';
    } else if (section.hasTariffs) {
        structure.type = 'tariff-section';
    } else if (section.hasCards) {
        structure.type = 'cards-section';
    } else if (section.hasTable) {
        structure.type = 'table-section';
    } else if (section.hasTitle && section.text.length > 100) {
        structure.type = 'text-section';
    } else if (section.hasImages && section.hasLinks) {
        structure.type = 'content-section';
    } else {
        structure.type = 'generic-section';
    }
    
    return structure;
}

/**
 * Предложить новый компонент на основе структуры
 */
function suggestNewComponent(structure) {
    const suggestions = [];
    
    if (structure.type === 'form-section' && !structure.hasAccordion) {
        suggestions.push({
            name: 'Contact Form Section',
            component: 'page.contact-form-section',
            description: 'Секция с формой обратной связи',
            fields: ['title', 'formFields', 'submitButton']
        });
    }
    
    if (structure.type === 'cards-section' && structure.hasImages && structure.hasLinks) {
        suggestions.push({
            name: 'Feature Cards Section',
            component: 'page.feature-cards-section',
            description: 'Секция с карточками преимуществ/возможностей',
            fields: ['title', 'cards', 'layout']
        });
    }
    
    if (structure.type === 'generic-section' && structure.commonClasses.length > 0) {
        suggestions.push({
            name: 'Custom Content Section',
            component: 'page.custom-content-section',
            description: 'Произвольная секция контента',
            fields: ['title', 'content', 'backgroundColor', 'customClasses']
        });
    }
    
    return suggestions;
}

/**
 * Основная функция анализа
 */
async function analyzeAllPages() {
    console.log('🔍 ДЕТАЛЬНАЯ КЛАССИФИКАЦИЯ СЕКЦИЙ КОНТЕНТА');
    console.log('='.repeat(70));
    
    // Загружаем индекс
    if (!fs.existsSync(INDEX_FILE)) {
        console.error('❌ Файл индекса не найден:', INDEX_FILE);
        process.exit(1);
    }
    
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    const pages = index.results.filter(r => r.success);
    
    console.log(`\n📋 Найдено страниц для анализа: ${pages.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        totalPages: pages.length,
        existingComponents: EXISTING_COMPONENTS,
        pagesAnalysis: [],
        statistics: {
            totalSections: 0,
            matchedSections: 0,
            unmatchedSections: 0,
            componentUsage: {},
            suggestedNewComponents: []
        }
    };
    
    for (const page of pages) {
        console.log(`📄 Анализ: ${page.title}...`);
        
        const pageFile = path.join(PAGES_CONTENT_DIR, page.filename);
        if (!fs.existsSync(pageFile)) {
            console.log(`   ⚠️  Файл не найден: ${pageFile}`);
            continue;
        }
        
        const pageData = JSON.parse(fs.readFileSync(pageFile, 'utf-8'));
        const html = pageData.content.html;
        
        // Извлекаем секции
        const sections = extractSections(html);
        console.log(`   📦 Найдено секций: ${sections.length}`);
        
        // Классифицируем каждую секцию
        const sectionClassifications = sections.map(section => {
            const classification = classifySection(section, page);
            return {
                section: {
                    index: section.index,
                    title: section.title,
                    classes: section.classes,
                    textPreview: section.text
                },
                classification: classification
            };
        });
        
        // Статистика по странице
        const pageStats = {
            totalSections: sections.length,
            matchedSections: sectionClassifications.filter(s => s.classification.matchedComponents.length > 0).length,
            unmatchedSections: sectionClassifications.filter(s => s.classification.matchedComponents.length === 0).length
        };
        
        results.pagesAnalysis.push({
            url: page.url,
            title: page.title,
            slug: page.slug,
            section: page.section,
            sectionsCount: sections.length,
            statistics: pageStats,
            sections: sectionClassifications
        });
        
        // Обновляем общую статистику
        results.statistics.totalSections += sections.length;
        results.statistics.matchedSections += pageStats.matchedSections;
        results.statistics.unmatchedSections += pageStats.unmatchedSections;
        
        // Собираем статистику использования компонентов (учитываем ВСЕ совпавшие компоненты)
        sectionClassifications.forEach(s => {
            // Учитываем все совпадения, а не только recommendation
            if (s.classification.matchedComponents && s.classification.matchedComponents.length > 0) {
                s.classification.matchedComponents.forEach(match => {
                    const componentKey = match.component;
                    results.statistics.componentUsage[componentKey] = 
                        (results.statistics.componentUsage[componentKey] || 0) + 1;
                });
            }
            // Если нет совпадений, но есть recommendation, используем его
            else if (s.classification.recommendation && s.classification.recommendation.component) {
                const componentKey = s.classification.recommendation.component;
                results.statistics.componentUsage[componentKey] = 
                    (results.statistics.componentUsage[componentKey] || 0) + 1;
            }
        });
        
        // Собираем предложения новых компонентов
        sectionClassifications.forEach(s => {
            if (s.classification.recommendation && s.classification.recommendation.suggestedComponent) {
                s.classification.recommendation.suggestedComponent.forEach(suggestion => {
                    if (!results.statistics.suggestedNewComponents.find(s => s.component === suggestion.component)) {
                        results.statistics.suggestedNewComponents.push(suggestion);
                    }
                });
            }
        });
        
        console.log(`   ✅ Обработано: ${sections.length} секций (${pageStats.matchedSections} совпадений, ${pageStats.unmatchedSections} несовпадений)\n`);
    }
    
    // Сохраняем результаты
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Выводим итоговую статистику
    console.log('='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(70));
    console.log(`Всего страниц: ${results.totalPages}`);
    console.log(`Всего секций: ${results.statistics.totalSections}`);
    console.log(`Совпавших секций: ${results.statistics.matchedSections}`);
    console.log(`Несовпавших секций: ${results.statistics.unmatchedSections}`);
    console.log(`Процент совпадений: ${((results.statistics.matchedSections / results.statistics.totalSections) * 100).toFixed(1)}%`);
    
    console.log('\n📦 Использование компонентов:');
    for (const [component, count] of Object.entries(results.statistics.componentUsage)) {
        const componentName = EXISTING_COMPONENTS[component]?.name || component;
        console.log(`  ${componentName}: ${count} раз`);
    }
    
    if (results.statistics.suggestedNewComponents.length > 0) {
        console.log('\n💡 Предложенные новые компоненты:');
        results.statistics.suggestedNewComponents.forEach((suggestion, index) => {
            console.log(`  ${index + 1}. ${suggestion.name} (${suggestion.component})`);
            console.log(`     Описание: ${suggestion.description}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
    
    return results;
}

if (require.main === module) {
    analyzeAllPages().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { analyzeAllPages, extractSections, classifySection };
