/**
 * Анализ элементов, расположенных вне блоков div или section
 * Определение типов и правил их расположения
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
 * Найти элементы верхнего уровня (вне div и section)
 */
function findTopLevelElements(html) {
    const topLevelElements = [];
    
    // Удалить комментарии
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Найти все секции и их содержимое
    const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    const sections = [];
    let match;
    
    while ((match = sectionRegex.exec(html)) !== null) {
        sections.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[0]
        });
    }
    
    // Найти все div верхнего уровня (не внутри section)
    const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    const topLevelDivs = [];
    match = null;
    
    while ((match = divRegex.exec(html)) !== null) {
        const divStart = match.index;
        const divEnd = match.index + match[0].length;
        
        // Проверить, не находится ли div внутри section
        const isInsideSection = sections.some(section => 
            divStart >= section.start && divEnd <= section.end
        );
        
        if (!isInsideSection) {
            topLevelDivs.push({
                start: divStart,
                end: divEnd,
                content: match[0],
                tag: match[0].substring(0, match[0].indexOf('>') + 1)
            });
        }
    }
    
    // Найти элементы между секциями и div
    const allBlocks = [...sections.map(s => ({ ...s, type: 'section' })), 
                       ...topLevelDivs.map(d => ({ ...d, type: 'div' }))];
    allBlocks.sort((a, b) => a.start - b.start);
    
    // Найти элементы между блоками
    let lastEnd = 0;
    for (const block of allBlocks) {
        if (block.start > lastEnd) {
            const betweenContent = html.substring(lastEnd, block.start).trim();
            if (betweenContent.length > 0) {
                // Найти все HTML теги в этом промежутке
                const tagRegex = /<([a-z][a-z0-9]*)[^>]*>([\s\S]*?)<\/\1>|<([a-z][a-z0-9]*)[^>]*\/?>/gi;
                let tagMatch;
                
                while ((tagMatch = tagRegex.exec(betweenContent)) !== null) {
                    const tagName = tagMatch[1] || tagMatch[3];
                    const fullTag = tagMatch[0];
                    
                    if (tagName && !['div', 'section'].includes(tagName.toLowerCase())) {
                        topLevelElements.push({
                            tag: tagName.toLowerCase(),
                            fullTag: fullTag,
                            position: 'between_blocks',
                            page: 'current' // будет заменено позже
                        });
                    }
                }
                
                // Также проверить текст без тегов
                const textOnly = betweenContent.replace(/<[^>]+>/g, '').trim();
                if (textOnly.length > 0 && textOnly.length < 200) {
                    topLevelElements.push({
                        tag: 'text',
                        fullTag: textOnly,
                        position: 'between_blocks',
                        page: 'current'
                    });
                }
            }
        }
        lastEnd = Math.max(lastEnd, block.end);
    }
    
    // Проверить элементы после последнего блока
    if (lastEnd < html.length) {
        const afterContent = html.substring(lastEnd).trim();
        if (afterContent.length > 0) {
            const tagRegex = /<([a-z][a-z0-9]*)[^>]*>([\s\S]*?)<\/\1>|<([a-z][a-z0-9]*)[^>]*\/?>/gi;
            let tagMatch;
            
            while ((tagMatch = tagRegex.exec(afterContent)) !== null) {
                const tagName = tagMatch[1] || tagMatch[3];
                const fullTag = tagMatch[0];
                
                if (tagName && !['div', 'section'].includes(tagName.toLowerCase())) {
                    topLevelElements.push({
                        tag: tagName.toLowerCase(),
                        fullTag: fullTag,
                        position: 'after_blocks',
                        page: 'current'
                    });
                }
            }
        }
    }
    
    // Также проверить элементы внутри container, но вне других div
    const containerRegex = /<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    match = null;
    
    while ((match = containerRegex.exec(html)) !== null) {
        const containerContent = match[1];
        
        // Найти элементы, которые не внутри других div
        const innerTagRegex = /<(h[1-6]|p|ul|ol|li|a|img|button|span|strong|em|br|hr)[^>]*>([\s\S]*?)<\/\1>|<(h[1-6]|p|ul|ol|li|a|img|button|span|strong|em|br|hr)[^>]*\/?>/gi;
        let innerMatch;
        
        while ((innerMatch = innerTagRegex.exec(containerContent)) !== null) {
            const tagName = (innerMatch[1] || innerMatch[3]).toLowerCase();
            const beforeTag = containerContent.substring(0, innerMatch.index);
            
            // Проверить, не находится ли элемент внутри другого div
            const divsBefore = (beforeTag.match(/<div[^>]*>/gi) || []).length;
            const divsClosedBefore = (beforeTag.match(/<\/div>/gi) || []).length;
            
            if (divsBefore === divsClosedBefore) {
                topLevelElements.push({
                    tag: tagName,
                    fullTag: innerMatch[0],
                    position: 'inside_container',
                    page: 'current'
                });
            }
        }
    }
    
    return topLevelElements;
}

