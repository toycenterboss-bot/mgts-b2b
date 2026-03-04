const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findHtmlFiles(filePath, fileList);
    } else if (file === 'index.html') {
      fileList.push({
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        depth: filePath.split(path.sep).length - 1
      });
    }
  });
  
  return fileList;
}

// Определение пути к корню сайта
const siteRoot = process.env.SITE_ROOT || 
  (() => {
    // Попытка найти SiteMGTS автоматически
    let currentDir = __dirname;
    const maxDepth = 10;
    let depth = 0;
    
    while (depth < maxDepth && currentDir !== path.dirname(currentDir)) {
      // Проверить несколько возможных путей
      const possiblePaths = [
        path.join(currentDir, '..', '..', '..', 'SiteMGTS'),
        path.join(currentDir, '..', '..', '..', '..', 'SiteMGTS'),
        path.join(currentDir, '..', '..', 'SiteMGTS'),
        path.join(currentDir, 'SiteMGTS')
      ];
      
      for (const siteDir of possiblePaths) {
        if (fs.existsSync(siteDir)) {
          return siteDir;
        }
      }
      
      currentDir = path.dirname(currentDir);
      depth++;
    }
    
    // Путь по умолчанию
    return path.join(__dirname, '..', '..', '..', 'SiteMGTS');
  })();

// Проверка существования директории
if (!fs.existsSync(siteRoot)) {
  console.error(`\n❌ Ошибка: Директория SiteMGTS не найдена по пути: ${siteRoot}`);
  console.error('\nУстановите переменную окружения SITE_ROOT:');
  console.error('  PowerShell: $env:SITE_ROOT="C:\\Users\\abefremov\\SiteMGTS"');
  console.error('  CMD: set SITE_ROOT=C:\\Users\\abefremov\\SiteMGTS');
  console.error('  Linux/Mac: export SITE_ROOT=/path/to/SiteMGTS');
  process.exit(1);
}

console.log(`\n🔍 Поиск HTML файлов в: ${siteRoot}\n`);

const htmlFiles = findHtmlFiles(siteRoot);

console.log(`✅ Найдено HTML файлов: ${htmlFiles.length}\n`);
console.log('📄 Структура страниц:');
htmlFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file.relativePath} (уровень ${file.depth})`);
});

// Сохранить в JSON
const outputPath = path.join(__dirname, 'inventory.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(htmlFiles, null, 2)
);

console.log(`\n💾 Результаты сохранены в: ${outputPath}`);
console.log(`\n📊 Статистика:`);
console.log(`   - Всего страниц: ${htmlFiles.length}`);
console.log(`   - Максимальная глубина: ${Math.max(...htmlFiles.map(f => f.depth))}`);
console.log(`\n✅ Инвентаризация завершена!\n`);

