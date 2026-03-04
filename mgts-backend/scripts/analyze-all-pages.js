/**
 * Массовый анализ всех страниц из Strapi
 * Определяет, какие страницы требуют исправления
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


/**
 * Простой анализ HTML структуры
 */
function analyzeHTML(html) {
    const issues = [];
    const info = {
        hasHeroContent: false,
        sections: [],
        specialSections: [],
        regularSections: [],
        missingContainers: [],
        wrongClasses: [],
        needsFix: false
    };
    
    // Проверка hero-content
    if (html.includes('hero-content') || html.includes("class='hero-content'")) {
        info.hasHeroContent = true;
        issues.push('hero-content в основном контенте');
        info.needsFix = true;
    }
    
    // Найти все секции
    const sectionRegex = /<section([^>]*)>([\s\S]*?)<\/section>/gi;
    let match;
    let sectionIndex = 0;
    
    while ((match = sectionRegex.exec(html)) !== null) {
        sectionIndex++;
        const attrs = match[1];
        const content = match[2];
        
        // Извлечь классы
        const classMatch = attrs.match(/class=["']([^"']+)["']/i);
        const classes = classMatch ? classMatch[1].split(/\s+/) : [];
        
        // Извлечь ID
        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        const id = idMatch ? idMatch[1] : null;
        
        const isSpecial = classes.some(c => c.startsWith('service-'));
        const isRegular = classes.includes('section') && !isSpecial;
        
        const sectionInfo = {
            index: sectionIndex,
            classes: classes,
            id: id,
            isSpecial: isSpecial,
            isRegular: isRegular,
            hasContainer: content.includes('<div class="container">') || 
                         content.includes("<div class='container'>") ||
                         content.includes('<div class="container"') ||
                         content.includes("<div class='container'"),
            hasTitle: /<h[1-6][^>]*>/.test(content)
        };
        
        info.sections.push(sectionInfo);
        
        if (isSpecial) {
            info.specialSections.push(sectionInfo);
        } else if (isRegular) {
            info.regularSections.push(sectionInfo);
        }
        
        // Проверка проблем
        if (!isSpecial && !classes.includes('section')) {
            if (classes.includes('service')) {
                info.wrongClasses.push(`Секция ${sectionIndex}: класс "service" вместо "section"`);
            } else {
                info.wrongClasses.push(`Секция ${sectionIndex}: отсутствует класс "section"`);
            }
            info.needsFix = true;
        }
        
        if (!sectionInfo.hasContainer) {
            info.missingContainers.push(`Секция ${sectionIndex} (${classes.join(', ') || 'без классов'})`);
            info.needsFix = true;
        }
        
        // Проверка service-order
        if (classes.includes('service-order') && id !== 'order-form') {
            issues.push(`Секция service-order (${sectionIndex}) не имеет id="order-form"`);
            info.needsFix = true;
        }
    }
    
    // Если есть контент вне секций
    const trimmed = html.trim();
    if (!trimmed.startsWith('<section') && trimmed.length > 50) {
        issues.push('Контент вне секций (требуется обертка)');
        info.needsFix = true;
    }
    
    info.issues = issues;
    return info;
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
async function analyzeAllPages() {
    try {
        console.log('\n=== АНАЛИЗ ВСЕХ СТРАНИЦ ===\n');
        
        console.log('Получение списка страниц из Strapi...');
        const pages = await getAllPages();
        console.log(`✅ Найдено страниц: ${pages.length}\n`);
        
        const results = {
            total: pages.length,
            needsFix: [],
            ok: [],
            noContent: []
        };
        
        for (const page of pages) {
            const slug = page.attributes?.slug || page.slug;
            const content = page.attributes?.content || page.content || '';
            const title = page.attributes?.title || page.title || 'Без заголовка';
            
            if (!content || content.trim().length < 50) {
                results.noContent.push({ slug, title });
                continue;
            }
            
            const analysis = analyzeHTML(content);
            
            if (analysis.needsFix) {
                results.needsFix.push({
                    slug,
                    title,
                    issues: analysis.issues,
                    hasHeroContent: analysis.hasHeroContent,
                    sectionsCount: analysis.sections.length,
                    wrongClasses: analysis.wrongClasses,
                    missingContainers: analysis.missingContainers,
                    specialSections: analysis.specialSections.length,
                    regularSections: analysis.regularSections.length
                });
            } else {
                results.ok.push({ slug, title });
            }
        }
        
        // Вывести результаты
        console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА:\n');
        console.log(`Всего страниц: ${results.total}`);
        console.log(`✅ Не требуют исправления: ${results.ok.length}`);
        console.log(`⚠️  Требуют исправления: ${results.needsFix.length}`);
        console.log(`❌ Без контента: ${results.noContent.length}\n`);
        
        if (results.needsFix.length > 0) {
            console.log('⚠️  СТРАНИЦЫ, ТРЕБУЮЩИЕ ИСПРАВЛЕНИЯ:\n');
            results.needsFix.forEach((page, index) => {
                console.log(`${index + 1}. ${page.slug} (${page.title})`);
                if (page.hasHeroContent) {
                    console.log('   ❌ Hero content в основном контенте');
                }
                if (page.wrongClasses.length > 0) {
                    console.log(`   ❌ Неправильные классы: ${page.wrongClasses.join(', ')}`);
                }
                if (page.missingContainers.length > 0) {
                    console.log(`   ❌ Отсутствуют контейнеры: ${page.missingContainers.length} секций`);
                }
                if (page.issues.length > 0) {
                    page.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
                }
                console.log(`   📊 Секций: ${page.sectionsCount} (обычных: ${page.regularSections}, специальных: ${page.specialSections})`);
                console.log('');
            });
        }
        
        if (results.ok.length > 0) {
            console.log('✅ СТРАНИЦЫ БЕЗ ПРОБЛЕМ:\n');
            results.ok.forEach(page => {
                console.log(`   - ${page.slug} (${page.title})`);
            });
            console.log('');
        }
        
        if (results.noContent.length > 0) {
            console.log('❌ СТРАНИЦЫ БЕЗ КОНТЕНТА:\n');
            results.noContent.forEach(page => {
                console.log(`   - ${page.slug} (${page.title})`);
            });
            console.log('');
        }
        
        // Сохранить результаты в файл
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../page-analysis-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
        console.log(`📄 Детальный отчет сохранен в: ${reportPath}\n`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

analyzeAllPages();


