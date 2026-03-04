/**
 * Скрипт для организации контекстных файлов по тематическим папкам
 * Создает структуру папок и перемещает файлы
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const tempDir = path.join(rootDir, 'temp');
const scriptsDir = path.join(rootDir, 'scripts');

// Структура папок
const folderStructure = {
  'docs/cms/content-types': [],
  'docs/cms/integration': [],
  'docs/cms/grid-types': [],
  'docs/cms/structure': [],
  'docs/fixes/structure': [],
  'docs/fixes/pages': [],
  'docs/fixes/styles': [],
  'docs/installation/setup': [],
  'docs/installation/migration': [],
  'docs/installation/troubleshooting': [],
  'docs/analysis/reports': [],
  'docs/guides/editor': [],
  'docs/guides/development': [],
  'docs/guides/usage': [],
  'docs/status/progress': [],
  'docs/status/completed': [],
  'docs/project': [],
  'docs/setup': [],
  'temp/html': [],
  'temp/txt': [],
  'temp/images': [],
  'scripts/setup': [],
  'scripts/utils': []
};

// Маппинг файлов (улучшенная версия)
const fileMapping = {
  // CMS Content Types
  'CMS_CONTENT_TYPES.md': 'docs/cms/content-types/',
  'CONTENT_TYPE_COMPLETE.md': 'docs/cms/content-types/',
  'CONTENT_TYPE_SUMMARY.md': 'docs/cms/content-types/',
  
  // CMS Integration
  'CMS_INTEGRATION_COMPLETE.md': 'docs/cms/integration/',
  'CMS_INTEGRATION_PLAN.md': 'docs/cms/integration/',
  'CMS_INTEGRATION_STATUS.md': 'docs/cms/integration/',
  'CMS_CONNECTION_FIX.md': 'docs/cms/integration/',
  'API_INTEGRATION_COMPLETE.md': 'docs/cms/integration/',
  'CMS_NEXT_STEPS.md': 'docs/cms/integration/',
  'INTEGRATION_TEST_RESULTS.md': 'docs/cms/integration/',
  'TESTING_RESULTS.md': 'docs/cms/integration/',
  
  // CMS Grid Types
  'CMS_GRID_TYPES_USAGE.md': 'docs/cms/grid-types/',
  'GRID_TYPES_ANALYSIS.md': 'docs/cms/grid-types/',
  'GRID_TYPES_CMS_IMPLEMENTATION.md': 'docs/cms/grid-types/',
  
  // CMS Structure
  'CLASS_HIERARCHY_RULES.md': 'docs/cms/structure/',
  'TOP_LEVEL_ELEMENTS_RULES.md': 'docs/cms/structure/',
  'TOP_LEVEL_ELEMENTS_SUMMARY.md': 'docs/cms/structure/',
  'DIV_NORMALIZATION_SUMMARY.md': 'docs/cms/structure/',
  
  // Fixes - Structure
  'FIX_APPLICATION_COMPLETE.md': 'docs/fixes/structure/',
  'FIX_COMPLETE_SUMMARY.md': 'docs/fixes/structure/',
  'FIX_SCRIPT_USAGE.md': 'docs/fixes/structure/',
  'FIX_SCRIPT_VERIFICATION.md': 'docs/fixes/structure/',
  'STRUCTURE_ANALYSIS_REPORT.md': 'docs/fixes/structure/',
  
  // Fixes - Pages
  'ABOUT_PAGES_FIX.md': 'docs/fixes/pages/',
  'SEGMENT_PAGES_FIX_COMPLETE.md': 'docs/fixes/pages/',
  'SEGMENT_PAGES_FIX_FINAL_REPORT.md': 'docs/fixes/pages/',
  'SEGMENT_PAGES_FIX_RECOMMENDATIONS.md': 'docs/fixes/pages/',
  'SEGMENT_PAGES_FIX_SUMMARY.md': 'docs/fixes/pages/',
  'INTEGRATION_ALL_PAGES_FIX.md': 'docs/fixes/pages/',
  'STRAPI_CONTENT_FIX_business_security.md': 'docs/fixes/pages/',
  
  // Fixes - Styles
  'SERVICE_CARD_STYLES_FIX.md': 'docs/fixes/styles/',
  
  // Installation - Setup
  'AUTONOMOUS_SETUP_COMPLETE.md': 'docs/installation/setup/',
  'INSTALLATION_STATUS.md': 'docs/installation/setup/',
  'QUICK_START_MAC.md': 'docs/installation/setup/',
  'SETUP_NODEJS.md': 'docs/installation/setup/',
  'INSTALL_NODEJS_MANUAL.md': 'docs/installation/setup/',
  'STRAPI_REINSTALL.md': 'docs/installation/setup/',
  'README_INSTALLATION.md': 'docs/installation/setup/',
  
  // Installation - Migration
  'CMS_MIGRATION_PLAN.md': 'docs/installation/migration/',
  'EXECUTE_MIGRATION.md': 'docs/installation/migration/',
  'MAC_MIGRATION_GUIDE.md': 'docs/installation/migration/',
  'MIGRATION_INSTRUCTIONS.md': 'docs/installation/migration/',
  'MIGRATION_STATUS.md': 'docs/installation/migration/',
  
  // Installation - Troubleshooting
  'CHECK_CMS_CONNECTION.md': 'docs/installation/troubleshooting/',
  'CMS_UPDATE_TROUBLESHOOTING.md': 'docs/installation/troubleshooting/',
  
  // Analysis Reports
  'about-pages-analysis.json': 'docs/analysis/reports/',
  'analysis-results.json': 'docs/analysis/reports/',
  'div-classes-analysis.json': 'docs/analysis/reports/',
  'fix-about-styles-results.json': 'docs/analysis/reports/',
  'fix-results.json': 'docs/analysis/reports/',
  'fix-segment-pages-results.json': 'docs/analysis/reports/',
  'class-hierarchy-report.json': 'docs/analysis/reports/',
  'div-analysis-report.json': 'docs/analysis/reports/',
  'page-analysis-report.json': 'docs/analysis/reports/',
  'top-level-elements-report.json': 'docs/analysis/reports/',
  'main_page_analysis.md': 'docs/analysis/reports/',
  
  // Guides - Editor
  // (будут добавлены из mgts-backend/)
  
  // Guides - Development
  'HTML_FIXING_GUIDE.md': 'docs/guides/development/',
  'HTML_FIXING_SUMMARY.md': 'docs/guides/development/',
  'HTML_TYPIZATION_PLAN.md': 'docs/guides/development/',
  'UI_UX_IMPROVEMENT_PLAN.md': 'docs/guides/development/',
  'UI_UX_PROGRESS.md': 'docs/guides/development/',
  'CLEAN_MAIN_PAGE_HTML.md': 'docs/guides/development/',
  
  // Guides - Usage
  'HOW_TO_CHECK_IMPROVEMENTS.md': 'docs/guides/usage/',
  'STRAPI_BACKUP_GUIDE.md': 'docs/guides/usage/',
  'STRAPI_UPDATE_PAGES_GUIDE.md': 'docs/guides/usage/',
  'CACHE_CLEAR_INSTRUCTIONS.md': 'docs/guides/usage/',
  
  // Status - Progress
  'CMS_IMPROVEMENT_STATUS.md': 'docs/status/progress/',
  'CURRENT_PROGRESS.md': 'docs/status/progress/',
  'FINAL_IMPORT_STATUS.md': 'docs/status/progress/',
  'FINAL_STATUS.md': 'docs/status/progress/',
  'PROGRESS.md': 'docs/status/progress/',
  'PROJECT_STATUS.md': 'docs/status/progress/',
  'SERVERS_STATUS.md': 'docs/status/progress/',
  'PROJECT_RUNNING.md': 'docs/status/progress/',
  
  // Status - Completed
  'FINAL_STATUS_UPDATE.md': 'docs/status/completed/',
  'IMPORT_COMPLETED.md': 'docs/status/completed/',
  'NEXT_ACTIONS_COMPLETED.md': 'docs/status/completed/',
  'PROJECT_COMPLETE_SUMMARY.md': 'docs/status/completed/',
  'STEP_5_2_COMPLETE.md': 'docs/status/completed/',
  'STEP_5_COMPLETE.md': 'docs/status/completed/',
  'STEP_7_COMPLETE.md': 'docs/status/completed/',
  'IMPORT_SUCCESS.md': 'docs/status/completed/',
  'COMPLETED_ACTIONS.md': 'docs/status/completed/',
  'COMPLETED_STEPS.md': 'docs/status/completed/',
  'EXECUTED_STEPS.md': 'docs/status/completed/',
  
  // Project Docs
  'site-structure-tree.md': 'docs/project/',
  'CONTEXT.md': 'docs/project/',
  
  // Setup Docs
  'CLOUDINARY_SETUP.md': 'docs/setup/',
  'LOCAL_STORAGE_SETUP.md': 'docs/setup/',
  
  // Temp - HTML
  'FIXED_business_telephony.html': 'temp/html/',
  'test-cms-connection.html': 'temp/html/',
  'service-components-content.html': 'temp/html/',
  'main_page_clean.html': 'temp/html/',
  'main_page_content.html': 'temp/html/',
  'main_page_from_site.html': 'temp/html/',
  
  // Temp - TXT
  'main_page.txt': 'temp/txt/',
  'main_page_clean.txt': 'temp/txt/',
  'main_page_fixed.txt': 'temp/txt/',
  'main_page_improved.txt': 'temp/txt/',
  'main_page_updated.txt': 'temp/txt/',
  'Консоль.txt': 'temp/txt/',
  
  // Temp - Images
  'mirror-slider-1.jpg': 'temp/images/',
  'mirror-slider-2.jpg': 'temp/images/',
  'mirror-slider-3.jpg': 'temp/images/',
  
  // Scripts - Setup
  'check_environment.ps1': 'scripts/setup/',
  'check_environment.sh': 'scripts/setup/',
  'check_strapi_setup.ps1': 'scripts/setup/',
  'copy_mts_fonts.ps1': 'scripts/setup/',
  'install_nodejs.sh': 'scripts/setup/',
  'install_strapi_manual.ps1': 'scripts/setup/',
  'move_strapi_to_runs.ps1': 'scripts/setup/',
  'setup_env.sh': 'scripts/setup/',
  'setup_step1.ps1': 'scripts/setup/',
  'start_strapi.ps1': 'scripts/setup/',
  'start_strapi.sh': 'scripts/setup/',
  'update_nav_script.ps1': 'scripts/setup/',
  
  // Scripts - Utils
  'clean-html-from-rtf.js': 'scripts/utils/',
  
  // Other
  'ACTIONS_SUMMARY.md': 'docs/status/progress/',
  'ENCODING_AND_PATHS_FIX.md': 'docs/fixes/structure/',
  'MIRROR_SLIDER_TEST.md': 'docs/guides/development/',
  'NEXT_STEPS.md': 'docs/status/progress/',
  'NEXT_STEPS_AFTER_NODEJS.md': 'docs/status/progress/',
  'NEXT_STEPS_DETAILED.md': 'docs/status/progress/'
};

// Создать структуру папок
function createFolderStructure() {
  console.log('📁 Создание структуры папок...\n');
  
  for (const folderPath of Object.keys(folderStructure)) {
    const fullPath = path.join(rootDir, folderPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`   ✅ Создана: ${folderPath}`);
    }
  }
  
  console.log('\n✅ Структура папок создана\n');
}

// Переместить файлы
function moveFiles(dryRun = true) {
  console.log(`📦 ${dryRun ? 'ПРЕДПРОСМОТР: ' : ''}Перемещение файлов...\n`);
  
  const moved = [];
  const notFound = [];
  const errors = [];
  
  for (const [filename, targetFolder] of Object.entries(fileMapping)) {
    const sourcePath = path.join(rootDir, filename);
    const targetPath = path.join(rootDir, targetFolder, filename);
    
    if (!fs.existsSync(sourcePath)) {
      notFound.push(filename);
      continue;
    }
    
    if (dryRun) {
      console.log(`   📄 ${filename} → ${targetFolder}`);
      moved.push({ filename, target: targetFolder });
    } else {
      try {
        fs.renameSync(sourcePath, targetPath);
        console.log(`   ✅ ${filename} → ${targetFolder}`);
        moved.push({ filename, target: targetFolder });
      } catch (error) {
        console.error(`   ❌ Ошибка при перемещении ${filename}: ${error.message}`);
        errors.push({ filename, error: error.message });
      }
    }
  }
  
  console.log(`\n📊 Статистика:`);
  console.log(`   Перемещено: ${moved.length}`);
  console.log(`   Не найдено: ${notFound.length}`);
  console.log(`   Ошибок: ${errors.length}`);
  
  if (notFound.length > 0) {
    console.log(`\n⚠️  Не найдены файлы:`);
    notFound.forEach(f => console.log(`   - ${f}`));
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Ошибки:`);
    errors.forEach(e => console.log(`   - ${e.filename}: ${e.error}`));
  }
  
  return { moved, notFound, errors };
}

// Создать README в каждой папке
function createReadmeFiles() {
  console.log('\n📝 Создание README файлов...\n');
  
  const readmes = {
    'docs/cms/content-types/README.md': '# Типизация контента CMS\n\nДокументация по типам контента в Strapi CMS.',
    'docs/cms/integration/README.md': '# Интеграция CMS\n\nДокументация по интеграции Strapi CMS с фронтендом.',
    'docs/cms/grid-types/README.md': '# Типы Grid\n\nДокументация по типам grid контейнеров.',
    'docs/cms/structure/README.md': '# Структура контента\n\nПравила и рекомендации по структуре контента.',
    'docs/fixes/structure/README.md': '# Исправления структуры\n\nДокументация по исправлениям структуры HTML.',
    'docs/fixes/pages/README.md': '# Исправления страниц\n\nДокументация по исправлениям отдельных страниц.',
    'docs/fixes/styles/README.md': '# Исправления стилей\n\nДокументация по исправлениям CSS стилей.',
    'docs/installation/setup/README.md': '# Установка и настройка\n\nИнструкции по установке и настройке окружения.',
    'docs/installation/migration/README.md': '# Миграция\n\nДокументация по миграции данных и контента.',
    'docs/installation/troubleshooting/README.md': '# Решение проблем\n\nРуководство по решению типичных проблем.',
    'docs/analysis/reports/README.md': '# Результаты анализа\n\nJSON файлы с результатами различных анализов.',
    'docs/guides/editor/README.md': '# Руководство редактора\n\nИнструкции для редакторов контента.',
    'docs/guides/development/README.md': '# Руководство разработчика\n\nДокументация для разработчиков.',
    'docs/guides/usage/README.md': '# Руководство пользователя\n\nИнструкции по использованию системы.',
    'docs/status/progress/README.md': '# Прогресс работы\n\nДокументация о текущем прогрессе проекта.',
    'docs/status/completed/README.md': '# Завершенные задачи\n\nДокументация о завершенных задачах и этапах.',
    'docs/project/README.md': '# Документация проекта\n\nОсновная документация проекта.',
    'docs/setup/README.md': '# Настройка сервисов\n\nДокументация по настройке внешних сервисов.',
    'temp/html/README.md': '# Временные HTML файлы\n\nВременные HTML файлы, которые можно удалить после проверки.',
    'temp/txt/README.md': '# Временные текстовые файлы\n\nВременные текстовые файлы, которые можно удалить после проверки.',
    'temp/images/README.md': '# Временные изображения\n\nВременные изображения, которые можно удалить после проверки.',
    'scripts/setup/README.md': '# Скрипты установки\n\nСкрипты для установки и настройки окружения.',
    'scripts/utils/README.md': '# Утилиты\n\nВспомогательные скрипты и утилиты.'
  };
  
  for (const [readmePath, content] of Object.entries(readmes)) {
    const fullPath = path.join(rootDir, readmePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, content);
      console.log(`   ✅ Создан: ${readmePath}`);
    }
  }
  
  console.log('\n✅ README файлы созданы\n');
}

// Главная функция
function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  
  console.log('📚 Организация контекстных файлов проекта\n');
  console.log(`Режим: ${dryRun ? 'ПРЕДПРОСМОТР (dry-run)' : 'ПРИМЕНЕНИЕ ИЗМЕНЕНИЙ'}\n`);
  
  createFolderStructure();
  createReadmeFiles();
  const result = moveFiles(dryRun);
  
  if (dryRun) {
    console.log('\n💡 Для применения изменений запустите: node docs/organize-files.js --apply');
  } else {
    console.log('\n✅ Файлы успешно организованы!');
  }
  
  // Сохранить результаты
  fs.writeFileSync(
    path.join(rootDir, 'docs', 'organization-results.json'),
    JSON.stringify(result, null, 2)
  );
}

main();

