/**
 * Специальный скрипт для извлечения всех услуг со страницы "Все услуги"
 * и правильного построения структуры дерева
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const ALL_SERVICES_URL = 'https://business.mgts.ru/business/all_services';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/all-services-complete.json');

/**
 * Извлечь структурированный список услуг со страницы "Все услуги"
 */
async function extractAllServicesFromPage(page) {
    console.log(`📄 Переход на страницу "Все услуги": ${ALL_SERVICES_URL}`);
    
    await page.goto(ALL_SERVICES_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });
    
    // Ждем загрузки контента
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Делаем скриншот для анализа
    await page.screenshot({ 
        path: path.join(__dirname, '../../temp/services-extraction/all-services-page.png'), 
        fullPage: true 
    });
    console.log('📸 Скриншот страницы сохранен');
    
    // Извлекаем структурированный список услуг
    const services = await page.evaluate((baseUrl) => {
        const allServices = [];
        const processedUrls = new Set();
        
        // Метод 1: Ищем карточки услуг
        const cardSelectors = [
            '[class*="service-card"]',
            '[class*="product-card"]',
            '[class*="service-item"]',
            '[class*="service"]',
            '[class*="card"]',
            'article',
            '[data-service]',
            '[data-product]'
        ];
        
        cardSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(card => {
                    const link = card.querySelector('a[href*="/business"]');
                    if (!link) return;
                    
                    const href = link.getAttribute('href');
                    if (!href) return;
                    
                    const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                    if (processedUrls.has(fullUrl)) return;
                    
                    // Извлекаем информацию
                    const title = card.querySelector('h1, h2, h3, h4, .title, [class*="title"]')?.textContent?.trim() || 
                                 link.textContent.trim();
                    const description = card.querySelector('p, .description, [class*="description"]')?.textContent?.trim() || '';
                    const image = card.querySelector('img')?.getAttribute('src') || '';
                    
                    if (title && title.length > 2) {
                        processedUrls.add(fullUrl);
                        allServices.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || '',
                            description: description.substring(0, 300),
                            image: image.startsWith('http') ? image : baseUrl + image,
                            category: extractCategory(href)
                        });
                    }
                });
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        // Метод 2: Ищем списки услуг
        const listSelectors = [
            'ul[class*="service"]',
            'ul[class*="product"]',
            'ul li a[href*="/business"]',
            'ol[class*="service"]'
        ];
        
        listSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(list => {
                    const links = list.querySelectorAll('a[href*="/business"]');
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        
                        const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                        if (processedUrls.has(fullUrl)) return;
                        
                        const title = link.textContent.trim();
                        const parent = link.closest('li, ul, ol');
                        const category = parent?.querySelector('h2, h3, h4, .category')?.textContent?.trim() || '';
                        
                        if (title && title.length > 2) {
                            processedUrls.add(fullUrl);
                            allServices.push({
                                title: title,
                                url: fullUrl,
                                slug: href.split('/').filter(Boolean).pop() || '',
                                description: '',
                                image: '',
                                category: category || extractCategory(href)
                            });
                        }
                    });
                });
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        // Метод 3: Ищем секции с услугами
        const sectionSelectors = [
            '[class*="services"]',
            '[class*="products"]',
            'section[class*="service"]',
            '[id*="service"]'
        ];
        
        sectionSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(section => {
                    const sectionTitle = section.querySelector('h2, h3, h4, .title')?.textContent?.trim() || '';
                    const links = section.querySelectorAll('a[href*="/business"]');
                    
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        
                        const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                        if (processedUrls.has(fullUrl)) return;
                        
                        const title = link.textContent.trim();
                        
                        if (title && title.length > 2) {
                            processedUrls.add(fullUrl);
                            allServices.push({
                                title: title,
                                url: fullUrl,
                                slug: href.split('/').filter(Boolean).pop() || '',
                                description: '',
                                image: '',
                                category: sectionTitle || extractCategory(href)
                            });
                        }
                    });
                });
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        function extractCategory(url) {
            if (url.includes('/internet')) return 'internet';
            if (url.includes('/telephony')) return 'telephony';
            if (url.includes('/security') || url.includes('/video') || url.includes('/alarm')) return 'security';
            if (url.includes('/cloud')) return 'cloud';
            if (url.includes('/tv') || url.includes('/television')) return 'tv';
            return 'other';
        }
        
        // Удаляем дубликаты
        const unique = [];
        const seen = new Set();
        allServices.forEach(service => {
            if (!seen.has(service.url)) {
                seen.add(service.url);
                unique.push(service);
            }
        });
        
        return unique;
    }, BASE_URL);
    
    return services;
}

