/**
 * Скрипт для семантического анализа страниц в Strapi
 * Определяет услуги на основе анализа контента страниц
 * 
 * Задачи:
 * 1. Загрузить все страницы из Strapi с контентом
 * 2. Проанализировать контент каждой страницы
 * 3. Определить, является ли страница услугой
 * 4. Построить дерево услуг на основе анализа
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    console.error('\nСоздайте токен в Strapi:');
    console.error('  1. Откройте http://localhost:1337/admin');
    console.error('  2. Settings → API Tokens → Create new API Token');
    console.error('  3. Name: Pages Semantics Analysis');
    console.error('  4. Token duration: Unlimited');
    console.error('  5. Token type: Full access');
    console.error('  6. Скопируйте токен и установите:');
    console.error('     export STRAPI_API_TOKEN="your_token_here"\n');
    process.exit(1);
}

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Пути к файлам
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const REPORT_FILE = path.join(OUTPUT_DIR, 'pages-semantics-analysis.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/PAGES_SEMANTICS_ANALYSIS.md');

// Ключевые слова для определения услуг
const SERVICE_KEYWORDS = {
    business: ['тариф', 'подключ', 'услуг', 'заказ', 'оформ', 'стоимость', 'цена', 'оплат', 'абонент'],
    operators: ['присоединен', 'трафик', 'инфраструктур', 'канал', 'соединен', 'доступ'],
    government: ['госзаказ', 'государств', 'муниципальн', 'бюджет', 'тендер'],
    partners: ['партнер', 'договор', 'сотрудничеств', 'закупк'],
    developers: ['застройщик', 'подключен', 'объект', 'недвижимост', 'строительств']
};

const EXCLUDED_KEYWORDS = [
    'новост', 'контакт', 'о компани', 'о нас', 'истори', 'руководств', 'ваканс',
    'документ', 'политик', 'соглашен', 'лиценз', 'реквизит', 'обращен', 'генеральн'
];

/**
 * Загрузить все страницы из Strapi с контентом
 */
async function loadStrapiPages() {
    console.log('📦 Загрузка страниц из Strapi с контентом...\n');
    
    try {
        let allPages = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await api.get('/pages', {
                params: {
                    'pagination[page]': page,
                    'pagination[pageSize]': 100,
                    'populate': '*',
                    'publicationState': 'live' // Только опубликованные страницы
                }
            });
            
            const pages = response.data.data || [];
            allPages = allPages.concat(pages);
            
            const pagination = response.data.meta?.pagination;
            if (pagination && page < pagination.pageCount) {
                page++;
            } else {
                hasMore = false;
            }
        }
        
        console.log(`✅ Загружено страниц из Strapi: ${allPages.length}\n`);
        return allPages;
    } catch (error) {
        console.error('❌ Ошибка при загрузке страниц из Strapi:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        throw error;
    }
}

/**
 * Извлечь текст из HTML
 */
function extractTextFromHTML(html) {
    if (!html) return '';
    
    try {
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        // Удаляем скрипты и стили
        const scripts = doc.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        return doc.body.textContent || '';
    } catch (error) {
        // Если не HTML, возвращаем как есть
        return String(html);
    }
}

/**
 * Извлечь текст из RichText (Strapi)
 */
function extractTextFromRichText(richText) {
    if (!richText) return '';
    
    if (typeof richText === 'string') {
        return extractTextFromHTML(richText);
    }
    
    // Если это объект Strapi RichText
    if (richText.type === 'doc' && richText.content) {
        let text = '';
        function traverse(node) {
            if (node.type === 'text' && node.text) {
                text += node.text + ' ';
            }
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach(traverse);
            }
        }
        traverse(richText);
        return text;
    }
    
    return String(richText);
}

/**
 * Определить секцию на основе контента
 */
function detectSectionFromContent(text, title, slug) {
    const lowerText = (text + ' ' + title + ' ' + slug).toLowerCase();
    
    // Проверяем исключающие ключевые слова
    if (EXCLUDED_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
        return null;
    }
    
    // Определяем секцию по slug (приоритет 1)
    if (slug) {
        const slugLower = slug.toLowerCase();
        // Проверяем начало slug или наличие секции в пути (может быть business/internet или business_internet)
        if (slugLower.startsWith('business') || slugLower.includes('/business') || slugLower.includes('business/') || slugLower.includes('business_') || slugLower === 'business') {
            return 'business';
        } else if (slugLower.startsWith('operators') || slugLower.includes('/operators') || slugLower.includes('operators/') || slugLower.includes('operators_') || slugLower === 'operators') {
            return 'operators';
        } else if (slugLower.startsWith('government') || slugLower.includes('/government') || slugLower.includes('government/') || slugLower.includes('government_') || slugLower === 'government') {
            return 'government';
        } else if (slugLower.startsWith('partners') || slugLower.includes('/partners') || slugLower.includes('partners/') || slugLower.includes('partners_') || slugLower === 'partners') {
            return 'partners';
        } else if (slugLower.startsWith('developers') || slugLower.includes('/developers') || slugLower.includes('developers/') || slugLower.includes('developers_') || slugLower === 'developers') {
            return 'developers';
        }
    }
    
    // Подсчитываем совпадения по секциям (приоритет 2)
    const scores = {
        business: 0,
        operators: 0,
        government: 0,
        partners: 0,
        developers: 0
    };
    
    Object.keys(SERVICE_KEYWORDS).forEach(section => {
        SERVICE_KEYWORDS[section].forEach(keyword => {
            if (lowerText.includes(keyword)) {
                scores[section]++;
            }
        });
    });
    
    // Находим секцию с максимальным счетом
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return null;
    
    const detectedSection = Object.keys(scores).find(section => scores[section] === maxScore);
    return detectedSection;
}

/**
 * Определить, является ли страница услугой
 */
function isServicePage(page, contentText) {
    const slug = page.attributes?.slug || '';
    const title = page.attributes?.title || '';
    const lowerText = (contentText + ' ' + title + ' ' + slug).toLowerCase();
    
    // Исключаем определенные типы страниц
    const excludedPatterns = [
        'новост', 'news', 'контакт', 'contact', 'о компани', 'about',
        'документ', 'document', 'политик', 'policy', 'соглашен', 'agreement',
        'лиценз', 'license', 'реквизит', 'details', 'обращен', 'message',
        'генеральн', 'director', 'ваканс', 'vacancy', 'истори', 'history',
        'home', 'index', 'bank_details', 'cookie', 'data_processing'
    ];
    
    // Проверяем slug на исключения
    if (excludedPatterns.some(pattern => slug.includes(pattern))) {
        return false;
    }
    
    // Если slug начинается с секции услуг, это скорее всего услуга
    const serviceSectionSlugs = ['business', 'operators', 'government', 'partners', 'developers'];
    const hasServiceSectionSlug = serviceSectionSlugs.some(section => 
        slug.startsWith(section) || slug.includes(section + '_')
    );
    
    // Проверяем наличие ключевых слов услуг
    const serviceIndicators = [
        'тариф', 'tariff', 'подключ', 'connect', 'услуг', 'service',
        'заказ', 'order', 'оформ', 'apply', 'стоимость', 'price',
        'цена', 'cost', 'оплат', 'payment', 'абонент', 'subscriber',
        'интернет', 'internet', 'телефон', 'phone', 'телефон', 'telephony',
        'видеонаблюден', 'surveillance', 'охрана', 'security', 'сигнализац',
        'мобильн', 'mobile', 'ip-телефон', 'ip-telephony', 'виртуальн', 'virtual',
        'gpon', 'выделен', 'dedicated', 'локальн', 'local', 'сеть', 'network'
    ];
    
    const hasServiceIndicators = serviceIndicators.some(indicator => 
        lowerText.includes(indicator)
    );
    
    // Проверяем структуру контента (наличие секций с тарифами, формами заказа и т.д.)
    const hasServiceStructure = lowerText.includes('service-tariffs') || 
                                lowerText.includes('service-order-form') ||
                                lowerText.includes('service-faq') ||
                                lowerText.includes('service-tariff');
    
    // Если slug указывает на секцию услуг И (есть ключевые слова ИЛИ есть структура услуг)
    if (hasServiceSectionSlug) {
        return hasServiceIndicators || hasServiceStructure || contentText.length > 100;
    }
    
    // Иначе проверяем только ключевые слова и структуру
    return hasServiceIndicators || hasServiceStructure;
}

/**
 * Семантический анализ страниц
 */
