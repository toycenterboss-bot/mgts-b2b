const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { INTERNAL_CLASSES_MAPPING } = require('./normalize-html-structure.js');

// Тестируем файл с file-item__type-img
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
        console.log('  Проверка маппинга:');
        console.log('    files-table:', INTERNAL_CLASSES_MAPPING['files-table']?.['file-item__type-img'] || 'не найден');
        console.log('    ' + sectionClass + ':', INTERNAL_CLASSES_MAPPING[sectionClass]?.['file-item__type-img'] || 'не найден');
        
        // Проверяем, есть ли родитель с files-list
        let parent = fileImg.parentElement;
        let depth = 0;
        while (parent && depth < 10) {
            if (parent.classList) {
                const classes = Array.from(parent.classList);
                if (classes.some(c => c.startsWith('file-') || c === 'files-list')) {
                    console.log(`    Найден файловый контейнер на уровне ${depth}:`, parent.className);
                }
            }
            parent = parent.parentElement;
            depth++;
        }
    }
}

// Проверяем bread-crumbs-row
const breadcrumbs = doc.querySelector('.bread-crumbs-row');
if (breadcrumbs) {
    console.log('\nbread-crumbs-row:');
    console.log('  Найден:', breadcrumbs.outerHTML.substring(0, 100));
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
        
        console.log('  Проверка маппинга:');
        console.log('    ' + sectionClass + ':', INTERNAL_CLASSES_MAPPING[sectionClass]?.['title-h1-wide'] || 'не найден');
    }
}
