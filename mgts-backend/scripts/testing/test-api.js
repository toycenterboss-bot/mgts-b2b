/**
 * Скрипт для тестирования API endpoints
 */

const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

const tests = [];
let passed = 0;
let failed = 0;

function addTest(name, testFn) {
  tests.push({ name, testFn });
}

async function runTests() {
  console.log('\n🧪 Начинаем тестирование API...\n');

  for (const test of tests) {
    try {
      process.stdout.write(`Тест: ${test.name}... `);
      await test.testFn();
      console.log('✅');
      passed++;
    } catch (error) {
      console.log(`❌`);
      console.error(`   Ошибка: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Результаты:`);
  console.log(`   - ✅ Успешно: ${passed}`);
  console.log(`   - ❌ Ошибок: ${failed}`);
  console.log(`   - 📈 Успешность: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 Все тесты пройдены успешно!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Некоторые тесты не прошли\n');
    process.exit(1);
  }
}

// Тест 1: Получить все страницы
addTest('GET /api/pages - получить все страницы', async () => {
  const response = await api.get('/pages?pagination[pageSize]=5');
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.data || !Array.isArray(response.data.data)) {
    throw new Error('Ответ не содержит массив данных');
  }
});

// Тест 2: Получить страницу по slug
addTest('GET /api/pages/slug/:slug - получить страницу по slug', async () => {
  const response = await api.get('/pages/slug/index');
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.data || !response.data.data.slug) {
    throw new Error('Ответ не содержит данные страницы');
  }
  if (response.data.data.slug !== 'index') {
    throw new Error(`Ожидался slug "index", получен "${response.data.data.slug}"`);
  }
});

// Тест 3: Получить меню
addTest('GET /api/menu - получить меню', async () => {
  const response = await api.get('/menu');
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
});

// Тест 4: Проверить метаданные ответа
addTest('Проверка метаданных pagination', async () => {
  const response = await api.get('/pages?pagination[pageSize]=1');
  if (!response.data.meta || !response.data.meta.pagination) {
    throw new Error('Ответ не содержит метаданные pagination');
  }
  const pagination = response.data.meta.pagination;
  if (typeof pagination.total !== 'number') {
    throw new Error('Pagination.total должен быть числом');
  }
  if (pagination.total < 0) {
    throw new Error('Pagination.total не может быть отрицательным');
  }
});

// Тест 5: Проверить структуру данных страницы
addTest('Проверка структуры данных страницы', async () => {
  const response = await api.get('/pages/slug/index');
  const page = response.data.data;
  
  const requiredFields = ['slug', 'title'];
  for (const field of requiredFields) {
    if (!(field in page)) {
      throw new Error(`Отсутствует обязательное поле: ${field}`);
    }
  }
});

// Тест 6: Проверить обработку несуществующей страницы
addTest('GET /api/pages/slug/non-existent - обработка 404', async () => {
  try {
    await api.get('/pages/slug/non-existent-page-12345');
    throw new Error('Ожидалась ошибка 404 для несуществующей страницы');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Это ожидаемое поведение
      return;
    }
    throw error;
  }
});

// Запуск тестов
runTests().catch(error => {
  console.error('\n❌ Критическая ошибка при запуске тестов:', error.message);
  process.exit(1);
});





