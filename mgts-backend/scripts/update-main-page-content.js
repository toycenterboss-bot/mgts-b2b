/**
 * Скрипт для автоматического обновления контента главной страницы в Strapi
 * Удаляет дублирование из HTML контента
 * 
 * Запуск через Strapi console:
 *   node -e "require('./scripts/update-main-page-content.js')"
 * 
 * Или добавьте в src/index.ts в bootstrap функцию
 */

const { JSDOM } = require('jsdom');

/**
 * Очищает HTML от дублирующихся элементов
 */
function cleanDuplicateHTML(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const body = document.body;

  // Найти все элементы с классом about-company
  const aboutCompanyElements = body.querySelectorAll('.about-company');
  
  // Если найдено больше одного элемента, оставить только первый
  if (aboutCompanyElements.length > 1) {
    console.log(`[Clean HTML] Found ${aboutCompanyElements.length} .about-company elements, keeping only the first one`);
    for (let i = 1; i < aboutCompanyElements.length; i++) {
      aboutCompanyElements[i].remove();
    }
  }

  // Найти все дублирующиеся SVG логотипы вне контейнеров
  const svgLogos = body.querySelectorAll('svg#Logo_svg__logo_new');
  
  // Удалить SVG, которые не находятся внутри .about-company__content-logo
  let removedCount = 0;
  svgLogos.forEach((svg) => {
    const parent = svg.closest('.about-company__content-logo');
    if (!parent) {
      // Проверить, не является ли этот SVG частью уже обработанного блока
      const aboutCompanyParent = svg.closest('.about-company');
      if (!aboutCompanyParent || (aboutCompanyElements.length > 0 && aboutCompanyParent !== aboutCompanyElements[0])) {
        console.log('[Clean HTML] Removing duplicate SVG logo');
        svg.remove();
        removedCount++;
      }
    }
  });

  // Удалить дублирующиеся defs и path элементы вне SVG
  const orphanDefs = body.querySelectorAll('defs');
  orphanDefs.forEach((defs) => {
    if (!defs.closest('svg')) {
      console.log('[Clean HTML] Removing orphan defs element');
      defs.remove();
    }
  });

  const orphanPaths = body.querySelectorAll('path[style*="fill: rgb(0, 138, 224)"]');
  orphanPaths.forEach((path) => {
    if (!path.closest('svg')) {
      console.log('[Clean HTML] Removing orphan path element');
      path.remove();
    }
  });

  // Удалить дублирующиеся текстовые блоки
  const duplicateTextBlocks = body.querySelectorAll('.about-company__content-text-title, .about-company__content-text-description');
  const seenTexts = new Map();
  
  duplicateTextBlocks.forEach((block) => {
    const text = block.textContent.trim();
    const className = block.className;
    const key = `${className}:${text}`;
    
    if (seenTexts.has(key)) {
      // Проверить, не является ли этот блок частью первого .about-company
      const aboutCompanyParent = block.closest('.about-company');
      if (aboutCompanyParent && aboutCompanyElements.length > 0 && aboutCompanyParent !== aboutCompanyElements[0]) {
        console.log(`[Clean HTML] Removing duplicate text block: ${text.substring(0, 50)}...`);
        block.remove();
      }
    } else {
      seenTexts.set(key, block);
    }
  });

  // Удалить дублирующиеся кнопки
  const buttons = body.querySelectorAll('.about-company__content-btn, .default-button');
  const seenButtons = new Map();
  
  buttons.forEach((button) => {
    const text = button.textContent.trim();
    const href = button.getAttribute('href') || '';
    const key = `${text}:${href}`;
    
    if (seenButtons.has(key)) {
      const aboutCompanyParent = button.closest('.about-company');
      if (aboutCompanyParent && aboutCompanyElements.length > 0 && aboutCompanyParent !== aboutCompanyElements[0]) {
        console.log(`[Clean HTML] Removing duplicate button: ${text}`);
        button.remove();
      }
    } else {
      seenButtons.set(key, button);
    }
  });

  // Удалить пустые контейнеры
  const emptyContainers = body.querySelectorAll('.about-company__content');
  emptyContainers.forEach((container) => {
    if (!container.textContent.trim() && container.children.length === 0) {
      console.log('[Clean HTML] Removing empty container');
      container.remove();
    }
  });

  // Получить очищенный HTML
  const cleanedHTML = body.innerHTML;
  
  console.log(`[Clean HTML] Cleaned HTML: removed ${removedCount} duplicate SVG(s)`);
  console.log(`[Clean HTML] Final HTML length: ${cleanedHTML.length} characters`);
  
  return cleanedHTML;
}

