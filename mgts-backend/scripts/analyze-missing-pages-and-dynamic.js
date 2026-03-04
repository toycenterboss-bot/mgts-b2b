/**
 * Анализ всех собранных страниц и внутренних ссылок
 * для определения забытых страниц и страниц с динамическим контентом
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE_URL = 'https://business.mgts.ru';
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const PAGES_NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const HIERARCHY_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/missing-pages-analysis.json');
const REPORT_FILE = path.join(__dirname, '../../docs/MISSING_PAGES_ANALYSIS.md');

/**
 * Извлечь все внутренние ссылки из HTML
 */
function extractInternalLinks(html) {
    if (!html || typeof html !== 'string') {
        return [];
    }
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const links = [];
    
    // Извлекаем ссылки из <a href>
    doc.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Пропускаем внешние ссылки
        if (href.startsWith('http://') || href.startsWith('https://')) {
            if (!href.includes('business.mgts.ru')) {
                return;
            }
        }
        
        // Пропускаем якоря, mailto, tel
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }
        
        // Пропускаем файлы документов
        if (href.match(/\.(docx?|xlsx?|pdf|zip|rar|jpg|jpeg|png|gif)$/i)) {
            return;
        }
        
        // Нормализуем URL
        let normalizedUrl = href;
        if (href.startsWith('http://business.mgts.ru') || href.startsWith('https://business.mgts.ru')) {
            normalizedUrl = href.replace(/^https?:\/\/business\.mgts\.ru/, '');
        }
        if (!normalizedUrl.startsWith('/')) {
            normalizedUrl = '/' + normalizedUrl;
        }
        
        // Убираем параметры запроса и якоря
        normalizedUrl = normalizedUrl.split('?')[0].split('#')[0];
        
        // Убираем trailing slash (кроме корня)
        if (normalizedUrl !== '/' && normalizedUrl.endsWith('/')) {
            normalizedUrl = normalizedUrl.slice(0, -1);
        }
        
        links.push({
            href: href,
            normalizedUrl: normalizedUrl,
            text: link.textContent.trim().substring(0, 100)
        });
    });
    
    return links;
}

/**
 * Извлечь slug из URL
 */
function extractSlugFromUrl(url) {
    if (!url || url === '/' || url === '/index.html') {
        return 'home';
    }
    
    // Убираем начальный и конечный слэш
    let path = url.replace(/^\/+|\/+$/g, '');
    
    // Убираем /index.html
    path = path.replace(/\/index\.html$/, '');
    path = path.replace(/^index\.html$/, '');
    
    // Если путь пустой, это главная страница
    if (!path) {
        return 'home';
    }
    
    // Возвращаем последнюю часть пути как slug
    const parts = path.split('/');
    return parts[parts.length - 1];
}

/**
 * Проверить наличие динамического контента в HTML
 */
function checkDynamicContent(html, url) {
    if (!html || typeof html !== 'string') {
        return null;
    }
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const indicators = {
        hasTabs: false,
        hasSelect: false,
        hasHistoryTimeline: false,
        hasDocumentTabs: false,
        hasCarousel: false,
        hasAccordion: false,
        tabSelectors: [],
        dynamicSelectors: []
    };
    
    // Проверяем наличие табов
    const tabButtons = doc.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab], [role="tab"]');
    if (tabButtons.length > 0) {
        indicators.hasTabs = true;
        indicators.tabSelectors.push({
            selector: '.tab-button-item, .tab-button',
            count: tabButtons.length,
            texts: Array.from(tabButtons).slice(0, 5).map(btn => btn.textContent.trim().substring(0, 50))
        });
    }
    
    // Проверяем наличие select с табами
    const tabSelect = doc.querySelector('select[name="tab"], select.tab-selector, .tab-selector select');
    if (tabSelect) {
        indicators.hasSelect = true;
        const options = Array.from(tabSelect.querySelectorAll('option'));
        indicators.dynamicSelectors.push({
            type: 'select',
            selector: 'select[name="tab"]',
            optionsCount: options.length,
            options: options.slice(0, 5).map(opt => opt.textContent.trim().substring(0, 50))
        });
    }
    
    // Проверяем историю (блок истории)
    const historyBlock = doc.querySelector('.block-mgts-history, [class*="history"], [class*="history-timeline"]');
    if (historyBlock) {
        indicators.hasHistoryTimeline = true;
    }
    
    // Проверяем табы документов
    const filesList = doc.querySelector('.files-list');
    const documentsTabs = doc.querySelector('.tabs-row-selection, .tab-buttons-container');
    if (filesList && documentsTabs) {
        indicators.hasDocumentTabs = true;
    }
    
    // Проверяем карусели
    const carousel = doc.querySelector('.call-management-slider, .mobile-app-slider, [class*="carousel"], [class*="slider"]');
    if (carousel) {
        indicators.hasCarousel = true;
    }
    
    // Проверяем аккордеоны
    const accordion = doc.querySelector('.accordion-row, [class*="accordion"]');
    if (accordion) {
        indicators.hasAccordion = true;
    }
    
    return indicators;
}

