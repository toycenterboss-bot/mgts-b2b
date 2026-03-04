/**
 * Скрипт для проверки дублирования и исправления ссылок в main_page.txt
 * Запуск: cd mgts-backend && node scripts/check-and-fix-main-page.js
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

/**
 * Проверяет HTML на дублирование
 */
function checkDuplicates(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const body = document.body;
  
  const issues = [];
  
  // Проверка дублирующихся блоков about-company
  const aboutCompanyElements = body.querySelectorAll('.about-company');
  if (aboutCompanyElements.length > 1) {
    issues.push(`Найдено ${aboutCompanyElements.length} блоков .about-company (должен быть только 1)`);
  }
  
  // Проверка дублирующихся секций
  const sections = body.querySelectorAll('section.main-section');
  const sectionTitles = new Map();
  sections.forEach((section) => {
    const title = section.querySelector('.title-promo-short')?.textContent.trim() || '';
    if (title) {
      if (sectionTitles.has(title)) {
        issues.push(`Дублирующаяся секция: "${title}"`);
      } else {
        sectionTitles.set(title, section);
      }
    }
  });
  
  // Проверка дублирующихся SVG логотипов
  const svgLogos = body.querySelectorAll('svg#Logo_svg__logo_new');
  if (svgLogos.length > 1) {
    issues.push(`Найдено ${svgLogos.length} SVG логотипов (должен быть только 1)`);
  }
  
  return { issues, document, body };
}

/**
 * Исправляет ссылки в HTML
 */
function fixLinks(document) {
  const links = document.querySelectorAll('a[href]');
  let fixedCount = 0;
  const fixes = [];
  
  links.forEach((link) => {
    let href = link.getAttribute('href');
    const originalHref = href;
    
    // Исправляем устаревшие ссылки
    if (href === '/about_mgts') {
      href = 'about/index.html';
      fixedCount++;
      fixes.push(`${originalHref} -> ${href}`);
    } else if (href.startsWith('/operators')) {
      if (href === '/operators') {
        href = 'operators/index.html';
      } else if (href === '/operators/data_transfer') {
        href = 'operators/index.html#data_transfer';
      } else {
        href = href.replace('/operators', 'operators');
      }
      fixedCount++;
      fixes.push(`${originalHref} -> ${href}`);
    } else if (href.startsWith('/government')) {
      href = href.replace('/government', 'government/index.html');
      fixedCount++;
      fixes.push(`${originalHref} -> ${href}`);
    } else if (href.startsWith('/developers')) {
      href = href.replace('/developers', 'developers/index.html');
      fixedCount++;
      fixes.push(`${originalHref} -> ${href}`);
    } else if (href.startsWith('/partners')) {
      href = href.replace('/partners', 'partners/index.html');
      fixedCount++;
      fixes.push(`${originalHref} -> ${href}`);
    } else if (href.startsWith('/') && href.length > 1 && !href.startsWith('//') && !href.startsWith('/http')) {
      // Убираем ведущий слэш для относительных ссылок
      href = href.substring(1);
      fixedCount++;
      fixes.push(`${originalHref} -> ${href}`);
    }
    
    if (href !== originalHref) {
      link.setAttribute('href', href);
    }
  });
  
  return { fixedCount, fixes };
}

/**
 * Основная функция
 */
function main() {
  const inputPath = '/Users/andrey_efremov/Downloads/runs/main_page.txt';
  const outputPath = '/Users/andrey_efremov/Downloads/runs/main_page_fixed.txt';
  
  console.log('📖 Чтение main_page.txt...');
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  console.log(`✅ HTML загружен, длина: ${content.length} символов`);
  
  // Проверка на дублирование
  console.log('\n🔍 Проверка на дублирование...');
  const { issues, document, body } = checkDuplicates(content);
  
  if (issues.length > 0) {
    console.log('⚠️  Найдены проблемы:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ Дублирование не обнаружено');
  }
  
  // Исправление ссылок
  console.log('\n🔗 Исправление ссылок...');
  const { fixedCount, fixes } = fixLinks(document);
  
  if (fixedCount > 0) {
    console.log(`✅ Исправлено ${fixedCount} ссылок:`);
    fixes.forEach(fix => console.log(`   ${fix}`));
  } else {
    console.log('✅ Все ссылки корректны');
  }
  
  // Сохранение результата
  const cleanedHTML = body.innerHTML;
  fs.writeFileSync(outputPath, cleanedHTML, 'utf-8');
  
  console.log(`\n✅ Исправленный HTML сохранен в: ${outputPath}`);
  console.log(`📊 Итоговая длина: ${cleanedHTML.length} символов`);
  
  // Итоговый отчет
  console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ:');
  console.log(`   - Проблем с дублированием: ${issues.length}`);
  console.log(`   - Исправлено ссылок: ${fixedCount}`);
  if (issues.length === 0 && fixedCount === 0) {
    console.log('   ✅ Файл готов к использованию!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkDuplicates, fixLinks };




