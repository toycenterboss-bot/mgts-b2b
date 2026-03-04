/**
 * Анализ и классификация контента всех найденных страниц
 * 1. Классифицирует контент по смыслу
 * 2. Сопоставляет с CMS типами нового сайта
 * 3. Определяет недостающие типы
 * 4. Сохраняет классификацию для миграции
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE_URL = 'https://business.mgts.ru';
const SERVICES_FILE = path.join(__dirname, '../../temp/services-extraction/all-services-all-sections.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/content-classification.json');
const CMS_TYPES_FILE = path.join(__dirname, '../../docs/cms/content-types/CMS_CONTENT_TYPES.md');

/**
 * Загрузить существующие CMS типы
 */
function loadCMSTypes() {
    const cmsTypes = {
        contentTypes: {
            'page': {
                name: 'Page',
                description: 'Страница сайта',
                fields: ['slug', 'title', 'content', 'heroTitle', 'heroSubtitle', 'sidebar']
            },
            'product': {
                name: 'Product',
                description: 'Товары и услуги',
                fields: ['slug', 'name', 'shortDescription', 'fullDescription', 'price', 'category', 'images']
            },
            'product-category': {
                name: 'Product Category',
                description: 'Категория товаров',
                fields: ['name', 'slug', 'description', 'parent', 'image']
            },
            'news': {
                name: 'News',
                description: 'Новости компании',
                fields: ['slug', 'title', 'content', 'publishDate', 'category', 'tags', 'featuredImage']
            },
            'news-category': {
                name: 'News Category',
                description: 'Категория новостей',
                fields: ['name', 'slug', 'description']
            },
            'news-tag': {
                name: 'News Tag',
                description: 'Тег новости',
                fields: ['name', 'slug']
            }
        },
        contentBlocks: [
            'hero-content',
            'section',
            'service-tariffs',
            'service-faq',
            'service-features',
            'service-order',
            'service-specs',
            'service-cases',
            'service-howto',
            'grid',
            'service-card',
            'tariff-card'
        ]
    };
    
    return cmsTypes;
}

/**
 * Классифицировать страницу по URL и контенту
 */
