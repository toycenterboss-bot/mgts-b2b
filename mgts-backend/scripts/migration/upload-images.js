/**
 * Скрипт для миграции изображений в Cloudinary
 * Требуется: npm install cloudinary
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Конфигурация Cloudinary из переменных окружения
const cloudName = process.env.CLOUDINARY_NAME;
const apiKey = process.env.CLOUDINARY_KEY;
const apiSecret = process.env.CLOUDINARY_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('\n❌ Ошибка: Необходимо установить переменные окружения Cloudinary');
  console.error('\nДобавьте в .env файл:');
  console.error('  CLOUDINARY_NAME=your_cloud_name');
  console.error('  CLOUDINARY_KEY=your_api_key');
  console.error('  CLOUDINARY_SECRET=your_api_secret');
  console.error('\nИли установите через:');
  console.error('  export CLOUDINARY_NAME="your_cloud_name"');
  console.error('  export CLOUDINARY_KEY="your_api_key"');
  console.error('  export CLOUDINARY_SECRET="your_api_secret"\n');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

async function uploadImage(filePath, folder = 'mgts') {
  try {
    const fileName = path.basename(filePath, path.extname(filePath));
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      resource_type: 'auto'
    });
    
    console.log(`✅ Загружено: ${path.basename(filePath)} -> ${result.secure_url}`);
    return {
      localPath: filePath,
      fileName: path.basename(filePath),
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    console.error(`❌ Ошибка при загрузке ${filePath}:`, error.message);
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
  
  const results = [];
  let success = 0;
  let errors = 0;
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const filePath = path.join(imagesDir, file);
    process.stdout.write(`\rЗагрузка: ${i + 1}/${imageFiles.length} (${file})...`);
    
    try {
      const result = await uploadImage(filePath);
      results.push(result);
      success++;
      
      // Небольшая задержка, чтобы не перегрузить API
      await new Promise(resolve => setTimeout(resolve, 500));
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
  const resultsPath = path.join(__dirname, 'upload-images-results.json');
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
}

// Запуск
migrateImages().catch(error => {
  console.error('\n❌ Критическая ошибка:', error.message);
  process.exit(1);
});





