/**
 * Скрипт для пересоздания иерархии страниц на основе структуры URL
 */

const fs = require('fs');
const path = require('path');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy-recreated.json');

/**
 * Извлечь slug из URL
 */
function extractSlugFromUrl(url) {
    if (!url) return null;
    const cleanUrl = url.replace('https://business.mgts.ru/', '').split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/').filter(p => p);
    return parts[parts.length - 1] || null;
}

/**
 * Определить parent slug на основе URL
 */
function determineParentSlug(page, allPages) {
    const url = page.originalUrl || page.url || '';
    if (!url) return null;
    
    const cleanUrl = url.replace('https://business.mgts.ru/', '').split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/').filter(p => p);
    
    // Если URL имеет более одного уровня, первый уровень - это родитель
    if (parts.length > 1) {
        const parentSlug = parts[0];
        // Проверяем, существует ли такая страница
        const parentPage = allPages.find(p => p.slug === parentSlug);
        if (parentPage) {
            return parentSlug;
        }
    }
    
    // Специальные случаи для новостей
    if (page.slug && page.slug.startsWith('news_') && page.slug !== 'news') {
        return 'news';
    }
    
    // Специальные случаи для вложенных страниц
    const section = page.section || '';
    if (parts.length > 1) {
        // Пробуем найти родителя по первому сегменту URL
        const firstSegment = parts[0];
        const possibleParent = allPages.find(p => p.slug === firstSegment);
        if (possibleParent) {
            return firstSegment;
        }
    }
    
    return null;
}

/**
 * Главная функция
 */
function main() {
    console.log('🔧 Пересоздание иерархии страниц\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем все нормализованные страницы
    const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📦 Загружено файлов: ${files.length}\n`);
    
    const allPages = files.map(file => {
        const filePath = path.join(NORMALIZED_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
            slug: data.slug || file.replace('.json', ''),
            title: data.title || '',
            section: data.section || 'other',
            originalUrl: data.originalUrl || data.url || '',
            file: file
        };
    });
    
    console.log(`✅ Загружено страниц: ${allPages.length}\n`);
    
    // Создаем иерархию
    const hierarchy = {
        timestamp: new Date().toISOString(),
        totalPages: allPages.length,
        flat: [],
        bySection: {}
    };
    
    // Первый проход: определяем parent для каждой страницы
    allPages.forEach(page => {
        const parentSlug = determineParentSlug(page, allPages);
        
        const hierarchyItem = {
            slug: page.slug,
            title: page.title,
            section: page.section,
            originalUrl: page.originalUrl,
            parentSlug: parentSlug,
            file: page.file
        };
        
        hierarchy.flat.push(hierarchyItem);
        
        // Группируем по секциям
        if (!hierarchy.bySection[page.section]) {
            hierarchy.bySection[page.section] = [];
        }
        hierarchy.bySection[page.section].push(hierarchyItem);
    });
    
    // Статистика
    const withParent = hierarchy.flat.filter(p => p.parentSlug).length;
    const withoutParent = hierarchy.flat.filter(p => !p.parentSlug).length;
    
    console.log('📊 Статистика иерархии:\n');
    console.log(`   Всего страниц: ${hierarchy.totalPages}`);
    console.log(`   С parent: ${withParent}`);
    console.log(`   Без parent: ${withoutParent}\n`);
    
    // Группировка по родителям
    const byParent = {};
    hierarchy.flat.forEach(p => {
        const parent = p.parentSlug || 'ROOT';
        if (!byParent[parent]) byParent[parent] = [];
        byParent[parent].push(p.slug);
    });
    
    console.log('📋 Группировка по родителям:\n');
    Object.keys(byParent).sort().forEach(parent => {
        if (parent !== 'ROOT' && byParent[parent].length > 0) {
            console.log(`   ${parent}: ${byParent[parent].length} дочерних`);
            byParent[parent].slice(0, 5).forEach(child => console.log(`     - ${child}`));
            if (byParent[parent].length > 5) {
                console.log(`     ... и еще ${byParent[parent].length - 5}`);
            }
            console.log('');
        }
    });
    
    // Сохраняем результат
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(hierarchy, null, 2), 'utf-8');
    console.log(`✅ Иерархия сохранена: ${OUTPUT_FILE}\n`);
    
    return hierarchy;
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main };
