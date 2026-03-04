/**
 * Скрипт для полной проверки всех страниц и составления плана устранения неисправностей
 * 
 * Проверяет:
 * 1. Наличие страниц в Strapi API
 * 2. Загрузку контента с каждой страницы
 * 3. JS ошибки
 * 4. Проблемы с путями
 * 5. Отсутствующий контент
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
    
    // Fallback: получить из нормализованных файлов
    const normalizedDir = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
    if (fs.existsSync(normalizedDir)) {
        const files = fs.readdirSync(normalizedDir).filter(f => f.endsWith('.json'));
        return {
            flat: files.map(f => ({
                slug: f.replace('.json', ''),
                title: f.replace('.json', '').replace(/_/g, ' '),
            }))
        };
    }
    
    return { flat: [] };
}

// Получение списка страниц из Strapi API
async function getStrapiPages() {
    const apiClientPath = path.join(__dirname, '../../SiteMGTS/js/api-client.js');
    // Упрощенная версия - используем прямой HTTP запрос
    try {
        const https = require('https');
        const http = require('http');
        
        // Читаем токен из контекста или переменных окружения
        const contextPath = path.join(__dirname, '../../docs/project/CONTEXT.md');
        let apiToken = process.env.STRAPI_API_TOKEN || '';
        
        if (!apiToken && fs.existsSync(contextPath)) {
            const context = fs.readFileSync(contextPath, 'utf-8');
            const tokenMatch = context.match(/STRAPI_API_TOKEN[:\s=]+([^\s\n]+)/i);
            if (tokenMatch) {
                apiToken = tokenMatch[1].trim();
            }
        }
        
        return new Promise((resolve, reject) => {
            const url = new URL('http://localhost:1337/api/pages?pagination[pageSize]=1000');
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
                        resolve(json.data || []);
                    } catch (e) {
                        resolve([]);
                    }
                });
            });
            
            req.on('error', (e) => {
                console.error(`Ошибка запроса к Strapi API: ${e.message}`);
                resolve([]);
            });
            
            req.end();
        });
    } catch (error) {
        console.error(`Ошибка при получении страниц из Strapi: ${error.message}`);
        return [];
    }
}

// Проверка одной страницы
async function checkPage(browser, pageInfo, strapiPages, baseUrl = 'http://localhost:8001') {
    const result = {
        slug: pageInfo.slug,
        title: pageInfo.title || pageInfo.slug,
        url: null,
        existsInStrapi: false,
        hasContent: false,
        issues: [],
        errors: [],
        warnings: [],
        stats: {
            contentLength: 0,
            htmlLength: 0,
            sectionsCount: 0,
            cmsLoaderAvailable: false,
        },
    };
    
    // Проверка наличия в Strapi
    const strapiPage = strapiPages.find(p => {
        const slug = p.attributes?.slug || p.slug;
        return slug === pageInfo.slug;
    });
    result.existsInStrapi = !!strapiPage;
    
    if (!result.existsInStrapi) {
        result.issues.push('Страница отсутствует в Strapi');
    }
    
    // Построение URL
    const pagesFlat = strapiPages.map(p => ({
        slug: p.attributes?.slug || p.slug,
        parentSlug: p.attributes?.parent?.data?.attributes?.slug || p.parent?.slug || null,
    }));
    const urlPath = buildPagePath(pageInfo.slug, pagesFlat);
    result.url = `${baseUrl}${urlPath}`;
    
    // Проверка страницы в браузере
    const page = await browser.newPage();
    const consoleErrors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (!text.includes('favicon') && !text.includes('404')) {
                consoleErrors.push(text);
            }
        }
    });
    
    page.on('pageerror', error => {
        consoleErrors.push(`Page error: ${error.message}`);
    });
    
    try {
        await page.goto(result.url, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Проверки
        const checks = await page.evaluate(() => {
            const mainContent = document.querySelector('#main-content, main, article, .content');
            const cmsLoader = typeof window.CMSLoader !== 'undefined';
            
            return {
                mainContent: {
                    exists: !!mainContent,
                    innerHTML: mainContent?.innerHTML.length || 0,
                    textContent: mainContent?.textContent.length || 0,
                    sections: mainContent ? Array.from(mainContent.querySelectorAll('section, .section')).length : 0,
                },
                cmsLoader,
            };
        });
        
        result.stats.cmsLoaderAvailable = checks.cmsLoader;
        result.stats.contentLength = checks.mainContent.textContent;
        result.stats.htmlLength = checks.mainContent.innerHTML;
        result.stats.sectionsCount = checks.mainContent.sections;
        
        if (checks.mainContent.textContent > 100 || checks.mainContent.innerHTML > 200) {
            result.hasContent = true;
        } else {
            result.issues.push('Контент слишком короткий или отсутствует');
        }
        
        // Анализ ошибок
        consoleErrors.forEach(err => {
            if (err.includes("'style' has already been declared")) {
                result.errors.push("JS: Identifier 'style' has already been declared");
            } else if (err.includes('API request failed') || err.includes('Failed to load')) {
                result.errors.push('API request failed');
            } else {
                result.errors.push(err);
            }
        });
        
        // Дополнительные проверки
        if (!checks.cmsLoader) {
            result.issues.push('CMS Loader не загружен');
        }
        
        if (result.existsInStrapi && !result.hasContent) {
            result.issues.push('Страница есть в Strapi, но контент не загружается');
        }
        
    } catch (error) {
        if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || error.message.includes('Navigation failed')) {
            result.issues.push('Страница не найдена (404)');
        } else {
            result.errors.push(`Ошибка загрузки: ${error.message}`);
        }
    } finally {
        await page.close();
    }
    
    return result;
}

// Группировка проблем
function categorizeIssues(results) {
    const categories = {
        missingInStrapi: [],
        noContent: [],
        jsErrors: [],
        apiErrors: [],
        cmsLoaderIssues: [],
        pathIssues: [],
        styleError: [],
    };
    
    results.forEach(result => {
        if (!result.existsInStrapi) {
            categories.missingInStrapi.push(result);
        }
        
        if (!result.hasContent && result.existsInStrapi) {
            categories.noContent.push(result);
        }
        
        result.errors.forEach(err => {
            if (err.includes("'style' has already been declared")) {
                categories.styleError.push(result);
            } else if (err.includes('API request failed')) {
                categories.apiErrors.push(result);
            }
        });
        
        if (result.issues.includes('CMS Loader не загружен')) {
            categories.cmsLoaderIssues.push(result);
        }
        
        if (result.issues.includes('Страница не найдена (404)')) {
            categories.pathIssues.push(result);
        }
    });
    
    return categories;
}

// Генерация плана устранения
function generateFixPlan(categories, totalPages) {
    const plan = [];
    
    plan.push({
        priority: 1,
        category: 'Критично',
        title: 'Страницы отсутствуют в Strapi',
        count: categories.missingInStrapi.length,
        pages: categories.missingInStrapi.map(p => p.slug),
        action: 'Добавить страницы в Strapi через миграцию или вручную',
        script: 'migrate-pages-with-dynamic-content-strapi.js',
    });
    
    plan.push({
        priority: 2,
        category: 'Важно',
        title: 'JS ошибка: Identifier style has already been declared',
        count: categories.styleError.length,
        pages: [...new Set(categories.styleError.map(p => p.slug))],
        action: 'Найти и исправить дублирование объявления переменной style в JS файлах',
        script: 'grep -r "const style" SiteMGTS/js/',
    });
    
    plan.push({
        priority: 3,
        category: 'Важно',
        title: 'Контент не загружается (API request failed)',
        count: categories.apiErrors.length,
        pages: categories.apiErrors.map(p => p.slug),
        action: 'Проверить настройки API, токены доступа, и наличие данных в Strapi',
        script: 'Проверить вручную в Strapi Admin',
    });
    
    plan.push({
        priority: 4,
        category: 'Важно',
        title: 'Страницы есть в Strapi, но контент не отображается',
        count: categories.noContent.length,
        pages: categories.noContent.map(p => p.slug),
        action: 'Проверить поле content в Strapi, возможно контент пустой',
        script: 'Проверить вручную в Strapi Admin',
    });
    
    plan.push({
        priority: 5,
        category: 'Средне',
        title: 'Неправильные пути страниц (404)',
        count: categories.pathIssues.length,
        pages: categories.pathIssues.map(p => p.slug),
        action: 'Проверить иерархию страниц и функцию buildPagePath',
        script: 'update-internal-links.js',
    });
    
    plan.push({
        priority: 6,
        category: 'Низко',
        title: 'CMS Loader не загружается',
        count: categories.cmsLoaderIssues.length,
        pages: categories.cmsLoaderIssues.map(p => p.slug),
        action: 'Проверить подключение cms-loader.js в HTML шаблонах',
        script: 'Проверить вручную HTML файлы',
    });
    
    return plan;
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ПОЛНАЯ ПРОВЕРКА ВСЕХ СТРАНИЦ');
    console.log('='.repeat(70) + '\n');
    
    // Загрузка списка страниц
    console.log('📋 Загрузка списка страниц...');
    const hierarchy = loadPagesHierarchy();
    const allPages = hierarchy.flat || [];
    console.log(`   Найдено страниц: ${allPages.length}\n`);
    
    // Получение страниц из Strapi
    console.log('📡 Получение страниц из Strapi API...');
    const strapiPages = await getStrapiPages();
    console.log(`   Найдено в Strapi: ${strapiPages.length}\n`);
    
    // Запуск браузера
    console.log('🌐 Запуск браузера для проверки страниц...\n');
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = [];
    const totalPages = Math.min(allPages.length, 50); // Ограничиваем для скорости
    
    console.log(`⏳ Проверка ${totalPages} страниц...\n`);
    
    for (let i = 0; i < totalPages; i++) {
        const pageInfo = allPages[i];
        process.stdout.write(`[${i + 1}/${totalPages}] ${pageInfo.slug}... `);
        
        const result = await checkPage(browser, pageInfo, strapiPages);
        results.push(result);
        
        const status = result.existsInStrapi && result.hasContent && result.errors.length === 0 ? '✅' : '⚠️';
        console.log(status);
    }
    
    await browser.close();
    
    // Анализ результатов
    console.log('\n' + '='.repeat(70));
    console.log('📊 АНАЛИЗ РЕЗУЛЬТАТОВ');
    console.log('='.repeat(70) + '\n');
    
    const categories = categorizeIssues(results);
    
    console.log(`✅ Страниц без проблем: ${results.filter(r => r.existsInStrapi && r.hasContent && r.errors.length === 0).length}`);
    console.log(`❌ Страниц с проблемами: ${results.filter(r => !r.existsInStrapi || !r.hasContent || r.errors.length > 0).length}\n`);
    
    console.log('📋 Категории проблем:');
    console.log(`   • Отсутствуют в Strapi: ${categories.missingInStrapi.length}`);
    console.log(`   • Нет контента: ${categories.noContent.length}`);
    console.log(`   • JS ошибки (style): ${categories.styleError.length}`);
    console.log(`   • API ошибки: ${categories.apiErrors.length}`);
    console.log(`   • Проблемы с путями: ${categories.pathIssues.length}`);
    console.log(`   • CMS Loader не загружается: ${categories.cmsLoaderIssues.length}\n`);
    
    // Генерация плана
    const fixPlan = generateFixPlan(categories, results.length);
    
    console.log('='.repeat(70));
    console.log('📋 ПЛАН УСТРАНЕНИЯ НЕИСПРАВНОСТЕЙ');
    console.log('='.repeat(70) + '\n');
    
    fixPlan.forEach((item, index) => {
        console.log(`${index + 1}. [${item.category}] ${item.title}`);
        console.log(`   Приоритет: ${item.priority}`);
        console.log(`   Количество: ${item.count}`);
        if (item.pages.length > 0 && item.pages.length <= 10) {
            console.log(`   Страницы: ${item.pages.join(', ')}`);
        } else if (item.pages.length > 10) {
            console.log(`   Страницы: ${item.pages.slice(0, 5).join(', ')} ... и еще ${item.pages.length - 5}`);
        }
        console.log(`   Действие: ${item.action}`);
        if (item.script) {
            console.log(`   Скрипт: ${item.script}`);
        }
        console.log('');
    });
    
    // Сохранение отчета
    const reportDir = path.join(__dirname, '../../temp/validation');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, 'pages-check-report.json');
    fs.writeFileSync(reportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalPages: results.length,
        strapiPagesCount: strapiPages.length,
        results,
        categories,
        fixPlan,
    }, null, 2));
    
    console.log(`\n💾 Отчет сохранен: ${reportFile}\n`);
}

main().catch(console.error);
