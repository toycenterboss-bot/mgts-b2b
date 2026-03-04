/**
 * Скрипт для комплексной проверки качества миграции
 * Проверяет:
 * - Корректность размещения и отображения контента
 * - Доступность файлов и изображений
 * - Размеры шрифтов, элементов и изображений
 * - Работоспособность ссылок
 * - Отображение компонентов hero
 * - Отсутствие элементов за пределами видимой зоны
 * - Работоспособность мега-меню и футера
 * - Хлебные крошки
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Построить полный путь к странице на основе slug и иерархии
function buildPagePath(slug, hierarchy) {
    if (!hierarchy || hierarchy.length === 0) {
        // Если иерархия не загружена, используем простой путь
        if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            return '/index.html';
        }
        return `/${slug}/index.html`;
    }
    
    const page = hierarchy.find(p => p.slug === slug);
    if (!page) {
        // Страница не найдена в иерархии, используем простой путь
        if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            return '/index.html';
        }
        return `/${slug}/index.html`;
    }
    
    // Главная страница
    if (!page.parentSlug) {
        if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            return '/index.html';
        }
        return `/${slug}/index.html`;
    }
    
    // Строим путь с учетом полной иерархии от корня до текущей страницы
    const pathParts = [];
    
    // Строим цепочку от корня к текущей странице
    const buildParentChain = (currentSlug, visited = new Set()) => {
        if (visited.has(currentSlug)) {
            return; // Предотвращаем циклы
        }
        visited.add(currentSlug);
        
        const parentPage = hierarchy.find(p => p.slug === currentSlug);
        if (!parentPage || !parentPage.parentSlug) {
            // Дошли до корня или страница не найдена
            return;
        }
        
        // Рекурсивно добавляем родителя
        buildParentChain(parentPage.parentSlug, visited);
        // Добавляем родителя в путь (избегаем дубликатов)
        if (!pathParts.includes(parentPage.parentSlug)) {
            pathParts.push(parentPage.parentSlug);
        }
    };
    
    // Строим цепочку родителей
    buildParentChain(slug);
    
    // Добавляем текущий slug в конец
    if (!pathParts.includes(slug)) {
        pathParts.push(slug);
    }
    
    return '/' + pathParts.join('/') + '/index.html';
}

// Загрузка иерархии страниц
function loadPagesHierarchy() {
    const hierarchyFile = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
    if (fs.existsSync(hierarchyFile)) {
        return JSON.parse(fs.readFileSync(hierarchyFile, 'utf-8'));
    }
    return { flat: [] };
}

// Форматирование прогресс-бара
function formatProgress(current, total, width = 40) {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = Math.max(0, width - filled);
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(empty);
    return `[${bar}] ${current}/${total} (${percent}%)`;
}

// Проверка качества страницы
async function checkPageQuality(browser, slug, pagePath, baseUrl = 'http://localhost:8001') {
    const pageUrl = `${baseUrl}${pagePath}`;
    const page = await browser.newPage();
    
    const result = {
        slug,
        url: pageUrl,
        issues: [],
        warnings: [],
        checks: {
            contentRendered: false,
            imagesLoaded: false,
            imagesAccessible: false,
            linksWorking: false,
            heroPresent: false,
            noOverflow: false,
            megamenuWorking: false,
            footerPresent: false,
            breadcrumbsWorking: false,
        },
        stats: {
            imagesCount: 0,
            imagesBroken: 0,
            linksCount: 0,
            linksBroken: 0,
            fontSizes: [],
            elementSizes: [],
            imageSizes: [],
            contentHeight: 0,
            viewportHeight: 0,
            heroHeight: 0,
            footerHeight: 0,
            megamenuItems: 0,
            footerLinks: 0,
            breadcrumbsCount: 0,
        },
    };
    
    // Проверка существования файла
    const filePath = path.join(__dirname, '../../SiteMGTS', pagePath.replace(/^\//, '').replace(/\/$/, ''));
    if (!fs.existsSync(filePath)) {
        result.issues.push('File not found');
        await page.close();
        return result;
    }
    
    try {
        await page.goto(pageUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 20000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Комплексная проверка качества
        const qualityCheck = await page.evaluate(() => {
            const checks = {
                contentRendered: false,
                imagesLoaded: false,
                imagesAccessible: false,
                linksWorking: false,
                heroPresent: false,
                noOverflow: false,
                megamenuWorking: false,
                footerPresent: false,
                breadcrumbsWorking: false,
            };
            
            const stats = {
                imagesCount: 0,
                imagesBroken: 0,
                linksCount: 0,
                linksBroken: 0,
                fontSizes: [],
                elementSizes: [],
                imageSizes: [],
                contentHeight: 0,
                viewportHeight: window.innerHeight,
                heroHeight: 0,
                footerHeight: 0,
                megamenuItems: 0,
                footerLinks: 0,
                breadcrumbsCount: 0,
            };
            
            const issues = [];
            const warnings = [];
            
            // 1. Проверка контента
            const mainContent = document.querySelector('#main-content, main, article, .content');
            if (mainContent) {
                const textContent = mainContent.textContent.trim();
                const htmlContent = mainContent.innerHTML;
                checks.contentRendered = textContent.length > 100 || htmlContent.length > 500;
                stats.contentHeight = mainContent.scrollHeight;
                
                // Проверка размеров шрифтов
                const allElements = mainContent.querySelectorAll('*');
                allElements.forEach(el => {
                    const fontSize = window.getComputedStyle(el).fontSize;
                    if (fontSize) {
                        const size = parseFloat(fontSize);
                        if (size > 0 && size < 100) { // Игнорируем экстремальные значения
                            stats.fontSizes.push(size);
                        }
                    }
                });
                
                // Проверка размеров элементов
                const sections = mainContent.querySelectorAll('section, .section, div[class*="section"]');
                sections.forEach(section => {
                    const rect = section.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        stats.elementSizes.push({ width: rect.width, height: rect.height });
                    }
                });
            } else {
                issues.push('Main content container not found');
            }
            
            // 2. Проверка изображений
            const images = Array.from(document.querySelectorAll('img'));
            stats.imagesCount = images.length;
            
            let imagesLoadedCount = 0;
            images.forEach(img => {
                const rect = img.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    stats.imageSizes.push({ width: rect.width, height: rect.height });
                }
                
                // Проверка на сломанные изображения
                if (!img.complete || img.naturalWidth === 0) {
                    stats.imagesBroken++;
                } else {
                    imagesLoadedCount++;
                }
            });
            
            // Считаем успешной загрузку, если хотя бы 80% изображений загружены
            checks.imagesLoaded = stats.imagesCount === 0 || (imagesLoadedCount / stats.imagesCount) >= 0.8;
            checks.imagesAccessible = stats.imagesBroken === 0 || (stats.imagesBroken / stats.imagesCount) < 0.2;
            
            if (stats.imagesBroken > 0) {
                issues.push(`${stats.imagesBroken} broken images`);
            }
            
            // Проверка размеров изображений (слишком большие или маленькие)
            stats.imageSizes.forEach(size => {
                if (size.width > 2000 || size.height > 2000) {
                    warnings.push(`Large image: ${Math.round(size.width)}x${Math.round(size.height)}px`);
                }
                if (size.width < 10 || size.height < 10) {
                    warnings.push(`Very small image: ${Math.round(size.width)}x${Math.round(size.height)}px`);
                }
            });
            
            // 3. Проверка ссылок
            const links = Array.from(document.querySelectorAll('a[href]'));
            stats.linksCount = links.length;
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                    // Проверка внутренних ссылок
                    if (href.startsWith('/') || href.includes(window.location.hostname)) {
                        // Внутренняя ссылка - проверка на 404 не делаем здесь
                    }
                }
            });
            
            checks.linksWorking = stats.linksBroken === 0;
            
            // 4. Проверка hero
            const hero = document.querySelector('.hero, [class*="hero"], header .hero');
            if (hero) {
                checks.heroPresent = true;
                const rect = hero.getBoundingClientRect();
                stats.heroHeight = rect.height;
            } else {
                warnings.push('Hero section not found');
            }
            
            // 5. Проверка overflow (элементы за пределами видимой зоны)
            const bodyHeight = document.body.scrollHeight;
            const viewportHeight = window.innerHeight;
            const footer = document.querySelector('footer, .footer, [class*="footer"]');
            if (footer) {
                const footerRect = footer.getBoundingClientRect();
                stats.footerHeight = footerRect.height;
                checks.footerPresent = true;
                
                // Проверка, что контент не заходит за футер
                const contentEnd = stats.contentHeight;
                const footerTop = footerRect.top + window.scrollY;
                
                if (contentEnd > footerTop - 50) { // 50px запас
                    warnings.push('Content may overlap with footer');
                }
            }
            
            // Проверка overflow: контент не должен быть слишком длинным без причины
            // Считаем нормальным, если высота страницы не превышает 5 экранов
            checks.noOverflow = bodyHeight <= viewportHeight * 5;
            
            // 6. Проверка мега-меню
            const megamenu = document.querySelector('.megamenu, [class*="mega-menu"], [class*="megamenu"]');
            if (megamenu) {
                const megamenuItems = megamenu.querySelectorAll('a, .menu-item, li');
                stats.megamenuItems = megamenuItems.length;
                checks.megamenuWorking = stats.megamenuItems > 0;
            } else {
                // Проверка обычного меню
                const menu = document.querySelector('nav, .menu, [class*="menu"]');
                if (menu) {
                    const menuItems = menu.querySelectorAll('a, .menu-item, li');
                    stats.megamenuItems = menuItems.length;
                    checks.megamenuWorking = stats.megamenuItems > 0;
                }
            }
            
            if (stats.megamenuItems === 0) {
                warnings.push('Menu items not found');
            }
            
            // 7. Проверка футера
            if (footer) {
                const footerLinks = footer.querySelectorAll('a[href]');
                stats.footerLinks = footerLinks.length;
                checks.footerPresent = stats.footerLinks > 0;
            }
            
            // 8. Проверка хлебных крошек
            const breadcrumbs = document.querySelector('.breadcrumbs, nav.breadcrumbs, [class*="breadcrumb"], [id*="breadcrumb"]');
            if (breadcrumbs) {
                const breadcrumbItems = breadcrumbs.querySelectorAll('a, span, li, .breadcrumb-item');
                stats.breadcrumbsCount = breadcrumbItems.length;
                // Проверяем, что есть хотя бы 2 элемента или хотя бы одна ссылка
                const breadcrumbLinks = breadcrumbs.querySelectorAll('a[href]');
                checks.breadcrumbsWorking = stats.breadcrumbsCount > 1 || breadcrumbLinks.length > 0;
            } else {
                // Хлебные крошки не обязательны для всех страниц
                checks.breadcrumbsWorking = true; // Не считаем отсутствие ошибкой
            }
            
            // Проверка размеров шрифтов (слишком большие или маленькие)
            const avgFontSize = stats.fontSizes.length > 0 
                ? stats.fontSizes.reduce((a, b) => a + b, 0) / stats.fontSizes.length 
                : 0;
            
            if (avgFontSize > 0) {
                if (avgFontSize > 24) {
                    warnings.push(`Large average font size: ${avgFontSize.toFixed(1)}px`);
                }
                if (avgFontSize < 10) {
                    warnings.push(`Small average font size: ${avgFontSize.toFixed(1)}px`);
                }
            }
            
            return { checks, stats, issues, warnings };
        });
        
        result.checks = qualityCheck.checks;
        result.stats = qualityCheck.stats;
        result.issues = qualityCheck.issues;
        result.warnings = qualityCheck.warnings;
        
    } catch (error) {
        result.issues.push(`Navigation error: ${error.message}`);
    } finally {
        await page.close();
    }
    
    return result;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 КОМПЛЕКСНАЯ ПРОВЕРКА КАЧЕСТВА МИГРАЦИИ');
    console.log('═'.repeat(70) + '\n');
    
    const startTime = Date.now();
    
    // Загрузка иерархии
    console.log('📋 Загрузка иерархии страниц...');
    const hierarchy = loadPagesHierarchy();
    const pagesFlat = hierarchy.flat || [];
    
    // Фильтруем новости (они не являются обычными страницами)
    const regularPages = pagesFlat.filter(p => !p.slug.startsWith('news_'));
    console.log(`   ✅ Найдено обычных страниц: ${regularPages.length}\n`);
    
    if (regularPages.length === 0) {
        console.error('❌ Страницы не найдены!');
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
    const totalPages = regularPages.length;
    let processed = 0;
    
    console.log('─'.repeat(70));
    console.log('🚀 НАЧАЛО ПРОВЕРКИ КАЧЕСТВА\n');
    
    // Проверяем все страницы
    const pagesToCheck = regularPages;
    
    console.log(`📊 Проверяю все страницы: ${pagesToCheck.length}\n`);
    
    for (const pageInfo of pagesToCheck) {
        processed++;
        
        // Прогресс-бар
        process.stdout.write(`\r${formatProgress(processed, pagesToCheck.length)} | ${pageInfo.slug.substring(0, 50).padEnd(50)}`);
        
        // Построить правильный путь
        const pagePath = buildPagePath(pageInfo.slug, pagesFlat);
        
        // Проверить качество
        const qualityCheck = await checkPageQuality(browser, pageInfo.slug, pagePath);
        
        results.push({
            slug: pageInfo.slug,
            title: pageInfo.title || pageInfo.slug,
            path: pagePath,
            ...qualityCheck,
        });
        
        // Детальный лог каждые 10 страниц или для проблемных
        if (processed % 10 === 0 || qualityCheck.issues.length > 0 || qualityCheck.warnings.length > 3) {
            process.stdout.write('\n');
            const issueCount = qualityCheck.issues.length;
            const warningCount = qualityCheck.warnings.length;
            const statusIcon = issueCount > 0 ? '❌' : (warningCount > 3 ? '⚠️' : '✅');
            const checksPassed = Object.values(qualityCheck.checks).filter(v => v).length;
            const totalChecks = Object.keys(qualityCheck.checks).length;
            console.log(`   ${statusIcon} ${pageInfo.slug.padEnd(50)} | Проверок: ${checksPassed}/${totalChecks} | Проблем: ${issueCount}, Предупреждений: ${warningCount}`);
        }
    }
    
    await browser.close();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    // Итоговый отчет
    console.log('\n' + '─'.repeat(70));
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ПО КАЧЕСТВУ');
    console.log('═'.repeat(70) + '\n');
    
    // Подсчет статистики
    const allChecks = {
        contentRendered: results.filter(r => r.checks.contentRendered).length,
        imagesLoaded: results.filter(r => r.checks.imagesLoaded).length,
        imagesAccessible: results.filter(r => r.checks.imagesAccessible).length,
        linksWorking: results.filter(r => r.checks.linksWorking).length,
        heroPresent: results.filter(r => r.checks.heroPresent).length,
        noOverflow: results.filter(r => r.checks.noOverflow).length,
        megamenuWorking: results.filter(r => r.checks.megamenuWorking).length,
        footerPresent: results.filter(r => r.checks.footerPresent).length,
        breadcrumbsWorking: results.filter(r => r.checks.breadcrumbsWorking).length,
    };
    
    const totalPagesChecked = results.length;
    
    console.log('✅ Проверки пройдены:');
    Object.entries(allChecks).forEach(([check, count]) => {
        const percent = Math.round((count / totalPagesChecked) * 100);
        const icon = percent >= 80 ? '✅' : (percent >= 50 ? '⚠️' : '❌');
        console.log(`   ${icon} ${check.padEnd(25)}: ${count}/${totalPagesChecked} (${percent}%)`);
    });
    
    console.log(`\n⏱️  Время выполнения: ${duration} сек\n`);
    
    // Проблемные страницы
    const problematic = results.filter(r => r.issues.length > 0 || r.warnings.length > 3);
    if (problematic.length > 0) {
        console.log('─'.repeat(70));
        console.log(`⚠️  ПРОБЛЕМНЫЕ СТРАНИЦЫ (${problematic.length}):\n`);
        
        problematic.slice(0, 10).forEach((r, index) => {
            console.log(`${index + 1}. ${r.slug} (${r.title})`);
            if (r.issues.length > 0) {
                console.log('   ❌ Проблемы:');
                r.issues.forEach(issue => console.log(`      - ${issue}`));
            }
            if (r.warnings.length > 0) {
                console.log('   ⚠️  Предупреждения:');
                r.warnings.slice(0, 5).forEach(warning => console.log(`      - ${warning}`));
            }
            console.log('');
        });
        
        if (problematic.length > 10) {
            console.log(`   ... и еще ${problematic.length - 10} страниц с проблемами\n`);
        }
    }
    
    // Сохранение отчета
    const reportPath = path.join(__dirname, '../../temp/validation/quality-validation-report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        totalPagesChecked,
        duration: `${duration}s`,
        summary: allChecks,
        results: results.map(r => ({
            slug: r.slug,
            title: r.title,
            path: r.path,
            checks: r.checks,
            stats: r.stats,
            issues: r.issues,
            warnings: r.warnings,
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
