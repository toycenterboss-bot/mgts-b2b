/**
 * Скрипт для извлечения иерархии about_mgts из sidebar меню
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const ABOUT_FILE = path.join(NORMALIZED_DIR, 'about_mgts.json');
const HIERARCHY_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');

/**
 * Извлечь slug из URL
 */
function extractSlugFromUrl(url) {
    if (!url) return null;
    return url.replace(/^\//, '').split('?')[0].split('#')[0];
}

/**
 * Извлечь иерархию из sidebar
 */
function extractHierarchyFromSidebar(html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const sidebar = doc.querySelector('.sidebar-menu-desktop');
    
    if (!sidebar) {
        return null;
    }
    
    const hierarchy = {
        root: 'about_mgts',
        children: []
    };
    
    const items = sidebar.querySelectorAll('.sidebar-menu-item');
    
    items.forEach(item => {
        const header = item.querySelector('.sidebar-menu-item__header-label');
        const headerText = header?.textContent?.trim() || '';
        const headerLink = header?.getAttribute('href') || '';
        const headerSlug = extractSlugFromUrl(headerLink);
        
        // Проверяем подменю
        const submenu = item.querySelector('.sidebar-submenu-list');
        
        if (submenu) {
            // Есть подменю - это либо группа без страницы, либо страница с дочерними
            const subItems = submenu.querySelectorAll('.sidebar-submenu-item__label');
            
            if (headerSlug && headerSlug !== 'about_mgts') {
                // Есть ссылка - это страница с дочерними
                const parentItem = {
                    slug: headerSlug,
                    title: headerText,
                    children: []
                };
                
                subItems.forEach(sub => {
                    const subText = sub.textContent?.trim() || '';
                    const subLink = sub.getAttribute('href') || '';
                    const subSlug = extractSlugFromUrl(subLink);
                    
                    if (subSlug) {
                        parentItem.children.push({
                            slug: subSlug,
                            title: subText
                        });
                    }
                });
                
                hierarchy.children.push(parentItem);
            } else {
                // Нет ссылки - это группа, подменю - прямые дочерние about_mgts
                subItems.forEach(sub => {
                    const subText = sub.textContent?.trim() || '';
                    const subLink = sub.getAttribute('href') || '';
                    const subSlug = extractSlugFromUrl(subLink);
                    
                    if (subSlug) {
                        hierarchy.children.push({
                            slug: subSlug,
                            title: subText,
                            children: []
                        });
                    }
                });
            }
        } else if (headerSlug && headerSlug !== 'about_mgts') {
            // Нет подменю, но есть ссылка - прямая дочерняя about_mgts
            hierarchy.children.push({
                slug: headerSlug,
                title: headerText,
                children: []
            });
        }
    });
    
    return hierarchy;
}

/**
 * Обновить иерархию в файле
 */
function updateHierarchy(sidebarHierarchy) {
    const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
    
    // Создаем карту slug -> parentSlug на основе sidebar
    const slugToParent = new Map();
    
    // Прямые дочерние about_mgts
    sidebarHierarchy.children.forEach(child => {
        slugToParent.set(child.slug, 'about_mgts');
        
        // Дочерние второго уровня
        if (child.children) {
            child.children.forEach(grandchild => {
                slugToParent.set(grandchild.slug, child.slug);
            });
        }
    });
    
    // Обновляем иерархию
    let updated = 0;
    hierarchy.flat.forEach(item => {
        if (item.section === 'about_mgts' && slugToParent.has(item.slug)) {
            const newParent = slugToParent.get(item.slug);
            if (item.parentSlug !== newParent) {
                item.parentSlug = newParent;
                updated++;
            }
        }
    });
    
    console.log(`✅ Обновлено записей в иерархии: ${updated}\n`);
    
    return hierarchy;
}

/**
 * Главная функция
 */
function main() {
    console.log('🔧 Извлечение иерархии about_mgts из sidebar\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем about_mgts
    if (!fs.existsSync(ABOUT_FILE)) {
        console.error(`❌ Файл не найден: ${ABOUT_FILE}`);
        process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(ABOUT_FILE, 'utf-8'));
    const html = data.content?.html || data.fullHTML || '';
    
    if (!html) {
        console.error('❌ HTML контент не найден');
        process.exit(1);
    }
    
    // Извлекаем иерархию
    const sidebarHierarchy = extractHierarchyFromSidebar(html);
    
    if (!sidebarHierarchy) {
        console.error('❌ Не удалось извлечь иерархию из sidebar');
        process.exit(1);
    }
    
    console.log('📊 Извлеченная иерархия из sidebar:\n');
    console.log('Корневая страница:', sidebarHierarchy.root);
    console.log('Дочерние страницы:', sidebarHierarchy.children.length);
    console.log('');
    
    sidebarHierarchy.children.forEach((child, i) => {
        console.log(`${i + 1}. ${child.title} (${child.slug})`);
        if (child.children && child.children.length > 0) {
            child.children.forEach((grandchild, j) => {
                console.log(`   ${j + 1}. ${grandchild.title} (${grandchild.slug})`);
            });
        }
    });
    
    console.log('');
    
    // Обновляем иерархию
    const updatedHierarchy = updateHierarchy(sidebarHierarchy);
    
    // Сохраняем
    fs.writeFileSync(HIERARCHY_FILE, JSON.stringify(updatedHierarchy, null, 2), 'utf-8');
    console.log(`✅ Иерархия сохранена: ${HIERARCHY_FILE}\n`);
    
    // Статистика
    const aboutPages = updatedHierarchy.flat.filter(p => p.section === 'about_mgts');
    const withParent = aboutPages.filter(p => p.parentSlug).length;
    const withoutParent = aboutPages.filter(p => !p.parentSlug).length;
    
    console.log('📊 Статистика about_mgts:\n');
    console.log(`   Всего страниц: ${aboutPages.length}`);
    console.log(`   С parent: ${withParent}`);
    console.log(`   Без parent: ${withoutParent}\n`);
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { extractHierarchyFromSidebar, updateHierarchy };
