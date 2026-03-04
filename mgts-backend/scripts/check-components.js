/**
 * Скрипт для проверки компонентов Strapi
 * Запуск: node scripts/check-components.js
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'src', 'components', 'page');

console.log('🔍 Проверка компонентов...\n');
console.log(`Директория: ${componentsDir}\n`);

if (!fs.existsSync(componentsDir)) {
  console.error('❌ Директория компонентов не найдена!');
  process.exit(1);
}

const components = fs.readdirSync(componentsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Найдено компонентов: ${components.length}\n`);

let allValid = true;

components.forEach(componentName => {
  const schemaPath = path.join(componentsDir, componentName, 'schema.json');
  
  console.log(`📦 ${componentName}:`);
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`  ❌ schema.json не найден!`);
    allValid = false;
    return;
  }
  
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    
    // Проверка обязательных полей
    const requiredFields = ['collectionName', 'info', 'attributes'];
    const missingFields = requiredFields.filter(field => !schema[field]);
    
    if (missingFields.length > 0) {
      console.error(`  ❌ Отсутствуют поля: ${missingFields.join(', ')}`);
      allValid = false;
      return;
    }
    
    // Проверка формата
    if (!schema.info.displayName) {
      console.error(`  ❌ Отсутствует info.displayName`);
      allValid = false;
      return;
    }
    
    console.log(`  ✅ Схема валидна`);
    console.log(`     Display Name: ${schema.info.displayName}`);
    console.log(`     Collection: ${schema.collectionName}`);
    console.log(`     Атрибутов: ${Object.keys(schema.attributes || {}).length}`);
    console.log('');
    
  } catch (error) {
    console.error(`  ❌ Ошибка при чтении схемы: ${error.message}`);
    allValid = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✅ Все компоненты валидны!');
  console.log('\n💡 Если компоненты не отображаются в админ-панели:');
  console.log('   1. Убедитесь, что Strapi перезапущен');
  console.log('   2. Проверьте логи Strapi на наличие ошибок');
  console.log('   3. Очистите кэш: удалите папку .cache (если есть)');
  console.log('   4. Перезапустите Strapi: npm run develop');
} else {
  console.log('❌ Обнаружены ошибки в компонентах!');
  console.log('   Исправьте ошибки и запустите скрипт снова.');
}
console.log('');

