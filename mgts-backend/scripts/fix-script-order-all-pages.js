/**
 * Скрипт для исправления порядка и синтаксиса скриптов на всех HTML страницах
 * Исправляет:
 * 1. Неправильный синтаксис (не закрытые теги)
 * 2. Неправильный порядок скриптов
 * 3. Дублирование скриптов
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '../../SiteMGTS');

function findHTMLFiles(dir, fileList = []) {
  const files = fs.readDirSync(dir);
  
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

function fixScripts(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Определяем путь к js (относительно корня или ../js)
  const relativePath = filePath.replace(SITE_DIR, '').split(path.sep).filter(p => p);
  const depth = relativePath.length - 1;
  const jsPath = depth > 0 ? '../'.repeat(depth) + 'js/' : 'js/';
  
  // Проверяем, есть ли api-client.js
  if (!content.includes('api-client.js')) {
    return false;
  }
  
  // Ищем все скрипты, которые нужно исправить
  const requiredScripts = [
    { name: 'api-client.js', tag: `<script src="${jsPath}api-client.js"></script>` },
    { name: 'navigation-renderer.js', tag: `<script src="${jsPath}navigation-renderer.js"></script>` },
    { name: 'footer-renderer.js', tag: `<script src="${jsPath}footer-renderer.js"></script>` },
    { name: 'components-loader.js', tag: `<script src="${jsPath}components-loader.js"></script>` },
    { name: 'cms-loader.js', tag: `<script src="${jsPath}cms-loader.js"></script>` }
  ];
  
  // Проверяем, есть ли неправильный синтаксис (не закрытые теги)
  const hasBrokenSyntax = /<script[^>]*src=["'][^"']*api-client\.js["'][^>]*>\s*<script/i.test(content) ||
                          /<script[^>]*src=["'][^"']*navigation-renderer\.js["'][^>]*>\s*<script/i.test(content) ||
                          /<\/script><\/script>/i.test(content);
  
  // Проверяем, есть ли дублирование components-loader
  const componentsLoaderMatches = content.match(/components-loader\.js/gi);
  const hasDuplication = componentsLoaderMatches && componentsLoaderMatches.length > 1;
  
  // Находим позицию перед </body>
  const bodyClosePos = content.lastIndexOf('</body>');
  if (bodyClosePos === -1) {
    return false;
  }
  
  // Удаляем все старые скрипты (api-client, navigation-renderer, footer-renderer, components-loader, cms-loader)
  let newContent = content;
  
  // Удаляем все скрипты с неправильным синтаксисом
  newContent = newContent.replace(/<script[^>]*src=["'][^"']*api-client\.js["'][^>]*>\s*<script[^>]*src=["'][^"']*navigation-renderer\.js["'][^>]*>\s*<script[^>]*src=["'][^"']*footer-renderer\.js["'][^>]*><\/script><\/script><\/script>/gi, '');
  
  // Удаляем отдельные скрипты (правильные и неправильные)
  requiredScripts.forEach(script => {
    // Удаляем правильные скрипты
    const correctRegex = new RegExp(`<script[^>]*src=["'][^"']*${script.name.replace(/\./g, '\\.')}["'][^>]*>\\s*</script>\\s*`, 'gi');
    newContent = newContent.replace(correctRegex, '');
    
    // Удаляем неправильные скрипты (не закрытые)
    const brokenRegex = new RegExp(`<script[^>]*src=["'][^"']*${script.name.replace(/\./g, '\\.')}["'][^>]*>\\s*`, 'gi');
    newContent = newContent.replace(brokenRegex, '');
  });
  
  // Удаляем лишние закрывающие теги
  newContent = newContent.replace(/<\/script><\/script>/gi, '');
  
  // Находим позицию для вставки (перед </body>, но после других скриптов если есть)
  let insertPos = bodyClosePos;
  
  // Ищем последний скрипт перед </body>
  const lastScriptMatch = newContent.substring(0, bodyClosePos).match(/<script[^>]*>[\s\S]*?<\/script>\s*$/m);
  if (lastScriptMatch) {
    insertPos = lastScriptMatch.index + lastScriptMatch[0].length;
  }
  
  // Формируем правильный блок скриптов
  const scriptsBlock = '    <!-- Компоненты должны загружаться первыми -->\n' + 
                       requiredScripts.map(s => `    ${s.tag}`).join('\n') + '\n';
  
  // Вставляем скрипты
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
      if (fixScripts(file)) {
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



