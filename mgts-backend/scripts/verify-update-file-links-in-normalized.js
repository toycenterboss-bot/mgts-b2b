/**
 * Проверка и обновление ссылок на файлы в нормализованном HTML
 * Убеждаемся, что ссылки на файлы корректны для Strapi Media Library
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PAGES_NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/file-links-verification-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/FILE_LINKS_VERIFICATION_REPORT.md');

// Паттерны для определения типов файлов
const FILE_EXTENSIONS = {
    pdf: /\.pdf$/i,
    doc: /\.(doc|docx)$/i,
    xls: /\.(xls|xlsx)$/i,
    zip: /\.(zip|rar|7z)$/i,
    image: /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i
};

// Структура папок в Strapi Media Library
const STRAPI_MEDIA_STRUCTURE = {
    // Файлы из /static/files/ будут в Strapi Media Library
    // Структура: /uploads/file-name-hash.ext или /uploads/folder/file-name.ext
    basePath: '/uploads',
    folders: {
        'corporate-documents': 'corporate-documents',
        'form_doc': 'form-documents',
        'partner': 'partner-documents',
        'lks_kr': 'partner-documents',
        'form_doc': 'form-documents'
    }
};

/**
 * Извлечь все ссылки на файлы из HTML
 */
function extractFileLinks(html, pageSlug) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const links = [];
    
    // Ищем все ссылки на файлы
    const anchorLinks = Array.from(document.querySelectorAll('a[href]'));
    anchorLinks.forEach(link => {
                const href = link.getAttribute('href');
        if (href && /\.(pdf|doc|docx|xls|xlsx|zip|rar|7z|jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(href)) {
            // Проверяем, является ли это ссылкой на старый сайт
            const isOldSiteLink = href.includes('business.mgts.ru') || href.includes('/static/files/');
            // Проверяем, совместима ли с Strapi (должна быть /uploads/... или относительный путь)
            const isStrapiCompatible = href.startsWith('/uploads/') || 
                                       (href.startsWith('/') && !href.startsWith('//') && !href.includes('business.mgts.ru'));
            
            links.push({
                type: 'link',
                href: href,
                text: link.textContent.trim(),
                isAbsolute: href.startsWith('http://') || href.startsWith('https://'),
                isRelative: href.startsWith('/') && !href.startsWith('//') && !href.startsWith('http'),
                isOldSiteLink: isOldSiteLink,
                isStrapiCompatible: isStrapiCompatible,
                needsUpdate: isOldSiteLink || (!isStrapiCompatible && !href.startsWith('//') && !href.startsWith('data:'))
            });
        }
    });
    
    // Ищем все изображения
    const images = Array.from(document.querySelectorAll('img[src]'));
    images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
            const isImage = /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(src);
            if (isImage) {
                // Проверяем, является ли это ссылкой на старый сайт
                const isOldSiteLink = src.includes('business.mgts.ru');
                // Проверяем, совместима ли с Strapi
                const isStrapiCompatible = src.startsWith('/uploads/') || 
                                          src.startsWith('/images/') || 
                                          (src.startsWith('/') && !src.startsWith('//') && !src.includes('business.mgts.ru'));
                
                links.push({
                    type: 'image',
                    href: src,
                    alt: img.getAttribute('alt') || '',
                    isAbsolute: src.startsWith('http://') || src.startsWith('https://'),
                    isRelative: src.startsWith('/') && !src.startsWith('//') && !src.startsWith('http'),
                    isOldSiteLink: isOldSiteLink,
                    isStrapiCompatible: isStrapiCompatible,
                    needsUpdate: isOldSiteLink || (!isStrapiCompatible && !src.startsWith('//') && !src.startsWith('data:'))
                });
            }
        }
    });
    
    return links;
}

/**
 * Определить правильный путь для файла в Strapi Media Library
 */
