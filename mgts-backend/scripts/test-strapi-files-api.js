/**
 * Тестовый скрипт для проверки API endpoint для получения файлов из Strapi
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Читаем токен из контекста
function getApiToken() {
    const contextPath = path.join(__dirname, '../../docs/project/CONTEXT.md');
    if (fs.existsSync(contextPath)) {
        const context = fs.readFileSync(contextPath, 'utf-8');
        const patterns = [
            /export STRAPI_API_TOKEN="([^"]+)"/i,
            /STRAPI_API_TOKEN[:\s=]+([a-zA-Z0-9]{200,})/i,
            /STRAPI_API_TOKEN[:\s=]+([^\s\n]+)/i,
        ];
        for (const pattern of patterns) {
            const tokenMatch = context.match(pattern);
            if (tokenMatch && tokenMatch[1]) {
                return tokenMatch[1].trim();
            }
        }
    }
    return process.env.STRAPI_API_TOKEN || '';
}

const API_TOKEN = getApiToken();

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

async function testEndpoint(endpoint) {
    try {
        console.log(`\n🔍 Тестирую: ${endpoint}`);
        const response = await api.get(endpoint, {
            params: {
                'pagination[pageSize]': 5
            }
        });
        
        console.log(`   ✅ Статус: ${response.status}`);
        console.log(`   📊 Структура ответа:`);
        console.log(`      - response.data: ${typeof response.data}`);
        console.log(`      - response.data.data: ${response.data.data ? (Array.isArray(response.data.data) ? `Array(${response.data.data.length})` : typeof response.data.data) : 'undefined'}`);
        console.log(`      - response.data.meta: ${response.data.meta ? 'exists' : 'undefined'}`);
        
        if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
            const firstFile = response.data.data[0];
            console.log(`\n   📄 Пример файла (первый):`);
            console.log(`      - id: ${firstFile.id}`);
            console.log(`      - name: ${firstFile.name || firstFile.filename || 'N/A'}`);
            console.log(`      - url: ${firstFile.url || 'N/A'}`);
            console.log(`      - mime: ${firstFile.mime || firstFile.mimeType || 'N/A'}`);
            console.log(`      - Ключи объекта: ${Object.keys(firstFile).join(', ')}`);
        } else if (Array.isArray(response.data) && response.data.length > 0) {
            const firstFile = response.data[0];
            console.log(`\n   📄 Пример файла (первый):`);
            console.log(`      - name: ${firstFile.name || firstFile.filename || 'N/A'}`);
            console.log(`      - url: ${firstFile.url || 'N/A'}`);
            console.log(`      - Ключи объекта: ${Object.keys(firstFile).join(', ')}`);
        }
        
        return { success: true, data: response.data };
    } catch (error) {
        console.log(`   ❌ Ошибка: ${error.response?.status || error.code}`);
        if (error.response?.data) {
            console.log(`      Ответ: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ТЕСТИРОВАНИЕ API ENDPOINT ДЛЯ ФАЙЛОВ STRAPI');
    console.log('═'.repeat(70));
    console.log(`\n📍 Strapi URL: ${STRAPI_URL}`);
    console.log(`🔑 API Token: ${API_TOKEN ? API_TOKEN.substring(0, 20) + '...' : 'не найден'}\n`);
    
    const endpoints = [
        '/upload/files',
        '/files',
        '/upload',
        '/upload/files?populate=*',
    ];
    
    let workingEndpoint = null;
    
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        if (result.success) {
            workingEndpoint = endpoint;
            console.log(`\n✅ РАБОТАЮЩИЙ ENDPOINT НАЙДЕН: ${endpoint}`);
            break;
        }
    }
    
    if (!workingEndpoint) {
        console.log('\n❌ Ни один endpoint не работает');
        console.log('\nВозможные причины:');
        console.log('   1. Strapi не запущен на порту 1337');
        console.log('   2. Неправильный API токен');
        console.log('   3. Файлы не загружены в Media Library');
        console.log('   4. Используется другая версия Strapi с другим API\n');
    }
    
    console.log('═'.repeat(70) + '\n');
}

main().catch(error => {
    console.error('\n❌ Критическая ошибка:', error.message);
    process.exit(1);
});
