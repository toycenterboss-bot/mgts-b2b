/**
 * Скрипт для обновления parent связей через кастомный endpoint
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

async function updateParentRelations() {
    console.log('🔗 Обновление родительских связей через кастомный endpoint...\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        const response = await api.post('/pages/update-parent-relations');
        
        console.log('✅ Обновление завершено:\n');
        console.log(`   Всего страниц: ${response.data.total}`);
        console.log(`   Обновлено: ${response.data.updated}`);
        console.log(`   Ошибок: ${response.data.failed}\n`);
        
        if (response.data.results && response.data.results.length > 0) {
            console.log('⚠️  Ошибки:\n');
            response.data.results.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.slug}: ${item.reason || item.error}`);
            });
            console.log('');
        }
        
        if (response.data.updated > 0) {
            console.log('✅ Родительские связи успешно обновлены!\n');
        } else {
            console.log('ℹ️  Нет связей для обновления (возможно, уже установлены)\n');
        }
        
    } catch (error) {
        console.error('\n❌ Ошибка при обновлении parent связей:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ сервера:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    updateParentRelations();
}

module.exports = { updateParentRelations };
