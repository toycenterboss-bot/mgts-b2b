/**
 * Прямой скрипт для очистки HTML контента главной страницы
 * Использование: node scripts/clean-main-page-direct.js
 */

const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

// Путь к Strapi
const strapiPath = path.join(__dirname, '..');

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

// Если скрипт запущен напрямую, показать инструкцию
if (require.main === module) {
  console.log('📋 ИНСТРУКЦИЯ ПО ОЧИСТКЕ HTML В STRAPI:');
  console.log('');
  console.log('Этот скрипт очищает HTML контент от дублирования.');
  console.log('');
  console.log('ВАРИАНТ 1: Через Strapi Console');
  console.log('  1. Откройте Strapi Admin Panel');
  console.log('  2. Перейдите в Content Manager → Pages');
  console.log('  3. Найдите страницу с slug "main_page"');
  console.log('  4. Откройте редактор контента');
  console.log('  5. Скопируйте HTML из поля "content"');
  console.log('  6. Запустите: node scripts/clean-main-page-direct.js');
  console.log('  7. Вставьте очищенный HTML обратно в Strapi');
  console.log('');
  console.log('ВАРИАНТ 2: Через API (требует настройки)');
  console.log('  Запустите: node scripts/clean-main-page-html.js');
  console.log('');
  console.log('Для очистки конкретного HTML используйте функцию cleanDuplicateHTML()');
}

module.exports = { cleanDuplicateHTML };




