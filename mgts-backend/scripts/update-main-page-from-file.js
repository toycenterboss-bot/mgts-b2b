/**
 * Скрипт для обновления контента главной страницы в Strapi из файла main_page.txt
 * 
 * Запуск:
 *   node scripts/update-main-page-from-file.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Путь к файлу main_page.txt
const mainPageFilePath = path.join(__dirname, '../../main_page.txt');

// Функция для HTTP запросов
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function waitForStrapi(maxAttempts = 10) {
  const strapiUrl = 'http://localhost:1337';
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest(`${strapiUrl}/api/pages?pagination[limit]=1`);
      if (response.status === 200) {
        return true;
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    console.log(`[Update Main Page] Ожидание Strapi... (попытка ${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

async function updateMainPageFromFile() {
  try {
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

    // URL Strapi API
    const strapiUrl = 'http://localhost:1337';
    const apiUrl = `${strapiUrl}/api/pages?filters[slug][$eq]=main_page`;

    // Подождать пока Strapi запустится
    console.log('[Update Main Page] Ожидание запуска Strapi...');
    const strapiReady = await waitForStrapi(15);
    if (!strapiReady) {
      console.error('❌ Strapi не отвечает. Убедитесь, что он запущен на http://localhost:1337');
      return false;
    }

    console.log('[Update Main Page] Поиск страницы main_page в Strapi...');

    // Найти страницу
    const response = await makeRequest(apiUrl);
    if (response.status !== 200) {
      throw new Error(`Ошибка при запросе к API: ${response.status}`);
    }

    const data = response.data;
    
    if (!data.data || data.data.length === 0) {
      console.error('❌ Страница с slug "main_page" не найдена в Strapi');
      console.log('Доступные страницы:');
      const allPagesResponse = await makeRequest(`${strapiUrl}/api/pages?fields=slug,title`);
      if (allPagesResponse.data && allPagesResponse.data.data) {
        allPagesResponse.data.data.forEach(page => {
          console.log(`  - ${page.slug} (${page.title})`);
        });
      }
      return false;
    }

    const page = data.data[0];
    console.log(`[Update Main Page] Найдена страница: ${page.title} (ID: ${page.id})`);

    // Обновить контент
    const updateUrl = `${strapiUrl}/api/pages/${page.id}`;
    console.log('[Update Main Page] Обновление контента...');

    const updateResponse = await makeRequest(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          content: content
        }
      })
    });

    if (updateResponse.status !== 200) {
      const errorText = typeof updateResponse.data === 'string' ? updateResponse.data : JSON.stringify(updateResponse.data);
      throw new Error(`Ошибка при обновлении: ${updateResponse.status}\n${errorText}`);
    }

    console.log('✅ Контент главной страницы успешно обновлен в Strapi!');
    console.log(`   Длина контента: ${content.length} символов`);
    console.log('   Картинки mirror-slider-1.jpg, mirror-slider-2.jpg, mirror-slider-3.jpg должны отображаться');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при обновлении контента:', error.message);
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

