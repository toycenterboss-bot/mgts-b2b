/**
 * Финальная обработка и структурирование всех собранных данных об услугах
 * Объединяет результаты всех методов извлечения и создает финальную структуру
 */

const fs = require('fs');
const path = require('path');

const FILES = {
    tree: path.join(__dirname, '../../temp/services-extraction/services-tree.json'),
    deep: path.join(__dirname, '../../temp/services-extraction/services-deep-tree.json'),
    allServices: path.join(__dirname, '../../temp/services-extraction/all-services-complete.json'),
    complete: path.join(__dirname, '../../temp/services-extraction/complete-services-structure.json')
};

const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/final-services-structure.json');

/**
 * Объединить все услуги из разных источников
 */
function mergeAllServices() {
    const allServices = new Map();
    
    // Загружаем данные из всех файлов
    const sources = {};
    for (const [name, filePath] of Object.entries(FILES)) {
        if (fs.existsSync(filePath)) {
            try {
                sources[name] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                console.log(`✅ Загружен: ${name} (${filePath})`);
            } catch (e) {
                console.log(`⚠️  Ошибка загрузки ${name}: ${e.message}`);
            }
        }
    }
    
    // Извлекаем услуги из каждого источника
    if (sources.complete && sources.complete.services) {
        sources.complete.services.forEach(service => {
            if (!allServices.has(service.url)) {
                allServices.set(service.url, {
                    ...service,
                    source: 'complete'
                });
            }
        });
    }
    
    if (sources.allServices && sources.allServices.services) {
        sources.allServices.services.forEach(service => {
            if (!allServices.has(service.url)) {
                allServices.set(service.url, {
                    ...service,
                    source: 'allServices'
                });
            } else {
                // Объединяем данные
                const existing = allServices.get(service.url);
                if (!existing.description && service.description) {
                    existing.description = service.description;
                }
                if (!existing.image && service.image) {
                    existing.image = service.image;
                }
            }
        });
    }
    
    if (sources.tree && sources.tree.flatServices) {
        sources.tree.flatServices.forEach(service => {
            if (!allServices.has(service.url)) {
                allServices.set(service.url, {
                    title: service.title,
                    url: service.url,
                    slug: service.slug,
                    path: service.path,
                    category: service.category,
                    level: service.level,
                    description: '',
                    image: '',
                    source: 'tree'
                });
            }
        });
    }
    
    return Array.from(allServices.values());
}

/**
 * Правильно определить категорию услуги
 */
function determineCategory(service) {
    const url = service.url.toLowerCase();
    const path = service.path ? service.path.toLowerCase() : '';
    const title = service.title.toLowerCase();
    
    // Телефония
    if (url.includes('telephony') || path.includes('telephony') || 
        title.includes('телефон') || title.includes('телефония') ||
        title.includes('атс') || title.includes('мобильная связь')) {
        return 'telephony';
    }
    
    // Интернет
    if (url.includes('internet') || url.includes('access_internet') || 
        path.includes('internet') || path.includes('access_internet') ||
        title.includes('интернет') || title.includes('gpon') ||
        title.includes('выделенный') || title.includes('офисный')) {
        return 'internet';
    }
    
    // Безопасность
    if (url.includes('security') || url.includes('video') || url.includes('alarm') ||
        path.includes('security') || path.includes('video') || path.includes('alarm') ||
        title.includes('безопасн') || title.includes('видеонаблюд') ||
        title.includes('охрана') || title.includes('сигнализац') ||
        title.includes('контроль доступа')) {
        return 'security';
    }
    
    // Облако
    if (url.includes('cloud') || path.includes('cloud') ||
        title.includes('облак') || title.includes('vps') ||
        title.includes('хранилищ') || title.includes('сервер')) {
        return 'cloud';
    }
    
    // ТВ
    if (url.includes('tv') || url.includes('television') ||
        path.includes('tv') || path.includes('television') ||
        title.includes('тв') || title.includes('телевидение') ||
        title.includes('iptv')) {
        return 'tv';
    }
    
    return 'other';
}

/**
 * Построить правильное дерево
 */
