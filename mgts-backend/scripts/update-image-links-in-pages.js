/**
 * Скрипт для обновления ссылок на изображения в контенте страниц
 * Заменяет старые URL на новые из Strapi Media Library
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

const IMAGES_REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/images-migration-report.json');
const UPDATE_REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/images-links-update-report.json');

/**
 * Главная функция
 */
async function main() {
    console.log('🔗 Обновление ссылок на изображения в страницах\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем отчет о миграции изображений
    if (!fs.existsSync(IMAGES_REPORT_FILE)) {
        console.error(`❌ Файл не найден: ${IMAGES_REPORT_FILE}`);
        console.error('   Сначала запустите migrate-images.js');
        process.exit(1);
    }
    
    const imagesReport = JSON.parse(fs.readFileSync(IMAGES_REPORT_FILE, 'utf-8'));
    const uploadedImages = imagesReport.uploaded || [];
    
    // Создаем карту старый URL -> новый URL
    const urlMap = new Map();
    uploadedImages.forEach(img => {
        const oldUrl = img.url;
        // Strapi возвращает URL в формате /uploads/...
        const newUrl = img.strapiUrl ? (img.strapiUrl.startsWith('http') ? img.strapiUrl : `${STRAPI_URL}${img.strapiUrl}`) : null;
        
        if (!newUrl) {
            console.warn(`⚠️  Нет Strapi URL для ${img.filename}`);
            return;
        }
        
        // Добавляем все варианты старого URL
        const urlVariants = [
            oldUrl, // Полный URL
            oldUrl.replace('https://business.mgts.ru', ''), // Без домена
            oldUrl.replace('https://', ''), // Без протокола
            oldUrl.replace('http://', ''), // Без протокола http
            `/images/${img.filename}`, // Относительный путь
            `images/${img.filename}` // Без начального слеша
        ];
        
        urlVariants.forEach(variant => {
            if (variant) {
                urlMap.set(variant, newUrl);
            }
        });
    });
    
    console.log(`📦 Загружено изображений для замены: ${urlMap.size}\n`);
    
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
        const pageId = page.id || (page.data && page.data.id);
        const pageSlug = page.attributes?.slug || page.slug || (page.data && page.data.slug);
        const content = page.attributes?.content || page.content || (page.data && page.data.content) || '';
        
        if (!content || typeof content !== 'string') {
            results.skipped.push({
                slug: pageSlug,
                reason: 'Нет контента или контент не строка'
            });
            continue;
        }
        
        let updatedContent = content;
        let hasChanges = false;
        
        // Заменяем ссылки на изображения
        urlMap.forEach((newUrl, oldUrl) => {
            // Ищем все варианты старого URL в контенте
            const patterns = [
                new RegExp(`src=["']${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi'),
                new RegExp(`src=["']${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('https://business.mgts.ru', '')}["']`, 'gi'),
                new RegExp(`href=["']${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi')
            ];
            
            patterns.forEach(pattern => {
                if (pattern.test(updatedContent)) {
                    updatedContent = updatedContent.replace(pattern, (match) => {
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
                    id: pageId
                });
                
                if (results.updated.length % 10 === 0) {
                    console.log(`  Обновлено: ${results.updated.length} страниц...`);
                }
            } catch (error) {
                results.failed.push({
                    slug: pageSlug,
                    error: error.message
                });
            }
        } else {
            results.skipped.push({
                slug: pageSlug,
                reason: 'Нет изображений для замены'
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
