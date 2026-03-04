/**
 * Скрипт для восстановления страниц из бэкапа
 * Использование:
 *   node restore-from-backup.js [timestamp] [slug]
 * 
 * Примеры:
 *   node restore-from-backup.js                    # Показать список бэкапов
 *   node restore-from-backup.js latest             # Восстановить все страницы из последнего бэкапа
 *   node restore-from-backup.js latest business/telephony  # Восстановить одну страницу
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


const BACKUP_DIR = path.join(__dirname, '../../strapi-backups');

/**
 * Получить список всех бэкапов
 */
function getBackupList() {
    if (!fs.existsSync(BACKUP_DIR)) {
        return [];
    }
    
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(item => {
            const itemPath = path.join(BACKUP_DIR, item);
            return fs.statSync(itemPath).isDirectory();
        })
        .sort()
        .reverse(); // Новые сначала
    
    return backups;
}

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
    return { index, backupPath };
}

/**
 * Загрузить страницу из бэкапа
 */
function loadPageFromBackup(backupPath, slug) {
    const safeSlug = slug.replace(/\//g, '_').replace(/[^a-z0-9_]/gi, '_');
    const filePath = path.join(backupPath, `${safeSlug}.json`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Страница не найдена в бэкапе: ${slug}`);
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Найти страницу в Strapi по slug
 */
async function findPageInStrapi(slug) {
    const encodedSlug = encodeURIComponent(slug);
    const response = await fetch(`${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodedSlug}&populate=*`, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
        return data.data[0];
    }
    
    return null;
}

/**
 * Обновить страницу в Strapi
 */
async function updatePageInStrapi(pageId, pageData) {
    const response = await fetch(`${STRAPI_URL}/api/pages/${pageId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: pageData
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update page: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Восстановить страницу
 */
async function restorePage(slug, backupPath) {
    console.log(`Восстановление страницы: ${slug}`);
    
    // Загрузить из бэкапа
    const backupPage = loadPageFromBackup(backupPath, slug);
    const backupContent = backupPage.attributes?.content || backupPage.content || '';
    
    if (!backupContent) {
        console.warn(`⚠️ Страница ${slug} не имеет контента в бэкапе`);
        return false;
    }
    
    // Найти страницу в Strapi
    const strapiPage = await findPageInStrapi(slug);
    
    if (!strapiPage) {
        console.warn(`⚠️ Страница ${slug} не найдена в Strapi, пропускаем`);
        return false;
    }
    
    // Подготовить данные для обновления
    const pageData = {
        content: backupContent
    };
    
    // Обновить страницу
    try {
        await updatePageInStrapi(strapiPage.id, pageData);
        console.log(`✅ Страница ${slug} восстановлена`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка при восстановлении ${slug}:`, error.message);
        return false;
    }
}

/**
 * Основная функция
 */
async function restoreFromBackup() {
    const args = process.argv.slice(2);
    const timestamp = args[0];
    const slug = args[1];

    try {
        // Проверка доступности Strapi
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

        // Если timestamp не указан, показать список бэкапов
        if (!timestamp) {
            const backups = getBackupList();
            
            if (backups.length === 0) {
                console.log('Бэкапы не найдены');
                return;
            }
            
            console.log('Доступные бэкапы:\n');
            backups.forEach((backup, index) => {
                const backupPath = path.join(BACKUP_DIR, backup);
                const indexPath = path.join(backupPath, 'index.json');
                
                if (fs.existsSync(indexPath)) {
                    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
                    console.log(`${index === 0 ? '→' : ' '} ${backup}`);
                    console.log(`   Дата: ${index.timestamp}`);
                    console.log(`   Страниц: ${index.totalPages}`);
                    console.log('');
                } else {
                    console.log(`  ${backup} (нет индекса)`);
                }
            });
            
            console.log('Использование:');
            console.log('  node restore-from-backup.js latest                    # Восстановить все из последнего бэкапа');
            console.log('  node restore-from-backup.js {timestamp}                # Восстановить все из указанного бэкапа');
            console.log('  node restore-from-backup.js {timestamp} {slug}        # Восстановить одну страницу');
            return;
        }

        // Определить timestamp (latest или конкретный)
        let actualTimestamp = timestamp;
        if (timestamp === 'latest') {
            const backups = getBackupList();
            if (backups.length === 0) {
                throw new Error('Бэкапы не найдены');
            }
            actualTimestamp = backups[0];
            console.log(`Используется последний бэкап: ${actualTimestamp}\n`);
        }

        // Загрузить индекс бэкапа
        const { index, backupPath } = loadBackupIndex(actualTimestamp);
        console.log(`Бэкап: ${actualTimestamp}`);
        console.log(`Дата создания: ${index.timestamp}`);
        console.log(`Всего страниц: ${index.totalPages}\n`);

        // Восстановить страницы
        if (slug) {
            // Восстановить одну страницу
            await restorePage(slug, backupPath);
        } else {
            // Восстановить все страницы
            console.log('Восстановление всех страниц...\n');
            
            let restored = 0;
            let skipped = 0;
            let errors = 0;
            
            for (const pageInfo of index.pages) {
                if (!pageInfo.hasContent) {
                    console.log(`⏭️  ${pageInfo.slug} - нет контента, пропускаем`);
                    skipped++;
                    continue;
                }
                
                const success = await restorePage(pageInfo.slug, backupPath);
                if (success) {
                    restored++;
                } else {
                    errors++;
                }
            }
            
            console.log('\n=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ===');
            console.log(`Восстановлено: ${restored}`);
            console.log(`Пропущено: ${skipped}`);
            console.log(`Ошибок: ${errors}`);
        }

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Запуск
restoreFromBackup();