/**
 * Обновляет контент главной страницы в Strapi
 */
async function updateMainPageContent(strapi) {
  try {
    console.log('[Update Main Page] Searching for main_page...');
    
    // Найти страницу с slug 'main_page'
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: {
        slug: 'main_page'
      }
    });

    if (pages.length === 0) {
      console.log('[Update Main Page] ❌ Page with slug "main_page" not found');
      console.log('[Update Main Page] Available pages:');
      const allPages = await strapi.entityService.findMany('api::page.page', {
        fields: ['id', 'slug', 'title']
      });
      allPages.forEach(page => {
        console.log(`  - ${page.slug} (${page.title})`);
      });
      return false;
    }

    const page = pages[0];
    console.log(`[Update Main Page] Found page: ${page.title} (ID: ${page.id})`);
    
    if (!page.content) {
      console.log('[Update Main Page] Page has no content to clean');
      return false;
    }

    const originalContent = page.content;
    console.log(`[Update Main Page] Original content length: ${originalContent.length} characters`);
    
    // Очистить HTML
    const cleanedContent = cleanDuplicateHTML(originalContent);
    
    if (cleanedContent === originalContent) {
      console.log('[Update Main Page] ✅ No duplicates found, content is already clean');
      return true;
    }

    // Обновить контент страницы
    console.log('[Update Main Page] Updating page content...');
    await strapi.entityService.update('api::page.page', page.id, {
      data: {
        content: cleanedContent
      }
    });

    console.log('[Update Main Page] ✅ Page content cleaned successfully!');
    console.log(`[Update Main Page] Content length reduced from ${originalContent.length} to ${cleanedContent.length} characters`);
    
    return true;
  } catch (error) {
    console.error('[Update Main Page] ❌ Error:', error);
    return false;
  }
}

// Экспорт для использования в других скриптах
module.exports = { cleanDuplicateHTML, updateMainPageContent };

// Если скрипт запущен напрямую, показать инструкцию
if (require.main === module) {
  console.log('📋 ИНСТРУКЦИЯ ПО ОБНОВЛЕНИЮ КОНТЕНТА:');
  console.log('');
  console.log('Этот скрипт автоматически обновит контент главной страницы в Strapi.');
  console.log('');
  console.log('ВАРИАНТ 1: Через Strapi Bootstrap (автоматически)');
  console.log('  Добавьте в src/index.ts в функцию bootstrap:');
  console.log('  const { updateMainPageContent } = require(\'./scripts/update-main-page-content.js\');');
  console.log('  await updateMainPageContent(strapi);');
  console.log('');
  console.log('ВАРИАНТ 2: Через Strapi Console');
  console.log('  1. Откройте Strapi Admin Panel');
  console.log('  2. Перейдите в Settings → Custom');
  console.log('  3. Или используйте API напрямую');
  console.log('');
  console.log('ВАРИАНТ 3: Вручную через Admin Panel');
  console.log('  1. Откройте Content Manager → Pages → main_page');
  console.log('  2. Используйте функцию cleanDuplicateHTML() для очистки HTML');
  console.log('  3. Вставьте очищенный HTML обратно');
}




