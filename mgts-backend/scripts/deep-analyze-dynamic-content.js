/**
 * Глубокий анализ всех страниц на предмет:
 * 1. Вложенных табов (табы второго уровня)
 * 2. Пропущенных динамических элементов
 * 3. Файлов и изображений внутри динамического контента
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE_URL = 'https://business.mgts.ru';
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const HIERARCHY_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/deep-analysis-report.json');
const REPORT_FILE = path.join(__dirname, '../../docs/DEEP_ANALYSIS_REPORT.md');

/**
 * Проверить наличие вложенных табов на странице
 */
async function checkNestedTabs(page, url, slug) {
    console.log(`\n📋 Проверка вложенных табов: ${slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все уровни табов
        const tabsInfo = await page.evaluate(() => {
            const result = {
                firstLevelTabs: [],
                nestedTabs: [],
                allTabs: []
            };
            
            // Ищем табы первого уровня
            const firstLevelTabs = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
            result.firstLevelTabs = firstLevelTabs.map((btn, index) => ({
                index: index,
                text: btn.textContent.trim(),
                selector: '.tab-button-item, .tab-button, .tab-item, [data-tab]'
            }));
            
            // Кликаем по каждому табу первого уровня и ищем вложенные табы
            firstLevelTabs.forEach((firstTab, firstIndex) => {
                try {
                    firstTab.click();
                } catch (e) {
                    // Игнорируем ошибки клика
                }
                
                // Ищем табы внутри контента первого таба
                const tabContent = firstTab.closest('.tabs-container, .tab-container') || 
                                 document.querySelector('.tab-content, [class*="tab-content"]') ||
                                 document;
                
                const nestedTabs = Array.from(tabContent.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'))
                    .filter(nt => !firstLevelTabs.includes(nt));
                
                if (nestedTabs.length > 0) {
                    result.nestedTabs.push({
                        firstLevelIndex: firstIndex,
                        firstLevelText: firstTab.textContent.trim(),
                        nestedTabs: nestedTabs.map((nt, ntIndex) => ({
                            index: ntIndex,
                            text: nt.textContent.trim()
                        }))
                    });
                }
            });
            
            return result;
        });
        
        // Теперь последовательно кликаем по каждому табу первого уровня и проверяем вложенные табы
        const detailedNestedTabs = [];
        
        for (let i = 0; i < tabsInfo.firstLevelTabs.length; i++) {
            try {
                console.log(`   🔄 Проверка таба ${i + 1}/${tabsInfo.firstLevelTabs.length}: ${tabsInfo.firstLevelTabs[i].text.substring(0, 50)}...`);
                
                // Кликаем по табу первого уровня
                await page.evaluate((index) => {
                    const buttons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
                    if (buttons[index]) {
                        buttons[index].click();
                    }
                }, i);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Ищем вложенные табы после клика
                const nestedTabsAfterClick = await page.evaluate(() => {
                    const tabContainers = Array.from(document.querySelectorAll('.tab-content, [class*="tab-content"], .files-list, [class*="tab-panel"]'));
                    const nestedTabs = [];
                    
                    tabContainers.forEach(container => {
                        const tabs = Array.from(container.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab], button[data-tab]'));
                        if (tabs.length > 0) {
                            nestedTabs.push({
                                container: container.className || 'unknown',
                                tabs: tabs.map(t => t.textContent.trim())
                            });
                        }
                    });
                    
                    return nestedTabs;
                });
                
                if (nestedTabsAfterClick.length > 0) {
                    detailedNestedTabs.push({
                        firstLevelIndex: i,
                        firstLevelText: tabsInfo.firstLevelTabs[i].text,
                        nestedTabs: nestedTabsAfterClick
                    });
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при проверке таба ${i + 1}: ${tabError.message}`);
            }
        }
        
        return {
            firstLevelCount: tabsInfo.firstLevelTabs.length,
            nestedTabsFound: detailedNestedTabs.length > 0,
            nestedTabs: detailedNestedTabs
        };
        
    } catch (error) {
        console.error(`   ❌ Ошибка при проверке вложенных табов: ${error.message}`);
        return null;
    }
}

