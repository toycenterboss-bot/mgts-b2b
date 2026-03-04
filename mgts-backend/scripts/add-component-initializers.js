/**
 * Скрипт для добавления инициализаторов компонентов во все HTML страницы
 * Добавляет подключение JS файлов для специальных компонентов
 */

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');
const JS_FILES_TO_ADD = [
    'mirror-slider.js',
    'history-timeline.js',
    'section-map.js',
    'mobile-app-section.js',
    'crm-cards.js'
];

/**
 * Найти все HTML файлы в директории
 */
function findHTMLFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
            files.push(...findHTMLFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

/**
 * Определить относительный путь к js директории из HTML файла
 */
function getJSPath(htmlFilePath) {
    const relativePath = path.relative(SITE_ROOT, htmlFilePath);
    const depth = relativePath.split(path.sep).length - 1;
    return '../'.repeat(depth) + 'js/';
}

/**
 * Добавить подключение JS файлов в HTML
 */
function addJSFiles(htmlFilePath) {
    const content = fs.readFileSync(htmlFilePath, 'utf-8');
    const jsPath = getJSPath(htmlFilePath);
    
    // Проверяем, есть ли уже cms-loader.js
    if (!content.includes('cms-loader.js')) {
        return { updated: false, reason: 'cms-loader.js not found' };
    }
    
    // Проверяем, какие файлы уже подключены
    const alreadyAdded = JS_FILES_TO_ADD.filter(file => content.includes(file));
    
    if (alreadyAdded.length === JS_FILES_TO_ADD.length) {
        return { updated: false, reason: 'All files already added' };
    }
    
    // Находим место для вставки (после cms-loader.js или перед icons-replace.js)
    let insertAfterPattern = /<script[^>]*src=["'][^"']*cms-loader\.js["'][^>]*><\/script>/i;
    let insertBeforePattern = /<script[^>]*src=["'][^"']*icons-replace\.js["'][^>]*><\/script>/i;
    let insertAfterMarker = /cms-loader\.js/i;
    
    let newContent = content;
    let addedFiles = [];
    
    // Ищем место после cms-loader.js
    const match = content.match(insertAfterPattern);
    if (match) {
        const insertIndex = match.index + match[0].length;
        const beforeInsert = content.substring(0, insertIndex);
        const afterInsert = content.substring(insertIndex);
        
        // Проверяем, нет ли уже этих файлов между cms-loader и icons-replace
        const filesToAdd = JS_FILES_TO_ADD.filter(file => !content.includes(file));
        
        if (filesToAdd.length > 0) {
            let scriptsToAdd = '\n';
            filesToAdd.forEach(file => {
                // Проверяем, есть ли уже этот файл дальше в документе
                if (!content.includes(file)) {
                    scriptsToAdd += `    <script src="${jsPath}${file}"></script>\n`;
                    addedFiles.push(file);
                }
            });
            
            // Вставляем после cms-loader.js, но перед icons-replace.js если он есть
            const iconsMatch = afterInsert.match(insertBeforePattern);
            if (iconsMatch) {
                const beforeIcons = afterInsert.substring(0, iconsMatch.index);
                const afterIcons = afterInsert.substring(iconsMatch.index);
                newContent = beforeInsert + scriptsToAdd + beforeIcons + afterIcons;
            } else {
                newContent = beforeInsert + scriptsToAdd + afterInsert;
            }
        } else {
            return { updated: false, reason: 'All files already present' };
        }
    } else {
        // Если не нашли cms-loader.js, ищем место перед icons-replace.js
        const iconsMatch = content.match(insertBeforePattern);
        if (iconsMatch) {
            const beforeIcons = content.substring(0, iconsMatch.index);
            const afterIcons = content.substring(iconsMatch.index);
            
            const filesToAdd = JS_FILES_TO_ADD.filter(file => !content.includes(file));
            if (filesToAdd.length > 0) {
                let scriptsToAdd = '\n';
                filesToAdd.forEach(file => {
                    scriptsToAdd += `    <script src="${jsPath}${file}"></script>\n`;
                    addedFiles.push(file);
                });
                newContent = beforeIcons + scriptsToAdd + afterIcons;
            } else {
                return { updated: false, reason: 'All files already present' };
            }
        } else {
            return { updated: false, reason: 'Cannot find insertion point' };
        }
    }
    
    // Записываем обновленный контент
    if (newContent !== content) {
        fs.writeFileSync(htmlFilePath, newContent, 'utf-8');
        return { updated: true, addedFiles: addedFiles };
    }
    
    return { updated: false, reason: 'No changes needed' };
}

/**
 * Главная функция
 */
function main() {
    console.log('🔧 Добавление инициализаторов компонентов в HTML файлы\n');
    console.log('='.repeat(60) + '\n');
    
    const htmlFiles = findHTMLFiles(SITE_ROOT);
    console.log(`📄 Найдено HTML файлов: ${htmlFiles.length}\n`);
    
    const results = {
        updated: [],
        skipped: [],
        failed: []
    };
    
    htmlFiles.forEach(htmlFile => {
        const relativePath = path.relative(SITE_ROOT, htmlFile);
        try {
            const result = addJSFiles(htmlFile);
            if (result.updated) {
                results.updated.push({
                    file: relativePath,
                    addedFiles: result.addedFiles
                });
                console.log(`✅ ${relativePath}: добавлено ${result.addedFiles.length} файлов`);
            } else {
                results.skipped.push({
                    file: relativePath,
                    reason: result.reason
                });
            }
        } catch (error) {
            results.failed.push({
                file: relativePath,
                error: error.message
            });
            console.error(`❌ ${relativePath}: ${error.message}`);
        }
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📊 Результаты:\n');
    console.log(`   ✅ Обновлено: ${results.updated.length}`);
    console.log(`   ⏭️  Пропущено: ${results.skipped.length}`);
    console.log(`   ❌ Ошибок: ${results.failed.length}\n`);
    
    if (results.updated.length > 0) {
        console.log('📝 Обновленные файлы:');
        results.updated.forEach(({ file, addedFiles }) => {
            console.log(`   - ${file}: ${addedFiles.join(', ')}`);
        });
        console.log('');
    }
    
    if (results.failed.length > 0) {
        console.log('❌ Ошибки:');
        results.failed.forEach(({ file, error }) => {
            console.log(`   - ${file}: ${error}`);
        });
        console.log('');
    }
    
    // Сохранить отчет
    const reportPath = path.join(__dirname, '../../temp/services-extraction/component-initializers-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📄 Отчет сохранен: ${reportPath}\n`);
}

main();
