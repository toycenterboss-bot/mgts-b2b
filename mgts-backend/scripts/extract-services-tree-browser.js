/**
 * Скрипт для извлечения полной структуры дерева услуг с сайта business.mgts.ru
 * Использует Puppeteer для автоматизации браузера и навигации по меню
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'services-tree.json');

// Создаем директорию для результатов
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Извлечь структуру меню из DOM
 */
async function extractMenuStructure(page) {
    console.log('📋 Извлечение структуры меню...');
    
    // Ждем загрузки React приложения
    console.log('⏳ Ожидание загрузки контента...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Пытаемся дождаться появления контента
    try {
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForFunction(() => {
            return document.body && document.body.children.length > 0;
        }, { timeout: 10000 });
    } catch (e) {
        console.log('⚠️  Таймаут ожидания контента, продолжаем...');
    }
    
    // Ищем меню бургер (может быть в разных вариантах)
    const burgerSelectors = [
        'button[aria-label*="меню" i]',
        'button[aria-label*="menu" i]',
        'button[aria-label*="Меню"]',
        '.burger-menu',
        '.mobile-menu-toggle',
        '.menu-toggle',
        '[class*="burger"]',
        '[class*="menu-toggle"]',
        '[class*="hamburger"]',
        'button[type="button"]:has(svg)',
        'button:has(> svg)',
        '[data-testid*="menu"]',
        '[data-testid*="burger"]'
    ];
    
    let burgerButton = null;
    let foundSelector = null;
    
    for (const selector of burgerSelectors) {
        try {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                // Берем первый элемент, который виден
                for (const elem of elements) {
                    try {
                        const isVisible = await page.evaluate(el => {
                            if (!el) return false;
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                        }, elem);
                        
                        if (isVisible) {
                            burgerButton = elem;
                            foundSelector = selector;
                            break;
                        }
                    } catch (e) {
                        // Продолжаем
                    }
                }
                if (burgerButton) break;
            }
        } catch (e) {
            // Продолжаем поиск
        }
    }
    
    if (!burgerButton) {
        console.log('⚠️  Кнопка меню не найдена автоматически, пытаемся найти меню напрямую...');
        
        // Пробуем найти через анализ всех кнопок
        const allButtons = await page.$$('button');
        console.log(`🔍 Найдено кнопок на странице: ${allButtons.length}`);
        
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            const button = allButtons[i];
            const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label') || '', button);
            const className = await page.evaluate(el => el.className || '', button);
            
            if (text.toLowerCase().includes('меню') || 
                text.toLowerCase().includes('menu') ||
                className.toLowerCase().includes('menu') ||
                className.toLowerCase().includes('burger')) {
                burgerButton = button;
                foundSelector = `button[${i}]`;
                console.log(`✅ Найдена кнопка меню по тексту/классу: "${text}" / "${className}"`);
                break;
            }
        }
    } else {
        console.log(`✅ Найдена кнопка меню: ${foundSelector}`);
    }
    
    if (burgerButton) {
        // Кликаем на меню бургер
        console.log('🍔 Открываем меню бургер...');
        try {
            await burgerButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем открытия меню
            console.log('✅ Меню открыто');
        } catch (e) {
            console.log('⚠️  Ошибка при клике на меню:', e.message);
        }
    } else {
        console.log('⚠️  Меню бургер не найдено, извлекаем структуру из видимого меню...');
    }
    
    // Извлекаем структуру меню
    const menuStructure = await page.evaluate((baseUrl) => {
        const structure = {
            categories: [],
            services: []
        };
        
        // Ищем все ссылки в меню
        const menuSelectors = [
            'nav a',
            '.menu a',
            '.navigation a',
            '[class*="menu"] a',
            '[class*="nav"] a',
            'ul a',
            'li a'
        ];
        
        const links = new Set();
        
        // Собираем все ссылки из меню
        menuSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(link => {
                    const href = link.getAttribute('href');
                    const text = link.textContent.trim();
                    
                    if (href && text && (href.includes('/business') || href.includes('/service') || href.includes('/услуг'))) {
                        links.add(JSON.stringify({
                            text: text,
                            href: href,
                            parent: link.closest('ul, li, nav, [class*="menu"], [class*="nav"]')?.textContent?.trim() || ''
                        }));
                    }
                });
            } catch (e) {
                // Игнорируем ошибки
            }
        });
        
        // Преобразуем в массив
        const linksArray = Array.from(links).map(JSON.parse);
        
        // Группируем по категориям
        const categories = {};
        linksArray.forEach(link => {
            const category = link.parent || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({
                title: link.text,
                url: link.href.startsWith('http') ? link.href : baseUrl + link.href,
                slug: link.href.split('/').filter(Boolean).pop() || ''
            });
        });
        
        return {
            categories: Object.keys(categories).map(name => ({
                name: name,
                services: categories[name]
            })),
            allServices: linksArray.map(link => ({
                title: link.text,
                url: link.href.startsWith('http') ? link.href : baseUrl + link.href,
                slug: link.href.split('/').filter(Boolean).pop() || ''
            }))
        };
    }, BASE_URL);
    
    return menuStructure;
}

