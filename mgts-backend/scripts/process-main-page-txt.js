/**
 * Скрипт для обработки main_page.txt и создания чистого HTML
 * Запуск: cd mgts-backend && node scripts/process-main-page-txt.js
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

/**
 * Декодирует Unicode escape-последовательности
 */
function decodeUnicode(str) {
  // Декодируем \uXXXX (Unicode)
  str = str.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  // Удаляем RTF управляющие последовательности \uc0
  str = str.replace(/\\uc0\s*/g, '');
  
  return str;
}

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

  // Удалить дублирующиеся секции
  const sections = body.querySelectorAll('section.main-section');
  const seenSections = new Map();
  
  sections.forEach((section) => {
    const title = section.querySelector('.title-promo-short')?.textContent.trim() || '';
    if (title && seenSections.has(title)) {
      console.log(`[Clean HTML] Removing duplicate section: ${title.substring(0, 30)}...`);
      section.remove();
    } else if (title) {
      seenSections.set(title, section);
    }
  });
  
  // Удалить все элементы вне основного контейнера home-section-container
  const mainContainer = body.querySelector('.home-section-container');
  if (mainContainer) {
    let current = mainContainer.nextSibling;
    const toRemove = [];
    while (current) {
      if (current.nodeType === 1) {
        toRemove.push(current);
      }
      current = current.nextSibling;
    }
    toRemove.forEach(el => {
      console.log(`[Clean HTML] Removing orphan element: ${el.tagName || el.nodeName}`);
      el.remove();
    });
  }

  const cleanedHTML = body.innerHTML;
  
  console.log(`[Clean HTML] Cleaned HTML: removed ${removedCount} duplicate SVG(s)`);
  console.log(`[Clean HTML] Final HTML length: ${cleanedHTML.length} characters`);
  
  return cleanedHTML;
}

/**
 * Исправляет ссылки в HTML
 */
function fixLinks(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const links = document.querySelectorAll('a[href]');
  let fixedCount = 0;
  
  links.forEach((link) => {
    let href = link.getAttribute('href');
    const originalHref = href;
    
    // Исправляем устаревшие ссылки
    if (href === '/about_mgts') {
      href = 'about/index.html';
      fixedCount++;
    } else if (href.startsWith('/operators')) {
      if (href === '/operators') {
        href = 'operators/index.html';
      } else if (href === '/operators/data_transfer') {
        href = 'operators/index.html#data_transfer';
      } else {
        href = href.replace('/operators', 'operators');
      }
      fixedCount++;
    } else if (href.startsWith('/government')) {
      href = href.replace('/government', 'government/index.html');
      fixedCount++;
    } else if (href.startsWith('/developers')) {
      href = href.replace('/developers', 'developers/index.html');
      fixedCount++;
    } else if (href.startsWith('/partners')) {
      href = href.replace('/partners', 'partners/index.html');
      fixedCount++;
    } else if (href.startsWith('/') && href.length > 1 && !href.startsWith('//')) {
      href = href.substring(1);
      fixedCount++;
    }
    
    if (href !== originalHref) {
      link.setAttribute('href', href);
      console.log(`[Fix Links] Fixed: ${originalHref} -> ${href}`);
    }
  });
  
  console.log(`[Fix Links] Fixed ${fixedCount} link(s)`);
  
  return document.body.innerHTML;
}

/**
 * Основная функция
 */
function main() {
  const inputPath = '/Users/andrey_efremov/Downloads/runs/main_page.txt';
  const outputPath = '/Users/andrey_efremov/Downloads/runs/main_page_clean.html';
  
  console.log('📖 Чтение main_page.txt...');
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  // Извлекаем HTML (может быть в одной строке или нескольких)
  let html = content.trim();
  
  // Если есть переносы строк, объединяем
  html = html.replace(/\n/g, '');
  
  console.log(`✅ HTML извлечен, длина: ${html.length} символов`);
  
  // Декодируем Unicode
  console.log('🔤 Декодирование Unicode...');
  html = decodeUnicode(html);
  console.log('✅ Unicode декодирован');
  
  // Очищаем от дублирования
  console.log('🧹 Очистка от дублирования...');
  html = cleanDuplicateHTML(html);
  
  // Исправляем ссылки
  console.log('🔗 Исправление ссылок...');
  html = fixLinks(html);
  
  // Сохраняем результат
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Очищенный HTML сохранен в: ${outputPath}`);
  console.log(`📊 Итоговая длина: ${html.length} символов`);
}

if (require.main === module) {
  main();
}

module.exports = { cleanDuplicateHTML, fixLinks, decodeUnicode };




