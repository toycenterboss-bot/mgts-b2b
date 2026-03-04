/**
 * Скрипт для обновления классов в контенте Strapi
 * Заменяет старые классы на новые согласно системе классов
 * 
 * Запуск:
 *   node scripts/update-classes-in-strapi.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API токен для Strapi (нужно обновить)
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
 * Замена классов в HTML контенте
 */
function updateClassesInContent(htmlContent) {
  let updated = htmlContent;
  let changes = [];

  // 1. Замена card-box на card card--navigation card--hoverable
  // card-box используется для навигационных карточек (партнерство)
  const cardBoxRegex = /class="([^"]*?\s)?card-box(\s[^"]*?)?"/g;
  updated = updated.replace(cardBoxRegex, (match, before = '', after = '') => {
    const classes = (before + 'card-box' + after).trim().split(/\s+/);
    classes.splice(classes.indexOf('card-box'), 1, 'card', 'card--navigation', 'card--hoverable');
    changes.push('card-box → card card--navigation card--hoverable');
    return `class="${classes.join(' ')}"`;
  });

  // 2. Замена card-box-content на card__body (BEM нотация)
  updated = updated.replace(/class="([^"]*?\s)?card-box-content(\s[^"]*?)?"/g, (match, before = '', after = '') => {
    const classes = (before + 'card-box-content' + after).trim().split(/\s+/);
    classes.splice(classes.indexOf('card-box-content'), 1, 'card__body');
    changes.push('card-box-content → card__body');
    return `class="${classes.join(' ')}"`;
  });

  // 3. Замена card-box-img на card__icon (для иконок в карточках)
  updated = updated.replace(/class="([^"]*?\s)?card-box-img(\s[^"]*?)?"/g, (match, before = '', after = '') => {
    const classes = (before + 'card-box-img' + after).trim().split(/\s+/);
    classes.splice(classes.indexOf('card-box-img'), 1, 'card__icon');
    changes.push('card-box-img → card__icon');
    return `class="${classes.join(' ')}"`;
  });

  // 4. Добавление grid-item в cards-scroll-container (для партнерства)
  // Обернем каждый card-box в grid-item
  updated = updated.replace(
    /<div class="card card--navigation card--hoverable([^"]*?)">/g,
    '<div class="grid-item"><div class="card card--navigation card--hoverable$1">'
  );
  updated = updated.replace(
    /<\/div><\/div><div class="card card--navigation card--hoverable/g,
    '</div></div></div><div class="grid-item"><div class="card card--navigation card--hoverable'
  );
  // Закрываем grid-item после каждой карточки
  updated = updated.replace(
    /(<\/div><\/div>)(<div class="grid-item">|<\/div><\/div><\/div>)/g,
    (match, cardClose, next) => {
      if (next === '</div></div></div>') {
        return '</div></div></div></div>';
      }
      return '</div></div></div>' + next;
    }
  );

  // 5. Замена card-our-services на card card--info (для информационных карточек услуг)
  // Но оставляем специфичные классы для главной страницы
  updated = updated.replace(/class="([^"]*?\s)?card-our-services(\s[^"]*?)?"/g, (match, before = '', after = '') => {
    const classes = (before + 'card-our-services' + after).trim().split(/\s+/);
    // Сохраняем специфичные классы (operators, government, developers, active)
    const specificClasses = classes.filter(c => 
      ['operators', 'government', 'developers', 'active'].includes(c)
    );
    classes.splice(classes.indexOf('card-our-services'), 1, 'card', 'card--info');
    if (specificClasses.length > 0) {
      classes.push(...specificClasses);
    }
    changes.push('card-our-services → card card--info');
    return `class="${classes.join(' ')}"`;
  });

  // 6. Замена card-our-services__content на card__body
  updated = updated.replace(/class="([^"]*?\s)?card-our-services__content(\s[^"]*?)?"/g, (match, before = '', after = '') => {
    const classes = (before + 'card-our-services__content' + after).trim().split(/\s+/);
    classes.splice(classes.indexOf('card-our-services__content'), 1, 'card__body');
    changes.push('card-our-services__content → card__body');
    return `class="${classes.join(' ')}"`;
  });

  // 7. Замена card-our-services__content-title на h3 (оставляем класс для стилизации)
  // Или можно оставить как есть, если есть специфичные стили

  // 8. Добавление grid-item в cards-container для правильной работы сетки
  // Это уже сделано выше для card-box

  return { updated, changes: [...new Set(changes)] };
}

/**
 * Обновление главной страницы
 */
async function updateMainPageClasses() {
  try {
    console.log('[Update Classes] Начинаю обновление классов в Strapi...\n');

    // Получить текущий контент
    console.log('[Update Classes] Получение контента главной страницы...');
    const findResponse = await api.get('/pages', {
      params: {
        'filters[slug][$eq]': 'main_page'
      }
    });

    if (!findResponse.data.data || findResponse.data.data.length === 0) {
      console.error('❌ Страница с slug "main_page" не найдена в Strapi');
      return false;
    }

    const page = findResponse.data.data[0];
    const pageId = page.documentId || page.id;
    const currentContent = page.content || '';

    console.log(`[Update Classes] Найдена страница: ${page.title || 'без названия'} (ID: ${pageId})`);
    console.log(`[Update Classes] Текущая длина контента: ${currentContent.length} символов\n`);

    // Обновить классы
    console.log('[Update Classes] Замена классов...');
    const { updated, changes } = updateClassesInContent(currentContent);

    if (changes.length === 0) {
      console.log('ℹ️  Изменений не обнаружено. Классы уже обновлены или не требуют обновления.');
      return true;
    }

    console.log(`[Update Classes] Найдено изменений: ${changes.length}`);
    changes.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change}`);
    });
    console.log(`\n[Update Classes] Новая длина контента: ${updated.length} символов\n`);

    // Сохранить обновленный контент в файл для проверки
    const backupPath = path.join(__dirname, '../../main_page_updated_classes.txt');
    fs.writeFileSync(backupPath, updated, 'utf-8');
    console.log(`[Update Classes] Резервная копия сохранена: ${backupPath}`);

    // Обновить в Strapi
    console.log('[Update Classes] Обновление контента в Strapi...');
    const updateResponse = await api.put(`/pages/${pageId}`, {
      data: {
        content: updated
      }
    });

    if (updateResponse.status !== 200) {
      throw new Error(`Ошибка при обновлении: ${updateResponse.status}`);
    }

    console.log('\n✅ Классы успешно обновлены в Strapi!');
    console.log(`   Изменено классов: ${changes.length}`);
    console.log('   Проверьте результат на сайте\n');

    return true;
  } catch (error) {
    console.error('\n❌ Ошибка при обновлении классов:', error.message);
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
  updateMainPageClasses()
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

module.exports = { updateMainPageClasses, updateClassesInContent };



