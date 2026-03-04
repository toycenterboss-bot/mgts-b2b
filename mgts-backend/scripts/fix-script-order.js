/**
 * Скрипт для исправления порядка загрузки скриптов на всех HTML страницах
 * Правильный порядок: api-client -> navigation-renderer -> footer-renderer -> components-loader -> cms-loader
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

function fixScriptOrder(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Проверяем, есть ли api-client.js
  if (!content.includes('api-client.js')) {
    return false;
  }
  
  // Определяем путь к js (относительно корня или ../js)
  const relativePath = filePath.replace(SITE_DIR, '').split(path.sep).filter(p => p);
  const depth = relativePath.length - 1;
  const jsPath = depth > 0 ? '../'.repeat(depth) + 'js/' : 'js/';
  
  // Ищем все скрипты в правильном порядке
  const requiredScripts = [
    { name: 'api-client.js', tag: `<script src="${jsPath}api-client.js"></script>` },
    { name: 'navigation-renderer.js', tag: `<script src="${jsPath}navigation-renderer.js"></script>` },
    { name: 'footer-renderer.js', tag: `<script src="${jsPath}footer-renderer.js"></script>` },
    { name: 'components-loader.js', tag: `<script src="${jsPath}components-loader.js"></script>` },
    { name: 'cms-loader.js', tag: `<script src="${jsPath}cms-loader.js"></script>` }
  ];
  
  // Проверяем, какие скрипты есть в файле
  const scriptsInFile = requiredScripts.filter(s => content.includes(s.name));
  
  if (scriptsInFile.length === 0) {
    return false;
  }
  
  // Находим позицию первого скрипта из нашего списка
  let firstScriptPos = -1;
  let firstScriptName = null;
  for (const script of requiredScripts) {
    const pos = content.indexOf(script.tag);
    if (pos !== -1) {
      firstScriptPos = pos;
      firstScriptName = script.name;
      break;
    }
  }
  
  if (firstScriptPos === -1) {
    return false;
  }
  
  // Находим конец последнего скрипта из нашего списка
  let lastScriptPos = -1;
  for (let i = requiredScripts.length - 1; i >= 0; i--) {
    const script = requiredScripts[i];
    const pos = content.indexOf(script.tag);
    if (pos !== -1) {
      const endPos = content.indexOf('</script>', pos) + 9;
      lastScriptPos = endPos;
      break;
    }
  }
  
  if (lastScriptPos === -1) {
    return false;
  }
  
  // Извлекаем существующие скрипты
  const existingScripts = [];
  for (const script of requiredScripts) {
    const regex = new RegExp(`<script[^>]*src=["'][^"']*${script.name.replace(/\./g, '\\.')}["'][^>]*></script>`, 'i');
    const match = content.match(regex);
    if (match) {
      existingScripts.push({ name: script.name, tag: script.tag, original: match[0] });
    }
  }
  
  // Проверяем, в правильном ли порядке скрипты
  const scriptSection = content.substring(firstScriptPos, lastScriptPos);
  let correctOrder = true;
  let lastIndex = -1;
  
  for (const script of requiredScripts) {
    if (!scriptSection.includes(script.name)) continue;
    const index = scriptSection.indexOf(script.name);
    if (index < lastIndex) {
      correctOrder = false;
      break;
    }
    lastIndex = index;
  }
  
  if (correctOrder) {
    return false; // Порядок уже правильный
  }
  
  // Формируем правильную последовательность скриптов
  const correctScripts = [];
  for (const script of requiredScripts) {
    const existing = existingScripts.find(s => s.name === script.name);
    if (existing) {
      correctScripts.push(existing.tag);
    }
  }
  
  // Удаляем старые скрипты и вставляем в правильном порядке
  let newContent = content;
  
  // Удаляем все существующие скрипты
  for (const script of existingScripts) {
    const regex = new RegExp(`<script[^>]*src=["'][^"']*${script.name.replace(/\./g, '\\.')}["'][^>]*>\\s*</script>\\s*`, 'gi');
    newContent = newContent.replace(regex, '');
  }
  
  // Вставляем скрипты в правильном порядке перед </body> или перед другими скриптами (main.js)
  const bodyClosePos = newContent.lastIndexOf('</body>');
  const mainJsPos = newContent.indexOf('<script src="', bodyClosePos > 0 ? bodyClosePos - 1000 : 0);
  
  let insertPos = bodyClosePos > 0 ? bodyClosePos : newContent.length;
  
  if (mainJsPos !== -1 && mainJsPos < bodyClosePos) {
    insertPos = mainJsPos;
  }
  
  const scriptsBlock = '    <!-- Компоненты должны загружаться первыми -->\n' + 
                       correctScripts.map(s => `    ${s}`).join('\n') + '\n';
  
  newContent = newContent.slice(0, insertPos) + scriptsBlock + newContent.slice(insertPos);
  
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
      if (fixScriptOrder(file)) {
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



