#!/usr/bin/env node
/**
 * Исправление путей к JS и CSS файлам в HTML файлах
 * Заменяет относительные пути (js/..., css/...) на абсолютные (/js/..., /css/...)
 * 
 * Использование: node scripts/fix-js-css-paths.js
 */

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

/**
 * Найти все HTML файлы
 */
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            findHtmlFiles(filePath, fileList);
        } else if (file === 'index.html' || file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

/**
 * Исправить пути в HTML файле
 */
function fixPathsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    
    // Заменяем относительные пути JS файлов на абсолютные
    const jsPattern = /src="(js\/[^"]+)"/g;
    const newContentJs = content.replace(jsPattern, (match, jsPath) => {
        if (!jsPath.startsWith('/') && !jsPath.startsWith('http')) {
            changed = true;
            return `src="/${jsPath}"`;
        }
        return match;
    });
    
    // Заменяем относительные пути CSS файлов на абсолютные
    const cssPattern = /href="(css\/[^"]+)"/g;
    const newContentCss = newContentJs.replace(cssPattern, (match, cssPath) => {
        if (!cssPath.startsWith('/') && !cssPath.startsWith('http')) {
            changed = true;
            return `href="/${cssPath}"`;
        }
        return match;
    });
    
    // Заменяем относительные пути к изображениям (только для локальных)
    const imgPattern = /src="(images\/[^"]+)"/g;
    const newContentImg = newContentCss.replace(imgPattern, (match, imgPath) => {
        if (!imgPath.startsWith('/') && !imgPath.startsWith('http')) {
            changed = true;
            return `src="/${imgPath}"`;
        }
        return match;
    });
    
    if (changed) {
        fs.writeFileSync(filePath, newContentImg, 'utf-8');
        return true;
    }
    
    return false;
}

/**
 * Основная функция
 */
function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔧 ИСПРАВЛЕНИЕ ПУТЕЙ К JS И CSS ФАЙЛАМ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (!fs.existsSync(SITE_ROOT)) {
        console.error(`❌ Директория SiteMGTS не найдена: ${SITE_ROOT}`);
        process.exit(1);
    }
    
    console.log(`📂 Поиск HTML файлов в: ${SITE_ROOT}\n`);
    
    const htmlFiles = findHtmlFiles(SITE_ROOT);
    console.log(`📄 Найдено HTML файлов: ${htmlFiles.length}\n`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (let i = 0; i < htmlFiles.length; i++) {
        const filePath = htmlFiles[i];
        const relativePath = path.relative(SITE_ROOT, filePath);
        
        process.stdout.write(`[${i + 1}/${htmlFiles.length}] ${relativePath}...`);
        
        try {
            if (fixPathsInFile(filePath)) {
                console.log(' ✅ Исправлено');
                fixed++;
            } else {
                console.log(' ⏭️  Уже правильные');
                skipped++;
            }
        } catch (error) {
            console.log(` ❌ Ошибка: ${error.message}`);
        }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`📊 Результаты:`);
    console.log(`   - Всего файлов: ${htmlFiles.length}`);
    console.log(`   - ✅ Исправлено: ${fixed}`);
    console.log(`   - ⏭️  Пропущено: ${skipped}\n`);
}

if (require.main === module) {
    main();
}

module.exports = { fixPathsInFile, findHtmlFiles };