function buildFinalTree(services) {
    const tree = {
        root: {
            name: 'Услуги МГТС',
            url: 'https://business.mgts.ru',
            children: []
        }
    };
    
    // Группируем по категориям
    const byCategory = {};
    services.forEach(service => {
        const category = determineCategory(service);
        if (!byCategory[category]) {
            byCategory[category] = [];
        }
        byCategory[category].push(service);
    });
    
    // Создаем узлы категорий
    const categoryNames = {
        telephony: 'Телефония',
        internet: 'Интернет',
        security: 'Безопасность',
        cloud: 'Облачные решения',
        tv: 'Цифровое ТВ',
        mobile: 'Мобильная связь',
        other: 'Прочее'
    };
    
    for (const [category, categoryServices] of Object.entries(byCategory)) {
        const categoryNode = {
            name: categoryNames[category] || category,
            slug: category,
            url: `https://business.mgts.ru/business/${category}`,
            children: categoryServices.map(service => ({
                title: service.title,
                url: service.url,
                slug: service.slug,
                path: service.path || service.url.replace('https://business.mgts.ru/', ''),
                level: service.level || 2,
                description: service.description || '',
                image: service.image || '',
                category: category
            }))
        };
        
        tree.root.children.push(categoryNode);
    }
    
    return tree;
}

/**
 * Основная функция
 */
function main() {
    console.log('🔧 ФИНАЛИЗАЦИЯ СТРУКТУРЫ УСЛУГ');
    console.log('='.repeat(70));
    
    // Объединяем все услуги
    console.log('\n📋 Объединение данных из всех источников...');
    const allServices = mergeAllServices();
    console.log(`✅ Всего уникальных услуг: ${allServices.length}`);
    
    // Определяем категории
    console.log('\n📁 Определение категорий...');
    allServices.forEach(service => {
        service.category = determineCategory(service);
    });
    
    // Группируем по категориям
    const byCategory = {};
    allServices.forEach(service => {
        if (!byCategory[service.category]) {
            byCategory[service.category] = [];
        }
        byCategory[service.category].push(service);
    });
    
    // Строим дерево
    console.log('\n🌳 Построение дерева...');
    const tree = buildFinalTree(allServices);
    
    // Создаем финальную структуру
    const result = {
        timestamp: new Date().toISOString(),
        baseUrl: 'https://business.mgts.ru',
        totalServices: allServices.length,
        services: allServices,
        tree: tree,
        byCategory: byCategory,
        summary: {
            total: allServices.length,
            categories: Object.keys(byCategory).length,
            byCategoryCount: Object.fromEntries(
                Object.entries(byCategory).map(([cat, items]) => [cat, items.length])
            )
        }
    };
    
    // Сохраняем
    console.log('\n💾 Сохранение финальной структуры...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    
    // Выводим результаты
    console.log('\n' + '='.repeat(70));
    console.log('📊 ФИНАЛЬНАЯ СТРУКТУРА');
    console.log('='.repeat(70));
    console.log(`✅ Всего услуг: ${allServices.length}`);
    console.log(`📁 Категорий: ${result.summary.categories}`);
    
    console.log('\n📋 Услуги по категориям:');
    for (const [category, services] of Object.entries(byCategory)) {
        console.log(`\n${category.toUpperCase()} (${services.length}):`);
        services.forEach((service, i) => {
            console.log(`  ${i + 1}. ${service.title}`);
            console.log(`     ${service.url}`);
        });
    }
    
    console.log('\n🌳 Структура дерева:');
    function printTree(node, indent = '') {
        console.log(`${indent}${node.name}`);
        if (node.children) {
            node.children.forEach(child => {
                if (child.children) {
                    printTree(child, indent + '  ');
                } else {
                    console.log(`${indent}  └─ ${child.title}`);
                }
            });
        }
    }
    printTree(tree.root);
    
    console.log('\n' + '='.repeat(70));
    console.log(`📁 Финальная структура сохранена в: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
}

if (require.main === module) {
    main();
}

module.exports = { mergeAllServices, buildFinalTree, determineCategory };
