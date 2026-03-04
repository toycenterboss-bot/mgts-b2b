/**
 * Анализ всех div-классов внутри секций на всех страницах
 * Собирает статистику использования для типизации
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


/**
 * Извлечь все div с классами из HTML
 */
function extractDivClasses(html) {
    const divClasses = new Map();
    
    // Найти все div с классами
    const divRegex = /<div([^>]*class=["']([^"']+)["'][^>]*)>/gi;
    let match;
    
    while ((match = divRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const classes = match[2].split(/\s+/).filter(c => c.length > 0);
        
        classes.forEach(className => {
            if (!divClasses.has(className)) {
                divClasses.set(className, {
                    count: 0,
                    examples: [],
                    contexts: new Set()
                });
            }
            
            const info = divClasses.get(className);
            info.count++;
            
            // Сохранить пример (первые 3)
            if (info.examples.length < 3) {
                const context = match.input.substring(Math.max(0, match.index - 50), match.index + match[0].length + 100);
                info.examples.push(context.replace(/\n/g, ' ').substring(0, 150));
            }
            
            // Определить контекст (в какой секции находится)
            const beforeMatch = match.input.substring(0, match.index);
            const lastSection = beforeMatch.match(/<section[^>]*class=["']([^"']+)["'][^>]*>/i);
            if (lastSection) {
                info.contexts.add(lastSection[1]);
            }
        });
    }
    
    return divClasses;
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
 * Основная функция
 */
async function analyzeDivClasses() {
    try {
        console.log('\n=== АНАЛИЗ DIV-КЛАССОВ В СЕКЦИЯХ ===\n');
        
        console.log('Получение списка страниц из Strapi...');
        const pages = await getAllPages();
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const allDivClasses = new Map();
        const pageStats = [];
        
        for (const page of pages) {
            const slug = page.attributes?.slug || page.slug;
            const content = page.attributes?.content || page.content || '';
            
            if (!content || content.trim().length < 50) {
                continue;
            }
            
            const divClasses = extractDivClasses(content);
            
            // Объединить статистику
            divClasses.forEach((info, className) => {
                if (!allDivClasses.has(className)) {
                    allDivClasses.set(className, {
                        count: 0,
                        pages: new Set(),
                        examples: [],
                        contexts: new Set()
                    });
                }
                
                const globalInfo = allDivClasses.get(className);
                globalInfo.count += info.count;
                globalInfo.pages.add(slug);
                globalInfo.contexts = new Set([...globalInfo.contexts, ...info.contexts]);
                
                // Добавить примеры
                info.examples.forEach(example => {
                    if (globalInfo.examples.length < 5) {
                        globalInfo.examples.push(example);
                    }
                });
            });
            
            pageStats.push({
                slug,
                divCount: divClasses.size,
                totalDivs: Array.from(divClasses.values()).reduce((sum, info) => sum + info.count, 0)
            });
        }
        
        // Сортировать по частоте использования
        const sortedClasses = Array.from(allDivClasses.entries())
            .sort((a, b) => b[1].count - a[1].count);
        
        console.log('📊 СТАТИСТИКА DIV-КЛАССОВ:\n');
        console.log(`Всего уникальных классов: ${sortedClasses.length}\n`);
        
        // Группировать по типам
        const categories = {
            grid: [],
            card: [],
            form: [],
            content: [],
            other: []
        };
        
        sortedClasses.forEach(([className, info]) => {
            if (className.includes('grid') || className.includes('Grid')) {
                categories.grid.push({ className, info });
            } else if (className.includes('card') || className.includes('Card')) {
                categories.card.push({ className, info });
            } else if (className.includes('form') || className.includes('Form') || className.includes('order')) {
                categories.form.push({ className, info });
            } else if (className.includes('content') || className.includes('text') || className.includes('body') || className.includes('header') || className.includes('footer')) {
                categories.content.push({ className, info });
            } else {
                categories.other.push({ className, info });
            }
        });
        
        // Вывести результаты по категориям
        console.log('🔲 GRID-КЛАССЫ:');
        categories.grid.forEach(({ className, info }) => {
            console.log(`   ${className}: ${info.count} использований на ${info.pages.size} страницах`);
            console.log(`      Контексты: ${Array.from(info.contexts).join(', ') || 'не определен'}`);
        });
        console.log('');
        
        console.log('🃏 CARD-КЛАССЫ:');
        categories.card.forEach(({ className, info }) => {
            console.log(`   ${className}: ${info.count} использований на ${info.pages.size} страницах`);
            console.log(`      Контексты: ${Array.from(info.contexts).join(', ') || 'не определен'}`);
        });
        console.log('');
        
        console.log('📝 FORM-КЛАССЫ:');
        categories.form.forEach(({ className, info }) => {
            console.log(`   ${className}: ${info.count} использований на ${info.pages.size} страницах`);
            console.log(`      Контексты: ${Array.from(info.contexts).join(', ') || 'не определен'}`);
        });
        console.log('');
        
        console.log('📄 CONTENT-КЛАССЫ:');
        categories.content.forEach(({ className, info }) => {
            console.log(`   ${className}: ${info.count} использований на ${info.pages.size} страницах`);
            console.log(`      Контексты: ${Array.from(info.contexts).join(', ') || 'не определен'}`);
        });
        console.log('');
        
        console.log('🔧 ДРУГИЕ КЛАССЫ:');
        categories.other.slice(0, 20).forEach(({ className, info }) => {
            console.log(`   ${className}: ${info.count} использований на ${info.pages.size} страницах`);
        });
        if (categories.other.length > 20) {
            console.log(`   ... и еще ${categories.other.length - 20} классов`);
        }
        console.log('');
        
        // Сохранить детальный отчет
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../div-classes-analysis.json');
        
        const report = {
            totalClasses: sortedClasses.length,
            totalPages: pages.length,
            categories: {
                grid: categories.grid.map(({ className, info }) => ({
                    className,
                    count: info.count,
                    pages: Array.from(info.pages),
                    contexts: Array.from(info.contexts),
                    examples: info.examples
                })),
                card: categories.card.map(({ className, info }) => ({
                    className,
                    count: info.count,
                    pages: Array.from(info.pages),
                    contexts: Array.from(info.contexts),
                    examples: info.examples
                })),
                form: categories.form.map(({ className, info }) => ({
                    className,
                    count: info.count,
                    pages: Array.from(info.pages),
                    contexts: Array.from(info.contexts),
                    examples: info.examples
                })),
                content: categories.content.map(({ className, info }) => ({
                    className,
                    count: info.count,
                    pages: Array.from(info.pages),
                    contexts: Array.from(info.contexts),
                    examples: info.examples
                })),
                other: categories.other.map(({ className, info }) => ({
                    className,
                    count: info.count,
                    pages: Array.from(info.pages),
                    contexts: Array.from(info.contexts),
                    examples: info.examples
                }))
            },
            allClasses: sortedClasses.map(([className, info]) => ({
                className,
                count: info.count,
                pages: Array.from(info.pages),
                contexts: Array.from(info.contexts),
                examples: info.examples
            }))
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📄 Детальный отчет сохранен в: ${reportPath}\n`);
        
        return report;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

analyzeDivClasses();

