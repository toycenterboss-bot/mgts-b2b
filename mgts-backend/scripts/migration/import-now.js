/**
 * Скрипт для немедленного импорта контента
 * Запуск: node scripts/migration/import-now.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Проверка наличия parsed-content.json
const parsedContentPath = path.join(__dirname, '../extract-content/parsed-content.json');
if (!fs.existsSync(parsedContentPath)) {
  console.error('\n❌ Ошибка: Файл parsed-content.json не найден!');
  console.error('Сначала запустите скрипт извлечения:');
  console.error('  cd scripts/extract-content && node html-parser.js\n');
  process.exit(1);
}

console.log('\n📥 Запуск импорта через Strapi console...\n');

// Создаем временный скрипт для консоли
const consoleScript = `
const fs = require('fs');
const path = require('path');

const parsedContentPath = path.join(__dirname, '../../scripts/extract-content/parsed-content.json');
const parsedContent = JSON.parse(fs.readFileSync(parsedContentPath, 'utf-8'));

console.log(\`Найдено страниц для импорта: \${parsedContent.length}\\n\`);

function adaptPageData(pageData) {
  const heroTitle = pageData.heroTitle || pageData.title;
  let contentHtml = '';
  
  if (pageData.content && Array.isArray(pageData.content)) {
    pageData.content.forEach(section => {
      if (section.title) {
        contentHtml += \`<h2>\${section.title}</h2>\\n\`;
      }
      if (section.type === 'text' && section.content) {
        contentHtml += section.content + '\\n';
      } else if (section.type === 'cards' && section.cards) {
        section.cards.forEach(card => {
          contentHtml += \`<div class="card">\\n\`;
          if (card.title) contentHtml += \`  <h3>\${card.title}</h3>\\n\`;
          if (card.description) contentHtml += \`  <p>\${card.description}</p>\\n\`;
          contentHtml += \`</div>\\n\`;
        });
      } else if (section.type === 'grid' && section.items) {
        contentHtml += \`<div class="grid">\\n\`;
        section.items.forEach(item => {
          contentHtml += \`  <div class="grid-item">\\n\`;
          if (item.title) contentHtml += \`    <h3>\${item.title}</h3>\\n\`;
          if (item.content) contentHtml += \`    <p>\${item.content}</p>\\n\`;
          contentHtml += \`  </div>\\n\`;
        });
        contentHtml += \`</div>\\n\`;
      }
    });
  }
  
  const breadcrumbsJson = pageData.breadcrumbs && pageData.breadcrumbs.length > 0
    ? JSON.stringify(pageData.breadcrumbs)
    : null;
  
  return {
    slug: pageData.slug,
    title: pageData.title,
    metaDescription: pageData.metaDescription || '',
    metaKeywords: pageData.metaKeywords || '',
    heroTitle: heroTitle,
    heroSubtitle: pageData.heroSubtitle || null,
    content: contentHtml || null,
    breadcrumbs: breadcrumbsJson,
    sidebar: pageData.sidebar || 'none',
    publishedAt: new Date().toISOString()
  };
}

let success = 0;
let errors = 0;

(async () => {
  for (let i = 0; i < parsedContent.length; i++) {
    const pageData = parsedContent[i];
    process.stdout.write(\`\\rИмпорт: \${i + 1}/\${parsedContent.length} (\${pageData.slug})...\`);
    
    try {
      const adaptedData = adaptPageData(pageData);
      
      const existing = await strapi.entityService.findMany('api::page.page', {
        filters: { slug: adaptedData.slug },
      });
      
      if (existing && existing.length > 0) {
        await strapi.entityService.update('api::page.page', existing[0].id, {
          data: adaptedData,
        });
        success++;
      } else {
        await strapi.entityService.create('api::page.page', {
          data: adaptedData,
        });
        success++;
      }
    } catch (error) {
      console.error(\`\\n❌ Ошибка при импорте \${pageData.slug}:\`, error.message);
      errors++;
    }
  }
  
  process.stdout.write('\\r' + ' '.repeat(80) + '\\r');
  
  console.log(\`\\n✅ Импорт завершен!\\n\`);
  console.log(\`   - ✅ Успешно: \${success}\`);
  console.log(\`   - ❌ Ошибок: \${errors}\\n\`);
  
  process.exit(0);
})();
`;

const tempScriptPath = path.join(__dirname, 'temp-import.js');
fs.writeFileSync(tempScriptPath, consoleScript);

try {
  // Запускаем через Strapi console
  console.log('Запуск импорта...\n');
  execSync(`cd ${path.join(__dirname, '../..')} && npm run console < ${tempScriptPath}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });
} catch (error) {
  console.error('\n❌ Ошибка при запуске импорта:', error.message);
  console.log('\nПопробуйте запустить вручную:');
  console.log('  1. npm run console');
  console.log('  2. .load scripts/migration/import-via-console.js');
} finally {
  // Удаляем временный файл
  if (fs.existsSync(tempScriptPath)) {
    fs.unlinkSync(tempScriptPath);
  }
}





