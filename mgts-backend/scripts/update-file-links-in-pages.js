/**
 * Скрипт для обновления ссылок на файлы в контенте страниц
 * Заменяет старые URL файлов на новые из Strapi Media Library
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

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

const FILES_REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/files-migration-report.json');
const UPDATE_REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/file-links-update-report.json');

/**
 * Главная функция
 */
async function main() {
    console.log('🔗 Обновление ссылок на файлы в страницах\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем отчет о миграции файлов
    if (!fs.existsSync(FILES_REPORT_FILE)) {
        console.error(`❌ Файл не найден: ${FILES_REPORT_FILE}`);
        console.error('   Сначала запустите migrate-files.js');
        process.exit(1);
    }
    
    const filesReport = JSON.parse(fs.readFileSync(FILES_REPORT_FILE, 'utf-8'));
    const uploadedFiles = filesReport.uploadedToStrapi || [];
    
    // Создаем карту старый URL -> новый URL
    const urlMap = new Map();
    uploadedFiles.forEach(file => {
        const oldUrl = file.url;
        const newUrl = file.strapiUrl ? (file.strapiUrl.startsWith('http') ? file.strapiUrl : `${STRAPI_URL}${file.strapiUrl}`) : null;
        
        if (!newUrl) {
            return;
        }
        
        // Добавляем все варианты старого URL
        const urlVariants = [
            oldUrl, // Полный URL
            oldUrl.replace('https://business.mgts.ru', ''), // Без домена
            oldUrl.replace('https://', ''), // Без протокола
            oldUrl.replace('http://', ''), // Без протокола http
            `/static/files/${file.filename}`, // Относительный путь
            `static/files/${file.filename}` // Без начального слеша
        ];
        
        urlVariants.forEach(variant => {
            if (variant) {
                urlMap.set(variant, newUrl);
            }
        });
    });
    
    console.log(`📦 Загружено файлов для замены: ${urlMap.size}\n`);
    
    // Загружаем все страницы
    let allPages = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const response = await api.get('/pages', {
            params: {
                'pagination[page]': page,
                'pagination[pageSize]': 100
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
    
    console.log(`📦 Загружено страниц из Strapi: ${allPages.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        total: allPages.length,
        updated: [],
        failed: [],
        skipped: []
    };
    
    // Обновляем каждую страницу
    for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        // В Strapi v5 используем documentId для обновления, если есть
        const pageId = page.documentId || page.id || (page.data && (page.data.documentId || page.data.id));
        const pageSlug = page.slug || page.attributes?.slug || (page.data && (page.data.slug || page.data.attributes?.slug));
        const content = page.content || page.attributes?.content || (page.data && (page.data.content || page.data.attributes?.content)) || '';
        
        if (!content || typeof content !== 'string') {
            results.skipped.push({
                slug: pageSlug,
                reason: 'Нет контента или контент не строка'
            });
            continue;
        }
        
        let updatedContent = content;
        let hasChanges = false;
        let changesCount = 0;
        
        // Заменяем ссылки на файлы
        urlMap.forEach((newUrl, oldUrl) => {
            // Ищем все варианты старого URL в контенте
            const escapedOldUrl = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const patterns = [
                new RegExp(`href=["']${escapedOldUrl}["']`, 'gi'),
                new RegExp(`href=["']${escapedOldUrl.replace('https://business.mgts.ru', '')}["']`, 'gi'),
                // Также ищем в src атрибутах
                new RegExp(`src=["']${escapedOldUrl}["']`, 'gi'),
                new RegExp(`src=["']${escapedOldUrl.replace('https://business.mgts.ru', '')}["']`, 'gi')
            ];
            
            patterns.forEach(pattern => {
                if (pattern.test(updatedContent)) {
                    updatedContent = updatedContent.replace(pattern, (match) => {
                        changesCount++;
                        return match.replace(oldUrl, newUrl);
                    });
                    hasChanges = true;
                }
            });
        });
        
        if (hasChanges) {
            try {
                await api.put(`/pages/${pageId}`, {
                    data: {
                        content: updatedContent
                    }
                });
                
                results.updated.push({
                    slug: pageSlug,
                    id: pageId,
                    documentId: page.documentId,
                    numericId: page.id,
                    changesCount: changesCount
                });
                
                console.log(`[${i + 1}/${allPages.length}] ${pageSlug}: ✅ Обновлено ${changesCount} ссылок на файлы`);
            } catch (error) {
                const status = error.response?.status;
                const errorMsg = error.response?.data?.error?.message || error.message;
                console.error(`[${i + 1}/${allPages.length}] ${pageSlug}: ❌ Ошибка ${status || 'unknown'} - ${errorMsg}`);
                results.failed.push({
                    slug: pageSlug,
                    error: errorMsg,
                    status: status,
                    id: pageId
                });
            }
        } else {
            results.skipped.push({
                slug: pageSlug,
                reason: 'Нет ссылок на файлы для замены'
            });
        }
    }
    
    // Сохраняем отчет
    fs.writeFileSync(UPDATE_REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log(`\n✅ Обновление завершено:\n`);
    console.log(`   Обновлено: ${results.updated.length}`);
    console.log(`   Пропущено: ${results.skipped.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    console.log(`📄 Отчет сохранен: ${UPDATE_REPORT_FILE}\n`);
    
    return results;
}

// Запуск
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = { main };
