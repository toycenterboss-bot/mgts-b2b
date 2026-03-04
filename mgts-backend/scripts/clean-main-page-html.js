/**
 * Скрипт для очистки HTML контента главной страницы от дублирования
 * Запуск: node scripts/clean-main-page-html.js
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
  const svgLogosInContainers = body.querySelectorAll('.about-company__content-logo svg#Logo_svg__logo_new');
  
  // Удалить SVG, которые не находятся внутри .about-company__content-logo
  let removedCount = 0;
  svgLogos.forEach((svg) => {
    const parent = svg.closest('.about-company__content-logo');
    if (!parent) {
      // Проверить, не является ли этот SVG частью уже обработанного блока
      const aboutCompanyParent = svg.closest('.about-company');
      if (!aboutCompanyParent || aboutCompanyParent !== aboutCompanyElements[0]) {
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
      if (aboutCompanyParent && aboutCompanyParent !== aboutCompanyElements[0]) {
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
      if (aboutCompanyParent && aboutCompanyParent !== aboutCompanyElements[0]) {
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
 * Основная функция для очистки контента главной страницы в Strapi
 */
async function cleanMainPageContent() {
  try {
    // Импортируем Strapi
    const strapi = require('@strapi/strapi');
    const app = await strapi().load();
    
    console.log('[Clean HTML] Strapi loaded, searching for main_page...');
    
    // Найти страницу с slug 'main_page'
    const pages = await app.db.query('api::page.page').findMany({
      where: {
        slug: 'main_page'
      },
      populate: ['content']
    });

    if (pages.length === 0) {
      console.log('[Clean HTML] Page with slug "main_page" not found');
      console.log('[Clean HTML] Available pages:');
      const allPages = await app.db.query('api::page.page').findMany({
        select: ['id', 'slug', 'title']
      });
      allPages.forEach(page => {
        console.log(`  - ${page.slug} (${page.title})`);
      });
      process.exit(1);
    }

    const page = pages[0];
    console.log(`[Clean HTML] Found page: ${page.title} (ID: ${page.id})`);
    
    if (!page.content || !page.content.content) {
      console.log('[Clean HTML] Page has no content to clean');
      process.exit(0);
    }

    const originalContent = page.content.content;
    console.log(`[Clean HTML] Original content length: ${originalContent.length} characters`);
    
    // Очистить HTML
    const cleanedContent = cleanDuplicateHTML(originalContent);
    
    if (cleanedContent === originalContent) {
      console.log('[Clean HTML] No duplicates found, content is already clean');
      process.exit(0);
    }

    // Обновить контент страницы
    console.log('[Clean HTML] Updating page content...');
    await app.db.query('api::page.page').update({
      where: { id: page.id },
      data: {
        content: {
          ...page.content,
          content: cleanedContent
        }
      }
    });

    console.log('[Clean HTML] ✅ Page content cleaned successfully!');
    console.log(`[Clean HTML] Content length reduced from ${originalContent.length} to ${cleanedContent.length} characters`);
    
    await app.destroy();
    process.exit(0);
  } catch (error) {
    console.error('[Clean HTML] Error:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  cleanMainPageContent();
}

module.exports = { cleanDuplicateHTML, cleanMainPageContent };




