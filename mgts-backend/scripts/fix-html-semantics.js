/**
 * Скрипт для улучшения семантической разметки HTML на всех страницах
 * - Обертывает header и footer в семантические теги
 * - Добавляет aria-label для breadcrumbs
 * - Исправляет форматирование
 */

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

// Функция для получения всех HTML файлов
function getAllHTMLFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            getAllHTMLFiles(filePath, fileList);
        } else if (file === 'index.html' && !filePath.includes('_old')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Функция для исправления HTML
function fixHTMLSemantics(filePath) {
    console.log(`Обработка: ${path.relative(SITE_ROOT, filePath)}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. Обернуть header в семантический тег (если еще не обернут)
    // Ищем <div data-component="header"></div> который не внутри <header>
    if (content.includes('<div data-component="header"></div>') && 
        !content.match(/<header[^>]*>\s*<div data-component="header"><\/div>\s*<\/header>/)) {
        content = content.replace(
            /(\s*)<div data-component="header"><\/div>/g,
            '$1<header>\n$1    <div data-component="header"></div>\n$1</header>'
        );
        modified = true;
        console.log('  ✓ Обернут header в семантический тег');
    }
    
    // 2. Обернуть footer в семантический тег (если еще не обернут)
    if (content.includes('<div data-component="footer"></div>') && 
        !content.match(/<footer[^>]*>\s*<div data-component="footer"><\/div>\s*<\/footer>/)) {
        content = content.replace(
            /(\s*)<div data-component="footer"><\/div>/g,
            '$1<footer>\n$1    <div data-component="footer"></div>\n$1</footer>'
        );
        modified = true;
        console.log('  ✓ Обернут footer в семантический тег');
    }
    
    // 3. Добавить aria-label для breadcrumbs (если еще нет)
    if (content.includes('<nav class="breadcrumbs"') && 
        !content.includes('<nav class="breadcrumbs" aria-label')) {
        content = content.replace(
            /<nav class="breadcrumbs"([^>]*)>/g,
            '<nav class="breadcrumbs"$1 aria-label="Хлебные крошки">'
        );
        modified = true;
        console.log('  ✓ Добавлен aria-label для breadcrumbs');
    }
    
    // 4. Исправить форматирование перед </body> (убрать лишние отступы)
    if (content.match(/\s{4,}\s*<\/body>/)) {
        content = content.replace(/\s{4,}\s*<\/body>/g, '</body>');
        modified = true;
        console.log('  ✓ Исправлено форматирование перед </body>');
    }
    
    // 5. Убрать пустые строки после </html>
    if (content.match(/<\/html>\s{2,}/)) {
        content = content.replace(/<\/html>\s{2,}/g, '</html>\n');
        modified = true;
        console.log('  ✓ Убраны пустые строки после </html>');
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('  ✅ Файл обновлен\n');
        return true;
    } else {
        console.log('  ⏭️  Изменений не требуется\n');
        return false;
    }
}

// Главная функция
function main() {
    console.log('=== Улучшение семантической разметки HTML ===\n');
    
    const htmlFiles = getAllHTMLFiles(SITE_ROOT);
    console.log(`Найдено HTML файлов: ${htmlFiles.length}\n`);
    
    let fixedCount = 0;
    
    htmlFiles.forEach(filePath => {
        if (fixHTMLSemantics(filePath)) {
            fixedCount++;
        }
    });
    
    console.log(`\n=== Результат ===`);
    console.log(`Всего файлов: ${htmlFiles.length}`);
    console.log(`Исправлено: ${fixedCount}`);
    console.log(`Без изменений: ${htmlFiles.length - fixedCount}`);
}

main();


