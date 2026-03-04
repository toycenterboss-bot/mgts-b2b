const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

// Список страниц услуг, где был добавлен sticky CTA
const SERVICE_PAGES = [
    'business/internet/gpon/index.html',
    'business/internet/dedicated/index.html',
    'business/internet/office/index.html',
    'business/telephony/fixed/index.html',
    'business/telephony/ip/index.html',
    'business/telephony/vpbx/index.html',
    'business/telephony/mobile/index.html',
    'business/security/video-surveillance/index.html',
    'business/security/access-control/index.html',
    'business/security/alarm/index.html',
    'business/cloud/vps/index.html',
    'business/cloud/storage/index.html',
    'business/cloud/services/index.html',
    'business/tv/iptv/index.html',
    'business/tv/office/index.html',
];

function removeStickyCTA(filePath) {
    const fullPath = path.join(SITE_ROOT, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Файл не найден: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    
    // Проверяем, есть ли sticky-cta в файле
    if (!content.includes('sticky-cta')) {
        console.log(`✓ Sticky CTA не найден: ${filePath}`);
        return false;
    }

    // Удаляем комментарий "Sticky CTA для страницы услуги"
    content = content.replace(/<!-- Sticky CTA для страницы услуги -->\s*/g, '');
    content = content.replace(/<!-- Sticky CTA для страниц услуг -->\s*/g, '');
    
    // Удаляем весь блок sticky-cta (от открывающего div до закрывающего)
    // Используем регулярное выражение для поиска всего блока
    content = content.replace(/<div class="sticky-cta"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, '');
    
    // Альтернативный вариант: удаляем построчно, если предыдущий не сработал
    if (content.includes('sticky-cta')) {
        // Удаляем строки, содержащие sticky-cta
        const lines = content.split('\n');
        const filteredLines = [];
        let inStickyCTABlock = false;
        let divDepth = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Проверяем начало блока sticky-cta
            if (line.includes('sticky-cta') && line.includes('<div')) {
                inStickyCTABlock = true;
                divDepth = (line.match(/<div/g) || []).length - (line.match(/<\/div>/g) || []).length;
                continue; // Пропускаем эту строку
            }
            
            // Если мы внутри блока sticky-cta
            if (inStickyCTABlock) {
                // Подсчитываем глубину div
                const openDivs = (line.match(/<div/g) || []).length;
                const closeDivs = (line.match(/<\/div>/g) || []).length;
                divDepth += openDivs - closeDivs;
                
                // Если блок закрыт
                if (divDepth <= 0 && closeDivs > 0) {
                    inStickyCTABlock = false;
                    divDepth = 0;
                }
                continue; // Пропускаем все строки внутри блока
            }
            
            // Удаляем скрипт sticky-cta.js
            if (line.includes('sticky-cta.js')) {
                continue; // Пропускаем эту строку
            }
            
            filteredLines.push(line);
        }
        
        content = filteredLines.join('\n');
    }
    
    // Удаляем пустые строки (более 2 подряд)
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Удаляем пустые строки перед </body>
    content = content.replace(/\n\s*\n\s*<\/body>/g, '\n    </body>');
    
    // Проверяем, что изменения были внесены
    if (content === originalContent) {
        console.log(`⚠️  Не удалось удалить sticky CTA из: ${filePath}`);
        return false;
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Удален sticky CTA: ${filePath}`);
    return true;
}

console.log('=== Удаление Sticky CTA со страниц услуг ===\n');

let removedCount = 0;
let skippedCount = 0;

SERVICE_PAGES.forEach(page => {
    if (removeStickyCTA(page)) {
        removedCount++;
    } else {
        skippedCount++;
    }
});

console.log(`\n=== Результаты ===`);
console.log(`✅ Удалено: ${removedCount}`);
console.log(`⏭️  Пропущено: ${skippedCount}`);
console.log(`📄 Всего страниц: ${SERVICE_PAGES.length}`);

console.log('\n✅ Готово!');


