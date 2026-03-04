/**
 * Скрипт для исправления всех путей к скриптам на всех HTML страницах
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

function calculateJsPath(filePath) {
  const relativeToRoot = path.relative(SITE_ROOT, path.dirname(filePath));
  const depth = relativeToRoot.split(path.sep).filter(p => p).length;
  return depth > 0 ? '../'.repeat(depth) + 'js/' : 'js/';
}

function fixScriptPaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  const jsPath = calculateJsPath(filePath);
  
  // Паттерны для поиска и замены
  const patterns = [
    // Исправить все варианты путей к api-client.js
    { 
      old: /<script\s+src=["']([^"']*\/)?js\/api-client\.js["']><\/script>/gi, 
      new: `<script src="${jsPath}api-client.js"></script>`
    },
    // Исправить все варианты путей к cms-loader.js
    { 
      old: /<script\s+src=["']([^"']*\/)?js\/cms-loader\.js["']><\/script>/gi, 
      new: `<script src="${jsPath}cms-loader.js"></script>`
    },
    // Исправить все варианты путей к components-loader.js
    { 
      old: /<script\s+src=["']([^"']*\/)?js\/components-loader\.js["']><\/script>/gi, 
      new: `<script src="${jsPath}components-loader.js"></script>`
    },
  ];
  
  patterns.forEach(({ old: pattern, new: replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!match.includes(replacement)) {
          content = content.replace(match, replacement);
          modified = true;
        }
      });
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Исправлено: ${path.relative(SITE_ROOT, filePath)} (путь: ${jsPath})`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('\n🔍 Поиск и исправление путей к скриптам...\n');
  
  const htmlFiles = findHtmlFiles(SITE_ROOT);
  console.log(`Найдено HTML страниц: ${htmlFiles.length}\n`);
  
  let fixed = 0;
  
  htmlFiles.forEach(filePath => {
    if (fixScriptPaths(filePath)) {
      fixed++;
    }
  });
  
  console.log(`\n📊 Результаты:`);
  console.log(`   - ✅ Исправлено: ${fixed}`);
  console.log(`   - 📄 Всего: ${htmlFiles.length}\n`);
}

main();





