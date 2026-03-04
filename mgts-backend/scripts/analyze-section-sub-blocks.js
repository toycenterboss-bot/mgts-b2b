/**
 * Анализ подблоков внутри секций с множественными совпадениями компонентов
 * Определяет, какие конкретные HTML блоки относятся к каждому компоненту
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const CLASSIFICATION_FILE = path.join(__dirname, '../../temp/services-extraction/detailed-sections-classification.json');
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/section-sub-blocks-analysis.json');

// Компоненты с их селекторами для определения подблоков
const COMPONENT_SELECTORS = {
    'page.hero': {
        selectors: ['.hero', '.hero-content', '.title-promo-long', '[class*="title-promo"]'],
        excludeSelectors: ['[class*="card"]', '[class*="tariff"]', '[class*="accordion"]', 'form']
    },
    'page.section-text': {
        selectors: [
            '.title-h1-wide', 
            '.title-h1-wide__title-text',
            '.block-text-box', 
            '.article-container',
            'p', 'h1', 'h2', 'h3', 'h4',
            '[class*="text-box"]',
            '[class*="description"]'
        ],
        excludeSelectors: ['[class*="card"]', '[class*="tariff"]', '[class*="accordion"]', '[class*="form"]', 'button']
    },
    'page.section-cards': {
        selectors: [
            '.advantage-cards-container',
            '.advantage-card',
            '.cards-container',
            '[class*="card"]:not([class*="tariff"])'
        ],
        excludeSelectors: ['[class*="tariff"]', '[class*="accordion"]', 'form']
    },
    'page.service-tariffs': {
        selectors: [
            '.tariff-cards-container',
            '.tariff-card',
            '.tariff-cards-container-scroll',
            '[class*="tariff-card"]',
            '[class*="tariff-cards"]'
        ],
        excludeSelectors: ['[class*="accordion"]', '[class*="faq"]']
    },
    'page.service-faq': {
        selectors: [
            '.accordion-row',
            '.faq-list',
            '.faq-item',
            '[class*="accordion"]',
            '[class*="faq"]'
        ],
        excludeSelectors: ['[class*="tariff"]', '[class*="card"]:not([class*="faq"])']
    },
    'page.service-order-form': {
        selectors: [
            '.request-form-container',
            '.request-header',
            '.section-request-container',
            '.order-form',
            'form',
            '[class*="request-form"]',
            '[class*="request-container"]'
        ],
        excludeSelectors: ['[class*="accordion"]', '[class*="faq"]']
    },
    'page.section-table': {
        selectors: ['table', '.table', '.data-table'],
        excludeSelectors: []
    },
    'page.section-grid': {
        selectors: ['.grid', '.grid-item', '[class*="grid"]'],
        excludeSelectors: ['[class*="tariff"]', '[class*="card"]:not([class*="grid"])']
    }
};

/**
 * Извлечь подблоки из секции, соответствующие каждому компоненту
 */
function extractSubBlocks(sectionHtml, matchedComponents) {
    const dom = new JSDOM(sectionHtml);
    const doc = dom.window.document;
    const subBlocks = {};

    for (const match of matchedComponents) {
        const componentKey = match.component;
        const componentConfig = COMPONENT_SELECTORS[componentKey];
        
        if (!componentConfig) {
            continue;
        }

        const blocks = [];
        const foundElements = new Set();

        // Ищем элементы, соответствующие компоненту
        for (const selector of componentConfig.selectors) {
            try {
                const elements = doc.querySelectorAll(selector);
                elements.forEach(el => {
                    // Проверяем, не исключен ли элемент
                    const shouldExclude = componentConfig.excludeSelectors.some(exSelector => {
                        try {
                            return el.matches(exSelector) || el.closest(exSelector) !== null;
                        } catch (e) {
                            return false;
                        }
                    });

                    if (!shouldExclude && !foundElements.has(el)) {
                        // Находим ближайший родительский блок, который не перекрывается с другими компонентами
                        let parentBlock = el;
                        while (parentBlock && parentBlock !== doc.body) {
                            const isExcluded = componentConfig.excludeSelectors.some(exSelector => {
                                try {
                                    return parentBlock.matches(exSelector);
                                } catch (e) {
                                    return false;
                                }
                            });

                            if (isExcluded) {
                                parentBlock = parentBlock.parentElement;
                                continue;
                            }

                            // Проверяем, не является ли это частью другого компонента
                            const isOtherComponent = matchedComponents
                                .filter(m => m.component !== componentKey)
                                .some(otherMatch => {
                                    const otherConfig = COMPONENT_SELECTORS[otherMatch.component];
                                    if (!otherConfig) return false;
                                    return otherConfig.selectors.some(otherSelector => {
                                        try {
                                            return parentBlock.matches(otherSelector) || 
                                                   parentBlock.querySelector(otherSelector) === el;
                                        } catch (e) {
                                            return false;
                                        }
                                    });
                                });

                            if (!isOtherComponent) {
                                blocks.push({
                                    html: parentBlock.outerHTML.substring(0, 5000),
                                    text: parentBlock.textContent.trim().substring(0, 200),
                                    selector: selector,
                                    tagName: parentBlock.tagName,
                                    classes: Array.from(parentBlock.classList),
                                    id: parentBlock.id || null,
                                    childCount: parentBlock.children.length
                                });
                                foundElements.add(el);
                                break;
                            }

                            parentBlock = parentBlock.parentElement;
                        }
                    }
                });
            } catch (e) {
                // Игнорируем ошибки селекторов
            }
        }

        if (blocks.length > 0) {
            subBlocks[componentKey] = {
                component: componentKey,
                blocks: blocks,
                totalBlocks: blocks.length,
                estimatedHTML: blocks.map(b => b.html).join('\n\n')
            };
        }
    }

    dom.window.close();
    return subBlocks;
}

