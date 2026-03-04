/**
 * Анализ всех div элементов внутри секций
 * Определение типов div и их структуры
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
 * Извлечь все div элементы из HTML
 */
function extractDivElements(html) {
    const divs = [];
    const divRegex = /<div([^>]*)>([\s\S]*?)<\/div>/gi;
    let match;
    
    while ((match = divRegex.exec(html)) !== null) {
        const attrs = match[1];
        const content = match[2];
        
        // Извлечь классы
        const classMatch = attrs.match(/class=["']([^"']+)["']/i);
        const classes = classMatch ? classMatch[1].split(/\s+/) : [];
        
        // Извлечь ID
        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        const id = idMatch ? idMatch[1] : null;
        
        // Извлечь другие атрибуты
        const styleMatch = attrs.match(/style=["']([^"']+)["']/i);
        const hasStyle = !!styleMatch;
        
        // Определить тип контента
        const hasText = content.trim().length > 0 && !content.match(/^[\s\n]*$/);
        const hasNestedDivs = content.includes('<div');
        const hasHeadings = /<h[1-6]/.test(content);
        const hasParagraphs = /<p/.test(content);
        const hasLists = /<ul|<ol/.test(content);
        const hasLinks = /<a/.test(content);
        const hasImages = /<img/.test(content);
        const hasForms = /<form/.test(content);
        const hasButtons = /<button/.test(content);
        
        divs.push({
            classes: classes,
            id: id,
            hasStyle: hasStyle,
            contentLength: content.length,
            hasText,
            hasNestedDivs,
            hasHeadings,
            hasParagraphs,
            hasLists,
            hasLinks,
            hasImages,
            hasForms,
            hasButtons,
            contentPreview: content.substring(0, 100).replace(/\n/g, ' ')
        });
    }
    
    return divs;
}

/**
 * Анализ div элементов внутри секций
 */
function analyzeDivsInSections(html) {
    const sectionRegex = /<section([^>]*)>([\s\S]*?)<\/section>/gi;
    const sections = [];
    let match;
    
    while ((match = sectionRegex.exec(html)) !== null) {
        const sectionAttrs = match[1];
        const sectionContent = match[2];
        
        // Классы секции
        const sectionClassMatch = sectionAttrs.match(/class=["']([^"']+)["']/i);
        const sectionClasses = sectionClassMatch ? sectionClassMatch[1].split(/\s+/) : [];
        
        // Найти container (может быть многострочным)
        let containerContent = sectionContent;
        const containerRegex = /<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*?)<\/div>/i;
        const containerMatch = containerRegex.exec(sectionContent);
        if (containerMatch) {
            containerContent = containerMatch[1];
        }
        
        // Извлечь все div внутри контейнера
        const divs = extractDivElements(containerContent);
        
        sections.push({
            sectionClasses: sectionClasses,
            divs: divs
        });
    }
    
    return sections;
}

/**
 * Основная функция
 */
async function analyzeAllDivs() {
    try {
        console.log('\n=== АНАЛИЗ DIV ЭЛЕМЕНТОВ В СЕКЦИЯХ ===\n');
        
        console.log('Получение списка страниц из Strapi...');
        const pages = await getAllPages();
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const divTypes = new Map(); // class -> { count, examples, structure }
        const allDivs = [];
        
        for (const page of pages) {
            const slug = page.attributes?.slug || page.slug;
            const content = page.attributes?.content || page.content || '';
            
            if (!content || content.trim().length < 50) {
                continue;
            }
            
            const sections = analyzeDivsInSections(content);
            
            sections.forEach(section => {
                section.divs.forEach(div => {
                    if (div.classes.length > 0) {
                        div.classes.forEach(cls => {
                            if (!divTypes.has(cls)) {
                                divTypes.set(cls, {
                                    count: 0,
                                    examples: [],
                                    structure: {
                                        hasText: 0,
                                        hasNestedDivs: 0,
                                        hasHeadings: 0,
                                        hasParagraphs: 0,
                                        hasLists: 0,
                                        hasLinks: 0,
                                        hasImages: 0,
                                        hasForms: 0,
                                        hasButtons: 0,
                                        hasStyle: 0,
                                        withId: 0
                                    },
                                    sections: new Set()
                                });
                            }
                            
                            const typeInfo = divTypes.get(cls);
                            typeInfo.count++;
                            typeInfo.sections.add(section.sectionClasses.join(' '));
                            
                            // Обновить структуру
                            if (div.hasText) typeInfo.structure.hasText++;
                            if (div.hasNestedDivs) typeInfo.structure.hasNestedDivs++;
                            if (div.hasHeadings) typeInfo.structure.hasHeadings++;
                            if (div.hasParagraphs) typeInfo.structure.hasParagraphs++;
                            if (div.hasLists) typeInfo.structure.hasLists++;
                            if (div.hasLinks) typeInfo.structure.hasLinks++;
                            if (div.hasImages) typeInfo.structure.hasImages++;
                            if (div.hasForms) typeInfo.structure.hasForms++;
                            if (div.hasButtons) typeInfo.structure.hasButtons++;
                            if (div.hasStyle) typeInfo.structure.hasStyle++;
                            if (div.id) typeInfo.structure.withId++;
                            
                            // Сохранить примеры (максимум 3)
                            if (typeInfo.examples.length < 3) {
                                typeInfo.examples.push({
                                    classes: div.classes,
                                    id: div.id,
                                    preview: div.contentPreview,
                                    page: slug
                                });
                            }
                        });
                    }
                });
            });
        }
        
        // Сортировать по частоте использования
        const sortedTypes = Array.from(divTypes.entries())
            .sort((a, b) => b[1].count - a[1].count);
        
        console.log('📊 НАЙДЕННЫЕ ТИПЫ DIV ЭЛЕМЕНТОВ:\n');
        
        sortedTypes.forEach(([className, info]) => {
            console.log(`\n🔹 ${className}`);
            console.log(`   Использований: ${info.count}`);
            console.log(`   В секциях: ${Array.from(info.sections).join(', ')}`);
            console.log(`   Структура:`);
            console.log(`     - Текст: ${info.structure.hasText}/${info.count}`);
            console.log(`     - Вложенные div: ${info.structure.hasNestedDivs}/${info.count}`);
            console.log(`     - Заголовки: ${info.structure.hasHeadings}/${info.count}`);
            console.log(`     - Параграфы: ${info.structure.hasParagraphs}/${info.count}`);
            console.log(`     - Списки: ${info.structure.hasLists}/${info.count}`);
            console.log(`     - Ссылки: ${info.structure.hasLinks}/${info.count}`);
            console.log(`     - Изображения: ${info.structure.hasImages}/${info.count}`);
            console.log(`     - Формы: ${info.structure.hasForms}/${info.count}`);
            console.log(`     - Кнопки: ${info.structure.hasButtons}/${info.count}`);
            console.log(`     - Стили: ${info.structure.hasStyle}/${info.count}`);
            console.log(`     - С ID: ${info.structure.withId}/${info.count}`);
            
            if (info.examples.length > 0) {
                console.log(`   Примеры:`);
                info.examples.forEach((ex, idx) => {
                    console.log(`     ${idx + 1}. ${ex.page}: ${ex.preview.substring(0, 60)}...`);
                });
            }
        });
        
        // Сохранить результаты
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../div-analysis-report.json');
        
        const report = {
            totalTypes: sortedTypes.length,
            types: sortedTypes.map(([className, info]) => ({
                className,
                count: info.count,
                sections: Array.from(info.sections),
                structure: info.structure,
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

analyzeAllDivs();

