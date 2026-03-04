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

const segmentSlugs = ['operators', 'developers', 'partners', 'government', 'business'];

/**
 * Проверяет, находится ли элемент в специальной секции
 */
function isInSpecialSection(element) {
  const specialSections = [
    'service-order',
    'service-tariffs',
    'service-faq',
    'service-features',
    'service-specs',
    'service-cases',
    'service-howto'
  ];
  
  let current = element;
  while (current) {
    if (current.classList) {
      for (const specialClass of specialSections) {
        if (current.classList.contains(specialClass)) {
          return true;
        }
      }
    }
    current = current.parentElement;
  }
  return false;
}

/**
 * Исправляет структуру HTML страницы
 */
function fixPageStructure(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  let changes = 0;
  
  // 1. Исправить карточки без структуры
  const cards = doc.querySelectorAll('.card');
  cards.forEach(card => {
    // Пропустить карточки в специальных секциях
    if (isInSpecialSection(card)) {
      return;
    }
    
    // Проверить структуру
    const hasHeader = card.querySelector('.card-header');
    const hasBody = card.querySelector('.card-body, .card__body');
    const hasFooter = card.querySelector('.card-footer');
    const hasServiceStructure = card.querySelector('.service-card-body');
    
    // Если карточка не имеет правильной структуры
    if (!hasHeader && !hasBody && !hasServiceStructure) {
      // Проверить, есть ли содержимое
      const content = card.innerHTML.trim();
      if (!content) return;
      
      // Попытаться определить тип карточки
      const hasPrice = /(от\s*)?[\d\s]+[\s₽рубР]+(?:\/?мес|месяц)/i.test(card.textContent);
      const hasFeatures = card.querySelectorAll('li').length > 0 || /[✓✔✗✘•]/.test(card.textContent);
      
      // Если есть цена или функции - это тариф, иначе service-card
      if (hasPrice || hasFeatures) {
        // Это тариф - нужно добавить структуру
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = content;
        
        // Найти заголовок
        const h3 = tempDiv.querySelector('h3, h2');
        const title = h3 ? h3.textContent.trim() : '';
        if (h3) h3.remove();
        
        // Найти цену
        const priceMatch = card.textContent.match(/(от\s*)?[\d\s]+[\s₽рубР]+\/?мес?/i);
        const price = priceMatch ? priceMatch[0] : '';
        
        // Найти функции
        const features = Array.from(tempDiv.querySelectorAll('li')).map(li => li.textContent.trim());
        
        // Очистить карточку
        card.innerHTML = '';
        
        // Создать структуру тарифа
        if (title) {
          const header = doc.createElement('div');
          header.className = 'card-header';
          header.style.cssText = 'text-align: center; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: white;';
          const h3El = doc.createElement('h3');
          h3El.style.cssText = 'color: white; margin: 0;';
          h3El.textContent = title;
          header.appendChild(h3El);
          card.appendChild(header);
        }
        
        const body = doc.createElement('div');
        body.className = 'card-body';
        body.style.cssText = 'text-align: center;';
        
        if (price) {
          const priceDiv = doc.createElement('div');
          priceDiv.style.cssText = 'font-size: var(--font-size-2xl); margin-bottom: var(--spacing-lg);';
          priceDiv.textContent = price;
          body.appendChild(priceDiv);
        }
        
        if (features.length > 0) {
          const ul = doc.createElement('ul');
          ul.style.cssText = 'list-style: none; padding: 0; text-align: left; color: var(--color-gray-600); margin-bottom: var(--spacing-lg);';
          features.forEach(feature => {
            if (feature && feature.trim()) {
              const li = doc.createElement('li');
              li.style.cssText = 'padding: var(--spacing-xs) 0;';
              li.textContent = '✓ ' + feature.trim();
              ul.appendChild(li);
            }
          });
          if (ul.children.length > 0) {
            body.appendChild(ul);
          }
        }
        
        if (body.children.length > 0) {
          card.appendChild(body);
        }
        
        changes++;
      } else {
        // Это service-card - нужно добавить структуру service-card
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = content;
        
        // Найти заголовок
        const h3 = tempDiv.querySelector('h3, h2');
        const title = h3 ? h3.textContent.trim() : '';
        if (h3) h3.remove();
        
        // Найти описание
        const p = tempDiv.querySelector('p');
        const description = p ? p.textContent.trim() : '';
        
        // Очистить карточку
        card.innerHTML = '';
        
        // Изменить класс на service-card
        card.classList.remove('card');
        card.classList.add('service-card');
        
        // Создать иконку
        const iconDiv = doc.createElement('div');
        iconDiv.className = 'service-card-icon';
        iconDiv.innerHTML = '<i class="fas fa-circle"></i>';
        card.appendChild(iconDiv);
        
        // Создать body
        const body = doc.createElement('div');
        body.className = 'service-card-body';
        
        if (title) {
          const h3El = doc.createElement('h3');
          h3El.textContent = title;
          body.appendChild(h3El);
        }
        
        if (description) {
          const pEl = doc.createElement('p');
          pEl.textContent = description;
          body.appendChild(pEl);
        }
        
        if (body.children.length > 0) {
          card.appendChild(body);
        }
        
        changes++;
      }
    }
  });
  
  // 2. Обернуть несколько карточек в grid
  const containers = doc.querySelectorAll('.container');
  containers.forEach(container => {
    // Найти все карточки, которые не в grid (проверяем всю иерархию)
    const allCards = container.querySelectorAll('.card, .service-card');
    const cardsNotInGrid = Array.from(allCards).filter(card => {
      // Проверить, находится ли карточка в grid (прямо или через grid-item)
      let current = card.parentElement;
      while (current && current !== container && current !== doc.body) {
        if (current.classList && current.classList.contains('grid')) {
          return false; // Карточка уже в grid
        }
        current = current.parentElement;
      }
      return true; // Карточка не в grid
    });
    
    // Если есть несколько карточек, которые не в grid
    if (cardsNotInGrid.length > 1) {
      // Группировать карточки по их прямым родителям
      const cardGroups = new Map();
      
      cardsNotInGrid.forEach(card => {
        const directParent = card.parentElement;
        if (!cardGroups.has(directParent)) {
          cardGroups.set(directParent, []);
        }
        cardGroups.get(directParent).push(card);
      });
      
      // Обработать каждую группу
      cardGroups.forEach((cards, parent) => {
        if (cards.length > 1) {
          // Если родитель - это container, обернуть карточки в grid на уровне container
          if (parent === container) {
            let currentGroup = [];
            let currentGroupStart = null;
            
            const containerChildren = Array.from(container.children);
            
            containerChildren.forEach((child) => {
              if (child.classList && (child.classList.contains('card') || child.classList.contains('service-card'))) {
                if (currentGroup.length === 0) {
                  currentGroupStart = child;
                }
                currentGroup.push(child);
              } else {
                // Завершить группу, если она есть
                if (currentGroup.length > 0 && currentGroupStart !== null) {
                  wrapCardsInGrid(doc, container, currentGroup, currentGroupStart);
                  changes += currentGroup.length;
                  currentGroup = [];
                  currentGroupStart = null;
                }
              }
            });
            
            // Завершить последнюю группу
            if (currentGroup.length > 0 && currentGroupStart !== null) {
              wrapCardsInGrid(doc, container, currentGroup, currentGroupStart);
              changes += currentGroup.length;
            }
          } else {
            // Если родитель не container (например, div без класса), обернуть карточки в grid внутри родителя
            const firstCard = cards[0];
            wrapCardsInGrid(doc, parent, cards, firstCard);
            changes += cards.length;
          }
        }
      });
    }
  });
  
  // 3. Исправить div без класса внутри card-body
  const cardBodies = doc.querySelectorAll('.card-body');
  cardBodies.forEach(cardBody => {
    const divsWithoutClass = Array.from(cardBody.querySelectorAll('div:not([class])'));
    
    divsWithoutClass.forEach(div => {
      // Проверить, является ли это иконкой (эмодзи)
      const text = div.textContent.trim();
      const isIcon = text.length <= 3 && /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️🎧🎤📻💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎙️🏗️🏠💻⚡💰🤝🏛️✅🛡️]/.test(text);
      
      if (isIcon) {
        // Это иконка - добавить класс card-icon
        div.className = 'card-icon';
        changes++;
      } else {
        // Проверить, содержит ли div заголовок и параграф
        const hasHeading = div.querySelector('h1, h2, h3, h4, h5, h6') !== null;
        const hasParagraph = div.querySelector('p') !== null;
        
        if (hasHeading || hasParagraph) {
          // Это контентный блок - добавить класс card-content
          div.className = 'card-content';
          changes++;
        }
      }
    });
  });
  
  // 4. Добавить классы к другим div без класса (только структурным элементам)
  // КРИТИЧНО: Сначала обработать все div с эмодзи (иконки), независимо от родителя
  const allDivsWithoutClass = doc.querySelectorAll('div:not([class])');
  allDivsWithoutClass.forEach(div => {
    // Пропустить div в специальных секциях
    if (isInSpecialSection(div)) {
      return;
    }
    
    // Пропустить div, которые уже обработаны выше
    if (div.classList && div.classList.length > 0) {
      return;
    }
    
    // Пропустить служебные div
    const parent = div.parentElement;
    if (!parent) return;
    
    // КРИТИЧНО: Проверить, является ли это иконкой (эмодзи) - независимо от родителя
    const text = div.textContent.trim();
    const isIcon = text.length <= 3 && /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️🎧🎤📻💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎙️🏗️🏠💻⚡💰🤝🏛️✅🛡️]/.test(text);
    if (isIcon) {
      // Это иконка - добавить класс card-icon
      div.className = 'card-icon';
      changes++;
      return;
    }
    
    // Если div содержит карточки или grid элементы - это может быть обертка
    const hasCards = div.querySelector('.card, .service-card') !== null;
    const hasGrid = div.querySelector('.grid') !== null;
    
    if (hasCards || hasGrid) {
      // Это обертка для карточек - можно оставить без класса или добавить wrapper
      // Но лучше проверить, не нужно ли обернуть в grid
      return;
    }
    
    // Если div содержит только текст или простые элементы - можно добавить класс
    const hasStructuralContent = div.querySelector('h1, h2, h3, h4, h5, h6, p, ul, ol, img') !== null;
    if (hasStructuralContent && div.textContent.trim().length > 0) {
      // Добавить класс для контентного блока
      div.className = 'content-block';
      changes++;
    }
  });
  
  return {
    html: doc.documentElement.outerHTML,
    changes
  };
}

