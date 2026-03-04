/**
 * Скрипт для автоматического исправления структуры всех страниц в Strapi
 * Исправляет проблемы согласно правилам типизации из CMS_CONTENT_TYPES.md
 * 
 * Запуск:
 *   cd mgts-backend
 *   node scripts/fix-all-pages-structure.js [--dry-run] [--backup]
 * 
 * Опции:
 *   --dry-run  - только показать что будет исправлено, не применять изменения
 *   --backup   - создать резервную копию перед исправлением
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API токен из CONTEXT.md
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// URL Strapi
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Параметры запуска
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CREATE_BACKUP = args.includes('--backup');

// Создать axios клиент
const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Исправление структуры HTML контента
 */
function fixContentStructure(content, slug) {
  if (!content || typeof content !== 'string') {
    return { fixed: content, changes: [] };
  }

  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(content);
  const document = dom.window.document;
  const changes = [];
  let modified = false;

  // Список специальных секций, которые не должны изменяться
  const specialSectionClasses = [
    'service-order', 'service-tariffs', 'service-faq', 
    'service-features', 'service-specs', 'service-cases', 'service-howto'
  ];

  // Функция проверки, находится ли элемент в специальной секции
  function isInSpecialSection(element) {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList) {
        for (const specialClass of specialSectionClasses) {
          if (parent.classList.contains(specialClass)) {
            return true;
          }
        }
      }
      parent = parent.parentElement;
    }
    return false;
  }

  // 1. Исправление: Добавление класса section-title к заголовкам h2
  const h2s = document.querySelectorAll('h2');
  h2s.forEach((h2, index) => {
    // Проверяем, в какой специальной секции находится заголовок
    let parent = h2.parentElement;
    let specialSectionClass = null;
    
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList) {
        for (const specialClass of specialSectionClasses) {
          if (parent.classList.contains(specialClass)) {
            specialSectionClass = specialClass;
            break;
          }
        }
        if (specialSectionClass) break;
      }
      parent = parent.parentElement;
    }
    
    // Пропускаем только service-order (там заголовок может быть без section-title)
    if (specialSectionClass === 'service-order') {
      return;
    }
    
    // Для всех остальных заголовков добавляем section-title
    if (!h2.classList.contains('section-title')) {
      h2.classList.add('section-title');
      changes.push(`Добавлен класс section-title к заголовку h2 #${index + 1}`);
      modified = true;
    }
  });

  // 2. Исправление: Обертка контента в секции
  // Находим контейнеры, которые не в секциях, но содержат контент
  // Используем Array.from для создания копии, так как мы будем изменять DOM
  const containers = Array.from(document.querySelectorAll('.container'));
  containers.forEach((container, containerIndex) => {
    // Проверяем, находится ли контейнер внутри секции
    let parent = container.parentElement;
    let hasSection = false;
    
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList && parent.classList.contains('section')) {
        hasSection = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    // Если контейнер не в секции и содержит контент
    if (!hasSection && container.children.length > 0) {
      // Пропускаем контейнеры в специальных секциях
      if (isInSpecialSection(container)) {
        return;
      }
      
      // Проверяем, есть ли заголовки или карточки
      const hasH2 = container.querySelector('h2');
      const hasCards = container.querySelectorAll('.card').length > 0;
      
      if (hasH2 || hasCards) {
        try {
          // Создаем секцию и перемещаем контейнер внутрь
          const section = document.createElement('section');
          section.classList.add('section');
          
          // Сохраняем родителя и следующего sibling
          const parentNode = container.parentNode;
          const nextSibling = container.nextSibling;
          
          // Перемещаем контейнер в секцию
          section.appendChild(container);
          
          // Вставляем секцию на место контейнера
          if (nextSibling) {
            parentNode.insertBefore(section, nextSibling);
          } else {
            parentNode.appendChild(section);
          }
          
          changes.push(`Контейнер #${containerIndex + 1} обернут в <section class="section">`);
          modified = true;
        } catch (error) {
          // Игнорируем ошибки для уже обработанных элементов
        }
      }
    }
  });

  // 3. Исправление: Добавление сетки для множественных карточек
  // Обрабатываем ВСЕ секции (включая те, что были созданы в пункте 2)
  // Используем querySelectorAll заново, чтобы получить обновленный DOM
  const allSections = Array.from(document.querySelectorAll('section'));
  allSections.forEach((section, sectionIndex) => {
    // Пропускаем специальные секции
    let isSpecial = false;
    for (const specialClass of specialSectionClasses) {
      if (section.classList.contains(specialClass)) {
        isSpecial = true;
        break;
      }
    }
    if (isSpecial) {
      return;
    }
    
    // Проверяем, что это section.section (не специальная)
    if (!section.classList.contains('section')) {
      return;
    }
    
    const containers = Array.from(section.querySelectorAll('.container'));
    containers.forEach((container, containerIndex) => {
      // Находим прямые дочерние карточки контейнера
      const directCards = Array.from(container.children).filter(
        child => child.classList && child.classList.contains('card')
      );
      
      // Если карточек больше 1 и они не в сетке
      if (directCards.length > 1) {
        // Проверяем, есть ли уже сетка
        const existingGrid = container.querySelector('.grid');
        if (!existingGrid) {
          try {
            // Создаем сетку
            const grid = document.createElement('div');
            
            // Определяем количество колонок (по умолчанию 3)
            let cols = 3;
            if (directCards.length === 2) cols = 2;
            if (directCards.length >= 4) cols = 4;
            
            grid.classList.add('grid', `grid-cols-${cols}`);
            
            // Находим позицию первой карточки
            const firstCard = directCards[0];
            const parentNode = firstCard.parentNode;
            
            // Перемещаем все карточки в сетку
            directCards.forEach(card => {
              grid.appendChild(card);
            });
            
            // Вставляем сетку на место первой карточки (которая уже перемещена в grid)
            if (parentNode && firstCard.parentNode === grid) {
              // Находим следующего sibling после последней карточки
              const lastCard = directCards[directCards.length - 1];
              const nextSibling = lastCard.nextSibling;
              
              if (nextSibling) {
                parentNode.insertBefore(grid, nextSibling);
              } else {
                parentNode.appendChild(grid);
              }
            }
            
            changes.push(`Добавлена сетка .grid.grid-cols-${cols} для ${directCards.length} карточек в секции #${sectionIndex + 1}`);
            modified = true;
          } catch (error) {
            // Игнорируем ошибки для уже обработанных элементов
            console.error('Ошибка при добавлении сетки:', error.message);
          }
        }
      }
    });
  });

  // 4. Исправление: .grid-item без .grid
  const gridItems = document.querySelectorAll('.grid-item');
  gridItems.forEach((item, index) => {
    let parent = item.parentElement;
    let hasGrid = false;
    
    while (parent && parent !== document.body) {
      if (parent.classList && parent.classList.contains('grid')) {
        hasGrid = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!hasGrid) {
      // Создаем сетку и оборачиваем элемент
      const grid = document.createElement('div');
      grid.classList.add('grid');
      
      // Если элемент в контейнере, добавляем grid-cols
      const container = item.closest('.container');
      if (container) {
        // Определяем количество grid-item элементов рядом
        const siblings = Array.from(item.parentElement.children).filter(
          child => child.classList && child.classList.contains('grid-item')
        );
        if (siblings.length > 1) {
          grid.classList.add(`grid-cols-${Math.min(siblings.length, 4)}`);
        }
      }
      
      item.parentNode.insertBefore(grid, item);
      grid.appendChild(item);
      
      changes.push(`Элемент .grid-item #${index + 1} обернут в .grid`);
      modified = true;
    }
  });

  // 5. Исправление: Заголовки h2 вне секций
  // Обрабатываем заголовки, которые не в секциях и не в специальных секциях
  const allH2s = Array.from(document.querySelectorAll('h2'));
  allH2s.forEach((h2, index) => {
    // Пропускаем заголовки в специальных секциях
    if (isInSpecialSection(h2)) {
      return;
    }
    
    // Проверяем, находится ли заголовок в секции
    let parent = h2.parentElement;
    let hasSection = false;
    
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList && parent.classList.contains('section')) {
        hasSection = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    // Если заголовок не в секции section.section
    // Но если он в специальной секции (service-tariffs, service-faq и т.д.) - это нормально
    let parentCheck = h2.parentElement;
    let inSpecialSection = false;
    
    while (parentCheck && parentCheck !== document.body) {
      if (parentCheck.tagName === 'SECTION' && parentCheck.classList) {
        for (const specialClass of specialSectionClasses) {
          if (parentCheck.classList.contains(specialClass)) {
            inSpecialSection = true;
            break;
          }
        }
        if (inSpecialSection) break;
      }
      parentCheck = parentCheck.parentElement;
    }
    
    // Если заголовок в специальной секции - не оборачиваем в section.section
    if (inSpecialSection) {
      return;
    }
    
    // Если заголовок не в секции и не в специальной секции - оборачиваем
    if (!hasSection) {
      // Проверяем, есть ли контейнер рядом
      const container = h2.closest('.container');
      
      if (container) {
        // Если контейнер не в секции, оборачиваем его
        let containerParent = container.parentElement;
        let containerInSection = false;
        
        while (containerParent && containerParent !== document.body) {
          if (containerParent.tagName === 'SECTION' && containerParent.classList && containerParent.classList.contains('section')) {
            containerInSection = true;
            break;
          }
          containerParent = containerParent.parentElement;
        }
        
        if (!containerInSection && !isInSpecialSection(container)) {
          try {
            const section = document.createElement('section');
            section.classList.add('section');
            
            const containerParent = container.parentNode;
            const nextSibling = container.nextSibling;
            
            section.appendChild(container);
            
            if (nextSibling) {
              containerParent.insertBefore(section, nextSibling);
            } else {
              containerParent.appendChild(section);
            }
            
            changes.push(`Заголовок h2 #${index + 1} и его контейнер обернуты в <section class="section">`);
            modified = true;
          } catch (error) {
            // Игнорируем ошибки
          }
        }
      } else {
        // Заголовок не в контейнере - создаем секцию и контейнер
        try {
          const section = document.createElement('section');
          section.classList.add('section');
          const newContainer = document.createElement('div');
          newContainer.classList.add('container');
          
          // Находим все элементы от h2 до следующего h2 или конца родителя
          const elementsToMove = [];
          let current = h2;
          const parentNode = h2.parentNode;
          
          while (current && current !== parentNode) {
            elementsToMove.push(current);
            current = current.nextElementSibling;
            if (current && current.tagName === 'H2') break;
            if (!current) break;
          }
          
          // Перемещаем элементы в новый контейнер
          elementsToMove.forEach(el => {
            newContainer.appendChild(el.cloneNode(true));
            el.remove();
          });
          
          section.appendChild(newContainer);
          parentNode.insertBefore(section, h2);
          
          changes.push(`Заголовок h2 #${index + 1} и следующий контент обернуты в секцию`);
          modified = true;
        } catch (error) {
          // Игнорируем ошибки
        }
      }
    }
  });

  const fixed = modified ? dom.serialize() : content;
  return { fixed, changes, modified };
}

