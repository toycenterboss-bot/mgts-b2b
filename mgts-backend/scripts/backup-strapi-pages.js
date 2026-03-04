/**
 * Скрипт для создания бэкапа всех страниц из Strapi
 * 
 * Задачи:
 * 1. Загрузить все страницы из Strapi с полным контентом
 * 2. Сохранить их в JSON файлы для возможности восстановления
 * 3. Создать отчет о бэкапе
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    console.error('\nСоздайте токен в Strapi:');
    console.error('  1. Откройте http://localhost:1337/admin');
    console.error('  2. Settings → API Tokens → Create new API Token');
    console.error('  3. Name: Backup Script');
    console.error('  4. Token duration: Unlimited');
    console.error('  5. Token type: Full access');
    console.error('  6. Скопируйте токен и установите:');
    console.error('     export STRAPI_API_TOKEN="your_token_here"\n');
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
const BACKUP_DIR = path.join(__dirname, '../../strapi-backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
const BACKUP_SUBDIR = path.join(BACKUP_DIR, `pages-backup-${TIMESTAMP}`);
const BACKUP_INDEX_FILE = path.join(BACKUP_SUBDIR, 'index.json');
const BACKUP_REPORT_FILE = path.join(__dirname, '../../docs/BACKUP_STRAPI_PAGES.md');

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
                    'publicationState': 'live'
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
 * Сохранить страницы в бэкап
 */
function saveBackup(pages) {
    console.log('💾 Сохранение бэкапа...\n');
    
    // Создаем директорию для бэкапа
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(BACKUP_SUBDIR)) {
        fs.mkdirSync(BACKUP_SUBDIR, { recursive: true });
    }
    
    const backupIndex = {
        timestamp: new Date().toISOString(),
        totalPages: pages.length,
        pages: []
    };
    
    // Сохраняем каждую страницу в отдельный файл
    pages.forEach((page, index) => {
        const slug = page.slug || page.attributes?.slug || `page-${page.id}`;
        const filename = `${slug.replace(/[\/\\]/g, '_')}.json`;
        const filepath = path.join(BACKUP_SUBDIR, filename);
        
        // Сохраняем полную страницу
        fs.writeFileSync(filepath, JSON.stringify(page, null, 2), 'utf-8');
        
        backupIndex.pages.push({
            id: page.id,
            slug: slug,
            title: page.title || page.attributes?.title || '',
            filename: filename,
            section: page.section || page.attributes?.section || null,
            createdAt: page.createdAt || page.attributes?.createdAt || null,
            updatedAt: page.updatedAt || page.attributes?.updatedAt || null
        });
        
        if ((index + 1) % 10 === 0) {
            console.log(`  Сохранено: ${index + 1}/${pages.length} страниц...`);
        }
    });
    
    // Сохраняем индексный файл
    fs.writeFileSync(BACKUP_INDEX_FILE, JSON.stringify(backupIndex, null, 2), 'utf-8');
    
    console.log(`\n✅ Бэкап сохранен в: ${BACKUP_SUBDIR}\n`);
    console.log(`📄 Индексный файл: ${BACKUP_INDEX_FILE}\n`);
    
    return backupIndex;
}

/**
 * Создать отчет о бэкапе
 */
function createBackupReport(backupIndex) {
    let md = `# Бэкап страниц Strapi\n\n`;
    md += `**Дата создания:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${backupIndex.totalPages}\n`;
    md += `- **Директория бэкапа:** \`${BACKUP_SUBDIR}\`\n`;
    md += `- **Индексный файл:** \`${BACKUP_INDEX_FILE}\`\n\n`;
    
    md += `## 📄 Список страниц в бэкапе\n\n`;
    md += `| ID | Slug | Название | Секция | Дата создания | Дата обновления |\n`;
    md += `|----|------|----------|--------|---------------|-----------------|\n`;
    
    backupIndex.pages.forEach(page => {
        md += `| ${page.id} | ${page.slug} | ${page.title} | ${page.section || '-'} | ${page.createdAt || '-'} | ${page.updatedAt || '-'} |\n`;
    });
    
    md += `\n## 📝 Восстановление\n\n`;
    md += `Для восстановления страниц из бэкапа используйте скрипт:\n`;
    md += `\`\`\`bash\n`;
    md += `cd mgts-backend/scripts\n`;
    md += `export STRAPI_API_TOKEN="your_token_here"\n`;
    md += `node restore-strapi-pages.js --backup-dir="${BACKUP_SUBDIR}"\n`;
    md += `\`\`\`\n\n`;
    
    md += `## ⚠️ Важно\n\n`;
    md += `- Бэкап содержит полный контент всех страниц\n`;
    md += `- Сохраните эту директорию до завершения миграции\n`;
    md += `- После успешной миграции бэкап можно архивировать\n\n`;
    
    fs.writeFileSync(BACKUP_REPORT_FILE, md, 'utf-8');
    console.log(`📄 Отчет о бэкапе сохранен: ${BACKUP_REPORT_FILE}\n`);
}

/**
 * Главная функция
 */
async function main() {
    console.log('💾 Создание бэкапа страниц Strapi\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // 1. Загрузить все страницы
        const pages = await loadAllPages();
        
        if (pages.length === 0) {
            console.log('⚠️  В Strapi нет страниц для бэкапа\n');
            return;
        }
        
        // 2. Сохранить бэкап
        const backupIndex = saveBackup(pages);
        
        // 3. Создать отчет
        createBackupReport(backupIndex);
        
        console.log('✅ Бэкап успешно создан!\n');
        console.log('📊 Результаты:');
        console.log(`   - Всего страниц: ${backupIndex.totalPages}`);
        console.log(`   - Директория: ${BACKUP_SUBDIR}`);
        console.log(`   - Файлов создано: ${backupIndex.totalPages + 1}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при создании бэкапа:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, loadAllPages, saveBackup };
