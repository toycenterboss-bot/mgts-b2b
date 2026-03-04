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
    
    // Проверяем, есть ли sticky-cta после </body>
    const afterBodyMatch = content.match(/<\/body>\s*<\/html>\s*(<!-- Sticky CTA|<!-- Sticky CTA|<div class="sticky-cta")/s);
    
    if (!afterBodyMatch) {
        // Проверяем, правильно ли расположен sticky-cta (перед </body>)
        const beforeBodyMatch = content.match(/<!-- Sticky CTA.*?<\/body>/s);
        if (beforeBodyMatch && !content.includes('sticky-cta.js')) {
            // Sticky CTA есть, но нет скрипта - добавляем скрипт
            const depth = filePath.split('/').length - 2;
            const scriptPath = '../'.repeat(depth) + 'js/sticky-cta.js';
            content = content.replace('</body>', `    <script src="${scriptPath}"></script>\n    </body>`);
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`✅ Исправлен sticky CTA: ${filePath}`);
            return true;
        }
        console.log(`✓ Sticky CTA уже правильно расположен: ${filePath}`);
        return false;
    }

    // Находим sticky-cta после </body> и перемещаем его перед </body>
    const stickyCTAMatch = content.match(/(<!-- Sticky CTA.*?<\/div>\s*<\/div>\s*<\/div>\s*<script src="[^"]+sticky-cta\.js"><\/script>)/s);
    
    if (stickyCTAMatch) {
        const stickyCTAContent = stickyCTAMatch[1].trim();
        
        // Удаляем sticky-cta после </body>
        content = content.replace(/<\/body>\s*<\/html>\s*<!-- Sticky CTA.*?<\/script>\s*/s, '');
        
        // Вставляем sticky-cta перед </body>
        content = content.replace('</body>', `    ${stickyCTAContent}\n    </body>`);
        
        // Удаляем дублирующиеся комментарии
        content = content.replace(/<!-- Sticky CTA для страницы услуги -->\s*<!-- Sticky CTA для страниц услуг -->/g, '<!-- Sticky CTA для страницы услуги -->');
        
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`✅ Исправлен sticky CTA: ${filePath}`);
        return true;
    }

    console.log(`⚠️  Не удалось найти sticky-cta для перемещения: ${filePath}`);
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