/**
 * Проверить наличие файлов и изображений в динамическом контенте
 */
async function checkFilesAndImages(page, url, slug) {
    console.log(`\n📋 Проверка файлов и изображений: ${slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Извлекаем все ссылки на файлы и изображения
        const assetsInfo = await page.evaluate(() => {
            const result = {
                files: [],
                images: [],
                dynamicContentFiles: [],
                dynamicContentImages: []
            };
            
            // Находим все ссылки на файлы
            const fileLinks = Array.from(document.querySelectorAll('a[href]'))
                .filter(link => {
                    const href = link.getAttribute('href') || '';
                    return /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(href);
                });
            
            result.files = fileLinks.map(link => ({
                href: link.getAttribute('href'),
                text: link.textContent.trim(),
                parent: link.closest('.tab-content, .accordion-content, [class*="tab"], [class*="accordion"]')?.className || 'none'
            }));
            
            // Находим все изображения
            const images = Array.from(document.querySelectorAll('img[src]'));
            result.images = images.map(img => ({
                src: img.getAttribute('src'),
                alt: img.getAttribute('alt') || '',
                parent: img.closest('.tab-content, .accordion-content, [class*="tab"], [class*="accordion"]')?.className || 'none'
            }));
            
            // Находим файлы и изображения внутри динамического контента
            const tabContents = Array.from(document.querySelectorAll('.tab-content, [class*="tab-content"], .accordion-content, [class*="accordion-content"]'));
            tabContents.forEach(container => {
                const containerFiles = Array.from(container.querySelectorAll('a[href]'))
                    .filter(link => /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(link.getAttribute('href') || ''));
                
                const containerImages = Array.from(container.querySelectorAll('img[src]'));
                
                if (containerFiles.length > 0 || containerImages.length > 0) {
                    result.dynamicContentFiles.push(...containerFiles.map(link => ({
                        href: link.getAttribute('href'),
                        text: link.textContent.trim(),
                        container: container.className || 'unknown'
                    })));
                    
                    result.dynamicContentImages.push(...containerImages.map(img => ({
                        src: img.getAttribute('src'),
                        alt: img.getAttribute('alt') || '',
                        container: container.className || 'unknown'
                    })));
                }
            });
            
            return result;
        });
        
        // Теперь кликаем по всем табам и аккордеонам и собираем файлы и изображения из каждого
        const dynamicAssets = {
            tabs: {},
            accordions: {}
        };
        
        // Собираем файлы из табов
        const allTabs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'))
                .map((btn, index) => ({
                    index: index,
                    text: btn.textContent.trim()
                }));
        });
        
        for (const tab of allTabs) {
            try {
                // Кликаем по табу
                await page.evaluate((index) => {
                    const buttons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
                    if (buttons[index]) {
                        buttons[index].click();
                    }
                }, tab.index);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Собираем файлы и изображения из контента таба
                const tabAssets = await page.evaluate(() => {
                    const tabContent = document.querySelector('.tab-content, [class*="tab-content"], .files-list, [class*="tab-panel"]');
                    if (!tabContent) return { files: [], images: [] };
                    
                    const files = Array.from(tabContent.querySelectorAll('a[href]'))
                        .filter(link => /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(link.getAttribute('href') || ''))
                        .map(link => ({
                            href: link.getAttribute('href'),
                            text: link.textContent.trim()
                        }));
                    
                    const images = Array.from(tabContent.querySelectorAll('img[src]'))
                        .map(img => ({
                            src: img.getAttribute('src'),
                            alt: img.getAttribute('alt') || ''
                        }));
                    
                    return { files, images };
                });
                
                if (tabAssets.files.length > 0 || tabAssets.images.length > 0) {
                    dynamicAssets.tabs[tab.text] = tabAssets;
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при обработке таба ${tab.text}: ${tabError.message}`);
            }
        }
        
        // Собираем файлы из аккордеонов
        const allAccordions = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.accordion-row'))
                .map((row, index) => ({
                    index: index,
                    header: row.querySelector('.accordion-row__header-text')?.textContent.trim() || ''
                }));
        });
        
        for (const accordion of allAccordions) {
            try {
                // Кликаем по аккордеону
                await page.evaluate((index) => {
                    const rows = Array.from(document.querySelectorAll('.accordion-row'));
                    if (rows[index]) {
                        const header = rows[index].querySelector('.accordion-row__header');
                        if (header) {
                            header.click();
                        }
                    }
                }, accordion.index);
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Собираем файлы и изображения из контента аккордеона
                const accordionAssets = await page.evaluate((index) => {
                    const rows = Array.from(document.querySelectorAll('.accordion-row'));
                    if (!rows[index]) return { files: [], images: [] };
                    
                    const content = rows[index].querySelector('.accordion-row__content, .accordion-row__container-collapse');
                    if (!content) return { files: [], images: [] };
                    
                    const files = Array.from(content.querySelectorAll('a[href]'))
                        .filter(link => /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(link.getAttribute('href') || ''))
                        .map(link => ({
                            href: link.getAttribute('href'),
                            text: link.textContent.trim()
                        }));
                    
                    const images = Array.from(content.querySelectorAll('img[src]'))
                        .map(img => ({
                            src: img.getAttribute('src'),
                            alt: img.getAttribute('alt') || ''
                        }));
                    
                    return { files, images };
                }, accordion.index);
                
                if (accordionAssets.files.length > 0 || accordionAssets.images.length > 0) {
                    dynamicAssets.accordions[accordion.header] = accordionAssets;
                }
                
            } catch (accordionError) {
                console.error(`   ⚠️  Ошибка при обработке аккордеона ${accordion.header}: ${accordionError.message}`);
            }
        }
        
        return {
            static: {
                files: assetsInfo.files.length,
                images: assetsInfo.images.length
            },
            dynamic: {
                files: assetsInfo.dynamicContentFiles.length,
                images: assetsInfo.dynamicContentImages.length
            },
            fromTabs: dynamicAssets.tabs,
            fromAccordions: dynamicAssets.accordions,
            allFiles: [
                ...assetsInfo.files.map(f => ({ ...f, type: 'static' })),
                ...assetsInfo.dynamicContentFiles.map(f => ({ ...f, type: 'dynamic' }))
            ],
            allImages: [
                ...assetsInfo.images.map(img => ({ ...img, type: 'static' })),
                ...assetsInfo.dynamicContentImages.map(img => ({ ...img, type: 'dynamic' }))
            ]
        };
        
    } catch (error) {
        console.error(`   ❌ Ошибка при проверке файлов и изображений: ${error.message}`);
        return null;
    }
}

