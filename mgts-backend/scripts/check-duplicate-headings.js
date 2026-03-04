const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const fetch = globalThis.fetch;
const cheerio = require('cheerio');

async function checkDuplicateHeadings() {
    const slug = 'business';
    const url = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    
    console.log('=== ПРОВЕРКА ДУБЛИРУЮЩИХСЯ ЗАГОЛОВКОВ ===\n');
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
    
    console.log('=== АНАЛИЗ ЗАГОЛОВКОВ В STRAPI ===');
    
    // Находим все заголовки
    const allHeadings = $('h1, h2, h3, h4, h5, h6');
    console.log(`Всего заголовков: ${allHeadings.length}`);
    
    // Группируем заголовки по тексту
    const headingsByText = new Map();
    
    allHeadings.each((i, heading) => {
        const $heading = $(heading);
        const text = $heading.text().trim();
        const tag = heading.tagName;
        const classes = $heading.attr('class') || '';
        const parent = $heading.parent();
        const parentTag = parent.get(0)?.tagName || 'unknown';
        const parentClasses = parent.attr('class') || '';
        
        if (!headingsByText.has(text)) {
            headingsByText.set(text, []);
        }
        
        headingsByText.get(text).push({
            tag,
            classes,
            parentTag,
            parentClasses,
            html: $heading[0].outerHTML || ''
        });
    });
    
    // Находим дубликаты
    const duplicates = [];
    headingsByText.forEach((headings, text) => {
        if (headings.length > 1) {
            duplicates.push({
                text: text.substring(0, 60),
                count: headings.length,
                headings
            });
        }
    });
    
    if (duplicates.length > 0) {
        console.log(`\n\n⚠️ ДУБЛИРУЮЩИЕСЯ ЗАГОЛОВКИ (${duplicates.length}):`);
        duplicates.forEach((dup, i) => {
            console.log(`\n${i + 1}. "${dup.text}" (встречается ${dup.count} раз)`);
            dup.headings.forEach((h, j) => {
                console.log(`   ${j + 1}. <${h.tag}> в <${h.parentTag}> ${h.parentClasses ? 'class="' + h.parentClasses + '"' : ''}`);
                console.log(`      Классы заголовка: ${h.classes || '(нет)'}`);
                console.log(`      HTML: ${h.html.substring(0, 100)}`);
            });
        });
    } else {
        console.log('\n✅ Дублирующихся заголовков в Strapi не найдено');
    }
    
    // Проверяем структуру секций
    console.log('\n\n=== СТРУКТУРА СЕКЦИЙ ===');
    const sections = $('section');
    console.log(`Всего секций: ${sections.length}`);
    
    sections.each((i, section) => {
        const $section = $(section);
        const sectionClasses = $section.attr('class') || '';
        const headingsInSection = $section.find('h1, h2, h3, h4, h5, h6');
        
        console.log(`\nСекция ${i + 1}: ${sectionClasses}`);
        console.log(`  Заголовков в секции: ${headingsInSection.length}`);
        
        // Проверяем дубликаты внутри секции
        const headingsTexts = [];
        headingsInSection.each((j, h) => {
            const text = $(h).text().trim();
            headingsTexts.push(text);
        });
        
        const uniqueTexts = new Set(headingsTexts);
        if (headingsTexts.length !== uniqueTexts.size) {
            console.log(`  ⚠️ ДУБЛИКАТЫ ВНУТРИ СЕКЦИИ!`);
            const duplicatesInSection = [];
            headingsTexts.forEach((text, idx) => {
                if (headingsTexts.indexOf(text) !== idx) {
                    duplicatesInSection.push(text);
                }
            });
            console.log(`  Дублирующиеся тексты: ${[...new Set(duplicatesInSection)].join(', ')}`);
        }
        
        // Показываем все заголовки в секции
        headingsInSection.each((j, h) => {
            const $h = $(h);
            const text = $h.text().trim().substring(0, 50);
            const classes = $h.attr('class') || '';
            console.log(`    ${j + 1}. <${h.tagName}> "${text}" ${classes ? 'class="' + classes + '"' : ''}`);
        });
    });
}

checkDuplicateHeadings().catch(console.error);


