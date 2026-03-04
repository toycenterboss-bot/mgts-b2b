/**
 * Детальный обход каждой категории услуг с поиском всех подуслуг
 * Заходит на страницу каждой категории, ищет кнопку "Все услуги" и извлекает полный список
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/detailed-categories-structure.json');

// Категории для детального обхода
const CATEGORIES_TO_TRAVERSE = [
    { name: 'Телефония', url: '/business/telephony', slug: 'telephony' },
    { name: 'Доступ в интернет', url: '/business/access_internet', slug: 'internet' },
    { name: 'Телевидение', url: '/business/digital_television', slug: 'tv' },
    { name: 'Видеонаблюдение', url: '/business/video_surveillance_office', slug: 'security' },
    { name: 'Охранная сигнализация', url: '/business/security_alarm', slug: 'security' },
    { name: 'Мобильная связь', url: '/business/mobile_connection', slug: 'mobile' }
];

/**
 * Извлечь все услуги со страницы категории
 */
async function extractServicesFromCategoryPage(page, category) {
    const fullUrl = BASE_URL + category.url;
    console.log(`\n📁 Обработка категории: ${category.name}`);
    console.log(`   URL: ${fullUrl}`);
    
    try {
        await page.goto(fullUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Ждем загрузки React контента
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Делаем скриншот
        const screenshotPath = path.join(__dirname, `../../temp/services-extraction/category-${category.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   📸 Скриншот сохранен: category-${category.slug}.png`);
        
        // Ищем кнопку "Все услуги" или "Показать все"
        const showAllButton = await page.evaluate(() => {
            // Ищем по тексту
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [class*="button"], [class*="link"]'));
            let found = buttons.find(btn => {
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
                return text.includes('все услуги') || 
                       text.includes('показать все') ||
                       text.includes('смотреть все') ||
                       text.includes('все решения') ||
                       text === 'все услуги';
            });
            
            // Ищем по классам
            if (!found) {
                found = document.querySelector('[class*="all-services"], [class*="show-all"], [class*="expand"], [class*="more"]');
            }
            
            return found ? {
                text: found.textContent.trim(),
                tag: found.tagName.toLowerCase(),
                className: found.className
            } : null;
        });
        
        if (showAllButton) {
            console.log(`   ✅ Найдена кнопка: "${showAllButton.text}"`);
            try {
                // Прокручиваем к кнопке
                await page.evaluate(() => {
                    const btn = document.querySelector('[class*="all-services"], [class*="show-all"], [class*="expand"], [class*="more"], button:has-text("все услуги")');
                    if (btn) {
                        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Кликаем
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                    const btn = buttons.find(b => {
                        const text = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                        return text.includes('все услуги') || text.includes('показать все');
                    });
                    if (btn) {
                        btn.click();
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log(`   ✅ Кнопка нажата, ожидаем раскрытия...`);
            } catch (e) {
                console.log(`   ⚠️  Ошибка при клике: ${e.message}`);
            }
        } else {
            console.log(`   ℹ️  Кнопка "Все услуги" не найдена`);
        }
        
        // Извлекаем все услуги со страницы
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
            
            // Метод 2: Ищем списки услуг
            const listSelectors = [
                'ul[class*="service"]',
                'ul[class*="product"]',
                'ul li a[href*="/business"]',
                'ol[class*="service"]',
                '[class*="services-list"]',
                '[class*="products-list"]'
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
            
            // Метод 3: Ищем все ссылки на услуги
            document.querySelectorAll('a[href*="/business"]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                
                const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                if (processedUrls.has(fullUrl)) return;
                
                // Пропускаем общие страницы
                if (href === '/business' || href === '/business/' || href.includes('#') || href.includes('mailto:') || href.includes('tel:')) {
                    return;
                }
                
                const title = link.textContent.trim();
                if (title && title.length > 2 && title.length < 150) {
                    // Проверяем, что это не просто навигационная ссылка
                    const parent = link.closest('nav, header, footer');
                    if (!parent) {
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
    console.log('🚀 ДЕТАЛЬНЫЙ ОБХОД КАТЕГОРИЙ УСЛУГ');
    console.log('='.repeat(70));
    console.log(`🌐 Базовый URL: ${BASE_URL}`);
    console.log(`📁 Категорий для обработки: ${CATEGORIES_TO_TRAVERSE.length}`);
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
        
        const results = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            categories: {}
        };
        
        // Обрабатываем каждую категорию
        for (let i = 0; i < CATEGORIES_TO_TRAVERSE.length; i++) {
            const category = CATEGORIES_TO_TRAVERSE[i];
            console.log(`\n[${i + 1}/${CATEGORIES_TO_TRAVERSE.length}] Обработка категории...`);
            
            const services = await extractServicesFromCategoryPage(page, category);
            
            results.categories[category.slug] = {
                name: category.name,
                url: BASE_URL + category.url,
                services: services,
                count: services.length
            };
            
            // Небольшая задержка между категориями
            if (i < CATEGORIES_TO_TRAVERSE.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Собираем все услуги в один список
        const allServices = [];
        for (const [slug, categoryData] of Object.entries(results.categories)) {
            categoryData.services.forEach(service => {
                service.category = slug;
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
            totalCategories: Object.keys(results.categories).length,
            totalServices: uniqueServices.length,
            byCategory: Object.fromEntries(
                Object.entries(results.categories).map(([slug, data]) => [slug, data.count])
            )
        };
        
        // Сохраняем результаты
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
        
        // Выводим статистику
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ ДЕТАЛЬНОГО ОБХОДА');
        console.log('='.repeat(70));
        console.log(`✅ Обработано категорий: ${results.summary.totalCategories}`);
        console.log(`✅ Всего найдено услуг: ${results.summary.totalServices}`);
        
        console.log('\n📋 Услуги по категориям:');
        for (const [slug, categoryData] of Object.entries(results.categories)) {
            console.log(`\n${categoryData.name} (${categoryData.count}):`);
            categoryData.services.forEach((service, i) => {
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

module.exports = { extractServicesFromCategoryPage };
