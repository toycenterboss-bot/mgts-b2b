/**
 * Скрипт для очистки HTML из RTF файла
 * Запуск: cd mgts-backend && node scripts/clean-html-from-rtf.js
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

/**
 * Декодирует RTF Unicode escape-последовательности
 */
function decodeRTFUnicode(str) {
  // Декодируем \\uXXXX (RTF формат)
  str = str.replace(/\\\\u([0-9a-fA-F]{4})/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  // Декодируем \uXXXX (обычный Unicode)
  str = str.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  // Удаляем RTF управляющие последовательности \uc0
  str = str.replace(/\\uc0\s*/g, '');
  
  // Удаляем оставшиеся RTF escape-последовательности
  str = str.replace(/\\([a-z]+)\s*/gi, '');
  
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

  // Удалить дублирующиеся секции (если есть несколько одинаковых)
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
    // Найти все элементы после основного контейнера
    let current = mainContainer.nextSibling;
    const toRemove = [];
    while (current) {
      if (current.nodeType === 1) { // Element node
        toRemove.push(current);
      }
      current = current.nextSibling;
    }
    toRemove.forEach(el => {
      console.log(`[Clean HTML] Removing orphan element: ${el.tagName || el.nodeName}`);
      el.remove();
    });
  }

  // Получить очищенный HTML
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
  
  // Исправляем ссылки
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
      // Для других абсолютных ссылок убираем начальный слеш
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
  const rtfPath = '/Users/andrey_efremov/Documents/main_page.rtf';
  const outputPath = '/Users/andrey_efremov/Documents/main_page_cleaned.html';
  
  console.log('📖 Чтение RTF файла...');
  const rtfContent = fs.readFileSync(rtfPath, 'utf-8');
  
  // Извлекаем HTML из RTF
  // Ищем начало HTML
  const startIdx = rtfContent.indexOf('<div class="home-section-container">');
  if (startIdx === -1) {
    console.error('❌ HTML не найден в RTF файле (начало не найдено)');
    process.exit(1);
  }
  
  // Берем HTML от начала до конца
  let html = rtfContent.substring(startIdx);
  
  // Найдем последний закрывающий тег
  const lastDivIdx = html.lastIndexOf('</div>');
  const lastSectionIdx = html.lastIndexOf('</section>');
  const endIdx = Math.max(lastDivIdx, lastSectionIdx);
  
  if (endIdx > 0) {
    // Берем до последнего закрывающего тега + длина тега
    if (lastSectionIdx > lastDivIdx) {
      html = html.substring(0, lastSectionIdx + 9); // +9 для '</section>'
    } else {
      html = html.substring(0, lastDivIdx + 6); // +6 для '</div>'
    }
  } else {
    // Если не нашли закрывающий тег, убираем RTF мусор в конце
    html = html.replace(/\}[^}]*$/, '');
  }
  console.log(`✅ HTML извлечен, длина: ${html.length} символов`);
  
  // Декодируем Unicode
  html = decodeRTFUnicode(html);
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

module.exports = { cleanDuplicateHTML, fixLinks, decodeRTFUnicode };

