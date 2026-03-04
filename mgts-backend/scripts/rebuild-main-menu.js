/**
 * Скрипт для перестроения главного меню на основе актуальной структуры страниц в Strapi
 * Анализирует текущую структуру и создает структуру меню
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

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

async function rebuildMainMenu() {
    console.log('🔄 Перестроение главного меню...\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // Загружаем иерархию из файла pages-hierarchy.json, так как API не возвращает parent правильно
        const hierarchyPath = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
        let hierarchy = null;
        if (fs.existsSync(hierarchyPath)) {
            hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
            console.log('📂 Загружена иерархия из pages-hierarchy.json\n');
        }
        
        // Получаем все страницы с isMenuVisible: true
        console.log('📥 Загрузка страниц из Strapi...');
        const response = await api.get('/pages?filters[isMenuVisible][$eq]=true&sort=order:asc&pagination[pageSize]=100');
        const pages = response.data.data || [];
        
        console.log(`📊 Найдено страниц для меню: ${pages.length}\n`);
        
        if (pages.length === 0) {
            console.warn('⚠️  Нет страниц для меню. Убедитесь, что есть страницы с isMenuVisible: true');
            return;
        }
        
        // Создаем карту slug -> parentSlug из иерархии
        const parentMap = new Map();
        if (hierarchy && hierarchy.flat) {
            hierarchy.flat.forEach(page => {
                if (page.slug && page.parentSlug) {
                    parentMap.set(page.slug, page.parentSlug);
                }
            });
        }
        
        // Создаем карту всех страниц по slug для быстрого доступа
        const pageMapBySlug = new Map();
        
        // Нормализуем структуру для Strapi v5 и добавляем parent из иерархии
        const normalizedPages = pages.map(page => {
            const pageData = page.attributes || page;
            const slug = pageData.slug;
            const parentSlug = parentMap.get(slug);
            
            pageMapBySlug.set(slug, {
                id: page.id || pageData.id,
                documentId: page.documentId || pageData.documentId,
                slug: slug,
                title: pageData.title,
                section: pageData.section || 'other',
                order: pageData.order || 0,
                parentSlug: parentSlug || null,
                children: []
            });
            
            return pageMapBySlug.get(slug);
        });
        
        // Строим иерархию - привязываем children к parent по slug
        const rootPages = [];
        normalizedPages.forEach(page => {
            if (page.parentSlug) {
                const parent = pageMapBySlug.get(page.parentSlug);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(page);
                } else {
                    // Родитель не найден в списке - добавляем как корневой элемент
                    rootPages.push(page);
                }
            } else {
                rootPages.push(page);
            }
        });
        
        // Сортируем children по order
        normalizedPages.forEach(page => {
            if (page.children && page.children.length > 0) {
                page.children.sort((a, b) => (a.order || 0) - (b.order || 0));
            }
        });
        
        // Сортируем корневые элементы по order
        rootPages.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Группируем по секциям
        const menuBySection = {};
        rootPages.forEach(page => {
            const section = page.section || 'other';
            if (!menuBySection[section]) {
                menuBySection[section] = [];
            }
            menuBySection[section].push(page);
        });
        
        // Сортируем страницы в каждой секции по order
        Object.keys(menuBySection).forEach(section => {
            menuBySection[section].sort((a, b) => (a.order || 0) - (b.order || 0));
        });
        
        // Статистика
        console.log('📈 Статистика меню:\n');
        console.log(`   Всего страниц: ${pages.length}`);
        console.log(`   Корневых страниц: ${rootPages.length}`);
        console.log(`   Секций: ${Object.keys(menuBySection).length}\n`);
        
        console.log('📋 Структура меню по секциям:\n');
        const sectionLabels = {
            'business': 'Бизнес',
            'operators': 'Операторам',
            'government': 'Госсектор',
            'partners': 'Партнерам',
            'developers': 'Застройщикам',
            'about_mgts': 'О компании',
            'news': 'Новости',
            'other': 'Прочее'
        };
        
        Object.keys(menuBySection).sort().forEach(section => {
            const sectionPages = menuBySection[section];
            console.log(`   ${sectionLabels[section] || section} (${section}): ${sectionPages.length} страниц`);
            sectionPages.forEach(page => {
                const childrenCount = page.children ? page.children.length : 0;
                const childrenText = childrenCount > 0 ? ` (${childrenCount} дочерних)` : '';
                console.log(`     - ${page.title} (${page.slug})${childrenText}`);
                
                // Показываем дочерние страницы
                if (page.children && page.children.length > 0) {
                    page.children.forEach(child => {
                        console.log(`       └─ ${child.title} (${child.slug})`);
                    });
                }
            });
        });
        
        // Сохраняем структуру меню в JSON файл
        const menuStructure = {
            bySection: menuBySection,
            allPages: normalizedPages.map(p => ({
                slug: p.slug,
                title: p.title,
                section: p.section,
                order: p.order,
                parentSlug: p.parent ? (p.parent.slug || null) : null,
                childrenCount: p.children ? p.children.length : 0
            })),
            rootPages: rootPages.map(p => ({
                slug: p.slug,
                title: p.title,
                section: p.section,
                order: p.order,
                childrenCount: p.children ? p.children.length : 0
            })),
            generatedAt: new Date().toISOString()
        };
        
        const outputDir = path.join(__dirname, '../../temp/services-extraction');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, 'main-menu-structure.json');
        fs.writeFileSync(outputPath, JSON.stringify(menuStructure, null, 2), 'utf-8');
        
        console.log('\n' + '='.repeat(60) + '\n');
        console.log('✅ Главное меню перестроено!\n');
        console.log(`📄 Структура меню сохранена в: ${outputPath}\n`);
        
        return menuStructure;
        
    } catch (error) {
        console.error('\n❌ Ошибка при перестроении главного меню:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    rebuildMainMenu();
}

module.exports = { rebuildMainMenu };
