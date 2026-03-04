/**
 * Скрипт для загрузки и выполнения миграции в консоли Strapi
 * Использование в консоли: .load scripts/migration/load-and-run.js
 */

const assignCardTypes = require('./assign-card-types.js');

(async () => {
  try {
    await assignCardTypes({ strapi });
    console.log('\n✅ Миграция успешно завершена!\n');
  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error);
  }
})();