/**
 * Получить все страницы из Strapi
 */
async function getAllPages() {
  try {
    console.log('[Fix] Получение всех страниц из Strapi...\n');
    
    const response = await api.get('/pages', {
      params: {
        'pagination[pageSize]': 100,
        'populate': '*'
      }
    });
    
    if (!response.data.data) {
      console.error('❌ Не удалось получить страницы');
      return [];
    }
    
    console.log(`[Fix] Найдено страниц: ${response.data.data.length}\n`);
    return response.data.data;
  } catch (error) {
    console.error('❌ Ошибка при получении страниц:', error.message);
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   Не удалось подключиться к Strapi. Убедитесь, что Strapi запущен на http://localhost:1337');
    }
    return [];
  }
}

/**
 * Создать резервную копию страниц
 */
async function createBackup(pages) {
  const backupDir = path.join(__dirname, '../../strapi-backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `structure-fix-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  fs.mkdirSync(backupPath, { recursive: true });
  
  const backupData = pages.map(page => ({
    slug: page.slug,
    title: page.title,
    content: page.content,
    documentId: page.documentId || page.id
  }));
  
  fs.writeFileSync(
    path.join(backupPath, 'pages-backup.json'),
    JSON.stringify(backupData, null, 2),
    'utf-8'
  );
  
  console.log(`💾 Резервная копия создана: ${backupPath}\n`);
  return backupPath;
}

/**
 * Основная функция исправления
 */
async function fixAllPages() {
  try {
    if (DRY_RUN) {
      console.log('🔍 РЕЖИМ ПРЕДВАРИТЕЛЬНОГО ПРОСМОТРА (--dry-run)\n');
      console.log('Изменения не будут применены к Strapi\n');
    }
    
    const pages = await getAllPages();
    
    if (pages.length === 0) {
      console.log('⚠️  Страницы не найдены');
      return;
    }
    
    // Создать резервную копию если нужно
    if (CREATE_BACKUP && !DRY_RUN) {
      await createBackup(pages);
    }
    
    const results = [];
    let totalFixed = 0;
    let totalChanges = 0;
    
    console.log('[Fix] Исправление структуры контента...\n');
    
    for (const page of pages) {
      const slug = page.slug || 'unknown';
      const title = page.title || 'без названия';
      const content = page.content || '';
      
      if (!content) {
        continue;
      }
      
      const { fixed, changes, modified } = fixContentStructure(content, slug);
      
      if (modified && changes.length > 0) {
        results.push({
          slug,
          title,
          changes,
          changeCount: changes.length,
          originalLength: content.length,
          fixedLength: fixed.length
        });
        totalFixed++;
        totalChanges += changes.length;
        
        // Обновить страницу в Strapi (если не dry-run)
        if (!DRY_RUN) {
          try {
            const pageId = page.documentId || page.id;
            await api.put(`/pages/${pageId}`, {
              data: {
                content: fixed
              }
            });
            console.log(`✅ ${slug}: исправлено ${changes.length} проблем(ы)`);
          } catch (error) {
            console.error(`❌ ${slug}: ошибка при обновлении - ${error.message}`);
            results[results.length - 1].error = error.message;
          }
        } else {
          console.log(`📝 ${slug}: будет исправлено ${changes.length} проблем(ы)`);
          changes.slice(0, 3).forEach(change => {
            console.log(`   - ${change}`);
          });
          if (changes.length > 3) {
            console.log(`   ... и еще ${changes.length - 3} изменений`);
          }
        }
      }
    }
    
    // Вывод результатов
    console.log('\n' + '='.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЯ');
    console.log('='.repeat(80));
    console.log(`\nВсего страниц обработано: ${pages.length}`);
    console.log(`Страниц исправлено: ${totalFixed}`);
    console.log(`Всего изменений: ${totalChanges}\n`);
    
    if (DRY_RUN) {
      console.log('⚠️  Это был предварительный просмотр. Для применения изменений запустите без --dry-run\n');
    } else {
      console.log('✅ Все исправления применены!\n');
    }
    
    // Сохранение результатов в файл
    const reportPath = path.join(__dirname, '../../fix-results.json');
    const report = {
      fixedAt: new Date().toISOString(),
      dryRun: DRY_RUN,
      totalPages: pages.length,
      pagesFixed: totalFixed,
      totalChanges: totalChanges,
      results: results
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`💾 Результаты сохранены в: ${reportPath}\n`);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Запуск
if (require.main === module) {
  console.log('🔧 Скрипт автоматического исправления структуры страниц\n');
  console.log('Использование:');
  console.log('  node scripts/fix-all-pages-structure.js [--dry-run] [--backup]\n');
  
  fixAllPages()
    .then(() => {
      console.log('✅ Готово!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { fixAllPages, fixContentStructure };

