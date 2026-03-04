/**
 * Скрипт для анализа файлов и медиа на старом сайте
 * Находит все ссылки на файлы (PDF, DOCX, XLSX и т.д.) и изображения
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/files-to-migrate.json');
const REPORT_FILE = path.join(__dirname, '../../docs/FILES_TO_MIGRATE_REPORT.md');

/**
 * Извлечь все ссылки на файлы из HTML
 */
function extractFileLinks(html, pageSlug) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const files = [];
    
    // Ищем все ссылки на файлы
    const links = doc.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Проверяем, является ли это файлом
        const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.txt'];
        const isFile = fileExtensions.some(ext => href.toLowerCase().endsWith(ext));
        
        if (isFile) {
            const absoluteUrl = href.startsWith('http') ? href : `https://business.mgts.ru${href.startsWith('/') ? '' : '/'}${href}`;
            files.push({
                url: absoluteUrl,
                relativePath: href,
                filename: path.basename(href),
                extension: path.extname(href).toLowerCase(),
                linkText: link.textContent?.trim() || '',
                pageSlug: pageSlug
            });
        }
    });
    
    return files;
}

/**
 * Извлечь все изображения из HTML
 */
function extractImages(html, pageSlug) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const images = [];
    
    // Ищем все изображения
    const imgTags = doc.querySelectorAll('img[src]');
    imgTags.forEach(img => {
        const src = img.getAttribute('src');
        if (!src) return;
        
        // Пропускаем data: URLs и внешние ссылки
        if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
            if (!src.includes('business.mgts.ru')) return;
        }
        
        const absoluteUrl = src.startsWith('http') 
            ? src 
            : `https://business.mgts.ru${src.startsWith('/') ? '' : '/'}${src}`;
        
        images.push({
            url: absoluteUrl,
            relativePath: src,
            filename: path.basename(src.split('?')[0]),
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || '',
            pageSlug: pageSlug
        });
    });
    
    return images;
}

/**
 * Определить тип файла (публичный/приватный)
 */
function determineFileType(file) {
    // Простая эвристика: если в URL есть "private", "secure", "internal" - приватный
    const urlLower = file.url.toLowerCase();
    if (urlLower.includes('private') || urlLower.includes('secure') || urlLower.includes('internal')) {
        return 'private';
    }
    
    // По умолчанию публичный
    return 'public';
}

/**
 * Оценить размер файла (если возможно)
 */
async function estimateFileSize(file) {
    // Для реального размера нужно скачать файл, но мы можем оценить по расширению
    const largeExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.zip'];
    const isLarge = largeExtensions.includes(file.extension);
    
    return {
        estimated: true,
        likelyLarge: isLarge,
        note: isLarge ? 'Вероятно большой файл (>= 10MB)' : 'Вероятно маленький файл (< 10MB)'
    };
}

/**
 * Главная функция
 */