function classifyPage(url, html, title) {
    const classification = {
        url: url,
        title: title,
        contentType: null,
        contentBlocks: [],
        category: null,
        section: null,
        features: {}
    };
    
    // Определяем раздел по URL
    if (url.includes('/business')) {
        classification.section = 'business';
    } else if (url.includes('/operators')) {
        classification.section = 'operators';
    } else if (url.includes('/government')) {
        classification.section = 'government';
    } else if (url.includes('/developers')) {
        classification.section = 'developers';
    } else if (url.includes('/partners')) {
        classification.section = 'partners';
    } else if (url.includes('/news')) {
        classification.section = 'news';
    } else if (url.includes('/about')) {
        classification.section = 'about';
    }
    
    // Парсим HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Определяем тип контента
    if (url.includes('/all_services')) {
        classification.contentType = 'service-list';
        classification.category = 'listing';
    } else if (url.includes('/news') || url.includes('/новости')) {
        classification.contentType = 'news';
        classification.category = 'news';
    } else if (url.includes('/business/telephony') || 
               url.includes('/business/internet') ||
               url.includes('/business/security') ||
               url.includes('/business/cloud') ||
               url.includes('/business/tv')) {
        classification.contentType = 'product';
        classification.category = 'service';
    } else if (url.includes('/business/')) {
        classification.contentType = 'product';
        classification.category = 'service';
    } else if (url.includes('/operators/') && !url.includes('/all_services')) {
        classification.contentType = 'product';
        classification.category = 'operator-service';
    } else if (url.includes('/government/') && !url.includes('/all_services')) {
        classification.contentType = 'product';
        classification.category = 'government-service';
    } else {
        classification.contentType = 'page';
        classification.category = 'info';
    }
    
    // Ищем блоки контента
    const contentBlocks = [];
    
    // Hero content
    if (document.querySelector('.hero, .hero-content, [class*="hero"]')) {
        contentBlocks.push('hero-content');
    }
    
    // Regular sections
    if (document.querySelector('.section, section')) {
        contentBlocks.push('section');
    }
    
    // Service tariffs
    if (document.querySelector('.service-tariffs, .tariffs-grid, .tariff-card, [class*="tariff"]')) {
        contentBlocks.push('service-tariffs');
    }
    
    // Service FAQ
    if (document.querySelector('.service-faq, .faq-list, .faq-item, [class*="faq"]')) {
        contentBlocks.push('service-faq');
    }
    
    // Service features
    if (document.querySelector('.service-features, .features-grid, .feature-card, [class*="feature"]')) {
        contentBlocks.push('service-features');
    }
    
    // Service order form
    if (document.querySelector('.service-order, .order-form, #order-form, [class*="order"]')) {
        contentBlocks.push('service-order');
    }
    
    // Service specs
    if (document.querySelector('.service-specs, .specs-grid, .spec-item, [class*="spec"]')) {
        contentBlocks.push('service-specs');
    }
    
    // Service cases
    if (document.querySelector('.service-cases, .cases-grid, .case-card, [class*="case"]')) {
        contentBlocks.push('service-cases');
    }
    
    // Service howto
    if (document.querySelector('.service-howto, .howto-steps, .howto-step, [class*="howto"]')) {
        contentBlocks.push('service-howto');
    }
    
    // Grid
    if (document.querySelector('.grid, [class*="grid"]')) {
        contentBlocks.push('grid');
    }
    
    // Service cards
    if (document.querySelector('.service-card, [class*="service-card"]')) {
        contentBlocks.push('service-card');
    }
    
    // Tariff cards
    if (document.querySelector('.tariff-card, [class*="tariff-card"]')) {
        contentBlocks.push('tariff-card');
    }
    
    classification.contentBlocks = [...new Set(contentBlocks)];
    
    // Определяем дополнительные признаки
    classification.features = {
        hasHero: contentBlocks.includes('hero-content'),
        hasTariffs: contentBlocks.includes('service-tariffs'),
        hasFAQ: contentBlocks.includes('service-faq'),
        hasFeatures: contentBlocks.includes('service-features'),
        hasOrderForm: contentBlocks.includes('service-order'),
        hasSpecs: contentBlocks.includes('service-specs'),
        hasCases: contentBlocks.includes('service-cases'),
        hasHowto: contentBlocks.includes('service-howto'),
        hasGrid: contentBlocks.includes('grid'),
        hasServiceCards: contentBlocks.includes('service-card'),
        hasTariffCards: contentBlocks.includes('tariff-card'),
        hasSections: contentBlocks.includes('section'),
        hasImages: document.querySelectorAll('img').length > 0,
        hasForms: document.querySelectorAll('form').length > 0,
        hasTables: document.querySelectorAll('table').length > 0,
        hasLists: document.querySelectorAll('ul, ol').length > 0,
        hasLinks: document.querySelectorAll('a[href]').length > 0
    };
    
    return classification;
}

/**
 * Извлечь контент со страницы
 */
async function extractPageContent(page, url) {
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const html = await page.content();
        const title = await page.title();
        
        return { html, title };
    } catch (error) {
        console.error(`  ❌ Ошибка при загрузке ${url}: ${error.message}`);
        return { html: '', title: '' };
    }
}

/**
 * Основная функция
 */
