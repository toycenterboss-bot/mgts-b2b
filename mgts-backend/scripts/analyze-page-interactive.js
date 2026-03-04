#!/usr/bin/env node

/**
 * Интерактивный анализ страниц с сайта business.mgts.ru
 * Использует Puppeteer для прокликивания элементов и детального анализа
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_DIR = path.join(process.cwd(), 'temp', 'page-analysis-interactive');

/**
 * Извлекает все ссылки на страницы
 */
function extractPageLinks(page) {
    return page.evaluate(() => {
        const links = [];
        const pageLinkPattern = /^\/([a-z_]+)(\/[a-z_]+)*(\/)?$/;
        
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                const cleanHref = href.split('#')[0].split('?')[0];
                if (pageLinkPattern.test(cleanHref) || cleanHref.startsWith('/')) {
                    links.push({
                        href: cleanHref,
                        text: link.textContent.trim(),
                        isExternal: href.startsWith('http'),
                        classes: Array.from(link.classList).join(' ')
                    });
                }
            }
        });
        
        return [...new Map(links.map(l => [l.href, l])).values()];
    });
}

/**
 * Извлекает все изображения
 */
function extractImages(page) {
    return page.evaluate(() => {
        const images = [];
        
        document.querySelectorAll('img[src]').forEach(img => {
            const src = img.getAttribute('src');
            const alt = img.getAttribute('alt') || '';
            const parent = img.parentElement;
            
            images.push({
                src: src,
                alt: alt,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                parentTag: parent ? parent.tagName.toLowerCase() : null,
                parentClasses: parent ? Array.from(parent.classList).join(' ') : null
            });
        });
        
        return images;
    });
}

/**
 * Извлекает все файлы (ссылки на документы)
 */
function extractFiles(page) {
    return page.evaluate(() => {
        const files = [];
        const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt'];
        const fileExtPattern = fileExtensions.join('|');
        const linkRegex = new RegExp(`\\.(${fileExtPattern})$`, 'i');
        
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && linkRegex.test(href)) {
                files.push({
                    href: href,
                    text: link.textContent.trim(),
                    filename: href.split('/').pop(),
                    extension: href.split('.').pop().toLowerCase(),
                    parentClasses: link.parentElement ? Array.from(link.parentElement.classList).join(' ') : null
                });
            }
        });
        
        return files;
    });
}

/**
 * Анализирует структуру секций страницы
 */
function analyzePageStructure(page) {
    return page.evaluate(() => {
        const sections = [];
        const sectionElements = document.querySelectorAll('section, main > div, article, .section, [class*="section"], [class*="content"], [class*="container"]');
        
        sectionElements.forEach((section, index) => {
            const classes = Array.from(section.classList).join(' ');
            const id = section.id || '';
            const tag = section.tagName.toLowerCase();
            const headings = Array.from(section.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map(h => ({ level: h.tagName, text: h.textContent.trim() }));
            
            // Определяем тип секции
            let sectionType = 'content';
            if (classes.includes('hero') || classes.includes('banner') || id.includes('hero')) {
                sectionType = 'hero';
            } else if (classes.includes('footer')) {
                sectionType = 'footer';
            } else if (classes.includes('header') || classes.includes('nav')) {
                sectionType = 'header';
            } else if (classes.includes('sidebar')) {
                sectionType = 'sidebar';
            } else if (classes.includes('form') || section.querySelector('form')) {
                sectionType = 'form';
            }
            
            sections.push({
                index: index,
                tag: tag,
                id: id,
                classes: classes,
                type: sectionType,
                headings: headings,
                hasImages: section.querySelectorAll('img').length > 0,
                hasLinks: section.querySelectorAll('a').length > 0,
                hasLists: section.querySelectorAll('ul, ol').length > 0,
                hasForms: section.querySelector('form') !== null,
                contentPreview: section.textContent.substring(0, 200).trim(),
                boundingBox: section.getBoundingClientRect()
            });
        });
        
        return sections;
    });
}

/**
 * Анализирует табы - прокликивает каждый таб и извлекает контент
 */
async function analyzeTabs(page) {
    const tabsData = await page.evaluate(() => {
        const tabs = [];
        const tabContainers = document.querySelectorAll('[class*="tab"], [class*="tabs"], .document-tabs, .service-tabs, .tabs-row-selection, .history-content');
        
        tabContainers.forEach((container, containerIdx) => {
            const tabButtons = container.querySelectorAll('[class*="tab-button"], [class*="tab-item"], [role="tab"], .tab-button-item, button[class*="tab"]');
            if (tabButtons.length > 0) {
                const tabData = {
                    containerIndex: containerIdx,
                    containerClasses: Array.from(container.classList).join(' '),
                    containerId: container.id || '',
                    tabsCount: tabButtons.length,
                    tabs: Array.from(tabButtons).map((tab, idx) => {
                        const rect = tab.getBoundingClientRect();
                        return {
                            index: idx,
                            text: tab.textContent.trim(),
                            classes: Array.from(tab.classList).join(' '),
                            id: tab.id || '',
                            isActive: tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true',
                            isVisible: rect.width > 0 && rect.height > 0,
                            selector: tab.id ? `#${tab.id}` : `.${Array.from(tab.classList)[0] || tab.tagName.toLowerCase()}`
                        };
                    })
                };
                tabs.push(tabData);
            }
        });
        
        return tabs;
    });
    
    // Прокликиваем каждый таб и извлекаем контент
    for (const tabGroup of tabsData) {
        for (const tab of tabGroup.tabs) {
            if (!tab.isVisible) continue;
            
            try {
                // Ищем элемент таба по селектору
                let tabElement = null;
                if (tab.id) {
                    tabElement = await page.$(`#${tab.id}`);
                } else if (tab.classes) {
                    // Пробуем найти по классам в контексте контейнера
                    const containerSelector = tabGroup.containerId ? `#${tabGroup.containerId}` : `.${tabGroup.containerClasses.split(' ')[0]}`;
                    const tabSelector = `.${tab.classes.split(' ')[0]}`;
                    tabElement = await page.$(`${containerSelector} ${tabSelector}:nth-of-type(${tab.index + 1})`);
                }
                
                if (tabElement) {
                    // Прокручиваем к элементу
                    await tabElement.scrollIntoView();
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Кликаем если не активен
                    if (!tab.isActive) {
                        await tabElement.click();
                        await new Promise(resolve => setTimeout(resolve, 500)); // Ждем загрузки контента
                    }
                    
                    // Извлекаем контент активного таба
                    const tabContent = await page.evaluate((containerIdx) => {
                            const containers = document.querySelectorAll('[class*="tab"], [class*="tabs"], .document-tabs, .service-tabs, .history-content, .files-list');
                            const container = containers[containerIdx];
                            if (container) {
                                // Ищем контент таба
                                const content = container.querySelector('[class*="content"], [class*="tab-content"], .history-content, .files-list, .content-box, [class*="data-content"]') || container;
                                return {
                                    html: content.innerHTML.substring(0, 5000),
                                    text: content.textContent.substring(0, 1000),
                                    images: Array.from(content.querySelectorAll('img')).map(img => ({
                                        src: img.src,
                                        alt: img.alt,
                                        naturalWidth: img.naturalWidth,
                                        naturalHeight: img.naturalHeight
                                    })),
                                    files: Array.from(content.querySelectorAll('a[href]')).filter(a => {
                                        const href = a.href;
                                        return /\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(href);
                                    }).map(a => ({
                                        href: a.href,
                                        text: a.textContent.trim(),
                                        filename: a.href.split('/').pop()
                                    })),
                                    links: Array.from(content.querySelectorAll('a[href]')).filter(a => {
                                        const href = a.href;
                                        return !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:');
                                    }).map(a => ({
                                        href: a.href,
                                        text: a.textContent.trim()
                                    }))
                                };
                            }
                            return null;
                        }, tabGroup.containerIndex);
                        
                        if (tabContent) {
                            tab.content = tabContent;
                        }
                }
            } catch (error) {
                console.warn(`⚠️  Ошибка при клике на таб "${tab.text}": ${error.message}`);
            }
        }
    }
    
    return tabsData;
}

/**
 * Анализирует аккордеоны - открывает каждый и извлекает контент
 */
async function analyzeAccordions(page) {
    const accordionsData = await page.evaluate(() => {
        const accordions = [];
        const accordionContainers = document.querySelectorAll('[class*="accordion"], [class*="collapse"], [aria-expanded], [data-toggle="collapse"]');
        
        accordionContainers.forEach((container, idx) => {
            accordions.push({
                index: idx,
                classes: Array.from(container.classList).join(' '),
                heading: container.querySelector('h2, h3, h4, [class*="heading"], [class*="title"], button')?.textContent.trim() || '',
                isExpanded: container.classList.contains('show') || container.getAttribute('aria-expanded') === 'true',
                selector: container.className || container.tagName
            });
        });
        
        return accordions;
    });
    
    // Открываем каждый аккордеон и извлекаем контент
    for (const accordion of accordionsData) {
        try {
            if (!accordion.isExpanded) {
                // Ищем кнопку или элемент для открытия
                const button = await page.$(`[data-toggle="collapse"][data-target*="${accordion.index}"], [aria-controls*="${accordion.index}"]`);
                if (button) {
                    await button.click();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            // Извлекаем контент
            const content = await page.evaluate((accIndex) => {
                const containers = document.querySelectorAll('[class*="accordion"], [class*="collapse"]');
                const container = containers[accIndex];
                if (container) {
                    return {
                        html: container.innerHTML.substring(0, 2000),
                        text: container.textContent.substring(0, 500),
                        images: Array.from(container.querySelectorAll('img')).map(img => ({
                            src: img.src,
                            alt: img.alt
                        })),
                        files: Array.from(container.querySelectorAll('a[href]')).filter(a => {
                            const href = a.href;
                            return /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(href);
                        }).map(a => ({
                            href: a.href,
                            text: a.textContent.trim()
                        }))
                    };
                }
                return null;
            }, accordion.index);
            
            if (content) {
                accordion.content = content;
            }
        } catch (error) {
            console.warn(`⚠️  Ошибка при открытии аккордеона ${accordion.heading}: ${error.message}`);
        }
    }
    
    return accordionsData;
}

/**
 * Извлекает мета-информацию
 */
function extractMetadata(page) {
    return page.evaluate(() => {
        return {
            title: document.querySelector('title')?.textContent.trim() || '',
            metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            metaKeywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
            h1: document.querySelector('h1')?.textContent.trim() || '',
            url: window.location.href,
            pathname: window.location.pathname
        };
    });
}

/**
 * Делает скриншот страницы
 */
async function takeScreenshot(page, slug, outputDir) {
    const screenshotPath = path.join(outputDir, `${slug}_screenshot.png`);
    await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        waitForLoadState: 'networkidle'
    });
    return screenshotPath;
}

/**
 * Создает структурированное ТЗ
 */
function createTechnicalSpec(slug, analysisResult, screenshotPath) {
    const spec = {
        page: {
            slug: slug,
            url: analysisResult.metadata.url,
            pathname: analysisResult.metadata.pathname,
            analyzedAt: new Date().toISOString(),
            screenshot: screenshotPath
        },
        metadata: analysisResult.metadata,
        structure: {
            sections: analysisResult.sections,
            summary: {
                totalSections: analysisResult.sections.length,
                heroSections: analysisResult.sections.filter(s => s.type === 'hero').length,
                contentSections: analysisResult.sections.filter(s => s.type === 'content').length,
                forms: analysisResult.sections.filter(s => s.type === 'form').length
            }
        },
        content: {
            images: {
                total: analysisResult.images.length,
                list: analysisResult.images
            },
            files: {
                total: analysisResult.files.length,
                list: analysisResult.files
            },
            links: {
                total: analysisResult.links.length,
                internal: analysisResult.links.filter(l => !l.isExternal).length,
                external: analysisResult.links.filter(l => l.isExternal).length,
                list: analysisResult.links
            }
        },
        dynamic: {
            tabs: analysisResult.tabs,
            accordions: analysisResult.accordions
        },
        recommendations: generateRecommendations(analysisResult)
    };
    
    return spec;
}

/**
 * Генерирует рекомендации на основе анализа
 */
function generateRecommendations(analysisResult) {
    const recommendations = [];
    
    if (analysisResult.sections && analysisResult.sections.filter(s => s.type === 'hero').length === 0) {
        recommendations.push('Добавить hero-секцию с заголовком и описанием');
    }
    
    if (analysisResult.dynamic && analysisResult.dynamic.tabs && analysisResult.dynamic.tabs.length > 0) {
        recommendations.push(`Использовать компонент document-tabs или service-tabs (найдено ${analysisResult.dynamic.tabs.length} групп табов)`);
    }
    
    if (analysisResult.dynamic && analysisResult.dynamic.accordions && analysisResult.dynamic.accordions.length > 0) {
        recommendations.push(`Использовать компонент accordion (найдено ${analysisResult.dynamic.accordions.length} аккордеонов)`);
    }
    
    if (analysisResult.files && analysisResult.files.length > 0) {
        recommendations.push(`Использовать компонент files-table для отображения ${analysisResult.files.length} файлов`);
    }
    
    if (analysisResult.sections && analysisResult.sections.filter(s => s.type === 'form').length > 0) {
        recommendations.push('Проверить наличие формы заказа/обратной связи - использовать компонент service-order-form');
    }
    
    return recommendations;
}

/**
 * Главная функция
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Использование: node analyze-page-interactive.js <slug> [output-dir]');
        console.error('Пример: node analyze-page-interactive.js about_mgts');
        console.error('Пример: node analyze-page-interactive.js corporate_documents');
        process.exit(1);
    }
    
    const slug = args[0];
    const outputDir = args[1] ? path.resolve(args[1]) : OUTPUT_DIR;
    const pageUrl = `${BASE_URL}/${slug}`;
    
    // Создаем директорию для вывода
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 ИНТЕРАКТИВНЫЙ АНАЛИЗ СТРАНИЦЫ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 Slug: ${slug}`);
    console.log(`🌐 URL: ${pageUrl}`);
    console.log(`📁 Вывод: ${outputDir}`);
    console.log('');
    
    let browser;
    try {
        console.log('🚀 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: 'new', // Используем headless режим для стабильности
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`📥 Загрузка страницы: ${pageUrl}`);
        await page.goto(pageUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Ждем полной загрузки
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 Анализ содержимого...');
        
        // Извлекаем метаданные
        const metadata = await extractMetadata(page);
        console.log(`   ✓ Метаданные: ${metadata.title}`);
        
        // Анализируем структуру
        const sections = await analyzePageStructure(page);
        console.log(`   ✓ Секций: ${sections.length}`);
        
        // Извлекаем изображения
        const images = await extractImages(page);
        console.log(`   ✓ Изображений: ${images.length}`);
        
        // Извлекаем файлы
        const files = await extractFiles(page);
        console.log(`   ✓ Файлов: ${files.length}`);
        
        // Извлекаем ссылки
        const links = await extractPageLinks(page);
        console.log(`   ✓ Ссылок: ${links.length}`);
        
        // Анализируем табы
        console.log('   🔄 Анализ табов...');
        const tabs = await analyzeTabs(page);
        console.log(`   ✓ Групп табов: ${tabs.length}`);
        
        // Анализируем аккордеоны
        console.log('   🔄 Анализ аккордеонов...');
        const accordions = await analyzeAccordions(page);
        console.log(`   ✓ Аккордеонов: ${accordions.length}`);
        
        // Делаем скриншот
        console.log('   📸 Создание скриншота...');
        const screenshotPath = await takeScreenshot(page, slug, outputDir);
        console.log(`   ✓ Скриншот: ${screenshotPath}`);
        
        const analysisResult = {
            metadata,
            sections,
            images,
            files,
            links,
            tabs,
            accordions
        };
        
        // Создаем ТЗ
        const spec = createTechnicalSpec(slug, analysisResult, screenshotPath);
        
        // Сохраняем результат
        const outputPath = path.join(outputDir, `${slug}_spec.json`);
        fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
        
        // Выводим краткий отчет
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📄 Страница: ${spec.metadata.title || slug}`);
        console.log(`📝 H1: ${spec.metadata.h1 || 'не найден'}`);
        console.log(`📋 Секций: ${spec.structure.summary.totalSections}`);
        console.log(`🖼️  Изображений: ${spec.content.images.total}`);
        console.log(`📎 Файлов: ${spec.content.files.total}`);
        console.log(`🔗 Ссылок: ${spec.content.links.total} (внутренних: ${spec.content.links.internal}, внешних: ${spec.content.links.external})`);
        console.log(`📑 Групп табов: ${spec.dynamic.tabs.length}`);
        console.log(`📂 Аккордеонов: ${spec.dynamic.accordions.length}`);
        console.log('');
        console.log('💡 Рекомендации:');
        spec.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
        console.log('');
        console.log(`✅ ТЗ сохранено: ${outputPath}`);
        console.log(`📸 Скриншот: ${screenshotPath}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});