/**
 * Рекурсивно извлечь структуру дерева услуг
 */
async function extractServicesTree(page) {
    console.log('🌳 Извлечение дерева услуг...');
    
    const tree = {
        root: {
            name: 'Услуги',
            url: BASE_URL,
            children: []
        },
        flat: []
    };
    
    // Сначала получаем структуру меню
    const menuStructure = await extractMenuStructure(page);
    
    // Анализируем URL для построения дерева
    const urlMap = new Map();
    
    menuStructure.allServices.forEach(service => {
        const url = service.url;
        const parts = url.replace(BASE_URL, '').split('/').filter(Boolean);
        
        // Строим путь в дереве
        let current = tree.root;
        let currentPath = '';
        
        parts.forEach((part, index) => {
            currentPath += '/' + part;
            const fullUrl = BASE_URL + currentPath;
            
            // Ищем или создаем узел
            let node = current.children.find(c => c.slug === part);
            
            if (!node) {
                node = {
                    name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
                    slug: part,
                    url: fullUrl,
                    children: [],
                    level: index + 1
                };
                current.children.push(node);
            }
            
            // Если это последний элемент - это услуга
            if (index === parts.length - 1) {
                node.title = service.title;
                node.isService = true;
                tree.flat.push({
                    title: service.title,
                    slug: service.slug,
                    url: service.url,
                    path: parts.join('/'),
                    category: parts[0] || 'other',
                    level: parts.length
                });
            }
            
            current = node;
        });
    });
    
    return { tree, flat: tree.flat, categories: menuStructure.categories };
}

/**
 * Улучшенное извлечение с навигацией по меню
 */