async function main() {
    console.log('🔍 АНАЛИЗ И КЛАССИФИКАЦИЯ КОНТЕНТА');
    console.log('='.repeat(70));
    
    // Загружаем данные об услугах
    if (!fs.existsSync(SERVICES_FILE)) {
        console.error('❌ Файл не найден:', SERVICES_FILE);
        process.exit(1);
    }
    
    const servicesData = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf-8'));
    const allServices = servicesData.allServices || [];
    
    console.log(`📊 Найдено страниц для анализа: ${allServices.length}`);
    
    // Загружаем CMS типы
    const cmsTypes = loadCMSTypes();
    console.log(`📋 Загружено CMS типов: ${Object.keys(cmsTypes.contentTypes).length}`);
    console.log(`📋 Загружено блоков контента: ${cmsTypes.contentBlocks.length}`);
    
    let browser;
    
    try {
        // Запускаем браузер
        console.log('\n🌐 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1920, height: 1080 }
        });
        
        const page = await browser.newPage();
        
        const classifications = [];
        const contentTypeStats = {};
        const contentBlockStats = {};
        const missingTypes = [];
        
        // Обрабатываем все страницы
        const servicesToProcess = allServices;
        
        console.log(`\n📋 Анализ всех страниц (${servicesToProcess.length})...`);
        for (let i = 0; i < servicesToProcess.length; i++) {
            const service = servicesToProcess[i];
            console.log(`[${i + 1}/${servicesToProcess.length}] ${service.title.substring(0, 50)}...`);
            
            // Извлекаем контент
            const { html, title } = await extractPageContent(page, service.url);
            
            if (html) {
                // Классифицируем
                const classification = classifyPage(service.url, html, title || service.title);
                classification.service = {
                    title: service.title,
                    url: service.url,
                    slug: service.slug,
                    section: service.section
                };
                classifications.push(classification);
                
                // Статистика по типам контента
                const contentType = classification.contentType || 'unknown';
                contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
                
                // Статистика по блокам
                classification.contentBlocks.forEach(block => {
                    contentBlockStats[block] = (contentBlockStats[block] || 0) + 1;
                });
                
                // Проверяем соответствие CMS типам
                if (!cmsTypes.contentTypes[contentType]) {
                    if (!missingTypes.find(t => t.type === contentType)) {
                        missingTypes.push({
                            type: contentType,
                            category: classification.category,
                            section: classification.section,
                            example: service.url
                        });
                    }
                }
            }
            
            // Небольшая задержка между запросами
            if (i < servicesToProcess.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Группируем по типам контента
        const byContentType = {};
        classifications.forEach(c => {
            const type = c.contentType || 'unknown';
            if (!byContentType[type]) {
                byContentType[type] = [];
            }
            byContentType[type].push(c);
        });
        
        // Группируем по разделам
        const bySection = {};
        classifications.forEach(c => {
            const section = c.section || 'unknown';
            if (!bySection[section]) {
                bySection[section] = [];
            }
            bySection[section].push(c);
        });
        
        // Группируем по категориям
        const byCategory = {};
        classifications.forEach(c => {
            const category = c.category || 'unknown';
            if (!byCategory[category]) {
                byCategory[category] = [];
            }
            byCategory[category].push(c);
        });
        
        // Результаты
        const results = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            totalPages: classifications.length,
            cmsTypes: cmsTypes,
            classifications: classifications,
            statistics: {
                byContentType: contentTypeStats,
                byContentBlock: contentBlockStats,
                bySection: Object.fromEntries(
                    Object.entries(bySection).map(([section, items]) => [section, items.length])
                ),
                byCategory: Object.fromEntries(
                    Object.entries(byCategory).map(([category, items]) => [category, items.length])
                )
            },
            grouping: {
                byContentType: byContentType,
                bySection: bySection,
                byCategory: byCategory
            },
            missingTypes: missingTypes,
            recommendations: {
                existingTypes: Object.keys(cmsTypes.contentTypes),
                usedTypes: Object.keys(contentTypeStats),
                missingTypes: missingTypes.map(t => t.type),
                newTypesNeeded: missingTypes.filter(t => 
                    !cmsTypes.contentTypes[t.type] && 
                    contentTypeStats[t.type] > 2
                ).map(t => ({
                    type: t.type,
                    count: contentTypeStats[t.type],
                    category: t.category,
                    section: t.section
                }))
            }
        };
        
        // Сохраняем результаты
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
        
        // Выводим статистику
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ КЛАССИФИКАЦИИ');
        console.log('='.repeat(70));
        console.log(`✅ Проанализировано страниц: ${classifications.length}`);
        console.log(`📋 Типов контента: ${Object.keys(contentTypeStats).length}`);
        console.log(`📦 Блоков контента: ${Object.keys(contentBlockStats).length}`);
        
        console.log('\n📊 По типам контента:');
        for (const [type, count] of Object.entries(contentTypeStats).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${type}: ${count}`);
        }
        
        console.log('\n📦 По блокам контента:');
        for (const [block, count] of Object.entries(contentBlockStats).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${block}: ${count}`);
        }
        
        console.log('\n📁 По разделам:');
        for (const [section, count] of Object.entries(results.statistics.bySection).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${section}: ${count}`);
        }
        
        if (missingTypes.length > 0) {
            console.log('\n⚠️  Недостающие типы:');
            missingTypes.forEach(type => {
                console.log(`  - ${type.type} (${type.category}, ${type.section})`);
            });
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { classifyPage, loadCMSTypes };
