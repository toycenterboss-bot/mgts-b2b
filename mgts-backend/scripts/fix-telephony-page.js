/**
 * Скрипт для исправления конкретной страницы business/telephony
 * Приводит HTML к правильной структуре согласно типизации
 */

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
async function updatePage(pageId, content) {
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
 * Исправить HTML для business/telephony
 */
function fixTelephonyHTML(originalHTML) {
    // 1. Удалить hero-content полностью
    let html = originalHTML.replace(/<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>[\s\S]*?<div[^>]*class=["'][^"']*hero-content[^"']*["'][^>]*>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi, '');
    html = html.replace(/<div[^>]*class=["'][^"']*hero-content[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    html = html.trim();
    
    // 2. Разделить на секции правильно
    // Первая секция: услуги (карточки)
    // Вторая секция: преимущества (grid)
    // Третья секция: форма заказа (уже правильная)
    
    // Найти первую секцию с классом "service"
    const firstSectionMatch = html.match(/<section[^>]*class=["'][^"']*service[^"']*["'][^>]*>([\s\S]*?)<\/section>/i);
    
    if (firstSectionMatch) {
        const firstSectionContent = firstSectionMatch[1];
        
        // Разделить на две части: карточки услуг и преимущества
        const cardsMatch = firstSectionContent.match(/(<h2>Фиксированная телефония<\/h2>[\s\S]*?)(<h2>Преимущества[\s\S]*?<\/section>)/i);
        
        if (cardsMatch) {
            const cardsContent = cardsMatch[1];
            const advantagesContent = cardsMatch[2].replace(/<\/section>$/, '');
            
            // Создать правильную структуру
            const fixedHTML = `<section class="section">
    <div class="container">
        ${cardsContent.trim()}
    </div>
</section>

<section class="section">
    <div class="container">
        ${advantagesContent.trim()}
    </div>
</section>

${html.substring(html.indexOf('<section class="service-order"'))}`;
            
            return fixedHTML;
        }
    }
    
    // Если не удалось разделить, просто исправить классы
    html = html.replace(/class=["']service["']/gi, 'class="section"');
    
    // Убедиться что все секции имеют container
    html = html.replace(/<section([^>]*)>([\s\S]*?)<\/section>/gi, (match, attrs, content) => {
        if (!content.includes('class="container"') && !content.includes("class='container'")) {
            return `<section${attrs}>\n    <div class="container">\n        ${content.trim()}\n    </div>\n</section>`;
        }
        return match;
    });
    
    return html;
}

/**
 * Основная функция
 */
async function fixTelephonyPage() {
    try {
        console.log('\n=== ИСПРАВЛЕНИЕ СТРАНИЦЫ: business/telephony ===\n');
        
        // Получить страницу
        console.log('Получение страницы из Strapi...');
        const page = await getPage('business/telephony');
        const originalContent = page.attributes?.content || page.content || '';
        
        if (!originalContent) {
            console.log('⚠️ Страница не имеет контента');
            return;
        }
        
        console.log(`Длина оригинального контента: ${originalContent.length} символов\n`);
        
        // Исправить HTML
        console.log('Исправление HTML...');
        const fixedContent = fixTelephonyHTML(originalContent);
        console.log(`Длина исправленного контента: ${fixedContent.length} символов\n`);
        
        // Показать изменения
        if (originalContent !== fixedContent) {
            console.log('📝 ИЗМЕНЕНИЯ:');
            console.log('--- Оригинал (первые 500 символов):');
            console.log(originalContent.substring(0, 500));
            console.log('\n--- Исправлено (первые 500 символов):');
            console.log(fixedContent.substring(0, 500));
            console.log('\n--- Полный исправленный HTML:');
            console.log(fixedContent);
            console.log('');
            
            // Спросить подтверждение
            console.log('⚠️  ВНИМАНИЕ: Страница будет обновлена в Strapi!');
            console.log('Для применения изменений запустите скрипт без --dry-run');
            console.log('Или используйте: node fix-telephony-page.js --apply\n');
        } else {
            console.log('✅ Изменений не требуется');
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Проверить аргументы
const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');

if (shouldApply) {
    // Применить изменения
    fixTelephonyPage().then(() => {
        console.log('\n✅ Готово! Теперь нужно обновить страницу в Strapi вручную или использовать updatePage');
    });
} else {
    // Только показать изменения
    fixTelephonyPage();
}


