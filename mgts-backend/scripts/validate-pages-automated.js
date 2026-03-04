#!/usr/bin/env node
/**
 * Автоматическая валидация страниц после миграции
 * 
 * Проверяет:
 * 1. Загрузку контента из Strapi API
 * 2. Отображение всех секций контента
 * 3. Форматирование и стили
 * 4. Ошибки в консоли браузера
 * 5. Breadcrumbs и навигацию
 * 6. Hero секции
 * 7. Динамический контент (аккордеоны, табы)
 * 
 * Использование: node scripts/validate-pages-automated.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { buildPagePath } = require('./update-internal-links');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8001';
const OUTPUT_DIR = path.join(__dirname, '../../temp/validation');
const REPORT_FILE = path.join(OUTPUT_DIR, 'validation-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/VALIDATION_REPORT.md');

// Создать директорию для отчетов
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Получить список страниц для проверки
 */
function getPagesToValidate() {
    const hierarchyFile = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
    
    if (fs.existsSync(hierarchyFile)) {
        const hierarchy = JSON.parse(fs.readFileSync(hierarchyFile, 'utf-8'));
        return hierarchy.flat || [];
    }
    
    // Fallback: получить из Strapi или использовать базовый список
    return [
        { slug: 'home', title: 'Главная', url: '/index.html' },
        { slug: 'about_mgts', title: 'О МГТС', url: '/about_mgts/index.html' },
        { slug: 'access_internet', title: 'Доступ в интернет', url: '/business/access_internet/index.html' },
        { slug: 'corporate_documents', title: 'Корпоративные документы', url: '/about_mgts/corporate_documents/index.html' },
        { slug: 'business', title: 'Бизнесу', url: '/business/index.html' }
    ];
}

/**
 * Построить URL страницы с учетом parent иерархии
 */
function buildPageUrl(page, hierarchy) {
    // Если URL уже есть в данных страницы, используем его
    if (page.url) {
        return `${BASE_URL}${page.url}`;
    }
    
    // Используем функцию buildPagePath из update-internal-links.js
    const hierarchyFlat = hierarchy && hierarchy.flat ? hierarchy.flat : [];
    const urlPath = buildPagePath(page.slug, hierarchyFlat);
    
    return `${BASE_URL}${urlPath}`;
}

/**
 * Валидация одной страницы
 */
