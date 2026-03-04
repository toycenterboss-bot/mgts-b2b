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

function fixHTMLStructure(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  let changes = 0;
  
  // Найти все service-card элементы
  const serviceCards = doc.querySelectorAll('.service-card');
  
  serviceCards.forEach(card => {
    // Проверить, есть ли внутри div без класса
    const divsWithoutClass = Array.from(card.querySelectorAll('div')).filter(d => {
      const className = d.className || '';
      return !className || className.trim() === '';
    });
    
    // Проверить, есть ли элементы с color: white в inline стилях
    const elementsWithWhiteColor = Array.from(card.querySelectorAll('*')).filter(el => {
      const style = el.getAttribute('style') || '';
      return style.includes('color') && (style.includes('white') || style.includes('#fff') || style.includes('rgb(255'));
    });
    
    // Удалить inline стили с color: white
    elementsWithWhiteColor.forEach(el => {
      const style = el.getAttribute('style') || '';
      const newStyle = style
        .split(';')
        .filter(prop => {
          const trimmed = prop.trim();
          return trimmed && !trimmed.toLowerCase().startsWith('color');
        })
        .join(';');
      
      if (newStyle !== style) {
        if (newStyle.trim()) {
          el.setAttribute('style', newStyle);
        } else {
          el.removeAttribute('style');
        }
        changes++;
      }
    });
    
    // Убедиться, что все div внутри service-card имеют классы
    divsWithoutClass.forEach(div => {
      // Если div содержит только текст или простые элементы, можно оставить без класса
      // Но если это структурный элемент, добавим класс
      const hasStructuralContent = div.querySelector('h3, h2, p, ul, ol, a, img') !== null;
      if (hasStructuralContent && div.textContent.trim().length > 0) {
        // Проверить, не является ли это оберткой для контента
        const parent = div.parentElement;
        if (parent && parent.classList.contains('service-card')) {
          // Это может быть обертка, которую нужно заменить на service-card-body
          div.className = 'service-card-body';
          changes++;
        } else {
          // Добавить базовый класс
          div.className = 'service-card-content';
          changes++;
        }
      }
    });
  });
  
  return {
    html: doc.documentElement.outerHTML,
    changes
  };
}

async function fixAboutPages(dryRun = true) {
  console.log(`🔧 ${dryRun ? 'DRY RUN: ' : ''}Исправление стилей на страницах раздела "О компании"\n`);
  
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
        continue;
      }
      
      const content = page.content || '';
      if (!content || content.trim() === '') {
        console.log(`⚠️  ${slug}: контент пустой`);
        continue;
      }
      
      const { html, changes } = fixHTMLStructure(content);
      
      if (changes > 0) {
        console.log(`✅ ${slug}: исправлено ${changes} проблем`);
        
        if (!dryRun) {
          // Обновить страницу в Strapi
          await api.put(`/pages/${page.id}`, {
            data: {
              content: html
            }
          });
          console.log(`   📝 Обновлено в Strapi`);
        }
        
        results.push({ slug, changes, fixed: !dryRun });
      } else {
        console.log(`✓  ${slug}: проблем не найдено`);
        results.push({ slug, changes: 0, fixed: false });
      }
      
    } catch (error) {
      console.log(`❌ ${slug}: ошибка - ${error.message}`);
      results.push({ slug, error: error.message });
    }
  }
  
  // Сохранить результаты
  const outputPath = path.join(__dirname, '../../fix-about-styles-results.json');
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
}

// Запуск
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

fixAboutPages(dryRun).catch(console.error);

