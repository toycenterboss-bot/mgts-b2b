/**
 * Скрипт для рекурсивного удаления всех страниц
 * Удаляет сначала дочерние страницы, потом родительские
 */

const axios = require('axios');

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

/**
 * Получить все страницы
 */
async function getAllPages() {
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
    
    return allPages;
}

/**
 * Удалить страницы в правильном порядке (сначала дочерние)
 */
async function deletePagesRecursive() {
    console.log('🗑️  Рекурсивное удаление всех страниц...\n');
    
    // Получаем все страницы
    const allPages = await getAllPages();
    console.log(`📦 Найдено страниц: ${allPages.length}\n`);
    
    if (allPages.length === 0) {
        console.log('✅ В Strapi нет страниц для удаления\n');
        return;
    }
    
    // Строим карту parent -> children
    const childrenMap = new Map();
    const pageMap = new Map();
    
    allPages.forEach(page => {
        const pageData = page.attributes || page;
        const pageId = page.id;
        const parentId = pageData.parent?.data?.id || null;
        
        pageMap.set(pageId, page);
        
        if (parentId) {
            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }
            childrenMap.get(parentId).push(pageId);
        }
    });
    
    // Находим листья (страницы без дочерних)
    const leaves = allPages.filter(page => {
        const pageId = page.id;
        return !childrenMap.has(pageId) || childrenMap.get(pageId).length === 0;
    });
    
    console.log(`📋 Листьев (страниц без дочерних): ${leaves.length}\n`);
    
    let deleted = 0;
    let failed = 0;
    const deletedIds = new Set();
    
    // Удаляем страницы, начиная с листьев
    while (allPages.length > 0) {
        let progress = false;
        
        for (let i = allPages.length - 1; i >= 0; i--) {
            const page = allPages[i];
            const pageId = page.id;
            const pageData = page.attributes || page;
            const parentId = pageData.parent?.data?.id || null;
            
            // Проверяем, что все дочерние страницы уже удалены
            const children = childrenMap.get(pageId) || [];
            const allChildrenDeleted = children.every(childId => deletedIds.has(childId));
            
            if (allChildrenDeleted || children.length === 0) {
                try {
                    // Пробуем удалить через разные методы
                    try {
                        await api.delete(`/pages/${pageId}`);
                    } catch (e1) {
                        // Если не получилось, пробуем с параметром publicationState
                        try {
                            await api.delete(`/pages/${pageId}?publicationState=preview`);
                        } catch (e2) {
                            await api.delete(`/pages/${pageId}?publicationState=live`);
                        }
                    }
                    
                    deletedIds.add(pageId);
                    allPages.splice(i, 1);
                    deleted++;
                    progress = true;
                    
                    if (deleted % 10 === 0) {
                        console.log(`  Удалено: ${deleted} страниц...`);
                    }
                } catch (error) {
                    failed++;
                    console.warn(`⚠️  Ошибка при удалении страницы ${pageId}:`, error.message);
                }
            }
        }
        
        // Если не было прогресса, прерываем цикл
        if (!progress) {
            console.warn('\n⚠️  Не удалось удалить все страницы. Осталось:', allPages.length);
            break;
        }
    }
    
    console.log(`\n✅ Удаление завершено:\n`);
    console.log(`   Удалено: ${deleted}`);
    console.log(`   Ошибок: ${failed}\n`);
    
    // Проверяем результат
    const remaining = await getAllPages();
    console.log(`📊 Осталось страниц в Strapi: ${remaining.length}\n`);
    
    if (remaining.length === 0) {
        console.log('✅ Все страницы успешно удалены!\n');
    } else {
        console.log('⚠️  В Strapi еще остались страницы!\n');
    }
}

// Запуск
if (require.main === module) {
    deletePagesRecursive().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = { deletePagesRecursive };
