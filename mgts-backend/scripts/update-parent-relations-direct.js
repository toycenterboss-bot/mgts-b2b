/**
 * Скрипт для прямого обновления parent связей через API
 * Обходит проблемы с endpoint, обновляя связи напрямую
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

async function updateParentRelationsDirect() {
    console.log('🔗 Прямое обновление parent связей через API...\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // Загружаем иерархию
        const hierarchyPath = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
        if (!fs.existsSync(hierarchyPath)) {
            console.error(`❌ Файл иерархии не найден: ${hierarchyPath}`);
            process.exit(1);
        }
        const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
        
        // Получаем все страницы из Strapi
        console.log('📥 Загрузка страниц из Strapi...');
        let response;
        try {
            response = await api.get('/pages?pagination[pageSize]=100');
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error('❌ Strapi недоступен. Убедитесь, что Strapi запущен на http://localhost:1337');
            } else if (error.response) {
                console.error('❌ Ошибка API:', error.response.status, error.response.data);
            } else {
                console.error('❌ Ошибка:', error.message);
            }
            throw error;
        }
        const pages = response.data.data || [];
        
        console.log(`📊 Найдено страниц: ${pages.length}\n`);
        
        // Создаем карту slug -> id и slug -> documentId
        const slugToId = new Map();
        const slugToDocumentId = new Map();
        pages.forEach(page => {
            if (page.slug) {
                slugToId.set(page.slug, page.id);
                slugToDocumentId.set(page.slug, page.documentId || page.id);
            }
        });
        
        let updated = 0;
        let failed = 0;
        const results = [];
        
        // Обновляем parent связи
        console.log('🔄 Обновление parent связей...\n');
        
        for (const page of pages) {
            const hierarchyInfo = hierarchy.flat?.find(p => p.slug === page.slug);
            
            if (!hierarchyInfo) {
                continue;
            }
            
            if (!hierarchyInfo.parentSlug) {
                // Страница без родителя - пропускаем (или очищаем parent если нужно)
                continue;
            }
            
            const parentId = slugToId.get(hierarchyInfo.parentSlug);
            const parentDocumentId = slugToDocumentId.get(hierarchyInfo.parentSlug);
            if (!parentId || !parentDocumentId) {
                failed++;
                results.push({ slug: page.slug, reason: `Родитель "${hierarchyInfo.parentSlug}" не найден` });
                continue;
            }
            
            if (parentId === page.id) {
                failed++;
                results.push({ slug: page.slug, reason: 'Циклическая зависимость' });
                continue;
            }
            
            try {
                // Используем documentId для Strapi v5
                const documentId = page.documentId || page.id;
                
                // В Strapi v5 для manyToOne relations используем просто ID родителя
                // entityService.update в контроллере должен обработать это правильно
                const response = await api.put(`/pages/${documentId}`, {
                    data: {
                        parent: parentId  // Используем числовой ID
                    }
                });
                
                // Проверяем ответ
                if (response.status !== 200) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                updated++;
                if (updated % 10 === 0) {
                    console.log(`   Обновлено: ${updated}...`);
                }
            } catch (error) {
                failed++;
                const errorMsg = error.response?.data?.error?.message || error.message;
                results.push({ slug: page.slug, error: errorMsg });
                if (failed <= 5) {
                    console.warn(`   ⚠️  Ошибка для ${page.slug}: ${errorMsg}`);
                }
            }
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        console.log('✅ Обновление завершено:\n');
        console.log(`   Всего страниц: ${pages.length}`);
        console.log(`   Обновлено: ${updated}`);
        console.log(`   Ошибок: ${failed}\n`);
        
        if (results.length > 0 && results.length <= 20) {
            console.log('⚠️  Ошибки:\n');
            results.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.slug}: ${item.reason || item.error}`);
            });
            console.log('');
        } else if (results.length > 20) {
            console.log(`⚠️  Всего ошибок: ${results.length} (показаны первые 5)\n`);
        }
        
        if (updated > 0) {
            console.log('✅ Родительские связи успешно обновлены!\n');
        } else {
            console.log('ℹ️  Нет связей для обновления\n');
        }
        
    } catch (error) {
        console.error('\n❌ Ошибка при обновлении parent связей:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    updateParentRelationsDirect();
}

module.exports = { updateParentRelationsDirect };
