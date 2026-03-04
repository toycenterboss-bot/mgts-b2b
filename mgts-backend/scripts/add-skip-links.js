/**
 * Скрипт для добавления skip links на все HTML страницы
 * Skip links улучшают доступность для пользователей клавиатуры
 */

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html') && !file.includes('template') && !file.includes('test')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

function addSkipLinks(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Проверяем, есть ли уже skip links
        if (content.includes('skip-link')) {
            console.log(`⏭️  Skip links уже есть: ${path.relative(SITE_ROOT, filePath)}`);
            return false;
        }
        
        // Находим тег <body>
        const bodyMatch = content.match(/<body[^>]*>/);
        if (!bodyMatch) {
            console.log(`⚠️  Не найден тег <body> в: ${path.relative(SITE_ROOT, filePath)}`);
            return false;
        }
        
        const bodyTag = bodyMatch[0];
        const bodyIndex = content.indexOf(bodyTag);
        
        // Проверяем, есть ли main-content или section для skip link
        const hasMainContent = content.includes('id="main-content"') || content.includes('main-content');
        const hasSection = content.includes('<section') || content.includes('class="section"');
        
        // Добавляем skip links после <body>
        const skipLinks = `
    <!-- Skip Links для доступности -->
    <a href="#main-content" class="skip-link">Перейти к основному контенту</a>
    <a href="#mainNav" class="skip-link">Перейти к навигации</a>
    `;
        
        // Вставляем skip links после открывающего тега body
        const insertIndex = bodyIndex + bodyTag.length;
        content = content.slice(0, insertIndex) + skipLinks + content.slice(insertIndex);
        
        // Если нет id="main-content", добавляем его к первому section или main
        if (!hasMainContent) {
            // Ищем первый <section> или <main>
            const sectionMatch = content.match(/<(section|main)[^>]*>/);
            if (sectionMatch) {
                const sectionTag = sectionMatch[0];
                if (!sectionTag.includes('id=')) {
                    const newSectionTag = sectionTag.replace(/(<section|main)/, `$1 id="main-content"`);
                    content = content.replace(sectionTag, newSectionTag);
                }
            } else {
                // Если нет section, добавляем id к первому div с классом section
                const divSectionMatch = content.match(/<div[^>]*class="[^"]*section[^"]*"[^>]*>/);
                if (divSectionMatch) {
                    const divTag = divSectionMatch[0];
                    if (!divTag.includes('id=')) {
                        const newDivTag = divTag.replace(/(<div[^>]*class="[^"]*section[^"]*")/, '$1 id="main-content"');
                        content = content.replace(divTag, newDivTag);
                    }
                }
            }
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Добавлены skip links: ${path.relative(SITE_ROOT, filePath)}`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
        return false;
    }
}

function main() {
    console.log('\n🔍 Поиск HTML файлов и добавление skip links...\n');
    
    const htmlFiles = findHtmlFiles(SITE_ROOT);
    console.log(`Найдено HTML страниц: ${htmlFiles.length}\n`);
    
    let fixed = 0;
    
    htmlFiles.forEach(filePath => {
        if (addSkipLinks(filePath)) {
            fixed++;
        }
    });
    
    console.log(`\n📊 Результаты:`);
    console.log(`   - ✅ Обработано: ${fixed}`);
    console.log(`   - 📄 Всего: ${htmlFiles.length}\n`);
}

main();



