/**
 * Скрипт для генерации дерева всех страниц проекта (улучшенная версия)
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
    const relativePath = filePath.replace(SITE_DIR + path.sep, '').replace(/\\/g, '/');
    const parts = relativePath.split('/');
    
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

function treeToMarkdown(tree, prefix = '', isLast = true, depth = 0, pathSoFar = []) {
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
      const nextPath = [...pathSoFar, item];
      output += treeToMarkdown(tree.dirs[item], nextPrefix, isLastItem, depth + 1, nextPath);
    } else {
      // Это файл
      const fullPath = pathSoFar.length > 0 
        ? pathSoFar.join('/') + '/' + item
        : item;
      output += currentPrefix + item + ` (${fullPath})\n`;
    }
  });
  
  return output;
}

function generateMarkdown(files) {
  const tree = buildTree(files);
  
  let markdown = `# Структура сайта МГТС Бизнес\n\n`;
  markdown += `*Автоматически сгенерировано: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}*\n\n`;
  markdown += `Всего страниц: **${files.length}**\n\n`;
  markdown += `---\n\n`;
  markdown += `## Дерево файлов\n\n\`\`\`\n`;
  markdown += treeToMarkdown(tree);
  markdown += `\`\`\`\n\n`;
  markdown += `---\n\n`;
  markdown += `## Список всех страниц по разделам\n\n`;
  
  // Группируем файлы по разделам
  const sections = {};
  
  files.forEach(file => {
    const relativePath = file.replace(SITE_DIR + path.sep, '').replace(/\\/g, '/');
    const parts = relativePath.split('/');
    const section = parts.length > 1 ? parts[0] : 'root';
    
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(relativePath);
  });
  
  // Сортируем разделы
  const sortedSections = Object.keys(sections).sort();
  
  sortedSections.forEach(section => {
    const sectionName = section === 'root' ? 'Корневая директория' : section;
    markdown += `### ${sectionName}\n\n`;
    
    sections[section].sort().forEach((file, index) => {
      const fileName = file.split('/').pop();
      markdown += `${index + 1}. **${fileName}** - \`${file}\`\n`;
    });
    
    markdown += `\n`;
  });
  
  markdown += `---\n\n`;
  markdown += `## Статистика по уровням вложенности\n\n`;
  
  const depthStats = {};
  files.forEach(file => {
    const relativePath = file.replace(SITE_DIR + path.sep, '').replace(/\\/g, '/');
    const depth = relativePath.split('/').length - 1;
    depthStats[depth] = (depthStats[depth] || 0) + 1;
  });
  
  Object.keys(depthStats).sort((a, b) => parseInt(a) - parseInt(b)).forEach(depth => {
    const levelName = depth === '0' ? 'Корневая директория' : `Уровень ${depth}`;
    markdown += `- ${levelName}: **${depthStats[depth]}** страниц\n`;
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



