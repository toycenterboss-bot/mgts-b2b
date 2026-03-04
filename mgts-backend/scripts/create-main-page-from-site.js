/**
 * Скрипт для создания страницы main_page в Strapi на основе контента с business.mgts.ru
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const CONTENT_FILE = path.join(__dirname, '../../main_page_content.html');

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function findPageBySlug(slug) {
  try {
    const response = await api.get(`/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`);
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding page:', error.message);
    return null;
  }
}

async function createOrUpdatePage(content) {
  try {
    // Проверяем, существует ли страница
    const existingPage = await findPageBySlug('main_page');
    
    const pageData = {
      slug: 'main_page',
      title: 'Главная страница',
      content: content,
      metaDescription: 'Цифровые решения для вашего бизнеса: интернет, телефония, облачные сервисы, видеонаблюдение от МГТС',
      metaKeywords: 'интернет для бизнеса, телефония, облако, видеонаблюдение, МГТС, бизнес-услуги',
      publishedAt: new Date().toISOString()
    };

    if (existingPage) {
      // Обновляем существующую страницу
      console.log('[Create] Обновление существующей страницы main_page...');
      const documentId = existingPage.documentId || existingPage.id;
      const response = await api.put(`/pages/${documentId}`, {
        data: pageData
      });
      
      console.log('[Create] ✅ Страница обновлена успешно');
      console.log('[Create] Document ID:', documentId);
      
      // Публикуем страницу
      try {
        await api.put(`/pages/${documentId}/actions/publish`);
        console.log('[Create] ✅ Страница опубликована');
      } catch (pubError) {
        console.warn('[Create] ⚠️ Не удалось опубликовать страницу:', pubError.message);
      }
      
      return response.data;
    } else {
      // Создаем новую страницу
      console.log('[Create] Создание новой страницы main_page...');
      const response = await api.post('/pages', {
        data: pageData
      });
      
      console.log('[Create] ✅ Страница создана успешно');
      console.log('[Create] Document ID:', response.data.data?.documentId || response.data.data?.id);
      
      // Публикуем страницу
      const documentId = response.data.data?.documentId || response.data.data?.id;
      if (documentId) {
        try {
          await api.put(`/pages/${documentId}/actions/publish`);
          console.log('[Create] ✅ Страница опубликована');
        } catch (pubError) {
          console.warn('[Create] ⚠️ Не удалось опубликовать страницу:', pubError.message);
        }
      }
      
      return response.data;
    }
  } catch (error) {
    console.error('[Create] ❌ Ошибка при создании/обновлении страницы:', error.message);
    if (error.response) {
      console.error('[Create] Status:', error.response.status);
      console.error('[Create] Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function main() {
  console.log('[Create] Загрузка контента из файла...');
  
  if (!fs.existsSync(CONTENT_FILE)) {
    console.error(`[Create] ❌ Файл не найден: ${CONTENT_FILE}`);
    console.log('[Create] Запустите сначала: node scripts/fetch-main-page.js и node scripts/extract-main-content.js');
    process.exit(1);
  }
  
  const content = fs.readFileSync(CONTENT_FILE, 'utf-8');
  console.log(`[Create] Контент загружен, размер: ${(content.length / 1024).toFixed(2)} KB`);
  
  if (!content || content.trim().length === 0) {
    console.error('[Create] ❌ Контент пуст');
    process.exit(1);
  }
  
  console.log('[Create] Создание/обновление страницы в Strapi...');
  await createOrUpdatePage(content);
  
  console.log('\n✅✅✅ ГОТОВО!');
  console.log('Страница main_page создана/обновлена в Strapi');
  console.log(`Проверьте: ${STRAPI_URL}/admin/content-manager/collection-types/api::page.page`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



