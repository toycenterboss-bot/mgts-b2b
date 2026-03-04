/**
 * Глубокий обход всех услуг с извлечением полной структуры
 * Ищет кнопки "Все услуги" и раскрывает полные списки подуслуг
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const INPUT_FILE = path.join(__dirname, '../../temp/services-extraction/services-tree.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/services-deep-tree.json');

/**
 * Извлечь все услуги со страницы
 */
async function extractServicesFromPage(page, url) {
    console.log(`  📄 Обработка: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Ждем загрузки контента
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Ищем кнопку "Все услуги" или подобные
        const allServicesButton = await page.evaluate(() => {
            // Ищем по тексту
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [class*="button"], [class*="link"]'));
            let found = buttons.find(btn => {
                const text = btn.textContent.trim().toLowerCase();
                return (text.includes('все услуги') || 
                       (text.includes('все') && text.includes('услуг')) ||
                       text.includes('показать все') ||
                       text.includes('смотреть все') ||
                       text.includes('все решения') ||
                       text === 'все услуги');
            });
            
            // Если не нашли, ищем по aria-label
            if (!found) {
                found = buttons.find(btn => {
                    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                    return ariaLabel.includes('все услуги') || ariaLabel.includes('показать все');
                });
            }
            
            // Если не нашли, ищем по классам
            if (!found) {
                found = document.querySelector('[class*="all-services"], [class*="show-all"], [class*="expand"]');
            }
            
            return found;
        });
        
        if (allServicesButton) {
            console.log(`    ✅ Найдена кнопка "Все услуги", кликаем...`);
            try {
                // Прокручиваем к кнопке
                await page.evaluate((btn) => {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, allServicesButton);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Кликаем
                await page.evaluate((btn) => btn.click(), allServicesButton);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем раскрытия
                console.log(`    ✅ Кнопка нажата, ожидаем раскрытия списка...`);
            } catch (e) {
                console.log(`    ⚠️  Ошибка при клике: ${e.message}`);
            }
        } else {
            console.log(`    ℹ️  Кнопка "Все услуги" не найдена на странице`);
        }
        
        // Извлекаем все услуги со страницы
        const services = await page.evaluate((baseUrl) => {
            const foundServices = [];
            
            // Ищем ссылки на услуги
            const linkSelectors = [
                'a[href*="/business"]',
                'a[href*="/service"]',
                '[class*="service"] a',
                '[class*="card"] a',
                '[class*="product"] a'
            ];
            
            const processedUrls = new Set();
            
            linkSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(link => {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        
                        const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                        if (processedUrls.has(fullUrl)) return;
                        
                        // Проверяем, что это ссылка на услугу
                        if (href.includes('/business') && 
                            !href.includes('#') && 
                            !href.includes('mailto:') && 
                            !href.includes('tel:')) {
                            
                            const text = link.textContent.trim();
                            const title = link.closest('[class*="card"], [class*="service"], [class*="item"]')?.querySelector('h2, h3, h4, .title')?.textContent?.trim() || text;
                            
                            if (text && text.length > 2 && text.length < 100) {
                                processedUrls.add(fullUrl);
                                foundServices.push({
                                    title: title || text,
                                    url: fullUrl,
                                    slug: href.split('/').filter(Boolean).pop() || '',
                                    description: link.closest('[class*="card"], [class*="service"]')?.querySelector('p, .description')?.textContent?.trim() || ''
                                });
                            }
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            // Также ищем карточки услуг
            const cardSelectors = [
                '[class*="service-card"]',
                '[class*="product-card"]',
                '[class*="service-item"]'
            ];
            
            cardSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(card => {
                        const link = card.querySelector('a');
                        if (!link) return;
                        
                        const href = link.getAttribute('href');
                        if (!href) return;
                        
                        const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                        if (processedUrls.has(fullUrl)) return;
                        
                        if (href.includes('/business')) {
                            const title = card.querySelector('h2, h3, h4, .title')?.textContent?.trim() || link.textContent.trim();
                            const description = card.querySelector('p, .description')?.textContent?.trim() || '';
                            
                            if (title && title.length > 2) {
                                processedUrls.add(fullUrl);
                                foundServices.push({
                                    title: title,
                                    url: fullUrl,
                                    slug: href.split('/').filter(Boolean).pop() || '',
                                    description: description
                                });
                            }
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            return foundServices;
        }, BASE_URL);
        
        // Удаляем дубликаты
        const uniqueServices = [];
        const seenUrls = new Set();
        
        services.forEach(service => {
            if (!seenUrls.has(service.url)) {
                seenUrls.add(service.url);
                uniqueServices.push(service);
            }
        });
        
        console.log(`    ✅ Найдено услуг: ${uniqueServices.length}`);
        return uniqueServices;
        
    } catch (error) {
        console.error(`    ❌ Ошибка при обработке ${url}:`, error.message);
        return [];
    }
}

/**
 * Рекурсивно обойти все услуги
 */
async function deepTraverseServices(page, services, visited = new Set(), maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
        return [];
    }
    
    const allServices = [];
    
    for (const service of services) {
        // Пропускаем уже посещенные
        if (visited.has(service.url)) {
            continue;
        }
        
        visited.add(service.url);
        
        // Извлекаем услуги со страницы
        const subServices = await extractServicesFromPage(page, service.url);
        
        // Добавляем текущую услугу
        const serviceWithChildren = {
            ...service,
            level: currentDepth + 1,
            children: []
        };
        
        // Рекурсивно обходим подуслуги
        if (subServices.length > 0) {
            console.log(`    🔍 Найдено ${subServices.length} подуслуг, обходим...`);
            const children = await deepTraverseServices(page, subServices, visited, maxDepth, currentDepth + 1);
            serviceWithChildren.children = children;
        }
        
        allServices.push(serviceWithChildren);
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return allServices;
}

/**
 * Построить дерево из плоского списка
 */
function buildTree(services, parentPath = '') {
    const tree = {};
    
    services.forEach(service => {
        const path = service.url.replace(BASE_URL, '').split('/').filter(Boolean);
        const category = path[0] || 'other';
        const servicePath = path.join('/');
        
        if (!tree[category]) {
            tree[category] = [];
        }
        
        tree[category].push({
            title: service.title,
            url: service.url,
            slug: service.slug,
            path: servicePath,
            level: service.level || path.length,
            description: service.description,
            children: service.children || []
        });
    });
    
    return tree;
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 ГЛУБОКИЙ ОБХОД УСЛУГ');
    console.log('='.repeat(70));
    
    // Загружаем существующую структуру
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Файл не найден:', INPUT_FILE);
        process.exit(1);
    }
    
    const existingData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    const flatServices = existingData.flatServices || [];
    
    console.log(`📊 Начальная структура: ${flatServices.length} услуг`);
    console.log(`🌐 Базовый URL: ${BASE_URL}`);
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
        
        // Обходим все услуги
        console.log('\n🔄 Начало глубокого обхода...');
        const visited = new Set();
        const deepServices = await deepTraverseServices(page, flatServices, visited, 5, 0);
        
        // Строим дерево
        const tree = buildTree(deepServices);
        
        // Собираем плоский список всех найденных услуг
        const allFlatServices = [];
        function flattenService(service, parent = null) {
            allFlatServices.push({
                ...service,
                parent: parent ? parent.title : null
            });
            
            if (service.children) {
                service.children.forEach(child => flattenService(child, service));
            }
        }
        
        deepServices.forEach(service => flattenService(service));
        
        // Сохраняем результаты
        const result = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            initialServices: flatServices.length,
            totalServices: allFlatServices.length,
            tree: tree,
            flat: allFlatServices,
            summary: {
                categories: Object.keys(tree).length,
                totalServices: allFlatServices.length,
                maxLevel: Math.max(...allFlatServices.map(s => s.level || 0))
            }
        };
        
        console.log('\n💾 Сохранение результатов...');
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
        
        // Выводим статистику
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ ГЛУБОКОГО ОБХОДА');
        console.log('='.repeat(70));
        console.log(`✅ Начальных услуг: ${flatServices.length}`);
        console.log(`✅ Всего найдено услуг: ${allFlatServices.length}`);
        console.log(`📁 Категорий: ${result.summary.categories}`);
        console.log(`📊 Максимальный уровень: ${result.summary.maxLevel}`);
        
        console.log('\n🌳 Структура по категориям:');
        for (const [category, services] of Object.entries(tree)) {
            console.log(`\n${category}:`);
            services.forEach(service => {
                const indent = '  '.repeat(service.level - 1);
                console.log(`${indent}└─ ${service.title}`);
                console.log(`${indent}   ${service.url}`);
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

module.exports = { deepTraverseServices, extractServicesFromPage };
