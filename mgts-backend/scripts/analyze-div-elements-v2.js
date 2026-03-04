/**
 * Анализ всех div элементов внутри секций (упрощенная версия)
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
 * Простой парсинг div элементов (без учета вложенности)
 */
function findDivElements(html) {
    const divs = [];
    // Ищем все открывающие теги div с атрибутом class
    const divRegex = /<div([^>]*class=["']([^"']+)["'][^>]*)>/gi;
    let match;
    
    while ((match = divRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const attrs = match[1];
        const classes = match[2].split(/\s+/);
        
        // Извлечь ID если есть
        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        const id = idMatch ? idMatch[1] : null;
        
        // Проверить наличие style
        const hasStyle = /style=["']/.test(attrs);
        
        divs.push({
            fullTag: fullMatch,
            classes: classes,
            id: id,
            hasStyle: hasStyle
        });
    }
    
    return divs;
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
        
        const divTypes = new Map();
        const classUsage = new Map(); // class -> { count, pages, examples }
        
        for (const page of pages) {
            const slug = page.attributes?.slug || page.slug;
            const content = page.attributes?.content || page.content || '';
            
            if (!content || content.trim().length < 50) {
                continue;
            }
            
            // Найти все секции
            const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
            let sectionMatch;
            
            while ((sectionMatch = sectionRegex.exec(content)) !== null) {
                const sectionContent = sectionMatch[1];
                
                // Найти container
                const containerMatch = sectionContent.match(/<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*?)<\/div>/is);
                
                if (containerMatch) {
                    const containerContent = containerMatch[1];
                    
                    // Найти все div внутри container
                    const divs = findDivElements(containerContent);
                    
                    divs.forEach(div => {
                        div.classes.forEach(cls => {
                            // Пропускаем container и служебные классы
                            if (cls === 'container' || cls.startsWith('order-form') || cls.startsWith('service-')) {
                                return;
                            }
                            
                            if (!classUsage.has(cls)) {
                                classUsage.set(cls, {
                                    count: 0,
                                    pages: new Set(),
                                    examples: []
                                });
                            }
                            
                            const usage = classUsage.get(cls);
                            usage.count++;
                            usage.pages.add(slug);
                            
                            // Сохранить примеры
                            if (usage.examples.length < 5) {
                                usage.examples.push({
                                    classes: div.classes.join(' '),
                                    id: div.id,
                                    hasStyle: div.hasStyle,
                                    page: slug
                                });
                            }
                        });
                    });
                }
            }
        }
        
        // Сортировать по частоте использования
        const sortedClasses = Array.from(classUsage.entries())
            .sort((a, b) => b[1].count - a[1].count);
        
        console.log('📊 НАЙДЕННЫЕ КЛАССЫ DIV ЭЛЕМЕНТОВ:\n');
        
        sortedClasses.forEach(([className, info]) => {
            console.log(`\n🔹 .${className}`);
            console.log(`   Использований: ${info.count}`);
            console.log(`   На страницах: ${info.pages.size}`);
            console.log(`   Примеры использования:`);
            info.examples.forEach((ex, idx) => {
                console.log(`     ${idx + 1}. ${ex.page} - классы: ${ex.classes}${ex.id ? `, id: ${ex.id}` : ''}${ex.hasStyle ? ' (со стилями)' : ''}`);
            });
        });
        
        // Сохранить результаты
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../div-analysis-report.json');
        
        const report = {
            totalClasses: sortedClasses.length,
            classes: sortedClasses.map(([className, info]) => ({
                className,
                count: info.count,
                pagesCount: info.pages.size,
                pages: Array.from(info.pages),
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


