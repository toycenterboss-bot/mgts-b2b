/**
 * Извлечение всех услуг со страницы "Бизнесу" с использованием кнопки "Все услуги"
 * Заходит на /business, находит кнопку "Все услуги", кликает и извлекает полный список
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const BUSINESS_PAGE_URL = BASE_URL + '/business';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/all-services-from-business-page.json');

/**
 * Извлечь все услуги со страницы "Бизнесу"
 */
async function extractAllServicesFromBusinessPage(page) {
    console.log(`📄 Переход на страницу "Бизнесу": ${BUSINESS_PAGE_URL}`);
    
    await page.goto(BUSINESS_PAGE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });
    
    // Ждем загрузки React контента
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Делаем скриншот до клика
    await page.screenshot({ 
        path: path.join(__dirname, '../../temp/services-extraction/business-page-before.png'), 
        fullPage: true 
    });
    console.log('📸 Скриншот до клика сохранен');
    
    // Ищем кнопку "Все услуги"
    console.log('🔍 Поиск кнопки "Все услуги"...');
    const buttonInfo = await page.evaluate(() => {
        // Ищем по тексту
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [class*="button"], [class*="link"]'));
        let found = null;
        
        for (const btn of buttons) {
            const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
            const className = (btn.className || '').toLowerCase();
            
            if (text.includes('все услуги') || 
                text.includes('показать все') ||
                text.includes('смотреть все') ||
                text.includes('все решения') ||
                className.includes('all-services') ||
                className.includes('show-all')) {
                found = {
                    text: btn.textContent.trim(),
                    tag: btn.tagName.toLowerCase(),
                    className: className,
                    visible: btn.offsetParent !== null
                };
                break;
            }
        }
        
        // Если не нашли по тексту, ищем по классам
        if (!found) {
            const byClass = document.querySelector('[class*="all-services"], [class*="show-all"], [class*="expand"], [class*="more"]');
            if (byClass) {
                found = {
                    text: byClass.textContent.trim(),
                    tag: byClass.tagName.toLowerCase(),
                    className: byClass.className,
                    visible: byClass.offsetParent !== null
                };
            }
        }
        
        return found;
    });
    
    if (buttonInfo) {
        console.log(`✅ Найдена кнопка: "${buttonInfo.text}" (${buttonInfo.tag}, видима: ${buttonInfo.visible})`);
        
        // Кликаем на кнопку
        console.log('🖱️  Кликаем на кнопку "Все услуги"...');
        try {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                const btn = buttons.find(b => {
                    const text = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                    const className = (b.className || '').toLowerCase();
                    return text.includes('все услуги') || 
                           text.includes('показать все') ||
                           className.includes('all-services') ||
                           className.includes('show-all');
                });
                
                if (btn) {
                    // Прокручиваем к кнопке
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Кликаем
                    btn.click();
                }
            });
            
            // Ждем раскрытия списка
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('✅ Кнопка нажата, ожидаем раскрытия списка...');
            
            // Делаем скриншот после клика
            await page.screenshot({ 
                path: path.join(__dirname, '../../temp/services-extraction/business-page-after.png'), 
                fullPage: true 
            });
            console.log('📸 Скриншот после клика сохранен');
            
        } catch (e) {
            console.log(`⚠️  Ошибка при клике: ${e.message}`);
        }
    } else {
        console.log('⚠️  Кнопка "Все услуги" не найдена');
    }
    
    // Извлекаем все услуги со страницы
    console.log('📋 Извлечение услуг со страницы...');
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
                    
                    // Пропускаем общие страницы
                    if (href === '/business' || href === '/business/' || href.includes('#')) return;
                    
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
        
        // Метод 2: Ищем все ссылки на услуги (более агрессивный поиск)
        document.querySelectorAll('a[href*="/business"]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            const fullUrl = href.startsWith('http') ? href : baseUrl + href;
            if (processedUrls.has(fullUrl)) return;
            
            // Пропускаем общие страницы и навигацию
            if (href === '/business' || href === '/business/' || 
                href.includes('#') || href.includes('mailto:') || href.includes('tel:')) {
                return;
            }
            
            // Пропускаем ссылки в header/footer/nav
            const parent = link.closest('header, footer, nav, [class*="header"], [class*="footer"], [class*="nav"]');
            if (parent) return;
            
            const title = link.textContent.trim();
            if (title && title.length > 2 && title.length < 150) {
                // Проверяем, что это не просто служебная ссылка
                if (!title.match(/^(8|7|\+7|\d{1,3})/)) { // Не телефон
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
                        
                        if (href === '/business' || href === '/business/') return;
                        
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
    
    console.log(`✅ Найдено услуг: ${services.length}`);
    return services;
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ИЗВЛЕЧЕНИЕ ВСЕХ УСЛУГ СО СТРАНИЦЫ "БИЗНЕСУ"');
    console.log('='.repeat(70));
    console.log(`🌐 URL: ${BUSINESS_PAGE_URL}`);
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
        const services = await extractAllServicesFromBusinessPage(page);
        
        // Определяем категории
        services.forEach(service => {
            const url = service.url.toLowerCase();
            if (url.includes('telephony')) service.category = 'telephony';
            else if (url.includes('internet') || url.includes('access_internet')) service.category = 'internet';
            else if (url.includes('security') || url.includes('video') || url.includes('alarm')) service.category = 'security';
            else if (url.includes('cloud')) service.category = 'cloud';
            else if (url.includes('tv') || url.includes('television')) service.category = 'tv';
            else if (url.includes('mobile')) service.category = 'mobile';
            else service.category = 'other';
        });
        
        // Группируем по категориям
        const byCategory = {};
        services.forEach(service => {
            if (!byCategory[service.category]) {
                byCategory[service.category] = [];
            }
            byCategory[service.category].push(service);
        });
        
        // Сохраняем результаты
        const result = {
            timestamp: new Date().toISOString(),
            sourceUrl: BUSINESS_PAGE_URL,
            totalServices: services.length,
            services: services,
            byCategory: byCategory,
            summary: {
                total: services.length,
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
        console.log(`✅ Всего услуг: ${services.length}`);
        console.log(`📁 Категорий: ${result.summary.categories}`);
        
        console.log('\n📋 Услуги по категориям:');
        for (const [category, items] of Object.entries(byCategory)) {
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
        console.log('\n⏳ Браузер останется открытым 10 секунд для проверки...');
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

module.exports = { extractAllServicesFromBusinessPage };
