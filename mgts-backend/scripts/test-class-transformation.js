const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { INTERNAL_CLASSES_MAPPING } = require('./normalize-html-structure.js');

// Тестируем один файл
const filePath = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized/business_payment_methods.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const dom = new JSDOM(data.normalizedHTML);
const doc = dom.window.document;

// Находим file-item__type-img
const fileImg = doc.querySelector('.file-item__type-img');
if (fileImg) {
    console.log('file-item__type-img:');
    console.log('  Классы:', fileImg.className);
    
    // Ищем родительскую секцию
    let section = fileImg.closest('section');
    if (section) {
        console.log('  Родительская секция:', section.className);
        const sectionClass = section.className.split(' ')[0];
        
        // Проверяем маппинг
        if (INTERNAL_CLASSES_MAPPING['files-table'] && INTERNAL_CLASSES_MAPPING['files-table']['file-item__type-img']) {
            console.log('  ✅ Маппинг найден в files-table:', INTERNAL_CLASSES_MAPPING['files-table']['file-item__type-img']);
        } else {
            console.log('  ❌ Маппинг не найден в files-table');
        }
        
        if (INTERNAL_CLASSES_MAPPING[sectionClass] && INTERNAL_CLASSES_MAPPING[sectionClass]['file-item__type-img']) {
            console.log(`  ✅ Маппинг найден в ${sectionClass}:`, INTERNAL_CLASSES_MAPPING[sectionClass]['file-item__type-img']);
        } else {
            console.log(`  ❌ Маппинг не найден в ${sectionClass}`);
        }
    }
}

// Проверяем title-h1-wide
const titleH1 = doc.querySelector('.title-h1-wide');
if (titleH1) {
    console.log('\ntitle-h1-wide:');
    console.log('  Классы:', titleH1.className);
    
    let section = titleH1.closest('section');
    if (section) {
        console.log('  Родительская секция:', section.className);
        const sectionClass = section.className.split(' ')[0];
        
        if (INTERNAL_CLASSES_MAPPING[sectionClass] && INTERNAL_CLASSES_MAPPING[sectionClass]['title-h1-wide']) {
            console.log('  ✅ Маппинг найден:', INTERNAL_CLASSES_MAPPING[sectionClass]['title-h1-wide']);
        } else {
            console.log('  ❌ Маппинг не найден');
            console.log('  Доступные компоненты:', Object.keys(INTERNAL_CLASSES_MAPPING));
        }
    }
}
