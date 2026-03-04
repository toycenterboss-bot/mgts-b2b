/**
 * Скрипт для обновления страниц услуг в Strapi:
 * Добавляет компоненты (тарифы, FAQ, формы) в контент страниц услуг
 */

const fs = require('fs');
const path = require('path');

// API настройки
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

// Список страниц услуг
const servicePages = [
  'business/internet/gpon',
  'business/internet/dedicated',
  'business/internet/office',
  'business/telephony/fixed',
  'business/telephony/ip',
  'business/telephony/vpbx',
  'business/telephony/mobile',
  'business/security/video-surveillance',
  'business/security/access-control',
  'business/security/alarm',
  'business/cloud/storage',
  'business/cloud/vps',
  'business/cloud/services',
  'business/tv/iptv',
  'business/tv/office'
];

// Загружаем HTML контент компонентов
// Пробуем несколько возможных путей
const possiblePaths = [
  path.join(__dirname, '../../../service-components-content.html'),
  path.join(process.cwd(), 'service-components-content.html'),
  path.join(__dirname, '../../service-components-content.html')
];

let componentsHtml = '';
let componentsHtmlPath = null;

for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    componentsHtmlPath = testPath;
    break;
  }
}

if (componentsHtmlPath) {
  componentsHtml = fs.readFileSync(componentsHtmlPath, 'utf8');
  console.log(`✅ Загружен HTML контент компонентов из: ${componentsHtmlPath}`);
} else {
  console.error('❌ Файл service-components-content.html не найден!');
  console.error('Проверенные пути:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

async function updatePageContent(slug, apiToken) {
  try {
    // Получаем страницу по slug - используем правильный формат Strapi v5
    const getUrl = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    const getResponse = await fetch(getUrl, { headers });
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`HTTP error! status: ${getResponse.status}, body: ${errorText}`);
    }
    
    const getData = await getResponse.json();
    
    // Проверяем структуру ответа
    if (!getData || typeof getData !== 'object') {
      throw new Error(`Неожиданный формат ответа: ${JSON.stringify(getData).substring(0, 200)}`);
    }
    
    // Проверяем структуру ответа Strapi v5
    // В Strapi v5 ответ в формате { data: [...], meta: {...} }
    const pages = Array.isArray(getData.data) ? getData.data : [];
    
    if (!pages || pages.length === 0) {
      console.log(`⚠️  Страница ${slug} не найдена, создаем новую...`);
      
      // Создаем новую страницу
      const pageTitle = slug.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const createData = {
        data: {
          slug: slug,
          title: pageTitle,
          content: componentsHtml,
          publishedAt: new Date().toISOString()
        }
      };
      
      const createResponse = await fetch(`${STRAPI_URL}/api/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createData)
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`HTTP error! status: ${createResponse.status}, body: ${errorText}`);
      }
      
      const createResult = await createResponse.json();
      
      // Публикуем страницу
      const pageId = createResult.data.documentId || createResult.data.id;
      const publishUrl = `${STRAPI_URL}/api/pages/${pageId}/actions/publish`;
      await fetch(publishUrl, {
        method: 'POST',
        headers
      });
      
      console.log(`✅ Создана и опубликована страница: ${slug}`);
      return { action: 'created', published: true };
    }
    
    // Получаем страницу из ответа
    const page = pages[0];
    
    // В Strapi v5 структура: { id, documentId, attributes: {...} }
    const pageId = page.documentId || page.id;
    const pageAttributes = page.attributes || page;
    
    // Получаем текущий контент
    let currentContent = pageAttributes.content || '';
    
    // Проверяем, есть ли уже компоненты услуг
    if (currentContent.includes('service-tariffs') || 
        currentContent.includes('service-faq') || 
        currentContent.includes('service-order')) {
      console.log(`⏭️  Страница ${slug} уже содержит компоненты услуг, пропускаем...`);
      return { action: 'skipped', reason: 'already_has_components' };
    }
    
    // Добавляем компоненты к существующему контенту
    const updatedContent = currentContent 
      ? `${currentContent}\n\n${componentsHtml}`
      : componentsHtml;
    
    // Обновляем страницу
    const updateUrl = `${STRAPI_URL}/api/pages/${pageId}`;
    const updateData = {
      data: {
        content: updatedContent
      }
    };
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`HTTP error! status: ${updateResponse.status}, body: ${errorText}`);
    }
    
    const updateResult = await updateResponse.json();
    
    // Публикуем страницу
    const publishUrl = `${STRAPI_URL}/api/pages/${pageId}/actions/publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers
    });
    
    if (publishResponse.ok) {
      console.log(`✅ Обновлена и опубликована страница: ${slug}`);
      return { action: 'updated', published: true };
    } else {
      console.log(`✅ Обновлена страница: ${slug} (не опубликована)`);
      return { action: 'updated', published: false };
    }
    
  } catch (error) {
    console.error(`❌ Ошибка при обновлении ${slug}:`, error.message);
    return { action: 'error', error: error.message };
  }
}

async function updateAllServicePages() {
  console.log('='.repeat(70));
  console.log('ОБНОВЛЕНИЕ СТРАНИЦ УСЛУГ В STRAPI');
  console.log('='.repeat(70));
  console.log(`\nStrapi URL: ${STRAPI_URL}`);
  console.log(`API Token: ${API_TOKEN ? '✅ Установлен' : '⚠️  Не установлен (может потребоваться для авторизации)'}`);
  console.log(`\nВсего страниц для обновления: ${servicePages.length}\n`);
  
  const results = {
    updated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };
  
  for (const slug of servicePages) {
    const result = await updatePageContent(slug, API_TOKEN);
    results.details.push({ slug, ...result });
    
    if (result.action === 'updated') {
      results.updated++;
    } else if (result.action === 'skipped') {
      results.skipped++;
    } else if (result.action === 'error') {
      results.errors++;
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ');
  console.log('='.repeat(70));
  console.log(`✅ Обновлено: ${results.updated}`);
  console.log(`⏭️  Пропущено: ${results.skipped}`);
  console.log(`❌ Ошибок: ${results.errors}`);
  
  if (results.errors > 0) {
    console.log('\nОшибки:');
    results.details
      .filter(r => r.action === 'error')
      .forEach(r => console.log(`  - ${r.slug}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(70));
  
  return results;
}

// Запуск скрипта
if (require.main === module) {
  updateAllServicePages()
    .then(() => {
      console.log('\n✅ Обновление завершено!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { updateAllServicePages, updatePageContent };

