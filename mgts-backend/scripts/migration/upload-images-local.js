/**
 * Скрипт для миграции изображений в Strapi Media Library (локальное хранилище)
 * Загружает изображения напрямую в Strapi через API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
  console.error('\nСоздайте токен в Strapi:');
  console.error('  1. Откройте http://localhost:1337/admin');
  console.error('  2. Settings → API Tokens → Create new API Token');
  console.error('  3. Name: Image Upload Script');
  console.error('  4. Token duration: Unlimited');
  console.error('  5. Token type: Full access');
  console.error('  6. Скопируйте токен и установите:');
  console.error('     export STRAPI_API_TOKEN="your_token_here"\n');
  process.exit(1);
}

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
  }
});

async function uploadImageToStrapi(filePath) {
  try {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(filePath));
    formData.append('fileInfo', JSON.stringify({
      name: path.basename(filePath, path.extname(filePath)),
      alternativeText: path.basename(filePath),
      caption: ''
    }));

    const response = await api.post('/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${API_TOKEN}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data && response.data.length > 0) {
      const uploadedFile = response.data[0];
      console.log(`✅ Загружено: ${path.basename(filePath)} -> ${uploadedFile.url}`);
      return {
        fileName: path.basename(filePath),
        url: uploadedFile.url,
        id: uploadedFile.id,
        name: uploadedFile.name,
        size: uploadedFile.size,
        mime: uploadedFile.mime
      };
    }
    
    throw new Error('No file returned from API');
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ Ошибка при загрузке ${path.basename(filePath)}:`, errorMsg);
    throw error;
  }
}

async function migrateImages() {
  // Определить путь к директории изображений
  const siteRoot = process.env.SITE_ROOT || 
    (() => {
      let currentDir = __dirname;
      while (currentDir !== path.dirname(currentDir)) {
        const siteDir = path.join(currentDir, '..', '..', '..', 'SiteMGTS');
        if (fs.existsSync(siteDir)) {
          return siteDir;
        }
        currentDir = path.dirname(currentDir);
      }
      return path.join(__dirname, '../../../SiteMGTS');
    })();
  
  const imagesDir = path.join(siteRoot, 'images');
  
  // Проверка существования директории
  if (!fs.existsSync(imagesDir)) {
    console.error(`\n❌ Ошибка: Директория images не найдена по пути: ${imagesDir}`);
    console.error('\nУстановите переменную окружения SITE_ROOT:');
    console.error('  export SITE_ROOT="/path/to/SiteMGTS"\n');
    process.exit(1);
  }
  
  console.log(`\n📁 Поиск изображений в: ${imagesDir}\n`);
  
  const files = fs.readdirSync(imagesDir);
  
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(file)
  );
  
  if (imageFiles.length === 0) {
    console.log('⚠️  Изображения не найдены в директории images');
    process.exit(0);
  }
  
  console.log(`Найдено ${imageFiles.length} изображений для загрузки\n`);
  console.log(`Strapi URL: ${STRAPI_URL}\n`);
  
  const results = [];
  let success = 0;
  let errors = 0;
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const filePath = path.join(imagesDir, file);
    process.stdout.write(`\rЗагрузка: ${i + 1}/${imageFiles.length} (${file})...`);
    
    try {
      const result = await uploadImageToStrapi(filePath);
      results.push(result);
      success++;
      
      // Небольшая задержка
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      errors++;
      results.push({
        fileName: file,
        error: error.message
      });
    }
  }
  
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  
  // Сохранить результаты
  const resultsPath = path.join(__dirname, 'upload-images-local-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Миграция изображений завершена!`);
  console.log(`\n📊 Результаты:`);
  console.log(`   - ✅ Успешно: ${success}`);
  console.log(`   - ❌ Ошибок: ${errors}`);
  console.log(`   - 💾 Результаты сохранены в: ${resultsPath}\n`);
  
  if (errors > 0) {
    console.log('⚠️  Изображения с ошибками:');
    results.filter(r => r.error).forEach(r => {
      console.log(`   - ${r.fileName}: ${r.error}`);
    });
    console.log('');
  }
  
  if (success > 0) {
    console.log('📝 Следующие шаги:');
    console.log('   1. Проверьте изображения в Strapi: http://localhost:1337/admin → Media Library');
    console.log('   2. Обновите ссылки в контенте страниц на новые URL из Strapi\n');
  }
}

// Запуск
migrateImages().catch(error => {
  console.error('\n❌ Критическая ошибка:', error.message);
  process.exit(1);
});





