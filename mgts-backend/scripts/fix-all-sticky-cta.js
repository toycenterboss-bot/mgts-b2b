const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

// Список страниц услуг
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

function fixStickyCTAPosition(filePath) {
    const fullPath = path.join(SITE_ROOT, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Файл не найден: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    
    // Проверяем, есть ли sticky-cta после </body>
    if (content.includes('</body>') && content.includes('sticky-cta')) {
        // Находим все после </body> до </html>
        const bodyEndIndex = content.lastIndexOf('</body>');
        const htmlEndIndex = content.lastIndexOf('</html>');
        
        if (bodyEndIndex < htmlEndIndex) {
            // Извлекаем sticky-cta блок (все между </body> и </html>)
            const afterBody = content.substring(bodyEndIndex + 7, htmlEndIndex).trim();
            
            // Проверяем, содержит ли это sticky-cta
            if (afterBody.includes('sticky-cta')) {
                // Удаляем sticky-cta после </body>
                content = content.substring(0, bodyEndIndex).trim();
                
                // Определяем относительный путь к скрипту
                const depth = filePath.split('/').length - 2;
                const scriptPath = '../'.repeat(depth) + 'js/sticky-cta.js';
                
                // Извлекаем только HTML sticky-cta (без скрипта, если он есть отдельно)
                let stickyCTAHTML = afterBody;
                
                // Удаляем отдельный скрипт, если он есть
                stickyCTAHTML = stickyCTAHTML.replace(/<script src="[^"]*sticky-cta\.js"><\/script>\s*/g, '');
                
                // Удаляем дублирующиеся комментарии
                stickyCTAHTML = stickyCTAHTML.replace(/<!-- Sticky CTA для страницы услуги -->\s*<!-- Sticky CTA для страниц услуг -->/g, '<!-- Sticky CTA для страницы услуги -->');
                stickyCTAHTML = stickyCTAHTML.replace(/<!-- Sticky CTA для страниц услуг -->/g, '');
                
                // Удаляем лишние пустые строки
                stickyCTAHTML = stickyCTAHTML.replace(/\n{3,}/g, '\n\n');
                
                // Форматируем отступы (4 пробела)
                const lines = stickyCTAHTML.split('\n');
                const formattedLines = lines.map((line, index) => {
                    if (line.trim() === '') return '';
                    // Убираем существующие отступы и добавляем правильные
                    const trimmed = line.trim();
                    if (trimmed.startsWith('<!--')) {
                        return '    ' + trimmed;
                    }
                    if (trimmed.startsWith('</div>') || trimmed.startsWith('</script>')) {
                        return '    ' + trimmed;
                    }
                    if (trimmed.startsWith('<div') || trimmed.startsWith('<script')) {
                        return '    ' + trimmed;
                    }
                    if (trimmed.startsWith('<a') || trimmed.startsWith('<button') || trimmed.startsWith('<svg') || trimmed.startsWith('<path')) {
                        return '        ' + trimmed;
                    }
                    if (trimmed.startsWith('<span')) {
                        return '                    ' + trimmed;
                    }
                    return '    ' + trimmed;
                });
                
                stickyCTAHTML = formattedLines.join('\n').trim();
                
                // Вставляем sticky-cta перед </body> и добавляем скрипт
                const insertContent = `\n    <!-- Sticky CTA для страницы услуги -->\n${stickyCTAHTML}\n    <script src="${scriptPath}"></script>\n`;
                
                content = content + insertContent + '    </body>\n</html>';
                
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`✅ Исправлен sticky CTA: ${filePath}`);
                return true;
            }
        }
    }
    
    // Проверяем, правильно ли расположен sticky-cta (перед </body>)
    const bodyIndex = content.indexOf('</body>');
    const stickyCTABeforeBody = content.substring(0, bodyIndex);
    
    if (stickyCTABeforeBody.includes('sticky-cta') && !content.substring(bodyIndex).includes('sticky-cta')) {
        console.log(`✓ Sticky CTA уже правильно расположен: ${filePath}`);
        return false;
    }
    
    console.log(`⚠️  Не удалось обработать: ${filePath}`);
    return false;
}

console.log('=== Исправление позиции Sticky CTA ===\n');

let fixedCount = 0;
let skippedCount = 0;

SERVICE_PAGES.forEach(page => {
    if (fixStickyCTAPosition(page)) {
        fixedCount++;
    } else {
        skippedCount++;
    }
});

console.log(`\n=== Результаты ===`);
console.log(`✅ Исправлено: ${fixedCount}`);
console.log(`⏭️  Пропущено: ${skippedCount}`);
console.log(`📄 Всего страниц: ${SERVICE_PAGES.length}`);

console.log('\n✅ Готово!');


