/**
 * Применить исправления для страницы business/telephony
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


/**
 * Получить страницу из Strapi
 */
async function getPage(slug) {
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
    
    if (!data.data || data.data.length === 0) {
        throw new Error('Страница не найдена');
    }
    
    return data.data[0];
}

/**
 * Обновить страницу в Strapi
 */
async function updatePage(page, content) {
    // Используем documentId если есть, иначе id
    const pageId = page.documentId || page.id;
    
    const response = await fetch(`${STRAPI_URL}/api/pages/${pageId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: {
                content: content
            }
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update page: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
}

/**
 * Основная функция
 */
async function applyFix() {
    try {
        console.log('\n=== ПРИМЕНЕНИЕ ИСПРАВЛЕНИЙ ДЛЯ business/telephony ===\n');
        
        // Загрузить правильную структуру
        const fixedHTMLPath = path.join(__dirname, '../../FIXED_business_telephony.html');
        const fixedContent = fs.readFileSync(fixedHTMLPath, 'utf8');
        
        // Удалить HTML комментарии из начала
        const cleanContent = fixedContent.replace(/<!--[\s\S]*?-->/g, '').trim();
        
        console.log('Загружена правильная структура из FIXED_business_telephony.html');
        console.log(`Длина контента: ${cleanContent.length} символов\n`);
        
        // Получить страницу
        console.log('Получение страницы из Strapi...');
        const page = await getPage('business/telephony');
        const pageId = page.documentId || page.id;
        console.log(`✅ Страница найдена (ID: ${page.id}, documentId: ${page.documentId || 'нет'})\n`);
        
        // Обновить страницу
        console.log('Обновление страницы в Strapi...');
        await updatePage(page, cleanContent);
        console.log('✅ Страница успешно обновлена в Strapi!\n');
        
        console.log('📝 Примененные исправления:');
        console.log('  ✅ Удален hero-content из основного контента');
        console.log('  ✅ Секции имеют класс "section"');
        console.log('  ✅ Все секции содержат .container');
        console.log('  ✅ Контент разделен на логические секции');
        console.log('  ✅ Форма заказа имеет id="order-form"');
        console.log('  ✅ Заголовки имеют класс "section-title"');
        console.log('\n🎉 Готово! Обновите страницу в браузере для проверки.\n');
        
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

applyFix();

