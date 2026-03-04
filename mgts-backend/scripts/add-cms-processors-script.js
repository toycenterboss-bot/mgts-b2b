/**
 * Скрипт для добавления cms-processors.js во все HTML файлы
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '../../SiteMGTS');

/**
 * Найти все HTML файлы
 */
function findHTMLFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...findHTMLFiles(fullPath));
        } else if (item.endsWith('.html') && !item.includes('_old') && !item.includes('template')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

/**
 * Добавить cms-processors.js перед cms-loader.js
 */
function addProcessorsScript(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Проверить, не добавлен ли уже скрипт
    if (content.includes('cms-processors.js')) {
        return { added: false, reason: 'already exists' };
    }
    
    // Найти строку с cms-loader.js
    const cmsLoaderRegex = /(<script[^>]*src=["'][^"']*cms-loader\.js["'][^>]*>)/i;
    const match = content.match(cmsLoaderRegex);
    
    if (!match) {
        return { added: false, reason: 'cms-loader.js not found' };
    }
    
    // Определить относительный путь к js директории
    const relativePath = path.relative(path.dirname(filePath), path.join(SITE_DIR, 'js'));
    const scriptPath = path.join(relativePath, 'cms-processors.js').replace(/\\/g, '/');
    
    // Добавить скрипт перед cms-loader.js
    const processorsScript = `    <script src="${scriptPath}"></script>\n`;
    const newContent = content.replace(cmsLoaderRegex, processorsScript + '    $1');
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return { added: true, scriptPath };
}

/**
 * Основная функция
 */
function main() {
    console.log('\n=== ДОБАВЛЕНИЕ cms-processors.js В HTML ФАЙЛЫ ===\n');
    
    const htmlFiles = findHTMLFiles(SITE_DIR);
    console.log(`Найдено HTML файлов: ${htmlFiles.length}\n`);
    
    const results = {
        total: htmlFiles.length,
        added: [],
        skipped: [],
        errors: []
    };
    
    for (const filePath of htmlFiles) {
        const relativePath = path.relative(SITE_DIR, filePath);
        
        try {
            const result = addProcessorsScript(filePath);
            
            if (result.added) {
                console.log(`✅ ${relativePath}`);
                results.added.push({ file: relativePath, scriptPath: result.scriptPath });
            } else {
                console.log(`⏭️  ${relativePath} (${result.reason})`);
                results.skipped.push({ file: relativePath, reason: result.reason });
            }
        } catch (error) {
            console.error(`❌ ${relativePath}: ${error.message}`);
            results.errors.push({ file: relativePath, error: error.message });
        }
    }
    
    console.log('\n=== ИТОГИ ===\n');
    console.log(`Всего файлов: ${results.total}`);
    console.log(`✅ Добавлено: ${results.added.length}`);
    console.log(`⏭️  Пропущено: ${results.skipped.length}`);
    console.log(`❌ Ошибок: ${results.errors.length}\n`);
    
    if (results.added.length > 0) {
        console.log('✅ ФАЙЛЫ С ДОБАВЛЕННЫМ СКРИПТОМ:');
        results.added.forEach(item => {
            console.log(`   - ${item.file}`);
        });
        console.log('');
    }
    
    return results;
}

main();