/**
 * Обертывает карточки в grid
 */
function wrapCardsInGrid(doc, container, cards, firstCard) {
  if (!cards || cards.length === 0 || !firstCard) return;
  
  // Определить количество колонок
  let cols = 3;
  if (cards.length === 1) {
    cols = 1;
  } else if (cards.length === 2) {
    cols = 2;
  } else if (cards.length <= 4) {
    cols = cards.length <= 3 ? 3 : 2;
  } else {
    cols = 3;
  }
  
  // Создать grid контейнер
  const gridWrapper = doc.createElement('div');
  gridWrapper.className = `grid grid-cols-${cols}`;
  gridWrapper.style.marginBottom = 'var(--spacing-2xl)';
  
  // Вставить grid перед первой карточкой
  firstCard.parentNode.insertBefore(gridWrapper, firstCard);
  
  // Переместить все карточки в grid
  cards.forEach(card => {
    if (card.parentElement && !gridWrapper.contains(card)) {
      // Создать grid-item обертку
      const gridItem = doc.createElement('div');
      gridItem.className = 'grid-item';
      gridItem.appendChild(card);
      gridWrapper.appendChild(gridItem);
    }
  });
  
  // Проверить, что grid не пустой
  if (gridWrapper.children.length === 0) {
    gridWrapper.remove();
  }
}

