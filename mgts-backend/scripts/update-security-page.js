/**
 * Скрипт для обновления контента страницы business/security в Strapi
 * 
 * Запуск:
 *   cd mgts-backend
 *   node scripts/update-security-page.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API токен для Strapi (из CONTEXT.md)
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// URL Strapi
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Создать axios клиент
const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Обновление страницы business/security
 */
async function updateSecurityPage() {
  try {
    console.log('[Update Security Page] Начинаю обновление страницы business/security...\n');

    // Загрузить исправленный контент
    const fixedContentPath = path.join(__dirname, '../../strapi-backups/2026-01-07_19-29-07/business_security_fixed.json');
    
    if (!fs.existsSync(fixedContentPath)) {
      console.error(`❌ Файл с исправленным контентом не найден: ${fixedContentPath}`);
      return false;
    }

    const fixedData = JSON.parse(fs.readFileSync(fixedContentPath, 'utf-8'));
    console.log(`[Update Security Page] Загружен исправленный контент для: ${fixedData.slug}\n`);

    // Получить текущую страницу из Strapi
    console.log('[Update Security Page] Получение текущей страницы из Strapi...');
    const findResponse = await api.get('/pages', {
      params: {
        'filters[slug][$eq]': fixedData.slug
      }
    });

    if (!findResponse.data.data || findResponse.data.data.length === 0) {
      console.error(`❌ Страница с slug "${fixedData.slug}" не найдена в Strapi`);
      console.error('   Создайте страницу вручную в Strapi Admin Panel или используйте скрипт импорта');
      return false;
    }

    const page = findResponse.data.data[0];
    const pageId = page.documentId || page.id;
    
    console.log(`[Update Security Page] Найдена страница: ${page.title || 'без названия'} (ID: ${pageId})`);
    console.log(`[Update Security Page] Текущая длина контента: ${(page.content || '').length} символов`);
    console.log(`[Update Security Page] Новая длина контента: ${(fixedData.content || '').length} символов\n`);

    // Подготовить данные для обновления
    const updateData = {
      content: fixedData.content,
      title: fixedData.title,
      metaDescription: fixedData.metaDescription,
      metaKeywords: fixedData.metaKeywords,
      heroTitle: fixedData.heroTitle,
      heroSubtitle: fixedData.heroSubtitle,
      breadcrumbs: fixedData.breadcrumbs ? JSON.stringify(fixedData.breadcrumbs) : null,
      sidebar: fixedData.sidebar || 'none'
    };

    // Обновить страницу в Strapi
    console.log('[Update Security Page] Обновление контента в Strapi...');
    const updateResponse = await api.put(`/pages/${pageId}`, {
      data: updateData
    });

    if (updateResponse.status !== 200) {
      throw new Error(`Ошибка при обновлении: ${updateResponse.status}`);
    }

    console.log('\n✅ Страница business/security успешно обновлена в Strapi!');
    console.log('   Проверьте результат на сайте: /business/security/\n');

    return true;
  } catch (error) {
    console.error('\n❌ Ошибка при обновлении страницы:', error.message);
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
  updateSecurityPage()
    .then(success => {
      if (success) {
        console.log('✅ Готово! Обновите страницу в браузере (Ctrl+F5)');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { updateSecurityPage };

