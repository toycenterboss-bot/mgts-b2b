/**
 * Скрипт для обновления классов в локальном файле main_page.txt
 * Заменяет старые классы на новые согласно системе классов
 * 
 * Запуск:
 *   node scripts/update-classes-local.js
 */

const fs = require('fs');
const path = require('path');

// Путь к файлу
const mainPageFilePath = path.join(__dirname, '../../main_page.txt');
const outputFilePath = path.join(__dirname, '../../main_page_updated.txt');

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
    const beforeClasses = before ? before.trim().split(/\s+/) : [];
    const afterClasses = after ? after.trim().split(/\s+/) : [];
    
    // Удаляем card-box и card-link-hover
    const filtered = classes.filter(c => c !== 'card-box' && c !== 'card-link-hover');
    
    // Добавляем новые классы
    filtered.push('card', 'card--navigation', 'card--hoverable');
    
    changes.push('card-box → card card--navigation card--hoverable');
    return `class="${filtered.join(' ')}"`;
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

  // 4. Замена card-our-services на card card--info (для информационных карточек услуг)
  // Но оставляем специфичные классы для главной страницы
  updated = updated.replace(/class="([^"]*?\s)?card-our-services(\s[^"]*?)?"/g, (match, before = '', after = '') => {
    const classes = (before + 'card-our-services' + after).trim().split(/\s+/);
    // Сохраняем специфичные классы (operators, government, developers, active)
    const specificClasses = [...new Set(classes.filter(c => 
      ['operators', 'government', 'developers', 'active'].includes(c)
    ))]; // Убираем дубликаты
    classes.splice(classes.indexOf('card-our-services'), 1, 'card', 'card--info');
    // Удаляем дубликаты из classes
    const uniqueClasses = [...new Set(classes)];
    if (specificClasses.length > 0) {
      // Добавляем специфичные классы, если их еще нет
      specificClasses.forEach(sc => {
        if (!uniqueClasses.includes(sc)) {
          uniqueClasses.push(sc);
        }
      });
    }
    changes.push('card-our-services → card card--info');
    return `class="${uniqueClasses.join(' ')}"`;
  });

  // 5. Замена card-our-services__content на card__body
  updated = updated.replace(/class="([^"]*?\s)?card-our-services__content(\s[^"]*?)?"/g, (match, before = '', after = '') => {
    const classes = (before + 'card-our-services__content' + after).trim().split(/\s+/);
    classes.splice(classes.indexOf('card-our-services__content'), 1, 'card__body');
    changes.push('card-our-services__content → card__body');
    return `class="${classes.join(' ')}"`;
  });

  // 6. Добавление grid и grid-item в cards-scroll-container для карточек партнерства
  // Заменяем cards-scroll-container на grid с grid-item
  updated = updated.replace(
    /<div class="cards-scroll-container[^"]*">\s*<div class="card card--navigation card--hoverable/g,
    '<div class="cards-scroll-container disable-scrollbar"><div class="grid grid-cols-3"><div class="grid-item"><div class="card card--navigation card--hoverable'
  );

  // Обернем каждую следующую карточку в grid-item (кроме первой)
  updated = updated.replace(
    /<\/div><\/div><\/div>\s*<div class="card card--navigation card--hoverable/g,
    '</div></div></div><div class="grid-item"><div class="card card--navigation card--hoverable'
  );

  // Закрываем grid и grid-item после всех карточек
  updated = updated.replace(
    /<\/div><\/div><\/div>\s*<\/div><\/div><\/div><\/section>/,
    '</div></div></div></div></div></div></section>'
  );

  return { updated, changes: [...new Set(changes)] };
}

/**
 * Обновление локального файла
 */
function updateLocalFile() {
  try {
    console.log('[Update Classes] Начинаю обновление классов в локальном файле...\n');

    // Проверить существование файла
    if (!fs.existsSync(mainPageFilePath)) {
      console.error('❌ Файл main_page.txt не найден:', mainPageFilePath);
      return false;
    }

    // Прочитать содержимое файла
    const content = fs.readFileSync(mainPageFilePath, 'utf-8');
    console.log(`[Update Classes] Прочитан файл main_page.txt, длина: ${content.length} символов\n`);

    // Обновить классы
    console.log('[Update Classes] Замена классов...');
    const { updated, changes } = updateClassesInContent(content);

    if (changes.length === 0) {
      console.log('ℹ️  Изменений не обнаружено. Классы уже обновлены или не требуют обновления.');
      return true;
    }

    console.log(`[Update Classes] Найдено изменений: ${changes.length}`);
    changes.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change}`);
    });
    console.log(`\n[Update Classes] Новая длина контента: ${updated.length} символов\n`);

    // Сохранить обновленный контент
    fs.writeFileSync(outputFilePath, updated, 'utf-8');
    console.log(`✅ Обновленный контент сохранен: ${outputFilePath}`);
    console.log('   Проверьте файл перед обновлением в Strapi\n');

    return true;
  } catch (error) {
    console.error('\n❌ Ошибка при обновлении классов:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Запуск скрипта
if (require.main === module) {
  const success = updateLocalFile();
  process.exit(success ? 0 : 1);
}

module.exports = { updateLocalFile, updateClassesInContent };

