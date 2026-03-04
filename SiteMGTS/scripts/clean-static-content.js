/**
 * Скрипт для очистки статичного контента из индексных страниц
 * Оставляет только структуру для CMS
 */

const fs = require('fs');
const path = require('path');

// Найти все index.html файлы
function findIndexFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findIndexFiles(filePath, fileList);
        } else if (file === 'index.html') {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Очистить статичный контент из файла
function cleanStaticContent(filePath) {
    console.log(`Обработка: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Найти все секции после hero
    const heroEnd = content.indexOf('</section>', content.indexOf('<section class="hero">'));
    if (heroEnd === -1) {
        console.log(`  ⚠️  Hero секция не найдена, пропускаем`);
        return false;
    }
    
    // Найти начало footer или скриптов
    const footerStart = content.indexOf('<div data-component="footer">');
    const scriptsStart = content.indexOf('<script src=');
    const endMarker = footerStart !== -1 ? footerStart : scriptsStart;
    
    if (endMarker === -1) {
        console.log(`  ⚠️  Маркер конца контента не найден, пропускаем`);
        return false;
    }
    
    // Извлечь часть до hero (header, breadcrumbs, hero)
    const beforeHero = content.substring(0, heroEnd + '</section>'.length);
    
    // Извлечь часть после контента (footer, scripts)
    const afterContent = content.substring(endMarker);
    
    // Проверить, есть ли sidebar placeholder
    const hasSidebar = content.includes('data-component="sidebar-about"');
    
    // Создать новую структуру
    let newContent = beforeHero + '\n\n';
    
    if (hasSidebar) {
        // Если есть sidebar, сохраняем структуру с sidebar
        const sidebarMatch = content.match(/<section[^>]*>[\s\S]*?<div data-component="sidebar-about">[\s\S]*?<\/div>[\s\S]*?<div>[\s\S]*?<\/div>[\s\S]*?<\/section>/);
        if (sidebarMatch) {
            // Извлекаем структуру с sidebar
            const sidebarSection = content.substring(
                content.indexOf('<section', heroEnd),
                content.indexOf('</section>', content.indexOf('data-component="sidebar-about"')) + '</section>'.length
            );
            // Заменяем контент внутри на placeholder
            const cleanedSidebarSection = sidebarSection.replace(
                /<div>[\s\S]*?<\/div>(?=\s*<\/section>)/,
                '<div>\n                        <!-- Контент из CMS будет вставлен сюда -->\n                    </div>'
            );
            newContent += cleanedSidebarSection + '\n\n';
        } else {
            // Простая структура с sidebar
            newContent += '    <!-- Боковое меню подразделов -->\n';
            newContent += '    <section class="section" style="background-color: var(--color-gray-50); padding-top: var(--spacing-lg); padding-bottom: var(--spacing-lg);">\n';
            newContent += '        <div class="container">\n';
            newContent += '            <div style="max-width: 1200px; margin: 0 auto;">\n';
            newContent += '                <div style="display: grid; grid-template-columns: 250px 1fr; gap: var(--spacing-2xl);">\n';
            newContent += '                    <!-- Боковое меню -->\n';
            newContent += '                    <div data-component="sidebar-about"></div>\n';
            newContent += '                    \n';
            newContent += '                    <!-- Основной контент -->\n';
            newContent += '                    <div>\n';
            newContent += '                        <!-- Контент из CMS будет вставлен сюда -->\n';
            newContent += '                    </div>\n';
            newContent += '                </div>\n';
            newContent += '            </div>\n';
            newContent += '        </div>\n';
            newContent += '    </section>\n\n';
        }
    } else {
        // Обычная структура без sidebar
        newContent += '    <!-- Контент будет загружен из CMS -->\n';
        newContent += '    <section class="section">\n';
        newContent += '        <div class="container">\n';
        newContent += '            <!-- Контент из CMS будет вставлен сюда -->\n';
        newContent += '        </div>\n';
        newContent += '    </section>\n\n';
    }
    
    newContent += afterContent;
    
    // Сохранить только если изменилось
    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`  ✅ Очищено`);
        return true;
    } else {
        console.log(`  ℹ️  Изменений не требуется`);
        return false;
    }
}

// Главная функция
function main() {
    const siteDir = path.join(__dirname, '..');
    const indexFiles = findIndexFiles(siteDir);
    
    console.log(`\n🔍 Найдено индексных файлов: ${indexFiles.length}\n`);
    
    let cleaned = 0;
    let skipped = 0;
    
    indexFiles.forEach(file => {
        const relativePath = path.relative(siteDir, file);
        if (cleanStaticContent(file)) {
            cleaned++;
        } else {
            skipped++;
        }
    });
    
    console.log(`\n✅ Очистка завершена!`);
    console.log(`   - ✅ Очищено файлов: ${cleaned}`);
    console.log(`   - ℹ️  Пропущено файлов: ${skipped}\n`);
}

main();




