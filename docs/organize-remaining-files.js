const fs = require('fs');
const path = require('path');

// Дополнительная классификация для неклассифицированных файлов
const additionalCategories = {
  'SiteMGTS/CROSS_PLATFORM_FINAL_REPORT.md': 'docs/guides/development/',
  'SiteMGTS/DEBUG_404.md': 'docs/installation/troubleshooting/',
  'SiteMGTS/HOLIDAY_TEST.md': 'docs/status/completed/',
  'SiteMGTS/АНАЛИЗ_МЕНЮ.md': 'docs/fixes/structure/',
  'SiteMGTS/ИНСТРУКЦИЯ_ИЗВЛЕЧЕНИЕ_ПОЛНОГО_КОНТЕНТА.md': 'docs/guides/usage/',
  'SiteMGTS/ИНСТРУКЦИЯ_ПОЛУЧЕНИЕ_КОНТЕНТА.md': 'docs/guides/usage/',
  'SiteMGTS/КОПИРОВАНИЕ_ШРИФТОВ_МТС.md': 'docs/guides/usage/',
  'SiteMGTS/МОДЕРНИЗАЦИЯ_ЗАВЕРШЕНА.md': 'docs/status/completed/',
  'SiteMGTS/МОДЕРНИЗАЦИЯ_РЕЗЮМЕ.md': 'docs/status/completed/',
  'SiteMGTS/МОДЕРНИЗАЦИЯ_ТЗ.md': 'docs/guides/development/',
  'SiteMGTS/ОБЪЕДИНЕНИЕ_СЕГМЕНТОВ_ЗАВЕРШЕНО.md': 'docs/status/completed/',
  'SiteMGTS/ПРОВЕРКА_МЕНЮ_ЗАВЕРШЕНА.md': 'docs/status/completed/',
  'SiteMGTS/УНИФИКАЦИЯ_МЕНЮ_ЗАВЕРШЕНА.md': 'docs/status/completed/',
  'SiteMGTS/УНИФИКАЦИЯ_МЕНЮ_ПЛАН.md': 'docs/fixes/structure/',
  'SiteMGTS/ШРИФТЫ_МГТС_ОБНОВЛЕНЫ.md': 'docs/status/completed/',
  'SiteMGTS/ШРИФТЫ_МТС_НАСТРОЕНЫ.md': 'docs/status/completed/',
  'mgts-backend/CONTENT_TYPE_BASIC.md': 'docs/cms/content-types/',
  'mgts-backend/CONTENT_TYPE_CREATED.md': 'docs/cms/content-types/',
};

// Файлы, которые нужно оставить на месте
const keepInPlace = [
  'SiteMGTS/README.md',
  'mgts-backend/README.md',
  'mgts-backend/package.json',
  'mgts-backend/package-lock.json',
  'mgts-backend/tsconfig.json',
  'mgts-backend/strapi.pid', // PID файл Strapi
];

// Загрузить результаты анализа
const analysisPath = path.join(__dirname, 'remaining-files-analysis.json');
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

const rootDir = path.join(__dirname, '..');
const movedFiles = [];
const skippedFiles = [];
const errors = [];

// Функция для создания директории, если её нет
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для перемещения файла
function moveFile(source, target) {
  const sourcePath = path.join(rootDir, source);
  const targetPath = path.join(rootDir, target);
  
  // Проверить, существует ли исходный файл
  if (!fs.existsSync(sourcePath)) {
    errors.push(`Файл не найден: ${source}`);
    return false;
  }
  
  // Проверить, не нужно ли оставить файл на месте
  if (keepInPlace.includes(source)) {
    skippedFiles.push({ file: source, reason: 'Оставлен на месте (конфигурационный файл)' });
    return false;
  }
  
  // Создать целевую директорию
  ensureDir(path.dirname(targetPath));
  
  // Проверить, существует ли уже файл в целевом месте
  if (fs.existsSync(targetPath)) {
    // Если файл уже существует, добавить префикс
    const ext = path.extname(targetPath);
    const name = path.basename(targetPath, ext);
    const dir = path.dirname(targetPath);
    let counter = 1;
    let newTargetPath;
    do {
      newTargetPath = path.join(dir, `${name}_${counter}${ext}`);
      counter++;
    } while (fs.existsSync(newTargetPath));
    targetPath = newTargetPath;
    target = path.relative(rootDir, newTargetPath);
  }
  
  try {
    fs.renameSync(sourcePath, targetPath);
    movedFiles.push({ from: source, to: target });
    return true;
  } catch (err) {
    errors.push(`Ошибка при перемещении ${source}: ${err.message}`);
    return false;
  }
}

console.log('=== ОРГАНИЗАЦИЯ ОСТАВШИХСЯ ФАЙЛОВ ===\n');

// Переместить классифицированные файлы
console.log('Перемещение классифицированных файлов...');
for (const file of analysis.categorized) {
  const source = file.file;
  const target = path.join(file.category, path.basename(source));
  moveFile(source, target);
}

// Переместить дополнительные файлы
console.log('Перемещение дополнительно классифицированных файлов...');
for (const [source, category] of Object.entries(additionalCategories)) {
  const target = path.join(category, path.basename(source));
  moveFile(source, target);
}

// Статистика
console.log('\n=== РЕЗУЛЬТАТЫ ===\n');
console.log(`Перемещено файлов: ${movedFiles.length}`);
console.log(`Пропущено файлов: ${skippedFiles.length}`);
console.log(`Ошибок: ${errors.length}\n`);

if (movedFiles.length > 0) {
  console.log('Перемещенные файлы:');
  for (const item of movedFiles) {
    console.log(`  ${item.from} -> ${item.to}`);
  }
}

if (skippedFiles.length > 0) {
  console.log('\nПропущенные файлы:');
  for (const item of skippedFiles) {
    console.log(`  ${item.file} - ${item.reason}`);
  }
}

if (errors.length > 0) {
  console.log('\nОшибки:');
  for (const error of errors) {
    console.log(`  ❌ ${error}`);
  }
}

// Сохранить результаты
const resultsPath = path.join(__dirname, 'remaining-files-organization-results.json');
fs.writeFileSync(resultsPath, JSON.stringify({
  moved: movedFiles,
  skipped: skippedFiles,
  errors: errors,
  summary: {
    moved: movedFiles.length,
    skipped: skippedFiles.length,
    errors: errors.length
  }
}, null, 2));

console.log(`\n\nРезультаты сохранены в: ${resultsPath}`);
