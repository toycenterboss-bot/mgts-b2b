/**
 * Скрипт для удаления inline стилей из HTML контента в Strapi
 * Запуск: cd mgts-backend && node scripts/clean-inline-styles-direct.js
 */

const { removeInlineStyles, updateAllPages } = require('./remove-inline-styles');

// Этот скрипт должен запускаться через Strapi console
// Для прямого запуска нужно загрузить Strapi
async function main() {
  console.log('📋 Скрипт для удаления inline стилей из HTML контента');
  console.log('');
  console.log('⚠️  Этот скрипт должен запускаться через Strapi console:');
  console.log('');
  console.log('   1. Откройте Strapi Admin Panel: http://localhost:1337/admin');
  console.log('   2. Откройте консоль разработчика (F12)');
  console.log('   3. В консоли выполните:');
  console.log('');
  console.log('      const { updateAllPages } = require("./scripts/remove-inline-styles.js");');
  console.log('      await updateAllPages({ strapi });');
  console.log('');
  console.log('   ИЛИ используйте автоматическую очистку при загрузке страницы');
  console.log('   (inline стили будут удаляться автоматически в cms-loader.js)');
  console.log('');
}

if (require.main === module) {
  main();
}

module.exports = { removeInlineStyles, updateAllPages };