/**
 * Основная функция
 */
async function analyzeAllTopLevelElements() {
    try {
        console.log('\n=== АНАЛИЗ ЭЛЕМЕНТОВ ВЕРХНЕГО УРОВНЯ ===\n');
        
        console.log('Получение списка страниц из Strapi...');
        const pages = await getAllPages();
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const elementTypes = new Map(); // tag -> { count, pages, examples, positions }
        
        for (const page of pages) {
            const slug = page.attributes?.slug || page.slug;
            const content = page.attributes?.content || page.content || '';
            
            if (!content || content.trim().length < 50) {
                continue;
            }
            
            const topLevelElements = findTopLevelElements(content);
            
            topLevelElements.forEach(element => {
                const tag = element.tag;
                
                if (!elementTypes.has(tag)) {
                    elementTypes.set(tag, {
                        count: 0,
                        pages: new Set(),
                        examples: [],
                        positions: {
                            between_blocks: 0,
                            after_blocks: 0,
                            inside_container: 0
                        }
                    });
                }
                
                const typeInfo = elementTypes.get(tag);
                typeInfo.count++;
                typeInfo.pages.add(slug);
                typeInfo.positions[element.position] = (typeInfo.positions[element.position] || 0) + 1;
                
                // Сохранить примеры
                if (typeInfo.examples.length < 5) {
                    typeInfo.examples.push({
                        tag: element.tag,
                        preview: element.fullTag.substring(0, 100),
                        position: element.position,
                        page: slug
                    });
                }
            });
        }
        
        // Сортировать по частоте использования
        const sortedTypes = Array.from(elementTypes.entries())
            .sort((a, b) => b[1].count - a[1].count);
        
        console.log('📊 НАЙДЕННЫЕ ЭЛЕМЕНТЫ ВЕРХНЕГО УРОВНЯ:\n');
        
        sortedTypes.forEach(([tagName, info]) => {
            console.log(`\n🔹 <${tagName}>`);
            console.log(`   Использований: ${info.count}`);
            console.log(`   На страницах: ${info.pages.size}`);
            console.log(`   Расположение:`);
            console.log(`     - Между блоками: ${info.positions.between_blocks || 0}`);
            console.log(`     - После блоков: ${info.positions.after_blocks || 0}`);
            console.log(`     - Внутри container: ${info.positions.inside_container || 0}`);
            console.log(`   Примеры использования:`);
            info.examples.forEach((ex, idx) => {
                console.log(`     ${idx + 1}. ${ex.page} (${ex.position}): ${ex.preview.substring(0, 60)}...`);
            });
        });
        
        // Сохранить результаты
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../top-level-elements-report.json');
        
        const report = {
            totalTypes: sortedTypes.length,
            elements: sortedTypes.map(([tagName, info]) => ({
                tag: tagName,
                count: info.count,
                pagesCount: info.pages.size,
                pages: Array.from(info.pages),
                positions: info.positions,
                examples: info.examples
            }))
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\n📄 Детальный отчет сохранен в: ${reportPath}\n`);
        
        return report;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

analyzeAllTopLevelElements();


