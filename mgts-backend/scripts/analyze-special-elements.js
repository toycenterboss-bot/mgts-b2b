const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'special-elements-analysis.json');

// Страницы для детального анализа
const TARGET_PAGES = {
    'virtual_ate': {
        url: 'https://business.mgts.ru/virtual_ate',
        elements: [
            'как подключить',
            'carousel',
            'карусел',
            'переключ',
            'switch',
            'crm-card',
            'мобильное приложение'
        ]
    },
    'about_mgts': {
        url: 'https://business.mgts.ru/about_mgts',
        elements: [
            'block-mgts-history',
            'history',
            'история'
        ]
    },
    'mgts_compliance_policies': {
        url: 'https://business.mgts.ru/mgts_compliance_policies',
        elements: [
            'files-list',
            'file-item',
            'таблиц'
        ]
    },
    'security_alarm': {
        url: 'https://business.mgts.ru/business/security_alarm',
        elements: [
            'tariff-table',
            'block-tariff-table',
            'таблиц'
        ]
    }
};

/**
 * Анализ специальных элементов на странице
 */
function analyzeSpecialElements(pageData, pageSlug) {
    const html = pageData.content?.html || '';
    if (!html) return null;

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const analysis = {
        pageSlug: pageSlug,
        url: pageData.url,
        title: pageData.title,
        section: pageData.section,
        foundElements: []
    };

    // 1. Поиск раздела "Как подключить"
    const howToConnectText = html.toLowerCase();
    if (howToConnectText.includes('как подключить') || howToConnectText.includes('подключение')) {
        // Ищем заголовок
        const h2Elements = Array.from(doc.querySelectorAll('h2, h3'));
        const howToConnectHeader = h2Elements.find(h => {
            const text = h.textContent.toLowerCase();
            return text.includes('как подключить') || text.includes('подключение');
        });
        
        if (howToConnectHeader) {
            const section = howToConnectHeader.closest('section, div[class*="section"], div[class*="block"]');
            analysis.foundElements.push({
                type: 'how-to-connect',
                description: 'Раздел "Как подключить"',
                selector: section ? Array.from(section.classList).join('.') : 'unknown',
                headerText: howToConnectHeader.textContent.trim(),
                html: section ? section.outerHTML.substring(0, 1000) : null
            });
        }
    }

    // 2. Поиск карусели изображений
    const carousel = doc.querySelector('[class*="carousel"], [class*="карусел"], [class*="slider"], [class*="swiper"]');
    if (carousel) {
        analysis.foundElements.push({
            type: 'image-carousel',
            description: 'Карусель изображений',
            selector: Array.from(carousel.classList).join('.'),
            html: carousel.outerHTML.substring(0, 1000)
        });
    }

    // 3. Поиск переключения изображений на клик (SVG)
    const imageSwitcher = doc.querySelector('[class*="switch"], [class*="переключ"], [onclick*="image"], [onclick*="switch"]');
    if (imageSwitcher || doc.querySelectorAll('svg[onclick], img[onclick]').length > 0) {
        const switchers = doc.querySelectorAll('svg[onclick], img[onclick], [class*="switch"][onclick]');
        analysis.foundElements.push({
            type: 'image-switcher',
            description: 'Переключение изображений на клик (SVG)',
            count: switchers.length,
            selectors: Array.from(switchers).slice(0, 3).map(el => Array.from(el.classList).join('.'))
        });
    }

    // 4. Поиск блока CRM карточек
    const crmCards = doc.querySelectorAll('[class*="crm-card"], [class*="crm"]');
    if (crmCards.length > 0) {
        analysis.foundElements.push({
            type: 'crm-cards',
            description: 'Блок CRM карточек',
            count: crmCards.length,
            selector: Array.from(crmCards[0].classList).join('.'),
            html: crmCards[0].outerHTML.substring(0, 500)
        });
    }

    // 5. Поиск блока истории с постраничным перелистыванием
    const historyBlock = doc.querySelector('[class*="block-mgts-history"], [class*="history-timeline"], [class*="history-content"]');
    if (historyBlock) {
        const tabs = historyBlock.querySelectorAll('[class*="tab"], [class*="button-item"]');
        const pagination = historyBlock.querySelector('[class*="pagination"], [class*="page"], [class*="перелист"]');
        analysis.foundElements.push({
            type: 'history-timeline',
            description: 'Блок истории с постраничным перелистыванием',
            selector: Array.from(historyBlock.classList).join('.'),
            hasTabs: tabs.length > 0,
            tabsCount: tabs.length,
            hasPagination: !!pagination,
            html: historyBlock.outerHTML.substring(0, 1000)
        });
    } else if (html.toLowerCase().includes('история') && doc.querySelector('h2, h3')) {
        // Проверяем, есть ли заголовок "История" с табами
        const historyHeaders = Array.from(doc.querySelectorAll('h2, h3')).filter(h => {
            const text = h.textContent.toLowerCase();
            return text.includes('история') && !text.includes('история звонков');
        });
        
        if (historyHeaders.length > 0) {
            const historyHeader = historyHeaders[0];
            const parentSection = historyHeader.closest('section, div[class*="section"], div[class*="block"]');
            const tabs = parentSection ? parentSection.querySelectorAll('[class*="tab"], [class*="button-item"]') : [];
            
            if (tabs.length > 0 || parentSection?.querySelector('[class*="data-content-list"]')) {
                analysis.foundElements.push({
                    type: 'history-timeline',
                    description: 'Блок истории с постраничным перелистыванием',
                    selector: parentSection ? Array.from(parentSection.classList).join('.') : 'unknown',
                    hasTabs: tabs.length > 0,
                    tabsCount: tabs.length,
                    html: parentSection ? parentSection.outerHTML.substring(0, 1000) : null
                });
            }
        }
    }

    // 6. Поиск табличного представления файлов
    const filesList = doc.querySelector('[class*="files-list"], [class*="file-item"]');
    if (filesList) {
        const fileItems = doc.querySelectorAll('[class*="file-item"]');
        analysis.foundElements.push({
            type: 'files-table',
            description: 'Табличное представление файловых документов',
            count: fileItems.length,
            selector: Array.from(filesList.classList).join('.'),
            html: filesList.outerHTML.substring(0, 1000)
        });
    }

    // 7. Поиск табличного представления тарифов
    const tariffTable = doc.querySelector('[class*="tariff-table"], [class*="block-tariff-table"]');
    if (tariffTable) {
        const rows = tariffTable.querySelectorAll('[class*="row"], tr');
        analysis.foundElements.push({
            type: 'tariff-table',
            description: 'Табличное представление тарифов',
            rowsCount: rows.length,
            selector: Array.from(tariffTable.classList).join('.'),
            html: tariffTable.outerHTML.substring(0, 1000)
        });
    }

    // 8. Поиск мобильного приложения для Виртуальной АТС
    const mobileAppText = html.toLowerCase();
    if (mobileAppText.includes('мобильное приложение') && mobileAppText.includes('виртуальн')) {
        const h2Elements = Array.from(doc.querySelectorAll('h2, h3'));
        const mobileAppHeader = h2Elements.find(h => {
            const text = h.textContent.toLowerCase();
            return text.includes('мобильное приложение') && text.includes('виртуальн');
        });
        
        if (mobileAppHeader) {
            const section = mobileAppHeader.closest('section, div[class*="section"], div[class*="block"]');
            const hasSwitcher = section ? section.querySelectorAll('svg[onclick], [class*="switch"][onclick]').length > 0 : false;
            analysis.foundElements.push({
                type: 'mobile-app-section',
                description: 'Раздел "Мобильное приложение для Виртуальной АТС"',
                selector: section ? Array.from(section.classList).join('.') : 'unknown',
                hasImageSwitcher: hasSwitcher,
                html: section ? section.outerHTML.substring(0, 1000) : null
            });
        }
    }

    // 9. Поиск блока "Возможности интеграции с CRM"
    const crmIntegrationText = html.toLowerCase();
    if (crmIntegrationText.includes('возможности интеграции') && crmIntegrationText.includes('crm')) {
        const h2Elements = Array.from(doc.querySelectorAll('h2, h3'));
        const crmHeader = h2Elements.find(h => {
            const text = h.textContent.toLowerCase();
            return text.includes('интеграц') && text.includes('crm');
        });
        
        if (crmHeader) {
            const section = crmHeader.closest('section, div[class*="section"], div[class*="block"]');
            const hasCards = section ? section.querySelectorAll('[class*="crm-card"]').length > 0 : false;
            analysis.foundElements.push({
                type: 'crm-integration',
                description: 'Блок "Возможности интеграции с CRM"',
                selector: section ? Array.from(section.classList).join('.') : 'unknown',
                hasCards: hasCards,
                html: section ? section.outerHTML.substring(0, 1000) : null
            });
        }
    }

    dom.window.close();
    return analysis.foundElements.length > 0 ? analysis : null;
}

