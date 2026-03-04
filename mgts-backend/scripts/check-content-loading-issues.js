/**
 * Скрипт для проверки проблем с загрузкой контента
 * Проверяет страницы с учетом правильной иерархии путей
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
        const url = new URL(`http://localhost:1337/api/pages?filters[slug][$eq]=${slug}&populate=*`);
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
                        resolve({ exists: false, error: `HTTP ${res.statusCode}`, response: json });
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
    const fs = require('fs');
    const filePath = path.join(__dirname, '../../SiteMGTS', pagePath.replace(/^\//, '').replace(/\/$/, ''));
    result.fileExists = fs.existsSync(filePath);
    
    if (!result.fileExists) {
        await page.close();
        result.errors.push(`File not found: ${filePath}`);
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

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ПРОВЕРКА ПРОБЛЕМ С ЗАГРУЗКОЙ КОНТЕНТА');
    console.log('='.repeat(70) + '\n');
    
    // Загрузка иерархии
    console.log('📋 Загрузка иерархии страниц...');
    const hierarchy = loadPagesHierarchy();
    const pagesFlat = hierarchy.flat || [];
    console.log(`   Найдено страниц: ${pagesFlat.length}\n`);
    
    // Проблемные страницы из отчета
    const problematicSlugs = [
        'about_registrar',
        'access_internet',
        'corporate_documents',
        'business_all_services',
        'forms_doc',
    ];
    
    console.log('🔍 Проверка проблемных страниц:\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = [];
    
    for (const slug of problematicSlugs) {
        console.log(`📄 ${slug}...`);
        
        // Найти страницу в иерархии
        const pageInfo = pagesFlat.find(p => p.slug === slug);
        if (!pageInfo) {
            console.log(`   ⚠️  Страница не найдена в иерархии\n`);
            continue;
        }
        
        // Построить правильный путь
        const pagePath = buildPagePath(slug, pagesFlat);
        console.log(`   Путь: ${pagePath}`);
        
        // Проверить в Strapi
        const strapiCheck = await checkPageInStrapi(slug);
        if (!strapiCheck.exists) {
            console.log(`   ❌ Страница не найдена в Strapi\n`);
            continue;
        }
        
        console.log(`   ✅ В Strapi: ${strapiCheck.contentLength} символов`);
        
        // Проверить в браузере
        const browserCheck = await checkPageInBrowser(browser, slug, pagePath);
        
        console.log(`   Файл: ${browserCheck.fileExists ? '✅' : '❌'}`);
        console.log(`   Загрузка: ${browserCheck.pageLoads ? '✅' : '❌'}`);
        console.log(`   CMS Loader: ${browserCheck.cmsLoaderAvailable ? '✅' : '❌'}`);
        console.log(`   StrapiAPI: ${browserCheck.strapiApiAvailable ? '✅' : '❌'}`);
        console.log(`   Контент: ${browserCheck.contentRendered ? '✅' : '❌'} (${browserCheck.stats.contentLength} символов, ${browserCheck.stats.sectionsCount} секций)`);
        
        if (browserCheck.errors.length > 0) {
            console.log(`   Ошибки: ${browserCheck.errors.length}`);
            browserCheck.errors.slice(0, 2).forEach(err => {
                console.log(`      - ${err.substring(0, 80)}`);
            });
        }
        
        results.push({
            slug,
            strapiCheck,
            browserCheck,
        });
        
        console.log('');
    }
    
    await browser.close();
    
    // Итоговый отчет
    console.log('='.repeat(70));
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('='.repeat(70) + '\n');
    
    const withContent = results.filter(r => r.browserCheck.contentRendered).length;
    const withoutContent = results.filter(r => !r.browserCheck.contentRendered).length;
    
    console.log(`✅ Контент загружается: ${withContent}/${results.length}`);
    console.log(`❌ Контент не загружается: ${withoutContent}/${results.length}\n`);
    
    if (withoutContent > 0) {
        console.log('⚠️  Проблемные страницы:\n');
        results.filter(r => !r.browserCheck.contentRendered).forEach(r => {
            console.log(`   ${r.slug}:`);
            if (!r.browserCheck.fileExists) {
                console.log(`      ❌ Файл не найден`);
            }
            if (!r.browserCheck.cmsLoaderAvailable) {
                console.log(`      ❌ CMS Loader не загружен`);
            }
            if (!r.browserCheck.strapiApiAvailable) {
                console.log(`      ❌ StrapiAPI не доступен`);
            }
            if (r.browserCheck.errors.length > 0) {
                console.log(`      ❌ Ошибки: ${r.browserCheck.errors.length}`);
            }
            console.log('');
        });
    }
}

main().catch(console.error);
