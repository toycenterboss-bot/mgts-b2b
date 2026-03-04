/**
 * Скрипт для добавления navigation-renderer.js и footer-renderer.js
 * на все HTML страницы, где есть api-client.js
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '../../SiteMGTS');

function findHTMLFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'components' && file !== 'node_modules') {
      findHTMLFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function addRendererScripts(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Проверяем, есть ли api-client.js
  if (!content.includes('api-client.js')) {
    return false;
  }
  
  // Проверяем, есть ли уже navigation-renderer.js и footer-renderer.js
  if (content.includes('navigation-renderer.js') && content.includes('footer-renderer.js')) {
    return false; // Уже есть
  }
  
  // Определяем путь к js (относительно корня или ../js)
  const relativePath = filePath.replace(SITE_DIR, '').split(path.sep).filter(p => p);
  const depth = relativePath.length - 1; // -1 потому что файл в папке
  const jsPath = depth > 0 ? '../'.repeat(depth) + 'js/' : 'js/';
  
  // Ищем строку с api-client.js
  const apiClientRegex = /(<script[^>]*src=["'])([^"']*api-client\.js["'][^>]*>)/i;
  const match = content.match(apiClientRegex);
  
  if (!match) {
    return false;
  }
  
  // Проверяем, нужно ли добавлять скрипты
  let newContent = content;
  
  if (!content.includes('navigation-renderer.js')) {
    // Добавляем navigation-renderer.js после api-client.js
    newContent = newContent.replace(
      apiClientRegex,
      `$1$2\n    <script src="${jsPath}navigation-renderer.js"></script>`
    );
  }
  
  if (!newContent.includes('footer-renderer.js')) {
    // Теперь нужно найти navigation-renderer.js или api-client.js для вставки после
    const insertAfter = newContent.includes('navigation-renderer.js') 
      ? /(<script[^>]*src=["'][^"']*navigation-renderer\.js["'][^>]*>)/i
      : apiClientRegex;
    
    newContent = newContent.replace(
      insertAfter,
      `$1\n    <script src="${jsPath}footer-renderer.js"></script>`
    );
  }
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('[Script] Поиск HTML файлов...');
  const htmlFiles = findHTMLFiles(SITE_DIR);
  
  console.log(`[Script] Найдено ${htmlFiles.length} HTML файлов`);
  
  let updated = 0;
  
  htmlFiles.forEach(file => {
    try {
      if (addRendererScripts(file)) {
        const relativePath = file.replace(SITE_DIR, '');
        console.log(`[Script] ✅ Обновлен: ${relativePath}`);
        updated++;
      }
    } catch (error) {
      console.error(`[Script] ❌ Ошибка при обработке ${file}:`, error.message);
    }
  });
  
  console.log(`\n[Script] Готово! Обновлено файлов: ${updated}`);
}

main();