function analyzePagesSemantics(pages) {
    console.log('🔍 Семантический анализ контента страниц...\n');
    
    const analysis = {
        totalPages: pages.length,
        servicePages: [],
        nonServicePages: [],
        bySection: {
            business: [],
            operators: [],
            government: [],
            partners: [],
            developers: [],
            other: []
        }
    };
    
    pages.forEach((page, index) => {
        if ((index + 1) % 10 === 0) {
            console.log(`  Обработано: ${index + 1}/${pages.length} страниц...`);
        }
        
        // В Strapi v5 поля находятся напрямую в объекте, а не в attributes
        const slug = page.slug || page.attributes?.slug || '';
        const title = page.title || page.attributes?.title || '';
        const content = page.content || page.attributes?.content || '';
        const heroTitle = page.heroTitle || page.attributes?.heroTitle || '';
        const heroSubtitle = page.heroSubtitle || page.attributes?.heroSubtitle || '';
        const section = page.section || page.attributes?.section || null;
        const parent = page.parent || page.attributes?.parent || null;
        const originalUrl = page.originalUrl || page.attributes?.originalUrl || '';
        const originalSlug = page.originalSlug || page.attributes?.originalSlug || '';
        const order = page.order || page.attributes?.order || 0;
        
        // Извлекаем текст из контента
        let contentText = '';
        if (content) {
            if (typeof content === 'string') {
                contentText = extractTextFromHTML(content);
            } else {
                contentText = extractTextFromRichText(content);
            }
        }
        
        const fullText = (contentText + ' ' + heroTitle + ' ' + heroSubtitle + ' ' + title).toLowerCase();
        
        // Определяем, является ли страница услугой
        const isService = isServicePage(page, fullText);
        
        // Определяем секцию
        // Если section не заполнено или равно 'other', пытаемся определить по контенту
        let detectedSection = section;
        if (!detectedSection || detectedSection === 'other') {
            detectedSection = detectSectionFromContent(fullText, title, slug) || section || 'other';
        }
        
        // Получаем информацию о родителе
        let parentId = null;
        let parentSlug = null;
        if (parent) {
            if (typeof parent === 'object') {
                parentId = parent.id || parent.data?.id || null;
                parentSlug = parent.slug || parent.data?.slug || parent.data?.attributes?.slug || null;
            }
        }
        
        const pageAnalysis = {
            id: page.id,
            slug: slug,
            title: title,
            section: detectedSection || 'other',
            isService: isService,
            hasContent: contentText.length > 0,
            contentLength: contentText.length,
            parentId: parentId,
            parentSlug: parentSlug,
            originalUrl: originalUrl,
            originalSlug: originalSlug,
            order: order,
            keywords: extractKeywords(fullText),
            path: []
        };
        
        if (isService) {
            analysis.servicePages.push(pageAnalysis);
            const sectionKey = detectedSection || 'other';
            if (!analysis.bySection[sectionKey]) {
                analysis.bySection[sectionKey] = [];
            }
            analysis.bySection[sectionKey].push(pageAnalysis);
        } else {
            analysis.nonServicePages.push(pageAnalysis);
        }
    });
    
    // Строим пути для услуг
    const pagesById = new Map();
    analysis.servicePages.forEach(p => pagesById.set(p.id, p));
    
    analysis.servicePages.forEach(pageAnalysis => {
        const path = [];
        let currentId = pageAnalysis.id;
        let currentPage = pageAnalysis;
        
        while (currentPage && currentPage.parentId) {
            if (pagesById.has(currentPage.parentId)) {
                const parent = pagesById.get(currentPage.parentId);
                path.unshift(parent.slug);
                currentPage = parent;
                currentId = parent.id;
            } else {
                break;
            }
        }
        
        path.push(pageAnalysis.slug);
        pageAnalysis.path = path;
        pageAnalysis.fullPath = '/' + path.join('/');
    });
    
    console.log(`\n✅ Анализ завершен:\n`);
    console.log(`   Всего страниц: ${analysis.totalPages}`);
    console.log(`   Страниц-услуг: ${analysis.servicePages.length}`);
    console.log(`   Не услуг: ${analysis.nonServicePages.length}`);
    console.log(`\n   По секциям:`);
    Object.keys(analysis.bySection).forEach(section => {
        if (analysis.bySection[section].length > 0) {
            console.log(`     ${section}: ${analysis.bySection[section].length}`);
        }
    });
    console.log('');
    
    return analysis;
}

/**
 * Извлечь ключевые слова из текста
 */
function extractKeywords(text) {
    const keywords = [];
    const lowerText = text.toLowerCase();
    
    Object.keys(SERVICE_KEYWORDS).forEach(section => {
        SERVICE_KEYWORDS[section].forEach(keyword => {
            if (lowerText.includes(keyword)) {
                keywords.push(keyword);
            }
        });
    });
    
    return [...new Set(keywords)].slice(0, 10);
}

/**
 * Создать отчет
 */
