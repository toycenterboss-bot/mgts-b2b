/**
 * Скрипт миграции для назначения типов карточек на основе классификации
 * 
 * Использование:
 *   npm run strapi console
 *   > const assignCardTypes = require('./scripts/migration/assign-card-types.js');
 *   > await assignCardTypes({ strapi });
 */

// Проверка наличия jsdom
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  console.error('❌ jsdom не установлен. Установите: npm install jsdom');
  throw e;
}

// Классификация карточек на основе анализа
const CARD_CLASSIFICATION = {
  // Navigation Cards - карточки-ссылки (вся карточка кликабельна)
  navigation: {
    patterns: [
      // Страница: about/index.html - раздел "Дополнительная информация"
      { slug: 'about', section: 'Дополнительная информация', titles: ['Ценности МГТС', 'Деловая этика и комплаенс', 'Корпоративное управление'] },
      // Страница: about/ethics/index.html - раздел "О деловой этике и комплаенсе"
      { slug: 'about/ethics', section: 'О деловой этике и комплаенсе', titles: ['Обращение генерального директора', 'Политики комплаенса', 'Взаимодействие с партнерами', 'Обратная связь от партнеров', 'Единая горячая линия'] },
      // Страница: about/governance/index.html - раздел "О корпоративном управлении"
      { slug: 'about/governance', section: 'О корпоративном управлении', titles: ['Принципы корпоративного управления', 'Корпоративные документы', 'Решения собраний акционеров', 'Раскрытие информации', 'О регистраторе'] },
      // Страница: about/governance/principles/index.html - раздел "Связанные разделы"
      { slug: 'about/governance/principles', section: 'Связанные разделы', titles: ['Корпоративные документы', 'Решения собраний акционеров'] },
      // Страница: about/ethics/general-director-message/index.html - раздел "Связанные разделы"
      { slug: 'about/ethics/general-director-message', section: 'Связанные разделы', titles: ['Политики комплаенса', 'Единая горячая линия'] },
    ],
    // Дополнительные признаки: карточка является ссылкой (<a class="card">)
    htmlPattern: /<a[^>]*class="[^"]*card[^"]*"[^>]*>/i
  },
  
  // Info Cards - информационные карточки (без ссылок)
  info: {
    patterns: [
      // Страница: about/index.html - раздел "Миссия и ценности"
      { slug: 'about', section: 'Миссия и ценности', titles: ['Клиентоориентированность', 'Инновации', 'Партнерство', 'Надежность', 'Ответственность', 'Команда'] },
      // Страница: about/values/index.html - раздел "Наши ценности"
      { slug: 'about/values', section: 'Наши ценности', titles: ['Клиентоориентированность', 'Инновации', 'Партнерство', 'Надежность', 'Ответственность', 'Команда'] },
      // Страница: about/ethics/index.html - раздел "Наши принципы"
      { slug: 'about/ethics', section: 'Наши принципы', titles: ['Честность', 'Справедливость', 'Соответствие'] },
      // Страница: about/governance/index.html - раздел "Основные принципы"
      { slug: 'about/governance', section: 'Основные принципы', titles: ['Прозрачность', 'Подотчетность', 'Эффективность'] },
      // Страница: about/governance/principles/index.html - раздел "Основные принципы"
      { slug: 'about/governance/principles', section: 'Основные принципы', titles: ['Прозрачность', 'Подотчетность', 'Эффективность', 'Защита прав'] },
    ],
    // Дополнительные признаки: нет ссылок в карточке
    htmlPattern: /<div[^>]*class="[^"]*card[^"]*"[^>]*>(?!.*<a[^>]*href)/i
  }
};

