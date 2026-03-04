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

const aboutPages = [
  'about',
  'about/values',
  'about/ethics',
  'about/ethics/general-director-message',
  'about/ethics/compliance-policies',
  'about/ethics/interaction-partners',
  'about/ethics/partners-feedback',
  'about/ethics/single-hotline',
  'about/governance',
  'about/governance/principles',
  'about/governance/documents',
  'about/governance/shareholders',
  'about/governance/infoformen',
  'about/governance/registrar'
];

// Стандартные классы из CMS_CONTENT_TYPES.md
const standardClasses = [
  'section', 'container', 'grid', 'grid-item', 'card', 'section-title',
  'hero-content', 'service-order', 'service-tariffs', 'service-faq',
  'service-features', 'service-specs', 'service-cases', 'service-howto',
  'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'
];

function isStandardClass(className) {
  if (!className) return false;
  
  // Проверяем точное совпадение
  if (standardClasses.includes(className)) return true;
  
  // Проверяем префиксы
  if (className.startsWith('service-')) return true;
  if (className.startsWith('section-')) return true;
  if (className.startsWith('grid-')) return true;
  if (className.startsWith('card-')) return true;
  if (className.startsWith('tariff-')) return true;
  if (className.startsWith('faq-')) return true;
  
  return false;
}

async function analyzeAboutPages() {
  console.log('🔍 Анализ страниц раздела "О компании"\n');
  
  const results = [];
  
  for (const slug of aboutPages) {
    try {
      const response = await api.get('/pages', { 
        params: { 
          'filters[slug][$eq]': slug, 
          'populate': '*' 
        } 
      });
      
      const page = response.data.data[0];
      if (!page) {
        console.log(`⚠️  ${slug}: страница не найдена`);
        results.push({ slug, status: 'not_found' });
        continue;
      }
      
      const content = page.content || '';
      if (!content || content.trim() === '') {
        console.log(`⚠️  ${slug}: контент пустой`);
        results.push({ slug, status: 'empty', classes: [] });
        continue;
      }
      
      const dom = new JSDOM(content);
      const doc = dom.window.document;
      
      // Собираем все уникальные классы
      const allElements = doc.querySelectorAll('*');
      const classes = new Set();
      allElements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(' ').forEach(cls => {
            if (cls.trim()) classes.add(cls.trim());
          });
        }
      });
      
      // Проверяем структуру
      const sections = doc.querySelectorAll('section');
      const containers = doc.querySelectorAll('.container');
      const grids = doc.querySelectorAll('.grid');
      const cards = doc.querySelectorAll('.card');
      const h2Elements = doc.querySelectorAll('h2');
      const sectionTitles = doc.querySelectorAll('.section-title');
      
      // Проверяем наличие нестандартных классов
      const allClasses = Array.from(classes);
      const nonStandardClasses = allClasses.filter(cls => !isStandardClass(cls));
      
      // Проверяем структуру на соответствие правилам
      const issues = [];
      
      // Проверка: h2 без section-title
      h2Elements.forEach(h2 => {
        if (!h2.classList.contains('section-title')) {
          const parentSection = h2.closest('section');
          if (parentSection && !parentSection.classList.contains('service-order')) {
            issues.push({
              type: 'h2_without_section_title',
              element: h2.outerHTML.substring(0, 100),
              context: h2.parentElement ? h2.parentElement.tagName : 'unknown'
            });
          }
        }
      });
      
      // Проверка: элементы вне section
      const topLevelElements = Array.from(doc.body.children || doc.documentElement.children);
      topLevelElements.forEach(el => {
        if (el.tagName !== 'SECTION' && el.tagName !== 'DIV' && 
            !el.classList.contains('container') && 
            el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          issues.push({
            type: 'element_outside_section',
            element: el.tagName,
            classes: el.className || 'none'
          });
        }
      });
      
      // Проверка: container без section
      containers.forEach(container => {
        const parentSection = container.closest('section');
        if (!parentSection) {
          issues.push({
            type: 'container_without_section',
            context: container.parentElement ? container.parentElement.tagName : 'unknown'
          });
        }
      });
      
      // Проверка: grid-item без grid
      const gridItems = doc.querySelectorAll('.grid-item');
      gridItems.forEach(item => {
        const parentGrid = item.closest('.grid');
        if (!parentGrid) {
          issues.push({
            type: 'grid_item_without_grid',
            context: item.parentElement ? item.parentElement.className : 'unknown'
          });
        }
      });
      
      // Проверка: множественные card без grid
      containers.forEach(container => {
        const directCards = Array.from(container.children).filter(child => 
          child.classList.contains('card')
        );
        if (directCards.length > 1) {
          const parentGrid = container.querySelector('.grid');
          if (!parentGrid || !Array.from(container.children).some(child => child === parentGrid)) {
            issues.push({
              type: 'multiple_cards_without_grid',
              count: directCards.length
            });
          }
        }
      });
      
      results.push({
        slug,
        status: 'ok',
        classes: allClasses,
        nonStandardClasses,
        structure: {
          sections: sections.length,
          containers: containers.length,
          grids: grids.length,
          cards: cards.length,
          h2Elements: h2Elements.length,
          sectionTitles: sectionTitles.length
        },
        issues,
        contentLength: content.length,
        contentPreview: content.substring(0, 500)
      });
      
      console.log(`✅ ${slug}:`);
      console.log(`   Структура: ${sections.length} секций, ${containers.length} контейнеров, ${cards.length} карточек`);
      console.log(`   Всего классов: ${allClasses.length}, нестандартных: ${nonStandardClasses.length}`);
      if (nonStandardClasses.length > 0) {
        console.log(`   ⚠️  Нестандартные классы: ${nonStandardClasses.join(', ')}`);
      }
      if (issues.length > 0) {
        console.log(`   ❌ Проблемы: ${issues.length}`);
        issues.forEach(issue => {
          console.log(`      - ${issue.type}`);
        });
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${slug}: ошибка - ${error.message}`);
      if (error.response) {
        console.log(`   Статус: ${error.response.status}`);
        console.log(`   Данные: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      results.push({ slug, status: 'error', error: error.message });
    }
  }
  
  // Сохраняем результаты
  const outputPath = path.join(__dirname, '../../about-pages-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n📊 Результаты сохранены в: ${outputPath}`);
  
  // Итоговая статистика
  const totalIssues = results.reduce((sum, r) => sum + (r.issues ? r.issues.length : 0), 0);
  const pagesWithIssues = results.filter(r => r.issues && r.issues.length > 0).length;
  const pagesWithNonStandardClasses = results.filter(r => r.nonStandardClasses && r.nonStandardClasses.length > 0).length;
  
  console.log('\n📈 Итоговая статистика:');
  console.log(`   Всего страниц: ${results.length}`);
  console.log(`   Страниц с проблемами: ${pagesWithIssues}`);
  console.log(`   Всего проблем: ${totalIssues}`);
  console.log(`   Страниц с нестандартными классами: ${pagesWithNonStandardClasses}`);
  
  return results;
}

analyzeAboutPages().catch(console.error);

