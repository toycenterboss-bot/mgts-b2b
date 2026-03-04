/**
 * Нормализация div элементов согласно типизации
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


/**
 * Получить все страницы из Strapi
 */
async function getAllPages() {
    const response = await fetch(`${STRAPI_URL}/api/pages?pagination[pageSize]=100&populate=*`, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
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
 * Нормализация div элементов
 */
function normalizeDivs(html, isMainPage = false) {
    let fixed = html;
    
    // 1. Заменить container-mgts на container (если не главная страница)
    if (!isMainPage) {
        fixed = fixed.replace(/class=["']([^"']*)\bcontainer-mgts\b([^"']*)["']/gi, (match, before, after) => {
            const classes = (before + ' ' + after).trim().split(/\s+/).filter(c => c && c !== 'container-mgts');
            if (!classes.includes('container')) {
                classes.push('container');
            }
            return `class="${classes.join(' ')}"`;
        });
    }
    
    // 2. Удалить inline стили из div (кроме специфичных случаев)
    // Оставляем стили только для элементов форм и специальных случаев
    fixed = fixed.replace(/<div([^>]*)\s+style=["']([^"']*)["']([^>]*)>/gi, (match, before, style, after) => {
        // Пропускаем стили для order-form элементов
        if (before.includes('order-form') || after.includes('order-form')) {
            return match;
        }
        // Удаляем стили для остальных
        return `<div${before}${after}>`;
    });
    
    // 3. Нормализация tariff-price (если используется вместо tariff-card__price)
    // Оставляем как есть, так как оба варианта допустимы
    
    return fixed;
}

/**
 * Проверить, нужна ли нормализация
 */
function needsNormalization(html, isMainPage = false) {
    if (isMainPage) {
        // Для главной страницы проверяем только inline стили (кроме форм)
        return /<div[^>]*\s+style=["'][^"']*["'][^>]*>/i.test(html) && 
               !/<div[^>]*order-form[^>]*\s+style=["']/i.test(html);
    } else {
        // Для остальных страниц проверяем container-mgts и inline стили
        return /container-mgts/i.test(html) || 
               (/<div[^>]*\s+style=["'][^"']*["'][^>]*>/i.test(html) && 
                !/<div[^>]*order-form[^>]*\s+style=["']/i.test(html));
    }
}

/**
 * Основная функция
 */
async function normalizeAllPages(dryRun = false, specificSlug = null) {
    try {
        console.log('\n=== НОРМАЛИЗАЦИЯ DIV ЭЛЕМЕНТОВ ===\n');
        
        if (dryRun) {
            console.log('🔍 РЕЖИМ ПРОВЕРКИ - изменения не будут сохранены\n');
        }
        
        // Получить страницы
        let pages;
        if (specificSlug) {
            console.log(`Получение страницы: ${specificSlug}...`);
            const page = await getPage(specificSlug);
            pages = [page];
        } else {
            console.log('Получение списка всех страниц из Strapi...');
            pages = await getAllPages();
        }
        
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const results = {
            total: pages.length,
            normalized: [],
            skipped: [],
            errors: []
        };
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const slug = page.attributes?.slug || page.slug;
            const title = page.attributes?.title || page.title || 'Без заголовка';
            const originalContent = page.attributes?.content || page.content || '';
            const isMainPage = slug === 'main_page' || slug === 'index';
            
            console.log(`[${i + 1}/${pages.length}] ${slug} (${title})`);
            
            if (!originalContent || originalContent.trim().length < 50) {
                console.log('  ⏭️  Пропущено: нет контента\n');
                results.skipped.push({ slug, title, reason: 'нет контента' });
                continue;
            }
            
            // Проверить, нужна ли нормализация
            if (!needsNormalization(originalContent, isMainPage)) {
                console.log('  ✅ Не требует нормализации\n');
                results.skipped.push({ slug, title, reason: 'не требует нормализации' });
                continue;
            }
            
            try {
                // Нормализовать HTML
                const normalizedContent = normalizeDivs(originalContent, isMainPage);
                
                if (originalContent === normalizedContent) {
                    console.log('  ⏭️  Изменений не требуется\n');
                    results.skipped.push({ slug, title, reason: 'изменений не требуется' });
                    continue;
                }
                
                console.log(`  📝 Нормализация применена (${originalContent.length} → ${normalizedContent.length} символов)`);
                
                if (!dryRun) {
                    await updatePage(page, normalizedContent);
                    console.log('  ✅ Обновлено в Strapi');
                } else {
                    console.log('  🔍 Режим проверки: изменения не сохранены');
                }
                
                results.normalized.push({ slug, title });
                console.log('');
                
                // Небольшая задержка между запросами
                if (!dryRun && i < pages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`  ❌ Ошибка: ${error.message}\n`);
                results.errors.push({ slug, title, error: error.message });
            }
        }
        
        // Итоги
        console.log('\n=== ИТОГИ ===\n');
        console.log(`Всего страниц: ${results.total}`);
        console.log(`✅ Нормализовано: ${results.normalized.length}`);
        console.log(`⏭️  Пропущено: ${results.skipped.length}`);
        console.log(`❌ Ошибок: ${results.errors.length}\n`);
        
        if (results.normalized.length > 0) {
            console.log('✅ НОРМАЛИЗОВАННЫЕ СТРАНИЦЫ:');
            results.normalized.forEach(page => {
                console.log(`   - ${page.slug} (${page.title})`);
            });
            console.log('');
        }
        
        if (results.errors.length > 0) {
            console.log('❌ ОШИБКИ:');
            results.errors.forEach(page => {
                console.log(`   - ${page.slug}: ${page.error}`);
            });
            console.log('');
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Получить аргументы
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const specificSlug = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

normalizeAllPages(dryRun, specificSlug || null);