/**
 * Исправляет страницы сегментов
 */
async function fixSegmentPages(dryRun = true) {
  console.log(`🔧 ${dryRun ? 'DRY RUN: ' : ''}Исправление страниц сегментов\n`);
  
  try {
    const response = await api.get('/pages', { 
      params: { 
        'populate': '*' 
      } 
    });
    
    let pages = response.data.data || [];
    
    // КРИТИЧНО: Также получить страницу operators по ID 79, если она не найдена по slug
    try {
      const operatorsResponse = await api.get('/pages/79', { params: { 'populate': '*' } });
      const operatorsPage = operatorsResponse.data.data;
      if (operatorsPage) {
        // Проверить, не добавлена ли уже эта страница
        if (!pages.find(p => p.id === operatorsPage.id)) {
          pages.push(operatorsPage);
          console.log(`[Fix Script] Found operators page by ID 79 (slug: ${operatorsPage.slug || 'не указан'})`);
        }
      }
    } catch (e) {
      // Если не найдена по ID, попробовать найти по slug
      console.log(`[Fix Script] Could not fetch operators page by ID 79, trying by slug...`);
      try {
        const operatorsBySlug = await api.get('/pages', {
          params: {
            'filters[slug][$eq]': 'operators',
            'populate': '*'
          }
        });
        const operatorsPages = operatorsBySlug.data.data || [];
        if (operatorsPages.length > 0) {
          const operatorsPage = operatorsPages[0];
          if (!pages.find(p => p.id === operatorsPage.id)) {
            pages.push(operatorsPage);
            console.log(`[Fix Script] Found operators page by slug (ID: ${operatorsPage.id})`);
          }
        }
      } catch (e2) {
        console.log(`[Fix Script] Could not find operators page: ${e2.message}`);
      }
    }
    
    const segmentPages = pages.filter(page => {
      const slug = page.slug || '';
      return segmentSlugs.some(segSlug => slug === segSlug || slug.startsWith(segSlug + '/')) || page.id === 79;
    });
    
    console.log(`Найдено страниц сегментов: ${segmentPages.length}\n`);
    
    const results = [];
    
    for (const page of segmentPages) {
      const content = page.content || '';
      if (!content || content.trim() === '') {
        console.log(`⚠️  ${page.slug}: контент пустой`);
        continue;
      }
      
      const { html, changes } = fixPageStructure(content);
      
      if (changes > 0) {
        console.log(`✅ ${page.slug}: исправлено ${changes} проблем`);
        
        if (!dryRun) {
          // Обновить страницу в Strapi
          try {
            // Использовать documentId если есть, иначе id
            const pageId = page.documentId || page.id;
            await api.put(`/pages/${pageId}`, {
              data: {
                content: html
              }
            });
            console.log(`   📝 Обновлено в Strapi (ID: ${pageId})`);
          } catch (error) {
            console.error(`   ❌ Ошибка при обновлении страницы ${page.slug} (ID: ${page.id || page.documentId}):`, error.message);
            if (error.response) {
              console.error(`   Response:`, error.response.status, error.response.data);
            }
            // Продолжить обработку других страниц
          }
        }
        
        results.push({ slug: page.slug, changes, fixed: !dryRun });
      } else {
        console.log(`✓  ${page.slug}: проблем не найдено`);
        results.push({ slug: page.slug, changes: 0, fixed: false });
      }
    }
    
    // Сохранить результаты
    const outputPath = path.join(__dirname, '../../fix-segment-pages-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n📊 Результаты сохранены в: ${outputPath}`);
    
    const totalChanges = results.reduce((sum, r) => sum + (r.changes || 0), 0);
    const pagesWithChanges = results.filter(r => r.changes > 0).length;
    
    console.log('\n📈 Итоговая статистика:');
    console.log(`   Всего страниц: ${results.length}`);
    console.log(`   Страниц с изменениями: ${pagesWithChanges}`);
    console.log(`   Всего изменений: ${totalChanges}`);
    
    if (dryRun) {
      console.log('\n💡 Для применения изменений запустите скрипт без флага --dry-run');
    }
    
    return results;
  } catch (error) {
    console.error('Ошибка:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return [];
  }
}

// Запуск
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

fixSegmentPages(dryRun).catch(console.error);

