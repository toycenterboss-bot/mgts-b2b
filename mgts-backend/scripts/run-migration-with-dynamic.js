#!/usr/bin/env node
/**
 * Скрипт для запуска миграции с dynamicContent через Strapi CLI
 * Использует strapi.entityService для миграции без API токена
 * 
 * Использование: node scripts/run-migration-with-dynamic.js
 */

const { createStrapi } = require('@strapi/strapi');

async function runMigration() {
    let app;
    
    try {
        console.log('\n🚀 Запуск миграции через Strapi entityService...\n');
        
        app = await createStrapi({
            distDir: './dist',
            autoReload: false,
            serveAdminPanel: false,
        }).load();

        console.log('✅ Strapi загружен\n');

        const migrationScript = require('./migrate-pages-with-dynamic-content-strapi.js');
        await migrationScript({ strapi: app });

        console.log('\n✅ Миграция завершена успешно!\n');
        
    } catch (error) {
        console.error('\n❌ Ошибка при миграции:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (app) {
            await app.destroy();
        }
    }
    
    process.exit(0);
}

runMigration();
