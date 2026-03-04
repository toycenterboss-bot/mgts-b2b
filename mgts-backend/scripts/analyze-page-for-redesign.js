#!/usr/bin/env node

/**
 * Скрипт для глубокого анализа старой HTML страницы
 * Создает детальное техническое задание для верстки новой страницы
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

/**
 * Извлекает все ссылки на страницы
 */
function extractPageLinks(doc, basePath) {
    const links = [];
    const pageLinkPattern = /^\/([a-z_]+)(\/[a-z_]+)*(\/)?$/;
    
    doc.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            const cleanHref = href.split('#')[0].split('?')[0];
            if (pageLinkPattern.test(cleanHref) || cleanHref.startsWith('/')) {
                links.push({
                    href: cleanHref,
                    text: link.textContent.trim(),
                    isExternal: href.startsWith('http'),
                    fullElement: link.outerHTML.substring(0, 200)
                });
            }
        }
    });
    
    return [...new Map(links.map(l => [l.href, l])).values()]; // Уникальные ссылки
}

/**
 * Извлекает все изображения
 */
function extractImages(doc) {
    const images = [];
    
    doc.querySelectorAll('img[src]').forEach(img => {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        const parent = img.parentElement;
        
        images.push({
            src: src,
            alt: alt,
            parentTag: parent ? parent.tagName.toLowerCase() : null,
            parentClasses: parent ? Array.from(parent.classList).join(' ') : null,
            context: img.outerHTML.substring(0, 200)
        });
    });
    
    return images;
}

/**
 * Извлекает все файлы (ссылки на документы)
 */
function extractFiles(doc) {
    const files = [];
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt'];
    const fileExtPattern = fileExtensions.join('|');
    const linkRegex = new RegExp(`\\.(${fileExtPattern})$`, 'i');
    
    doc.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && linkRegex.test(href)) {
            files.push({
                href: href,
                text: link.textContent.trim(),
                filename: path.basename(href),
                extension: path.extname(href).substring(1),
                parentClasses: link.parentElement ? Array.from(link.parentElement.classList).join(' ') : null,
                context: link.outerHTML.substring(0, 300)
            });
        }
    });
    
    return files;
}

/**
 * Анализирует структуру секций страницы
 */
function analyzePageStructure(doc) {
    const sections = [];
    const sectionElements = doc.querySelectorAll('section, main > div, article, .section, [class*="section"], [class*="content"], [class*="container"]');
    
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
            contentPreview: section.textContent.substring(0, 200).trim()
        });
    });
    
    return sections;
}

/**
 * Анализирует динамические элементы (табы, аккордеоны, карусели)
 */
function analyzeDynamicElements(doc) {
    const dynamic = {
        tabs: [],
        accordions: [],
        carousels: [],
        modals: []
    };
    
    // Поиск табов
    const tabContainers = doc.querySelectorAll('[class*="tab"], [class*="tabs"], .document-tabs, .service-tabs');
    tabContainers.forEach(container => {
        const tabs = container.querySelectorAll('[class*="tab-button"], [class*="tab-item"], [role="tab"]');
        if (tabs.length > 0) {
            const tabData = {
                containerClasses: Array.from(container.classList).join(' '),
                tabsCount: tabs.length,
                tabs: Array.from(tabs).map(tab => ({
                    text: tab.textContent.trim(),
                    classes: Array.from(tab.classList).join(' '),
                    isActive: tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true'
                })),
                content: container.innerHTML.substring(0, 500)
            };
            dynamic.tabs.push(tabData);
        }
    });
    
    // Поиск аккордеонов
    const accordionContainers = doc.querySelectorAll('[class*="accordion"], [class*="collapse"], [aria-expanded]');
    accordionContainers.forEach(container => {
        if (container.getAttribute('aria-expanded') || container.classList.contains('accordion')) {
            dynamic.accordions.push({
                classes: Array.from(container.classList).join(' '),
                heading: container.querySelector('h2, h3, h4, [class*="heading"], [class*="title"]')?.textContent.trim() || '',
                content: container.innerHTML.substring(0, 500)
            });
        }
    });
    
    return dynamic;
}

