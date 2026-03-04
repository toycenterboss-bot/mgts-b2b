/**
 * Wrapper для запуска миграции через Strapi console
 * Использование: node scripts/run-migration-console.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const migrationScript = path.join(__dirname, 'migrate-pages-with-dynamic-content-strapi.js');
const strapiBin = path.join(__dirname, '../node_modules/.bin/strapi');

if (!fs.existsSync(migrationScript)) {
    console.error(`❌ Файл миграции не найден: ${migrationScript}`);
    process.exit(1);
}

if (!fs.existsSync(strapiBin)) {
    console.error(`❌ Strapi не найден: ${strapiBin}`);
    console.error('   Убедитесь, что зависимости установлены: npm install');
    process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('🚀 ЗАПУСК МИГРАЦИИ ЧЕРЕЗ STRAPI CONSOLE');
console.log('═══════════════════════════════════════════════════════════════\n');

// Создаем временный скрипт для консоли
const consoleCommand = `
const migrationScript = require('${migrationScript.replace(/\\/g, '/')}');
migrationScript({ strapi }).then(() => {
    console.log('\\n✅ Миграция завершена!');
    process.exit(0);
}).catch(error => {
    console.error('\\n❌ Ошибка миграции:', error.message);
    console.error(error.stack);
    process.exit(1);
});
`;

const tempScriptPath = path.join(__dirname, 'temp-migration-console.js');
fs.writeFileSync(tempScriptPath, consoleCommand);

console.log('📝 Временный скрипт создан');
console.log('⏳ Запуск миграции через Strapi console...\n');

// Запускаем через node с загрузкой скрипта
const child = spawn('node', ['-e', `
const strapi = require('@strapi/strapi');
const migrationScript = require('${migrationScript.replace(/\\/g, '/')}');

(async () => {
    try {
        const app = await strapi().load();
        await migrationScript({ strapi: app });
        console.log('\\n✅ Миграция завершена!');
        await app.destroy();
        process.exit(0);
    } catch (error) {
        console.error('\\n❌ Ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
`], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

child.on('error', (error) => {
    console.error('❌ Ошибка запуска:', error.message);
    process.exit(1);
});

child.on('exit', (code) => {
    // Удаляем временный файл
    if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
    }
    process.exit(code);
});
