const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function analyzePage(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const analysis = {
      path: filePath,
      title: document.querySelector('title')?.textContent || '',
      meta: {
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || ''
      },
      hasHero: !!document.querySelector('.hero'),
      hasBreadcrumbs: !!document.querySelector('.breadcrumbs'),
      hasSidebar: !!document.querySelector('[data-component="sidebar-about"]'),
      sections: [],
      images: [],
      links: []
    };
    
    // Анализ секций
    document.querySelectorAll('section').forEach(section => {
      analysis.sections.push({
        class: section.className,
        hasTitle: !!section.querySelector('h1, h2, h3'),
        hasCards: !!section.querySelector('.card'),
        hasGrid: !!section.querySelector('.grid')
      });
    });
    
    // Анализ изображений
    document.querySelectorAll('img').forEach(img => {
      analysis.images.push({
        src: img.src,
        alt: img.alt || ''
      });
    });
    
    // Анализ ссылок
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        analysis.links.push({
          href: href,
          text: link.textContent.trim()
        });
      }
    });
    
    return analysis;
  } catch (error) {
    console.error(`Ошибка при анализе ${filePath}:`, error.message);
    return null;
  }
}

// Проверка наличия inventory.json
const inventoryPath = path.join(__dirname, 'inventory.json');
if (!fs.existsSync(inventoryPath)) {
  console.error('\n❌ Ошибка: Файл inventory.json не найден!');
  console.error('Сначала запустите скрипт инвентаризации:');
  console.error('  node inventory.js\n');
  process.exit(1);
}

console.log('\n📊 Анализ типов контента...\n');

// Загрузить инвентаризацию
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

console.log(`Найдено страниц для анализа: ${inventory.length}\n`);

// Анализировать каждую страницу
let processed = 0;
let errors = 0;

const analyses = inventory.map((file, index) => {
  process.stdout.write(`\rОбработка: ${index + 1}/${inventory.length}...`);
  
  const analysis = analyzePage(file.path);
  
  if (analysis) {
    processed++;
    return analysis;
  } else {
    errors++;
    return null;
  }
}).filter(Boolean);

process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Очистить строку прогресса

// Сохранить результаты
const outputPath = path.join(__dirname, 'content-analysis.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(analyses, null, 2)
);

console.log(`✅ Анализ завершен!`);
console.log(`\n📊 Результаты:`);
console.log(`   - Обработано страниц: ${processed}`);
console.log(`   - Ошибок: ${errors}`);
console.log(`   - Результаты сохранены в: ${outputPath}`);

// Статистика
const stats = {
  totalPages: analyses.length,
  withHero: analyses.filter(a => a.hasHero).length,
  withBreadcrumbs: analyses.filter(a => a.hasBreadcrumbs).length,
  withSidebar: analyses.filter(a => a.hasSidebar).length,
  totalSections: analyses.reduce((sum, a) => sum + a.sections.length, 0),
  totalImages: analyses.reduce((sum, a) => sum + a.images.length, 0),
  totalLinks: analyses.reduce((sum, a) => sum + a.links.length, 0)
};

console.log(`\n📈 Статистика:`);
console.log(`   - Страниц с Hero: ${stats.withHero}`);
console.log(`   - Страниц с Breadcrumbs: ${stats.withBreadcrumbs}`);
console.log(`   - Страниц с Sidebar: ${stats.withSidebar}`);
console.log(`   - Всего секций: ${stats.totalSections}`);
console.log(`   - Всего изображений: ${stats.totalImages}`);
console.log(`   - Всего ссылок: ${stats.totalLinks}`);
console.log('');

