const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const fetch = globalThis.fetch;
const cheerio = require('cheerio');

async function debugHeadings() {
    const slug = 'business';
    const url = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    
    console.log('=== ОТЛАДКА ЗАГОЛОВКОВ ===\n');
    console.log('Загружаю страницу из Strapi...');
    
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    });
    
    const data = await res.json();
    const page = data.data[0];
    const pageAttributes = page.attributes || page;
    const content = pageAttributes.content || '';
    
    console.log(`Размер контента из Strapi: ${content.length} символов\n`);
    
    // Парсим контент из Strapi
    const $ = cheerio.load(content);
    
    console.log('=== АНАЛИЗ КОНТЕНТА ИЗ STRAPI ===');
    console.log(`Всего заголовков: ${$('h1, h2, h3, h4, h5, h6').length}`);
    
    const headingsInStrapi = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const classes = $el.attr('class') || '';
        const hasSection = classes.includes('section');
        const hasDataCms = $el.attr('data-cms-processed');
        const style = $el.attr('style') || '';
        
        if (hasSection || hasDataCms || style.includes('opacity') || style.includes('visibility')) {
            headingsInStrapi.push({
                tag: el.tagName,
                text: text.substring(0, 50),
                classes,
                hasSection,
                hasDataCms: !!hasDataCms,
                style: style.substring(0, 100)
            });
        }
    });
    
    if (headingsInStrapi.length > 0) {
        console.log('\n⚠️ ПРОБЛЕМНЫЕ ЗАГОЛОВКИ В STRAPI:');
        headingsInStrapi.forEach((h, i) => {
            console.log(`\n${i + 1}. <${h.tag}> "${h.text}"`);
            console.log(`   Классы: ${h.classes || '(нет)'}`);
            console.log(`   Имеет класс section: ${h.hasSection}`);
            console.log(`   Имеет data-cms-processed: ${h.hasDataCms}`);
            console.log(`   Style: ${h.style || '(нет)'}`);
        });
    } else {
        console.log('✅ В Strapi заголовки чистые (нет проблемных классов)');
    }
    
    // Симулируем обработку как в cms-loader.js
    console.log('\n\n=== СИМУЛЯЦИЯ ОБРАБОТКИ (как в cms-loader.js) ===');
    
    // Находим секции
    const sections = $('section.section, section[class*="section"]');
    console.log(`Найдено секций: ${sections.length}`);
    
    sections.each((i, section) => {
        const $section = $(section);
        const sectionTitle = $section.find('h1, h2, h3, .section-title').first().text().trim();
        
        console.log(`\nСекция ${i + 1}: "${sectionTitle}"`);
        console.log(`  Классы секции: ${$section.attr('class') || '(нет)'}`);
        
        // Проверяем заголовки в секции
        const headings = $section.find('h1, h2, h3, h4, h5, h6');
        console.log(`  Заголовков в секции: ${headings.length}`);
        
        headings.each((j, heading) => {
            const $heading = $(heading);
            const headingText = $heading.text().trim().substring(0, 40);
            const headingClasses = $heading.attr('class') || '';
            const hasSectionClass = headingClasses.includes('section');
            
            if (hasSectionClass) {
                console.log(`    ⚠️ Заголовок "${headingText}" имеет класс section!`);
                console.log(`       Классы: ${headingClasses}`);
            }
        });
    });
    
    // Проверяем нормализацию классов
    console.log('\n\n=== ПРОВЕРКА НОРМАЛИЗАЦИИ КЛАССОВ ===');
    
    sections.each((i, section) => {
        const $section = $(section);
        const originalClasses = $section.attr('class') || '';
        
        // Симулируем нормализацию как в cms-loader.js
        const sectionClasses = originalClasses.split(' ').filter(cls => {
            return cls !== 'main-section' && cls !== 'section' && cls !== 'home-section-container';
        });
        
        // Добавляем базовый класс section
        sectionClasses.unshift('section');
        const normalizedClasses = sectionClasses.join(' ');
        
        console.log(`Секция ${i + 1}:`);
        console.log(`  Оригинальные классы: ${originalClasses}`);
        console.log(`  Нормализованные классы: ${normalizedClasses}`);
        
        // Проверяем, не получат ли заголовки класс section
        const headings = $section.find('h1, h2, h3, h4, h5, h6');
        headings.each((j, heading) => {
            const $heading = $(heading);
            const headingText = $heading.text().trim().substring(0, 40);
            const headingClasses = $heading.attr('class') || '';
            
            // Симулируем, что заголовок может получить класс section
            if (headingClasses.includes('section')) {
                console.log(`    ⚠️ Заголовок "${headingText}" уже имеет класс section!`);
                console.log(`       Классы: ${headingClasses}`);
            }
        });
    });
    
    // Проверяем, где заголовки могут получить класс section
    console.log('\n\n=== ПОИСК ИСТОЧНИКА ПРОБЛЕМЫ ===');
    
    // Ищем заголовки, которые находятся на том же уровне, что и секции
    const allHeadings = $('h1, h2, h3, h4, h5, h6');
    console.log(`Всего заголовков в контенте: ${allHeadings.length}`);
    
    allHeadings.each((i, heading) => {
        const $heading = $(heading);
        const headingText = $heading.text().trim().substring(0, 40);
        const headingClasses = $heading.attr('class') || '';
        const parent = $heading.parent();
        const parentTag = parent.get(0)?.tagName || 'unknown';
        const parentClasses = parent.attr('class') || '';
        
        // Проверяем, не является ли заголовок прямым дочерним элементом секции
        if (parentTag === 'SECTION' || parentClasses.includes('section')) {
            console.log(`\nЗаголовок "${headingText}":`);
            console.log(`  Родитель: <${parentTag}> с классами: ${parentClasses}`);
            console.log(`  Классы заголовка: ${headingClasses || '(нет)'}`);
            
            // Проверяем, не получает ли заголовок класс section при нормализации родителя
            if (parentClasses.includes('section') && headingClasses.includes('section')) {
                console.log(`  ⚠️ ПРОБЛЕМА: Заголовок имеет класс section, возможно получил его от родителя!`);
            }
        }
    });
    
    console.log('\n\n=== ПОЛНЫЙ HTML КОНТЕНТА ===');
    console.log(content.substring(0, 2000));
    console.log('\n... (остальное) ...\n');
}

debugHeadings().catch(console.error);