/**
 * Анализ форм обратной связи
 */
function analyzeForms(pageData) {
    const html = pageData.content?.html || '';
    if (!html) return null;

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Ищем реальные формы (не просто div с классом form)
    const forms = doc.querySelectorAll('form, [class*="request-form-container"]:not(form)');
    const formAnalysis = [];

    forms.forEach((form, i) => {
        // Проверяем, что это действительно форма (есть input или button submit)
        const hasInputs = form.querySelectorAll('input, textarea, select').length > 0;
        const hasSubmitButton = form.querySelector('button[type="submit"], input[type="submit"], button.button-request-form');
        
        if (hasInputs || hasSubmitButton) {
            // Определяем раздел по URL или section
            const section = pageData.section || 'unknown';
            
            // Ищем контакты для этого раздела
            const contacts = doc.querySelector('[class*="request-contacts"]');
            const email = contacts?.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.replace('mailto:', '');
            const phone = contacts?.querySelector('a[href^="tel:"]')?.getAttribute('href')?.replace('tel:', '');

            formAnalysis.push({
                index: i + 1,
                section: section,
                classes: Array.from(form.classList),
                hasInputs: hasInputs,
                hasSubmitButton: !!hasSubmitButton,
                inputsCount: form.querySelectorAll('input, textarea, select').length,
                recipientEmail: email || null,
                recipientPhone: phone || null,
                formType: determineFormType(section, form)
            });
        }
    });

    dom.window.close();
    return formAnalysis.length > 0 ? formAnalysis : null;
}

