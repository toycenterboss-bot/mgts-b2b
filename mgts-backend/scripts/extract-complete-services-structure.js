/**
 * Полное извлечение структуры услуг с обходом всех категорий
 * Обрабатывает каждую категорию отдельно и извлекает подуслуги
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/complete-services-structure.json');

// Известные категории услуг
const CATEGORIES = [
    { name: 'Телефония', url: '/business/telephony', slug: 'telephony' },
    { name: 'Интернет', url: '/business/access_internet', slug: 'internet' },
    { name: 'Безопасность', url: '/business', slug: 'security' },
    { name: 'Телевидение', url: '/business/digital_television', slug: 'tv' },
    { name: 'Мобильная связь', url: '/business/mobile_connection', slug: 'mobile' }
];

/**
 * Извлечь подуслуги со страницы категории
 */
async function extractSubServices(page, categoryUrl) {
    const fullUrl = BASE_URL + categoryUrl;
    console.log(`  📄 Обработка категории: ${fullUrl}`);
    
    try {
        await page.goto(fullUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Ждем загрузки React контента
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Ищем кнопку "Все услуги" или "Показать все"
        const showAllButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            return buttons.find(btn => {
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
                return text.includes('все услуги') || 
                       text.includes('показать все') ||
                       text.includes('смотреть все') ||
                       text.includes('все решения');
            });
        });
        
        if (showAllButton) {
            console.log(`    ✅ Найдена кнопка "Все услуги", кликаем...`);
            try {
                await page.evaluate((btn) => {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, showAllButton);
                await new Promise(resolve => setTimeout(resolve, 500));
                await page.evaluate((btn) => btn.click(), showAllButton);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (e) {
                console.log(`    ⚠️  Ошибка при клике: ${e.message}`);
            }
        }
        
        // Извлекаем все услуги со страницы
        const services = await page.evaluate((baseUrl, currentUrl) => {
            const foundServices = [];
            const processedUrls = new Set();
            
            // Ищем все ссылки на услуги
            const allLinks = document.querySelectorAll('a[href*="/business"]');
            
            allLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || href === currentUrl) return;
                
                const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                if (processedUrls.has(fullUrl)) return;
                
                // Проверяем, что это ссылка на услугу (не на главную, не на контакты и т.д.)
                if (href.includes('/business') && 
                    !href.includes('#') && 
                    !href.includes('mailto:') && 
                    !href.includes('tel:') &&
                    href !== '/business' &&
                    href !== '/business/') {
                    
                    // Пытаемся найти карточку или контейнер услуги
                    const card = link.closest('[class*="card"], [class*="service"], [class*="item"], article, [class*="product"]');
                    const title = card?.querySelector('h1, h2, h3, h4, .title, [class*="title"]')?.textContent?.trim() || 
                                 link.textContent.trim();
                    const description = card?.querySelector('p, .description, [class*="description"]')?.textContent?.trim() || '';
                    const image = card?.querySelector('img')?.getAttribute('src') || '';
                    
                    if (title && title.length > 2 && title.length < 150) {
                        processedUrls.add(fullUrl);
                        foundServices.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || '',
                            description: description.substring(0, 300),
                            image: image ? (image.startsWith('http') ? image : baseUrl + image) : '',
                            path: href.replace(baseUrl, '').split('/').filter(Boolean).join('/')
                        });
                    }
                }
            });
            
            // Также ищем структурированные списки
            const lists = document.querySelectorAll('ul[class*="service"], ul[class*="list"], [class*="services-list"]');
            lists.forEach(list => {
                const categoryTitle = list.closest('section, div')?.querySelector('h2, h3, h4')?.textContent?.trim() || '';
                const items = list.querySelectorAll('li a[href*="/business"]');
                
                items.forEach(item => {
                    const href = item.getAttribute('href');
                    if (!href) return;
                    
                    const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                    if (processedUrls.has(fullUrl)) return;
                    
                    const title = item.textContent.trim();
                    if (title && title.length > 2) {
                        processedUrls.add(fullUrl);
                        foundServices.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || '',
                            description: '',
                            image: '',
                            path: href.replace(baseUrl, '').split('/').filter(Boolean).join('/'),
                            category: categoryTitle
                        });
                    }
                });
            });
            
            return foundServices;
        }, BASE_URL, categoryUrl);
        
        // Удаляем дубликаты
        const unique = [];
        const seen = new Set();
        services.forEach(s => {
            if (!seen.has(s.url)) {
                seen.add(s.url);
                unique.push(s);
            }
        });
        
        console.log(`    ✅ Найдено услуг: ${unique.length}`);
        return unique;
        
    } catch (error) {
        console.error(`    ❌ Ошибка: ${error.message}`);
        return [];
    }
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ПОЛНОЕ ИЗВЛЕЧЕНИЕ СТРУКТУРЫ УСЛУГ');
    console.log('='.repeat(70));
    console.log(`🌐 Базовый URL: ${BASE_URL}`);
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
        
        // Сначала обрабатываем страницу "Все услуги"
        console.log('\n📋 Шаг 1: Обработка страницы "Все услуги"...');
        const allServicesPage = BASE_URL + '/business/all_services';
        await page.goto(allServicesPage, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const allServices = await page.evaluate((baseUrl) => {
            const services = [];
            const processed = new Set();
            
            document.querySelectorAll('a[href*="/business"]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                
                const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                if (processed.has(fullUrl)) return;
                
                if (href.includes('/business') && !href.includes('#') && href !== '/business') {
                    const title = link.textContent.trim();
                    if (title && title.length > 2 && title.length < 100) {
                        processed.add(fullUrl);
                        services.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || ''
                        });
                    }
                }
            });
            
            return services;
        }, BASE_URL);
        
        console.log(`✅ Найдено услуг на странице "Все услуги": ${allServices.length}`);
        
        // Теперь обрабатываем каждую категорию
        console.log('\n📋 Шаг 2: Обработка категорий...');
        const allServicesMap = new Map();
        
        // Добавляем услуги со страницы "Все услуги"
        allServices.forEach(s => {
            allServicesMap.set(s.url, s);
        });
        
        // Обрабатываем каждую категорию
        for (const category of CATEGORIES) {
            console.log(`\n📁 Обработка категории: ${category.name}`);
            const subServices = await extractSubServices(page, category.url);
            
            subServices.forEach(s => {
                if (!allServicesMap.has(s.url)) {
                    allServicesMap.set(s.url, s);
                }
            });
            
            // Небольшая задержка между категориями
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Преобразуем в массив
        const finalServices = Array.from(allServicesMap.values());
        
        // Группируем по категориям
        const byCategory = {};
        finalServices.forEach(service => {
            const path = service.url.replace(BASE_URL, '').split('/').filter(Boolean);
            let category = 'other';
            
            if (path.includes('telephony')) category = 'telephony';
            else if (path.includes('internet') || path.includes('access_internet')) category = 'internet';
            else if (path.includes('security') || path.includes('video') || path.includes('alarm')) category = 'security';
            else if (path.includes('cloud')) category = 'cloud';
            else if (path.includes('tv') || path.includes('television')) category = 'tv';
            else if (path.includes('mobile')) category = 'mobile';
            
            if (!byCategory[category]) {
                byCategory[category] = [];
            }
            byCategory[category].push(service);
        });
        
        // Сохраняем результаты
        const result = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            totalServices: finalServices.length,
            services: finalServices,
            byCategory: byCategory,
            summary: {
                total: finalServices.length,
                categories: Object.keys(byCategory).length,
                byCategoryCount: Object.fromEntries(
                    Object.entries(byCategory).map(([cat, items]) => [cat, items.length])
                )
            }
        };
        
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
        
        // Выводим статистику
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ');
        console.log('='.repeat(70));
        console.log(`✅ Всего услуг: ${finalServices.length}`);
        console.log(`📁 Категорий: ${result.summary.categories}`);
        
        console.log('\n📋 Услуги по категориям:');
        for (const [category, services] of Object.entries(byCategory)) {
            console.log(`\n${category.toUpperCase()} (${services.length}):`);
            services.forEach((service, i) => {
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

module.exports = { extractSubServices };
