/**
 * Скрипт для обновления контента главной страницы в Strapi через API с токеном
 * 
 * Запуск:
 *   node scripts/update-main-page-with-token.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API токен для Strapi
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


// URL Strapi
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Путь к файлу main_page.txt
const mainPageFilePath = path.join(__dirname, '../../main_page.txt');

// Создать axios клиент
const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function updateMainPageFromFile() {
  try {
    console.log('[Update Main Page] Начинаю обновление через API...');
    
    // Проверить существование файла
    if (!fs.existsSync(mainPageFilePath)) {
      console.error('❌ Файл main_page.txt не найден:', mainPageFilePath);
      return false;
    }

    // Прочитать содержимое файла
    const content = fs.readFileSync(mainPageFilePath, 'utf-8');
    console.log(`[Update Main Page] Прочитан файл main_page.txt, длина: ${content.length} символов`);

    // Проверить, что контент не пустой
    if (!content.trim()) {
      console.error('❌ Файл main_page.txt пустой');
      return false;
    }

    console.log('[Update Main Page] Поиск страницы main_page в Strapi...');

    // Найти страницу
    const findResponse = await api.get('/pages', {
      params: {
        'filters[slug][$eq]': 'main_page'
      }
    });

    if (!findResponse.data.data || findResponse.data.data.length === 0) {
      console.error('❌ Страница с slug "main_page" не найдена в Strapi');
      console.log('Доступные страницы:');
      try {
        const allPagesResponse = await api.get('/pages', {
          params: {
            'fields[0]': 'slug',
            'fields[1]': 'title'
          }
        });
        if (allPagesResponse.data && allPagesResponse.data.data) {
          allPagesResponse.data.data.forEach(page => {
            console.log(`  - ${page.slug} (${page.title || 'без названия'})`);
          });
        }
      } catch (e) {
        console.error('Не удалось получить список страниц:', e.message);
      }
      return false;
    }

    const page = findResponse.data.data[0];
    const pageId = page.documentId || page.id;
    console.log(`[Update Main Page] Найдена страница: ${page.title || 'без названия'} (ID: ${pageId}, documentId: ${page.documentId || 'нет'})`);
    console.log(`[Update Main Page] Статус публикации: ${page.publishedAt ? 'опубликована' : 'черновик'}`);

    // Обновить контент
    console.log('[Update Main Page] Обновление контента...');

    // Попробуем обновить через documentId
    const updateResponse = await api.put(`/pages/${pageId}`, {
      data: {
        content: content
      }
    });

    if (updateResponse.status !== 200) {
      throw new Error(`Ошибка при обновлении: ${updateResponse.status}`);
    }

    console.log('✅ Контент главной страницы успешно обновлен в Strapi!');
    console.log(`   Длина контента: ${content.length} символов`);
    console.log('   Картинки mirror-slider-1.jpg, mirror-slider-2.jpg, mirror-slider-3.jpg должны отображаться');
    console.log('   Пути: images/mirror-slider-1.jpg, images/mirror-slider-2.jpg, images/mirror-slider-3.jpg');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при обновлении контента:', error.message);
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Запуск скрипта
if (require.main === module) {
  updateMainPageFromFile()
    .then(success => {
      if (success) {
        console.log('\n✅ Готово! Обновите страницу в браузере (Ctrl+F5)');
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { updateMainPageFromFile };

