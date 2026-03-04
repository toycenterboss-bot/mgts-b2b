/**
 * Извлечение полной структуры услуг через меню бургер
 * Открывает меню, проходит по всем разделам и извлекает структуру дерева
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/burger-menu-structure.json');

/**
 * Извлечь структуру из меню бургер
 */
async function extractFromBurgerMenu(page) {
    console.log('🍔 Открытие меню бургер...');
    
    // Ждем загрузки страницы
    await page.goto(BASE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Ищем и открываем меню бургер
    const burgerFound = await page.evaluate(() => {
        // Ищем кнопку меню
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], [class*="menu-toggle"], [class*="burger"]'));
        const burger = buttons.find(btn => {
            const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
            const className = (btn.className || '').toLowerCase();
            return text.includes('меню') || 
                   text.includes('menu') ||
                   className.includes('menu') ||
                   className.includes('burger') ||
                   className.includes('hamburger');
        });
        
        if (burger) {
            burger.click();
            return true;
        }
        return false;
    });
    
    if (!burgerFound) {
        console.log('⚠️  Кнопка меню бургер не найдена автоматически');
        // Пробуем найти любую кнопку с SVG (обычно это меню)
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button:has(svg), button svg'));
            if (buttons.length > 0) {
                buttons[0].closest('button')?.click();
            }
        });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Делаем скриншот открытого меню
    await page.screenshot({ 
        path: path.join(__dirname, '../../temp/services-extraction/burger-menu-open.png'), 
        fullPage: true 
    });
    console.log('📸 Скриншот открытого меню сохранен');
    
    // Извлекаем структуру меню
    const menuStructure = await page.evaluate((baseUrl) => {
        const structure = {
            sections: [],
            services: []
        };
        
        // Ищем все разделы в меню
        const menuSelectors = [
            'nav',
            '[class*="menu"]',
            '[class*="navigation"]',
            '[role="navigation"]',
            '[role="menu"]'
        ];
        
        menuSelectors.forEach(selector => {
            try {
                const menus = document.querySelectorAll(selector);
                menus.forEach(menu => {
                    // Ищем разделы
                    const sections = menu.querySelectorAll('[class*="section"], [class*="category"], h2, h3, [class*="title"]');
                    sections.forEach(section => {
                        const sectionTitle = section.textContent.trim();
                        if (sectionTitle && sectionTitle.length > 2) {
                            // Ищем услуги в этом разделе
                            const links = section.parentElement?.querySelectorAll('a[href*="/business"]') || 
                                        section.nextElementSibling?.querySelectorAll('a[href*="/business"]') || [];
                            
                            const services = Array.from(links).map(link => {
                                const href = link.getAttribute('href');
                                const title = link.textContent.trim();
                                return {
                                    title: title,
                                    url: href.startsWith('http') ? href : baseUrl + href,
                                    slug: href.split('/').filter(Boolean).pop() || ''
                                };
                            }).filter(s => s.title && s.title.length > 2);
                            
                            if (services.length > 0 || sectionTitle.includes('Бизнес') || sectionTitle.includes('Услуг')) {
                                structure.sections.push({
                                    title: sectionTitle,
                                    services: services
                                });
                                
                                services.forEach(s => structure.services.push(s));
                            }
                        }
                    });
                    
                    // Также ищем все ссылки на услуги в меню
                    const allLinks = menu.querySelectorAll('a[href*="/business"]');
                    allLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        const title = link.textContent.trim();
                        
                        if (href && title && title.length > 2) {
                            const service = {
                                title: title,
                                url: href.startsWith('http') ? href : baseUrl + href,
                                slug: href.split('/').filter(Boolean).pop() || ''
                            };
                            
                            // Проверяем, нет ли уже такой услуги
                            if (!structure.services.find(s => s.url === service.url)) {
                                structure.services.push(service);
                            }
                        }
                    });
                });
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        // Удаляем дубликаты
        const uniqueServices = [];
        const seen = new Set();
        structure.services.forEach(s => {
            if (!seen.has(s.url)) {
                seen.add(s.url);
                uniqueServices.push(s);
            }
        });
        structure.services = uniqueServices;
        
        return structure;
    }, BASE_URL);
    
    return menuStructure;
}

/**
 * Построить дерево из структуры меню
 */
function buildTreeFromMenu(menuStructure) {
    const tree = {
        root: {
            name: 'Услуги МГТС',
            url: BASE_URL,
            children: []
        }
    };
    
    // Группируем по разделам
    menuStructure.sections.forEach(section => {
        if (section.services.length > 0) {
            const sectionNode = {
                name: section.title,
                slug: section.title.toLowerCase().replace(/\s+/g, '-'),
                url: BASE_URL,
                children: section.services.map(service => ({
                    title: service.title,
                    url: service.url,
                    slug: service.slug,
                    level: 2
                }))
            };
            tree.root.children.push(sectionNode);
        }
    });
    
    // Если есть услуги вне разделов, добавляем их
    const sectionServices = new Set();
    menuStructure.sections.forEach(s => s.services.forEach(serv => sectionServices.add(serv.url)));
    
    const orphanServices = menuStructure.services.filter(s => !sectionServices.has(s.url));
    if (orphanServices.length > 0) {
        const otherNode = {
            name: 'Прочее',
            slug: 'other',
            url: BASE_URL,
            children: orphanServices.map(service => ({
                title: service.title,
                url: service.url,
                slug: service.slug,
                level: 2
            }))
        };
        tree.root.children.push(otherNode);
    }
    
    return tree;
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ИЗВЛЕЧЕНИЕ СТРУКТУРЫ ИЗ МЕНЮ БУРГЕР');
    console.log('='.repeat(70));
    console.log(`🌐 URL: ${BASE_URL}`);
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
        
        // Извлекаем структуру из меню
        console.log('\n📋 Извлечение структуры из меню бургер...');
        const menuStructure = await extractFromBurgerMenu(page);
        
        console.log(`✅ Найдено разделов: ${menuStructure.sections.length}`);
        console.log(`✅ Найдено услуг: ${menuStructure.services.length}`);
        
        // Строим дерево
        const tree = buildTreeFromMenu(menuStructure);
        
        // Сохраняем результаты
        const result = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            menuStructure: menuStructure,
            tree: tree,
            summary: {
                sections: menuStructure.sections.length,
                totalServices: menuStructure.services.length,
                bySection: menuStructure.sections.map(s => ({
                    title: s.title,
                    count: s.services.length
                }))
            }
        };
        
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
        
        // Выводим результаты
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ');
        console.log('='.repeat(70));
        console.log(`✅ Разделов: ${menuStructure.sections.length}`);
        console.log(`✅ Всего услуг: ${menuStructure.services.length}`);
        
        console.log('\n📋 Структура по разделам:');
        menuStructure.sections.forEach((section, i) => {
            console.log(`\n${i + 1}. ${section.title} (${section.services.length} услуг):`);
            section.services.forEach((service, j) => {
                console.log(`   ${j + 1}. ${service.title}`);
                console.log(`      ${service.url}`);
            });
        });
        
        if (menuStructure.services.length > 0) {
            console.log('\n📋 Все услуги:');
            menuStructure.services.forEach((service, i) => {
                console.log(`${i + 1}. ${service.title}`);
                console.log(`   ${service.url}`);
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

module.exports = { extractFromBurgerMenu, buildTreeFromMenu };
