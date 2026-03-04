const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        console.error('❌ Fetch не доступен');
        process.exit(1);
    }
}

const cheerio = require('cheerio');

async function analyzePage(slug) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Анализ страницы: ${slug}`);
    console.log('='.repeat(70));
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
    };
    
    const url = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    
    if (!data.data || data.data.length === 0) {
        console.log('❌ Страница не найдена');
        return;
    }
    
    const page = data.data[0];
    const pageAttributes = page.attributes || page;
    const content = pageAttributes.content || '';
    
    if (!content) {
        console.log('❌ Контент не найден');
        return;
    }
    
    const $ = cheerio.load(content);
    
    // Ищем все h2
    console.log('\n📋 H2 заголовки:');
    $('h2').each((i, el) => {
        const text = $(el).text().trim();
        console.log(`   ${i + 1}. ${text}`);
    });
    
    // Ищем элементы с ценами
    console.log('\n💰 Элементы с ценами:');
    const priceElements = $('*').filter((i, el) => {
        const text = $(el).text();
        return /\d+\s*₽|\d+\s*руб/i.test(text);
    });
    console.log(`   Найдено: ${priceElements.length}`);
    priceElements.slice(0, 10).each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const tagName = $el.prop('tagName');
        const className = $el.attr('class') || '';
        if (text.length < 300) {
            console.log(`   ${i + 1}. <${tagName} class="${className}"> ${text.substring(0, 200)}`);
        }
    });
    
    // Ищем .card элементы
    console.log('\n📦 .card элементы:');
    const cards = $('.card');
    console.log(`   Найдено: ${cards.length}`);
    cards.slice(0, 5).each((i, el) => {
        const $card = $(el);
        const text = $card.text().trim();
        console.log(`   ${i + 1}. ${text.substring(0, 150)}...`);
    });
    
    // Ищем секцию service-tariffs
    console.log('\n🎯 Секция service-tariffs:');
    const tariffsSection = $('section.service-tariffs');
    console.log(`   Найдено секций: ${tariffsSection.length}`);
    if (tariffsSection.length > 0) {
        console.log(`   Тарифов в секции: ${tariffsSection.find('.tariff-card').length}`);
    }
    
    // Ищем любые элементы с тарифами (h3 + цена)
    console.log('\n🔍 Поиск тарифов (h3 + цена):');
    $('h3').each((i, h3) => {
        const $h3 = $(h3);
        const title = $h3.text().trim();
        const parent = $h3.parent();
        const parentText = parent.text();
        
        if (/\d+\s*₽|\d+\s*руб/i.test(parentText)) {
            const priceMatch = parentText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*₽/i) || 
                              parentText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*руб/i);
            const price = priceMatch ? priceMatch[0] : 'не найдена';
            console.log(`   ${i + 1}. "${title}" - ${price}`);
        }
    });
    
    // Показываем полный HTML для анализа
    console.log('\n📄 Полный HTML контента (первые 2000 символов):');
    console.log(content.substring(0, 2000));
}

async function main() {
    const slugs = ['business/security/video-surveillance', 'business/cloud/vps'];
    
    for (const slug of slugs) {
        await analyzePage(slug);
    }
}

main().catch(console.error);


