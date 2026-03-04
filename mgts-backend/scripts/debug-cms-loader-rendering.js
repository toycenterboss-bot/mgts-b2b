/**
 * Скрипт для отладки рендеринга контента в CMS Loader
 * Проверяет, какой slug использует CMS Loader и получает ли он данные
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:8001';
const TEST_PAGES = [
    { slug: 'about_registrar', path: '/about_mgts/about_registrar/index.html' },
    { slug: 'access_internet', path: '/business/access_internet/index.html' },
    { slug: 'corporate_documents', path: '/about_mgts/corporate_documents/index.html' },
];

async function debugPage(browser, pageInfo) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Отладка: ${pageInfo.slug}`);
    console.log(`📍 URL: ${BASE_URL}${pageInfo.path}`);
    console.log('='.repeat(60) + '\n');
    
    const page = await browser.newPage();
    const apiRequests = [];
    const consoleMessages = [];
    
    // Слушаем API запросы
    page.on('response', response => {
        const url = response.url();
        if (url.includes('localhost:1337') && url.includes('api/pages')) {
            apiRequests.push({
                url,
                status: response.status(),
            });
        }
    });
    
    // Слушаем консоль
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('CMS Loader') || text.includes('API') || text.includes('slug')) {
            consoleMessages.push({
                type: msg.type(),
                text,
            });
        }
    });
    
    try {
        await page.goto(`${BASE_URL}${pageInfo.path}`, {
            waitUntil: 'networkidle2',
            timeout: 15000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Проверяем, какой slug использует CMS Loader
        const debugInfo = await page.evaluate((expectedSlug) => {
            const result = {
                currentPath: window.location.pathname,
                currentSlug: null,
                cmsLoaderExists: typeof window.CMSLoader !== 'undefined',
                strapiApiExists: typeof window.StrapiAPI !== 'undefined',
                pageData: null,
                mainContent: null,
            };
            
            if (window.CMSLoader) {
                result.currentSlug = window.CMSLoader.getSlug ? window.CMSLoader.getSlug() : null;
                result.pageData = window.CMSLoader.getPageData ? window.CMSLoader.getPageData() : null;
            }
            
            const mainContent = document.querySelector('#main-content, main, article, .content');
            if (mainContent) {
                result.mainContent = {
                    innerHTML: mainContent.innerHTML.substring(0, 200),
                    textContent: mainContent.textContent.substring(0, 200),
                    length: mainContent.innerHTML.length,
                };
            }
            
            return result;
        }, pageInfo.slug);
        
        console.log('📊 Результаты проверки:\n');
        console.log(`   Путь страницы: ${debugInfo.currentPath}`);
        console.log(`   Slug (CMS Loader): ${debugInfo.currentSlug || 'не определен'}`);
        console.log(`   CMS Loader доступен: ${debugInfo.cmsLoaderExists ? '✅' : '❌'}`);
        console.log(`   StrapiAPI доступен: ${debugInfo.strapiApiExists ? '✅' : '❌'}`);
        
        if (debugInfo.pageData) {
            console.log(`   Данные страницы загружены: ✅`);
            console.log(`   Заголовок: ${debugInfo.pageData.title || 'нет'}`);
            console.log(`   Контент: ${debugInfo.pageData.content ? debugInfo.pageData.content.length + ' символов' : 'нет'}`);
        } else {
            console.log(`   Данные страницы: ❌ не загружены`);
        }
        
        if (debugInfo.mainContent) {
            console.log(`\n   Контейнер контента:`);
            console.log(`   HTML длина: ${debugInfo.mainContent.length} символов`);
            console.log(`   Превью: ${debugInfo.mainContent.innerHTML.substring(0, 150)}...`);
        } else {
            console.log(`\n   Контейнер контента: ❌ не найден`);
        }
        
        console.log(`\n📡 API запросы (${apiRequests.length}):`);
        apiRequests.forEach((req, i) => {
            console.log(`   ${i + 1}. ${req.url}`);
            console.log(`      Status: ${req.status}`);
        });
        
        if (apiRequests.length === 0) {
            console.log(`   ⚠️  API запросы не найдены!`);
        }
        
        console.log(`\n💬 Сообщения консоли (${consoleMessages.length}):`);
        consoleMessages.slice(0, 10).forEach((msg, i) => {
            console.log(`   ${i + 1}. [${msg.type}] ${msg.text.substring(0, 100)}`);
        });
        
        // Проверяем несоответствие slug
        if (debugInfo.currentSlug && debugInfo.currentSlug !== pageInfo.slug) {
            console.log(`\n⚠️  НЕСООТВЕТСТВИЕ SLUG!`);
            console.log(`   Ожидается: ${pageInfo.slug}`);
            console.log(`   Получено: ${debugInfo.currentSlug}`);
        }
        
    } catch (error) {
        console.error(`❌ Ошибка: ${error.message}`);
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 ОТЛАДКА РЕНДЕРИНГА CMS LOADER');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        for (const pageInfo of TEST_PAGES) {
            await debugPage(browser, pageInfo);
        }
    } finally {
        await browser.close();
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