function createReport(analysis) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalPages: analysis.totalPages,
            servicePages: analysis.servicePages.length,
            nonServicePages: analysis.nonServicePages.length,
            bySection: {}
        },
        servicePages: analysis.servicePages,
        nonServicePages: analysis.nonServicePages,
        bySection: analysis.bySection
    };
    
    Object.keys(analysis.bySection).forEach(section => {
        report.summary.bySection[section] = analysis.bySection[section].length;
    });
    
    // Сохраняем JSON отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSON отчет сохранен: ${REPORT_FILE}\n`);
    
    // Создаем Markdown отчет
    let mdReport = `# Семантический анализ страниц Strapi\n\n`;
    mdReport += `**Дата анализа:** ${new Date().toISOString()}\n\n`;
    mdReport += `## 📊 Сводка\n\n`;
    mdReport += `- **Всего страниц:** ${report.summary.totalPages}\n`;
    mdReport += `- **Страниц-услуг:** ${report.summary.servicePages}\n`;
    mdReport += `- **Не услуг:** ${report.summary.nonServicePages}\n\n`;
    
    mdReport += `### Распределение услуг по секциям:\n\n`;
    Object.keys(report.summary.bySection).forEach(section => {
        const count = report.summary.bySection[section];
        if (count > 0) {
            mdReport += `- **${section}:** ${count}\n`;
        }
    });
    mdReport += `\n`;
    
    if (report.servicePages.length > 0) {
        mdReport += `## 🌳 Дерево услуг\n\n`;
        
        Object.keys(analysis.bySection).forEach(section => {
            const services = analysis.bySection[section];
            if (services.length === 0) return;
            
            mdReport += `### ${section.toUpperCase()} (${services.length} услуг)\n\n`;
            
            // Группируем по родителям
            const byParent = new Map();
            services.forEach(service => {
                const parentSlug = service.parentSlug || 'root';
                if (!byParent.has(parentSlug)) {
                    byParent.set(parentSlug, []);
                }
                byParent.get(parentSlug).push(service);
            });
            
            byParent.forEach((children, parentSlug) => {
                if (parentSlug !== 'root') {
                    mdReport += `#### ${parentSlug}\n\n`;
                }
                children.sort((a, b) => a.order - b.order).forEach(service => {
                    mdReport += `- **${service.title}** (\`${service.slug}\`)\n`;
                    mdReport += `  - Путь: ${service.fullPath || service.path.join('/')}\n`;
                    if (service.keywords.length > 0) {
                        mdReport += `  - Ключевые слова: ${service.keywords.join(', ')}\n`;
                    }
                    mdReport += `\n`;
                });
            });
            
            mdReport += `\n`;
        });
    }
    
    if (report.nonServicePages.length > 0) {
        mdReport += `## 📄 Страницы, не являющиеся услугами\n\n`;
        mdReport += `| Slug | Название | Секция |\n`;
        mdReport += `|------|----------|--------|\n`;
        
        report.nonServicePages.slice(0, 20).forEach(page => {
            mdReport += `| ${page.slug} | ${page.title} | ${page.section} |\n`;
        });
        
        if (report.nonServicePages.length > 20) {
            mdReport += `\n*... и еще ${report.nonServicePages.length - 20} страниц*\n`;
        }
        
        mdReport += `\n`;
    }
    
    mdReport += `## 📝 Выводы\n\n`;
    mdReport += `1. **Найдено ${report.summary.servicePages} страниц-услуг** в Strapi\n`;
    mdReport += `2. Услуги распределены по ${Object.keys(report.summary.bySection).filter(s => report.summary.bySection[s] > 0).length} секциям\n`;
    mdReport += `3. Дерево услуг построено на основе анализа контента и структуры страниц\n\n`;
    
    fs.writeFileSync(REPORT_MD_FILE, mdReport, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${REPORT_MD_FILE}\n`);
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔍 Семантический анализ страниц Strapi\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // 1. Загрузить страницы из Strapi
        const pages = await loadStrapiPages();
        
        // 2. Провести семантический анализ
        const analysis = analyzePagesSemantics(pages);
        
        // 3. Создать отчет
        createReport(analysis);
        
        console.log('✅ Анализ завершен!\n');
        console.log('📊 Результаты:');
        console.log(`   - Всего страниц: ${analysis.totalPages}`);
        console.log(`   - Страниц-услуг: ${analysis.servicePages.length}`);
        console.log(`   - Не услуг: ${analysis.nonServicePages.length}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при выполнении анализа:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, loadStrapiPages, analyzePagesSemantics };
