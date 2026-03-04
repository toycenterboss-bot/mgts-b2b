/**
 * Скрипт для восстановления страниц из бэкапа
 * Использование:
 *   node restore-strapi-pages.js {timestamp} [slug]
 * 
 * Примеры:
 *   node restore-strapi-pages.js 2024-01-15T10-30-00  # Восстановить все страницы
 *   node restore-strapi-pages.js 2024-01-15T10-30-00 business/telephony  # Восстановить одну страницу
 */

const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


const BACKUP_DIR = path.join(__dirname, '../../backups/strapi-pages');

/**
 * Загрузить индексный файл бэкапа
 */
function loadBackupIndex(timestamp) {
    const backupPath = path.join(BACKUP_DIR, timestamp);
    const indexPath = path.join(backupPath, 'index.json');

    if (!fs.existsSync(indexPath)) {
        throw new Error(`Бэкап не найден: ${timestamp}`);
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return { backupPath, index };
}

/**
 * Загрузить данные страницы из бэкапа
 */
function loadPageFromBackup(backupPath, slug) {
    const safeSlug = slug.replace(/[^a-z0-9-_/]/gi, '_').replace(/\//g, '_');
    const jsonPath = path.join(backupPath, `${safeSlug}.json`);

    if (!fs.existsSync(jsonPath)) {
        throw new Error(`Файл страницы не найден: ${jsonPath}`);
    }

    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

/**
 * Получить страницу из Strapi по slug
 */
async function getPageFromStrapi(slug) {
    const encodedSlug = encodeURIComponent(slug);
    const response = await fetch(`${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodedSlug}&populate=*`, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
        const page = data.data[0];
        return {
            id: page.id,
            ...(page.attributes || page)
        };
    }

    return null;
}

/**
 * Обновить страницу в Strapi
 */
async function updatePageInStrapi(pageId, pageData) {
    const updateData = {
        data: {
            content: pageData.content,
            title: pageData.title,
            heroTitle: pageData.heroTitle,
            heroSubtitle: pageData.heroSubtitle,
            breadcrumbs: pageData.breadcrumbs,
            metadata: pageData.metadata
        }
    };

    const response = await fetch(`${STRAPI_URL}/api/pages/${pageId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update page: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Восстановить одну страницу
 */
async function restorePage(backupPath, slug) {
    console.log(`\nВосстановление страницы: ${slug}`);

    try {
        // Загрузить данные из бэкапа
        const backupData = loadPageFromBackup(backupPath, slug);
        console.log(`  ✅ Данные загружены из бэкапа`);

        // Получить страницу из Strapi
        const strapiPage = await getPageFromStrapi(slug);
        if (!strapiPage) {
            console.log(`  ⚠️  Страница не найдена в Strapi, пропускаем`);
            return false;
        }

        console.log(`  ✅ Страница найдена в Strapi (ID: ${strapiPage.id})`);

        // Обновить страницу
        await updatePageInStrapi(strapiPage.id, backupData);
        console.log(`  ✅ Страница восстановлена`);

        return true;
    } catch (error) {
        console.error(`  ❌ Ошибка при восстановлении: ${error.message}`);
        return false;
    }
}

/**
 * Восстановить все страницы
 */
async function restoreAllPages(backupPath, index) {
    console.log(`\nВосстановление всех страниц (${index.pages.length})...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const pageInfo of index.pages) {
        const success = await restorePage(backupPath, pageInfo.slug);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log(`\n=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ===`);
    console.log(`✅ Успешно: ${successCount}`);
    console.log(`❌ Ошибок: ${failCount}`);
}

/**
 * Основная функция
 */
async function restorePages() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Использование: node restore-strapi-pages.js {timestamp} [slug]');
        console.error('Примеры:');
        console.error('  node restore-strapi-pages.js 2024-01-15T10-30-00');
        console.error('  node restore-strapi-pages.js 2024-01-15T10-30-00 business/telephony');
        process.exit(1);
    }

    const timestamp = args[0];
    const slug = args[1]; // Опционально

    console.log('=== ВОССТАНОВЛЕНИЕ СТРАНИЦ ИЗ БЭКАПА ===\n');

    try {
        // Проверить доступность Strapi
        console.log('Проверка доступности Strapi...');
        const healthCheck = await fetch(`${STRAPI_URL}/api/pages?pagination[limit]=1`, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });

        if (!healthCheck.ok) {
            throw new Error(`Strapi недоступен: ${healthCheck.status} ${healthCheck.statusText}`);
        }

        console.log('✅ Strapi доступен\n');

        // Загрузить индекс бэкапа
        const { backupPath, index } = loadBackupIndex(timestamp);
        console.log(`📁 Бэкап: ${timestamp}`);
        console.log(`📄 Всего страниц в бэкапе: ${index.pages.length}\n`);

        // Восстановить страницы
        if (slug) {
            // Восстановить одну страницу
            await restorePage(backupPath, slug);
        } else {
            // Восстановить все страницы
            await restoreAllPages(backupPath, index);
        }

    } catch (error) {
        console.error('\n❌ Ошибка при восстановлении:', error);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    restorePages();
}

module.exports = { restorePages };

