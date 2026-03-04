/**
 * Проверка и исправление иерархии классов
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
 * Проверить и исправить иерархию классов
 */
function fixHierarchy(html) {
    let fixed = html;
    const issues = [];
    
    // 1. Проверить grid-item без grid
    const gridItemWithoutGrid = /<div[^>]*class=["'][^"']*\bgrid-item\b[^"']*["'][^>]*>/gi;
    let match;
    
    while ((match = gridItemWithoutGrid.exec(fixed)) !== null) {
        const beforeMatch = fixed.substring(0, match.index);
        const afterMatch = fixed.substring(match.index);
        
        // Проверить, есть ли grid перед grid-item
        const gridBefore = beforeMatch.match(/<div[^>]*class=["'][^"']*\bgrid\b[^"']*["'][^>]*>/i);
        
        if (!gridBefore) {
            // Найти закрывающий тег grid-item
            const closingTag = afterMatch.match(/<\/div>/);
            if (closingTag) {
                const gridItemContent = afterMatch.substring(0, closingTag.index + closingTag[0].length);
                // Обернуть в grid
                fixed = fixed.substring(0, match.index) + 
                       '<div class="grid">' + gridItemContent + '</div>' + 
                       afterMatch.substring(closingTag.index + closingTag[0].length);
                issues.push('grid-item обернут в grid');
            }
        }
    }
    
    // 2. Проверить card-body без card
    const cardBodyWithoutCard = /<div[^>]*class=["'][^"']*\bcard-body\b[^"']*["'][^>]*>/gi;
    match = null;
    
    while ((match = cardBodyWithoutCard.exec(fixed)) !== null) {
        const beforeMatch = fixed.substring(0, match.index);
        
        // Проверить, есть ли card перед card-body
        const cardBefore = beforeMatch.match(/<div[^>]*class=["'][^"']*\bcard\b[^"']*["'][^>]*>/i);
        
        if (!cardBefore) {
            // Найти закрывающий тег card-body
            const afterMatch = fixed.substring(match.index);
            const closingTag = afterMatch.match(/<\/div>/);
            if (closingTag) {
                const cardBodyContent = afterMatch.substring(0, closingTag.index + closingTag[0].length);
                // Обернуть в card
                fixed = fixed.substring(0, match.index) + 
                       '<div class="card">' + cardBodyContent + '</div>' + 
                       afterMatch.substring(closingTag.index + closingTag[0].length);
                issues.push('card-body обернут в card');
            }
        }
    }
    
    // 3. Проверить tariff-card без tariffs-grid
    const tariffCardWithoutGrid = /<div[^>]*class=["'][^"']*\btariff-card\b[^"']*["'][^>]*>/gi;
    match = null;
    
    while ((match = tariffCardWithoutGrid.exec(fixed)) !== null) {
        const beforeMatch = fixed.substring(0, match.index);
        
        // Проверить, есть ли tariffs-grid перед tariff-card
        const tariffsGridBefore = beforeMatch.match(/<div[^>]*class=["'][^"']*\btariffs-grid\b[^"']*["'][^>]*>/i);
        
        if (!tariffsGridBefore) {
            // Найти все tariff-card до следующей секции или конца
            const afterMatch = fixed.substring(match.index);
            const nextSection = afterMatch.match(/<\/section>|<section/);
            const endPos = nextSection ? nextSection.index : afterMatch.length;
            
            // Найти все tariff-card в этом блоке
            const tariffCardsBlock = afterMatch.substring(0, endPos);
            const allTariffCards = tariffCardsBlock.match(/<div[^>]*class=["'][^"']*\btariff-card\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi);
            
            if (allTariffCards) {
                // Обернуть все в tariffs-grid
                const wrapped = '<div class="tariffs-grid">' + allTariffCards.join('\n') + '</div>';
                fixed = fixed.substring(0, match.index) + wrapped + afterMatch.substring(endPos);
                issues.push('tariff-card обернут в tariffs-grid');
            }
        }
    }
    
    // 4. Проверить faq-item без faq-list
    const faqItemWithoutList = /<div[^>]*class=["'][^"']*\bfaq-item\b[^"']*["'][^>]*>/gi;
    match = null;
    
    while ((match = faqItemWithoutList.exec(fixed)) !== null) {
        const beforeMatch = fixed.substring(0, match.index);
        
        // Проверить, есть ли faq-list перед faq-item
        const faqListBefore = beforeMatch.match(/<div[^>]*class=["'][^"']*\bfaq-list\b[^"']*["'][^>]*>/i);
        
        if (!faqListBefore) {
            // Найти все faq-item до следующей секции или конца
            const afterMatch = fixed.substring(match.index);
            const nextSection = afterMatch.match(/<\/section>|<section/);
            const endPos = nextSection ? nextSection.index : afterMatch.length;
            
            const faqItemsBlock = afterMatch.substring(0, endPos);
            const allFaqItems = faqItemsBlock.match(/<div[^>]*class=["'][^"']*\bfaq-item\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi);
            
            if (allFaqItems) {
                const wrapped = '<div class="faq-list">' + allFaqItems.join('\n') + '</div>';
                fixed = fixed.substring(0, match.index) + wrapped + afterMatch.substring(endPos);
                issues.push('faq-item обернут в faq-list');
            }
        }
    }
    
    return { fixed, issues };
}

/**
 * Основная функция
 */
async function checkAllHierarchies(dryRun = false) {
    try {
        console.log('\n=== ПРОВЕРКА ИЕРАРХИИ КЛАССОВ ===\n');
        
        if (dryRun) {
            console.log('🔍 РЕЖИМ ПРОВЕРКИ - изменения не будут сохранены\n');
        }
        
        console.log('Получение списка страниц из Strapi...');
        const pages = await getAllPages();
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const results = {
            total: pages.length,
            fixed: [],
            ok: [],
            errors: []
        };
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const slug = page.attributes?.slug || page.slug;
            const title = page.attributes?.title || page.title || 'Без заголовка';
            const originalContent = page.attributes?.content || page.content || '';
            
            console.log(`[${i + 1}/${pages.length}] ${slug} (${title})`);
            
            if (!originalContent || originalContent.trim().length < 50) {
                console.log('  ⏭️  Пропущено: нет контента\n');
                results.ok.push({ slug, title, reason: 'нет контента' });
                continue;
            }
            
            try {
                const { fixed, issues } = fixHierarchy(originalContent);
                
                if (issues.length === 0) {
                    console.log('  ✅ Иерархия корректна\n');
                    results.ok.push({ slug, title });
                } else {
                    console.log(`  📝 Найдено проблем: ${issues.length}`);
                    issues.forEach(issue => console.log(`     - ${issue}`));
                    
                    if (!dryRun) {
                        const { updatePage } = require('./normalize-div-elements.js');
                        // Используем функцию из другого скрипта
                        const response = await fetch(`${STRAPI_URL}/api/pages/${page.documentId || page.id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${API_TOKEN}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                data: { content: fixed }
                            })
                        });
                        
                        if (response.ok) {
                            console.log('  ✅ Исправлено в Strapi');
                            results.fixed.push({ slug, title, issues });
                        } else {
                            throw new Error(`Failed to update: ${response.status}`);
                        }
                    } else {
                        console.log('  🔍 Режим проверки: изменения не сохранены');
                    }
                    console.log('');
                }
                
            } catch (error) {
                console.error(`  ❌ Ошибка: ${error.message}\n`);
                results.errors.push({ slug, title, error: error.message });
            }
        }
        
        // Итоги
        console.log('\n=== ИТОГИ ===\n');
        console.log(`Всего страниц: ${results.total}`);
        console.log(`✅ Исправлено: ${results.fixed.length}`);
        console.log(`✅ Корректно: ${results.ok.length}`);
        console.log(`❌ Ошибок: ${results.errors.length}\n`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Получить аргументы
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

checkAllHierarchies(dryRun);


