const fs = require('fs');
const path = require('path');
const { normalizePageHTML } = require('./normalize-html-structure.js');

const DETAILED_CLASSIFICATION_FILE = path.join(__dirname, '../../temp/services-extraction/detailed-sections-classification.json');
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');

// Загружаем детальную классификацию
let detailedClassification = {};
if (fs.existsSync(DETAILED_CLASSIFICATION_FILE)) {
    detailedClassification = JSON.parse(fs.readFileSync(DETAILED_CLASSIFICATION_FILE, 'utf-8'));
    console.log('✅ Загружена детальная классификация секций\n');
} else {
    console.log('⚠️  Файл детальной классификации не найден\n');
}

// Получаем имя файла из аргументов
const fileName = process.argv[2] || 'virtual_ate.json';

console.log(`🔄 Нормализация файла: ${fileName}\n`);

// Загружаем файл
const filePath = path.join(PAGES_CONTENT_DIR, fileName);
if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл не найден: ${filePath}`);
    process.exit(1);
}

const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const slug = pageData.slug || fileName.replace('.json', '');

console.log(`📄 Файл: ${slug}`);
console.log(`   URL: ${pageData.url || 'не указан'}`);

// Нормализуем HTML
const normalizedHTML = normalizePageHTML(pageData, detailedClassification);

if (!normalizedHTML) {
    console.error('❌ Нет контента для нормализации');
    process.exit(1);
}

// Сохраняем нормализованный контент
const normalizedData = {
    ...pageData,
    normalizedHTML: normalizedHTML,
    normalizedAt: new Date().toISOString()
};

const outputPath = path.join(OUTPUT_DIR, fileName);
fs.writeFileSync(outputPath, JSON.stringify(normalizedData, null, 2), 'utf-8');

console.log(`\n✅ Файл нормализован и сохранен: ${outputPath}`);
console.log(`   Дата нормализации: ${normalizedData.normalizedAt}`);
console.log(`   Длина normalizedHTML: ${normalizedHTML.length}`);