/**
 * Извлекает мета-информацию
 */
function extractMetadata(doc) {
    const title = doc.querySelector('title')?.textContent.trim() || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const metaKeywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
    const h1 = doc.querySelector('h1')?.textContent.trim() || '';
    
    return {
        title: title,
        metaDescription: metaDescription,
        metaKeywords: metaKeywords,
        h1: h1
    };
}

/**
 * Создает структурированное ТЗ
 */
function createTechnicalSpec(htmlPath, analysisResult) {
    const slug = path.basename(path.dirname(htmlPath));
    const spec = {
        page: {
            slug: slug,
            originalPath: htmlPath,
            analyzedAt: new Date().toISOString()
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
        dynamic: analysisResult.dynamic,
        recommendations: generateRecommendations(analysisResult)
    };
    
    return spec;
}

/**
 * Генерирует рекомендации на основе анализа
 */
function generateRecommendations(analysisResult) {
    const recommendations = [];
    
    if (analysisResult.sections.filter(s => s.type === 'hero').length === 0) {
        recommendations.push('Добавить hero-секцию с заголовком и описанием');
    }
    
    if (analysisResult.dynamic.tabs.length > 0) {
        recommendations.push(`Использовать компонент document-tabs или service-tabs (найдено ${analysisResult.dynamic.tabs.length} групп табов)`);
    }
    
    if (analysisResult.dynamic.accordions.length > 0) {
        recommendations.push(`Использовать компонент accordion (найдено ${analysisResult.dynamic.accordions.length} аккордеонов)`);
    }
    
    if (analysisResult.files.length > 0) {
        recommendations.push(`Использовать компонент files-table для отображения ${analysisResult.files.length} файлов`);
    }
    
    if (analysisResult.sections.filter(s => s.type === 'form').length > 0) {
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
        console.error('Использование: node analyze-page-for-redesign.js <path-to-html-file> [output-dir]');
        console.error('Пример: node analyze-page-for-redesign.js SiteMGTS/about_mgts/corporate_documents/index.html');
        process.exit(1);
    }
    
    const htmlPath = path.resolve(args[0]);
    const outputDir = args[1] ? path.resolve(args[1]) : path.join(process.cwd(), 'temp', 'page-analysis');
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`❌ Файл не найден: ${htmlPath}`);
        process.exit(1);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 АНАЛИЗ СТРАНИЦЫ ДЛЯ РЕДИЗАЙНА');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 Файл: ${htmlPath}`);
    console.log(`📁 Вывод: ${outputDir}`);
    console.log('');
    
    // Создаем директорию для вывода
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Читаем HTML
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;
    
    console.log('🔍 Анализ содержимого...');
    
    // Выполняем анализ
    const metadata = extractMetadata(doc);
    const sections = analyzePageStructure(doc);
    const images = extractImages(doc);
    const files = extractFiles(doc);
    const links = extractPageLinks(doc, htmlPath);
    const dynamic = analyzeDynamicElements(doc);
    
    const analysisResult = {
        metadata,
        sections,
        images,
        files,
        links,
        dynamic
    };
    
    // Создаем ТЗ
    const spec = createTechnicalSpec(htmlPath, analysisResult);
    
    // Сохраняем результат
    const slug = spec.page.slug || path.basename(htmlPath, '.html');
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
    console.log(`📑 Табов: ${spec.dynamic.tabs.length}`);
    console.log(`📂 Аккордеонов: ${spec.dynamic.accordions.length}`);
    console.log('');
    console.log('💡 Рекомендации:');
    spec.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
    });
    console.log('');
    console.log(`✅ ТЗ сохранено: ${outputPath}`);
    console.log('');
}

main().catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
});
