/**
 * Скрипт для добавления CMS Loader на все HTML страницы
 * Запуск: node add-cms-to-all-pages.js
 */

const fs = require('fs');
const path = require('path');

const SITE_ROOT = process.env.SITE_ROOT || path.join(__dirname, '..');

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findHtmlFiles(filePath, fileList);
    } else if (file === 'index.html') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function addCmsLoader(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Проверить, есть ли уже CMS Loader
  if (content.includes('cms-loader.js')) {
    console.log(`⏭️  Пропущено (уже есть): ${path.relative(SITE_ROOT, filePath)}`);
    return false;
  }
  
  // Найти место для вставки (перед main.js или перед закрывающим </body>)
  const beforeMainJs = content.indexOf('<script src="js/main.js"></script>');
  const beforeBodyClose = content.lastIndexOf('</body>');
  
  let insertPosition = -1;
  let insertText = '';
  
  if (beforeMainJs !== -1) {
    // Вставить перед main.js
    insertPosition = beforeMainJs;
    insertText = '    <script src="js/api-client.js"></script>\n    <script src="js/components-loader.js"></script>\n    <script src="js/cms-loader.js"></script>\n    ';
  } else if (beforeBodyClose !== -1) {
    // Вставить перед </body>
    insertPosition = beforeBodyClose;
    insertText = '    <script src="js/api-client.js"></script>\n    <script src="js/components-loader.js"></script>\n    <script src="js/cms-loader.js"></script>\n';
  } else {
    console.log(`⚠️  Не найдено место для вставки: ${path.relative(SITE_ROOT, filePath)}`);
    return false;
  }
  
  // Проверить, есть ли уже api-client.js
  if (!content.includes('api-client.js')) {
    content = content.slice(0, insertPosition) + insertText + content.slice(insertPosition);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Обновлено: ${path.relative(SITE_ROOT, filePath)}`);
    return true;
  } else {
    // Если api-client.js есть, но нет cms-loader.js
    const beforeCmsLoader = content.indexOf('cms-loader.js');
    if (beforeCmsLoader === -1) {
      // Найти где заканчивается components-loader.js
      const afterComponentsLoader = content.indexOf('components-loader.js');
      if (afterComponentsLoader !== -1) {
        const insertPos = content.indexOf('</script>', afterComponentsLoader) + 9;
        content = content.slice(0, insertPos) + '\n    <script src="js/cms-loader.js"></script>' + content.slice(insertPos);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Добавлен cms-loader.js: ${path.relative(SITE_ROOT, filePath)}`);
        return true;
      }
    }
  }
  
  return false;
}

function main() {
  console.log('\n🔍 Поиск всех HTML страниц...\n');
  
  const htmlFiles = findHtmlFiles(SITE_ROOT);
  console.log(`Найдено HTML страниц: ${htmlFiles.length}\n`);
  
  let updated = 0;
  let skipped = 0;
  
  htmlFiles.forEach(filePath => {
    const result = addCmsLoader(filePath);
    if (result) {
      updated++;
    } else {
      skipped++;
    }
  });
  
  console.log(`\n📊 Результаты:`);
  console.log(`   - ✅ Обновлено: ${updated}`);
  console.log(`   - ⏭️  Пропущено: ${skipped}`);
  console.log(`   - 📄 Всего: ${htmlFiles.length}\n`);
}

main();





