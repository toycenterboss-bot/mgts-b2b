/**
 * Импорт контента через Strapi entityService (внутренний API)
 * Запускается внутри контекста Strapi
 */

const fs = require('fs');
const path = require('path');

module.exports = async ({ strapi }) => {
  console.log('\n🚀 Начинаем импорт контента через Strapi API...\n');
  
  const parsedContentPath = path.join(__dirname, '../extract-content/parsed-content.json');
  
  if (!fs.existsSync(parsedContentPath)) {
    console.error('\n❌ Ошибка: Файл parsed-content.json не найден!');
    console.error('Сначала запустите скрипт извлечения:');
    console.error('  cd scripts/extract-content && node html-parser.js\n');
    return;
  }
  
  const parsedContent = JSON.parse(fs.readFileSync(parsedContentPath, 'utf-8'));
  
  console.log(`Найдено страниц для импорта: ${parsedContent.length}\n`);
  
  // Адаптация данных под текущую схему Page
  function adaptPageData(pageData) {
    const heroTitle = pageData.heroTitle || pageData.title;
    
    let contentHtml = '';
    
    if (pageData.content && Array.isArray(pageData.content)) {
      pageData.content.forEach(section => {
        if (section.title) {
          contentHtml += `<h2>${section.title}</h2>\n`;
        }
        
        if (section.type === 'text' && section.content) {
          contentHtml += section.content + '\n';
        } else if (section.type === 'cards' && section.cards) {
          section.cards.forEach(card => {
            contentHtml += `<div class="card">\n`;
            if (card.title) contentHtml += `  <h3>${card.title}</h3>\n`;
            if (card.description) contentHtml += `  <p>${card.description}</p>\n`;
            contentHtml += `</div>\n`;
          });
        } else if (section.type === 'grid' && section.items) {
          contentHtml += `<div class="grid">\n`;
          section.items.forEach(item => {
            contentHtml += `  <div class="grid-item">\n`;
            if (item.title) contentHtml += `    <h3>${item.title}</h3>\n`;
            if (item.content) contentHtml += `    <p>${item.content}</p>\n`;
            contentHtml += `  </div>\n`;
          });
          contentHtml += `</div>\n`;
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
  const results = [];
  
  for (let i = 0; i < parsedContent.length; i++) {
    const pageData = parsedContent[i];
    process.stdout.write(`\rИмпорт: ${i + 1}/${parsedContent.length} (${pageData.slug})...`);
    
    try {
      const adaptedData = adaptPageData(pageData);
      
      // Проверить, существует ли страница
      const existing = await strapi.entityService.findMany('api::page.page', {
        filters: { slug: adaptedData.slug },
      });
      
      if (existing && existing.length > 0) {
        console.log(`\n⚠️  Страница ${adaptedData.slug} уже существует, обновляем...`);
        const pageId = existing[0].id;
        const updated = await strapi.entityService.update('api::page.page', pageId, {
          data: adaptedData,
        });
        results.push({ slug: pageData.slug, action: 'updated', data: updated });
        success++;
      } else {
        const created = await strapi.entityService.create('api::page.page', {
          data: adaptedData,
        });
        results.push({ slug: pageData.slug, action: 'created', data: created });
        success++;
      }
    } catch (error) {
      console.error(`\n❌ Ошибка при импорте ${pageData.slug}:`, error.message);
      results.push({ slug: pageData.slug, error: error.message });
      errors++;
    }
  }
  
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  
  console.log(`\n✅ Импорт завершен!`);
  console.log(`\n📊 Результаты:`);
  console.log(`   - ✅ Успешно: ${success}`);
  console.log(`   - ❌ Ошибок: ${errors}`);
  
  // Сохранить результаты
  const resultsPath = path.join(__dirname, 'import-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`   - 💾 Результаты сохранены в: ${resultsPath}\n`);
  
  if (errors > 0) {
    console.log('⚠️  Страницы с ошибками:');
    results.filter(r => r.error).forEach(r => {
      console.log(`   - ${r.slug}: ${r.error}`);
    });
    console.log('');
  }
};





