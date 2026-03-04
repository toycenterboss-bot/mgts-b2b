/**
 * Скрипт для семантического анализа контента страниц в Strapi
 * для выделения услуг непосредственно из контента
 * 
 * Задачи:
 * 1. Загрузить все страницы из Strapi с их контентом
 * 2. Проанализировать контент каждой страницы (HTML, текст, компоненты)
 * 3. Определить, является ли страница услугой на основе контента
 * 4. Построить дерево услуг на основе анализа контента
 * 5. Создать отчет с классификацией страниц
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
    console.error('  3. Name: Pages Content Analysis Script');
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
const NORMALIZED_DIR = path.join(OUTPUT_DIR, 'pages-content-normalized');
const REPORT_FILE = path.join(OUTPUT_DIR, 'pages-content-semantic-analysis.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/PAGES_CONTENT_SEMANTIC_ANALYSIS.md');

/**
 * Индикаторы услуги в контенте
 */
const SERVICE_INDICATORS = {
    // Компоненты, указывающие на услугу
    components: [
        'service-tariffs',      // Тарифы услуги
        'service-faq',          // FAQ по услуге
        'service-order-form',   // Форма заказа услуги
        'section-cards',        // Карточки с описанием услуги
        'section-map'           // Карта с объектами услуги
    ],
    // Ключевые слова в тексте
    keywords: [
        'услуга', 'услуги', 'тариф', 'тарифы', 'подключить', 'подключение',
        'заказать', 'заявка', 'оформить', 'оформить заявку', 'стоимость',
        'цена', 'рублей', 'руб/мес', 'в месяц', 'оплата', 'оплатить',
        'характеристики', 'возможности', 'функции', 'преимущества'
    ],
    // Паттерны в URL/slug
    urlPatterns: [
        /^\/business\//,
        /^\/operators\//,
        /^\/government\//,
        /^\/partners\//,
        /^\/developers\//
    ],
    // Исключения (не услуги)
    exclusions: [
        'news', 'новости', 'about', 'о компании', 'контакты', 'contact',
        'home', 'index', 'главная', 'документы', 'documents', 'политика',
        'policy', 'оферта', 'offer', 'лицензии', 'licenses'
    ]
};

/**
 * Загрузить страницы из Strapi и объединить с нормализованным HTML
 */
