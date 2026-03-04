/**
 * Скрипт для обновления контента главной страницы в Strapi через console
 * 
 * Запуск в Strapi console:
 *   node -e "const fs = require('fs'); const path = require('path'); const content = fs.readFileSync(path.join(__dirname, 'scripts/update-main-page-strapi-console.js'), 'utf-8'); eval(content);"
 * 
 * Или скопируйте код ниже в Strapi console
 */

const fs = require('fs');
const path = require('path');

// Путь к файлу main_page.txt
const mainPageFilePath = path.join(__dirname, '../../main_page.txt');

async function updateMainPage() {
  try {
    console.log('[Update Main Page] Начинаю обновление...');
    
    // Проверить существование файла
    if (!fs.existsSync(mainPageFilePath)) {
      console.error('❌ Файл main_page.txt не найден:', mainPageFilePath);
      return false;
    }

    // Прочитать содержимое файла
    const content = fs.readFileSync(mainPageFilePath, 'utf-8');
    console.log(`[Update Main Page] Прочитан файл main_page.txt, длина: ${content.length} символов`);

    // Проверить, что контент не пустой
    if (!content.trim()) {
      console.error('❌ Файл main_page.txt пустой');
      return false;
    }

    // Найти страницу с slug 'main_page'
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: {
        slug: 'main_page'
      }
    });

    if (pages.length === 0) {
      console.error('❌ Страница с slug "main_page" не найдена в Strapi');
      const allPages = await strapi.entityService.findMany('api::page.page', {
        fields: ['id', 'slug', 'title']
      });
      console.log('Доступные страницы:');
      allPages.forEach(page => {
        console.log(`  - ${page.slug} (${page.title})`);
      });
      return false;
    }

    const page = pages[0];
    console.log(`[Update Main Page] Найдена страница: ${page.title} (ID: ${page.id})`);

    // Обновить контент
    console.log('[Update Main Page] Обновление контента...');
    await strapi.entityService.update('api::page.page', page.id, {
      data: {
        content: content
      }
    });

    console.log('✅ Контент главной страницы успешно обновлен в Strapi!');
    console.log(`   Длина контента: ${content.length} символов`);
    console.log('   Картинки mirror-slider-1.jpg, mirror-slider-2.jpg, mirror-slider-3.jpg должны отображаться');
    console.log('   Пути: images/mirror-slider-1.jpg, images/mirror-slider-2.jpg, images/mirror-slider-3.jpg');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при обновлении контента:', error.message);
    console.error(error);
    return false;
  }
}

// Запуск
updateMainPage()
  .then(success => {
    if (success) {
      console.log('\n✅ Готово! Обновите страницу в браузере (Ctrl+F5)');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });



