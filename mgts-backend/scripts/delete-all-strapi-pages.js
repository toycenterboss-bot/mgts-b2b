/**
 * Скрипт для удаления всех страниц из Strapi
 * 
 * ⚠️ ВНИМАНИЕ: Этот скрипт удаляет ВСЕ страницы из Strapi!
 * Убедитесь, что вы создали бэкап перед запуском этого скрипта!
 * 
 * Задачи:
 * 1. Загрузить все страницы из Strapi
 * 2. Удалить каждую страницу
 * 3. Создать отчет об удалении
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

// Пути к файлам
const REPORT_FILE = path.join(__dirname, '../../docs/DELETE_STRAPI_PAGES_REPORT.md');

/**
 * Загрузить все страницы из Strapi
 */
async function loadAllPages() {
    console.log('📦 Загрузка всех страниц из Strapi...\n');
    
    try {
        let allPages = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await api.get('/pages', {
                params: {
                    'pagination[page]': page,
                    'pagination[pageSize]': 100,
                    'populate': '*',
                    'publicationState': 'preview'  // Получаем все страницы, включая черновики
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
    } catch (error) {
        console.error('❌ Ошибка при загрузке страниц из Strapi:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        throw error;
    }
}

/**
 * Удалить все страницы
 */
async function deleteAllPages(pages) {
    console.log('🗑️  Удаление страниц из Strapi...\n');
    console.log('⚠️  ВНИМАНИЕ: Это действие необратимо!\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        total: pages.length,
        deleted: [],
        failed: [],
        errors: []
    };
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const slug = page.slug || page.attributes?.slug || `page-${page.id}`;
        const title = page.title || page.attributes?.title || '';
        
        try {
            // Пробуем удалить через API
            // Используем параметр publicationState для удаления черновиков
            await api.delete(`/pages/${page.id}`, {
                params: {
                    'publicationState': 'preview'  // Удаляем черновики
                }
            });
            
            // Если это опубликованная страница, удаляем и её
            if (page.publishedAt || (page.attributes && page.attributes.publishedAt)) {
                try {
                    await api.delete(`/pages/${page.id}`, {
                        params: {
                            'publicationState': 'live'  // Удаляем опубликованные
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибку, если уже удалено
                }
            }
            
            results.deleted.push({
                id: page.id,
                slug: slug,
                title: title
            });
            
            if ((i + 1) % 10 === 0) {
                console.log(`  Удалено: ${i + 1}/${pages.length} страниц...`);
            }
        } catch (error) {
            results.failed.push({
                id: page.id,
                slug: slug,
                title: title,
                error: error.message
            });
            results.errors.push({
                id: page.id,
                slug: slug,
                error: error.message,
                response: error.response?.data
            });
            console.warn(`⚠️  Ошибка при удалении ${slug}:`, error.message);
        }
    }
    
    console.log(`\n✅ Удаление завершено:\n`);
    console.log(`   Удалено: ${results.deleted.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    
    return results;
}

/**
 * Создать отчет об удалении
 */
function createDeleteReport(results) {
    let md = `# Отчет об удалении страниц из Strapi\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${results.total}\n`;
    md += `- **Успешно удалено:** ${results.deleted.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n\n`;
    
    if (results.deleted.length > 0) {
        md += `## ✅ Удаленные страницы\n\n`;
        md += `| ID | Slug | Название |\n`;
        md += `|----|------|----------|\n`;
        
        results.deleted.forEach(page => {
            md += `| ${page.id} | ${page.slug} | ${page.title} |\n`;
        });
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки при удалении\n\n`;
        md += `| ID | Slug | Название | Ошибка |\n`;
        md += `|----|------|----------|--------|\n`;
        
        results.failed.forEach(page => {
            md += `| ${page.id} | ${page.slug} | ${page.title} | ${page.error} |\n`;
        });
        md += `\n`;
    }
    
    md += `## ⚠️ Важно\n\n`;
    md += `- Все удаленные страницы должны быть в бэкапе\n`;
    md += `- Проверьте директорию бэкапа перед продолжением миграции\n`;
    md += `- Для восстановления используйте скрипт \`restore-strapi-pages.js\`\n\n`;
    
    fs.writeFileSync(REPORT_FILE, md, 'utf-8');
    console.log(`📄 Отчет об удалении сохранен: ${REPORT_FILE}\n`);
}

/**
 * Главная функция
 */
async function main() {
    console.log('🗑️  Удаление всех страниц из Strapi\n');
    console.log('='.repeat(60) + '\n');
    console.log('⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ страницы из Strapi!\n');
    console.log('⚠️  Убедитесь, что вы создали бэкап перед запуском!\n');

    const FORCE_YES = process.argv.includes('--yes') || process.env.STRAPI_DELETE_ALL_PAGES_YES === '1';

    async function runDeletion() {
        // 1. Загрузить все страницы
        const pages = await loadAllPages();

        if (pages.length === 0) {
            console.log('⚠️  В Strapi нет страниц для удаления\n');
            return;
        }

        // 2. Удалить все страницы
        const results = await deleteAllPages(pages);

        // 3. Создать отчет
        createDeleteReport(results);

        console.log('✅ Удаление завершено!\n');
        console.log('📊 Результаты:');
        console.log(`   - Удалено: ${results.deleted.length}`);
        console.log(`   - Ошибок: ${results.failed.length}\n`);
    }

    if (FORCE_YES) {
        console.log('⚠️  Подтверждение пропущено (--yes / STRAPI_DELETE_ALL_PAGES_YES=1)\n');
        await runDeletion();
        return;
    }

    // Запрашиваем подтверждение (интерактивно)
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    return new Promise((resolve, reject) => {
        rl.question('Вы уверены, что хотите удалить все страницы? (yes/no): ', async (answer) => {
            rl.close();

            if (String(answer || '').toLowerCase() !== 'yes') {
                console.log('\n❌ Операция отменена\n');
                process.exit(0);
            }

            try {
                await runDeletion();
                resolve();
            } catch (error) {
                console.error('\n❌ Ошибка при удалении страниц:', error.message);
                if (error.response) {
                    console.error('   Ответ сервера:', error.response.data);
                }
                reject(error);
                process.exit(1);
            }
        });
    });
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, loadAllPages, deleteAllPages };