function main() {
    console.log('🔍 Анализ файлов и медиа для миграции\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем все нормализованные страницы
    const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📦 Загружено файлов: ${files.length}\n`);
    
    const allFiles = [];
    const allImages = [];
    const filesByType = {};
    const imagesByPage = {};
    
    files.forEach(file => {
        const filePath = path.join(NORMALIZED_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const pageSlug = data.slug || file.replace('.json', '');
        
        const html = data.normalizedHTML || data.content?.html || '';
        
        if (html) {
            // Извлекаем файлы
            const pageFiles = extractFileLinks(html, pageSlug);
            allFiles.push(...pageFiles);
            
            // Извлекаем изображения
            const pageImages = extractImages(html, pageSlug);
            allImages.push(...pageImages);
            
            if (pageFiles.length > 0) {
                filesByType[pageSlug] = pageFiles.length;
            }
            if (pageImages.length > 0) {
                imagesByPage[pageSlug] = pageImages.length;
            }
        }
    });
    
    console.log(`✅ Извлечено файлов: ${allFiles.length}`);
    console.log(`✅ Извлечено изображений: ${allImages.length}\n`);
    
    // Группируем файлы по типу
    const filesByExtension = {};
    allFiles.forEach(file => {
        const ext = file.extension || 'unknown';
        if (!filesByExtension[ext]) {
            filesByExtension[ext] = [];
        }
        filesByExtension[ext].push(file);
    });
    
    // Определяем тип файлов
    const publicFiles = [];
    const privateFiles = [];
    
    allFiles.forEach(file => {
        const fileType = determineFileType(file);
        if (fileType === 'public') {
            publicFiles.push(file);
        } else {
            privateFiles.push(file);
        }
    });
    
    // Уникальные файлы (по URL)
    const uniqueFiles = new Map();
    allFiles.forEach(file => {
        if (!uniqueFiles.has(file.url)) {
            uniqueFiles.set(file.url, file);
        }
    });
    
    // Уникальные изображения (по URL)
    const uniqueImages = new Map();
    allImages.forEach(img => {
        if (!uniqueImages.has(img.url)) {
            uniqueImages.set(img.url, img);
        }
    });
    
    // Формируем результат
    const result = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: allFiles.length,
            uniqueFiles: uniqueFiles.size,
            totalImages: allImages.length,
            uniqueImages: uniqueImages.size,
            publicFiles: publicFiles.length,
            privateFiles: privateFiles.length
        },
        filesByExtension: Object.keys(filesByExtension).map(ext => ({
            extension: ext,
            count: filesByExtension[ext].length,
            files: filesByExtension[ext].map(f => ({
                url: f.url,
                filename: f.filename,
                pageSlug: f.pageSlug
            }))
        })),
        uniqueFilesList: Array.from(uniqueFiles.values()),
        uniqueImagesList: Array.from(uniqueImages.values()),
        filesByPage: filesByType,
        imagesByPage: imagesByPage
    };
    
    // Сохраняем результат
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✅ Результаты сохранены: ${OUTPUT_FILE}\n`);
    
    // Создаем Markdown отчет
    let md = `# Отчет об анализе файлов и медиа для миграции\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего файлов найдено:** ${result.summary.totalFiles}\n`;
    md += `- **Уникальных файлов:** ${result.summary.uniqueFiles}\n`;
    md += `- **Всего изображений найдено:** ${result.summary.totalImages}\n`;
    md += `- **Уникальных изображений:** ${result.summary.uniqueImages}\n`;
    md += `- **Публичных файлов:** ${result.summary.publicFiles}\n`;
    md += `- **Приватных файлов:** ${result.summary.privateFiles}\n\n`;
    
    md += `## 📁 Файлы по расширениям\n\n`;
    result.filesByExtension.forEach(extGroup => {
        md += `### ${extGroup.extension || 'без расширения'} (${extGroup.count})\n\n`;
        extGroup.files.slice(0, 10).forEach(file => {
            md += `- [${file.filename}](${file.url}) (страница: ${file.pageSlug})\n`;
        });
        if (extGroup.files.length > 10) {
            md += `\n*... и еще ${extGroup.files.length - 10} файлов*\n`;
        }
        md += `\n`;
    });
    
    md += `## 🖼️ Изображения\n\n`;
    md += `Найдено ${result.summary.uniqueImages} уникальных изображений.\n\n`;
    md += `### Примеры изображений:\n\n`;
    result.uniqueImagesList.slice(0, 20).forEach(img => {
        md += `- [${img.filename}](${img.url}) (страница: ${img.pageSlug})\n`;
    });
    if (result.uniqueImagesList.length > 20) {
        md += `\n*... и еще ${result.uniqueImagesList.length - 20} изображений*\n`;
    }
    
    md += `\n## 📋 Рекомендации по миграции\n\n`;
    md += `### Публичные файлы (< 10MB)\n`;
    md += `→ Загрузить в Strapi Media Library\n\n`;
    md += `### Публичные файлы (>= 10MB)\n`;
    md += `→ Загрузить в Cloudinary или S3\n\n`;
    md += `### Приватные файлы\n`;
    md += `→ Сохранить в защищенной директории на сервере\n\n`;
    md += `### Изображения\n`;
    md += `→ Загрузить в Strapi Media Library и обновить ссылки в контенте\n\n`;
    
    fs.writeFileSync(REPORT_FILE, md, 'utf-8');
    console.log(`✅ Markdown отчет сохранен: ${REPORT_FILE}\n`);
    
    // Выводим статистику
    console.log('📊 Статистика:\n');
    console.log(`   Файлы по расширениям:`);
    result.filesByExtension.forEach(extGroup => {
        console.log(`     ${extGroup.extension || 'без расширения'}: ${extGroup.count}`);
    });
    console.log('');
    console.log(`   Публичных файлов: ${result.summary.publicFiles}`);
    console.log(`   Приватных файлов: ${result.summary.privateFiles}`);
    console.log(`   Уникальных изображений: ${result.summary.uniqueImages}\n`);
    
    return result;
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { extractFileLinks, extractImages, main };