// Функция для определения типа карточки на основе HTML и контекста
function detectCardTypeFromHTML(cardHTML, pageSlug, cardTitle = null) {
  // Проверить, является ли карточка ссылкой (<a class="card">)
  if (cardHTML.match(/<a[^>]*class="[^"]*card[^"]*"[^>]*>/i)) {
    return 'navigation';
  }
  
  // Создать DOM для парсинга
  const dom = new JSDOM(`<div>${cardHTML}</div>`);
  const card = dom.window.document.body.firstElementChild;
  
  if (!card) return null;
  
  // Проверить наличие ссылки внутри карточки
  const hasLink = card.querySelector('a[href]');
  if (hasLink) {
    const href = hasLink.getAttribute('href');
    // Если ссылка реальная (не # и не пустая), это может быть service card
    if (href && href !== '#' && href !== '' && !href.startsWith('javascript:')) {
      return 'service';
    }
  }
  
  // Получить заголовок карточки
  const h3 = card.querySelector('h3');
  const title = cardTitle || (h3 ? h3.textContent.trim() : null);
  
  // Проверить по классификации Navigation Cards
  for (const pattern of CARD_CLASSIFICATION.navigation.patterns) {
    if (pageSlug.startsWith(pattern.slug)) {
      if (title && pattern.titles.includes(title)) {
        return 'navigation';
      }
    }
  }
  
  // Проверить по классификации Info Cards
  for (const pattern of CARD_CLASSIFICATION.info.patterns) {
    if (pageSlug.startsWith(pattern.slug)) {
      if (title && pattern.titles.includes(title)) {
        return 'info';
      }
    }
  }
  
  // Проверить наличие цены (тарифная карточка)
  const content = card.textContent || '';
  const hasPrice = /(от\s*)?[\d\s]+[\s₽рубР]+\/?мес?/i.test(content);
  const hasTariffConditions = /(до|от)\s*\d+\s*(номер|канал|мбит|гбит)/i.test(content);
  if (hasPrice || hasTariffConditions) {
    return 'tariff';
  }
  
  // Если нет ссылок вообще - это info card
  if (!hasLink) {
    return 'info';
  }
  
  // По умолчанию - service
  return 'service';
}

// Функция для добавления data-card-type атрибутов в HTML
function addCardTypesToHTML(html, pageSlug) {
  if (!html) return html;
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Найти все карточки
  const cards = document.querySelectorAll('.card, .service-card');
  
  let updated = false;
  cards.forEach(card => {
    // Пропустить карточки, которые уже имеют data-card-type
    if (card.hasAttribute('data-card-type')) {
      return;
    }
    
    // Определить тип карточки
    const cardHTML = card.outerHTML;
    const cardTitle = card.querySelector('h3')?.textContent?.trim();
    const cardType = detectCardTypeFromHTML(cardHTML, pageSlug, cardTitle);
    
    if (cardType) {
      card.setAttribute('data-card-type', cardType);
      updated = true;
      console.log(`  ✓ Назначен тип "${cardType}" для карточки: ${cardTitle || 'без заголовка'}`);
    }
  });
  
  if (updated) {
    return document.body.innerHTML;
  }
  
  return html;
}

// Функция для определения gridType на основе карточек в секции
function detectGridType(cards) {
  const types = new Set();
  cards.forEach(card => {
    const cardType = card.getAttribute('data-card-type');
    if (cardType) {
      types.add(cardType);
    }
  });
  
  if (types.size === 1) {
    return Array.from(types)[0];
  } else if (types.size > 1) {
    return 'mixed';
  }
  
  return null;
}

// Функция для добавления data-grid-type атрибутов в HTML
function addGridTypesToHTML(html) {
  if (!html) return html;
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Найти все grid контейнеры
  const grids = document.querySelectorAll('.grid');
  
  grids.forEach(grid => {
    // Пропустить grid, которые уже имеют data-grid-type
    if (grid.hasAttribute('data-grid-type')) {
      return;
    }
    
    // Найти все карточки в grid
    const cards = grid.querySelectorAll('.card, .service-card');
    if (cards.length > 0) {
      const gridType = detectGridType(cards);
      if (gridType) {
        grid.setAttribute('data-grid-type', gridType);
        console.log(`  ✓ Назначен gridType "${gridType}" для грида с ${cards.length} карточками`);
      }
    }
  });
  
  return document.body.innerHTML;
}

// Основная функция миграции
module.exports = async ({ strapi }) => {
  console.log('\n🚀 Начало миграции: назначение типов карточек\n');
  
  try {
    // Получить все страницы из раздела "О компании"
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: {
        slug: {
          $startsWith: 'about/'
        }
      },
      populate: '*'
    });
    
    console.log(`📄 Найдено страниц: ${pages.length}\n`);
    
    let updated = 0;
    let errors = 0;
    
    for (const page of pages) {
      try {
        console.log(`📝 Обработка: ${page.slug}`);
        
        if (!page.content) {
          console.log('  ⚠️  Пропущено: нет контента\n');
          continue;
        }
        
        // Добавить data-card-type атрибуты к карточкам
        let updatedContent = addCardTypesToHTML(page.content, page.slug);
        
        // Добавить data-grid-type атрибуты к гридам
        updatedContent = addGridTypesToHTML(updatedContent);
        
        // Обновить страницу только если контент изменился
        if (updatedContent !== page.content) {
          await strapi.entityService.update('api::page.page', page.id, {
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
        console.error(`  ❌ Ошибка: ${error.message}\n`);
        errors++;
      }
    }
    
    console.log('\n✅ Миграция завершена!');
    console.log(`   - ✅ Обновлено страниц: ${updated}`);
    console.log(`   - ❌ Ошибок: ${errors}\n`);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка миграции:', error);
    throw error;
  }
};