/**
 * Определить тип формы на основе раздела
 */
function determineFormType(section, formElement) {
    const sectionMap = {
        'business': 'business-request',
        'operators': 'operators-request',
        'government': 'government-request',
        'partners': 'partners-request',
        'developers': 'developers-request',
        'about_mgts': 'feedback'
    };
    
    return sectionMap[section] || 'general-request';
}

/**
 * Основная функция анализа
 */
async function analyzeSpecialElementsAll() {
    console.log('🔍 АНАЛИЗ НЕСТАНДАРТНЫХ ЭЛЕМЕНТОВ НА ВСЕХ СТРАНИЦАХ');
    console.log('='.repeat(70));

    const results = {
        timestamp: new Date().toISOString(),
        specialElements: [],
        formsAnalysis: [],
        summary: {
            totalPages: 0,
            pagesWithSpecialElements: 0,
            pagesWithForms: 0,
            elementTypes: {}
        }
    };

    // Получаем все JSON файлы страниц
    const allFiles = fs.readdirSync(PAGES_CONTENT_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .sort();
    
    console.log(`\n📚 Найдено страниц для анализа: ${allFiles.length}\n`);

    // Анализ всех страниц
    for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        const filePath = path.join(PAGES_CONTENT_DIR, file);
        
        try {
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const slug = pageData.slug || file.replace('.json', '');
            
            results.summary.totalPages++;
            
            // Показываем прогресс каждые 10 страниц
            if ((i + 1) % 10 === 0 || i === 0) {
                console.log(`[${i + 1}/${allFiles.length}] Обработка: ${slug}...`);
            }
            
            // Анализ специальных элементов
            const elementAnalysis = analyzeSpecialElements(pageData, slug);
            if (elementAnalysis && elementAnalysis.foundElements.length > 0) {
                results.specialElements.push(elementAnalysis);
                results.summary.pagesWithSpecialElements++;
                
                // Подсчет типов элементов
                elementAnalysis.foundElements.forEach(el => {
                    if (!results.summary.elementTypes[el.type]) {
                        results.summary.elementTypes[el.type] = 0;
                    }
                    results.summary.elementTypes[el.type]++;
                });
                
                // Выводим информацию о найденных элементах
                if ((i + 1) % 10 === 0 || i === 0) {
                    console.log(`   ✅ Найдено элементов: ${elementAnalysis.foundElements.length}`);
                    elementAnalysis.foundElements.forEach(el => {
                        console.log(`      - ${el.type}: ${el.description}`);
                    });
                }
            }

            // Анализ форм
            const forms = analyzeForms(pageData);
            if (forms && forms.length > 0) {
                results.formsAnalysis.push({
                    pageSlug: slug,
                    url: pageData.url,
                    section: pageData.section,
                    forms: forms
                });
                results.summary.pagesWithForms++;
            }
        } catch (error) {
            console.error(`   ❌ Ошибка при обработке ${file}: ${error.message}`);
        }
    }

    // Группировка форм по разделам
    const formsBySection = {};
    results.formsAnalysis.forEach(pageForm => {
        const section = pageForm.section || 'unknown';
        if (!formsBySection[section]) {
            formsBySection[section] = [];
        }
        formsBySection[section].push(...pageForm.forms);
    });
    results.formsBySection = formsBySection;

    // Сохранение результатов
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');

    console.log(`\n======================================================================`);
    console.log(`📊 ИТОГОВАЯ СТАТИСТИКА`);
    console.log(`======================================================================`);
    console.log(`Всего страниц проанализировано: ${results.summary.totalPages}`);
    console.log(`Страниц с нестандартными элементами: ${results.summary.pagesWithSpecialElements}`);
    console.log(`Страниц с формами: ${results.summary.pagesWithForms}`);
    console.log(`\nТипы найденных элементов:`);
    for (const [type, count] of Object.entries(results.summary.elementTypes)) {
        console.log(`  ${type}: ${count} раз(а)`);
    }
    console.log(`\nФормы по разделам:`);
    for (const [section, forms] of Object.entries(formsBySection)) {
        console.log(`  ${section}: ${forms.length} форм`);
    }
    console.log(`\n📁 Результаты сохранены в: ${OUTPUT_FILE}`);
    console.log(`======================================================================`);

    return results;
}

if (require.main === module) {
    analyzeSpecialElementsAll().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { analyzeSpecialElementsAll, analyzeSpecialElements, analyzeForms };
