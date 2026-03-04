/**
 * Скрипт для анализа структуры страницы из Strapi
 * Помогает понять, какие секции есть на странице и соответствуют ли они типизации
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


// Простая HTML парсинг функция (базовая)
function parseHTML(html) {
    const sections = [];
    const specialSections = [];
    const regularSections = [];
    const issues = [];
    
    // Найти все секции
    const sectionMatches = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
    
    sectionMatches.forEach((sectionHTML, index) => {
        // Извлечь классы
        const classMatch = sectionHTML.match(/class=["']([^"']+)["']/i);
        const classes = classMatch ? classMatch[1].split(/\s+/) : [];
        
        // Извлечь ID
        const idMatch = sectionHTML.match(/id=["']([^"']+)["']/i);
        const id = idMatch ? idMatch[1] : null;
        
        // Определить тип секции
        const isSpecial = classes.some(cls => cls.startsWith('service-'));
        const isRegular = classes.includes('section') && !isSpecial;
        
        const sectionInfo = {
            index: index + 1,
            classes: classes,
            id: id,
            isSpecial: isSpecial,
            isRegular: isRegular,
            hasContainer: sectionHTML.includes('<div class="container">'),
            hasTitle: /<h[1-6][^>]*>/.test(sectionHTML),
            contentLength: sectionHTML.length
        };
        
        sections.push(sectionInfo);
        
        if (isSpecial) {
            specialSections.push(sectionInfo);
        } else if (isRegular) {
            regularSections.push(sectionInfo);
        }
        
        // Проверка на проблемы
        if (classes.includes('service-order') && id !== 'order-form') {
            issues.push(`⚠️ Секция service-order (${index + 1}) не имеет id="order-form"`);
        }
        
        if (!classes.includes('section') && !isSpecial) {
            issues.push(`⚠️ Секция (${index + 1}) не имеет класса "section"`);
        }
        
        if (!sectionInfo.hasContainer) {
            issues.push(`⚠️ Секция (${index + 1}) не содержит .container`);
        }
    });
    
    // Проверить hero-content
    const hasHeroContent = html.includes('class="hero-content"') || html.includes("class='hero-content'");
    if (hasHeroContent) {
        issues.push('⚠️ Найден hero-content в основном контенте (должен быть удален)');
    }
    
    return {
        sections,
        specialSections,
        regularSections,
        issues,
        hasHeroContent,
        totalSections: sections.length
    };
}

/**
 * Анализировать страницу
 */
async function analyzePage(slug) {
    try {
        console.log(`\n=== АНАЛИЗ СТРАНИЦЫ: ${slug} ===\n`);
        
        // Получить страницу из Strapi
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
            console.log('❌ Страница не найдена в Strapi');
            return;
        }
        
        const page = data.data[0];
        const content = page.attributes?.content || page.content || '';
        
        if (!content) {
            console.log('⚠️ Страница не имеет контента');
            return;
        }
        
        console.log(`Длина контента: ${content.length} символов\n`);
        
        // Анализ структуры
        const analysis = parseHTML(content);
        
        console.log('📊 СТАТИСТИКА:');
        console.log(`   Всего секций: ${analysis.totalSections}`);
        console.log(`   Специальных секций: ${analysis.specialSections.length}`);
        console.log(`   Обычных секций: ${analysis.regularSections.length}`);
        console.log(`   Hero content: ${analysis.hasHeroContent ? '⚠️ найден' : '✅ отсутствует'}`);
        console.log(`   Проблем: ${analysis.issues.length}\n`);
        
        if (analysis.specialSections.length > 0) {
            console.log('🔧 СПЕЦИАЛЬНЫЕ СЕКЦИИ:');
            analysis.specialSections.forEach(section => {
                console.log(`   ${section.index}. ${section.classes.find(c => c.startsWith('service-')) || 'unknown'}`);
                console.log(`      Классы: ${section.classes.join(', ')}`);
                console.log(`      ID: ${section.id || 'нет'}`);
                console.log(`      Контейнер: ${section.hasContainer ? '✅' : '❌'}`);
                console.log(`      Заголовок: ${section.hasTitle ? '✅' : '❌'}`);
                console.log('');
            });
        }
        
        if (analysis.regularSections.length > 0) {
            console.log('📄 ОБЫЧНЫЕ СЕКЦИИ:');
            analysis.regularSections.forEach(section => {
                console.log(`   ${section.index}. section`);
                console.log(`      Классы: ${section.classes.join(', ')}`);
                console.log(`      Контейнер: ${section.hasContainer ? '✅' : '❌'}`);
                console.log(`      Заголовок: ${section.hasTitle ? '✅' : '❌'}`);
                console.log('');
            });
        }
        
        if (analysis.issues.length > 0) {
            console.log('⚠️ ПРОБЛЕМЫ:');
            analysis.issues.forEach(issue => {
                console.log(`   ${issue}`);
            });
            console.log('');
        } else {
            console.log('✅ Проблем не обнаружено\n');
        }
        
        // Показать структуру контента
        console.log('📋 СТРУКТУРА КОНТЕНТА (первые 500 символов):');
        console.log(content.substring(0, 500).replace(/\n/g, ' '));
        console.log('...\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

// Получить slug из аргументов
const slug = process.argv[2];

if (!slug) {
    console.log('Использование: node analyze-page-structure.js {slug}');
    console.log('Пример: node analyze-page-structure.js business/telephony');
    process.exit(1);
}

analyzePage(slug);
