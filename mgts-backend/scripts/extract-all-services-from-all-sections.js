/**
 * Извлечение всех услуг из всех разделов сайта
 * Обрабатывает страницы "Все услуги" в каждом разделе
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const SECTIONS_DATA_FILE = path.join(__dirname, '../../temp/services-extraction/all-sections-structure.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/all-services-all-sections.json');

// Разделы с кнопкой "Все услуги"
const SECTIONS_WITH_ALL_SERVICES = [
    { name: 'Бизнесу', url: '/business/all_services', slug: 'business' },
    { name: 'Операторам связи', url: '/operators/all_services', slug: 'operators' },
    { name: 'Госзаказчикам', url: '/government/all_services', slug: 'government' }
];

/**
 * Извлечь все услуги со страницы "Все услуги"
 */
async function extractAllServicesFromPage(page, section) {
    const fullUrl = BASE_URL + section.url;
    console.log(`\n📁 Обработка раздела: ${section.name}`);
    console.log(`   URL: ${fullUrl}`);
    
    try {
        await page.goto(fullUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Делаем скриншот
        const screenshotPath = path.join(__dirname, `../../temp/services-extraction/all-services-${section.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   📸 Скриншот сохранен: all-services-${section.slug}.png`);
        
        // Извлекаем все услуги
        const services = await page.evaluate((baseUrl) => {
            const foundServices = [];
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
                        const link = card.querySelector('a[href]');
                        if (!link) return;
                        
                        const href = link.getAttribute('href');
                        if (!href) return;
                        
                        const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                        if (processedUrls.has(fullUrl)) return;
                        
                        if (href.includes('#') || href === '/' || href === '') return;
                        
                        const title = card.querySelector('h1, h2, h3, h4, .title, [class*="title"]')?.textContent?.trim() || 
                                     link.textContent.trim();
                        const description = card.querySelector('p, .description, [class*="description"]')?.textContent?.trim() || '';
                        const image = card.querySelector('img')?.getAttribute('src') || '';
                        
                        if (title && title.length > 2 && title.length < 150) {
                            processedUrls.add(fullUrl);
                            foundServices.push({
                                title: title,
                                url: fullUrl,
                                slug: href.split('/').filter(Boolean).pop() || '',
                                description: description.substring(0, 300),
                                image: image ? (image.startsWith('http') ? image : baseUrl + image) : ''
                            });
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            // Метод 2: Ищем все ссылки на услуги
            document.querySelectorAll('a[href]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                
                const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                if (processedUrls.has(fullUrl)) return;
                
                // Пропускаем служебные ссылки
                if (href.includes('#') || href.includes('mailto:') || href.includes('tel:') ||
                    href === '/' || href === '' || href === '/#') {
                    return;
                }
                
                // Пропускаем ссылки в header/footer/nav
                const parent = link.closest('header, footer, nav, [class*="header"], [class*="footer"], [class*="nav"]');
                if (parent) return;
                
                const title = link.textContent.trim();
                if (title && title.length > 2 && title.length < 150) {
                    // Проверяем, что это не служебная ссылка
                    if (!title.match(/^(8|7|\+7|\d{1,3})/) && // Не телефон
                        !title.match(/^(Cookies|Политика|Условия)/i)) { // Не служебные
                        
                        processedUrls.add(fullUrl);
                        foundServices.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || '',
                            description: '',
                            image: ''
                        });
                    }
                }
            });
            
            // Метод 3: Ищем списки услуг
            const listSelectors = [
                'ul[class*="service"]',
                'ul[class*="product"]',
                'ul li a[href]',
                'ol[class*="service"]',
                '[class*="services-list"]',
                '[class*="products-list"]'
            ];
            
            listSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(list => {
                        const links = list.querySelectorAll('a[href]');
                        links.forEach(link => {
                            const href = link.getAttribute('href');
                            if (!href) return;
                            
                            const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                            if (processedUrls.has(fullUrl)) return;
                            
                            if (href.includes('#') || href === '/' || href === '') return;
                            
                            const title = link.textContent.trim();
                            const parent = link.closest('li, ul, ol, section');
                            const category = parent?.querySelector('h2, h3, h4, .category, [class*="title"]')?.textContent?.trim() || '';
                            
                            if (title && title.length > 2 && title.length < 150) {
                                processedUrls.add(fullUrl);
                                foundServices.push({
                                    title: title,
                                    url: fullUrl,
                                    slug: href.split('/').filter(Boolean).pop() || '',
                                    description: '',
                                    image: '',
                                    category: category
                                });
                            }
                        });
                    });
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            // Удаляем дубликаты
            const unique = [];
            const seen = new Set();
            foundServices.forEach(s => {
                if (!seen.has(s.url)) {
                    seen.add(s.url);
                    unique.push(s);
                }
            });
            
            return unique;
        }, BASE_URL);
        
        console.log(`   ✅ Найдено услуг: ${services.length}`);
        return services;
        
    } catch (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        return [];
    }
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ИЗВЛЕЧЕНИЕ ВСЕХ УСЛУГ ИЗ ВСЕХ РАЗДЕЛОВ');
    console.log('='.repeat(70));
    console.log(`🌐 Базовый URL: ${BASE_URL}`);
    console.log(`📁 Результаты: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
    
    // Загружаем данные о разделах
    let allSectionsData = {};
    if (fs.existsSync(SECTIONS_DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(SECTIONS_DATA_FILE, 'utf-8'));
        allSectionsData = data.sections || {};
        console.log(`\n✅ Загружены данные о ${Object.keys(allSectionsData).length} разделах`);
    }
    
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
        
        const results = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            sections: {}
        };
        
        // Обрабатываем разделы с кнопкой "Все услуги"
        for (let i = 0; i < SECTIONS_WITH_ALL_SERVICES.length; i++) {
            const section = SECTIONS_WITH_ALL_SERVICES[i];
            console.log(`\n[${i + 1}/${SECTIONS_WITH_ALL_SERVICES.length}] Обработка раздела...`);
            
            const services = await extractAllServicesFromPage(page, section);
            
            results.sections[section.slug] = {
                name: section.name,
                url: BASE_URL + section.url,
                services: services,
                count: services.length
            };
            
            // Небольшая задержка между разделами
            if (i < SECTIONS_WITH_ALL_SERVICES.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Также обрабатываем другие разделы (без страницы "Все услуги")
        const otherSections = Object.entries(allSectionsData)
            .filter(([slug, data]) => !SECTIONS_WITH_ALL_SERVICES.find(s => s.slug === slug))
            .filter(([slug, data]) => data.count > 0 && slug !== 'news' && slug !== 'contact_details');
        
        console.log(`\n📋 Обработка других разделов (${otherSections.length})...`);
        for (let i = 0; i < otherSections.length; i++) {
            const [slug, sectionData] = otherSections[i];
            console.log(`\n[${i + 1}/${otherSections.length}] Обработка: ${sectionData.title}`);
            
            // Извлекаем услуги из основного раздела
            const services = await extractAllServicesFromPage(page, {
                name: sectionData.title,
                url: sectionData.path,
                slug: slug
            });
            
            if (services.length > 0) {
                results.sections[slug] = {
                    name: sectionData.title,
                    url: sectionData.url,
                    services: services,
                    count: services.length
                };
            }
            
            if (i < otherSections.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Собираем все услуги в один список
        const allServices = [];
        for (const [slug, sectionData] of Object.entries(results.sections)) {
            sectionData.services.forEach(service => {
                service.section = slug;
                service.sectionTitle = sectionData.name;
                allServices.push(service);
            });
        }
        
        // Удаляем дубликаты
        const uniqueServices = [];
        const seenUrls = new Set();
        allServices.forEach(service => {
            if (!seenUrls.has(service.url)) {
                seenUrls.add(service.url);
                uniqueServices.push(service);
            }
        });
        
        results.allServices = uniqueServices;
        results.summary = {
            totalSections: Object.keys(results.sections).length,
            totalServices: uniqueServices.length,
            bySection: Object.fromEntries(
                Object.entries(results.sections).map(([slug, data]) => [slug, data.count])
            )
        };
        
        // Сохраняем результаты
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
        
        // Выводим статистику
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ');
        console.log('='.repeat(70));
        console.log(`✅ Обработано разделов: ${results.summary.totalSections}`);
        console.log(`✅ Всего найдено услуг: ${results.summary.totalServices}`);
        
        console.log('\n📋 Услуги по разделам:');
        for (const [slug, sectionData] of Object.entries(results.sections)) {
            console.log(`\n${sectionData.name} (${sectionData.count}):`);
            sectionData.services.slice(0, 10).forEach((service, i) => {
                console.log(`  ${i + 1}. ${service.title}`);
                console.log(`     ${service.url}`);
            });
            if (sectionData.services.length > 10) {
                console.log(`  ... и еще ${sectionData.services.length - 10}`);
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
        console.log('='.repeat(70));
        
        // Ждем перед закрытием
        console.log('\n⏳ Браузер останется открытым 10 секунд...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
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

module.exports = { extractAllServicesFromPage };
