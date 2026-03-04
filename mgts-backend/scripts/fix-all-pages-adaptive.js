/**
 * Адаптивное исправление всех страниц
 * Анализирует каждую страницу и применяет необходимые исправления
 */

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
    const sectionRegex = /<section([^>]*)>([\s\S]*?)<\/section>/gi;
    let fixedHtml = html;
    const sections = [];
    let match;
    
    // Собрать все секции
    while ((match = sectionRegex.exec(html)) !== null) {
        sections.push({
            full: match[0],
            attrs: match[1],
            content: match[2],
            index: match.index
        });
    }
    
    // Обработать секции в обратном порядке
    sections.reverse().forEach(section => {
        let attrs = section.attrs;
        let content = section.content;
        
        // Проверить классы
        const classMatch = attrs.match(/class=["']([^"']+)["']/i);
        let classes = classMatch ? classMatch[1].split(/\s+/) : [];
        
        // Если это специальная секция (service-*), оставить как есть
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
 * Обернуть контент без секций в секцию
 */
function wrapContentInSection(html) {
    const trimmed = html.trim();
    
    // Если весь контент не в секциях
    if (!trimmed.startsWith('<section')) {
        // Если есть секции, обернуть контент до первой секции
        if (trimmed.includes('<section')) {
            const firstSectionIndex = trimmed.indexOf('<section');
            const contentBefore = trimmed.substring(0, firstSectionIndex).trim();
            const contentAfter = trimmed.substring(firstSectionIndex);
            
            if (contentBefore && contentBefore.length > 20) {
                return `<section class="section">\n    <div class="container">\n        ${contentBefore}\n    </div>\n</section>\n\n${contentAfter}`;
            }
            return trimmed;
        } else {
            // Весь контент без секций - обернуть в секцию
            if (trimmed.length > 20) {
                return `<section class="section">\n    <div class="container">\n        ${trimmed}\n    </div>\n</section>`;
            }
        }
    }
    
    return html;
}

/**
 * Исправить HTML страницы
 */
function fixPageHTML(html) {
    let fixed = html;
    
    // 1. Удалить hero-content
    fixed = removeHeroContent(fixed);
    
    // 2. Исправить секции
    fixed = fixSections(fixed);
    
    // 3. Обернуть контент без секций
    fixed = wrapContentInSection(fixed);
    
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
 * Простой анализ для определения необходимости исправления
 */
function needsFix(html) {
    if (!html || html.trim().length < 20) return false;
    
    const hasHeroContent = html.includes('hero-content') || html.includes("class='hero-content'");
    const hasSections = html.includes('<section');
    const hasWrongClass = html.includes('class="service"') || html.includes("class='service'");
    const needsContainer = /<section[^>]*>[\s\S]*?<\/section>/.test(html) && 
                          !/<section[^>]*>[\s\S]*?<div[^>]*class=["']container["']/.test(html);
    
    return hasHeroContent || hasWrongClass || needsContainer || !hasSections;
}

/**
 * Основная функция
 */
async function fixAllPages(dryRun = false, specificSlug = null) {
    try {
        console.log('\n=== АДАПТИВНОЕ ИСПРАВЛЕНИЕ СТРАНИЦ ===\n');
        
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
            fixed: [],
            skipped: [],
            errors: []
        };
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const slug = page.attributes?.slug || page.slug;
            const title = page.attributes?.title || page.title || 'Без заголовка';
            const originalContent = page.attributes?.content || page.content || '';
            
            console.log(`[${i + 1}/${pages.length}] ${slug} (${title})`);
            
            if (!originalContent || originalContent.trim().length < 20) {
                console.log('  ⏭️  Пропущено: нет контента\n');
                results.skipped.push({ slug, title, reason: 'нет контента' });
                continue;
            }
            
            // Проверить, нужны ли исправления
            if (!needsFix(originalContent)) {
                console.log('  ✅ Не требует исправления\n');
                results.skipped.push({ slug, title, reason: 'не требует исправления' });
                continue;
            }
            
            try {
                // Исправить HTML
                const fixedContent = fixPageHTML(originalContent);
                
                if (originalContent === fixedContent) {
                    console.log('  ⏭️  Изменений не требуется\n');
                    results.skipped.push({ slug, title, reason: 'изменений не требуется' });
                    continue;
                }
                
                console.log(`  📝 Исправления применены (${originalContent.length} → ${fixedContent.length} символов)`);
                
                if (!dryRun) {
                    await updatePage(page, fixedContent);
                    console.log('  ✅ Обновлено в Strapi');
                } else {
                    console.log('  🔍 Режим проверки: изменения не сохранены');
                }
                
                results.fixed.push({ slug, title });
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
        console.log(`✅ Исправлено: ${results.fixed.length}`);
        console.log(`⏭️  Пропущено: ${results.skipped.length}`);
        console.log(`❌ Ошибок: ${results.errors.length}\n`);
        
        if (results.fixed.length > 0) {
            console.log('✅ ИСПРАВЛЕННЫЕ СТРАНИЦЫ:');
            results.fixed.forEach(page => {
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

fixAllPages(dryRun, specificSlug || null);


