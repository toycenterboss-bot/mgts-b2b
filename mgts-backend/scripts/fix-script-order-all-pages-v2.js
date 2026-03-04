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
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && file !== 'components' && file !== 'node_modules' && !file.startsWith('.')) {
          findHTMLFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
          fileList.push(filePath);
        }
      } catch (e) {
        // Пропускаем файлы, к которым нет доступа
      }
    });
  } catch (e) {
    // Пропускаем директории, к которым нет доступа
  }
  
  return fileList;
}

function fixScripts(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Определяем путь к js (относительно корня или ../js)
  const relativePath = filePath.replace(SITE_DIR, '').split(path.sep).filter(p => p);
  const depth = relativePath.length - 1;
  const jsPath = depth > 0 ? '../'.repeat(depth) + 'js/' : 'js/';
  
  // Проверяем, есть ли api-client.js
  if (!content.includes('api-client.js')) {
    return false;
  }
  
  // Удаляем все старые скрипты (api-client, navigation-renderer, footer-renderer, components-loader, cms-loader)
  // Сначала удаляем неправильный синтаксис (не закрытые теги)
  content = content.replace(/<script[^>]*src=["'][^"']*api-client\.js["'][^>]*>\s*<script[^>]*src=["'][^"']*navigation-renderer\.js["'][^>]*>\s*<script[^>]*src=["'][^"']*footer-renderer\.js["'][^>]*><\/script><\/script><\/script>/gi, '');
  
  // Удаляем отдельные скрипты (правильные и неправильные)
  const scriptsToRemove = ['api-client.js', 'navigation-renderer.js', 'footer-renderer.js', 'components-loader.js', 'cms-loader.js'];
  
  scriptsToRemove.forEach(scriptName => {
    // Удаляем правильные скрипты
    const correctRegex = new RegExp(`<script[^>]*src=["'][^"']*${scriptName.replace(/\./g, '\\.')}["'][^>]*>\\s*</script>\\s*`, 'gi');
    content = content.replace(correctRegex, '');
    
    // Удаляем неправильные скрипты (не закрытые)
    const brokenRegex = new RegExp(`<script[^>]*src=["'][^"']*${scriptName.replace(/\./g, '\\.')}["'][^>]*>\\s*`, 'gi');
    content = content.replace(brokenRegex, '');
  });
  
  // Удаляем лишние закрывающие теги
  content = content.replace(/<\/script><\/script>/gi, '');
  
  // Находим позицию для вставки (перед </body>)
  const bodyClosePos = content.lastIndexOf('</body>');
  if (bodyClosePos === -1) {
    return false;
  }
  
  // Ищем последний скрипт перед </body> (main.js, seasonal.js и т.д.)
  const beforeBody = content.substring(0, bodyClosePos);
  const lastScriptMatch = beforeBody.match(/<script[^>]*>[\s\S]*?<\/script>\s*$/m);
  
  let insertPos = bodyClosePos;
  if (lastScriptMatch) {
    insertPos = lastScriptMatch.index + lastScriptMatch[0].length;
  } else {
    // Если нет скриптов, ищем последний закрывающий тег перед </body>
    const lastTagMatch = beforeBody.match(/<\/[^>]+>\s*$/m);
    if (lastTagMatch) {
      insertPos = lastTagMatch.index + lastTagMatch[0].length;
    }
  }
  
  // Формируем правильный блок скриптов
  const requiredScripts = [
    { name: 'api-client.js', tag: `<script src="${jsPath}api-client.js"></script>` },
    { name: 'navigation-renderer.js', tag: `<script src="${jsPath}navigation-renderer.js"></script>` },
    { name: 'footer-renderer.js', tag: `<script src="${jsPath}footer-renderer.js"></script>` },
    { name: 'components-loader.js', tag: `<script src="${jsPath}components-loader.js"></script>` },
    { name: 'cms-loader.js', tag: `<script src="${jsPath}cms-loader.js"></script>` }
  ];
  
  const scriptsBlock = '    <!-- Компоненты должны загружаться первыми -->\n' + 
                       requiredScripts.map(s => `    ${s.tag}`).join('\n') + '\n';
  
  // Вставляем скрипты
  content = content.slice(0, insertPos) + scriptsBlock + content.slice(insertPos);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
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