async function validatePage(browser, page, index, total, hierarchy) {
    const pageUrl = buildPageUrl(page, hierarchy);
    process.stdout.write(`\n[${index}/${total}] 🔍 ${page.title || page.slug}\n`);
    process.stdout.write(`   📍 ${pageUrl}\n`);
    
    const result = {
        slug: page.slug,
        title: page.title,
        url: pageUrl,
        timestamp: new Date().toISOString(),
        success: false,
        errors: [],
        warnings: [],
        checks: {
            pageLoad: false,
            contentLoaded: false,
            heroSection: false,
            breadcrumbs: false,
            mainContent: false,
            dynamicContent: false,
            consoleErrors: false,
            formatting: false
        },
        stats: {
            sectionsFound: 0,
            consoleErrorsCount: 0,
            consoleWarningsCount: 0,
            contentLength: 0
        }
    };
    
    const pageObj = await browser.newPage();
    
    try {
        // Слушаем консольные сообщения
        const consoleMessages = [];
        const consoleErrors = [];
        const consoleWarnings = [];
        
        pageObj.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            
            consoleMessages.push({ type, text });
            
            if (type === 'error') {
                consoleErrors.push(text);
            } else if (type === 'warning') {
                consoleWarnings.push(text);
            }
        });
        
        // Слушаем ошибки загрузки ресурсов
        const resourceErrors = [];
        pageObj.on('response', response => {
            if (!response.ok() && response.status() >= 400) {
                resourceErrors.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
        
        // Загружаем страницу
        process.stdout.write(`   ⏳ Загрузка страницы...`);
        const response = await pageObj.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        if (!response || !response.ok()) {
            process.stdout.write(` ❌ Ошибка загрузки\n`);
            result.errors.push(`Не удалось загрузить страницу: ${response ? response.status() : 'no response'}`);
            result.checks.pageLoad = false;
            return result;
        }
        
        process.stdout.write(` ✅ Загружена (${response.status()})\n`);
        result.checks.pageLoad = true;
        
        // Ждем достаточно времени для загрузки динамического контента из API
        // API запросы могут занимать время, особенно при первой загрузке
        process.stdout.write(`   ⏳ Ожидание загрузки контента...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Увеличено до 5 секунд
        process.stdout.write(` ✅\n`);
        
        // Проверяем наличие контента
        process.stdout.write(`   📄 Проверка контента...`);
        const contentLoaded = await pageObj.evaluate(() => {
            // Проверяем, что CMS Loader загрузил контент
            return !!document.querySelector('.content, main, article, [data-cms-loaded]');
        });
        
        result.checks.contentLoaded = contentLoaded;
        process.stdout.write(` ${contentLoaded ? '✅' : '⚠️'}\n`);
        if (!contentLoaded) {
            result.warnings.push('Контент не загружен из CMS (возможно, используется статический HTML)');
        }
        
        // Проверяем Hero секцию
        process.stdout.write(`   🎯 Проверка Hero...`);
        const hasHero = await pageObj.evaluate(() => {
            return !!document.querySelector('.hero, section.hero, [class*="hero"]');
        });
        
        result.checks.heroSection = hasHero;
        process.stdout.write(` ${hasHero ? '✅' : '⚠️'}\n`);
        
        // Проверяем Breadcrumbs
        process.stdout.write(`   🍞 Проверка Breadcrumbs...`);
        const hasBreadcrumbs = await pageObj.evaluate(() => {
            return !!document.querySelector('.breadcrumbs, nav.breadcrumbs, [class*="breadcrumb"]');
        });
        
        result.checks.breadcrumbs = hasBreadcrumbs;
        process.stdout.write(` ${hasBreadcrumbs ? '✅' : '⚠️'}\n`);
        
        // Проверяем основной контент
        process.stdout.write(`   📝 Проверка основного контента...`);
        const mainContentStats = await pageObj.evaluate(() => {
            const sections = document.querySelectorAll('section, .section, [class*="section-"]');
            
            // Проверяем разные варианты контент-контейнеров
            const main = document.querySelector('main');
            const mainContent = document.getElementById('main-content');
            const article = document.querySelector('article');
            const contentDiv = document.querySelector('.content, [class*="content"]');
            
            // Берем первый доступный контейнер
            const container = mainContent || main || article || contentDiv || document.body;
            
            // Проверяем длину текста
            const textLength = container ? container.textContent.trim().length : 0;
            
            // Проверяем длину HTML (может быть контент есть, но текст короткий из-за HTML структуры)
            const htmlLength = container ? container.innerHTML.length : 0;
            
            // Проверяем наличие секций внутри контейнера
            const sectionsInContainer = container ? container.querySelectorAll('section').length : 0;
            
            return {
                sectionsCount: sections.length,
                sectionsInContainer: sectionsInContainer,
                hasMainContent: !!(main || mainContent || article || contentDiv),
                hasMain: !!main,
                hasMainContentId: !!mainContent,
                contentLength: textLength,
                htmlLength: htmlLength,
                containerType: mainContent ? 'main-content' : main ? 'main' : article ? 'article' : contentDiv ? 'content' : 'body'
            };
        });
        
        result.stats.sectionsFound = mainContentStats.sectionsCount;
        result.stats.contentLength = mainContentStats.contentLength;
        result.stats.htmlLength = mainContentStats.htmlLength;
        
        // Контент считается загруженным, если:
        // 1. Есть контейнер И (длина текста > 100 ИЛИ есть секции внутри контейнера ИЛИ HTML длинный > 500)
        const hasContent = mainContentStats.hasMainContent && 
                          (mainContentStats.contentLength > 100 || 
                           mainContentStats.sectionsInContainer > 0 || 
                           mainContentStats.htmlLength > 500);
        
        result.checks.mainContent = hasContent;
        
        const mainContentStatus = result.checks.mainContent ? '✅' : '⚠️';
        process.stdout.write(` ${mainContentStatus} (${mainContentStats.sectionsCount} секций, ${mainContentStats.sectionsInContainer} в контейнере, текст: ${mainContentStats.contentLength}, HTML: ${mainContentStats.htmlLength} символов, контейнер: ${mainContentStats.containerType})\n`);
        
        if (!result.checks.mainContent) {
            if (mainContentStats.contentLength < 100 && mainContentStats.htmlLength < 500) {
                result.warnings.push(`Контент слишком короткий: текст ${mainContentStats.contentLength}, HTML ${mainContentStats.htmlLength} символов`);
            }
            if (!mainContentStats.hasMainContent) {
                result.warnings.push(`Контент-контейнер не найден (проверялись: main, #main-content, article, .content)`);
            }
        }
        
        // Проверяем динамический контент
        process.stdout.write(`   🎬 Проверка динамического контента...`);
        const dynamicContentStats = await pageObj.evaluate(() => {
            const accordions = document.querySelectorAll('[class*="faq"], [class*="accordion"]');
            const tabs = document.querySelectorAll('[class*="tab"], [class*="tabs"]');
            const carousels = document.querySelectorAll('[class*="carousel"]');
            
            return {
                hasAccordions: accordions.length > 0,
                hasTabs: tabs.length > 0,
                hasCarousels: carousels.length > 0,
                accordionsCount: accordions.length,
                tabsCount: tabs.length,
                carouselsCount: carousels.length
            };
        });
        
        result.checks.dynamicContent = dynamicContentStats.hasAccordions || dynamicContentStats.hasTabs || dynamicContentStats.hasCarousels;
        result.stats.dynamicContent = dynamicContentStats;
        
        const dynamicParts = [];
        if (dynamicContentStats.accordionsCount > 0) dynamicParts.push(`${dynamicContentStats.accordionsCount} аккордеонов`);
        if (dynamicContentStats.tabsCount > 0) dynamicParts.push(`${dynamicContentStats.tabsCount} табов`);
        if (dynamicContentStats.carouselsCount > 0) dynamicParts.push(`${dynamicContentStats.carouselsCount} каруселей`);
        const dynamicStatus = result.checks.dynamicContent ? '✅' : '⚠️';
        process.stdout.write(` ${dynamicStatus} ${dynamicParts.length > 0 ? '(' + dynamicParts.join(', ') + ')' : '(нет)'}\n`);
        
        // Проверяем форматирование (базовая проверка)
        process.stdout.write(`   🎨 Проверка форматирования...`);
        const formattingIssues = await pageObj.evaluate(() => {
            const issues = [];
            
            // Проверяем наличие базовых стилей
            const stylesheets = Array.from(document.styleSheets);
            if (stylesheets.length === 0) {
                issues.push('Нет загруженных стилей');
            }
            
            // Проверяем на пустые секции
            const emptySections = Array.from(document.querySelectorAll('section')).filter(section => {
                return section.textContent.trim().length < 10;
            });
            
            if (emptySections.length > 0) {
                issues.push(`Найдено ${emptySections.length} пустых секций`);
            }
            
            return issues;
        });
        
        result.checks.formatting = formattingIssues.length === 0;
        process.stdout.write(` ${result.checks.formatting ? '✅' : '⚠️'}\n`);
        if (formattingIssues.length > 0) {
            result.warnings.push(...formattingIssues);
        }
        
        // Собираем ошибки консоли
        process.stdout.write(`   🖥️  Проверка консоли...`);
        result.stats.consoleErrorsCount = consoleErrors.length;
        result.stats.consoleWarningsCount = consoleWarnings.length;
        result.stats.consoleMessages = consoleMessages;
        
        if (consoleErrors.length > 0) {
            result.checks.consoleErrors = false;
            result.errors.push(`Ошибки в консоли (${consoleErrors.length}):`);
            consoleErrors.slice(0, 5).forEach(err => {
                result.errors.push(`  - ${err}`);
            });
            process.stdout.write(` ❌ (${consoleErrors.length} ошибок, ${consoleWarnings.length} предупреждений)\n`);
        } else {
            result.checks.consoleErrors = true;
            process.stdout.write(` ✅ (${consoleWarnings.length} предупреждений)\n`);
        }
        
        // Ошибки загрузки ресурсов
        if (resourceErrors.length > 0) {
            result.warnings.push(`Ошибки загрузки ресурсов (${resourceErrors.length}):`);
            resourceErrors.slice(0, 3).forEach(err => {
                result.warnings.push(`  - ${err.url}: ${err.status} ${err.statusText}`);
            });
        }
        
        // Общий статус
        const allChecks = Object.values(result.checks);
        const passedChecks = allChecks.filter(check => check === true).length;
        const totalChecks = allChecks.length;
        const successRate = Math.round(passedChecks / totalChecks * 100);
        result.success = passedChecks >= totalChecks * 0.7; // 70% проверок должны пройти
        
        process.stdout.write(`\n   📊 Итог: ${passedChecks}/${totalChecks} проверок пройдено (${successRate}%)\n`);
        if (result.success) {
            process.stdout.write(`   ✅ Страница валидна\n`);
        } else {
            process.stdout.write(`   ⚠️  Страница имеет проблемы\n`);
        }
        
        if (result.errors.length > 0) {
            process.stdout.write(`   ❌ Ошибок: ${result.errors.length}\n`);
        }
        if (result.warnings.length > 0) {
            process.stdout.write(`   ⚠️  Предупреждений: ${result.warnings.length}\n`);
        }
        
    } catch (error) {
        result.errors.push(`Ошибка при валидации: ${error.message}`);
        console.error(`   ❌ Ошибка: ${error.message}`);
    } finally {
        await pageObj.close();
    }
    
    return result;
}

/**
 * Генерация Markdown отчета
 */
function generateMarkdownReport(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    let md = `# Отчет автоматической валидации страниц\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${total}\n`;
    md += `- **✅ Успешно:** ${successful} (${Math.round(successful / total * 100)}%)\n`;
    md += `- **❌ С ошибками:** ${failed} (${Math.round(failed / total * 100)}%)\n\n`;
    
    // Статистика по проверкам
    const checks = ['pageLoad', 'contentLoaded', 'heroSection', 'breadcrumbs', 'mainContent', 'dynamicContent', 'consoleErrors', 'formatting'];
    md += `## 📋 Статистика проверок\n\n`;
    md += `| Проверка | Успешно | Всего | %\n`;
    md += `|----------|---------|-------|-----\n`;
    
    checks.forEach(check => {
        const passed = results.filter(r => r.checks[check] === true).length;
        const percentage = Math.round(passed / total * 100);
        md += `| ${check} | ${passed} | ${total} | ${percentage}%\n`;
    });
    
    md += `\n`;
    
    // Страницы с ошибками
    const failedPages = results.filter(r => !r.success);
    if (failedPages.length > 0) {
        md += `## ❌ Страницы с ошибками\n\n`;
        failedPages.forEach(page => {
            md += `### ${page.title || page.slug}\n\n`;
            md += `- **URL:** ${page.url}\n`;
            md += `- **Slug:** ${page.slug}\n\n`;
            
            if (page.errors.length > 0) {
                md += `**Ошибки:**\n`;
                page.errors.forEach(err => {
                    md += `- ${err}\n`;
                });
                md += `\n`;
            }
            
            if (page.warnings.length > 0) {
                md += `**Предупреждения:**\n`;
                page.warnings.slice(0, 5).forEach(warn => {
                    md += `- ${warn}\n`;
                });
                md += `\n`;
            }
            
            md += `**Проверки:**\n`;
            Object.entries(page.checks).forEach(([check, passed]) => {
                md += `- ${check}: ${passed ? '✅' : '❌'}\n`;
            });
            md += `\n`;
        });
    }
    
    // Успешные страницы (краткий список)
    const successfulPages = results.filter(r => r.success);
    if (successfulPages.length > 0 && successfulPages.length <= 20) {
        md += `## ✅ Успешно проверенные страницы\n\n`;
        successfulPages.forEach(page => {
            md += `- ${page.title || page.slug} (${page.url})\n`;
        });
        md += `\n`;
    }
    
    return md;
}

/**
 * Основная функция
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 АВТОМАТИЧЕСКАЯ ВАЛИДАЦИЯ СТРАНИЦ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`📡 Базовый URL: ${BASE_URL}\n`);
    
    const pages = getPagesToValidate();
    console.log(`📄 Найдено страниц для проверки: ${pages.length}\n`);
    
    // Ограничиваем количество страниц для первого запуска (можно убрать позже)
    const pagesToCheck = process.env.CHECK_ALL ? pages : pages.slice(0, 10);
    
    if (pagesToCheck.length < pages.length) {
        console.log(`⚠️  Проверяю только первые ${pagesToCheck.length} страниц (установите CHECK_ALL=1 для проверки всех)\n`);
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = [];
    
    try {
        console.log(`\n📋 Начинаю проверку ${pagesToCheck.length} страниц...\n`);
        
        // Загружаем иерархию для построения URL
        const hierarchyFile = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
        let hierarchy = null;
        if (fs.existsSync(hierarchyFile)) {
            hierarchy = JSON.parse(fs.readFileSync(hierarchyFile, 'utf-8'));
        }
        
        for (let i = 0; i < pagesToCheck.length; i++) {
            const page = pagesToCheck[i];
            const result = await validatePage(browser, page, i + 1, pagesToCheck.length, hierarchy);
            results.push(result);
            
            // Прогресс-бар
            const progress = Math.round((i + 1) / pagesToCheck.length * 100);
            const filled = Math.round(progress / 5);
            const empty = 20 - filled;
            process.stdout.write(`\n📊 Прогресс: [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${progress}% (${i + 1}/${pagesToCheck.length})\n`);
        }
    } finally {
        await browser.close();
    }
    
    // Сохраняем результаты
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Генерируем Markdown отчет
    const mdReport = generateMarkdownReport(results);
    fs.writeFileSync(MD_REPORT_FILE, mdReport, 'utf-8');
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ВАЛИДАЦИЯ ЗАВЕРШЕНА');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`📊 Результаты:`);
    console.log(`   - Всего проверено: ${results.length}`);
    console.log(`   - ✅ Успешно: ${successful}`);
    console.log(`   - ❌ С ошибками: ${failed}\n`);
    
    console.log(`📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${MD_REPORT_FILE}\n`);
    
    if (failed > 0) {
        console.log(`⚠️  Обнаружены проблемы на ${failed} страницах. Проверьте отчеты для деталей.\n`);
        process.exit(1);
    } else {
        console.log(`✅ Все страницы прошли валидацию!\n`);
        process.exit(0);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Критическая ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { validatePage, generateMarkdownReport };
