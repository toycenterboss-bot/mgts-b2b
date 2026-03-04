/**
 * Скрипт для проверки всех страниц с динамическим логированием прогресса
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { buildPagePath } = require('./update-internal-links');

// Загрузка иерархии страниц
function loadPagesHierarchy() {
    const hierarchyFile = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
    if (fs.existsSync(hierarchyFile)) {
        return JSON.parse(fs.readFileSync(hierarchyFile, 'utf-8'));
    }
    return { flat: [] };
}

// Чтение API токена
function getApiToken() {
    const contextPath = path.join(__dirname, '../../docs/project/CONTEXT.md');
    if (fs.existsSync(contextPath)) {
        const context = fs.readFileSync(contextPath, 'utf-8');
        const patterns = [
            /export STRAPI_API_TOKEN="([^"]+)"/i,
            /STRAPI_API_TOKEN[:\s=]+([a-zA-Z0-9]{200,})/i,
            /STRAPI_API_TOKEN[:\s=]+([^\s\n]+)/i,
        ];
        for (const pattern of patterns) {
            const tokenMatch = context.match(pattern);
            if (tokenMatch && tokenMatch[1]) {
                return tokenMatch[1].trim();
            }
        }
    }
    return process.env.STRAPI_API_TOKEN || '';
}

// Проверка страницы в Strapi
async function checkPageInStrapi(slug) {
    const http = require('http');
    const apiToken = getApiToken();
    
    return new Promise((resolve) => {
        const url = new URL(`http://localhost:1337/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        resolve({ exists: false, error: `HTTP ${res.statusCode}` });
                        return;
                    }
                    const page = json.data?.[0];
                    if (page) {
                        resolve({
                            exists: true,
                            slug: page.slug,
                            title: page.title,
                            hasContent: !!page.content,
                            contentLength: page.content?.length || 0,
                        });
                    } else {
                        resolve({ exists: false });
                    }
                } catch (e) {
                    resolve({ exists: false, error: e.message });
                }
            });
        });
        
        req.on('error', (e) => {
            resolve({ exists: false, error: e.message });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ exists: false, error: 'Timeout' });
        });
        
        req.end();
    });
}

// Проверка страницы в браузере
async function checkPageInBrowser(browser, slug, pagePath, baseUrl = 'http://localhost:8001') {
    const pageUrl = `${baseUrl}${pagePath}`;
    const page = await browser.newPage();
    
    const result = {
        slug,
        url: pageUrl,
        fileExists: false,
        pageLoads: false,
        cmsLoaderAvailable: false,
        strapiApiAvailable: false,
        contentRendered: false,
        errors: [],
        stats: {
            contentLength: 0,
            htmlLength: 0,
            sectionsCount: 0,
        },
    };
    
    // Проверка существования файла
    const filePath = path.join(__dirname, '../../SiteMGTS', pagePath.replace(/^\//, '').replace(/\/$/, ''));
    result.fileExists = fs.existsSync(filePath);
    
    if (!result.fileExists) {
        await page.close();
        return result;
    }
    
    try {
        await page.goto(pageUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
        });
        
        result.pageLoads = true;
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Проверки
        const checks = await page.evaluate(() => {
            const mainContent = document.querySelector('#main-content, main, article, .content');
            const cmsLoader = typeof window.CMSLoader !== 'undefined';
            const strapiApi = typeof window.StrapiAPI !== 'undefined';
            
            return {
                mainContent: {
                    exists: !!mainContent,
                    innerHTML: mainContent?.innerHTML.length || 0,
                    textContent: mainContent?.textContent.length || 0,
                    sections: mainContent ? Array.from(mainContent.querySelectorAll('section, .section')).length : 0,
                },
                cmsLoader,
                strapiApi,
            };
        });
        
        result.cmsLoaderAvailable = checks.cmsLoader;
        result.strapiApiAvailable = checks.strapiApi;
        result.stats.contentLength = checks.mainContent.textContent;
        result.stats.htmlLength = checks.mainContent.innerHTML;
        result.stats.sectionsCount = checks.mainContent.sections;
        
        if (checks.mainContent.textContent > 100 || checks.mainContent.innerHTML > 200) {
            result.contentRendered = true;
        }
        
        // Слушаем ошибки
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (!text.includes('favicon') && !text.includes('404')) {
                    result.errors.push(text);
                }
            }
        });
        
        page.on('pageerror', error => {
            result.errors.push(`Page error: ${error.message}`);
        });
        
    } catch (error) {
        result.errors.push(`Navigation error: ${error.message}`);
    } finally {
        await page.close();
    }
    
    return result;
}

// Форматирование прогресс-бара
function formatProgress(current, total, width = 40) {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${current}/${total} (${percent}%)`;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ПРОВЕРКА ВСЕХ СТРАНИЦ С ДИНАМИЧЕСКИМ ЛОГИРОВАНИЕМ');
    console.log('═'.repeat(70) + '\n');
    
    const startTime = Date.now();
    
    // Загрузка иерархии
    console.log('📋 Загрузка иерархии страниц...');
    const hierarchy = loadPagesHierarchy();
    const pagesFlat = hierarchy.flat || [];
    console.log(`   ✅ Найдено страниц: ${pagesFlat.length}\n`);
    
    if (pagesFlat.length === 0) {
        console.error('❌ Иерархия страниц не найдена!');
        process.exit(1);
    }
    
    // Инициализация браузера
    console.log('🌐 Запуск браузера...');
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('   ✅ Браузер запущен\n');
    
    const results = [];
    const totalPages = pagesFlat.length;
    let processed = 0;
    let successCount = 0;
    let failCount = 0;
    
    console.log('─'.repeat(70));
    console.log('🚀 НАЧАЛО ПРОВЕРКИ\n');
    
    for (let i = 0; i < pagesFlat.length; i++) {
        const pageInfo = pagesFlat[i];
        processed++;
        
        // Прогресс-бар
        process.stdout.write(`\r${formatProgress(processed, totalPages)} | Обработка: ${pageInfo.slug.substring(0, 40).padEnd(40)}`);
        
        // Построить правильный путь
        const pagePath = buildPagePath(pageInfo.slug, pagesFlat);
        
        // Проверить в Strapi
        const strapiCheck = await checkPageInStrapi(pageInfo.slug);
        
        // Проверить в браузере
        const browserCheck = await checkPageInBrowser(browser, pageInfo.slug, pagePath);
        
        const result = {
            slug: pageInfo.slug,
            title: pageInfo.title || pageInfo.slug,
            path: pagePath,
            strapiCheck,
            browserCheck,
            status: 'unknown',
        };
        
        // Определить статус
        if (!strapiCheck.exists) {
            result.status = 'missing_in_strapi';
            failCount++;
        } else if (!browserCheck.fileExists) {
            result.status = 'missing_file';
            failCount++;
        } else if (!browserCheck.contentRendered) {
            result.status = 'no_content';
            failCount++;
        } else {
            result.status = 'ok';
            successCount++;
        }
        
        results.push(result);
        
        // Детальный лог каждые 10 страниц или для проблемных
        if (processed % 10 === 0 || result.status !== 'ok') {
            process.stdout.write('\n');
            if (result.status === 'ok') {
                console.log(`   ✅ ${pageInfo.slug.padEnd(50)} | Контент: ${browserCheck.stats.contentLength} символов, ${browserCheck.stats.sectionsCount} секций`);
            } else {
                const statusEmoji = {
                    'missing_in_strapi': '❌',
                    'missing_file': '⚠️',
                    'no_content': '⚠️',
                };
                console.log(`   ${statusEmoji[result.status] || '❓'} ${pageInfo.slug.padEnd(50)} | ${result.status}`);
            }
        }
    }
    
    await browser.close();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    // Итоговый отчет
    console.log('\n' + '─'.repeat(70));
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('═'.repeat(70) + '\n');
    
    const ok = results.filter(r => r.status === 'ok').length;
    const missingInStrapi = results.filter(r => r.status === 'missing_in_strapi').length;
    const missingFile = results.filter(r => r.status === 'missing_file').length;
    const noContent = results.filter(r => r.status === 'no_content').length;
    
    console.log(`📈 Общая статистика:`);
    console.log(`   ✅ Успешно: ${ok}/${totalPages} (${Math.round(ok/totalPages*100)}%)`);
    console.log(`   ❌ Проблемы: ${failCount}/${totalPages} (${Math.round(failCount/totalPages*100)}%)`);
    console.log(`\n   └─ ❌ Отсутствует в Strapi: ${missingInStrapi}`);
    console.log(`   └─ ⚠️  Отсутствует файл: ${missingFile}`);
    console.log(`   └─ ⚠️  Контент не загружается: ${noContent}`);
    console.log(`\n⏱️  Время выполнения: ${duration} сек\n`);
    
    // Детальный список проблемных страниц
    if (failCount > 0) {
        console.log('─'.repeat(70));
        console.log('⚠️  ПРОБЛЕМНЫЕ СТРАНИЦЫ:\n');
        
        const problematic = results.filter(r => r.status !== 'ok');
        problematic.forEach((r, index) => {
            console.log(`${index + 1}. ${r.slug} (${r.title})`);
            console.log(`   Статус: ${r.status}`);
            if (r.status === 'missing_in_strapi') {
                console.log(`   Действие: Добавить страницу в Strapi`);
            } else if (r.status === 'missing_file') {
                console.log(`   Путь: ${r.path}`);
                console.log(`   Действие: Создать файл по указанному пути`);
            } else if (r.status === 'no_content') {
                console.log(`   Путь: ${r.path}`);
                console.log(`   Контент в Strapi: ${r.strapiCheck.contentLength} символов`);
                console.log(`   Контент на странице: ${r.browserCheck.stats.contentLength} символов`);
                console.log(`   CMS Loader: ${r.browserCheck.cmsLoaderAvailable ? '✅' : '❌'}`);
                console.log(`   StrapiAPI: ${r.browserCheck.strapiApiAvailable ? '✅' : '❌'}`);
                if (r.browserCheck.errors.length > 0) {
                    console.log(`   Ошибки: ${r.browserCheck.errors.slice(0, 2).join('; ')}`);
                }
            }
            console.log('');
        });
    }
    
    // Сохранение отчета
    const reportPath = path.join(__dirname, '../../temp/validation/full-validation-report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        totalPages,
        duration: `${duration}s`,
        summary: {
            ok,
            missingInStrapi,
            missingFile,
            noContent,
            failCount,
        },
        results: results.map(r => ({
            slug: r.slug,
            title: r.title,
            path: r.path,
            status: r.status,
            strapi: {
                exists: r.strapiCheck.exists,
                contentLength: r.strapiCheck.contentLength || 0,
            },
            browser: {
                fileExists: r.browserCheck.fileExists,
                contentRendered: r.browserCheck.contentRendered,
                contentLength: r.browserCheck.stats.contentLength,
                sectionsCount: r.browserCheck.stats.sectionsCount,
            },
        })),
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Детальный отчет сохранен: ${reportPath}\n`);
    
    console.log('═'.repeat(70) + '\n');
}

main().catch(error => {
    console.error('\n❌ Ошибка выполнения:', error);
    process.exit(1);
});
