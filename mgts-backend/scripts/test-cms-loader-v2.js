/**
 * Скрипт для тестирования нового CMS Loader v2 на нескольких страницах
 * Показывает динамику тестирования в реальном времени
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Импорт функции buildPagePath из update-internal-links.js
const { buildPagePath } = require('./update-internal-links');

// Список страниц для тестирования
const TEST_PAGES = [
    'home',                    // Главная страница
    'about_mgts',              // О компании (с hero)
    'bank_details',            // Банковские реквизиты (простая страница)
    'business',                // Бизнес (раздел)
    'access_internet',         // Услуга
    'corporate_documents',     // С динамическим контентом (табы)
    'forms_doc',               // С select-фильтрами
    'about_registrar',         // Подстраница
    'business_all_services',   // С карточками услуг
];

// Маппинг страниц для правильной иерархии (если нет полной иерархии)
const PAGE_HIERARCHY = {
    'home': { slug: 'home', parent: null },
    'about_mgts': { slug: 'about_mgts', parent: null },
    'bank_details': { slug: 'bank_details', parent: null },
    'business': { slug: 'business', parent: null },
    'access_internet': { slug: 'access_internet', parent: 'business' },
    'corporate_documents': { slug: 'corporate_documents', parent: 'about_mgts' },
    'forms_doc': { slug: 'forms_doc', parent: null },
    'about_registrar': { slug: 'about_registrar', parent: 'about_mgts' },
    'business_all_services': { slug: 'business_all_services', parent: 'business' },
};

function buildPageUrl(slug) {
    if (slug === 'home') {
        return '/index.html';
    }
    
    const pageInfo = PAGE_HIERARCHY[slug];
    if (!pageInfo) {
        return `/${slug}/index.html`;
    }
    
    // Используем buildPagePath с упрощенной структурой
    const pagesFlat = Object.values(PAGE_HIERARCHY).map(p => ({
        slug: p.slug,
        parentSlug: p.parent
    }));
    
    const path = buildPagePath(slug, pagesFlat);
    return path;
}

// Цвета для вывода
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
    process.stdout.write(`${color}${message}${colors.reset}`);
}

function logLine(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function testPage(browser, slug, baseUrl = 'http://localhost:8001') {
    const results = {
        slug,
        url: null,
        loaded: false,
        errors: [],
        warnings: [],
        stats: {
            contentLength: 0,
            htmlLength: 0,
            sectionsCount: 0,
            hasHero: false,
            hasBreadcrumbs: false,
            dataCmsLoaded: false,
            cmsLoaderAvailable: false,
            processorsRegistered: 0,
        },
        checks: {
            pageLoads: false,
            apiWorks: false,
            contentRenders: false,
            noErrors: false,
        },
        time: {
            load: 0,
            render: 0,
        },
    };

    const pagePath = buildPageUrl(slug);
    results.url = `${baseUrl}${pagePath}`;

    log(`\n${'='.repeat(60)}\n`, colors.cyan);
    log(`🧪 Тестирование: ${slug}\n`, colors.bright);
    log(`   URL: ${results.url}\n`, colors.gray);

    const page = await browser.newPage();

    // Слушаем консоль для ошибок
    const consoleMessages = [];
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error' || type === 'warning') {
            consoleMessages.push({ type, text });
            if (type === 'error' && !text.includes('favicon') && !text.includes('404')) {
                results.errors.push(text);
            } else if (type === 'warning') {
                results.warnings.push(text);
            }
        }
    });

    // Слушаем ошибки сети
    page.on('pageerror', error => {
        results.errors.push(`Page error: ${error.message}`);
    });

    const loadStart = Date.now();

    try {
        log(`   ⏳ Загрузка страницы... `, colors.yellow);
        
        await page.goto(results.url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        results.checks.pageLoads = true;
        results.time.load = Date.now() - loadStart;
        log(`✅ (${results.time.load}ms)\n`, colors.green);

        log(`   ⏳ Ожидание загрузки контента (5 сек)... `, colors.yellow);
        await new Promise(resolve => setTimeout(resolve, 5000));
        log(`✅\n`, colors.green);

        const renderStart = Date.now();

        // Проверки
        log(`   🔍 Проверка CMS Loader... `, colors.yellow);
        const cmsLoaderCheck = await page.evaluate(() => {
            return {
                exists: typeof window.CMSLoader !== 'undefined',
                apiExists: typeof window.CMSLoaderAPI !== 'undefined',
                pageData: window.CMSLoader ? {
                    hasData: !!window.CMSLoader.getPageData(),
                    slug: window.CMSLoader.getSlug(),
                    isLoading: window.CMSLoader.isLoading,
                    isLoaded: window.CMSLoader.isLoaded,
                } : null,
                processors: window.CMSLoaderAPI ? {
                    global: window.CMSLoaderAPI.ProcessorRegistry.global.size,
                    pageSpecific: window.CMSLoaderAPI.ProcessorRegistry.pageSpecific.size,
                    elementSpecific: window.CMSLoaderAPI.ProcessorRegistry.elementSpecific.size,
                } : null,
            };
        });

        if (cmsLoaderCheck.exists) {
            results.stats.cmsLoaderAvailable = true;
            if (cmsLoaderCheck.processors) {
                results.stats.processorsRegistered = 
                    cmsLoaderCheck.processors.global +
                    cmsLoaderCheck.processors.pageSpecific +
                    cmsLoaderCheck.processors.elementSpecific;
            }
            log(`✅ (${results.stats.processorsRegistered} процессоров)\n`, colors.green);
        } else {
            log(`❌\n`, colors.red);
            results.errors.push('CMS Loader not available');
        }

        log(`   🔍 Проверка контента... `, colors.yellow);
        const contentCheck = await page.evaluate(() => {
            const mainContent = document.querySelector('#main-content, main, article, .content, [class*="content"]');
            const hero = document.querySelector('.hero');
            const breadcrumbs = document.querySelector('.breadcrumbs, [class*="breadcrumb"]');
            const dataCmsLoaded = mainContent?.getAttribute('data-cms-loaded') === 'true';

            return {
                mainContent: {
                    exists: !!mainContent,
                    innerHTML: mainContent?.innerHTML.length || 0,
                    textContent: mainContent?.textContent.length || 0,
                    sections: mainContent ? Array.from(mainContent.querySelectorAll('section, .section, [class*="section-"]')).length : 0,
                    dataCmsLoaded,
                },
                hero: {
                    exists: !!hero,
                    hasTitle: !!hero?.querySelector('h1'),
                },
                breadcrumbs: {
                    exists: !!breadcrumbs,
                },
            };
        });

        if (contentCheck.mainContent.exists) {
            results.stats.contentLength = contentCheck.mainContent.textContent;
            results.stats.htmlLength = contentCheck.mainContent.innerHTML;
            results.stats.sectionsCount = contentCheck.mainContent.sections;
            results.stats.dataCmsLoaded = contentCheck.mainContent.dataCmsLoaded;
            results.stats.hasHero = contentCheck.hero.exists;
            results.stats.hasBreadcrumbs = contentCheck.breadcrumbs.exists;

            if (contentCheck.mainContent.textContent > 100 || contentCheck.mainContent.innerHTML > 200) {
                results.checks.contentRenders = true;
                log(`✅ (${results.stats.sectionsCount} секций, ${results.stats.contentLength} символов текста, ${results.stats.htmlLength} HTML)\n`, colors.green);
            } else {
                log(`⚠️  (контент слишком короткий)\n`, colors.yellow);
                results.warnings.push('Content too short');
            }
        } else {
            log(`❌ (контейнер не найден)\n`, colors.red);
            results.errors.push('Main content container not found');
        }

        results.time.render = Date.now() - renderStart;

        // Проверка API
        log(`   🔍 Проверка API... `, colors.yellow);
        const apiCheck = await page.evaluate(() => {
            return {
                strapiAPI: typeof window.StrapiAPI !== 'undefined',
                apiBaseUrl: window.StrapiAPI?.baseUrl || null,
            };
        });

        if (apiCheck.strapiAPI) {
            results.checks.apiWorks = true;
            log(`✅ (${apiCheck.apiBaseUrl || 'available'})\n`, colors.green);
        } else {
            log(`❌\n`, colors.red);
            results.errors.push('StrapiAPI not available');
        }

        // Итоговая проверка
        results.checks.noErrors = results.errors.length === 0;
        results.loaded = results.checks.pageLoads && results.checks.contentRenders;

        // Вывод результатов
        log(`   📊 Результаты:\n`, colors.cyan);
        log(`      ✅ Страница загружается: ${results.checks.pageLoads ? '✅' : '❌'}\n`, colors.reset);
        log(`      ✅ API работает: ${results.checks.apiWorks ? '✅' : '❌'}\n`, colors.reset);
        log(`      ✅ Контент рендерится: ${results.checks.contentRenders ? '✅' : '❌'}\n`, colors.reset);
        log(`      ✅ Нет ошибок: ${results.checks.noErrors ? '✅' : '❌'}\n`, colors.reset);
        
        if (results.errors.length > 0) {
            log(`      ❌ Ошибки (${results.errors.length}):\n`, colors.red);
            results.errors.forEach(err => {
                log(`         - ${err}\n`, colors.red);
            });
        }
        
        if (results.warnings.length > 0 && results.warnings.length < 5) {
            log(`      ⚠️  Предупреждения (${results.warnings.length}):\n`, colors.yellow);
            results.warnings.slice(0, 3).forEach(warn => {
                log(`         - ${warn.substring(0, 60)}...\n`, colors.yellow);
            });
        }

        log(`      ⏱️  Время: загрузка ${results.time.load}ms, рендеринг ${results.time.render}ms\n`, colors.gray);

    } catch (error) {
        results.errors.push(error.message);
        results.checks.pageLoads = false;
        log(`❌ Ошибка: ${error.message}\n`, colors.red);
    } finally {
        await page.close();
    }

    return results;
}

async function main() {
    logLine('\n' + '='.repeat(60), colors.cyan);
    logLine('🧪 ТЕСТИРОВАНИЕ CMS LOADER V2', colors.bright + colors.cyan);
    logLine('='.repeat(60), colors.cyan);
    logLine(`📋 Страниц для тестирования: ${TEST_PAGES.length}\n`, colors.blue);

    const browser = await puppeteer.launch({ 
        headless: false, // Показываем браузер для отладки
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const allResults = [];
    const startTime = Date.now();

    try {
        for (let i = 0; i < TEST_PAGES.length; i++) {
            const slug = TEST_PAGES[i];
            log(`\n[${i + 1}/${TEST_PAGES.length}] `, colors.blue);
            
            const result = await testPage(browser, slug);
            allResults.push(result);
        }

        const totalTime = Date.now() - startTime;

        // Итоговый отчет
        logLine('\n' + '='.repeat(60), colors.cyan);
        logLine('📊 ИТОГОВЫЙ ОТЧЕТ', colors.bright + colors.cyan);
        logLine('='.repeat(60), colors.cyan);

        const successful = allResults.filter(r => r.loaded && r.checks.noErrors).length;
        const failed = allResults.filter(r => !r.loaded || !r.checks.noErrors).length;

        logLine(`\n✅ Успешно: ${successful}/${TEST_PAGES.length}`, colors.green);
        logLine(`❌ Ошибок: ${failed}/${TEST_PAGES.length}`, failed > 0 ? colors.red : colors.green);
        logLine(`⏱️  Общее время: ${(totalTime / 1000).toFixed(2)}с\n`, colors.gray);

        // Детальная статистика
        logLine('📋 Детальная статистика:\n', colors.blue);
        allResults.forEach(result => {
            const status = result.loaded && result.checks.noErrors ? '✅' : '❌';
            log(`${status} ${result.slug.padEnd(30)} `, colors.reset);
            log(`Секций: ${result.stats.sectionsCount.toString().padStart(2)} `, colors.gray);
            log(`Контент: ${(result.stats.contentLength / 1000).toFixed(1)}K `, colors.gray);
            log(`CMS: ${result.stats.cmsLoaderAvailable ? '✅' : '❌'} `, colors.reset);
            log(`API: ${result.checks.apiWorks ? '✅' : '❌'}`, colors.reset);
            log('\n', colors.reset);
        });

        // Проблемные страницы
        const problematic = allResults.filter(r => !r.loaded || !r.checks.noErrors);
        if (problematic.length > 0) {
            logLine('\n⚠️  Проблемные страницы:\n', colors.yellow);
            problematic.forEach(result => {
                logLine(`   ${result.slug}:`, colors.yellow);
                if (result.errors.length > 0) {
                    result.errors.forEach(err => {
                        logLine(`      ❌ ${err}`, colors.red);
                    });
                }
            });
        }

        logLine('\n' + '='.repeat(60) + '\n', colors.cyan);

    } catch (error) {
        logLine(`\n❌ Критическая ошибка: ${error.message}`, colors.red);
        console.error(error);
    } finally {
        await browser.close();
    }
}

// Запуск
main().catch(console.error);
