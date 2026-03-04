/**
 * Скрипт для создания иерархии страниц в Strapi
 * 
 * Задачи:
 * 1. Загрузить нормализованный контент из pages-content-normalized/
 * 2. Для каждой страницы определить родительскую страницу (если есть)
 * 3. Определить порядок страниц (order)
 * 4. Определить секцию (section)
 * 5. Создать структуру иерархии для миграции
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const NORMALIZED_DIR = path.join(OUTPUT_DIR, 'pages-content-normalized');
const HIERARCHY_FILE = path.join(OUTPUT_DIR, 'pages-hierarchy.json');
const HIERARCHY_MD_FILE = path.join(__dirname, '../../docs/PAGES_HIERARCHY.md');

/**
 * Определить секцию по slug
 */
function detectSection(slug) {
    if (!slug) return 'other';
    
    const slugLower = slug.toLowerCase();
    
    if (slugLower.startsWith('business') || slugLower.includes('/business') || slugLower.includes('business/')) {
        return 'business';
    } else if (slugLower.startsWith('operators') || slugLower.includes('/operators') || slugLower.includes('operators/')) {
        return 'operators';
    } else if (slugLower.startsWith('government') || slugLower.includes('/government') || slugLower.includes('government/')) {
        return 'government';
    } else if (slugLower.startsWith('partners') || slugLower.includes('/partners') || slugLower.includes('partners/')) {
        return 'partners';
    } else if (slugLower.startsWith('developers') || slugLower.includes('/developers') || slugLower.includes('developers/')) {
        return 'developers';
    } else if (slugLower.includes('about') || slugLower.includes('about_')) {
        return 'about_mgts';
    } else if (slugLower.includes('news') || slugLower.startsWith('news_')) {
        return 'news';
    } else if (slugLower === 'home' || slugLower === 'index' || slugLower === 'main_page') {
        return 'home';
    }
    
    return 'other';
}

/**
 * Определить тип страницы
 */
function detectPageType(slug, section) {
    if (section === 'news') {
        return 'news';
    } else if (section === 'about_mgts') {
        return 'about';
    } else if (slug.includes('contact')) {
        return 'contacts';
    } else if (section === 'home') {
        return 'home';
    } else if (['business', 'operators', 'government', 'partners', 'developers'].includes(section)) {
        return 'service';
    } else if (slug.includes('document') || slug.includes('policy') || slug.includes('compliance')) {
        return 'document';
    }
    
    return 'other';
}

/**
 * Определить родительскую страницу по пути
 */
function detectParent(slug, allPages) {
    if (!slug) return null;
    
    // Разбиваем slug на части
    const parts = slug.split(/[\/_]/).filter(p => p);
    
    // Если только одна часть - нет родителя
    if (parts.length <= 1) {
        return null;
    }
    
    // Ищем родителя по пути (убираем последнюю часть)
    const parentParts = parts.slice(0, -1);
    const parentSlug = parentParts.join('/');
    
    // Ищем страницу с таким slug
    const parent = allPages.find(p => {
        const pSlug = p.slug || '';
        return pSlug === parentSlug || pSlug === parentParts.join('_');
    });
    
    return parent ? parent.slug : null;
}

/**
 * Определить порядок страницы
 */
function detectOrder(slug, section, parentSlug, allPages) {
    // Если есть родитель, берем порядок среди дочерних страниц
    if (parentSlug) {
        const siblings = allPages.filter(p => {
            const pParent = detectParent(p.slug, allPages);
            return pParent === parentSlug && p.section === section;
        });
        return siblings.length;
    }
    
    // Иначе берем порядок среди страниц секции
    const sectionPages = allPages.filter(p => p.section === section && !detectParent(p.slug, allPages));
    return sectionPages.length;
}

/**
 * Создать иерархию страниц
 */
