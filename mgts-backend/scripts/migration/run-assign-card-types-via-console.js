/**
 * Скрипт для запуска миграции через Strapi console
 * Использует execSync для автоматического выполнения
 * 
 * Использование:
 *   node scripts/migration/run-assign-card-types-via-console.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 Запуск миграции типов карточек через Strapi console...\n');

// Создаем временный скрипт для консоли
const consoleScript = `
const assignCardTypes = require('./scripts/migration/assign-card-types.js');
await assignCardTypes({ strapi });
console.log('\\n✅ Миграция завершена!');
process.exit(0);
`.trim();

const tempScriptPath = path.join(__dirname, 'temp-assign-card-types.js');
fs.writeFileSync(tempScriptPath, consoleScript);

console.log('✅ Создан временный скрипт для консоли\n');

try {
  // Проверяем, запущен ли Strapi
  console.log('⚠️  ВНИМАНИЕ: Убедитесь, что Strapi запущен в другом терминале (npm run develop)\n');
  console.log('📝 Для запуска миграции вручную:');
  console.log('   1. Откройте консоль Strapi: npm run strapi console');
  console.log('   2. Выполните:');
  console.log(`      const assignCardTypes = require('./scripts/migration/assign-card-types.js');`);
  console.log(`      await assignCardTypes({ strapi });\n`);
  
  // Попробуем автоматический запуск через pipe (может не работать)
  console.log('🔄 Попытка автоматического запуска...\n');
  
  const scriptContent = fs.readFileSync(tempScriptPath, 'utf-8');
  execSync(`cd ${path.join(__dirname, '../..')} && echo "${scriptContent.replace(/"/g, '\\"')}" | npm run strapi console`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..'),
    timeout: 60000
  });
  
} catch (error) {
  console.error('\n⚠️  Автоматический запуск не удался. Используйте ручной способ выше.\n');
  console.error('Ошибка:', error.message);
} finally {
  // Удаляем временный файл
  if (fs.existsSync(tempScriptPath)) {
    // fs.unlinkSync(tempScriptPath);
    console.log(`\n💾 Временный скрипт сохранен: ${tempScriptPath}`);
    console.log('   Вы можете использовать его в консоли Strapi\n');
  }
}




