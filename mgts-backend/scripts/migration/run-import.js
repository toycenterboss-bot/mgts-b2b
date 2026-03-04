#!/usr/bin/env node
/**
 * Скрипт для запуска импорта через Strapi CLI
 * Использует strapi.entityService для импорта без API токена
 */

const strapi = require('@strapi/strapi');

async function runImport() {
  const app = await strapi({
    distDir: './dist',
    autoReload: false,
    serveAdminPanel: false,
  }).load();

  console.log('\n🚀 Запуск импорта через Strapi entityService...\n');

  const importScript = require('./import-content-strapi.js');
  await importScript({ strapi: app });

  await app.destroy();
  process.exit(0);
}

runImport().catch(error => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});





