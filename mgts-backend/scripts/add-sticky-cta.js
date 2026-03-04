const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

// Список страниц услуг (21 страница)
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

// Путь к компоненту sticky-cta
const STICKY_CTA_PATH = path.join(SITE_ROOT, 'components/sticky-cta.html');
const STICKY_CTA_SCRIPT = '<script src="../../js/sticky-cta.js"></script>';

// Читаем компонент sticky-cta
const stickyCTAContent = fs.readFileSync(STICKY_CTA_PATH, 'utf-8');

function addStickyCTA(filePath) {
    const fullPath = path.join(SITE_ROOT, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Файл не найден: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Проверяем, не добавлен ли уже sticky CTA
    if (content.includes('sticky-cta') || content.includes('sticky-cta.js')) {
        console.log(`✓ Sticky CTA уже добавлен: ${filePath}`);
        return false;
    }

    // Определяем относительный путь к скриптам
    const depth = filePath.split('/').length - 2; // -2 для business/xxx/index.html
    const scriptPath = '../'.repeat(depth) + 'js/sticky-cta.js';

    // Находим позицию перед закрывающим тегом </body>
    // Ищем последний </body> перед </html>
    const bodyCloseRegex = /(\s*)<\/body>/;
    const match = content.match(bodyCloseRegex);
    
    if (!match) {
        console.log(`⚠️  Не найден закрывающий тег </body> в ${filePath}`);
        return false;
    }

    // Вставляем компонент и скрипт перед </body>
    // Используем inline HTML вместо загрузки компонента
    const indent = match[1] || '    '; // Сохраняем отступ
    const insertContent = `\n${indent}<!-- Sticky CTA для страницы услуги -->\n${stickyCTAContent.split('\n').map(line => indent + line).join('\n')}\n${indent}<script src="${scriptPath}"></script>\n${indent}`;
    
    content = content.replace(bodyCloseRegex, insertContent + '</body>');

    // Обновляем components-loader, чтобы он загружал sticky-cta
    // Проверяем, есть ли уже загрузка компонентов
    if (!content.includes('data-component="sticky-cta"')) {
        // Если нет, добавляем через data-component
        // Но мы уже добавили выше, так что просто сохраняем
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Добавлен sticky CTA: ${filePath}`);
    return true;
}

// Функция для обновления components-loader.js, чтобы он загружал sticky-cta
function updateComponentsLoader() {
    const componentsLoaderPath = path.join(SITE_ROOT, 'js/components-loader.js');
    
    if (!fs.existsSync(componentsLoaderPath)) {
        console.log('⚠️  components-loader.js не найден');
        return;
    }

    let content = fs.readFileSync(componentsLoaderPath, 'utf-8');
    
    // Проверяем, есть ли уже загрузка sticky-cta
    if (content.includes('sticky-cta')) {
        console.log('✓ components-loader.js уже обновлен для sticky-cta');
        return;
    }

    // Ищем место, где загружаются компоненты, и добавляем sticky-cta
    // Это зависит от структуры components-loader.js
    // Пока просто выводим информацию
    console.log('ℹ️  Необходимо проверить components-loader.js для загрузки sticky-cta');
}

console.log('=== Добавление Sticky CTA на страницы услуг ===\n');

let addedCount = 0;
let skippedCount = 0;

SERVICE_PAGES.forEach(page => {
    if (addStickyCTA(page)) {
        addedCount++;
    } else {
        skippedCount++;
    }
});

console.log(`\n=== Результаты ===`);
console.log(`✅ Добавлено: ${addedCount}`);
console.log(`⏭️  Пропущено: ${skippedCount}`);
console.log(`📄 Всего страниц: ${SERVICE_PAGES.length}`);

// Обновляем components-loader
updateComponentsLoader();

console.log('\n✅ Готово!');

