/**
 * Скрипт для принудительного удаления всех страниц через entityService
 * Используется когда обычное удаление через API не работает
 * 
 * ⚠️ ВНИМАНИЕ: Этот скрипт должен запускаться в контексте Strapi!
 */

const path = require('path');

// Загружаем Strapi
const strapiPath = path.join(__dirname, '../');
process.chdir(strapiPath);

async function forceDeleteAllPages() {
    console.log('🗑️  Принудительное удаление всех страниц через entityService...\n');
    
    try {
        // Загружаем Strapi
        const Strapi = require('@strapi/strapi');
        const app = await Strapi().load();
        
        // Получаем все страницы
        const pages = await app.entityService.findMany('api::page.page', {
            limit: -1,  // Без лимита
        });
        
        console.log(`📦 Найдено страниц: ${pages.length}\n`);
        
        if (pages.length === 0) {
            console.log('✅ В Strapi нет страниц для удаления\n');
            await app.destroy();
            return;
        }
        
        let deleted = 0;
        let failed = 0;
        
        // Удаляем каждую страницу
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            try {
                await app.entityService.delete('api::page.page', page.id);
                deleted++;
                
                if ((i + 1) % 10 === 0) {
                    console.log(`  Удалено: ${i + 1}/${pages.length} страниц...`);
                }
            } catch (error) {
                failed++;
                console.warn(`⚠️  Ошибка при удалении страницы ${page.id}:`, error.message);
            }
        }
        
        console.log(`\n✅ Удаление завершено:\n`);
        console.log(`   Удалено: ${deleted}`);
        console.log(`   Ошибок: ${failed}\n`);
        
        // Проверяем результат
        const remaining = await app.entityService.findMany('api::page.page', {
            limit: -1,
        });
        
        console.log(`📊 Осталось страниц в Strapi: ${remaining.length}\n`);
        
        if (remaining.length === 0) {
            console.log('✅ Все страницы успешно удалены!\n');
        } else {
            console.log('⚠️  В Strapi еще остались страницы!\n');
        }
        
        await app.destroy();
        
    } catch (error) {
        console.error('\n❌ Ошибка при удалении страниц:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    forceDeleteAllPages();
}

module.exports = { forceDeleteAllPages };
