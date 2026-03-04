/**
 * Скрипт для создания структуры каталогов и индексных файлов на основе иерархии страниц
 * Создает директории и index.html файлы для всех страниц из Strapi
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const SITE_ROOT = path.join(__dirname, '../../SiteMGTS');

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    process.exit(1);
}

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Читаем шаблон страницы
function readPageTemplate() {
    const templatePath = path.join(SITE_ROOT, 'page-template.html');
    if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath, 'utf-8');
    }
    
    // Базовый шаблон, если файл не найден
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} | МГТС</title>
    <link rel="stylesheet" href="{{BASE_PATH}}css/style.css">
</head>
<body>
    <div data-component="header"></div>
    
    <main>
        <div data-component="content"></div>
    </main>
    
    <div data-component="footer"></div>
    
    <script src="{{BASE_PATH}}js/api-client.js"></script>
    <script src="{{BASE_PATH}}js/components-loader.js"></script>
    <script src="{{BASE_PATH}}js/cms-loader.js"></script>
</body>
</html>`;
}

// Создаем путь к странице на основе slug и parentSlug
function buildPagePath(slug, parentSlug, hierarchy) {
    if (!parentSlug) {
        // Корневая страница
        if (slug === 'main_page' || slug === 'index') {
            return 'index.html';
        }
        return `${slug}/index.html`;
    }
    
    // Строим путь с учетом полной иерархии от корня до текущей страницы
    const pathParts = [];
    
    // Строим цепочку от корня к текущей странице
    // Сначала находим все родители до корня
    const buildParentChain = (currentSlug, visited = new Set()) => {
        if (visited.has(currentSlug)) {
            return; // Предотвращаем циклы
        }
        visited.add(currentSlug);
        
        const page = hierarchy.find(p => p.slug === currentSlug);
        if (!page || !page.parentSlug) {
            // Дошли до корня или страница не найдена
            return;
        }
        
        // Рекурсивно добавляем родителя
        buildParentChain(page.parentSlug, visited);
        // Добавляем родителя в путь
        if (!pathParts.includes(page.parentSlug)) {
            pathParts.push(page.parentSlug);
        }
    };
    
    // Строим цепочку родителей
    buildParentChain(slug);
    
    // Добавляем текущий slug в конец
    if (!pathParts.includes(slug)) {
        pathParts.push(slug);
    }
    
    return pathParts.join('/') + '/index.html';
}

// Вычисляем базовый путь для ресурсов (CSS, JS, images)
function calculateBasePath(filePath) {
    const depth = (filePath.match(/\//g) || []).length;
    if (depth === 0) {
        return '';
    }
    return '../'.repeat(depth - 1);
}

// Создаем HTML файл страницы
function createPageFile(filePath, slug, title, basePath) {
    const template = readPageTemplate();
    const html = template
        .replace(/\{\{TITLE\}\}/g, title || 'Страница')
        .replace(/\{\{BASE_PATH\}\}/g, basePath)
        .replace(/\{\{SLUG\}\}/g, slug);
    
    // Убеждаемся, что директория существует
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Записываем файл
    fs.writeFileSync(filePath, html, 'utf-8');
}

async function createDirectoryStructure() {
    console.log('🔄 Создание структуры каталогов и индексных файлов...\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // Загружаем иерархию из файла
        const hierarchyPath = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
        let hierarchy = [];
        
        if (fs.existsSync(hierarchyPath)) {
            const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
            hierarchy = hierarchyData.flat || [];
            console.log(`📂 Загружена иерархия из pages-hierarchy.json (${hierarchy.length} страниц)\n`);
        } else {
            // Если файл не найден, получаем данные из Strapi API
            console.log('📥 Загрузка страниц из Strapi API...\n');
            const response = await api.get('/pages?pagination[pageSize]=100');
            const pages = response.data.data || [];
            
            hierarchy = pages.map(page => {
                const pageData = page.attributes || page;
                return {
                    slug: pageData.slug,
                    title: pageData.title,
                    section: pageData.section || 'other',
                    parentSlug: null // Будет определено позже
                };
            });
            console.log(`📊 Загружено страниц из Strapi: ${hierarchy.length}\n`);
        }
        
        if (hierarchy.length === 0) {
            console.warn('⚠️  Нет страниц для создания структуры');
            return;
        }
        
        let created = 0;
        let skipped = 0;
        let errors = 0;
        
        console.log('📁 Создание директорий и файлов...\n');
        
        // Создаем файлы для всех страниц
        for (const page of hierarchy) {
            try {
                const { slug, title, parentSlug } = page;
                
                // Пропускаем страницы новостей (они должны быть в формате News)
                if (slug.startsWith('news_') && slug !== 'news') {
                    console.log(`⏭️  Пропущено: ${slug} (будет создано через News)\n`);
                    skipped++;
                    continue;
                }
                
                // Строим путь к файлу
                const filePath = buildPagePath(slug, parentSlug, hierarchy);
                const fullPath = path.join(SITE_ROOT, filePath);
                
                // Проверяем, существует ли уже файл с правильным путем
                if (fs.existsSync(fullPath)) {
                    // Проверяем, что путь правильный (не содержит дубликатов slug)
                    const pathParts = filePath.split('/').filter(p => p !== 'index.html');
                    const hasDuplicates = pathParts.length !== new Set(pathParts).size;
                    
                    if (hasDuplicates) {
                        console.log(`⚠️  Обнаружен неправильный путь: ${filePath}, будет пересоздан\n`);
                        // Удаляем файл с неправильным путем
                        try {
                            fs.unlinkSync(fullPath);
                            // Удаляем пустые директории
                            const dir = path.dirname(fullPath);
                            try {
                                fs.rmdirSync(dir);
                            } catch (e) {
                                // Директория не пустая или другая ошибка - игнорируем
                            }
                        } catch (e) {
                            // Игнорируем ошибки при удалении
                        }
                    } else {
                        console.log(`⏭️  Пропущено: ${filePath} (уже существует, путь правильный)\n`);
                        skipped++;
                        continue;
                    }
                }
                
                // Вычисляем базовый путь для ресурсов
                const basePath = calculateBasePath(filePath);
                
                // Создаем файл
                createPageFile(fullPath, slug, title, basePath);
                
                console.log(`✅ Создано: ${filePath}\n`);
                created++;
                
            } catch (error) {
                console.error(`   ❌ Ошибка при создании ${page.slug}:`, error.message);
                errors++;
            }
        }
        
        // Создаем специальные файлы для главной страницы и новостей
        const indexPath = path.join(SITE_ROOT, 'index.html');
        if (!fs.existsSync(indexPath)) {
            createPageFile(indexPath, 'main_page', 'Главная страница', '');
            console.log(`✅ Создана главная страница: index.html\n`);
            created++;
        }
        
        const newsPath = path.join(SITE_ROOT, 'news/index.html');
        if (!fs.existsSync(newsPath)) {
            createPageFile(newsPath, 'news', 'Новости', '../');
            console.log(`✅ Создана страница новостей: news/index.html\n`);
            created++;
        }
        
        console.log('='.repeat(60) + '\n');
        console.log('✅ Структура каталогов создана!\n');
        console.log(`   - ✅ Создано файлов: ${created}`);
        console.log(`   - ⏭️  Пропущено: ${skipped}`);
        console.log(`   - ❌ Ошибок: ${errors}\n`);
        
        // Выводим структуру созданных директорий
        console.log('📂 Структура каталогов:\n');
        printDirectoryStructure(SITE_ROOT, '', 0, 3); // Показываем 3 уровня вложенности
        
    } catch (error) {
        console.error('\n❌ Ошибка при создании структуры каталогов:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Вывод структуры директорий
function printDirectoryStructure(dir, prefix, level, maxLevel) {
    if (level >= maxLevel) return;
    
    try {
        const items = fs.readdirSync(dir)
            .filter(item => {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                return stat.isDirectory() || (stat.isFile() && item === 'index.html');
            })
            .sort();
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            const isLast = i === items.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const nextPrefix = isLast ? '    ' : '│   ';
            
            if (stat.isDirectory()) {
                console.log(`${prefix}${connector}${item}/`);
                printDirectoryStructure(itemPath, prefix + nextPrefix, level + 1, maxLevel);
            } else if (item === 'index.html') {
                const dirName = path.basename(dir);
                console.log(`${prefix}${connector}${dirName}/index.html`);
            }
        }
    } catch (error) {
        // Игнорируем ошибки доступа к некоторым директориям
    }
}

// Запуск
if (require.main === module) {
    createDirectoryStructure();
}

module.exports = { createDirectoryStructure };
