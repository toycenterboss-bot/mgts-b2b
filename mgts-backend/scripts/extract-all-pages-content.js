/**
 * Извлечение полного HTML контента со всех найденных страниц
 * Для использования в миграции
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const SERVICES_FILE = path.join(__dirname, '../../temp/services-extraction/all-services-all-sections.json');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');
const FAILED_PAGES_FILE = path.join(__dirname, '../../temp/services-extraction/failed-pages.json');

// Создаем директорию для сохранения контента
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Извлечь контент со страницы
 */
async function extractPageContent(page, service, index) {
    const { url, title, slug } = service;
    
    console.log(`[${index}] ${title.substring(0, 50)}...`);
    console.log(`    URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000 // 60 секунд
        });
        
        // Дополнительное ожидание для динамического контента
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Извлекаем контент
        const content = await page.evaluate(() => {
            // Удаляем скрипты и стили для чистоты
            const scripts = document.querySelectorAll('script, style, noscript');
            scripts.forEach(el => el.remove());
            
            // Получаем основной контент
            const main = document.querySelector('main, [role="main"], .main-content, .content') || document.body;
            
            return {
                html: main.innerHTML,
                title: document.title,
                metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                metaKeywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
                h1: document.querySelector('h1')?.textContent?.trim() || '',
                h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
                images: Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || '',
                    title: img.getAttribute('title') || ''
                })),
                links: Array.from(document.querySelectorAll('a[href]')).map(link => ({
                    href: link.getAttribute('href') || '',
                    text: link.textContent.trim(),
                    title: link.getAttribute('title') || ''
                })),
                textContent: main.textContent.trim().substring(0, 500), // Первые 500 символов для превью
                fullTextLength: main.textContent.trim().length
            };
        });
        
        // Получаем полный HTML страницы
        const fullHTML = await page.content();
        
        const result = {
            url: url,
            title: title,
            slug: slug,
            section: service.section || 'unknown',
            extractedAt: new Date().toISOString(),
            content: content,
            fullHTML: fullHTML,
            success: true
        };
        
        // Сохраняем в отдельный файл
        const filename = `${slug || url.split('/').pop() || 'page'}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
        
        console.log(`    ✅ Сохранено: ${filename}`);
        
        return result;
        
    } catch (error) {
        console.error(`    ❌ Ошибка: ${error.message}`);
        
        const result = {
            url: url,
            title: title,
            slug: slug,
            section: service.section || 'unknown',
            extractedAt: new Date().toISOString(),
            success: false,
            error: error.message,
            errorType: error.name
        };
        
        // Сохраняем информацию об ошибке
        const filename = `${slug || url.split('/').pop() || 'page'}-error.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
        
        return result;
    }
}

/**
 * Фильтровать страницы (исключить файлы документов и внешние ссылки)
 */
function shouldExtract(service) {
    const url = service.url.toLowerCase();
    
    // Исключаем файлы документов
    if (url.match(/\.(docx?|xlsx?|pdf|zip|rar)$/i)) {
        return false;
    }
    
    // Исключаем внешние домены
    if (!url.startsWith('https://business.mgts.ru')) {
        return false;
    }
    
    return true;
}

/**
 * Основная функция
 */
async function main() {
    console.log('📄 ИЗВЛЕЧЕНИЕ КОНТЕНТА СО ВСЕХ СТРАНИЦ');
    console.log('='.repeat(70));
    
    // Загружаем список страниц
    if (!fs.existsSync(SERVICES_FILE)) {
        console.error('❌ Файл не найден:', SERVICES_FILE);
        process.exit(1);
    }
    
    const servicesData = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf-8'));
    const allServices = servicesData.allServices || [];
    
    // Фильтруем страницы
    const servicesToExtract = allServices.filter(shouldExtract);
    
    console.log(`📊 Всего страниц: ${allServices.length}`);
    console.log(`📋 Для извлечения: ${servicesToExtract.length}`);
    console.log(`⏭️  Пропущено: ${allServices.length - servicesToExtract.length}`);
    
    let browser;
    const results = [];
    const errors = [];
    
    try {
        console.log('\n🌐 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Устанавливаем user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('\n📋 Извлечение контента...\n');
        
        for (let i = 0; i < servicesToExtract.length; i++) {
            const service = servicesToExtract[i];
            const result = await extractPageContent(page, service, i + 1);
            
            results.push({
                url: result.url,
                title: result.title,
                slug: result.slug,
                section: result.section,
                success: result.success,
                filename: result.success ? 
                    `${result.slug || result.url.split('/').pop() || 'page'}.json` :
                    `${result.slug || result.url.split('/').pop() || 'page'}-error.json`
            });
            
            if (!result.success) {
                errors.push(result);
            }
            
            // Небольшая задержка между запросами
            if (i < servicesToExtract.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Сохраняем индекс
        const index = {
            timestamp: new Date().toISOString(),
            totalPages: servicesToExtract.length,
            successful: results.filter(r => r.success).length,
            failed: errors.length,
            results: results
        };
        
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
        
        // Статистика
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТЫ');
        console.log('='.repeat(70));
        console.log(`✅ Успешно извлечено: ${index.successful}`);
        console.log(`❌ Ошибок: ${index.failed}`);
        console.log(`📁 Файлов сохранено: ${results.length}`);
        
        if (errors.length > 0) {
            console.log('\n❌ Страницы с ошибками:');
            errors.slice(0, 10).forEach((error, i) => {
                console.log(`  ${i + 1}. ${error.title}`);
                console.log(`     ${error.url}`);
                console.log(`     Ошибка: ${error.error}`);
            });
            if (errors.length > 10) {
                console.log(`  ... и еще ${errors.length - 10} страниц`);
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`📁 Контент сохранен в: ${OUTPUT_DIR}`);
        console.log(`📋 Индекс: ${INDEX_FILE}`);
        console.log('='.repeat(70));
        
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

module.exports = { extractPageContent, shouldExtract };
