/**
 * Анализ мест, где могут создаваться дубликаты в cms-loader.js
 */

const fs = require('fs');
const path = require('path');

const CMS_LOADER_PATH = path.join(__dirname, '../../SiteMGTS/js/cms-loader.js');

const content = fs.readFileSync(CMS_LOADER_PATH, 'utf8');
const lines = content.split('\n');

console.log('=== АНАЛИЗ МЕСТ СОЗДАНИЯ ДУБЛИКАТОВ В cms-loader.js ===\n');

// 1. Поиск всех мест, где секции вставляются в DOM
console.log('1. МЕСТА ВСТАВКИ СЕКЦИЙ В DOM:');
console.log('='.repeat(60));

const insertPatterns = [
    { pattern: /appendChild\([^)]*section/gi, name: 'appendChild (секции)' },
    { pattern: /insertBefore\([^)]*section/gi, name: 'insertBefore (секции)' },
    { pattern: /\.after\([^)]*section/gi, name: 'after (секции)' },
    { pattern: /\.before\([^)]*section/gi, name: 'before (секции)' },
    { pattern: /innerHTML\s*=\s*[^;]*section/gi, name: 'innerHTML = (секции)' },
];

insertPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`\n${name}: ${matches.length} вхождений`);
        matches.slice(0, 5).forEach((match, i) => {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            console.log(`  ${i + 1}. Строка ${lineNum}: ${match.substring(0, 80)}`);
        });
    }
});

// 2. Поиск мест, где обрабатываются секции
console.log('\n\n2. МЕСТА ОБРАБОТКИ СЕКЦИЙ:');
console.log('='.repeat(60));

const processPatterns = [
    { pattern: /specialSections\.forEach|regularSections\.forEach|sections\.forEach/gi, name: 'forEach по секциям' },
    { pattern: /processWithManager|Falling back to legacy/gi, name: 'Обработка (модульная/legacy)' },
];

processPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`\n${name}: ${matches.length} вхождений`);
        matches.forEach((match, i) => {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            const context = lines[lineNum - 1]?.trim() || '';
            console.log(`  ${i + 1}. Строка ${lineNum}: ${context.substring(0, 100)}`);
        });
    }
});

// 3. Поиск мест, где секции клонируются
console.log('\n\n3. МЕСТА КЛОНИРОВАНИЯ СЕКЦИЙ:');
console.log('='.repeat(60));

const cloneMatches = content.match(/cloneNode\(true\)/gi);
if (cloneMatches) {
    console.log(`\ncloneNode(true): ${cloneMatches.length} вхождений`);
    cloneMatches.forEach((match, i) => {
        const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
        const context = lines[lineNum - 1]?.trim() || '';
        console.log(`  ${i + 1}. Строка ${lineNum}: ${context.substring(0, 100)}`);
    });
}

// 4. Поиск мест, где может быть двойная обработка
console.log('\n\n4. ПОТЕНЦИАЛЬНЫЕ МЕСТА ДВОЙНОЙ ОБРАБОТКИ:');
console.log('='.repeat(60));

// Проверить, вызывается ли processWithManager и затем legacy логика
const processWithManagerLine = content.indexOf('processWithManager(tempDiv');
const fallingBackLine = content.indexOf('Falling back to legacy processing logic');

if (processWithManagerLine !== -1 && fallingBackLine !== -1) {
    const processLineNum = content.substring(0, processWithManagerLine).split('\n').length;
    const fallbackLineNum = content.substring(0, fallingBackLine).split('\n').length;
    
    console.log(`\n⚠️  Потенциальная проблема:`);
    console.log(`  - processWithManager вызывается на строке ${processLineNum}`);
    console.log(`  - Legacy логика начинается на строке ${fallbackLineNum}`);
    console.log(`  - Разница: ${fallbackLineNum - processLineNum} строк`);
    
    // Проверить, есть ли return после processWithManager
    const returnAfterProcess = content.substring(processWithManagerLine, fallingBackLine).includes('return');
    if (!returnAfterProcess) {
        console.log(`  ❌ КРИТИЧНО: Нет return после processWithManager! Может быть двойная обработка!`);
    } else {
        console.log(`  ✅ Есть return после processWithManager`);
    }
}

// 5. Поиск мест, где секции могут дублироваться при сопоставлении
console.log('\n\n5. МЕСТА СОПОСТАВЛЕНИЯ СЕКЦИЙ:');
console.log('='.repeat(60));

const matchPatterns = [
    { pattern: /existingSectionsMap\.get/gi, name: 'Сопоставление с существующими секциями' },
    { pattern: /existingSection\s*=/gi, name: 'Получение существующей секции' },
];

matchPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`\n${name}: ${matches.length} вхождений`);
        matches.slice(0, 5).forEach((match, i) => {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            const context = lines[lineNum - 1]?.trim() || '';
            console.log(`  ${i + 1}. Строка ${lineNum}: ${context.substring(0, 100)}`);
        });
    }
});

console.log('\n\n=== ИТОГИ ===\n');
console.log('Проверьте следующие потенциальные проблемы:');
console.log('1. Двойная обработка (модульная система + legacy)');
console.log('2. Клонирование секций без удаления оригиналов');
console.log('3. Вставка секций без проверки на существование');
console.log('4. Сопоставление секций, которое может создавать дубликаты');