/**
 * Построить правильное дерево услуг
 */
function buildCorrectTree(services) {
    const tree = {
        root: {
            name: 'Услуги',
            url: BASE_URL,
            children: []
        }
    };
    
    // Группируем по категориям
    const byCategory = {};
    services.forEach(service => {
        const category = service.category || 'other';
        if (!byCategory[category]) {
            byCategory[category] = [];
        }
        byCategory[category].push(service);
    });
    
    // Строим дерево
    for (const [category, categoryServices] of Object.entries(byCategory)) {
        const categoryNode = {
            name: category.charAt(0).toUpperCase() + category.slice(1),
            slug: category,
            url: `${BASE_URL}/business/${category}`,
            children: []
        };
        
        categoryServices.forEach(service => {
            const path = service.url.replace(BASE_URL, '').split('/').filter(Boolean);
            const level = path.length;
            
            categoryNode.children.push({
                title: service.title,
                url: service.url,
                slug: service.slug,
                path: path.join('/'),
                level: level,
                description: service.description,
                image: service.image,
                category: category
            });
        });
        
        tree.root.children.push(categoryNode);
    }
    
    return tree;
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ИЗВЛЕЧЕНИЕ ВСЕХ УСЛУГ СО СТРАНИЦЫ "ВСЕ УСЛУГИ"');
    console.log('='.repeat(70));
    console.log(`🌐 URL: ${ALL_SERVICES_URL}`);
    console.log(`📁 Результаты: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
    
    let browser;
    
    try {
        // Запускаем браузер
        console.log('\n🌐 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // Извлекаем все услуги
        console.log('\n📋 Извлечение услуг...');
        const services = await extractAllServicesFromPage(page);
        
        console.log(`\n✅ Найдено услуг: ${services.length}`);
        
        // Строим дерево
        const tree = buildCorrectTree(services);
        
        // Сохраняем результаты
        const result = {
            timestamp: new Date().toISOString(),
            sourceUrl: ALL_SERVICES_URL,
            totalServices: services.length,
            services: services,
            tree: tree,
            byCategory: services.reduce((acc, service) => {
                const cat = service.category || 'other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(service);
                return acc;
            }, {}),
            summary: {
                total: services.length,
                categories: Object.keys(services.reduce((acc, s) => {
                    acc[s.category || 'other'] = true;
                    return acc;
                }, {})).length
            }
        };
        
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
        
        // Выводим статистику
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ');
        console.log('='.repeat(70));
        console.log(`✅ Всего услуг: ${services.length}`);
        console.log(`📁 Категорий: ${result.summary.categories}`);
        
        console.log('\n📋 Услуги по категориям:');
        for (const [category, items] of Object.entries(result.byCategory)) {
            console.log(`\n${category.toUpperCase()} (${items.length}):`);
            items.forEach((service, i) => {
                console.log(`  ${i + 1}. ${service.title}`);
                console.log(`     ${service.url}`);
            });
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
        console.log('='.repeat(70));
        
        // Ждем перед закрытием
        console.log('\n⏳ Браузер останется открытым 5 секунд...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
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

module.exports = { extractAllServicesFromPage, buildCorrectTree };