function getStrapiFilePath(originalPath, pageSlug) {
    // Если это уже путь Strapi, возвращаем как есть
    if (originalPath.startsWith('/uploads/') || originalPath.startsWith('/images/')) {
        return originalPath;
    }
    
    // Если это data: URL или //, возвращаем как есть
    if (originalPath.startsWith('data:') || originalPath.startsWith('//')) {
        return originalPath;
    }
    
    // Удаляем домен из абсолютного URL старого сайта
    let cleanPath = originalPath;
    if (originalPath.includes('business.mgts.ru')) {
        // Извлекаем путь после домена
        const match = originalPath.match(/https?:\/\/[^\/]+(\/.*)/);
        if (match) {
            cleanPath = match[1];
        }
    }
    
    // Извлекаем имя файла
    const fileName = path.basename(cleanPath);
    
    // Определяем папку на основе оригинального пути
    let folder = '';
    
    if (cleanPath.includes('/corporate-documents/') || cleanPath.includes('/corporate_documents/')) {
        folder = 'corporate-documents';
    } else if (cleanPath.includes('/form_doc/') || cleanPath.includes('/form-doc/')) {
        folder = 'form-documents';
    } else if (cleanPath.includes('/partner/')) {
        // Может быть /partner/lks_kr/ или /partner/documents/
        if (cleanPath.includes('/lks_kr/')) {
            folder = 'partner-documents';
        } else if (cleanPath.includes('/documents/')) {
            folder = 'partner-documents';
        } else {
            folder = 'partner-documents';
        }
    } else if (cleanPath.includes('/lks_kr/')) {
        folder = 'partner-documents';
    } else if (cleanPath.includes('/static/files/')) {
        // Извлекаем подпапку из пути /static/files/folder/file.ext
        const match = cleanPath.match(/\/static\/files\/([^\/]+)/);
        if (match) {
            folder = match[1].replace(/_/g, '-');
        }
    } else if (cleanPath.startsWith('/images/')) {
        // Изображения из /images/ остаются в /images/
        return cleanPath;
    }
    
    // Формируем путь для Strapi Media Library
    if (folder) {
        return `/uploads/${folder}/${fileName}`;
    } else {
        // Если папка не определена, используем общую папку uploads
        return `/uploads/${fileName}`;
    }
}

/**
 * Обновить ссылки в HTML на правильные пути Strapi
 */
