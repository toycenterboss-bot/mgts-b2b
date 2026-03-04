/**
 * Диагностический скрипт для проверки parent связей в Strapi
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

async function checkParentRelations() {
    console.log('🔍 Проверка parent связей в Strapi...\n');
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
        // Сначала получаем без populate для проверки доступности
        let response;
        try {
            response = await api.get('/pages?pagination[pageSize]=100');
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error('❌ Strapi недоступен. Убедитесь, что Strapi запущен на http://localhost:1337');
            }
            throw error;
        }
        
        const pages = response.data.data || [];
        
        // Загружаем parent для каждой страницы отдельно с явным populate
        const pagesWithParent = [];
        for (const page of pages) {
            try {
                // Используем documentId для Strapi v5
                const documentId = page.documentId || page.id;
                const pageResponse = await api.get(`/pages/${documentId}?populate[parent][fields][0]=slug&populate[parent][fields][1]=id&populate[parent][fields][2]=documentId`);
                const pageData = pageResponse.data.data || pageResponse.data;
                pagesWithParent.push(pageData);
            } catch (error) {
                // Если не удалось загрузить parent, используем страницу без parent
                pagesWithParent.push(page);
            }
        }
        
        if (!pages || pages.length === 0) {
            console.error('❌ Не удалось получить страницы из Strapi');
            console.error('   Ответ:', JSON.stringify(response.data, null, 2));
            process.exit(1);
        }
        
        console.log(`📊 Всего страниц в Strapi: ${pages.length}`);
        console.log(`📊 Всего страниц в иерархии: ${hierarchy.flat?.length || 0}\n`);
        
        // Статистика
        let withParent = 0;
        let withoutParent = 0;
        let shouldHaveParent = 0;
        let correctParent = 0;
        let incorrectParent = 0;
        let missingParent = 0;
        const issues = [];
        
        // Создаем карту slug -> id для страниц
        const slugToId = new Map();
        pages.forEach(page => {
            if (page.slug) {
                slugToId.set(page.slug, page.id);
            }
        });
        
        // Используем страницы с parent
        const pagesToCheck = pagesWithParent.length > 0 ? pagesWithParent : pages;
        
        // Проверяем каждую страницу
        for (const page of pagesToCheck) {
            const hierarchyInfo = hierarchy.flat?.find(p => p.slug === page.slug);
            
            if (!hierarchyInfo) {
                continue;
            }
            
            const currentParent = page.parent;
            const currentParentId = currentParent?.id || null;
            const currentParentSlug = currentParent?.slug || null;
            
            if (currentParentId) {
                withParent++;
            } else {
                withoutParent++;
            }
            
            if (hierarchyInfo.parentSlug) {
                shouldHaveParent++;
                const expectedParentId = slugToId.get(hierarchyInfo.parentSlug);
                
                if (!expectedParentId) {
                    issues.push({
                        slug: page.slug,
                        issue: `Родитель "${hierarchyInfo.parentSlug}" не найден в Strapi`
                    });
                    missingParent++;
                } else if (currentParentId === expectedParentId) {
                    correctParent++;
                } else {
                    incorrectParent++;
                    issues.push({
                        slug: page.slug,
                        issue: `Неправильный parent: текущий "${currentParentSlug}", ожидается "${hierarchyInfo.parentSlug}"`
                    });
                }
            } else {
                // Страница не должна иметь parent
                if (currentParentId) {
                    issues.push({
                        slug: page.slug,
                        issue: `Имеет parent "${currentParentSlug}", но не должен`
                    });
                }
            }
        }
        
        console.log('📈 Статистика:\n');
        console.log(`   Страниц с parent: ${withParent}`);
        console.log(`   Страниц без parent: ${withoutParent}`);
        console.log(`   Страниц, которые должны иметь parent: ${shouldHaveParent}`);
        console.log(`   Правильных parent связей: ${correctParent}`);
        console.log(`   Неправильных parent связей: ${incorrectParent}`);
        console.log(`   Отсутствующих parent: ${missingParent}\n`);
        
        if (issues.length > 0) {
            console.log(`⚠️  Найдено проблем: ${issues.length}\n`);
            console.log('Проблемы:\n');
            issues.slice(0, 20).forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.slug}: ${item.issue}`);
            });
            if (issues.length > 20) {
                console.log(`   ... и еще ${issues.length - 20} проблем`);
            }
            console.log('');
        } else {
            console.log('✅ Все parent связи установлены правильно!\n');
        }
        
        // Показываем примеры страниц с parent
        console.log('\n📋 Примеры страниц с parent:\n');
        const examplesWithParent = pages.filter(p => p.parent).slice(0, 5);
        examplesWithParent.forEach(page => {
            console.log(`   - ${page.slug} → parent: ${page.parent.slug}`);
        });
        
        if (examplesWithParent.length === 0) {
            console.log('   (Нет страниц с parent)');
        }
        
        console.log('\n📋 Примеры страниц без parent (которые должны иметь):\n');
        const examplesWithoutParent = pages.filter(page => {
            const hierarchyInfo = hierarchy.flat?.find(p => p.slug === page.slug);
            return hierarchyInfo?.parentSlug && !page.parent;
        }).slice(0, 5);
        
        examplesWithoutParent.forEach(page => {
            const hierarchyInfo = hierarchy.flat?.find(p => p.slug === page.slug);
            console.log(`   - ${page.slug} → должен иметь parent: ${hierarchyInfo.parentSlug}`);
        });
        
        if (examplesWithoutParent.length === 0) {
            console.log('   (Все страницы имеют правильные parent связи)');
        }
        
    } catch (error) {
        console.error('\n❌ Ошибка при проверке parent связей:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('   Запрос выполнен, но ответа нет');
            console.error('   URL:', error.config?.url);
        } else {
            console.error('   Детали ошибки:', error);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    checkParentRelations();
}

module.exports = { checkParentRelations };
