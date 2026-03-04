const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const MISSING_PAGES_FILE = path.join(__dirname, '../../temp/services-extraction/missing-pages.json');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

// Создаем директорию для сохранения контента
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Определить раздел страницы по URL
 */
function determineSection(url) {
    if (url === BASE_URL || url === BASE_URL + '/') return 'home';
    if (url.includes('/news')) return 'news';
    if (url.includes('/contact')) return 'contacts';
    if (url.includes('/business/')) return 'business';
    if (url.includes('/operators/')) return 'operators';
    if (url.includes('/government/')) return 'government';
    if (url.includes('/partners/')) return 'partners';
    if (url.includes('/developers/')) return 'developers';
    if (url.includes('/about_mgts') || url.includes('/mgts_') || url.includes('/general_') || 
        url.includes('/interaction_') || url.includes('/partners_feedback') || 
        url.includes('/single_') || url.includes('/principles_') || 
        url.includes('/corporate_') || url.includes('/decisions_') || 
        url.includes('/infoformen') || url.includes('/about_registrar')) {
        return 'about_mgts';
    }
    return 'other';
}

/**
 * Создать slug из URL
 */
function createSlug(url) {
    // Убираем базовый URL
    let slug = url.replace(BASE_URL, '').replace(/^\//, '');
    
    // Если пустой - это главная
    if (!slug || slug === '') {
        return 'home';
    }
    
    // Убираем trailing slash
    slug = slug.replace(/\/$/, '');
    
    // Заменяем слэши на подчеркивания
    slug = slug.replace(/\//g, '_');
    
    return slug || 'page';
}

/**
 * Извлечь контент со страницы
 */
async function extractPageContent(page, url, index, total) {
    console.log(`[${index}/${total}] Загрузка: ${url}`);
    
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
        
        // Получаем заголовок страницы
        const title = content.title || content.h1 || url.split('/').pop() || 'Страница';
        
        const slug = createSlug(url);
        const section = determineSection(url);
        
        const result = {
            url: url,
            title: title,
            slug: slug,
            section: section,
            extractedAt: new Date().toISOString(),
            content: content,
            fullHTML: fullHTML,
            success: true
        };
        
        // Сохраняем в отдельный файл
        const filename = `${slug}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
        
        console.log(`    ✅ Сохранено: ${filename} (${title.substring(0, 50)})`);
        
        return result;
        
    } catch (error) {
        console.error(`    ❌ Ошибка: ${error.message}`);
        
        const slug = createSlug(url);
        const section = determineSection(url);
        
        const result = {
            url: url,
            title: url,
            slug: slug,
            section: section,
            extractedAt: new Date().toISOString(),
            success: false,
            error: error.message
        };
        
        // Сохраняем информацию об ошибке
        const filename = `${slug}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
        
        return result;
    }
}

/**
 * Основная функция
 */
async function extractMissingPages() {
    console.log('📥 СБОР НЕДОСТАЮЩИХ СТРАНИЦ');
    console.log('='.repeat(70));
    
    // Загружаем список недостающих страниц
    if (!fs.existsSync(MISSING_PAGES_FILE)) {
        console.error('❌ Файл missing-pages.json не найден!');
        console.error('Сначала запустите: node find-missing-pages.js');
        process.exit(1);
    }
    
    const missingData = JSON.parse(fs.readFileSync(MISSING_PAGES_FILE, 'utf-8'));
    const missingPages = missingData.missingPages || [];
    
    // Убираем дубликаты (например, / и /)
    const uniquePages = Array.from(new Set(missingPages));
    
    console.log(`Найдено недостающих страниц: ${uniquePages.length}`);
    console.log('');
    
    if (uniquePages.length === 0) {
        console.log('✅ Все страницы уже собраны!');
        return;
    }
    
    // Загружаем существующий индекс
    let index = { results: [] };
    if (fs.existsSync(INDEX_FILE)) {
        index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < uniquePages.length; i++) {
            const url = uniquePages[i];
            const result = await extractPageContent(page, url, i + 1, uniquePages.length);
            results.push(result);
            
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Обновляем индекс
        const newResults = results.filter(r => r.success).map(r => ({
            url: r.url,
            title: r.title,
            slug: r.slug,
            section: r.section,
            success: r.success,
            filename: `${r.slug}.json`
        }));
        
        index.results = [...index.results, ...newResults];
        index.timestamp = new Date().toISOString();
        index.totalPages = index.results.length;
        index.successful = index.results.filter(r => r.success).length;
        index.failed = index.results.filter(r => !r.success).length;
        
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
        console.log('='.repeat(70));
        console.log(`Всего обработано: ${uniquePages.length}`);
        console.log(`✅ Успешно: ${successCount}`);
        console.log(`❌ Ошибок: ${errorCount}`);
        console.log(`\n📁 Индекс обновлен: ${INDEX_FILE}`);
        console.log(`📊 Всего страниц в индексе: ${index.totalPages}`);
        console.log('='.repeat(70));
        
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    extractMissingPages().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { extractMissingPages };
