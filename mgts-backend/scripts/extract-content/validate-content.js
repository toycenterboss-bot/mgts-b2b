const fs = require('fs');
const path = require('path');

function validateContent(content) {
  const errors = [];
  const warnings = [];
  
  // Проверка обязательных полей
  if (!content.slug) {
    errors.push('Отсутствует slug');
  }
  
  if (!content.title) {
    errors.push('Отсутствует title');
  }
  
  // Проверка формата slug
  if (content.slug && !/^[a-z0-9\/\-]+$/.test(content.slug)) {
    errors.push(`Некорректный формат slug: ${content.slug}`);
  }
  
  // Предупреждения
  if (!content.metaDescription) {
    warnings.push('Отсутствует meta description');
  }
  
  if (!content.content || content.content.length === 0) {
    warnings.push('Нет контента (секций)');
  }
  
  return { errors, warnings };
}

// Проверка наличия parsed-content.json
const parsedContentPath = path.join(__dirname, 'parsed-content.json');
if (!fs.existsSync(parsedContentPath)) {
  console.error('\n❌ Ошибка: Файл parsed-content.json не найден!');
  console.error('Сначала запустите скрипт извлечения:');
  console.error('  node html-parser.js\n');
  process.exit(1);
}

console.log('\n🔍 Валидация извлеченного контента...\n');

// Загрузить извлеченный контент
const parsedContent = JSON.parse(fs.readFileSync(parsedContentPath, 'utf-8'));

console.log(`Проверка ${parsedContent.length} страниц...\n`);

// Валидировать каждую страницу
const validationResults = parsedContent.map((content, index) => {
  const result = validateContent(content);
  return {
    index: index + 1,
    slug: content.slug,
    ...result
  };
});

// Подсчет статистики
let totalErrors = 0;
let totalWarnings = 0;
const pagesWithErrors = [];
const pagesWithWarnings = [];

validationResults.forEach(result => {
  if (result.errors.length > 0) {
    totalErrors += result.errors.length;
    pagesWithErrors.push(result);
  }
  if (result.warnings.length > 0) {
    totalWarnings += result.warnings.length;
    pagesWithWarnings.push(result);
  }
});

// Вывести результаты
if (pagesWithErrors.length > 0) {
  console.log('❌ Страницы с ошибками:');
  pagesWithErrors.forEach(result => {
    console.error(`   ${result.slug}:`, result.errors.join(', '));
  });
  console.log('');
}

if (pagesWithWarnings.length > 0) {
  console.log('⚠️  Страницы с предупреждениями:');
  pagesWithWarnings.slice(0, 10).forEach(result => {
    console.warn(`   ${result.slug}:`, result.warnings.join(', '));
  });
  if (pagesWithWarnings.length > 10) {
    console.warn(`   ... и еще ${pagesWithWarnings.length - 10} страниц с предупреждениями`);
  }
  console.log('');
}

// Сохранить результаты валидации
const validationOutputPath = path.join(__dirname, 'validation-results.json');
fs.writeFileSync(
  validationOutputPath,
  JSON.stringify(validationResults, null, 2)
);

// Статистика
console.log('📊 Статистика валидации:');
console.log(`   - Всего страниц: ${parsedContent.length}`);
console.log(`   - Страниц с ошибками: ${pagesWithErrors.length}`);
console.log(`   - Страниц с предупреждениями: ${pagesWithWarnings.length}`);
console.log(`   - Всего ошибок: ${totalErrors}`);
console.log(`   - Всего предупреждений: ${totalWarnings}`);
console.log(`\n💾 Результаты сохранены в: ${validationOutputPath}`);

if (pagesWithErrors.length === 0) {
  console.log('\n✅ Валидация пройдена успешно! Все страницы готовы к импорту.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Обнаружены ошибки. Исправьте их перед импортом.\n');
  process.exit(1);
}





