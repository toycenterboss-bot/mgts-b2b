/**
 * Скрипт для запуска миграции типов карточек
 * Можно запустить напрямую через Node.js
 * 
 * Использование:
 *   node scripts/migration/run-assign-card-types.js
 */

const path = require('path');
const fs = require('fs');

// Проверка, что мы в правильной директории
const packageJsonPath = path.join(__dirname, '../../package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Ошибка: Запустите скрипт из корневой директории mgts-backend');
  process.exit(1);
}

console.log('🚀 Запуск миграции типов карточек...\n');

// Проверка наличия Strapi
try {
  // Попробуем загрузить Strapi
  const strapiPath = path.join(__dirname, '../../node_modules/@strapi/strapi');
  if (!fs.existsSync(strapiPath)) {
    console.error('❌ Ошибка: Strapi не установлен. Запустите: npm install');
    process.exit(1);
  }
  
  console.log('📦 Strapi найден, запускаем миграцию через консоль...\n');
  console.log('⚠️  ВНИМАНИЕ: Этот скрипт должен быть запущен через Strapi console\n');
  console.log('📝 Инструкция:');
  console.log('   1. Убедитесь, что Strapi запущен: npm run develop');
  console.log('   2. В другом терминале: npm run strapi console');
  console.log('   3. Выполните:');
  console.log('      const assignCardTypes = require(\'./scripts/migration/assign-card-types.js\');');
  console.log('      await assignCardTypes({ strapi });\n');
  
  // Альтернативный способ - создать временный скрипт для консоли
  const consoleScript = `
const assignCardTypes = require('./scripts/migration/assign-card-types.js');
await assignCardTypes({ strapi });
console.log('\\n✅ Миграция завершена!');
  `.trim();
  
  const tempScriptPath = path.join(__dirname, 'temp-migration.js');
  fs.writeFileSync(tempScriptPath, consoleScript);
  
  console.log('✅ Создан временный скрипт для консоли:');
  console.log(`   ${tempScriptPath}\n`);
  console.log('📝 В консоли Strapi выполните:');
  console.log(`   require('${tempScriptPath.replace(__dirname, './scripts/migration')}');\n`);
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}




