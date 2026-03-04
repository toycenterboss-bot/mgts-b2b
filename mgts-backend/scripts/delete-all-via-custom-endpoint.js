/**
 * Скрипт для удаления всех страниц через кастомный endpoint
 * Использует entityService напрямую в Strapi
 */

const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    process.exit(1);
}

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

async function deleteAllPages() {
    console.log('🗑️  Удаление всех страниц через кастомный endpoint...\n');
    
    try {
        const response = await api.delete('/pages/delete-all');
        
        console.log('✅ Удаление завершено:\n');
        console.log(`   Всего страниц: ${response.data.total}`);
        console.log(`   Удалено: ${response.data.deleted}`);
        console.log(`   Ошибок: ${response.data.failed}\n`);
        
        // Проверяем результат
        const checkResponse = await api.get('/pages?pagination[pageSize]=100');
        const total = checkResponse.data.meta?.pagination?.total || checkResponse.data.data?.length || 0;
        
        console.log(`📊 Осталось страниц в Strapi: ${total}\n`);
        
        if (total === 0) {
            console.log('✅ Все страницы успешно удалены!\n');
            console.log('🚀 Можно запускать миграцию новых страниц\n');
        } else {
            console.log('⚠️  В Strapi еще остались страницы!\n');
        }
        
    } catch (error) {
        console.error('\n❌ Ошибка при удалении страниц:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    deleteAllPages();
}

module.exports = { deleteAllPages };
