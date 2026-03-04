/**
 * Проверка полноты извлеченного контента
 * Проверяет вложенные и скрытые элементы
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const INDEX_FILE = path.join(PAGES_CONTENT_DIR, 'index.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/content-verification.json');

/**
 * Выбрать страницы для проверки из разных разделов
 */
function selectPagesForVerification() {
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    
    // Группируем по разделам
    const bySection = {};
    index.results.forEach(page => {
        const section = page.section || 'unknown';
        if (!bySection[section]) {
            bySection[section] = [];
        }
        bySection[section].push(page);
    });
    
    // Выбираем по 2-3 страницы из каждого раздела
    const selected = [];
    for (const [section, pages] of Object.entries(bySection)) {
        const count = Math.min(3, pages.length);
        selected.push(...pages.slice(0, count));
    }
    
    return selected.slice(0, 10); // Ограничиваем 10 страницами для проверки
}

/**
 * Проверить полноту контента на странице
 */
async function verifyPageContent(page, pageInfo) {
    const url = pageInfo.url;
    console.log(`\n🔍 Проверка: ${pageInfo.title}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Раскрываем все скрытые элементы
        await page.evaluate(() => {
            // Раскрываем аккордеоны
            document.querySelectorAll('[class*="accordion"], [class*="collapse"], [class*="faq"]').forEach(el => {
                if (el.classList.contains('collapsed') || el.getAttribute('aria-expanded') === 'false') {
                    el.click();
                }
            });
            
            // Раскрываем табы
            document.querySelectorAll('[role="tab"], [class*="tab"]').forEach(tab => {
                if (tab.getAttribute('aria-selected') === 'false' || tab.classList.contains('inactive')) {
                    tab.click();
                }
            });
            
            // Показываем скрытые элементы
            document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach(el => {
                el.style.display = '';
            });
            
            // Показываем элементы с visibility: hidden
            document.querySelectorAll('[style*="visibility: hidden"], [style*="visibility:hidden"]').forEach(el => {
                el.style.visibility = 'visible';
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Извлекаем полный контент со всеми элементами
        const fullContent = await page.evaluate(() => {
            const main = document.querySelector('main, [role="main"], .main-content, .content') || document.body;
            
            // Находим все элементы, которые могут быть скрыты
            const hiddenElements = [];
            const allElements = main.querySelectorAll('*');
            
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const isHidden = style.display === 'none' || 
                                style.visibility === 'hidden' || 
                                style.opacity === '0' ||
                                el.hasAttribute('hidden') ||
                                el.classList.contains('hidden') ||
                                el.classList.contains('d-none');
                
                if (isHidden && el.textContent.trim().length > 10) {
                    hiddenElements.push({
                        tag: el.tagName,
                        class: el.className,
                        text: el.textContent.trim().substring(0, 100),
                        html: el.innerHTML.substring(0, 200)
                    });
                }
            });
            
            // Находим вложенные элементы (модальные окна, попапы, тултипы)
            const nestedElements = [];
            document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="tooltip"], [class*="dropdown"]').forEach(el => {
                if (el.textContent.trim().length > 10) {
                    nestedElements.push({
                        type: el.className,
                        text: el.textContent.trim().substring(0, 100),
                        visible: window.getComputedStyle(el).display !== 'none'
                    });
                }
            });
            
            // Находим динамически загружаемый контент
            const dynamicContent = [];
            document.querySelectorAll('[data-content], [data-load], [data-src], [data-url]').forEach(el => {
                if (el.getAttribute('data-content') || el.getAttribute('data-load')) {
                    dynamicContent.push({
                        attribute: el.hasAttribute('data-content') ? 'data-content' : 
                                  el.hasAttribute('data-load') ? 'data-load' : 'other',
                        value: el.getAttribute('data-content') || el.getAttribute('data-load') || '',
                        text: el.textContent.trim().substring(0, 100)
                    });
                }
            });
            
            // Находим iframe
            const iframes = [];
            document.querySelectorAll('iframe').forEach(iframe => {
                iframes.push({
                    src: iframe.getAttribute('src') || '',
                    title: iframe.getAttribute('title') || ''
                });
            });
            
            return {
                mainContent: main.innerHTML,
                mainTextLength: main.textContent.trim().length,
                hiddenElements: hiddenElements,
                nestedElements: nestedElements,
                dynamicContent: dynamicContent,
                iframes: iframes,
                allImages: Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || '',
                    visible: window.getComputedStyle(img).display !== 'none'
                })),
                allLinks: Array.from(document.querySelectorAll('a[href]')).map(link => ({
                    href: link.getAttribute('href') || '',
                    text: link.textContent.trim(),
                    visible: window.getComputedStyle(link).display !== 'none'
                }))
            };
        });
        
        // Загружаем извлеченный контент
        const extractedFile = path.join(PAGES_CONTENT_DIR, pageInfo.filename);
        let extractedContent = null;
        if (fs.existsSync(extractedFile)) {
            extractedContent = JSON.parse(fs.readFileSync(extractedFile, 'utf-8'));
        }
        
        // Сравниваем
        const comparison = {
            url: url,
            title: pageInfo.title,
            extracted: {
                textLength: extractedContent?.content?.fullTextLength || 0,
                htmlLength: extractedContent?.content?.html?.length || 0,
                imagesCount: extractedContent?.content?.images?.length || 0,
                linksCount: extractedContent?.content?.links?.length || 0
            },
            full: {
                textLength: fullContent.mainTextLength,
                htmlLength: fullContent.mainContent.length,
                imagesCount: fullContent.allImages.length,
                linksCount: fullContent.allLinks.length,
                hiddenElementsCount: fullContent.hiddenElements.length,
                nestedElementsCount: fullContent.nestedElements.length,
                dynamicContentCount: fullContent.dynamicContent.length,
                iframesCount: fullContent.iframes.length
            },
            issues: []
        };
        
        // Проверяем различия
        const textDiff = fullContent.mainTextLength - (extractedContent?.content?.fullTextLength || 0);
        if (textDiff > 100) {
            comparison.issues.push({
                type: 'missing_text',
                severity: 'medium',
                message: `Пропущено текста: ${textDiff} символов`,
                details: 'Возможно, не учтены скрытые или вложенные элементы'
            });
        }
        
        if (fullContent.hiddenElements.length > 0) {
            comparison.issues.push({
                type: 'hidden_elements',
                severity: 'low',
                message: `Найдено скрытых элементов: ${fullContent.hiddenElements.length}`,
                details: fullContent.hiddenElements.slice(0, 5)
            });
        }
        
        if (fullContent.nestedElements.length > 0) {
            comparison.issues.push({
                type: 'nested_elements',
                severity: 'medium',
                message: `Найдено вложенных элементов: ${fullContent.nestedElements.length}`,
                details: fullContent.nestedElements.slice(0, 5)
            });
        }
        
        if (fullContent.dynamicContent.length > 0) {
            comparison.issues.push({
                type: 'dynamic_content',
                severity: 'high',
                message: `Найдено динамического контента: ${fullContent.dynamicContent.length}`,
                details: fullContent.dynamicContent.slice(0, 5)
            });
        }
        
        if (fullContent.iframes.length > 0) {
            comparison.issues.push({
                type: 'iframes',
                severity: 'medium',
                message: `Найдено iframe: ${fullContent.iframes.length}`,
                details: fullContent.iframes
            });
        }
        
        const imagesDiff = fullContent.allImages.length - (extractedContent?.content?.images?.length || 0);
        if (imagesDiff > 0) {
            comparison.issues.push({
                type: 'missing_images',
                severity: 'low',
                message: `Пропущено изображений: ${imagesDiff}`,
                details: 'Возможно, изображения в скрытых элементах'
            });
        }
        
        const linksDiff = fullContent.allLinks.length - (extractedContent?.content?.links?.length || 0);
        if (linksDiff > 10) {
            comparison.issues.push({
                type: 'missing_links',
                severity: 'low',
                message: `Пропущено ссылок: ${linksDiff}`,
                details: 'Возможно, ссылки в скрытых элементах'
            });
        }
        
        comparison.status = comparison.issues.length === 0 ? 'complete' : 
                           comparison.issues.some(i => i.severity === 'high') ? 'incomplete' : 'mostly_complete';
        
        return comparison;
        
    } catch (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        return {
            url: url,
            title: pageInfo.title,
            status: 'error',
            error: error.message
        };
    }
}

/**
 * Основная функция
 */
async function main() {
    console.log('🔍 ПРОВЕРКА ПОЛНОТЫ ИЗВЛЕЧЕННОГО КОНТЕНТА');
    console.log('='.repeat(70));
    
    // Загружаем индекс
    if (!fs.existsSync(INDEX_FILE)) {
        console.error('❌ Файл индекса не найден:', INDEX_FILE);
        process.exit(1);
    }
    
    // Выбираем страницы для проверки
    const pagesToVerify = selectPagesForVerification();
    console.log(`\n📋 Выбрано страниц для проверки: ${pagesToVerify.length}`);
    pagesToVerify.forEach((page, i) => {
        console.log(`  ${i + 1}. ${page.title} (${page.section})`);
    });
    
    let browser;
    const results = [];
    
    try {
        console.log('\n🌐 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log('\n📋 Проверка страниц...\n');
        
        for (let i = 0; i < pagesToVerify.length; i++) {
            const pageInfo = pagesToVerify[i];
            console.log(`[${i + 1}/${pagesToVerify.length}]`);
            
            const result = await verifyPageContent(page, pageInfo);
            results.push(result);
            
            // Выводим результаты
            if (result.status === 'complete') {
                console.log(`   ✅ Контент полный`);
            } else if (result.status === 'mostly_complete') {
                console.log(`   ⚠️  Контент в основном полный (${result.issues.length} замечаний)`);
            } else if (result.status === 'incomplete') {
                console.log(`   ❌ Контент неполный (${result.issues.length} проблем)`);
            }
            
            if (result.issues && result.issues.length > 0) {
                result.issues.forEach(issue => {
                    console.log(`      - ${issue.message}`);
                });
            }
            
            // Задержка между запросами
            if (i < pagesToVerify.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Статистика
        const complete = results.filter(r => r.status === 'complete').length;
        const mostlyComplete = results.filter(r => r.status === 'mostly_complete').length;
        const incomplete = results.filter(r => r.status === 'incomplete').length;
        const errors = results.filter(r => r.status === 'error').length;
        
        const summary = {
            timestamp: new Date().toISOString(),
            totalChecked: pagesToVerify.length,
            complete: complete,
            mostlyComplete: mostlyComplete,
            incomplete: incomplete,
            errors: errors,
            results: results,
            statistics: {
                totalIssues: results.reduce((sum, r) => sum + (r.issues?.length || 0), 0),
                issuesByType: {}
            }
        };
        
        // Группируем проблемы по типам
        results.forEach(result => {
            if (result.issues) {
                result.issues.forEach(issue => {
                    summary.statistics.issuesByType[issue.type] = 
                        (summary.statistics.issuesByType[issue.type] || 0) + 1;
                });
            }
        });
        
        // Сохраняем результаты
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
        
        // Выводим итоги
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ');
        console.log('='.repeat(70));
        console.log(`✅ Полный контент: ${complete}`);
        console.log(`⚠️  В основном полный: ${mostlyComplete}`);
        console.log(`❌ Неполный: ${incomplete}`);
        console.log(`❌ Ошибки: ${errors}`);
        console.log(`\n📋 Всего проблем: ${summary.statistics.totalIssues}`);
        
        if (Object.keys(summary.statistics.issuesByType).length > 0) {
            console.log('\n🔍 Проблемы по типам:');
            for (const [type, count] of Object.entries(summary.statistics.issuesByType)) {
                console.log(`  ${type}: ${count}`);
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
        console.log('='.repeat(70));
        
        // Ждем перед закрытием
        console.log('\n⏳ Браузер останется открытым 10 секунд...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
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

module.exports = { verifyPageContent, selectPagesForVerification };
