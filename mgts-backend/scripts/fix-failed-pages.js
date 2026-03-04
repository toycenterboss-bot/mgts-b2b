/**
 * Скрипт для исправления и создания двух проблемных страниц
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

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');

const VALID_SECTIONS = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts', 'news', 'home', 'other'];

function normalizeSection(section) {
    if (!section || typeof section !== 'string') return 'other';
    const normalized = section.trim().toLowerCase();
    return VALID_SECTIONS.includes(normalized) ? normalized : 'other';
}

async function fixIndexPage() {
    console.log('🔧 Исправление index.json...\n');
    
    const filePath = path.join(NORMALIZED_DIR, 'index.json');
    const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Определяем slug и title из URL или других данных
    const url = pageData.url || pageData.originalUrl || '';
    let slug = pageData.slug;
    let title = pageData.title;
    
    if (!slug) {
        // Пробуем извлечь из URL
        if (url.includes('business.mgts.ru')) {
            slug = 'main_page';
        } else {
            slug = 'index';
        }
    }
    
    if (!title) {
        title = pageData.heroTitle || 'Главная страница';
    }
    
    console.log(`   Slug: ${slug}`);
    console.log(`   Title: ${title}\n`);
    
    try {
        const section = normalizeSection(pageData.section || 'home');
        const pagePayload = {
            data: {
                slug: slug,
                title: title,
                heroTitle: pageData.heroTitle || null,
                heroSubtitle: pageData.heroSubtitle || null,
                metaDescription: pageData.metaDescription || null,
                metaKeywords: pageData.metaKeywords || null,
                section: section,
                order: 0,
                originalUrl: url,
                isMenuVisible: true,
                content: pageData.normalizedHTML || '',
                sidebar: 'none',
                publishedAt: new Date().toISOString()
            }
        };
        
        const response = await api.post('/pages', pagePayload);
        console.log(`✅ Страница ${slug} успешно создана! ID: ${response.data.data.id}\n`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка при создании ${slug}:`, error.response?.data?.error?.message || error.message);
        if (error.response?.data?.error?.details) {
            console.error('   Детали:', JSON.stringify(error.response.data.error.details, null, 2));
        }
        if (error.response) {
            console.error('   Полный ответ:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function fixInfoformenPage() {
    console.log('🔧 Исправление infoformen.json (большая страница)...\n');
    
    const filePath = path.join(NORMALIZED_DIR, 'infoformen.json');
    const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const htmlSize = pageData.normalizedHTML ? pageData.normalizedHTML.length : 0;
    const sizeMB = htmlSize / 1024 / 1024;
    
    console.log(`   Slug: ${pageData.slug}`);
    console.log(`   Title: ${pageData.title}`);
    console.log(`   HTML размер: ${sizeMB.toFixed(2)} MB\n`);
    
    // Пробуем создать страницу с усеченным контентом или без контента
    try {
        const section = normalizeSection(pageData.section || 'about_mgts');
        
        // Если контент слишком большой, сохраняем только первые 500KB
        let content = pageData.normalizedHTML || '';
        if (content.length > 500 * 1024) {
            console.log('⚠️  Контент слишком большой, усекаем до 500KB...\n');
            content = content.substring(0, 500 * 1024) + '\n\n<!-- Контент обрезан из-за размера -->';
        }
        
        const pagePayload = {
            data: {
                slug: pageData.slug,
                title: pageData.title,
                heroTitle: pageData.heroTitle || null,
                heroSubtitle: pageData.heroSubtitle || null,
                metaDescription: pageData.metaDescription || null,
                metaKeywords: pageData.metaKeywords || null,
                section: section,
                order: 0,
                originalUrl: pageData.originalUrl || pageData.url || '',
                isMenuVisible: true,
                content: content,
                sidebar: section === 'about_mgts' ? 'about' : 'none',
                publishedAt: new Date().toISOString()
            }
        };
        
        const response = await api.post('/pages', pagePayload);
        console.log(`✅ Страница ${pageData.slug} успешно создана! ID: ${response.data.data.id}\n`);
        console.log(`⚠️  ВНИМАНИЕ: Контент был усечен из-за размера.`);
        console.log(`   Полный контент можно добавить позже или разбить на части.\n`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка при создании ${pageData.slug}:`, error.response?.data?.error?.message || error.message);
        if (error.response?.data?.error?.details) {
            console.error('   Детали:', JSON.stringify(error.response.data.error.details, null, 2));
        }
        if (error.response) {
            console.error('   Статус:', error.response.status);
            if (error.response.status === 413) {
                console.error('   ⚠️  Страница слишком большая. Нужно увеличить лимит размера запроса в Strapi или разбить контент.');
            }
        }
        return false;
    }
}

async function main() {
    console.log('🔧 Исправление проблемных страниц\n');
    console.log('='.repeat(60) + '\n');
    
    const results = {
        index: false,
        infoformen: false
    };
    
    // Исправляем index.json
    results.index = await fixIndexPage();
    
    // Исправляем infoformen.json
    results.infoformen = await fixInfoformenPage();
    
    console.log('='.repeat(60) + '\n');
    console.log('📊 Результаты:\n');
    console.log(`   index.json: ${results.index ? '✅ Создана' : '❌ Ошибка'}`);
    console.log(`   infoformen.json: ${results.infoformen ? '✅ Создана' : '❌ Ошибка'}\n`);
    
    if (results.index && results.infoformen) {
        console.log('✅ Все проблемные страницы успешно созданы!\n');
    } else {
        console.log('⚠️  Некоторые страницы не удалось создать.\n');
    }
}

// Запуск
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = { fixIndexPage, fixInfoformenPage };
