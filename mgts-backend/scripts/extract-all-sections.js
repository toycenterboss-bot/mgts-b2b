/**
 * Извлечение всех разделов сайта и услуг из каждого раздела
 * Обрабатывает не только "Бизнесу", но и все остальные разделы
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/all-sections-structure.json');

/**
 * Найти все разделы на главной странице
 */
async function findAllSections(page) {
    console.log('🔍 Поиск всех разделов на главной странице...');
    
    await page.goto(BASE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Открываем меню бургер
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const burger = buttons.find(btn => {
            const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
            const className = (btn.className || '').toLowerCase();
            return text.includes('меню') || text.includes('menu') ||
                   className.includes('menu') || className.includes('burger');
        });
        if (burger) burger.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Делаем скриншот меню
    await page.screenshot({ 
        path: path.join(__dirname, '../../temp/services-extraction/all-sections-menu.png'), 
        fullPage: true 
    });
    
    // Извлекаем все разделы
    const sections = await page.evaluate((baseUrl) => {
        const foundSections = [];
        const processedUrls = new Set();
        
        // Ищем все основные разделы в меню
        const menuSelectors = [
            'nav a[href]',
            '[class*="menu"] a[href]',
            '[class*="navigation"] a[href]',
            '[role="navigation"] a[href]',
            '[role="menu"] a[href]'
        ];
        
        menuSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(link => {
                    const href = link.getAttribute('href');
                    if (!href) return;
                    
                    const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                    if (processedUrls.has(fullUrl)) return;
                    
                    // Пропускаем служебные ссылки
                    if (href.includes('#') || href.includes('mailto:') || href.includes('tel:') || 
                        href === '/' || href === '' || href === '/#') {
                        return;
                    }
                    
                    const title = link.textContent.trim();
                    if (title && title.length > 1 && title.length < 50) {
                        // Проверяем, что это не просто служебная ссылка
                        if (!title.match(/^(8|7|\+7|\d{1,3})/) && // Не телефон
                            !title.match(/^(О|А|И|В|На|Для)$/i)) { // Не предлоги
                            
                            processedUrls.add(fullUrl);
                            foundSections.push({
                                title: title,
                                url: fullUrl,
                                slug: href.split('/').filter(Boolean).pop() || href.replace(/^\//, '') || 'home',
                                path: href
                            });
                        }
                    }
                });
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        // Также ищем разделы в основном контенте
        const mainContent = document.querySelector('main, [role="main"], [class*="content"]');
        if (mainContent) {
            mainContent.querySelectorAll('a[href]').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                
                const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                if (processedUrls.has(fullUrl)) return;
                
                if (href.startsWith('/') && !href.includes('#') && href !== '/') {
                    const title = link.textContent.trim();
                    const parent = link.closest('[class*="section"], [class*="card"], [class*="service"]');
                    const sectionTitle = parent?.querySelector('h2, h3, h4')?.textContent?.trim() || '';
                    
                    if (title && title.length > 2 && title.length < 50) {
                        processedUrls.add(fullUrl);
                        foundSections.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || 'home',
                            path: href,
                            section: sectionTitle
                        });
                    }
                }
            });
        }
        
        // Удаляем дубликаты
        const unique = [];
        const seen = new Set();
        foundSections.forEach(s => {
            if (!seen.has(s.url)) {
                seen.add(s.url);
                unique.push(s);
            }
        });
        
        return unique;
    }, BASE_URL);
    
    console.log(`✅ Найдено разделов: ${sections.length}`);
    return sections;
}

/**
 * Извлечь услуги из раздела
 */
async function extractServicesFromSection(page, section) {
    console.log(`\n📁 Обработка раздела: ${section.title}`);
    console.log(`   URL: ${section.url}`);
    
    try {
        await page.goto(section.url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Ищем кнопку "Все услуги"
        const showAllButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            return buttons.find(btn => {
                const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
                return text.includes('все услуги') || 
                       text.includes('показать все') ||
                       text.includes('смотреть все');
            });
        });
        
        if (showAllButton) {
            console.log(`   ✅ Найдена кнопка "Все услуги", кликаем...`);
            try {
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                    const btn = buttons.find(b => {
                        const text = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                        return text.includes('все услуги') || text.includes('показать все');
                    });
                    if (btn) {
                        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        btn.click();
                    }
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (e) {
                console.log(`   ⚠️  Ошибка при клике: ${e.message}`);
            }
        }
        
        // Извлекаем услуги
        const services = await page.evaluate((baseUrl) => {
            const foundServices = [];
            const processedUrls = new Set();
            
            // Ищем все ссылки на услуги
            document.querySelectorAll('a[href*="/"]').forEach(link => {
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
                    if (!title.match(/^(8|7|\+7|\d{1,3})/)) {
                        processedUrls.add(fullUrl);
                        foundServices.push({
                            title: title,
                            url: fullUrl,
                            slug: href.split('/').filter(Boolean).pop() || '',
                            path: href
                        });
                    }
                }
            });
            
            // Также ищем карточки услуг
            const cardSelectors = [
                '[class*="service-card"]',
                '[class*="product-card"]',
                '[class*="card"]',
                'article'
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
                        
                        const title = card.querySelector('h1, h2, h3, h4, .title')?.textContent?.trim() || 
                                     link.textContent.trim();
                        const description = card.querySelector('p, .description')?.textContent?.trim() || '';
                        
                        if (title && title.length > 2) {
                            processedUrls.add(fullUrl);
                            foundServices.push({
                                title: title,
                                url: fullUrl,
                                slug: href.split('/').filter(Boolean).pop() || '',
                                path: href,
                                description: description.substring(0, 300)
                            });
                        }
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
        
        console.log(`   ✅ Найдено услуг/страниц: ${services.length}`);
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
    console.log('🚀 ИЗВЛЕЧЕНИЕ ВСЕХ РАЗДЕЛОВ И УСЛУГ');
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
        
        // Находим все разделы
        const sections = await findAllSections(page);
        
        console.log('\n📋 Найденные разделы:');
        sections.forEach((section, i) => {
            console.log(`  ${i + 1}. ${section.title} - ${section.url}`);
        });
        
        // Обрабатываем каждый раздел
        const results = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            sections: {}
        };
        
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            console.log(`\n[${i + 1}/${sections.length}] Обработка раздела...`);
            
            const services = await extractServicesFromSection(page, section);
            
            results.sections[section.slug] = {
                title: section.title,
                url: section.url,
                path: section.path,
                services: services,
                count: services.length
            };
            
            // Небольшая задержка между разделами
            if (i < sections.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Собираем все услуги в один список
        const allServices = [];
        for (const [slug, sectionData] of Object.entries(results.sections)) {
            sectionData.services.forEach(service => {
                service.section = slug;
                service.sectionTitle = sectionData.title;
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
        console.log(`✅ Всего найдено услуг/страниц: ${results.summary.totalServices}`);
        
        console.log('\n📋 Услуги по разделам:');
        for (const [slug, sectionData] of Object.entries(results.sections)) {
            console.log(`\n${sectionData.title} (${sectionData.count}):`);
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

module.exports = { findAllSections, extractServicesFromSection };
