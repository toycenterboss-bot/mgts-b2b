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

function fixScriptPaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Вычислить глубину вложенности
  const relativeToRoot = path.relative(SITE_ROOT, path.dirname(filePath));
  const depth = relativeToRoot.split(path.sep).filter(p => p).length;
  const jsPath = depth > 0 ? '../'.repeat(depth) + 'js/' : 'js/';
  
  // Исправить пути к скриптам CMS
  const patterns = [
    { old: /<script src="js\/api-client\.js"><\/script>/g, new: `<script src="${jsPath}api-client.js"></script>` },
    { old: /<script src="js\/cms-loader\.js"><\/script>/g, new: `<script src="${jsPath}cms-loader.js"></script>` },
    { old: /<script src="js\/components-loader\.js"><\/script>/g, new: `<script src="${jsPath}components-loader.js"></script>` },
  ];
  
  patterns.forEach(({ old: pattern, new: replacement }) => {
    if (pattern.test(content) && !content.includes(replacement)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Исправлено: ${path.relative(SITE_ROOT, filePath)} (путь: ${jsPath})`);
    return true;
  }
  
  return false;
}

const htmlFiles = findHtmlFiles(SITE_ROOT);
let fixed = 0;

htmlFiles.forEach(filePath => {
  if (fixScriptPaths(filePath)) {
    fixed++;
  }
});

console.log(`\n📊 Исправлено путей: ${fixed} из ${htmlFiles.length}\n`);
