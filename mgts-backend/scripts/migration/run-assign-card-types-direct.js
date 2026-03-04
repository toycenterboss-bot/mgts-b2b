#!/usr/bin/env node
/**
 * Скрипт для прямого запуска миграции типов карточек
 * Загружает Strapi и выполняет миграцию
 * 
 * Использование:
 *   node scripts/migration/run-assign-card-types-direct.js
 */

const { createStrapi } = require('@strapi/strapi');

async function runMigration() {
  console.log('\n🚀 Запуск миграции типов карточек...\n');
  
  let app;
  
  try {
    // Загрузить Strapi
    app = await createStrapi({
      distDir: './dist',
      autoReload: false,
      serveAdminPanel: false,
    }).load();
    
    console.log('✅ Strapi загружен\n');
    
    // Загрузить скрипт миграции
    const assignCardTypes = require('./assign-card-types.js');
    
    // Выполнить миграцию
    await assignCardTypes({ strapi: app });
    
    console.log('\n✅ Миграция успешно завершена!\n');
    
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении миграции:', error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Закрыть Strapi
    if (app) {
      await app.destroy();
    }
  }
  
  process.exit(0);
}

// Запустить миграцию
runMigration().catch(error => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});

