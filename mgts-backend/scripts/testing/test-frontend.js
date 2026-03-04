/**
 * Скрипт для тестирования фронтенда
 * Проверяет доступность страниц и загрузку скриптов
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8001';
const SITE_ROOT = process.env.SITE_ROOT || path.join(__dirname, '../../../SiteMGTS');

const tests = [];
let passed = 0;
let failed = 0;

function addTest(name, testFn) {
  tests.push({ name, testFn });
}

async function runTests() {
  console.log('\n🧪 Начинаем тестирование фронтенда...\n');

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

// Тест 1: Проверить доступность главной страницы
addTest('Главная страница доступна', async () => {
  const response = await axios.get(`${FRONTEND_URL}/index.html`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.includes('<!DOCTYPE html>')) {
    throw new Error('Ответ не содержит HTML');
  }
});

// Тест 2: Проверить наличие api-client.js
addTest('api-client.js загружается', async () => {
  const response = await axios.get(`${FRONTEND_URL}/js/api-client.js`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.includes('StrapiAPI')) {
    throw new Error('Файл не содержит класс StrapiAPI');
  }
});

// Тест 3: Проверить наличие cms-loader.js
addTest('cms-loader.js загружается', async () => {
  const response = await axios.get(`${FRONTEND_URL}/js/cms-loader.js`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.includes('CMS Loader')) {
    throw new Error('Файл не содержит CMS Loader');
  }
});

// Тест 4: Проверить наличие components-loader.js
addTest('components-loader.js загружается', async () => {
  const response = await axios.get(`${FRONTEND_URL}/js/components-loader.js`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.includes('ComponentLoader')) {
    throw new Error('Файл не содержит ComponentLoader');
  }
});

// Тест 5: Проверить наличие CSS
addTest('CSS файл загружается', async () => {
  const response = await axios.get(`${FRONTEND_URL}/css/style.css`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
});

// Тест 6: Проверить наличие шаблона страницы
addTest('page-template.html доступен', async () => {
  const response = await axios.get(`${FRONTEND_URL}/page-template.html`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Ожидался статус 200, получен ${response.status}`);
  }
  if (!response.data.includes('<!DOCTYPE html>')) {
    throw new Error('Ответ не содержит HTML');
  }
});

// Запуск тестов
runTests().catch(error => {
  console.error('\n❌ Критическая ошибка при запуске тестов:', error.message);
  process.exit(1);
});





