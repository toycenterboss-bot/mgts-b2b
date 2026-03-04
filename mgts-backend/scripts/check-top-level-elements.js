/**
 * Проверка и исправление элементов верхнего уровня
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
 * Проверить и исправить элементы верхнего уровня
 */
function fixTopLevelElements(html) {
    let fixed = html;
    const issues = [];
    
    // Удалить комментарии для анализа
    const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Найти все секции
    const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    const sections = [];
    let match;
    
    while ((match = sectionRegex.exec(htmlWithoutComments)) !== null) {
        sections.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[0]
        });
    }
    
    // Найти элементы между секциями
    sections.sort((a, b) => a.start - b.start);
    
    for (let i = 0; i < sections.length - 1; i++) {
        const currentSectionEnd = sections[i].end;
        const nextSectionStart = sections[i + 1].start;
        
        if (nextSectionStart > currentSectionEnd) {
            const betweenContent = htmlWithoutComments.substring(currentSectionEnd, nextSectionStart).trim();
            
            // Найти HTML теги между секциями
            const tagRegex = /<(h[1-6]|p|ul|ol|div|span|strong|em|a|img|button|form)[^>]*>([\s\S]*?)<\/\1>|<(h[1-6]|p|ul|ol|div|span|strong|em|a|img|button|form)[^>]*\/?>/gi;
            let tagMatch;
            
            while ((tagMatch = tagRegex.exec(betweenContent)) !== null) {
                const tagName = (tagMatch[1] || tagMatch[3]).toLowerCase();
                const fullTag = tagMatch[0];
                
                // Проверить, не является ли это частью комментария или пробелами
                if (tagName && !['div', 'section'].includes(tagName)) {
                    issues.push({
                        type: 'element_between_sections',
                        tag: tagName,
                        content: fullTag.substring(0, 100),
                        position: `между секциями ${i + 1} и ${i + 2}`
                    });
                    
                    // Обернуть в секцию или переместить в последнюю секцию
                    // Для простоты - обернем в новую секцию
                    const newSection = `<section class="section">\n    <div class="container">\n        ${fullTag}\n    </div>\n</section>`;
                    fixed = fixed.replace(fullTag, newSection);
                }
            }
        }
    }
    
    // Проверить элементы после всех секций
    if (sections.length > 0) {
        const lastSectionEnd = sections[sections.length - 1].end;
        const afterContent = htmlWithoutComments.substring(lastSectionEnd).trim();
        
        if (afterContent.length > 0) {
            const tagRegex = /<(h[1-6]|p|ul|ol|div|span|strong|em|a|img|button|form)[^>]*>([\s\S]*?)<\/\1>|<(h[1-6]|p|ul|ol|div|span|strong|em|a|img|button|form)[^>]*\/?>/gi;
            let tagMatch;
            
            while ((tagMatch = tagRegex.exec(afterContent)) !== null) {
                const tagName = (tagMatch[1] || tagMatch[3]).toLowerCase();
                const fullTag = tagMatch[0];
                
                if (tagName && !['div', 'section'].includes(tagName)) {
                    issues.push({
                        type: 'element_after_sections',
                        tag: tagName,
                        content: fullTag.substring(0, 100),
                        position: 'после всех секций'
                    });
                    
                    // Обернуть в секцию
                    const newSection = `<section class="section">\n    <div class="container">\n        ${fullTag}\n    </div>\n</section>`;
                    fixed = fixed.replace(fullTag, newSection);
                }
            }
        }
    }
    
    // Проверить заголовки без класса section-title
    // Исключаем заголовки в формах заказа и других специальных местах
    const h2Regex = /<h2([^>]*)>([\s\S]*?)<\/h2>/gi;
    match = null;
    const h2Matches = [];
    
    while ((match = h2Regex.exec(fixed)) !== null) {
        h2Matches.push({
            full: match[0],
            attrs: match[1],
            content: match[2],
            index: match.index
        });
    }
    
    // Обработать в обратном порядке
    h2Matches.reverse().forEach(h2Match => {
        const attrs = h2Match.attrs;
        const content = h2Match.content.trim();
        
        // Пропустить заголовки в формах заказа
        const beforeH2 = fixed.substring(0, h2Match.index);
        const isInOrderForm = beforeH2.includes('service-order') || 
                             beforeH2.includes('order-form') ||
                             content.includes('Заказать услугу') ||
                             content.includes('Оставить заявку');
        
        // Пропустить заголовки, которые уже имеют специальные классы
        const hasSpecialClass = attrs.includes('order-form') || 
                               attrs.includes('faq-question') ||
                               attrs.includes('card-');
        
        if (!isInOrderForm && !hasSpecialClass) {
            // Проверить, есть ли класс section-title
            if (!attrs.includes('section-title') && !attrs.includes('class=')) {
                // Добавить класс section-title
                const newH2 = `<h2 class="section-title"${attrs}>${h2Match.content}</h2>`;
                fixed = fixed.substring(0, h2Match.index) + newH2 + fixed.substring(h2Match.index + h2Match.full.length);
                issues.push({
                    type: 'missing_section_title_class',
                    tag: 'h2',
                    content: content.substring(0, 50)
                });
            } else if (attrs.includes('class=') && !attrs.includes('section-title')) {
                // Добавить section-title к существующим классам
                const classMatch = attrs.match(/class=["']([^"']+)["']/i);
                if (classMatch) {
                    const classes = classMatch[1].split(/\s+/).filter(c => c);
                    if (!classes.includes('section-title')) {
                        classes.push('section-title');
                        const newAttrs = attrs.replace(/class=["'][^"']+["']/i, `class="${classes.join(' ')}"`);
                        const newH2 = `<h2${newAttrs}>${h2Match.content}</h2>`;
                        fixed = fixed.substring(0, h2Match.index) + newH2 + fixed.substring(h2Match.index + h2Match.full.length);
                        issues.push({
                            type: 'missing_section_title_class',
                            tag: 'h2',
                            content: content.substring(0, 50)
                        });
                    }
                }
            }
        }
    });
    
    return { fixed, issues };
}

/**
 * Основная функция
 */
async function checkAllTopLevelElements(dryRun = false) {
    try {
        console.log('\n=== ПРОВЕРКА ЭЛЕМЕНТОВ ВЕРХНЕГО УРОВНЯ ===\n');
        
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
                const { fixed, issues } = fixTopLevelElements(originalContent);
                
                if (issues.length === 0) {
                    console.log('  ✅ Элементы верхнего уровня корректны\n');
                    results.ok.push({ slug, title });
                } else {
                    console.log(`  📝 Найдено проблем: ${issues.length}`);
                    issues.forEach(issue => {
                        console.log(`     - ${issue.type}: ${issue.tag} (${issue.position || issue.content})`);
                    });
                    
                    if (!dryRun && originalContent !== fixed) {
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

checkAllTopLevelElements(dryRun);

