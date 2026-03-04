const cheerio = require('cheerio');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

async function viewContent(slug) {
    const getUrl = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (API_TOKEN) {
        headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }
    
    const response = await fetch(getUrl, { headers });
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
        console.log('Страница не найдена');
        return;
    }
    
    const page = data.data[0];
    const content = (page.attributes || page).content || '';
    
    const $ = cheerio.load(`<body>${content}</body>`, { decodeEntities: false });
    
    console.log('\n=== H2 ЗАГОЛОВКИ ===');
    $('body h2').each(function() {
        console.log(`- ${$(this).text().trim()}`);
    });
    
    console.log('\n=== БЛОКИ С ЦЕНАМИ ===');
    $('body *').each(function() {
        const text = $(this).text();
        if (/\d+\s*₽|\d+\s*руб|от\s*\d+/i.test(text) && !$(this).closest('section.service-tariffs').length) {
            console.log(`\nНайден блок с ценой:`);
            console.log(`Тег: ${this.tagName}, Классы: ${$(this).attr('class') || 'нет'}`);
            console.log(`Текст (первые 200 символов): ${text.substring(0, 200)}`);
        }
    });
    
    console.log('\n=== ФОРМЫ ===');
    $('body form').each(function() {
        const $form = $(this);
        if (!$form.closest('section.service-order').length) {
            console.log(`\nФорма найдена:`);
            console.log(`Классы: ${$form.attr('class') || 'нет'}`);
            console.log(`Поля: ${$form.find('input, textarea').length}`);
        }
    });
}

const slug = process.argv[2] || 'business/internet/gpon';
viewContent(slug).catch(console.error);



