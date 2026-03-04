/**
 * Скрипт для генерации дерева всех страниц проекта
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '../../SiteMGTS');
const OUTPUT_FILE = path.join(__dirname, '../../site-structure-tree.md');

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

function buildTree(files) {
  const tree = {};
  
  files.forEach(filePath => {
    const relativePath = filePath.replace(SITE_DIR + path.sep, '');
    const parts = relativePath.split(path.sep);
    
    let current = tree;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // Это файл
        if (!current.files) {
          current.files = [];
        }
        current.files.push(part);
      } else {
        // Это директория
        if (!current.dirs) {
          current.dirs = {};
        }
        if (!current.dirs[part]) {
          current.dirs[part] = {};
        }
        current = current.dirs[part];
      }
    });
  });
  
  return tree;
}

function treeToMarkdown(tree, prefix = '', isLast = true, depth = 0) {
  let output = '';
  const dirs = tree.dirs ? Object.keys(tree.dirs).sort() : [];
  const files = tree.files ? tree.files.sort() : [];
  const allItems = [...dirs, ...files];
  
  allItems.forEach((item, index) => {
    const isLastItem = index === allItems.length - 1;
    const isDir = dirs.includes(item);
    
    // Текущий элемент
    const connector = isLastItem ? '└── ' : '├── ';
    const currentPrefix = prefix + connector;
    
    if (isDir) {
      output += currentPrefix + item + '/\n';
      
      // Рекурсивно обрабатываем поддерево
      const nextPrefix = prefix + (isLastItem ? '    ' : '│   ');
      output += treeToMarkdown(tree.dirs[item], nextPrefix, isLastItem, depth + 1);
    } else {
      // Это файл
      const relativePath = getRelativePath(item, depth);
      output += currentPrefix + `[${item}](${relativePath})\n`;
    }
  });
  
  return output;
}

function getRelativePath(filename, depth) {
  // Для файлов в корне
  if (depth === 0) {
    return `SiteMGTS/${filename}`;
  }
  // Для файлов в подпапках - нужно будет вычислить путь
  // Пока просто возвращаем имя файла
  return filename;
}

function generateMarkdown(files) {
  const tree = buildTree(files);
  
  let markdown = `# Структура сайта МГТС Бизнес\n\n`;
  markdown += `*Автоматически сгенерировано: ${new Date().toLocaleString('ru-RU')}*\n\n`;
  markdown += `Всего страниц: **${files.length}**\n\n`;
  markdown += `---\n\n`;
  markdown += `## Дерево файлов\n\n\`\`\`\n`;
  markdown += treeToMarkdown(tree);
  markdown += `\`\`\`\n\n`;
  markdown += `---\n\n`;
  markdown += `## Список всех страниц\n\n`;
  
  // Сортируем файлы по пути
  const sortedFiles = files.map(f => f.replace(SITE_DIR + path.sep, '')).sort();
  
  sortedFiles.forEach((file, index) => {
    const relativePath = file.replace(/\\/g, '/');
    const parts = relativePath.split('/');
    const depth = parts.length - 1;
    const indent = '  '.repeat(depth);
    const fileName = parts[parts.length - 1];
    const urlPath = relativePath.replace(/\/index\.html$/, '/').replace(/index\.html$/, '');
    
    markdown += `${indent}${index + 1}. **${fileName}** - \`${relativePath}\`\n`;
  });
  
  return markdown;
}

function main() {
  console.log('[Tree Generator] Поиск всех HTML файлов...');
  const htmlFiles = findHTMLFiles(SITE_DIR);
  
  console.log(`[Tree Generator] Найдено ${htmlFiles.length} HTML файлов`);
  
  console.log('[Tree Generator] Генерация дерева...');
  const markdown = generateMarkdown(htmlFiles);
  
  console.log('[Tree Generator] Сохранение в файл...');
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');
  
  console.log(`[Tree Generator] ✅ Дерево сохранено в: ${OUTPUT_FILE}`);
  console.log(`[Tree Generator] Всего страниц: ${htmlFiles.length}`);
}

main();



