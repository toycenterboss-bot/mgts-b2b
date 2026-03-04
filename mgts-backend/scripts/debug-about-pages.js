const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


const api = axios.create({
  baseURL: 'http://localhost:1337/api',
  headers: { 
    'Authorization': `Bearer ${API_TOKEN}`, 
    'Content-Type': 'application/json' 
  }
});

const aboutPages = [
  'about',
  'about/ethics/compliance-policies',
  'about/values'
];

async function debugAboutPages() {
  console.log('🔍 Диагностика страниц раздела "О компании"\n');
  
  for (const slug of aboutPages) {
    try {
      const response = await api.get('/pages', { 
        params: { 
          'filters[slug][$eq]': slug, 
          'populate': '*' 
        } 
      });
      
      const page = response.data.data[0];
      if (!page) {
        console.log(`⚠️  ${slug}: страница не найдена\n`);
        continue;
      }
      
      const content = page.content || '';
      if (!content || content.trim() === '') {
        console.log(`⚠️  ${slug}: контент пустой\n`);
        continue;
      }
      
      console.log(`\n📄 ${slug}:`);
      console.log(`   Длина контента: ${content.length} символов`);
      
      const dom = new JSDOM(content);
      const doc = dom.window.document;
      
      // Проверяем структуру
      const sections = doc.querySelectorAll('section');
      const containers = doc.querySelectorAll('.container');
      const serviceCards = doc.querySelectorAll('.service-card');
      const cards = doc.querySelectorAll('.card');
      const grids = doc.querySelectorAll('.grid');
      
      console.log(`   Секций: ${sections.length}`);
      console.log(`   Контейнеров: ${containers.length}`);
      console.log(`   service-card: ${serviceCards.length}`);
      console.log(`   card: ${cards.length}`);
      console.log(`   grid: ${grids.length}`);
      
      // Проверяем содержимое секций
      sections.forEach((section, idx) => {
        const title = section.querySelector('h2, h1, .section-title')?.textContent?.trim() || 'без заголовка';
        const sectionClass = section.className || 'без класса';
        const contentLength = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
        const hasServiceCards = section.querySelectorAll('.service-card').length;
        const hasCards = section.querySelectorAll('.card').length;
        
        console.log(`   Секция ${idx + 1}: "${title.substring(0, 50)}"`);
        console.log(`      Класс: ${sectionClass}`);
        console.log(`      Длина контента: ${contentLength} символов`);
        console.log(`      service-card внутри: ${hasServiceCards}`);
        console.log(`      card внутри: ${hasCards}`);
        
        // Проверяем, есть ли контент вне service-card/card
        const container = section.querySelector('.container');
        if (container) {
          const directChildren = Array.from(container.children);
          const nonCardElements = directChildren.filter(child => 
            !child.classList.contains('service-card') && 
            !child.classList.contains('card') &&
            !child.classList.contains('grid')
          );
          
          if (nonCardElements.length > 0) {
            console.log(`      ⚠️  Элементы вне card/grid: ${nonCardElements.length}`);
            nonCardElements.forEach((el, i) => {
              console.log(`         ${i + 1}. ${el.tagName} (${el.className || 'без класса'})`);
            });
          }
        }
      });
      
      // Проверяем service-card элементы
      if (serviceCards.length > 0) {
        console.log(`\n   Детали service-card элементов:`);
        serviceCards.forEach((card, idx) => {
          const title = card.querySelector('h3, h2')?.textContent?.trim() || 'без заголовка';
          const cardType = card.getAttribute('data-card-type') || 'не указан';
          const hasIcon = card.querySelector('.service-card-icon, [class*="icon"]') || 
                         /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️]/u.test(card.innerHTML);
          const contentLength = card.innerHTML.trim().length;
          
          console.log(`      ${idx + 1}. "${title.substring(0, 40)}"`);
          console.log(`         Тип: ${cardType}`);
          console.log(`         Иконка: ${hasIcon ? 'да' : 'нет'}`);
          console.log(`         Длина: ${contentLength} символов`);
          
          // Проверяем структуру
          const hasBody = card.querySelector('.service-card-body');
          const hasIconEl = card.querySelector('.service-card-icon');
          console.log(`         Структура: body=${!!hasBody}, icon=${!!hasIconEl}`);
        });
      }
      
      // Проверяем, может ли контент быть обработан процессорами
      console.log(`\n   Проверка обработки процессорами:`);
      
      // RegularSectionProcessor должен обработать секции с классом section
      const regularSections = Array.from(sections).filter(s => {
        const hasSpecialClass = s.classList.contains('service-tariffs') || 
                               s.classList.contains('service-faq') ||
                               s.classList.contains('service-order') ||
                               s.classList.contains('service-features') ||
                               s.classList.contains('service-specs') ||
                               s.classList.contains('service-cases') ||
                               s.classList.contains('service-howto');
        return !hasSpecialClass && (s.classList.contains('section') || s.tagName === 'SECTION');
      });
      
      console.log(`      Обычных секций для RegularSectionProcessor: ${regularSections.length}`);
      
      // Проверяем, есть ли контент в секциях
      regularSections.forEach((section, idx) => {
        const title = section.querySelector('h2, h1, .section-title')?.textContent?.trim() || 'без заголовка';
        const contentLength = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
        const hasContent = contentLength > 50 && 
                          (section.querySelector('form, .order-form, h2, h3, p, .card, .grid, .service-card') !== null);
        
        console.log(`      Секция "${title.substring(0, 30)}": длина=${contentLength}, hasContent=${hasContent}`);
      });
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${slug}: ошибка - ${error.message}\n`);
    }
  }
}

debugAboutPages().catch(console.error);