/**
 * Проверить все пропущенные динамические элементы
 */
async function checkMissingDynamicElements(page, url, slug) {
    console.log(`\n📋 Проверка пропущенных динамических элементов: ${slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Проверяем наличие различных динамических элементов
        const missingElements = await page.evaluate(() => {
            const result = {
                hasModal: false,
                hasDropdown: false,
                hasCarousel: false,
                hasSlider: false,
                hasCalendar: false,
                hasForm: false,
                hasVideo: false,
                hasMap: false,
                hasCountdown: false,
                hasTooltip: false,
                selectors: []
            };
            
            // Модальные окна
            const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [role="dialog"]');
            if (modals.length > 0) {
                result.hasModal = true;
                result.selectors.push({ type: 'modal', count: modals.length, classes: Array.from(modals).slice(0, 3).map(m => m.className) });
            }
            
            // Выпадающие меню
            const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="select"], select:not([class*="tab"])');
            if (dropdowns.length > 0) {
                result.hasDropdown = true;
                result.selectors.push({ type: 'dropdown', count: dropdowns.length, classes: Array.from(dropdowns).slice(0, 3).map(d => d.className) });
            }
            
            // Карусели (дополнительные проверки)
            const carousels = document.querySelectorAll('[class*="carousel"], [class*="slider"], .swiper-container, [class*="swiper"]');
            if (carousels.length > 0) {
                result.hasCarousel = true;
                result.selectors.push({ type: 'carousel', count: carousels.length, classes: Array.from(carousels).slice(0, 3).map(c => c.className) });
            }
            
            // Видео
            const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
            if (videos.length > 0) {
                result.hasVideo = true;
                result.selectors.push({ type: 'video', count: videos.length });
            }
            
            // Карты
            const maps = document.querySelectorAll('[class*="map"], [id*="map"], [id*="yandex"], [id*="google"]');
            if (maps.length > 0) {
                result.hasMap = true;
                result.selectors.push({ type: 'map', count: maps.length });
            }
            
            // Формы (сложные формы)
            const forms = document.querySelectorAll('form');
            if (forms.length > 0) {
                const complexForms = Array.from(forms).filter(form => {
                    const inputs = form.querySelectorAll('input, select, textarea');
                    return inputs.length > 5;
                });
                if (complexForms.length > 0) {
                    result.hasForm = true;
                    result.selectors.push({ type: 'form', count: complexForms.length });
                }
            }
            
            return result;
        });
        
        return missingElements;
        
    } catch (error) {
        console.error(`   ❌ Ошибка при проверке пропущенных элементов: ${error.message}`);
        return null;
    }
}

/**
 * Главная функция анализа
 */
async function main() {
    console.log('🔍 ГЛУБОКИЙ АНАЛИЗ ВСЕХ СТРАНИЦ');
    console.log('='.repeat(70));
    
    // Загружаем список всех страниц
    console.log('\n📋 Загрузка списка всех страниц...\n');
    
    const pages = [];
    
    // Загружаем из pages-content
    if (fs.existsSync(PAGES_CONTENT_DIR)) {
        const files = fs.readdirSync(PAGES_CONTENT_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
        
        files.forEach(file => {
            try {
                const filePath = path.join(PAGES_CONTENT_DIR, file);
                const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                
                pages.push({
                    slug: pageData.slug || file.replace('.json', ''),
                    url: pageData.url || pageData.originalUrl || '',
                    title: pageData.title || '',
                    section: pageData.section || 'unknown',
                    hasDynamicContent: !!pageData.dynamicContent
                });
            } catch (error) {
                console.error(`   ⚠️  Ошибка при загрузке ${file}: ${error.message}`);
            }
        });
    }
    
    console.log(`   ✅ Загружено страниц: ${pages.length}\n`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const results = {
        timestamp: new Date().toISOString(),
        pagesAnalyzed: 0,
        pagesWithNestedTabs: [],
        pagesWithFilesInDynamic: [],
        pagesWithImagesInDynamic: [],
        pagesWithMissingElements: [],
        allFiles: [],
        allImages: [],
        summary: {
            nestedTabsFound: 0,
            filesInDynamicFound: 0,
            imagesInDynamicFound: 0,
            missingElementsFound: 0
        }
    };
    
    // Сначала анализируем страницы, которые точно имеют динамический контент
    const priorityPages = pages.filter(p => 
        p.hasDynamicContent || 
        ['forms_doc', 'offers', 'operinfo', 'wca', 'infoformen', 'documents', 'partners_ramochnie_dogovori'].includes(p.slug)
    );
    
    console.log(`\n📋 Приоритетные страницы для анализа: ${priorityPages.length}`);
    console.log(`   (страницы с динамическим контентом или документами)\n`);
    
    try {
        // Анализируем все страницы
        const pagesToAnalyze = pages;
        
        console.log(`\n📋 Анализ будет выполнен для всех ${pagesToAnalyze.length} страниц\n`);
        
        for (let i = 0; i < pagesToAnalyze.length; i++) {
            const pageInfo = pagesToAnalyze[i];
            console.log(`\n📄 Анализ страницы ${i + 1}/${pages.length}: ${pageInfo.title || pageInfo.slug}`);
            console.log('='.repeat(70));
            
            const pageResults = {
                slug: pageInfo.slug,
                url: pageInfo.url,
                title: pageInfo.title,
                section: pageInfo.section,
                nestedTabs: null,
                filesAndImages: null,
                missingElements: null
            };
            
            try {
                // 1. Проверка вложенных табов
                pageResults.nestedTabs = await checkNestedTabs(page, pageInfo.url, pageInfo.slug);
                if (pageResults.nestedTabs && pageResults.nestedTabs.nestedTabsFound) {
                    results.pagesWithNestedTabs.push({
                        slug: pageInfo.slug,
                        url: pageInfo.url,
                        title: pageInfo.title,
                        nestedTabs: pageResults.nestedTabs
                    });
                    results.summary.nestedTabsFound++;
                }
                
                // 2. Проверка файлов и изображений
                pageResults.filesAndImages = await checkFilesAndImages(page, pageInfo.url, pageInfo.slug);
                if (pageResults.filesAndImages) {
                    if (pageResults.filesAndImages.fromTabs && Object.keys(pageResults.filesAndImages.fromTabs).length > 0) {
                        results.pagesWithFilesInDynamic.push({
                            slug: pageInfo.slug,
                            url: pageInfo.url,
                            title: pageInfo.title,
                            files: pageResults.filesAndImages.fromTabs
                        });
                        results.summary.filesInDynamicFound += Object.values(pageResults.filesAndImages.fromTabs).reduce((sum, tab) => sum + (tab.files?.length || 0), 0);
                    }
                    
                    if (pageResults.filesAndImages.allFiles && pageResults.filesAndImages.allFiles.length > 0) {
                        results.allFiles.push(...pageResults.filesAndImages.allFiles.map(f => ({
                            ...f,
                            pageSlug: pageInfo.slug,
                            pageUrl: pageInfo.url
                        })));
                    }
                    
                    if (pageResults.filesAndImages.allImages && pageResults.filesAndImages.allImages.length > 0) {
                        results.allImages.push(...pageResults.filesAndImages.allImages.map(img => ({
                            ...img,
                            pageSlug: pageInfo.slug,
                            pageUrl: pageInfo.url
                        })));
                    }
                }
                
                // 3. Проверка пропущенных элементов
                pageResults.missingElements = await checkMissingDynamicElements(page, pageInfo.url, pageInfo.slug);
                if (pageResults.missingElements && pageResults.missingElements.selectors.length > 0) {
                    results.pagesWithMissingElements.push({
                        slug: pageInfo.slug,
                        url: pageInfo.url,
                        title: pageInfo.title,
                        missingElements: pageResults.missingElements
                    });
                    results.summary.missingElementsFound += pageResults.missingElements.selectors.length;
                }
                
                results.pagesAnalyzed++;
                
            } catch (pageError) {
                console.error(`   ❌ Ошибка при анализе страницы ${pageInfo.slug}: ${pageError.message}`);
            }
        }
        
    } finally {
        await browser.close();
    }
    
    // Сохраняем отчет
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let mdReport = '# Глубокий анализ всех страниц\n\n';
    mdReport += `**Дата анализа:** ${new Date().toLocaleString('ru-RU')}\n\n`;
    mdReport += `## Сводка\n\n`;
    mdReport += `- **Проанализировано страниц:** ${results.pagesAnalyzed}\n`;
    mdReport += `- **Страниц с вложенными табами:** ${results.summary.nestedTabsFound}\n`;
    mdReport += `- **Файлов в динамическом контенте:** ${results.summary.filesInDynamicFound}\n`;
    mdReport += `- **Изображений в динамическом контенте:** ${results.summary.imagesInDynamicFound}\n`;
    mdReport += `- **Страниц с пропущенными элементами:** ${results.pagesWithMissingElements.length}\n\n`;
    
    // Вложенные табы
    if (results.pagesWithNestedTabs.length > 0) {
        mdReport += `## Страницы с вложенными табами\n\n`;
        results.pagesWithNestedTabs.forEach(page => {
            mdReport += `### ${page.title} (${page.slug})\n\n`;
            mdReport += `- **URL:** ${page.url}\n`;
            mdReport += `- **Вложенные табы:**\n`;
            page.nestedTabs.nestedTabs.forEach(nested => {
                mdReport += `  - Таб "${nested.firstLevelText}": ${nested.nestedTabs.length} вложенных табов\n`;
            });
            mdReport += `\n`;
        });
    }
    
    // Файлы и изображения
    if (results.pagesWithFilesInDynamic.length > 0) {
        mdReport += `## Страницы с файлами в динамическом контенте\n\n`;
        results.pagesWithFilesInDynamic.slice(0, 20).forEach(page => {
            mdReport += `### ${page.title} (${page.slug})\n\n`;
            mdReport += `- **URL:** ${page.url}\n`;
            mdReport += `- **Файлы в табах:**\n`;
            Object.entries(page.files).forEach(([tabName, assets]) => {
                if (assets.files && assets.files.length > 0) {
                    mdReport += `  - Таб "${tabName}": ${assets.files.length} файлов\n`;
                }
            });
            mdReport += `\n`;
        });
    }
    
    // Пропущенные элементы
    if (results.pagesWithMissingElements.length > 0) {
        mdReport += `## Страницы с пропущенными динамическими элементами\n\n`;
        results.pagesWithMissingElements.slice(0, 20).forEach(page => {
            mdReport += `### ${page.title} (${page.slug})\n\n`;
            mdReport += `- **URL:** ${page.url}\n`;
            mdReport += `- **Пропущенные элементы:**\n`;
            page.missingElements.selectors.forEach(sel => {
                mdReport += `  - ${sel.type}: ${sel.count} элементов\n`;
            });
            mdReport += `\n`;
        });
    }
    
    // Файлы и изображения - список
    mdReport += `## Все найденные файлы (${results.allFiles.length})\n\n`;
    const uniqueFiles = new Map();
    results.allFiles.forEach(f => {
        const key = f.href || '';
        if (key && !uniqueFiles.has(key)) {
            uniqueFiles.set(key, f);
        }
    });
    mdReport += `Уникальных файлов: ${uniqueFiles.size}\n\n`;
    Array.from(uniqueFiles.values()).slice(0, 50).forEach(f => {
        mdReport += `- [${f.text || f.href}](${f.href}) (${f.type}, на странице ${f.pageSlug})\n`;
    });
    
    mdReport += `\n## Все найденные изображения (${results.allImages.length})\n\n`;
    const uniqueImages = new Map();
    results.allImages.forEach(img => {
        const key = img.src || '';
        if (key && !uniqueImages.has(key)) {
            uniqueImages.set(key, img);
        }
    });
    mdReport += `Уникальных изображений: ${uniqueImages.size}\n\n`;
    Array.from(uniqueImages.values()).slice(0, 50).forEach(img => {
        mdReport += `- ${img.alt || img.src} (${img.src}) (${img.type}, на странице ${img.pageSlug})\n`;
    });
    
    fs.writeFileSync(REPORT_FILE, mdReport, 'utf-8');
    
    // Выводим результаты в консоль
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ АНАЛИЗ ЗАВЕРШЕН');
    console.log('='.repeat(70));
    console.log(`\n📊 Результаты:`);
    console.log(`   - Проанализировано страниц: ${results.pagesAnalyzed}`);
    console.log(`   - Страниц с вложенными табами: ${results.summary.nestedTabsFound}`);
    console.log(`   - Файлов в динамическом контенте: ${results.summary.filesInDynamicFound}`);
    console.log(`   - Уникальных файлов: ${uniqueFiles.size}`);
    console.log(`   - Уникальных изображений: ${uniqueImages.size}`);
    console.log(`   - Страниц с пропущенными элементами: ${results.pagesWithMissingElements.length}`);
    
    if (results.pagesWithNestedTabs.length > 0) {
        console.log(`\n📋 Страницы с вложенными табами (${results.pagesWithNestedTabs.length}):\n`);
        results.pagesWithNestedTabs.slice(0, 10).forEach(page => {
            console.log(`   - ${page.title} (${page.slug})`);
            page.nestedTabs.nestedTabs.forEach(nested => {
                console.log(`     Таб "${nested.firstLevelText}": ${nested.nestedTabs.length} вложенных табов`);
            });
        });
    }
    
    console.log(`\n📄 Подробные отчеты сохранены:`);
    console.log(`   - JSON: ${OUTPUT_FILE}`);
    console.log(`   - Markdown: ${REPORT_FILE}`);
    console.log('='.repeat(70) + '\n');
    
    return results;
}

// Запускаем анализ
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { main, checkNestedTabs, checkFilesAndImages, checkMissingDynamicElements };