/**
 * Основная функция анализа
 */
async function analyzeSubBlocks() {
    console.log('🔍 АНАЛИЗ ПОДБЛОКОВ СЕКЦИЙ С МНОЖЕСТВЕННЫМИ КОМПОНЕНТАМИ');
    console.log('='.repeat(70));

    if (!fs.existsSync(CLASSIFICATION_FILE)) {
        console.error('❌ Файл классификации не найден:', CLASSIFICATION_FILE);
        process.exit(1);
    }

    const classificationData = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf-8'));
    
    const results = {
        timestamp: new Date().toISOString(),
        totalPages: 0,
        pagesWithMultiMatch: 0,
        totalMultiMatchSections: 0,
        analyzedSections: 0,
        pagesAnalysis: []
    };

    for (const page of classificationData.pagesAnalysis) {
        // Загружаем исходный HTML страницы из файла
        const pageContentFile = path.join(PAGES_CONTENT_DIR, page.slug + '.json');
        let pageHtml = null;
        
        if (fs.existsSync(pageContentFile)) {
            try {
                const pageContentData = JSON.parse(fs.readFileSync(pageContentFile, 'utf-8'));
                pageHtml = pageContentData.content.html;
            } catch (e) {
                console.warn(`⚠️  Не удалось загрузить HTML для страницы ${page.title}: ${e.message}`);
            }
        }
        
        if (!pageHtml) {
            console.warn(`⚠️  HTML не найден для страницы ${page.title}, пропускаем...`);
            continue;
        }

        const pageResult = {
            url: page.url,
            title: page.title,
            slug: page.slug,
            sections: []
        };

        let hasMultiMatch = false;

        // Извлекаем секции из исходного HTML
        const dom = new JSDOM(pageHtml);
        const doc = dom.window.document;
        const sectionElements = doc.querySelectorAll('section.main-section');
        
        for (const sectionData of page.sections || []) {
            const section = sectionData.section || sectionData;
            const classification = sectionData.classification || {};
            const matchedComponents = classification.matchedComponents || [];

            if (matchedComponents.length > 1) {
                hasMultiMatch = true;
                results.totalMultiMatchSections++;

                // Получаем реальный HTML секции из исходного документа
                const sectionIndex = section.index - 1; // индекс начинается с 1, массив с 0
                const sectionElement = sectionElements[sectionIndex];
                
                if (!sectionElement) {
                    console.warn(`⚠️  Секция #${section.index} не найдена в HTML для ${page.title}`);
                    continue;
                }

                const sectionHtml = sectionElement.outerHTML;

                console.log(`\n📄 ${page.title} - Секция #${section.index}`);
                console.log(`   Компоненты: ${matchedComponents.map(m => classificationData.existingComponents[m.component]?.name || m.component).join(', ')}`);

                const subBlocks = extractSubBlocks(sectionHtml, matchedComponents);
                results.analyzedSections++;

                pageResult.sections.push({
                    sectionIndex: section.index,
                    sectionTitle: section.title,
                    matchedComponents: matchedComponents.map(m => ({
                        component: m.component,
                        name: classificationData.existingComponents[m.component]?.name || m.component,
                        confidence: m.confidence
                    })),
                    subBlocks: subBlocks,
                    blocksSummary: Object.entries(subBlocks).map(([compKey, blocks]) => ({
                        component: compKey,
                        componentName: classificationData.existingComponents[compKey]?.name || compKey,
                        blocksCount: blocks.totalBlocks,
                        hasContent: blocks.blocks.length > 0
                    }))
                });

                console.log(`   ✅ Найдено подблоков: ${Object.values(subBlocks).reduce((sum, b) => sum + b.totalBlocks, 0)}`);
            }
        }

        if (hasMultiMatch) {
            results.pagesWithMultiMatch++;
            results.pagesAnalysis.push(pageResult);
        }
        results.totalPages++;
    }

    // Сохраняем результаты
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(70));
    console.log(`Всего страниц: ${results.totalPages}`);
    console.log(`Страниц с множественными совпадениями: ${results.pagesWithMultiMatch}`);
    console.log(`Всего секций с множественными совпадениями: ${results.totalMultiMatchSections}`);
    console.log(`Проанализировано секций: ${results.analyzedSections}`);
    console.log('\n📁 Результаты сохранены в:', OUTPUT_FILE);
    console.log('='.repeat(70));

    return results;
}

if (require.main === module) {
    analyzeSubBlocks().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { analyzeSubBlocks, extractSubBlocks };
