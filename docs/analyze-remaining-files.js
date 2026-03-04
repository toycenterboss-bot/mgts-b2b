const fs = require('fs');
const path = require('path');

// Категории файлов
const categories = {
  'docs/guides/development/': {
    keywords: ['architecture', 'refactoring', 'implementation', 'plan', 'analysis', 'cross-platform', 'component', 'migration', 'modernization'],
    description: 'Документация для разработчиков'
  },
  'docs/guides/usage/': {
    keywords: ['quick', 'start', 'setup', 'instruction', 'guide', 'troubleshooting', 'verification', 'check'],
    description: 'Инструкции по использованию'
  },
  'docs/installation/setup/': {
    keywords: ['install', 'setup', 'environment', 'strapi', 'server', 'start'],
    description: 'Установка и настройка'
  },
  'docs/fixes/structure/': {
    keywords: ['fix', 'path', 'issue', 'sidebar', 'menu', 'footer', 'component'],
    description: 'Исправления структуры'
  },
  'docs/status/completed/': {
    keywords: ['complete', 'completed', 'finished', 'done', 'status', 'step'],
    description: 'Завершенные задачи'
  },
  'docs/cms/integration/': {
    keywords: ['cms', 'cursor', 'readiness', 'implementation'],
    description: 'Интеграция CMS'
  },
  'docs/project/': {
    keywords: ['pages', 'list', 'template', 'menu', 'structure'],
    description: 'Документация проекта'
  },
  'scripts/utils/': {
    keywords: ['extract', 'migrate', 'update', 'fix', 'get', 'fetch', 'remove', 'add', 'copy', 'move'],
    description: 'Утилиты и скрипты',
    fileExtensions: ['.py', '.ps1', '.sh', '.bat']
  },
  'docs/analysis/reports/': {
    keywords: ['analysis', 'report'],
    description: 'Отчеты анализа',
    fileExtensions: ['.json']
  },
  'temp/txt/': {
    keywords: ['log', 'txt'],
    description: 'Временные текстовые файлы',
    fileExtensions: ['.txt', '.log']
  }
};

// Файлы для анализа
const filesToAnalyze = [
  // SiteMGTS/
  ...getFilesInDir('SiteMGTS', ['.md', '.py', '.ps1', '.sh', '.bat']),
  // mgts-backend/
  ...getFilesInDir('mgts-backend', ['.md', '.json', '.txt', '.log']),
];

function getFilesInDir(dir, extensions) {
  const files = [];
  const fullPath = path.join(__dirname, '..', dir);
  
  if (!fs.existsSync(fullPath)) return files;
  
  try {
    const items = fs.readdirSync(fullPath);
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (extensions.includes(ext)) {
          files.push({
            path: path.join(dir, item),
            name: item,
            ext: ext,
            size: stat.size
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error reading ${dir}:`, err.message);
  }
  
  return files;
}

function categorizeFile(file) {
  const name = file.name.toLowerCase();
  const pathLower = file.path.toLowerCase();
  
  // Специальные случаи
  if (file.path.includes('mgts-backend/scripts/')) {
    return null; // Скрипты уже в правильном месте
  }
  
  if (file.path.includes('SiteMGTS/js/') || file.path.includes('SiteMGTS/css/')) {
    return null; // Исходные файлы проекта
  }
  
  if (file.path.includes('SiteMGTS/components/')) {
    return null; // Компоненты проекта
  }
  
  // JSON файлы анализа
  if (file.ext === '.json' && (name.includes('analysis') || name.includes('report') || name.includes('segment'))) {
    return {
      category: 'docs/analysis/reports/',
      reason: 'JSON файл с результатами анализа'
    };
  }
  
  // Логи и текстовые файлы
  if (file.ext === '.log' || (file.ext === '.txt' && (name.includes('log') || name.includes('migration')))) {
    return {
      category: 'temp/txt/',
      reason: 'Лог или временный текстовый файл'
    };
  }
  
  // Анализ по ключевым словам
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [category, config] of Object.entries(categories)) {
    let score = 0;
    
    // Проверка расширения
    if (config.fileExtensions && !config.fileExtensions.includes(file.ext)) {
      continue;
    }
    
    // Проверка ключевых слов
    for (const keyword of config.keywords) {
      if (name.includes(keyword) || pathLower.includes(keyword)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        category: category,
        reason: `Совпадение по ключевым словам (${score})`
      };
    }
  }
  
  return bestMatch;
}

// Анализ файлов
const results = {
  categorized: [],
  uncategorized: [],
  alreadyInPlace: []
};

for (const file of filesToAnalyze) {
  const category = categorizeFile(file);
  
  if (category) {
    results.categorized.push({
      file: file.path,
      name: file.name,
      category: category.category,
      reason: category.reason,
      size: file.size
    });
  } else if (file.path.includes('docs/') || file.path.includes('scripts/') || file.path.includes('temp/')) {
    results.alreadyInPlace.push({
      file: file.path,
      name: file.name
    });
  } else {
    results.uncategorized.push({
      file: file.path,
      name: file.name,
      ext: file.ext,
      size: file.size
    });
  }
}

// Группировка по категориям
const byCategory = {};
for (const item of results.categorized) {
  if (!byCategory[item.category]) {
    byCategory[item.category] = [];
  }
  byCategory[item.category].push(item);
}

// Вывод результатов
console.log('=== АНАЛИЗ ОСТАВШИХСЯ ФАЙЛОВ ===\n');

console.log(`Всего файлов проанализировано: ${filesToAnalyze.length}`);
console.log(`Классифицировано: ${results.categorized.length}`);
console.log(`Уже на месте: ${results.alreadyInPlace.length}`);
console.log(`Не классифицировано: ${results.uncategorized.length}\n`);

console.log('=== КЛАССИФИЦИРОВАННЫЕ ФАЙЛЫ ===\n');
for (const [category, files] of Object.entries(byCategory)) {
  console.log(`\n${category} (${files.length} файлов):`);
  for (const file of files) {
    console.log(`  - ${file.file}`);
    console.log(`    Причина: ${file.reason}`);
  }
}

if (results.uncategorized.length > 0) {
  console.log('\n=== НЕ КЛАССИФИЦИРОВАННЫЕ ФАЙЛЫ ===\n');
  for (const file of results.uncategorized) {
    console.log(`  - ${file.file} (${file.ext}, ${file.size} bytes)`);
  }
}

// Сохранение результатов
const outputPath = path.join(__dirname, 'remaining-files-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify({
  summary: {
    total: filesToAnalyze.length,
    categorized: results.categorized.length,
    alreadyInPlace: results.alreadyInPlace.length,
    uncategorized: results.uncategorized.length
  },
  categorized: results.categorized,
  uncategorized: results.uncategorized,
  alreadyInPlace: results.alreadyInPlace,
  byCategory: byCategory
}, null, 2));

console.log(`\n\nРезультаты сохранены в: ${outputPath}`);