function updateFileLinksInHTML(html, pageSlug, fileLinksMap) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    let updatedCount = 0;
    
    // Обновляем ссылки на файлы
    const anchorLinks = Array.from(document.querySelectorAll('a[href]'));
    anchorLinks.forEach(link => {
        const originalHref = link.getAttribute('href');
        if (originalHref && fileLinksMap[originalHref]) {
            const newHref = fileLinksMap[originalHref];
            link.setAttribute('href', newHref);
            updatedCount++;
        }
    });
    
    // Обновляем изображения
    const images = Array.from(document.querySelectorAll('img[src]'));
    images.forEach(img => {
        const originalSrc = img.getAttribute('src');
        if (originalSrc && fileLinksMap[originalSrc]) {
            const newSrc = fileLinksMap[originalSrc];
            img.setAttribute('src', newSrc);
            updatedCount++;
        }
    });
    
    return {
        updatedHTML: document.body ? document.body.innerHTML : document.documentElement.outerHTML,
        updatedCount: updatedCount
    };
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔍 ПРОВЕРКА И ОБНОВЛЕНИЕ ССЫЛОК НА ФАЙЛЫ В НОРМАЛИЗОВАННОМ HTML\n');
    console.log('='.repeat(70));
    
    if (!fs.existsSync(PAGES_NORMALIZED_DIR)) {
        console.error(`❌ Директория нормализованных страниц не найдена: ${PAGES_NORMALIZED_DIR}`);
        process.exit(1);
    }
    
    const files = fs.readdirSync(PAGES_NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
        console.error('❌ Нормализованные файлы не найдены');
        process.exit(1);
    }
    
    console.log(`\n📋 Найдено нормализованных страниц: ${files.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        pagesProcessed: 0,
        totalLinksFound: 0,
        totalLinksNeedingUpdate: 0,
        totalLinksUpdated: 0,
        pages: [],
        summary: {
            allFileLinks: [],
            linksByType: {
                pdf: 0,
                doc: 0,
                xls: 0,
                zip: 0,
                image: 0,
                other: 0
            },
            linksByStatus: {
                valid: 0,
                needsUpdate: 0,
                absolute: 0,
                relative: 0
            }
        }
    };
    
    for (const file of files) {
        const filePath = path.join(PAGES_NORMALIZED_DIR, file);
        const slug = file.replace('.json', '');
        
        try {
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            if (!pageData.content || !pageData.content.html) {
                console.log(`⚠️  Пропущена страница ${slug}: нет HTML контента`);
                continue;
            }
            
            console.log(`📄 Обработка: ${slug}`);
            
            const html = pageData.content.html;
            const fileLinks = extractFileLinks(html, slug);
            
            if (fileLinks.length === 0) {
                console.log(`   ✅ Ссылки на файлы не найдены\n`);
                results.pagesProcessed++;
                continue;
            }
            
            console.log(`   📋 Найдено ссылок: ${fileLinks.length}`);
            
            const pageResult = {
                slug: slug,
                title: pageData.title || '',
                linksFound: fileLinks.length,
                linksNeedingUpdate: 0,
                linksUpdated: 0,
                links: [],
                updated: false
            };
            
            // Анализируем каждую ссылку
            const fileLinksMap = {};
            let needsUpdate = false;
            
            fileLinks.forEach(link => {
                const linkInfo = {
                    type: link.type,
                    original: link.href,
                    text: link.text || link.alt || '',
                    status: 'valid',
                    newPath: null,
                    needsUpdate: link.needsUpdate,
                    fileExtension: path.extname(link.href).toLowerCase().replace('.', ''),
                    isAbsolute: link.isAbsolute,
                    isRelative: link.isRelative,
                    isStrapiCompatible: link.isStrapiCompatible
                };
                
                // Определяем тип файла
                if (FILE_EXTENSIONS.pdf.test(link.href)) {
                    results.summary.linksByType.pdf++;
                    linkInfo.fileType = 'pdf';
                } else if (FILE_EXTENSIONS.doc.test(link.href)) {
                    results.summary.linksByType.doc++;
                    linkInfo.fileType = 'doc';
                } else if (FILE_EXTENSIONS.xls.test(link.href)) {
                    results.summary.linksByType.xls++;
                    linkInfo.fileType = 'xls';
                } else if (FILE_EXTENSIONS.zip.test(link.href)) {
                    results.summary.linksByType.zip++;
                    linkInfo.fileType = 'zip';
                } else if (FILE_EXTENSIONS.image.test(link.href)) {
                    results.summary.linksByType.image++;
                    linkInfo.fileType = 'image';
                } else {
                    results.summary.linksByType.other++;
                    linkInfo.fileType = 'other';
                }
                
                // Проверяем, нужно ли обновление
                if (link.needsUpdate) {
                    linkInfo.status = 'needs_update';
                    linkInfo.newPath = getStrapiFilePath(link.href, slug);
                    fileLinksMap[link.href] = linkInfo.newPath;
                    needsUpdate = true;
                    pageResult.linksNeedingUpdate++;
                    results.summary.linksByStatus.needsUpdate++;
                } else if (link.isAbsolute) {
                    linkInfo.status = 'absolute';
                    results.summary.linksByStatus.absolute++;
                } else if (link.isStrapiCompatible) {
                    linkInfo.status = 'valid';
                    results.summary.linksByStatus.valid++;
                } else {
                    linkInfo.status = 'relative';
                    results.summary.linksByStatus.relative++;
                }
                
                pageResult.links.push(linkInfo);
                results.summary.allFileLinks.push({
                    ...linkInfo,
                    pageSlug: slug
                });
            });
            
            results.totalLinksFound += fileLinks.length;
            results.totalLinksNeedingUpdate += pageResult.linksNeedingUpdate;
            
            // Обновляем HTML если нужно
            if (needsUpdate && Object.keys(fileLinksMap).length > 0) {
                console.log(`   🔄 Обновление ${Object.keys(fileLinksMap).length} ссылок...`);
                
                const updateResult = updateFileLinksInHTML(html, slug, fileLinksMap);
                
                if (updateResult.updatedCount > 0) {
                    pageData.content.html = updateResult.updatedHTML;
                    
                    // Сохраняем обновленный файл
                    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
                    
                    pageResult.linksUpdated = updateResult.updatedCount;
                    pageResult.updated = true;
                    results.totalLinksUpdated += updateResult.updatedCount;
                    
                    console.log(`   ✅ Обновлено ${updateResult.updatedCount} ссылок\n`);
                } else {
                    console.log(`   ⚠️  Ссылки не были обновлены\n`);
                }
            } else {
                console.log(`   ✅ Все ссылки корректны\n`);
            }
            
            results.pages.push(pageResult);
            results.pagesProcessed++;
            
        } catch (error) {
            console.error(`   ❌ Ошибка при обработке ${slug}: ${error.message}\n`);
        }
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let mdReport = '# Проверка и обновление ссылок на файлы в нормализованном HTML\n\n';
    mdReport += `**Дата проверки:** ${new Date().toLocaleString('ru-RU')}\n\n`;
    mdReport += `## Сводка\n\n`;
    mdReport += `- **Обработано страниц:** ${results.pagesProcessed}\n`;
    mdReport += `- **Всего ссылок найдено:** ${results.totalLinksFound}\n`;
    mdReport += `- **Ссылок требуется обновление:** ${results.totalLinksNeedingUpdate}\n`;
    mdReport += `- **Ссылок обновлено:** ${results.totalLinksUpdated}\n\n`;
    
    mdReport += `### Статистика по типам файлов\n\n`;
    mdReport += `- PDF: ${results.summary.linksByType.pdf}\n`;
    mdReport += `- DOC/DOCX: ${results.summary.linksByType.doc}\n`;
    mdReport += `- XLS/XLSX: ${results.summary.linksByType.xls}\n`;
    mdReport += `- ZIP/RAR: ${results.summary.linksByType.zip}\n`;
    mdReport += `- Изображения: ${results.summary.linksByType.image}\n`;
    mdReport += `- Другие: ${results.summary.linksByType.other}\n\n`;
    
    mdReport += `### Статистика по статусу ссылок\n\n`;
    mdReport += `- Корректные (Strapi-совместимые): ${results.summary.linksByStatus.valid}\n`;
    mdReport += `- Требуют обновления: ${results.summary.linksByStatus.needsUpdate}\n`;
    mdReport += `- Абсолютные URL: ${results.summary.linksByStatus.absolute}\n`;
    mdReport += `- Относительные пути: ${results.summary.linksByStatus.relative}\n\n`;
    
    // Страницы с проблемными ссылками
    const pagesWithIssues = results.pages.filter(p => p.linksNeedingUpdate > 0);
    if (pagesWithIssues.length > 0) {
        mdReport += `## Страницы с обновленными ссылками (${pagesWithIssues.length})\n\n`;
        pagesWithIssues.slice(0, 30).forEach(page => {
            mdReport += `### ${page.title || page.slug}\n\n`;
            mdReport += `- **Slug:** ${page.slug}\n`;
            mdReport += `- **Всего ссылок:** ${page.linksFound}\n`;
            mdReport += `- **Обновлено:** ${page.linksUpdated}\n\n`;
            mdReport += `Примеры обновленных ссылок:\n`;
            page.links.filter(l => l.needsUpdate && l.newPath).slice(0, 5).forEach(link => {
                mdReport += `- \`${link.original}\` → \`${link.newPath}\`\n`;
            });
            mdReport += `\n`;
        });
    }
    
    // Все уникальные файлы
    const uniqueFiles = new Map();
    results.summary.allFileLinks.forEach(link => {
        const key = link.original;
        if (!uniqueFiles.has(key)) {
            uniqueFiles.set(key, {
                original: link.original,
                newPath: link.newPath,
                fileType: link.fileType,
                pages: []
            });
        }
        uniqueFiles.get(key).pages.push(link.pageSlug);
    });
    
    mdReport += `## Все уникальные файлы (${uniqueFiles.size})\n\n`;
    mdReport += `### Файлы, требующие обновления путей\n\n`;
    Array.from(uniqueFiles.values())
        .filter(f => f.newPath)
        .slice(0, 100)
        .forEach(file => {
            mdReport += `- **${file.original}** → \`${file.newPath}\` (${file.fileType}, на страницах: ${file.pages.slice(0, 3).join(', ')}${file.pages.length > 3 ? '...' : ''})\n`;
        });
    
    fs.writeFileSync(MD_REPORT_FILE, mdReport, 'utf-8');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА');
    console.log('='.repeat(70));
    console.log(`\n📊 Результаты:`);
    console.log(`   - Обработано страниц: ${results.pagesProcessed}`);
    console.log(`   - Всего ссылок найдено: ${results.totalLinksFound}`);
    console.log(`   - Ссылок требуется обновление: ${results.totalLinksNeedingUpdate}`);
    console.log(`   - Ссылок обновлено: ${results.totalLinksUpdated}`);
    console.log(`\n📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${MD_REPORT_FILE}`);
    console.log('='.repeat(70) + '\n');
    
    return results;
}

// Запускаем проверку
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { main, extractFileLinks, getStrapiFilePath, updateFileLinksInHTML };