async function extractWithNavigation(page) {
    console.log('🧭 Навигация по меню для извлечения структуры...');
    
    const servicesTree = {
        structure: [],
        flat: []
    };
    
    // Сделаем скриншот для анализа
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'menu-screenshot.png'), fullPage: true });
    console.log('📸 Скриншот меню сохранен');
    
    // Пытаемся найти и кликнуть на все разделы меню
    const menuItems = await page.evaluate(() => {
        const items = [];
        
        // Ищем все кликабельные элементы в меню
        const selectors = [
            'nav a',
            '.menu a',
            '[class*="menu"] a',
            '[class*="nav"] a',
            'button[aria-expanded]',
            '[role="menuitem"]',
            '[role="button"]'
        ];
        
        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    const text = el.textContent.trim();
                    const href = el.getAttribute('href');
                    const ariaLabel = el.getAttribute('aria-label');
                    
                    if (text || ariaLabel) {
                        items.push({
                            text: text || ariaLabel,
                            href: href,
                            selector: selector,
                            tag: el.tagName.toLowerCase()
                        });
                    }
                });
            } catch (e) {
                // Игнорируем
            }
        });
        
        return items;
    });
    
    console.log(`📋 Найдено элементов меню: ${menuItems.length}`);
    
    // Извлекаем структуру через анализ DOM
    const domStructure = await page.evaluate(() => {
        const structure = [];
        
        // Ищем все навигационные структуры
        const navElements = document.querySelectorAll('nav, [class*="menu"], [class*="nav"], [role="navigation"]');
        
        navElements.forEach(nav => {
            const extractLinks = (element, level = 0, parent = null) => {
                const links = [];
                const children = element.querySelectorAll(':scope > a, :scope > li > a, :scope > ul > li > a');
                
                children.forEach(link => {
                    const text = link.textContent.trim();
                    const href = link.getAttribute('href');
                    
                    if (href && text) {
                        const item = {
                            text: text,
                            href: href,
                            level: level,
                            parent: parent,
                            children: []
                        };
                        
                        // Рекурсивно ищем дочерние элементы
                        const parentLi = link.closest('li');
                        if (parentLi) {
                            const subMenu = parentLi.querySelector('ul, [class*="submenu"], [class*="dropdown"]');
                            if (subMenu) {
                                item.children = extractLinks(subMenu, level + 1, text);
                            }
                        }
                        
                        links.push(item);
                    }
                });
                
                return links;
            };
            
            const navLinks = extractLinks(nav);
            if (navLinks.length > 0) {
                structure.push({
                    type: nav.tagName.toLowerCase(),
                    className: nav.className,
                    links: navLinks
                });
            }
        });
        
        return structure;
    });
    
    return { menuItems, domStructure };
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ИЗВЛЕЧЕНИЕ СТРУКТУРЫ ДЕРЕВА УСЛУГ');
    console.log('='.repeat(70));
    console.log(`🌐 URL: ${BASE_URL}`);
    console.log(`📁 Результаты: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
    
    let browser;
    
    try {
        // Запускаем браузер
        console.log('\n🌐 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: false, // Показываем браузер для отладки
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // Переходим на сайт
        console.log(`📡 Переход на ${BASE_URL}...`);
        await page.goto(BASE_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log('✅ Страница загружена');
        
        // Ждем загрузки контента
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Извлекаем структуру через навигацию
        const navigationData = await extractWithNavigation(page);
        
        // Извлекаем дерево услуг
        const servicesData = await extractServicesTree(page);
        
        // Объединяем данные
        const result = {
            timestamp: new Date().toISOString(),
            url: BASE_URL,
            navigation: navigationData,
            servicesTree: servicesData.tree,
            flatServices: servicesData.flat,
            categories: servicesData.categories,
            summary: {
                totalServices: servicesData.flat.length,
                categories: servicesData.categories.length,
                menuItems: navigationData.menuItems.length
            }
        };
        
        // Сохраняем результаты
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
        
        // Выводим структуру
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ');
        console.log('='.repeat(70));
        console.log(`✅ Всего услуг: ${result.summary.totalServices}`);
        console.log(`📁 Категорий: ${result.summary.categories}`);
        console.log(`🔗 Элементов меню: ${result.summary.menuItems}`);
        
        console.log('\n🌳 Структура дерева:');
        function printTree(node, indent = '') {
            console.log(`${indent}${node.name}${node.isService ? ' (услуга)' : ''}`);
            if (node.url) {
                console.log(`${indent}  └─ ${node.url}`);
            }
            node.children.forEach(child => printTree(child, indent + '  '));
        }
        printTree(result.servicesTree.root);
        
        console.log('\n📋 Плоский список услуг:');
        result.flatServices.forEach((service, i) => {
            console.log(`${i + 1}. ${service.title} (${service.category})`);
            console.log(`   ${service.url}`);
        });
        
        console.log('\n' + '='.repeat(70));
        console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
        console.log('='.repeat(70));
        
        // Ждем перед закрытием браузера
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

// Запуск
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { extractServicesTree, extractWithNavigation };
