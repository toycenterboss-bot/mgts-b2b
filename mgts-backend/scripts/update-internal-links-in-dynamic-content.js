/**
 * Скрипт для обновления межстраничных ссылок в динамическом контенте
 * Обновляет ссылки в dynamicContent (items, tabs) нормализованных страниц
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const HIERARCHY_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/dynamic-content-links-update-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/DYNAMIC_CONTENT_LINKS_UPDATE_REPORT.md');

// Используем ту же логику обновления ссылок из update-internal-links.js
const { updateLinksInContent, createUrlToSlugMap, buildPagePath } = require('./update-internal-links');

/**
 * Обновить ссылки в динамическом контенте страницы
 */
function updateDynamicContentLinks(pageData, urlMap) {
    if (!pageData.dynamicContent || !pageData.dynamicContent.type) {
        return { updated: false, changes: [] };
    }
    
    const changes = [];
    let hasChanges = false;
    const dynamicContentType = pageData.dynamicContent.type;
    
    // Обрабатываем accordion (items)
    if ((dynamicContentType === 'accordion') && pageData.dynamicContent.items) {
        const items = Array.isArray(pageData.dynamicContent.items) 
            ? pageData.dynamicContent.items 
            : Object.values(pageData.dynamicContent.items);
        
        items.forEach((item, index) => {
            if (item.content && typeof item.content === 'string') {
                const updateResult = updateLinksInContent(item.content, urlMap, `${pageData.slug}.accordion[${index}]`);
                if (updateResult.updated) {
                    item.content = updateResult.content;
                    changes.push(...updateResult.changes.map(c => ({
                        ...c,
                        location: `accordion[${index}].content`,
                        itemHeader: item.header || `Item ${index + 1}`
                    })));
                    hasChanges = true;
                }
            }
        });
    }
    
    // Обрабатываем document_tabs, service_tabs, history_tabs (tabs)
    if ((dynamicContentType === 'document_tabs' || 
         dynamicContentType === 'service_tabs' || 
         dynamicContentType === 'history_tabs' ||
         dynamicContentType === 'document-tabs' ||
         dynamicContentType === 'service-tabs') && pageData.dynamicContent.tabs) {
        
        const tabs = Array.isArray(pageData.dynamicContent.tabs) 
            ? pageData.dynamicContent.tabs 
            : Object.values(pageData.dynamicContent.tabs);
        
        tabs.forEach((tab, index) => {
            if (tab.content && typeof tab.content === 'string') {
                const tabName = tab.name || `Tab ${index + 1}`;
                const updateResult = updateLinksInContent(tab.content, urlMap, `${pageData.slug}.tabs[${index}]`);
                if (updateResult.updated) {
                    tab.content = updateResult.content;
                    changes.push(...updateResult.changes.map(c => ({
                        ...c,
                        location: `tabs[${index}].content`,
                        tabName: tabName
                    })));
                    hasChanges = true;
                }
            }
        });
    }
    
    // Обрабатываем carousel (items)
    if (dynamicContentType === 'carousel' && pageData.dynamicContent.items) {
        const items = Array.isArray(pageData.dynamicContent.items) 
            ? pageData.dynamicContent.items 
            : Object.values(pageData.dynamicContent.items);
        
        items.forEach((item, index) => {
            // В carousel может быть description или content
            const contentField = item.content || item.description || item.html;
            if (contentField && typeof contentField === 'string') {
                const updateResult = updateLinksInContent(contentField, urlMap, `${pageData.slug}.carousel[${index}]`);
                if (updateResult.updated) {
                    if (item.content) item.content = updateResult.content;
                    if (item.description) item.description = updateResult.content;
                    if (item.html) item.html = updateResult.content;
                    changes.push(...updateResult.changes.map(c => ({
                        ...c,
                        location: `carousel[${index}].content`,
                        itemTitle: item.title || `Item ${index + 1}`
                    })));
                    hasChanges = true;
                }
            }
        });
    }
    
    return {
        updated: hasChanges,
        changes: changes
    };
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔗 Обновление межстраничных ссылок в динамическом контенте\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем иерархию страниц для построения правильных путей
    let hierarchy = [];
    if (fs.existsSync(HIERARCHY_FILE)) {
        const hierarchyData = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
        hierarchy = hierarchyData.flat || [];
        console.log(`📂 Загружена иерархия из pages-hierarchy.json (${hierarchy.length} страниц)\n`);
    } else {
        console.log(`⚠️  Файл иерархии не найден: ${HIERARCHY_FILE}\n`);
        console.log(`   Пути будут построены без учета иерархии\n`);
    }
    
    // Загружаем все нормализованные страницы для создания карты URL -> slug
    const normalizedFiles = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📦 Загружено нормализованных файлов: ${normalizedFiles.length}\n`);
    
    const pages = normalizedFiles.map(file => {
        const filePath = path.join(NORMALIZED_DIR, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
    
    // Создаем карту URL -> путь (с учетом иерархии)
    const urlMap = createUrlToSlugMap(pages, hierarchy);
    console.log(`✅ Создана карта URL -> путь: ${urlMap.size} записей\n`);
    
    // Находим файлы с dynamicContent
    const filesWithDynamicContent = normalizedFiles.filter(file => {
        try {
            const filePath = path.join(NORMALIZED_DIR, file);
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return pageData.dynamicContent && pageData.dynamicContent.type;
        } catch (e) {
            return false;
        }
    });
    
    console.log(`📋 Найдено файлов с dynamicContent: ${filesWithDynamicContent.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        total: filesWithDynamicContent.length,
        updated: [],
        skipped: [],
        failed: [],
        totalChanges: 0
    };
    
    // Обновляем ссылки в динамическом контенте каждой страницы
    for (let i = 0; i < filesWithDynamicContent.length; i++) {
        const file = filesWithDynamicContent[i];
        const filePath = path.join(NORMALIZED_DIR, file);
        
        try {
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const pageSlug = pageData.slug || path.basename(file, '.json');
            
            console.log(`[${i + 1}/${filesWithDynamicContent.length}] ${pageSlug} (${pageData.dynamicContent.type})...`);
            
            const updateResult = updateDynamicContentLinks(pageData, urlMap);
            
            if (updateResult.updated && updateResult.changes.length > 0) {
                // Сохраняем обновленный файл
                pageData.dynamicContentLinksUpdatedAt = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
                
                results.updated.push({
                    slug: pageSlug,
                    type: pageData.dynamicContent.type,
                    changesCount: updateResult.changes.length,
                    changes: updateResult.changes.slice(0, 5) // Первые 5 изменений для примера
                });
                
                results.totalChanges += updateResult.changes.length;
                console.log(`   ✅ Обновлено ${updateResult.changes.length} ссылок в dynamicContent`);
            } else {
                results.skipped.push({
                    slug: pageSlug,
                    type: pageData.dynamicContent.type,
                    reason: 'Нет ссылок для обновления или ссылки уже корректные'
                });
                console.log(`   ⏭️  Нет ссылок для обновления`);
            }
        } catch (error) {
            console.error(`   ❌ Ошибка обработки файла ${file}: ${error.message}`);
            results.failed.push({
                file: file,
                error: error.message
            });
        }
        
        console.log('');
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let md = `# Отчет об обновлении ссылок в динамическом контенте\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего файлов с dynamicContent:** ${results.total}\n`;
    md += `- **Обновлено:** ${results.updated.length}\n`;
    md += `- **Пропущено:** ${results.skipped.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n`;
    md += `- **Всего изменений ссылок:** ${results.totalChanges}\n\n`;
    
    if (results.updated.length > 0) {
        md += `## ✅ Обновленные страницы\n\n`;
        md += `| Страница | Тип | Количество изменений | Примеры изменений |\n`;
        md += `|----------|-----|----------------------|------------------|\n`;
        results.updated.forEach(item => {
            const examples = item.changes.slice(0, 2).map(c => {
                const location = c.location || '';
                const name = c.tabName || c.itemHeader || c.itemTitle || '';
                return `\`${c.old}\` → \`${c.new}\` (${location}${name ? `: ${name}` : ''})`;
            }).join(', ');
            md += `| ${item.slug} | ${item.type} | ${item.changesCount} | ${examples || '-'} |\n`;
        });
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Файл | Ошибка |\n`;
        md += `|------|--------|\n`;
        results.failed.forEach(item => {
            md += `| ${item.file} | ${item.error} |\n`;
        });
        md += `\n`;
    }
    
    fs.writeFileSync(MD_REPORT_FILE, md, 'utf-8');
    
    console.log('='.repeat(60) + '\n');
    console.log('✅ Обновление ссылок в динамическом контенте завершено!\n');
    console.log(`   Обновлено файлов: ${results.updated.length}`);
    console.log(`   Всего изменений ссылок: ${results.totalChanges}`);
    console.log(`   Пропущено: ${results.skipped.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    console.log(`📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${MD_REPORT_FILE}\n`);
    
    return results;
}

// Запуск
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { main, updateDynamicContentLinks };
