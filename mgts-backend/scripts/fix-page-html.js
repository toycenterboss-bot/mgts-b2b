/**
 * Скрипт для автоматического исправления HTML страницы согласно типизации
 * Исправляет структуру, добавляет недостающие классы и элементы
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
 * Удалить hero-content из контента
 */
function removeHeroContent(html) {
    // Удалить hero-content и его обертку
    html = html.replace(/<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>[\s\S]*?<div[^>]*class=["'][^"']*hero-content[^"']*["'][^>]*>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi, '');
    // Удалить оставшиеся hero-content
    html = html.replace(/<div[^>]*class=["'][^"']*hero-content[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    return html.trim();
}

/**
 * Исправить секции: добавить класс section и container где нужно
 */
function fixSections(html) {
    // Найти все секции (с учетом вложенности)
    const sectionRegex = /<section([^>]*)>([\s\S]*?)<\/section>/gi;
    let fixedHtml = html;
    const sections = [];
    let match;
    
    // Собрать все секции с их позициями
    while ((match = sectionRegex.exec(html)) !== null) {
        sections.push({
            full: match[0],
            attrs: match[1],
            content: match[2],
            index: match.index
        });
    }
    
    // Обработать секции в обратном порядке (чтобы не сбить индексы)
    sections.reverse().forEach(section => {
        let attrs = section.attrs;
        let content = section.content;
        
        // Проверить классы
        const classMatch = attrs.match(/class=["']([^"']+)["']/i);
        let classes = classMatch ? classMatch[1].split(/\s+/) : [];
        
        // Если это специальная секция (service-*), оставить как есть, но убедиться что есть container
        const isSpecial = classes.some(c => c.startsWith('service-'));
        
        if (!isSpecial) {
            // Для обычных секций: заменить "service" на "section" или добавить "section"
            if (classes.includes('service') && !classes.includes('section')) {
                classes = classes.filter(c => c !== 'service');
                classes.push('section');
            } else if (!classes.includes('section')) {
                classes.push('section');
            }
            
            // Обновить атрибуты
            if (classMatch) {
                attrs = attrs.replace(/class=["']([^"']+)["']/i, `class="${classes.join(' ')}"`);
            } else {
                attrs = `class="${classes.join(' ')}" ${attrs}`.trim();
            }
        }
        
        // Проверить наличие container
        const hasContainer = content.includes('<div class="container">') || 
                            content.includes("<div class='container'>") ||
                            content.includes('<div class="container"') ||
                            content.includes("<div class='container'");
        
        if (!hasContainer) {
            // Обернуть содержимое в container
            const indentedContent = content.split('\n').map(line => '            ' + line).join('\n');
            content = `\n        <div class="container">\n${indentedContent}\n        </div>\n    `;
        }
        
        // Собрать исправленную секцию
        const fixedSection = `<section${attrs}>${content}</section>`;
        fixedHtml = fixedHtml.substring(0, section.index) + fixedSection + fixedHtml.substring(section.index + section.full.length);
    });
    
    return fixedHtml;
}

/**
 * Исправить структуру: обернуть контент без секций в секцию
 */
function wrapContentInSections(html) {
    // Если есть контент вне секций, обернуть его
    const trimmed = html.trim();
    
    // Если весь контент не в секциях
    if (!trimmed.startsWith('<section')) {
        // Проверить, есть ли секции вообще
        if (!trimmed.includes('<section')) {
            // Весь контент без секций - обернуть в секцию
            return `<section class="section">\n    <div class="container">\n        ${trimmed}\n    </div>\n</section>`;
        } else {
            // Есть и контент, и секции - обернуть контент до первой секции
            const firstSectionIndex = trimmed.indexOf('<section');
            const contentBefore = trimmed.substring(0, firstSectionIndex).trim();
            const contentAfter = trimmed.substring(firstSectionIndex);
            
            if (contentBefore) {
                return `<section class="section">\n    <div class="container">\n        ${contentBefore}\n    </div>\n</section>\n\n${contentAfter}`;
            }
        }
    }
    
    return html;
}

/**
 * Исправить карточки: убедиться что они правильно структурированы
 */
function fixCards(html) {
    // Если есть карточки вне grid, обернуть их в grid
    let fixed = html;
    
    // Найти секции с карточками, но без grid
    const sectionWithCardsRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    let match;
    
    while ((match = sectionWithCardsRegex.exec(html)) !== null) {
        const sectionContent = match[1];
        const hasCards = /<div[^>]*class=["'][^"']*card[^"']*["']/i.test(sectionContent);
        const hasGrid = /<div[^>]*class=["'][^"']*grid[^"']*["']/i.test(sectionContent);
        
        if (hasCards && !hasGrid) {
            // Обернуть карточки в grid
            const cardsRegex = /(<div[^>]*class=["'][^"']*card[^"']*["'][^>]*>[\s\S]*?<\/div>)/gi;
            const cards = [];
            let cardMatch;
            
            while ((cardMatch = cardsRegex.exec(sectionContent)) !== null) {
                cards.push(cardMatch[1]);
            }
            
            if (cards.length > 0) {
                const gridWrapper = `<div class="grid">\n            ${cards.join('\n            ')}\n        </div>`;
                // Заменить карточки на grid с карточками
                const newContent = sectionContent.replace(cardsRegex, '').trim();
                const beforeCards = newContent.substring(0, newContent.indexOf(cards[0])).trim();
                const afterCards = newContent.substring(newContent.indexOf(cards[cards.length - 1]) + cards[cards.length - 1].length).trim();
                
                const fixedContent = beforeCards + '\n        ' + gridWrapper + (afterCards ? '\n        ' + afterCards : '');
                fixed = fixed.replace(match[0], `<section${match.input.substring(match.index + match[0].indexOf('<section') + 8, match.index + match[0].indexOf('>'))}>${fixedContent}</section>`);
            }
        }
    }
    
    return fixed;
}

/**
 * Основная функция исправления
 */
function fixPageHTML(html) {
    console.log('Исправление HTML...');
    
    let fixed = html;
    
    // 1. Удалить hero-content
    const hadHeroContent = fixed.includes('hero-content');
    fixed = removeHeroContent(fixed);
    if (hadHeroContent) {
        console.log('  ✅ Удален hero-content');
    }
    
    // 2. Исправить секции
    fixed = fixSections(fixed);
    console.log('  ✅ Исправлены секции');
    
    // 3. Обернуть контент без секций
    fixed = wrapContentInSections(fixed);
    console.log('  ✅ Контент обернут в секции');
    
    // 4. Исправить карточки
    fixed = fixCards(fixed);
    console.log('  ✅ Исправлены карточки');
    
    return fixed;
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
 * Основная функция
 */
async function fixPage(slug, dryRun = false) {
    try {
        console.log(`\n=== ИСПРАВЛЕНИЕ СТРАНИЦЫ: ${slug} ===\n`);
        
        if (dryRun) {
            console.log('🔍 РЕЖИМ ПРОВЕРКИ (dry-run) - изменения не будут сохранены\n');
        }
        
        // Получить страницу
        console.log('Получение страницы из Strapi...');
        const page = await getPage(slug);
        const originalContent = page.attributes?.content || page.content || '';
        
        if (!originalContent) {
            console.log('⚠️ Страница не имеет контента');
            return;
        }
        
        console.log(`Длина оригинального контента: ${originalContent.length} символов\n`);
        
        // Исправить HTML
        const fixedContent = fixPageHTML(originalContent);
        
        console.log(`\nДлина исправленного контента: ${fixedContent.length} символов\n`);
        
        // Показать изменения
        if (originalContent !== fixedContent) {
            console.log('📝 ИЗМЕНЕНИЯ:');
            console.log('--- Оригинал (первые 300 символов):');
            console.log(originalContent.substring(0, 300));
            console.log('\n--- Исправлено (первые 300 символов):');
            console.log(fixedContent.substring(0, 300));
            console.log('');
            
            if (!dryRun) {
                // Обновить страницу
                console.log('Обновление страницы в Strapi...');
                await updatePage(page.id, fixedContent);
                console.log('✅ Страница обновлена в Strapi');
            } else {
                console.log('🔍 Режим проверки: изменения не сохранены');
            }
        } else {
            console.log('✅ Изменений не требуется');
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Получить аргументы
const args = process.argv.slice(2);
const slug = args[0];
const dryRun = args.includes('--dry-run') || args.includes('-d');

if (!slug) {
    console.log('Использование: node fix-page-html.js {slug} [--dry-run]');
    console.log('Пример: node fix-page-html.js business/telephony');
    console.log('Пример (проверка): node fix-page-html.js business/telephony --dry-run');
    process.exit(1);
}

fixPage(slug, dryRun);

