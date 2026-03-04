const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
  console.error('\nСоздайте токен в Strapi:');
  console.error('  1. Откройте http://localhost:1337/admin');
  console.error('  2. Settings → API Tokens → Create new API Token');
  console.error('  3. Name: Import Script');
  console.error('  4. Token duration: Unlimited');
  console.error('  5. Token type: Full access');
  console.error('  6. Скопируйте токен и установите:');
  console.error('     export STRAPI_API_TOKEN="your_token_here"\n');
  process.exit(1);
}

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Адаптация данных под текущую схему Page
function adaptPageData(pageData) {
  // Объединяем heroTitle и heroSubtitle в heroTitle
  const heroTitle = pageData.heroTitle || pageData.title;
  
  // Объединяем контент секций в один Rich Text
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
  
  // Преобразуем breadcrumbs в JSON
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

async function importPage(pageData) {
  try {
    const adaptedData = adaptPageData(pageData);
    
    // Проверить, существует ли страница
    const existing = await api.get(`/pages?filters[slug][$eq]=${encodeURIComponent(adaptedData.slug)}`);
    
    if (existing.data.data && existing.data.data.length > 0) {
      console.log(`⚠️  Страница ${adaptedData.slug} уже существует, обновляем...`);
      const pageId = existing.data.data[0].id;
      const response = await api.put(`/pages/${pageId}`, { data: adaptedData });
      return { action: 'updated', data: response.data };
    } else {
      console.log(`✅ Создаем страницу ${adaptedData.slug}...`);
      const response = await api.post('/pages', { data: adaptedData });
      return { action: 'created', data: response.data };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ Ошибка при импорте ${pageData.slug}:`, errorMsg);
    throw error;
  }
}

async function importAllPages() {
  const parsedContentPath = path.join(__dirname, '../extract-content/parsed-content.json');
  
  if (!fs.existsSync(parsedContentPath)) {
    console.error('\n❌ Ошибка: Файл parsed-content.json не найден!');
    console.error('Сначала запустите скрипт извлечения:');
    console.error('  cd scripts/extract-content && node html-parser.js\n');
    process.exit(1);
  }
  
  const parsedContent = JSON.parse(fs.readFileSync(parsedContentPath, 'utf-8'));
  
  console.log(`\n🚀 Начинаем импорт ${parsedContent.length} страниц...\n`);
  console.log(`Strapi URL: ${STRAPI_URL}\n`);
  
  let success = 0;
  let errors = 0;
  const results = [];
  
  for (let i = 0; i < parsedContent.length; i++) {
    const pageData = parsedContent[i];
    process.stdout.write(`\rИмпорт: ${i + 1}/${parsedContent.length} (${pageData.slug})...`);
    
    try {
      const result = await importPage(pageData);
      results.push({ slug: pageData.slug, ...result });
      success++;
      
      // Небольшая задержка, чтобы не перегрузить сервер
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({ slug: pageData.slug, error: error.message });
      errors++;
    }
  }
  
  process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Очистить строку прогресса
  
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
}

// Запуск
importAllPages().catch(error => {
  console.error('\n❌ Критическая ошибка:', error.message);
  process.exit(1);
});