/**
 * Основная функция анализа
 */
async function analyzeMissingPages() {
    console.log('🔍 АНАЛИЗ ПРОПУЩЕННЫХ СТРАНИЦ И ДИНАМИЧЕСКОГО КОНТЕНТА\n');
    console.log('='.repeat(70));
    
    // 1. Загружаем список уже собранных страниц
    console.log('\n📋 ШАГ 1: Загрузка списка собранных страниц...\n');
    
    const collectedPages = new Map();
    const collectedUrls = new Set();
    
    if (fs.existsSync(PAGES_CONTENT_DIR)) {
        const files = fs.readdirSync(PAGES_CONTENT_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
        
        files.forEach(file => {
            try {
                const filePath = path.join(PAGES_CONTENT_DIR, file);
                const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                
                const slug = pageData.slug || file.replace('.json', '');
                const url = pageData.url || pageData.originalUrl || '';
                
                collectedPages.set(slug, {
                    slug: slug,
                    url: url,
                    title: pageData.title || '',
                    section: pageData.section || 'unknown',
                    hasDynamicContent: false,
                    dynamicContent: null,
                    links: []
                });
                
                if (url) {
                    const normalizedUrl = url.replace(/^https?:\/\/business\.mgts\.ru/, '') || '/';
                    collectedUrls.add(normalizedUrl);
                }
            } catch (error) {
                console.error(`   ⚠️  Ошибка при загрузке ${file}: ${error.message}`);
            }
        });
    }
    
    console.log(`   ✅ Загружено собранных страниц: ${collectedPages.size}`);
    
    // 2. Загружаем иерархию страниц (если есть)
    console.log('\n📋 ШАГ 2: Загрузка иерархии страниц...\n');
    
    const hierarchyPages = new Map();
    
    if (fs.existsSync(HIERARCHY_FILE)) {
        try {
            const hierarchyData = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
            const flatPages = hierarchyData.flat || [];
            
            flatPages.forEach(page => {
                if (page.slug) {
                    hierarchyPages.set(page.slug, {
                        slug: page.slug,
                        url: page.originalUrl || '',
                        title: page.title || '',
                        section: page.section || 'unknown'
                    });
                }
            });
            
            console.log(`   ✅ Загружено страниц из иерархии: ${hierarchyPages.size}`);
        } catch (error) {
            console.error(`   ⚠️  Ошибка при загрузке иерархии: ${error.message}`);
        }
    }
    
    // 3. Извлекаем все внутренние ссылки из собранных страниц
    console.log('\n📋 ШАГ 3: Извлечение внутренних ссылок из собранных страниц...\n');
    
    const allLinks = new Map(); // normalizedUrl -> { sources: [], count: 0 }
    
    collectedPages.forEach((pageData, slug) => {
        try {
            const filePath = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
            if (!fs.existsSync(filePath)) {
                return;
            }
            
            const pageDataFull = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const html = pageDataFull.content?.html || pageDataFull.fullHTML || '';
            
            // Проверяем динамический контент
            const dynamicContent = checkDynamicContent(html, pageData.url);
            if (dynamicContent && (dynamicContent.hasTabs || dynamicContent.hasSelect || dynamicContent.hasHistoryTimeline || dynamicContent.hasDocumentTabs || dynamicContent.hasCarousel || dynamicContent.hasAccordion)) {
                pageData.hasDynamicContent = true;
                pageData.dynamicContent = dynamicContent;
            }
            
            // Извлекаем ссылки
            const links = extractInternalLinks(html);
            pageData.links = links;
            
            links.forEach(link => {
                const normalizedUrl = link.normalizedUrl;
                if (!allLinks.has(normalizedUrl)) {
                    allLinks.set(normalizedUrl, {
                        normalizedUrl: normalizedUrl,
                        slug: extractSlugFromUrl(normalizedUrl),
                        sources: [],
                        count: 0,
                        exampleHref: link.href,
                        exampleText: link.text
                    });
                }
                
                const linkData = allLinks.get(normalizedUrl);
                linkData.count++;
                if (!linkData.sources.includes(slug)) {
                    linkData.sources.push(slug);
                }
            });
            
        } catch (error) {
            console.error(`   ⚠️  Ошибка при обработке ${slug}: ${error.message}`);
        }
    });
    
    console.log(`   ✅ Найдено уникальных внутренних ссылок: ${allLinks.size}`);
    
    // 4. Находим пропущенные страницы
    console.log('\n📋 ШАГ 4: Поиск пропущенных страниц...\n');
    
    const missingPages = [];
    const possibleMissingPages = [];
    
    allLinks.forEach((linkData, normalizedUrl) => {
        const slug = linkData.slug;
        const url = BASE_URL + normalizedUrl;
        
        // Пропускаем ссылки на файлы и внешние ресурсы
        if (normalizedUrl.match(/\.(docx?|xlsx?|pdf|zip|rar|jpg|jpeg|png|gif|svg|css|js)$/i)) {
            return;
        }
        
        // Пропускаем уже собранные страницы
        if (collectedPages.has(slug) || collectedUrls.has(normalizedUrl)) {
            return;
        }
        
        // Проверяем, есть ли эта страница в иерархии
        const inHierarchy = hierarchyPages.has(slug);
        
        const missingPage = {
            slug: slug,
            url: url,
            normalizedUrl: normalizedUrl,
            inHierarchy: inHierarchy,
            referencedBy: linkData.sources,
            referenceCount: linkData.count,
            exampleHref: linkData.exampleHref,
            exampleText: linkData.exampleText
        };
        
        if (inHierarchy) {
            // Если страница в иерархии, но не собрана - точно пропущена
            missingPages.push(missingPage);
        } else {
            // Если страница не в иерархии, но упоминается в ссылках - возможно пропущена
            possibleMissingPages.push(missingPage);
        }
    });
    
    console.log(`   ✅ Найдено точно пропущенных страниц (в иерархии): ${missingPages.length}`);
    console.log(`   ⚠️  Найдено возможно пропущенных страниц (не в иерархии): ${possibleMissingPages.length}`);
    
    // 5. Находим страницы с динамическим контентом, который не был извлечен
    console.log('\n📋 ШАГ 5: Поиск страниц с нескачанным динамическим контентом...\n');
    
    const pagesWithDynamicContent = [];
    
    collectedPages.forEach((pageData, slug) => {
        if (pageData.hasDynamicContent && pageData.dynamicContent) {
            const dynamic = pageData.dynamicContent;
            
            // Проверяем, был ли уже извлечен динамический контент
            const filePath = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const pageDataFull = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    const hasDynamicData = pageDataFull.dynamicContent && pageDataFull.dynamicContent.tabs && pageDataFull.dynamicContent.tabs.length > 0;
                    
                    if (!hasDynamicData) {
                        pagesWithDynamicContent.push({
                            slug: slug,
                            url: pageData.url,
                            title: pageData.title,
                            section: pageData.section,
                            dynamicContent: dynamic,
                            reason: 'Обнаружен динамический контент, но данные не извлечены'
                        });
                    }
                } catch (error) {
                    pagesWithDynamicContent.push({
                        slug: slug,
                        url: pageData.url,
                        title: pageData.title,
                        section: pageData.section,
                        dynamicContent: dynamic,
                        reason: `Ошибка при проверке: ${error.message}`
                    });
                }
            }
        }
    });
    
    console.log(`   ✅ Найдено страниц с нескачанным динамическим контентом: ${pagesWithDynamicContent.length}`);
    
    // 6. Формируем отчет
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            collectedPages: collectedPages.size,
            hierarchyPages: hierarchyPages.size,
            uniqueLinks: allLinks.size,
            missingPages: missingPages.length,
            possibleMissingPages: possibleMissingPages.length,
            pagesWithDynamicContent: pagesWithDynamicContent.length
        },
        missingPages: missingPages.sort((a, b) => b.referenceCount - a.referenceCount),
        possibleMissingPages: possibleMissingPages.sort((a, b) => b.referenceCount - a.referenceCount),
        pagesWithDynamicContent: pagesWithDynamicContent,
        pagesWithDynamicContentExtracted: Array.from(collectedPages.values())
            .filter(p => p.hasDynamicContent && p.dynamicContent)
            .map(p => ({
                slug: p.slug,
                url: p.url,
                title: p.title,
                section: p.section,
                dynamicContent: p.dynamicContent
            }))
    };
    
    // Сохраняем JSON отчет
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let mdReport = '# Анализ пропущенных страниц и динамического контента\n\n';
    mdReport += `**Дата анализа:** ${new Date().toLocaleString('ru-RU')}\n\n`;
    mdReport += `## Сводка\n\n`;
    mdReport += `- **Собранных страниц:** ${report.summary.collectedPages}\n`;
    mdReport += `- **Страниц в иерархии:** ${report.summary.hierarchyPages}\n`;
    mdReport += `- **Уникальных внутренних ссылок:** ${report.summary.uniqueLinks}\n`;
    mdReport += `- **Точно пропущенных страниц:** ${report.summary.missingPages}\n`;
    mdReport += `- **Возможно пропущенных страниц:** ${report.summary.possibleMissingPages}\n`;
    mdReport += `- **Страниц с нескачанным динамическим контентом:** ${report.summary.pagesWithDynamicContent}\n\n`;
    
    // Пропущенные страницы
    if (missingPages.length > 0) {
        mdReport += `## Точно пропущенные страницы (в иерархии, но не собраны)\n\n`;
        mdReport += `| URL | Slug | Упоминаний | Упоминается на |\n`;
        mdReport += `|-----|------|------------|----------------|\n`;
        missingPages.slice(0, 50).forEach(page => {
            mdReport += `| ${page.url} | ${page.slug} | ${page.referenceCount} | ${page.referencedBy.slice(0, 3).join(', ')} |\n`;
        });
        mdReport += `\n`;
    }
    
    // Возможно пропущенные страницы
    if (possibleMissingPages.length > 0) {
        mdReport += `## Возможно пропущенные страницы (не в иерархии, но упоминаются в ссылках)\n\n`;
        mdReport += `| URL | Slug | Упоминаний | Упоминается на |\n`;
        mdReport += `|-----|------|------------|----------------|\n`;
        possibleMissingPages.slice(0, 30).forEach(page => {
            mdReport += `| ${page.url} | ${page.slug} | ${page.referenceCount} | ${page.referencedBy.slice(0, 3).join(', ')} |\n`;
        });
        mdReport += `\n`;
    }
    
    // Страницы с динамическим контентом
    if (pagesWithDynamicContent.length > 0) {
        mdReport += `## Страницы с нескачанным динамическим контентом\n\n`;
        pagesWithDynamicContent.forEach(page => {
            mdReport += `### ${page.title} (${page.slug})\n\n`;
            mdReport += `- **URL:** ${page.url}\n`;
            mdReport += `- **Раздел:** ${page.section}\n`;
            mdReport += `- **Причина:** ${page.reason}\n`;
            mdReport += `- **Динамический контент:**\n`;
            if (page.dynamicContent.hasTabs) {
                mdReport += `  - Табы: Да (${page.dynamicContent.tabSelectors.length} селекторов)\n`;
            }
            if (page.dynamicContent.hasSelect) {
                mdReport += `  - Select: Да\n`;
            }
            if (page.dynamicContent.hasHistoryTimeline) {
                mdReport += `  - История (timeline): Да\n`;
            }
            if (page.dynamicContent.hasDocumentTabs) {
                mdReport += `  - Табы документов: Да\n`;
            }
            if (page.dynamicContent.hasCarousel) {
                mdReport += `  - Карусель: Да\n`;
            }
            if (page.dynamicContent.hasAccordion) {
                mdReport += `  - Аккордеон: Да\n`;
            }
            mdReport += `\n`;
        });
    }
    
    fs.writeFileSync(REPORT_FILE, mdReport, 'utf-8');
    
    // Выводим результаты в консоль
    console.log('\n' + '='.repeat(70));
    console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
    console.log('='.repeat(70));
    console.log(`\n✅ Собранных страниц: ${report.summary.collectedPages}`);
    console.log(`📋 Страниц в иерархии: ${report.summary.hierarchyPages}`);
    console.log(`🔗 Уникальных внутренних ссылок: ${report.summary.uniqueLinks}`);
    console.log(`❌ Точно пропущенных страниц: ${report.summary.missingPages}`);
    console.log(`⚠️  Возможно пропущенных страниц: ${report.summary.possibleMissingPages}`);
    console.log(`🔄 Страниц с нескачанным динамическим контентом: ${report.summary.pagesWithDynamicContent}`);
    
    if (missingPages.length > 0) {
        console.log(`\n📋 ТОП-10 точно пропущенных страниц:\n`);
        missingPages.slice(0, 10).forEach((page, index) => {
            console.log(`   ${index + 1}. ${page.url} (${page.slug})`);
            console.log(`      Упоминаний: ${page.referenceCount}, Упоминается на: ${page.referencedBy.slice(0, 3).join(', ')}`);
        });
    }
    
    if (possibleMissingPages.length > 0) {
        console.log(`\n📋 ТОП-10 возможно пропущенных страниц:\n`);
        possibleMissingPages.slice(0, 10).forEach((page, index) => {
            console.log(`   ${index + 1}. ${page.url} (${page.slug})`);
            console.log(`      Упоминаний: ${page.referenceCount}, Упоминается на: ${page.referencedBy.slice(0, 3).join(', ')}`);
        });
    }
    
    if (pagesWithDynamicContent.length > 0) {
        console.log(`\n📋 Страницы с нескачанным динамическим контентом:\n`);
        pagesWithDynamicContent.forEach((page, index) => {
            console.log(`   ${index + 1}. ${page.title} (${page.slug})`);
            console.log(`      URL: ${page.url}`);
            const dynamic = page.dynamicContent;
            const indicators = [];
            if (dynamic.hasTabs) indicators.push('Табы');
            if (dynamic.hasSelect) indicators.push('Select');
            if (dynamic.hasHistoryTimeline) indicators.push('История');
            if (dynamic.hasDocumentTabs) indicators.push('Табы документов');
            if (dynamic.hasCarousel) indicators.push('Карусель');
            if (dynamic.hasAccordion) indicators.push('Аккордеон');
            console.log(`      Типы динамического контента: ${indicators.join(', ')}`);
        });
    }
    
    console.log(`\n📄 Подробные отчеты сохранены:`);
    console.log(`   - JSON: ${OUTPUT_FILE}`);
    console.log(`   - Markdown: ${REPORT_FILE}`);
    console.log('='.repeat(70) + '\n');
    
    return report;
}

// Запускаем анализ
if (require.main === module) {
    analyzeMissingPages().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { analyzeMissingPages };
