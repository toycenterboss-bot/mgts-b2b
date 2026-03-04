/**
 * Скрипт миграции для назначения типов карточек через Strapi API
 * Работает с запущенным Strapi сервером
 * 
 * Использование:
 *   node scripts/migration/assign-card-types-api.js
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Классификация карточек на основе анализа
const CARD_CLASSIFICATION = {
  navigation: {
    patterns: [
      { slug: 'about', section: 'Дополнительная информация', titles: ['Ценности МГТС', 'Деловая этика и комплаенс', 'Корпоративное управление'] },
      { slug: 'about/ethics', section: 'О деловой этике и комплаенсе', titles: ['Обращение генерального директора', 'Политики комплаенса', 'Взаимодействие с партнерами', 'Обратная связь от партнеров', 'Единая горячая линия'] },
      { slug: 'about/governance', section: 'О корпоративном управлении', titles: ['Принципы корпоративного управления', 'Корпоративные документы', 'Решения собраний акционеров', 'Раскрытие информации', 'О регистраторе'] },
      { slug: 'about/governance/principles', section: 'Связанные разделы', titles: ['Корпоративные документы', 'Решения собраний акционеров'] },
      { slug: 'about/ethics/general-director-message', section: 'Связанные разделы', titles: ['Политики комплаенса', 'Единая горячая линия'] },
    ],
  },
  info: {
    patterns: [
      { slug: 'about', section: 'Миссия и ценности', titles: ['Клиентоориентированность', 'Инновации', 'Партнерство', 'Надежность', 'Ответственность', 'Команда'] },
      { slug: 'about/values', section: 'Наши ценности', titles: ['Клиентоориентированность', 'Инновации', 'Партнерство', 'Надежность', 'Ответственность', 'Команда'] },
      { slug: 'about/ethics', section: 'Наши принципы', titles: ['Честность', 'Справедливость', 'Соответствие'] },
      { slug: 'about/governance', section: 'Основные принципы', titles: ['Прозрачность', 'Подотчетность', 'Эффективность'] },
      { slug: 'about/governance/principles', section: 'Основные принципы', titles: ['Прозрачность', 'Подотчетность', 'Эффективность', 'Защита прав'] },
    ],
  }
};

// Функция для определения типа карточки
function detectCardTypeFromHTML(cardHTML, pageSlug, cardTitle = null) {
  if (cardHTML.match(/<a[^>]*class="[^"]*card[^"]*"[^>]*>/i)) {
    return 'navigation';
  }
  
  const dom = new JSDOM(`<div>${cardHTML}</div>`);
  const card = dom.window.document.body.firstElementChild;
  if (!card) return null;
  
  const hasLink = card.querySelector('a[href]');
  if (hasLink) {
    const href = hasLink.getAttribute('href');
    if (href && href !== '#' && href !== '' && !href.startsWith('javascript:')) {
      return 'service';
    }
  }
  
  const h3 = card.querySelector('h3');
  const title = cardTitle || (h3 ? h3.textContent.trim() : null);
  
  for (const pattern of CARD_CLASSIFICATION.navigation.patterns) {
    if (pageSlug.startsWith(pattern.slug)) {
      if (title && pattern.titles.includes(title)) {
        return 'navigation';
      }
    }
  }
  
  for (const pattern of CARD_CLASSIFICATION.info.patterns) {
    if (pageSlug.startsWith(pattern.slug)) {
      if (title && pattern.titles.includes(title)) {
        return 'info';
      }
    }
  }
  
  const content = card.textContent || '';
  const hasPrice = /(от\s*)?[\d\s]+[\s₽рубР]+\/?мес?/i.test(content);
  const hasTariffConditions = /(до|от)\s*\d+\s*(номер|канал|мбит|гбит)/i.test(content);
  if (hasPrice || hasTariffConditions) {
    return 'tariff';
  }
  
  if (!hasLink) {
    return 'info';
  }
  
  return 'service';
}

// Функция для добавления data-card-type атрибутов
function addCardTypesToHTML(html, pageSlug) {
  if (!html) return html;
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const cards = document.querySelectorAll('.card, .service-card');
  
  let updated = false;
  cards.forEach(card => {
    if (card.hasAttribute('data-card-type')) return;
    
    const cardHTML = card.outerHTML;
    const cardTitle = card.querySelector('h3')?.textContent?.trim();
    const cardType = detectCardTypeFromHTML(cardHTML, pageSlug, cardTitle);
    
    if (cardType) {
      card.setAttribute('data-card-type', cardType);
      updated = true;
      console.log(`  ✓ Назначен тип "${cardType}" для карточки: ${cardTitle || 'без заголовка'}`);
    }
  });
  
  return updated ? document.body.innerHTML : html;
}

// Функция для добавления data-grid-type атрибутов
function addGridTypesToHTML(html) {
  if (!html) return html;
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const grids = document.querySelectorAll('.grid');
  
  let updated = false;
  grids.forEach(grid => {
    if (grid.hasAttribute('data-grid-type')) return;
    
    const cards = grid.querySelectorAll('.card, .service-card');
    if (cards.length > 0) {
      const types = new Set();
      cards.forEach(card => {
        const cardType = card.getAttribute('data-card-type');
        if (cardType) types.add(cardType);
      });
      
      let gridType = null;
      if (types.size === 1) {
        gridType = Array.from(types)[0];
      } else if (types.size > 1) {
        gridType = 'mixed';
      }
      
      if (gridType) {
        grid.setAttribute('data-grid-type', gridType);
        updated = true;
        console.log(`  ✓ Назначен gridType "${gridType}" для грида с ${cards.length} карточками`);
      }
    }
  });
  
  return updated ? document.body.innerHTML : html;
}

// Основная функция
async function runMigration() {
  console.log('\n🚀 Начало миграции: назначение типов карточек через API\n');
  
  const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // Получить все страницы из раздела "О компании"
    const response = await api.get('/pages', {
      params: {
        'filters[slug][$startsWith]': 'about/',
        'pagination[limit]': 100
      }
    });
    
    const pages = response.data.data || [];
    console.log(`📄 Найдено страниц: ${pages.length}\n`);
    
    if (pages.length === 0) {
      console.log('⚠️  Страницы не найдены. Убедитесь, что Strapi запущен и данные импортированы.\n');
      return;
    }
    
    let updated = 0;
    let errors = 0;
    
    for (const page of pages) {
      try {
        // В Strapi 5 структура может быть page.attributes или page напрямую
        const pageData = page.attributes || page;
        const pageSlug = pageData.slug;
        
        console.log(`📝 Обработка: ${pageSlug}`);
        
        if (!pageData.content) {
          console.log('  ⚠️  Пропущено: нет контента\n');
          continue;
        }
        
        // Добавить data-card-type атрибуты
        let updatedContent = addCardTypesToHTML(pageData.content, pageSlug);
        
        // Добавить data-grid-type атрибуты
        updatedContent = addGridTypesToHTML(updatedContent);
        
        // Обновить страницу только если контент изменился
        if (updatedContent !== pageData.content) {
          await api.put(`/pages/${page.id}`, {
            data: {
              content: updatedContent
            }
          });
          
          updated++;
          console.log(`  ✅ Обновлено\n`);
        } else {
          console.log(`  ℹ️  Изменений не требуется\n`);
        }
      } catch (error) {
        console.error(`  ❌ Ошибка: ${error.response?.data?.error?.message || error.message}\n`);
        if (error.response?.data) {
          console.error(`     Детали:`, JSON.stringify(error.response.data, null, 2));
        }
        errors++;
      }
    }
    
    console.log('\n✅ Миграция завершена!');
    console.log(`   - ✅ Обновлено страниц: ${updated}`);
    console.log(`   - ❌ Ошибок: ${errors}\n`);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка миграции:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('\n⚠️  Ошибка авторизации. Убедитесь, что API доступен без токена или настройте авторизацию.\n');
    }
    throw error;
  }
}

// Запустить миграцию
if (require.main === module) {
  runMigration().catch(error => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = runMigration;

