const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const fetch = globalThis.fetch;
const cheerio = require('cheerio');

async function checkHeadingsOutsideSections() {
    const slug = 'business';
    const url = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    
    console.log('=== ПРОВЕРКА ЗАГОЛОВКОВ ВНЕ СЕКЦИЙ ===\n');
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
    
    console.log('=== АНАЛИЗ СТРУКТУРЫ ===');
    
    // Находим все секции
    const sections = $('section');
    console.log(`Всего секций: ${sections.length}`);
    
    sections.each((i, section) => {
        const $section = $(section);
        const sectionClasses = $section.attr('class') || '';
        const sectionTitle = $section.find('h1, h2, h3, .section-title').first().text().trim().substring(0, 50);
        console.log(`\nСекция ${i + 1}: "${sectionTitle}"`);
        console.log(`  Классы: ${sectionClasses}`);
        console.log(`  Заголовков внутри: ${$section.find('h1, h2, h3, h4, h5, h6').length}`);
    });
    
    // Находим все заголовки
    const allHeadings = $('h1, h2, h3, h4, h5, h6');
    console.log(`\n\nВсего заголовков: ${allHeadings.length}`);
    
    // Проверяем, какие заголовки находятся вне секций
    const headingsOutsideSections = [];
    
    allHeadings.each((i, heading) => {
        const $heading = $(heading);
        const headingText = $heading.text().trim();
        const headingTag = heading.tagName;
        const headingClasses = $heading.attr('class') || '';
        
        // Проверяем, находится ли заголовок внутри секции
        const parentSection = $heading.closest('section');
        const isInsideSection = parentSection.length > 0;
        
        // Проверяем родительские элементы
        let parentPath = [];
        let current = $heading.parent();
        while (current.length > 0 && current.get(0).tagName !== 'body') {
            parentPath.push(current.get(0).tagName + (current.attr('class') ? '.' + current.attr('class').split(' ')[0] : ''));
            current = current.parent();
        }
        
        if (!isInsideSection) {
            headingsOutsideSections.push({
                tag: headingTag,
                text: headingText.substring(0, 60),
                classes: headingClasses,
                parentPath: parentPath.reverse().join(' > '),
                html: $heading[0].outerHTML || ''
            });
        }
    });
    
    if (headingsOutsideSections.length > 0) {
        console.log(`\n\n⚠️ ЗАГОЛОВКИ ВНЕ СЕКЦИЙ (${headingsOutsideSections.length}):`);
        headingsOutsideSections.forEach((h, i) => {
            console.log(`\n${i + 1}. <${h.tag}> "${h.text}"`);
            console.log(`   Классы: ${h.classes || '(нет)'}`);
            console.log(`   Путь: ${h.parentPath}`);
            console.log(`   HTML: ${h.html.substring(0, 150)}`);
        });
    } else {
        console.log('\n✅ Все заголовки находятся внутри секций');
    }
    
    // Проверяем структуру контента
    console.log('\n\n=== СТРУКТУРА КОНТЕНТА ===');
    const topLevelElements = [];
    $('body > *').each((i, el) => {
        const $el = $(el);
        const tag = el.tagName;
        const classes = $el.attr('class') || '';
        const id = $el.attr('id') || '';
        const text = $el.text().trim().substring(0, 50);
        
        topLevelElements.push({
            tag,
            classes,
            id,
            text,
            hasHeadings: $el.find('h1, h2, h3, h4, h5, h6').length > 0
        });
    });
    
    console.log(`\nЭлементы верхнего уровня: ${topLevelElements.length}`);
    topLevelElements.forEach((el, i) => {
        console.log(`\n${i + 1}. <${el.tag}> ${el.classes ? 'class="' + el.classes + '"' : ''} ${el.id ? 'id="' + el.id + '"' : ''}`);
        if (el.hasHeadings) {
            console.log(`   Содержит заголовки: да`);
            const headings = $(topLevelElements[i].tag).find('h1, h2, h3, h4, h5, h6');
            headings.each((j, h) => {
                console.log(`     - <${h.tagName}> ${$(h).text().trim().substring(0, 40)}`);
            });
        }
    });
    
    // Проверяем, есть ли заголовки на верхнем уровне body
    const bodyDirectHeadings = $('body > h1, body > h2, body > h3, body > h4, body > h5, body > h6');
    if (bodyDirectHeadings.length > 0) {
        console.log(`\n\n⚠️ ЗАГОЛОВКИ НАПРЯМУЮ В BODY (${bodyDirectHeadings.length}):`);
        bodyDirectHeadings.each((i, h) => {
            const $h = $(h);
            console.log(`  ${i + 1}. <${h.tagName}> "${$h.text().trim().substring(0, 50)}"`);
            console.log(`     Классы: ${$h.attr('class') || '(нет)'}`);
        });
    }
}

checkHeadingsOutsideSections().catch(console.error);


