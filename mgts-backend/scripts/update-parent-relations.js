/**
 * Скрипт для обновления parent связей между страницами
 * Использует иерархию из pages-hierarchy.json
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    process.exit(1);
}

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

const HIERARCHY_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/parent-relations-report.json');

/**
 * Загрузить все страницы из Strapi
 */
async function loadAllPages() {
    console.log('📦 Загрузка всех страниц из Strapi...\n');
    
    let allPages = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const response = await api.get('/pages', {
            params: {
                'pagination[page]': page,
                'pagination[pageSize]': 100,
                'populate': 'parent'
            }
        });
        
        const pages = response.data.data || [];
        allPages = allPages.concat(pages);
        
        const pagination = response.data.meta?.pagination;
        if (pagination && page < pagination.pageCount) {
            page++;
        } else {
            hasMore = false;
        }
    }
    
    console.log(`✅ Загружено страниц из Strapi: ${allPages.length}\n`);
    return allPages;
}

/**
 * Загрузить иерархию страниц
 */
function loadHierarchy() {
    if (!fs.existsSync(HIERARCHY_FILE)) {
        console.error(`❌ Файл иерархии не найден: ${HIERARCHY_FILE}`);
        process.exit(1);
    }
    
    const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
    console.log(`✅ Загружена иерархия для ${hierarchy.totalPages} страниц\n`);
    return hierarchy;
}

/**
 * Обновить parent связи
 */
async function updateParentRelations() {
    console.log('🔗 Обновление родительских связей...\n');
    console.log('='.repeat(60) + '\n');
    
    // 1. Загрузить иерархию
    const hierarchy = loadHierarchy();
    
    // 2. Загрузить все страницы из Strapi
    const pages = await loadAllPages();
    
    // 3. Создать карту slug -> id
    const slugToId = new Map();
    pages.forEach(page => {
        // Strapi v5 может возвращать данные в разных форматах
        const slug = page.attributes?.slug || page.slug || (page.data && page.data.attributes?.slug) || (page.data && page.data.slug);
        const pageId = page.id || (page.data && page.data.id);
        if (slug && pageId) {
            slugToId.set(slug, pageId);
        }
    });
    
    console.log(`📊 Создана карта slug -> id для ${slugToId.size} страниц\n`);
    
    // 4. Обновить parent связи
    const results = {
        timestamp: new Date().toISOString(),
        total: 0,
        updated: [],
        failed: [],
        skipped: []
    };
    
    for (const page of pages) {
        // Strapi v5 может возвращать данные в разных форматах
        const slug = page.attributes?.slug || page.slug || (page.data && page.data.attributes?.slug) || (page.data && page.data.slug);
        const pageId = page.id || (page.data && page.data.id);
        
        if (!slug || !pageId) {
            console.warn(`⚠️  Пропущена страница без slug или id:`, page);
            continue;
        }
        
        // Найти информацию об иерархии
        const hierarchyInfo = hierarchy.flat?.find(p => p.slug === slug);
        
        if (!hierarchyInfo) {
            results.skipped.push({
                slug: slug,
                reason: 'Не найдено в иерархии'
            });
            continue;
        }
        
        if (!hierarchyInfo.parentSlug) {
            // Страница без родителя - проверяем, нужно ли очистить parent
            const currentParent = page.attributes?.parent?.data?.id || page.parent?.id || null;
            if (currentParent) {
                try {
                    await api.put(`/pages/${pageId}`, {
                        data: {
                            parent: null
                        }
                    });
                    results.updated.push({
                        slug: slug,
                        action: 'cleared',
                        parentSlug: null
                    });
                } catch (error) {
                    results.failed.push({
                        slug: slug,
                        action: 'clear',
                        error: error.message
                    });
                }
            }
            continue;
        }
        
        // Найти ID родительской страницы
        const parentId = slugToId.get(hierarchyInfo.parentSlug);
        
        if (!parentId) {
            results.failed.push({
                slug: slug,
                parentSlug: hierarchyInfo.parentSlug,
                reason: 'Родительская страница не найдена в Strapi'
            });
            continue;
        }
        
        // Проверить, не является ли родитель самой страницей (циклическая зависимость)
        if (parentId === pageId) {
            results.failed.push({
                slug: slug,
                parentSlug: hierarchyInfo.parentSlug,
                reason: 'Циклическая зависимость (страница не может быть родителем самой себя)'
            });
            continue;
        }
        
        // Проверить текущий parent
        const currentParent = page.attributes?.parent?.data?.id || 
                             page.attributes?.parent?.id ||
                             page.parent?.data?.id || 
                             page.parent?.id || 
                             (page.data && page.data.attributes?.parent?.data?.id) ||
                             null;
        
        if (currentParent === parentId) {
            // Parent уже установлен правильно
            results.skipped.push({
                slug: slug,
                reason: 'Parent уже установлен правильно'
            });
            continue;
        }
        
        // Обновить parent
        try {
            // В Strapi v5 для обновления relation можно использовать просто ID
            await api.put(`/pages/${pageId}`, {
                data: {
                    parent: parentId
                }
            });
            
            results.updated.push({
                slug: slug,
                parentSlug: hierarchyInfo.parentSlug,
                parentId: parentId
            });
            
            results.total++;
            
            if (results.total % 10 === 0) {
                console.log(`  Обновлено: ${results.total} связей...`);
            }
        } catch (error) {
            results.failed.push({
                slug: slug,
                parentSlug: hierarchyInfo.parentSlug,
                error: error.message,
                response: error.response?.data
            });
            console.warn(`⚠️  Ошибка при обновлении parent для ${slug}:`, error.message);
        }
    }
    
    // 5. Сохранить отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log(`\n✅ Обновление завершено:\n`);
    console.log(`   Обновлено: ${results.updated.length}`);
    console.log(`   Пропущено: ${results.skipped.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    
    console.log(`📄 Отчет сохранен: ${REPORT_FILE}\n`);
    
    // Создать Markdown отчет
    const mdReport = path.join(__dirname, '../../docs/PARENT_RELATIONS_REPORT.md');
    let md = `# Отчет об обновлении parent связей\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Обновлено:** ${results.updated.length}\n`;
    md += `- **Пропущено:** ${results.skipped.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n\n`;
    
    if (results.updated.length > 0) {
        md += `## ✅ Обновленные связи\n\n`;
        md += `| Slug | Parent Slug | Parent ID |\n`;
        md += `|------|-------------|-----------|\n`;
        results.updated.forEach(item => {
            md += `| ${item.slug} | ${item.parentSlug || '-'} | ${item.parentId || '-'} |\n`;
        });
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Slug | Parent Slug | Причина |\n`;
        md += `|------|-------------|----------|\n`;
        results.failed.forEach(item => {
            md += `| ${item.slug} | ${item.parentSlug || '-'} | ${item.reason || item.error || '-'} |\n`;
        });
        md += `\n`;
    }
    
    fs.writeFileSync(mdReport, md, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${mdReport}\n`);
    
    return results;
}

// Запуск
if (require.main === module) {
    updateParentRelations().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        process.exit(1);
    });
}

module.exports = { updateParentRelations };