function createPagesHierarchy() {
    console.log('📋 Создание иерархии страниц...\n');
    
    if (!fs.existsSync(NORMALIZED_DIR)) {
        console.error(`❌ Директория не найдена: ${NORMALIZED_DIR}`);
        process.exit(1);
    }
    
    const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📁 Найдено файлов: ${files.length}\n`);
    
    const pages = [];
    
    // Загружаем все страницы
    files.forEach(file => {
        try {
            const filePath = path.join(NORMALIZED_DIR, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            const slug = data.slug || file.replace('.json', '');
            const title = data.title || data.heroTitle || slug;
            const section = data.section || detectSection(slug);
            const originalUrl = data.url || data.originalUrl || '';
            const originalSlug = data.originalSlug || slug;
            
            pages.push({
                slug: slug,
                title: title,
                section: section,
                originalUrl: originalUrl,
                originalSlug: originalSlug,
                pageType: detectPageType(slug, section),
                file: file
            });
        } catch (error) {
            console.warn(`⚠️  Ошибка при обработке ${file}:`, error.message);
        }
    });
    
    console.log(`✅ Загружено страниц: ${pages.length}\n`);
    
    // Определяем родительские страницы и порядок
    pages.forEach(page => {
        page.parentSlug = detectParent(page.slug, pages);
        page.order = detectOrder(page.slug, page.section, page.parentSlug, pages);
    });
    
    // Группируем по секциям
    const bySection = {};
    pages.forEach(page => {
        if (!bySection[page.section]) {
            bySection[page.section] = [];
        }
        bySection[page.section].push(page);
    });
    
    // Сортируем по order
    Object.keys(bySection).forEach(section => {
        bySection[section].sort((a, b) => {
            // Сначала родительские страницы
            if (!a.parentSlug && b.parentSlug) return -1;
            if (a.parentSlug && !b.parentSlug) return 1;
            // Затем по order
            return a.order - b.order;
        });
    });
    
    // Строим дерево
    const tree = {};
    Object.keys(bySection).forEach(section => {
        tree[section] = buildTree(bySection[section]);
    });
    
    const hierarchy = {
        timestamp: new Date().toISOString(),
        totalPages: pages.length,
        bySection: bySection,
        tree: tree,
        flat: pages
    };
    
    // Сохраняем JSON
    fs.writeFileSync(HIERARCHY_FILE, JSON.stringify(hierarchy, null, 2), 'utf-8');
    console.log(`📄 JSON файл сохранен: ${HIERARCHY_FILE}\n`);
    
    // Создаем Markdown отчет
    createMarkdownReport(hierarchy);
    
    console.log('✅ Иерархия страниц создана!\n');
    console.log('📊 Статистика:');
    Object.keys(bySection).forEach(section => {
        console.log(`   ${section}: ${bySection[section].length} страниц`);
    });
    console.log('');
    
    return hierarchy;
}

/**
 * Построить дерево страниц
 */
function buildTree(pages) {
    const rootPages = pages.filter(p => !p.parentSlug);
    const childrenMap = new Map();
    
    pages.forEach(page => {
        if (page.parentSlug) {
            if (!childrenMap.has(page.parentSlug)) {
                childrenMap.set(page.parentSlug, []);
            }
            childrenMap.get(page.parentSlug).push(page);
        }
    });
    
    function buildNode(page) {
        const node = {
            slug: page.slug,
            title: page.title,
            section: page.section,
            pageType: page.pageType,
            order: page.order,
            originalUrl: page.originalUrl,
            originalSlug: page.originalSlug,
            children: []
        };
        
        if (childrenMap.has(page.slug)) {
            const children = childrenMap.get(page.slug);
            children.sort((a, b) => a.order - b.order);
            node.children = children.map(buildNode);
        }
        
        return node;
    }
    
    rootPages.sort((a, b) => a.order - b.order);
    return rootPages.map(buildNode);
}

/**
 * Создать Markdown отчет
 */
function createMarkdownReport(hierarchy) {
    let md = `# Иерархия страниц для миграции\n\n`;
    md += `**Дата создания:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${hierarchy.totalPages}\n\n`;
    
    md += `### Распределение по секциям:\n\n`;
    Object.keys(hierarchy.bySection).sort().forEach(section => {
        md += `- **${section}:** ${hierarchy.bySection[section].length} страниц\n`;
    });
    md += `\n`;
    
    md += `## 🌳 Дерево страниц по секциям\n\n`;
    
    Object.keys(hierarchy.tree).sort().forEach(section => {
        md += `### ${section.toUpperCase()}\n\n`;
        
        function renderTree(node, level = 0) {
            const indent = '  '.repeat(level);
            md += `${indent}- **${node.title}** (\`${node.slug}\`)\n`;
            md += `${indent}  - Тип: ${node.pageType}\n`;
            md += `${indent}  - Порядок: ${node.order}\n`;
            if (node.originalUrl) {
                md += `${indent}  - Оригинальный URL: ${node.originalUrl}\n`;
            }
            md += `\n`;
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => renderTree(child, level + 1));
            }
        }
        
        hierarchy.tree[section].forEach(root => renderTree(root));
        md += `\n`;
    });
    
    md += `## 📋 Плоский список страниц\n\n`;
    md += `| Slug | Название | Секция | Тип | Родитель | Порядок |\n`;
    md += `|------|----------|--------|-----|----------|---------|\n`;
    
    hierarchy.flat.sort((a, b) => {
        if (a.section !== b.section) return a.section.localeCompare(b.section);
        return a.order - b.order;
    }).forEach(page => {
        md += `| ${page.slug} | ${page.title} | ${page.section} | ${page.pageType} | ${page.parentSlug || '-'} | ${page.order} |\n`;
    });
    
    md += `\n## 📝 Использование\n\n`;
    md += `Этот файл используется скриптом миграции для создания страниц в Strapi с правильной иерархией.\n\n`;
    md += `**Следующие шаги:**\n`;
    md += `1. Проверить иерархию страниц\n`;
    md += `2. При необходимости скорректировать порядок (order)\n`;
    md += `3. Использовать для миграции страниц в Strapi\n\n`;
    
    fs.writeFileSync(HIERARCHY_MD_FILE, md, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${HIERARCHY_MD_FILE}\n`);
}

/**
 * Главная функция
 */
function main() {
    console.log('🌳 Создание иерархии страниц\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        const hierarchy = createPagesHierarchy();
        console.log('✅ Готово!\n');
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, createPagesHierarchy };
