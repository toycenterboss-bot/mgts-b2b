/**
 * Скрипт для анализа и группировки контекстных файлов
 * Показывает, какие файлы куда должны быть перемещены
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Категории файлов
const categories = {
  'cms/content-types': [
    'CMS_CONTENT_TYPES.md',
    'CONTENT_TYPE_*.md'
  ],
  'cms/integration': [
    'CMS_INTEGRATION_*.md',
    'CMS_CONNECTION_*.md',
    'API_INTEGRATION_*.md'
  ],
  'cms/grid-types': [
    'CMS_GRID_TYPES_*.md',
    'GRID_TYPES_*.md'
  ],
  'cms/structure': [
    'CLASS_HIERARCHY_RULES.md',
    'TOP_LEVEL_ELEMENTS_*.md',
    'DIV_NORMALIZATION_*.md'
  ],
  'fixes/structure': [
    'FIX_*.md',
    'STRUCTURE_ANALYSIS_*.md'
  ],
  'fixes/pages': [
    '*_PAGES_FIX_*.md',
    'ABOUT_PAGES_FIX.md',
    'SEGMENT_PAGES_FIX_*.md'
  ],
  'fixes/styles': [
    '*_STYLES_FIX.md',
    'SERVICE_CARD_STYLES_FIX.md'
  ],
  'installation/setup': [
    '*_SETUP_*.md',
    '*_INSTALL_*.md',
    'SETUP_*.md',
    'INSTALLATION_*.md',
    'QUICK_START_*.md'
  ],
  'installation/migration': [
    '*_MIGRATION_*.md',
    'MIGRATION_*.md',
    'EXECUTE_MIGRATION.md'
  ],
  'installation/troubleshooting': [
    '*_TROUBLESHOOTING*.md',
    'CMS_UPDATE_TROUBLESHOOTING.md',
    'CHECK_CMS_CONNECTION.md'
  ],
  'analysis/reports': [
    '*-analysis.json',
    '*-results.json',
    '*_ANALYSIS_REPORT.md'
  ],
  'guides/editor': [
    'EDITOR_GUIDE.md',
    'QUICK_START_EDITOR.md'
  ],
  'guides/development': [
    'HTML_*.md',
    'UI_UX_*.md'
  ],
  'guides/usage': [
    'HOW_TO_*.md',
    'STRAPI_UPDATE_PAGES_GUIDE.md',
    'STRAPI_BACKUP_GUIDE.md'
  ],
  'status/progress': [
    '*_STATUS.md',
    'PROGRESS.md',
    'CURRENT_PROGRESS.md',
    'PROJECT_STATUS.md'
  ],
  'status/completed': [
    '*_COMPLETE*.md',
    '*_COMPLETED.md',
    'FINAL_*.md',
    'PROJECT_COMPLETE_*.md'
  ],
  'temp/html': [
    '*.html',
    'test-*.html'
  ],
  'temp/txt': [
    'main_page_*.txt',
    'main_page_*.html',
    'Консоль.txt'
  ],
  'temp/images': [
    '*.jpg',
    '*.png'
  ],
  'scripts/setup': [
    '*.ps1',
    '*.sh',
    'setup_*.sh',
    'install_*.sh',
    'start_*.sh',
    'check_*.sh',
    'check_*.ps1'
  ],
  'scripts/utils': [
    'clean-html-from-rtf.js'
  ],
  'guides/development': [
    'HTML_*.md',
    'UI_UX_*.md',
    'CLEAN_MAIN_PAGE_HTML.md'
  ],
  'installation/setup': [
    '*_SETUP_*.md',
    '*_INSTALL_*.md',
    'SETUP_*.md',
    'INSTALLATION_*.md',
    'QUICK_START_*.md',
    'INSTALL_NODEJS_MANUAL.md',
    'STRAPI_REINSTALL.md',
    'README_INSTALLATION.md'
  ],
  'installation/migration': [
    '*_MIGRATION_*.md',
    'MIGRATION_*.md',
    'EXECUTE_MIGRATION.md',
    'MAC_MIGRATION_GUIDE.md'
  ],
  'status/progress': [
    '*_STATUS.md',
    'PROGRESS.md',
    'CURRENT_PROGRESS.md',
    'PROJECT_STATUS.md',
    'PROJECT_RUNNING.md',
    'SERVERS_STATUS.md'
  ],
  'status/completed': [
    '*_COMPLETE*.md',
    '*_COMPLETED.md',
    'FINAL_*.md',
    'PROJECT_COMPLETE_*.md',
    'IMPORT_SUCCESS.md',
    'IMPORT_COMPLETED.md',
    'COMPLETED_*.md',
    'EXECUTED_STEPS.md',
    'NEXT_ACTIONS_COMPLETED.md'
  ],
  'guides/usage': [
    'HOW_TO_*.md',
    'STRAPI_UPDATE_PAGES_GUIDE.md',
    'STRAPI_BACKUP_GUIDE.md',
    'CACHE_CLEAR_INSTRUCTIONS.md'
  ],
  'fixes/pages': [
    '*_PAGES_FIX_*.md',
    'ABOUT_PAGES_FIX.md',
    'SEGMENT_PAGES_FIX_*.md',
    'INTEGRATION_ALL_PAGES_FIX.md',
    'STRAPI_CONTENT_FIX_*.md'
  ],
  'cms/integration': [
    'CMS_INTEGRATION_*.md',
    'CMS_CONNECTION_*.md',
    'API_INTEGRATION_*.md',
    'CMS_NEXT_STEPS.md',
    'INTEGRATION_TEST_RESULTS.md',
    'TESTING_RESULTS.md'
  ],
  'analysis/reports': [
    '*-analysis.json',
    '*-results.json',
    '*_ANALYSIS_REPORT.md',
    '*_report.json',
    'main_page_analysis.md'
  ],
  'docs/project': [
    'site-structure-tree.md',
    'CONTEXT.md'
  ],
  'docs/setup': [
    'CLOUDINARY_SETUP.md',
    'LOCAL_STORAGE_SETUP.md'
  ]
};

// Функция для проверки соответствия паттерну
function matchesPattern(filename, patterns) {
  return patterns.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(filename);
  });
}

// Функция для определения категории файла
function getCategory(filename) {
  for (const [category, patterns] of Object.entries(categories)) {
    if (matchesPattern(filename, patterns)) {
      return category;
    }
  }
  return 'other';
}

// Получить все файлы в корне
function getAllFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile() && !item.startsWith('.') && item !== 'analyze-files.js') {
      files.push({
        name: item,
        path: fullPath,
        size: stat.size,
        category: getCategory(item)
      });
    }
  }
  
  return files;
}

// Основная функция
function analyzeFiles() {
  console.log('📊 Анализ контекстных файлов в корне проекта\n');
  
  const files = getAllFiles(rootDir);
  
  // Группировать по категориям
  const grouped = {};
  const uncategorized = [];
  
  files.forEach(file => {
    if (file.category === 'other') {
      uncategorized.push(file);
    } else {
      if (!grouped[file.category]) {
        grouped[file.category] = [];
      }
      grouped[file.category].push(file);
    }
  });
  
  // Вывести результаты
  console.log('📁 Файлы по категориям:\n');
  
  for (const [category, fileList] of Object.entries(grouped)) {
    console.log(`\n📂 docs/${category}/ (${fileList.length} файлов)`);
    fileList.forEach(file => {
      console.log(`   - ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    });
  }
  
  if (uncategorized.length > 0) {
    console.log(`\n\n❓ Некатегоризированные файлы (${uncategorized.length}):`);
    uncategorized.forEach(file => {
      console.log(`   - ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    });
  }
  
  // Статистика
  console.log(`\n\n📈 Статистика:`);
  console.log(`   Всего файлов: ${files.length}`);
  console.log(`   Категоризировано: ${files.length - uncategorized.length}`);
  console.log(`   Некатегоризировано: ${uncategorized.length}`);
  
  // Сохранить результаты
  const results = {
    total: files.length,
    categorized: files.length - uncategorized.length,
    uncategorized: uncategorized.length,
    categories: grouped,
    uncategorizedFiles: uncategorized.map(f => f.name)
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'file-analysis-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\n✅ Результаты сохранены в docs/file-analysis-results.json`);
}

// Запуск
analyzeFiles();