async function loadStrapiPagesWithContent() {
    console.log('📦 Загрузка страниц из Strapi...\n');
    
    let allPages = [];
    
    try {
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await api.get('/pages', {
                params: {
                    'pagination[page]': page,
                    'pagination[pageSize]': 100,
                    'populate': ['parent']
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
    } catch (error) {
        console.warn('⚠️  Не удалось загрузить страницы из Strapi:', error.message);
        console.warn('   Будет использован только анализ нормализованных HTML файлов\n');
    }
    
    // Загружаем нормализованные HTML файлы
    console.log('📦 Загрузка нормализованных HTML файлов...\n');
    
    const normalizedFiles = [];
    if (fs.existsSync(NORMALIZED_DIR)) {
        const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
        
        files.forEach(file => {
            try {
                const filePath = path.join(NORMALIZED_DIR, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const slug = data.slug || file.replace('.json', '');
                
                // Находим соответствующую страницу в Strapi или создаем объект
                let page = allPages.find(p => p.attributes?.slug === slug);
                if (!page) {
                    page = {
                        id: null,
                        attributes: {
                            slug: slug,
                            title: data.title || slug,
                            section: data.section || null,
                            content: '',
                            heroTitle: data.heroTitle || data.title || '',
                            heroSubtitle: data.heroSubtitle || '',
                            metaDescription: data.metaDescription || '',
                            originalUrl: data.url || data.originalUrl || '',
                            parent: null,
                            order: 0
                        }
                    };
                }
                
                // Добавляем нормализованный HTML в контент
                if (data.normalizedHTML) {
                    page.attributes.content = data.normalizedHTML;
                    page.attributes.hasNormalizedContent = true;
                }
                
                normalizedFiles.push(page);
            } catch (error) {
                console.warn(`⚠️  Ошибка при загрузке ${file}:`, error.message);
            }
        });
        
        console.log(`✅ Загружено нормализованных файлов: ${normalizedFiles.length}\n`);
    } else {
        console.warn(`⚠️  Директория ${NORMALIZED_DIR} не найдена\n`);
    }
    
    // Объединяем данные: приоритет у нормализованных файлов
    const mergedPages = [];
    const processedSlugs = new Set();
    
    // Сначала добавляем страницы с нормализованным контентом
    normalizedFiles.forEach(page => {
        const slug = page.attributes?.slug;
        if (slug) {
            mergedPages.push(page);
            processedSlugs.add(slug);
        }
    });
    
    // Затем добавляем страницы из Strapi, которых нет в нормализованных
    allPages.forEach(page => {
        const slug = page.attributes?.slug;
        if (slug && !processedSlugs.has(slug)) {
            mergedPages.push(page);
        }
    });
    
    console.log(`✅ Всего страниц для анализа: ${mergedPages.length}\n`);
    
    return mergedPages;
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
 * Извлечь компоненты из контента страницы
 */
function extractComponentsFromContent(content) {
    const components = [];
    
    if (!content) return components;
    
    // Если content - это массив компонентов Strapi
    if (Array.isArray(content)) {
        content.forEach(item => {
            if (item && item.__component) {
                components.push(item.__component);
            }
        });
    }
    
    // Если content - это HTML строка
    if (typeof content === 'string' && content.includes('<')) {
        try {
            const dom = new JSDOM(content);
            const doc = dom.window.document;
            
            // Ищем секции с классами компонентов
            const sections = doc.querySelectorAll('section[class]');
            sections.forEach(section => {
                const className = section.className;
                if (typeof className === 'string') {
                    const classes = className.split(' ');
                    classes.forEach(cls => {
                        if (SERVICE_INDICATORS.components.includes(cls)) {
                            components.push(cls);
                        }
                    });
                }
            });
        } catch (error) {
            // Игнорируем ошибки парсинга
        }
    }
    
    return [...new Set(components)]; // Уникальные компоненты
}

/**
 * Загрузить нормализованный HTML для страницы
 */
function loadNormalizedHTML(slug) {
    const filePath = path.join(NORMALIZED_DIR, `${slug}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return data.normalizedHTML || '';
        } catch (error) {
            return '';
        }
    }
    return '';
}

/**
 * Анализировать контент страницы на предмет услуги
 */
function analyzePageContent(page) {
    const analysis = {
        isService: false,
        confidence: 0,
        indicators: [],
        components: [],
        keywords: [],
        section: null,
        serviceType: null,
        reasons: [],
        path: [],
        fullPath: ''
    };
    
    const slug = page.attributes?.slug || '';
    const title = page.attributes?.title || '';
    // content может быть richtext (строка) или компонентами
    let content = page.attributes?.content || '';
    
    // Если контент пустой в Strapi, пытаемся загрузить из нормализованного HTML
    if (!content || String(content).trim().length < 100) {
        const normalizedHTML = loadNormalizedHTML(slug);
        if (normalizedHTML) {
            content = normalizedHTML;
            analysis.reasons.push('Контент загружен из нормализованного HTML');
        }
    }
    
    const heroTitle = page.attributes?.heroTitle || '';
    const heroSubtitle = page.attributes?.heroSubtitle || '';
    const metaDescription = page.attributes?.metaDescription || '';
    
    // Проверка исключений
    const isExcluded = SERVICE_INDICATORS.exclusions.some(ex => 
        slug.toLowerCase().includes(ex.toLowerCase()) || 
        title.toLowerCase().includes(ex.toLowerCase())
    );
    
    if (isExcluded) {
        analysis.reasons.push('Исключено по slug/title');
        return analysis;
    }
    
    // Извлекаем весь текст
    const allText = [
        title,
        heroTitle,
        heroSubtitle,
        metaDescription,
        extractTextFromHTML(content)
    ].join(' ').toLowerCase();
    
    // 1. Проверка компонентов
    const components = extractComponentsFromContent(content);
    analysis.components = components;
    
    const serviceComponents = components.filter(c => 
        SERVICE_INDICATORS.components.includes(c)
    );
    
    if (serviceComponents.length > 0) {
        analysis.indicators.push('service-components');
        analysis.confidence += 30 * serviceComponents.length;
        analysis.reasons.push(`Найдены компоненты услуг: ${serviceComponents.join(', ')}`);
    }
    
    // 2. Проверка ключевых слов
    const foundKeywords = SERVICE_INDICATORS.keywords.filter(keyword => 
        allText.includes(keyword.toLowerCase())
    );
    analysis.keywords = foundKeywords;
    
    if (foundKeywords.length > 0) {
        analysis.indicators.push('service-keywords');
        analysis.confidence += Math.min(30, foundKeywords.length * 5);
        analysis.reasons.push(`Найдены ключевые слова: ${foundKeywords.slice(0, 5).join(', ')}`);
    }
    
    // 3. Проверка URL паттернов
    const url = page.attributes?.originalUrl || '';
    const urlMatches = SERVICE_INDICATORS.urlPatterns.some(pattern => 
        pattern.test(url) || pattern.test('/' + slug)
    );
    
    if (urlMatches) {
        analysis.indicators.push('service-url-pattern');
        analysis.confidence += 20;
        analysis.reasons.push('URL соответствует паттерну услуги');
    }
    
    // 4. Определение секции по slug/URL
    let detectedSection = page.attributes?.section;
    if (!detectedSection) {
        if (slug.startsWith('business') || slug.includes('business_') || url.includes('/business/')) {
            detectedSection = 'business';
        } else if (slug.startsWith('operators') || slug.includes('operators_') || url.includes('/operators/')) {
            detectedSection = 'operators';
        } else if (slug.startsWith('government') || slug.includes('government_') || url.includes('/government/')) {
            detectedSection = 'government';
        } else if (slug.startsWith('partners') || slug.includes('partners_') || url.includes('/partners/')) {
            detectedSection = 'partners';
        } else if (slug.startsWith('developers') || slug.includes('developers_') || url.includes('/developers/')) {
            detectedSection = 'developers';
        }
    }
    analysis.section = detectedSection;
    
    if (detectedSection) {
        analysis.confidence += 10;
        analysis.reasons.push(`Определена секция: ${detectedSection}`);
    }
    
    // 5. Определение типа услуги по компонентам
    if (serviceComponents.includes('service-tariffs')) {
        analysis.serviceType = 'tariff-service';
    } else if (serviceComponents.includes('service-order-form')) {
        analysis.serviceType = 'orderable-service';
    } else if (serviceComponents.includes('service-faq')) {
        analysis.serviceType = 'faq-service';
    }
    
    // Итоговое решение
    analysis.isService = analysis.confidence >= 30; // Порог уверенности
    
    if (analysis.isService) {
        analysis.reasons.push(`Уверенность: ${analysis.confidence}%`);
    } else {
        analysis.reasons.push(`Низкая уверенность: ${analysis.confidence}%`);
    }
    
    return analysis;
}

/**
 * Построить дерево услуг на основе анализа
 */
function buildServicesTreeFromAnalysis(pagesWithAnalysis) {
    const services = {
        flat: [],
        bySlug: new Map(),
        bySection: {}
    };
    
    // Фильтруем только услуги
    const servicePages = pagesWithAnalysis.filter(p => p.analysis.isService);
    
    servicePages.forEach(page => {
        const analysis = page.analysis;
        const attrs = page.attributes || {};
        
        const serviceData = {
            id: page.id,
            name: attrs.title || attrs.slug || '',
            slug: attrs.slug || '',
            section: analysis.section || 'unknown',
            serviceType: analysis.serviceType,
            confidence: analysis.confidence,
            parentId: attrs.parent?.data?.id || null,
            parentSlug: attrs.parent?.data?.attributes?.slug || null,
            originalUrl: attrs.originalUrl || '',
            originalSlug: attrs.originalSlug || '',
            components: analysis.components,
            keywords: analysis.keywords,
            path: [],
            fullPath: '',
            order: attrs.order || 0
        };
        
        services.flat.push(serviceData);
        services.bySlug.set(serviceData.slug, serviceData);
        
        // Группируем по секциям
        const section = serviceData.section;
        if (!services.bySection[section]) {
            services.bySection[section] = [];
        }
        services.bySection[section].push(serviceData);
    });
    
    // Строим пути
    const byId = new Map();
    services.flat.forEach(s => byId.set(s.id, s));
    
    services.flat.forEach(service => {
        const path = [];
        let currentId = service.id;
        let current = service;
        
        while (current) {
            path.unshift(current.slug);
            if (current.parentId && byId.has(current.parentId)) {
                current = byId.get(current.parentId);
                currentId = current.id;
            } else {
                break;
            }
        }
        
        service.path = path;
        service.fullPath = '/' + path.join('/');
    });
    
    // Сортируем по секциям
    Object.keys(services.bySection).forEach(section => {
        services.bySection[section].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            return a.slug.localeCompare(b.slug);
        });
    });
    
    return services;
}

/**
 * Создать отчет
 */
function createReport(pagesWithAnalysis, servicesTree) {
    const servicePages = pagesWithAnalysis.filter(p => p.analysis.isService);
    const nonServicePages = pagesWithAnalysis.filter(p => !p.analysis.isService);
    
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalPages: pagesWithAnalysis.length,
            servicePages: servicePages.length,
            nonServicePages: nonServicePages.length,
            bySection: {},
            byServiceType: {},
            byConfidence: {
                high: servicePages.filter(p => p.analysis.confidence >= 60).length,
                medium: servicePages.filter(p => p.analysis.confidence >= 40 && p.analysis.confidence < 60).length,
                low: servicePages.filter(p => p.analysis.confidence >= 30 && p.analysis.confidence < 40).length
            }
        },
        servicesTree: servicesTree.bySection,
        services: servicePages.map(p => {
            const attrs = p.attributes || {};
            return {
                id: p.id,
                name: attrs.title || attrs.slug || '',
                slug: attrs.slug || '',
                section: p.analysis.section,
                serviceType: p.analysis.serviceType,
                confidence: p.analysis.confidence,
                components: p.analysis.components,
                keywords: p.analysis.keywords.slice(0, 5),
                reasons: p.analysis.reasons,
                path: p.analysis.path || [],
                fullPath: p.analysis.fullPath || ''
            };
        }),
        nonServices: nonServicePages.map(p => {
            const attrs = p.attributes || {};
            return {
                id: p.id,
                name: attrs.title || attrs.slug || '',
                slug: attrs.slug || '',
                confidence: p.analysis.confidence,
                reasons: p.analysis.reasons
            };
        })
    };
    
    // Статистика по секциям
    servicePages.forEach(p => {
        const section = p.analysis.section || 'unknown';
        report.summary.bySection[section] = (report.summary.bySection[section] || 0) + 1;
    });
    
    // Статистика по типам услуг
    servicePages.forEach(p => {
        const type = p.analysis.serviceType || 'unknown';
        report.summary.byServiceType[type] = (report.summary.byServiceType[type] || 0) + 1;
    });
    
    // Сохраняем JSON отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSON отчет сохранен: ${REPORT_FILE}\n`);
    
    // Создаем Markdown отчет
    let mdReport = `# Семантический анализ контента страниц Strapi\n\n`;
    mdReport += `**Дата анализа:** ${new Date().toISOString()}\n\n`;
    mdReport += `## 📊 Сводка\n\n`;
    mdReport += `- **Всего страниц:** ${report.summary.totalPages}\n`;
    mdReport += `- **Страниц-услуг:** ${report.summary.servicePages}\n`;
    mdReport += `- **Не услуги:** ${report.summary.nonServicePages}\n\n`;
    
    mdReport += `### Распределение по секциям:\n\n`;
    Object.keys(report.summary.bySection).sort().forEach(section => {
        mdReport += `- **${section}:** ${report.summary.bySection[section]}\n`;
    });
    mdReport += `\n`;
    
    mdReport += `### Распределение по типам услуг:\n\n`;
    Object.keys(report.summary.byServiceType).sort().forEach(type => {
        mdReport += `- **${type}:** ${report.summary.byServiceType[type]}\n`;
    });
    mdReport += `\n`;
    
    mdReport += `### Распределение по уверенности:\n\n`;
    mdReport += `- **Высокая (≥60%):** ${report.summary.byConfidence.high}\n`;
    mdReport += `- **Средняя (40-59%):** ${report.summary.byConfidence.medium}\n`;
    mdReport += `- **Низкая (30-39%):** ${report.summary.byConfidence.low}\n\n`;
    
    if (Object.keys(report.servicesTree).length > 0) {
        mdReport += `## 🌳 Дерево услуг по секциям\n\n`;
        Object.keys(report.servicesTree).sort().forEach(section => {
            mdReport += `### ${section} (${report.servicesTree[section].length} услуг)\n\n`;
            report.servicesTree[section].forEach(service => {
                mdReport += `- **${service.name}** (\`${service.slug}\`)\n`;
                mdReport += `  - Путь: ${service.fullPath || service.path.join('/')}\n`;
                mdReport += `  - Уверенность: ${service.confidence}%\n`;
                mdReport += `  - Тип: ${service.serviceType || 'не определен'}\n`;
                mdReport += `  - Компоненты: ${service.components.join(', ') || 'нет'}\n`;
                mdReport += `  - Причины: ${service.reasons.join('; ')}\n`;
                mdReport += `\n`;
            });
        });
    }
    
    if (report.services.length > 0) {
        mdReport += `## 📋 Детальный список услуг\n\n`;
        mdReport += `| Название | Slug | Секция | Тип | Уверенность | Компоненты |\n`;
        mdReport += `|----------|------|--------|-----|-------------|------------|\n`;
        
        report.services.sort((a, b) => b.confidence - a.confidence).forEach(service => {
            mdReport += `| ${service.name} | ${service.slug} | ${service.section || '-'} | ${service.serviceType || '-'} | ${service.confidence}% | ${service.components.join(', ') || '-'} |\n`;
        });
        mdReport += `\n`;
    }
    
    if (report.nonServices.length > 0) {
        mdReport += `## 📄 Страницы, не являющиеся услугами\n\n`;
        mdReport += `| Название | Slug | Уверенность | Причины |\n`;
        mdReport += `|----------|------|-------------|---------|\n`;
        
        report.nonServices.forEach(page => {
            mdReport += `| ${page.name} | ${page.slug} | ${page.confidence}% | ${page.reasons.join('; ')} |\n`;
        });
        mdReport += `\n`;
    }
    
    mdReport += `## 📝 Выводы\n\n`;
    mdReport += `1. **Найдено ${report.summary.servicePages} страниц-услуг** из ${report.summary.totalPages} страниц\n`;
    mdReport += `2. **Распределение по секциям:** ${Object.keys(report.summary.bySection).length} секций\n`;
    mdReport += `3. **Типы услуг:** ${Object.keys(report.summary.byServiceType).length} различных типов\n`;
    mdReport += `4. **Уверенность анализа:** ${report.summary.byConfidence.high} высоких, ${report.summary.byConfidence.medium} средних, ${report.summary.byConfidence.low} низких\n\n`;
    
    fs.writeFileSync(REPORT_MD_FILE, mdReport, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${REPORT_MD_FILE}\n`);
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔍 Семантический анализ контента страниц Strapi\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // 1. Загрузить страницы с контентом
        const pages = await loadStrapiPagesWithContent();
        
        // 2. Анализировать каждую страницу
        console.log('🔍 Анализ контента страниц...\n');
        const pagesWithAnalysis = pages.map(page => {
            const analysis = analyzePageContent(page);
            return {
                ...page,
                analysis: analysis
            };
        });
        
        // 3. Построить дерево услуг
        console.log('🌳 Построение дерева услуг...\n');
        const servicesTree = buildServicesTreeFromAnalysis(pagesWithAnalysis);
        
        // 4. Создать отчет
        createReport(pagesWithAnalysis, servicesTree);
        
        // Итоговая статистика
        const servicePages = pagesWithAnalysis.filter(p => p.analysis.isService);
        console.log('✅ Анализ завершен!\n');
        console.log('📊 Результаты:');
        console.log(`   - Всего страниц: ${pages.length}`);
        console.log(`   - Страниц-услуг: ${servicePages.length}`);
        console.log(`   - Не услуги: ${pages.length - servicePages.length}`);
        console.log(`   - Высокая уверенность (≥60%): ${servicePages.filter(p => p.analysis.confidence >= 60).length}`);
        console.log(`   - Средняя уверенность (40-59%): ${servicePages.filter(p => p.analysis.confidence >= 40 && p.analysis.confidence < 60).length}`);
        console.log(`   - Низкая уверенность (30-39%): ${servicePages.filter(p => p.analysis.confidence >= 30 && p.analysis.confidence < 40).length}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при выполнении анализа:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, analyzePageContent, buildServicesTreeFromAnalysis };
