const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE_URL = 'https://business.mgts.ru';
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const INDEX_FILE = path.join(PAGES_CONTENT_DIR, 'index.json');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const MISSING_PAGES_FILE = path.join(OUTPUT_DIR, 'missing-pages.json');

/**
 * Загрузить список уже собранных страниц
 */
function loadCollectedPages() {
    if (!fs.existsSync(INDEX_FILE)) {
        return new Set();
    }
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    return new Set(index.results.map(r => r.url));
}

/**
 * Извлечь все внутренние ссылки со страницы
 */
async function extractAllLinks(page) {
    const links = await page.evaluate((baseUrl) => {
        const allLinks = new Set();
        
        // Извлекаем все ссылки
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;
            
            // Пропускаем якоря, email, tel
            if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }
            
            // Преобразуем относительные ссылки в абсолютные
            let fullUrl = href;
            if (href.startsWith('/')) {
                fullUrl = baseUrl + href;
            } else if (!href.startsWith('http')) {
                return; // Пропускаем относительные без /
            }
            
            // Оставляем только ссылки на business.mgts.ru
            if (fullUrl.startsWith(baseUrl)) {
                // Убираем якоря и параметры
                const cleanUrl = fullUrl.split('#')[0].split('?')[0];
                allLinks.add(cleanUrl);
            }
        });
        
        return Array.from(allLinks);
    }, BASE_URL);
    
    return links;
}

/**
 * Определить раздел страницы по URL
 */
function determineSection(url) {
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
    if (url === BASE_URL || url === BASE_URL + '/') return 'home';
    if (url.includes('/news')) return 'news';
    if (url.includes('/contact')) return 'contacts';
    return 'other';
}

/**
 * Проверить, является ли URL страницей (не файлом)
 */
function isPageUrl(url) {
    // Пропускаем файлы
    const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js'];
    const lowerUrl = url.toLowerCase();
    
    for (const ext of fileExtensions) {
        if (lowerUrl.endsWith(ext)) {
            return false;
        }
    }
    
    // Пропускаем статические ресурсы
    if (url.includes('/static/') || url.includes('/storage/') || url.includes('/images/') || url.includes('/fonts/')) {
        return false;
    }
    
    return true;
}

/**
 * Основная функция поиска недостающих страниц
 */
async function findMissingPages() {
    console.log('🔍 ПОИСК НЕДОСТАЮЩИХ СТРАНИЦ');
    console.log('='.repeat(70));
    
    const collectedPages = loadCollectedPages();
    console.log(`Уже собрано страниц: ${collectedPages.size}`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // 1. Загружаем главную страницу
        console.log('\n📄 Загрузка главной страницы...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mainPageLinks = await extractAllLinks(page);
        console.log(`   Найдено ссылок на главной: ${mainPageLinks.length}`);
        
        // 2. Загружаем страницы из навигации для извлечения ссылок
        const navigationPages = [
            BASE_URL + '/',
            BASE_URL + '/news',
            BASE_URL + '/contact_details',
            BASE_URL + '/about_mgts',
            BASE_URL + '/business',
            BASE_URL + '/operators',
            BASE_URL + '/government',
            BASE_URL + '/partners',
            BASE_URL + '/developers'
        ];
        
        const allLinks = new Set(mainPageLinks);
        
        console.log('\n📄 Загрузка страниц навигации для извлечения ссылок...');
        for (const navUrl of navigationPages) {
            if (collectedPages.has(navUrl)) {
                console.log(`   ⏭️  Пропуск (уже собрана): ${navUrl}`);
                continue;
            }
            
            try {
                console.log(`   📥 Загрузка: ${navUrl}...`);
                await page.goto(navUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const links = await extractAllLinks(page);
                links.forEach(link => allLinks.add(link));
                console.log(`   ✅ Найдено ссылок: ${links.length}`);
            } catch (error) {
                console.log(`   ⚠️  Ошибка загрузки: ${error.message}`);
            }
        }
        
        // 3. Фильтруем ссылки - оставляем только страницы
        const pageUrls = Array.from(allLinks).filter(url => {
            if (!isPageUrl(url)) return false;
            if (url.includes('/api/')) return false;
            if (url.includes('/admin/')) return false;
            return true;
        });
        
        console.log(`\n📊 Всего найдено уникальных ссылок: ${allLinks.size}`);
        console.log(`📄 Из них страниц: ${pageUrls.length}`);
        
        // 4. Находим недостающие страницы
        const missingPages = pageUrls.filter(url => !collectedPages.has(url));
        
        console.log(`\n❌ Недостающих страниц: ${missingPages.length}`);
        
        // Группируем по разделам
        const missingBySection = {};
        missingPages.forEach(url => {
            const section = determineSection(url);
            if (!missingBySection[section]) {
                missingBySection[section] = [];
            }
            missingBySection[section].push(url);
        });
        
        console.log('\n📋 Распределение недостающих страниц по разделам:');
        for (const [section, urls] of Object.entries(missingBySection)) {
            console.log(`   ${section}: ${urls.length} страниц`);
            urls.slice(0, 5).forEach(url => {
                console.log(`      - ${url}`);
            });
            if (urls.length > 5) {
                console.log(`      ... и еще ${urls.length - 5} страниц`);
            }
        }
        
        // Сохраняем результаты
        const result = {
            timestamp: new Date().toISOString(),
            totalLinksFound: allLinks.size,
            pageUrlsFound: pageUrls.length,
            collectedPages: collectedPages.size,
            missingPagesCount: missingPages.length,
            missingPages: missingPages,
            missingBySection: missingBySection
        };
        
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(MISSING_PAGES_FILE, JSON.stringify(result, null, 2), 'utf8');
        
        console.log(`\n📁 Результаты сохранены в: ${MISSING_PAGES_FILE}`);
        console.log('='.repeat(70));
        
        return result;
        
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    findMissingPages().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { findMissingPages };
