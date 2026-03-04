/**
 * Скрипт для перестроения меню и футера на основе данных из Strapi
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

const HEADER_FILE = path.join(__dirname, '../../SiteMGTS/components/header.html');
const FOOTER_FILE = path.join(__dirname, '../../SiteMGTS/components/footer.html');
const SIDEBAR_FILE = path.join(__dirname, '../../SiteMGTS/components/sidebar-about.html');

/**
 * Загрузить все страницы из Strapi с иерархией
 */
async function loadPagesWithHierarchy() {
    console.log('📦 Загрузка страниц из Strapi...\n');
    
    let allPages = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const response = await api.get('/pages', {
            params: {
                'pagination[page]': page,
                'pagination[pageSize]': 100,
                'populate': ['parent', 'children'],
                'filters[isMenuVisible][$eq]': true,
                'sort': 'order:asc'
            }
        });
        
        const pages = response.data.data || [];
        allPages = allPages.concat(pages);
        
        const pagination = response.data.meta?.pagination;
        if (pagination && page < pagination.pageCount) {
            page++;
        } else {
            hasMore = false;
        }
    }
    
    console.log(`✅ Загружено страниц: ${allPages.length}\n`);
    return allPages;
}

/**
 * Построить иерархию страниц
 */
function buildHierarchy(pages) {
    const pageMap = new Map();
    const rootPages = [];
    
    // Создаем карту страниц
    pages.forEach(page => {
        const slug = page.attributes?.slug || page.slug;
        const pageId = page.id || (page.data && page.data.id);
        pageMap.set(pageId, {
            id: pageId,
            slug: slug,
            title: page.attributes?.title || page.title || slug,
            section: page.attributes?.section || page.section || 'other',
            order: page.attributes?.order || page.order || 0,
            parentId: page.attributes?.parent?.data?.id || page.parent?.id || null,
            children: []
        });
    });
    
    // Строим дерево
    pageMap.forEach(page => {
        if (page.parentId && pageMap.has(page.parentId)) {
            pageMap.get(page.parentId).children.push(page);
        } else {
            rootPages.push(page);
        }
    });
    
    // Сортируем детей
    pageMap.forEach(page => {
        page.children.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    });
    
    // Сортируем корневые страницы
    rootPages.sort((a, b) => {
        const sectionOrder = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts', 'news', 'home', 'other'];
        const aOrder = sectionOrder.indexOf(a.section);
        const bOrder = sectionOrder.indexOf(b.section);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.order - b.order || a.title.localeCompare(b.title);
    });
    
    return { pageMap, rootPages };
}

/**
 * Группировать страницы по секциям
 */
function groupBySection(pages) {
    const grouped = {
        business: [],
        operators: [],
        government: [],
        partners: [],
        developers: [],
        about_mgts: [],
        news: [],
        home: [],
        other: []
    };
    
    pages.forEach(page => {
        const section = page.section || 'other';
        if (grouped[section]) {
            grouped[section].push(page);
        } else {
            grouped.other.push(page);
        }
    });
    
    return grouped;
}

/**
 * Генерировать HTML для mega-menu секции
 */
function generateMegaMenuSection(title, pages, basePath = '') {
    if (pages.length === 0) return '';
    
    const slug = pages[0].slug;
    const titleLink = pages[0].parentId ? '' : `<a href="${basePath}${slug}/index.html" style="color: inherit; text-decoration: none;" data-base-path>${title}</a>`;
    
    let html = `<div class="mega-menu-section">\n`;
    html += `    <h3>${titleLink || title}</h3>\n`;
    html += `    <ul class="mega-menu-list">\n`;
    
    pages.forEach(page => {
        html += `        <li class="mega-menu-item"><a href="${basePath}${page.slug}/index.html" data-base-path>${page.title}</a></li>\n`;
    });
    
    html += `    </ul>\n`;
    html += `</div>\n`;
    
    return html;
}

/**
 * Обновить header.html
 */
async function updateHeader(pages) {
    console.log('📝 Обновление header.html...\n');
    
    const { rootPages } = buildHierarchy(pages);
    const grouped = groupBySection(rootPages);
    
    // Читаем существующий header
    let headerContent = fs.readFileSync(HEADER_FILE, 'utf-8');
    
    // Генерируем mega-menu для услуг (business services)
    const businessServices = grouped.business.filter(p => p.children.length > 0);
    let servicesMenu = '';
    businessServices.forEach(parent => {
        servicesMenu += generateMegaMenuSection(parent.title, parent.children, '../');
    });
    
    // Генерируем mega-menu для сегментов
    const segments = [
        { title: 'Бизнес', slug: 'business', pages: grouped.business.filter(p => !p.parentId) },
        { title: 'Операторам', slug: 'operators', pages: grouped.operators.filter(p => !p.parentId) },
        { title: 'Госзаказчикам', slug: 'government', pages: grouped.government.filter(p => !p.parentId) },
        { title: 'Партнерам', slug: 'partners', pages: grouped.partners.filter(p => !p.parentId) },
        { title: 'Застройщикам', slug: 'developers', pages: grouped.developers.filter(p => !p.parentId) }
    ];
    
    let segmentsMenu = '';
    segments.forEach(segment => {
        if (segment.pages.length > 0) {
            segmentsMenu += generateMegaMenuSection(segment.title, segment.pages, '../');
        }
    });
    
    // Генерируем mega-menu для "О компании"
    const aboutPages = grouped.about_mgts.filter(p => !p.parentId);
    let aboutMenu = '';
    aboutPages.forEach(page => {
        if (page.children.length > 0) {
            aboutMenu += generateMegaMenuSection(page.title, page.children, '../');
        } else {
            aboutMenu += `        <div class="mega-menu-section">\n`;
            aboutMenu += `            <h3><a href="../${page.slug}/index.html" style="color: inherit; text-decoration: none;" data-base-path>${page.title}</a></h3>\n`;
            aboutMenu += `        </div>\n`;
        }
    });
    
    // Заменяем mega-menu блоки
    headerContent = headerContent.replace(
        /<div id="servicesMenu"[^>]*>[\s\S]*?<\/div>\s*<!-- Mega Menu: Услуги -->/,
        `<div id="servicesMenu" class="mega-menu" role="menu" aria-label="Меню услуг" aria-hidden="true">
    <div class="container">
        <div class="mega-menu-grid">
${servicesMenu}        </div>
    </div>
</div>
    <!-- Mega Menu: Услуги -->`
    );
    
    headerContent = headerContent.replace(
        /<div id="segmentsMenu"[^>]*>[\s\S]*?<\/div>\s*<!-- Mega Menu: Сегменты -->/,
        `<div id="segmentsMenu" class="mega-menu" role="menu" aria-label="Меню сегментов" aria-hidden="true">
    <div class="container">
        <div class="mega-menu-grid">
${segmentsMenu}        </div>
    </div>
</div>
    <!-- Mega Menu: Сегменты -->`
    );
    
    headerContent = headerContent.replace(
        /<div id="aboutMenu"[^>]*>[\s\S]*?<\/div>\s*<!-- Mega Menu: О компании -->/,
        `<div id="aboutMenu" class="mega-menu" role="menu" aria-label="Меню О компании" aria-hidden="true">
    <div class="container">
        <div class="mega-menu-grid">
${aboutMenu}        </div>
    </div>
</div>
    <!-- Mega Menu: О компании -->`
    );
    
    fs.writeFileSync(HEADER_FILE, headerContent, 'utf-8');
    console.log('✅ header.html обновлен\n');
}

/**
 * Обновить footer.html
 */
async function updateFooter(pages) {
    console.log('📝 Обновление footer.html...\n');
    
    const { rootPages } = buildHierarchy(pages);
    const grouped = groupBySection(rootPages);
    
    // Читаем существующий footer
    let footerContent = fs.readFileSync(FOOTER_FILE, 'utf-8');
    
    // Генерируем ссылки на услуги (первые 5 бизнес-услуг)
    const businessServices = grouped.business
        .filter(p => !p.parentId)
        .slice(0, 5)
        .map(p => `                    <li><a href="${p.slug}/index.html" data-base-path>${p.title}</a></li>`)
        .join('\n');
    
    // Генерируем ссылки на сегменты
    const segments = [
        { slug: 'business', title: 'Бизнес' },
        { slug: 'operators', title: 'Операторам' },
        { slug: 'developers', title: 'Застройщикам' },
        { slug: 'partners', title: 'Партнерам' },
        { slug: 'government', title: 'Госзаказчикам' }
    ];
    
    const segmentLinks = segments
        .filter(s => grouped[s.slug] && grouped[s.slug].length > 0)
        .map(s => {
            const page = grouped[s.slug].find(p => p.slug === s.slug) || grouped[s.slug][0];
            return `                    <li><a href="${page.slug}/index.html" data-base-path>${s.title}</a></li>`;
        })
        .join('\n');
    
    // Генерируем ссылки "О компании"
    const aboutLinks = grouped.about_mgts
        .filter(p => !p.parentId)
        .slice(0, 5)
        .map(p => `                    <li><a href="${p.slug}/index.html" data-base-path>${p.title}</a></li>`)
        .join('\n');
    
    // Заменяем секции футера
    footerContent = footerContent.replace(
        /<div class="footer-section">\s*<h4>Услуги<\/h4>\s*<ul class="footer-links"[^>]*>[\s\S]*?<\/ul>\s*<\/div>/,
        `<div class="footer-section">
                <h4>Услуги</h4>
                <ul class="footer-links" role="list">
${businessServices}
                </ul>
            </div>`
    );
    
    footerContent = footerContent.replace(
        /<div class="footer-section">\s*<h4>Сегменты<\/h4>\s*<ul class="footer-links"[^>]*>[\s\S]*?<\/ul>\s*<\/div>/,
        `<div class="footer-section">
                <h4>Сегменты</h4>
                <ul class="footer-links" role="list">
${segmentLinks}
                </ul>
            </div>`
    );
    
    footerContent = footerContent.replace(
        /<div class="footer-section">\s*<h4>О компании<\/h4>\s*<ul class="footer-links"[^>]*>[\s\S]*?<\/ul>\s*<\/div>/,
        `<div class="footer-section">
                <h4>О компании</h4>
                <ul class="footer-links" role="list">
${aboutLinks}
                </ul>
            </div>`
    );
    
    fs.writeFileSync(FOOTER_FILE, footerContent, 'utf-8');
    console.log('✅ footer.html обновлен\n');
}

/**
 * Обновить sidebar-about.html
 */
async function updateSidebar(pages) {
    console.log('📝 Обновление sidebar-about.html...\n');
    
    const aboutPages = pages.filter(page => {
        const section = page.attributes?.section || page.section;
        return section === 'about_mgts';
    });
    
    const { rootPages } = buildHierarchy(aboutPages);
    const aboutRoot = rootPages.filter(p => !p.parentId);
    
    // Читаем существующий sidebar
    let sidebarContent = fs.readFileSync(SIDEBAR_FILE, 'utf-8');
    
    // Генерируем меню
    let menuHtml = '';
    aboutRoot.forEach(page => {
        if (page.children.length > 0) {
            menuHtml += `                <li class="sidebar-item">\n`;
            menuHtml += `                    <a href="${page.slug}/index.html" class="sidebar-link" data-base-path>${page.title}</a>\n`;
            menuHtml += `                    <ul class="sidebar-submenu">\n`;
            page.children.forEach(child => {
                menuHtml += `                        <li><a href="${child.slug}/index.html" data-base-path>${child.title}</a></li>\n`;
            });
            menuHtml += `                    </ul>\n`;
            menuHtml += `                </li>\n`;
        } else {
            menuHtml += `                <li class="sidebar-item">\n`;
            menuHtml += `                    <a href="${page.slug}/index.html" class="sidebar-link" data-base-path>${page.title}</a>\n`;
            menuHtml += `                </li>\n`;
        }
    });
    
    // Заменяем меню
    sidebarContent = sidebarContent.replace(
        /<ul class="sidebar-menu"[^>]*>[\s\S]*?<\/ul>/,
        `<ul class="sidebar-menu" role="navigation" aria-label="Боковое меню">
${menuHtml}            </ul>`
    );
    
    fs.writeFileSync(SIDEBAR_FILE, sidebarContent, 'utf-8');
    console.log('✅ sidebar-about.html обновлен\n');
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔧 Перестроение меню и футера\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // Загружаем страницы
        const pages = await loadPagesWithHierarchy();
        
        // Обновляем компоненты
        await updateHeader(pages);
        await updateFooter(pages);
        await updateSidebar(pages);
        
        console.log('='.repeat(60) + '\n');
        console.log('✅ Все компоненты навигации успешно обновлены!\n');
        
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { updateHeader, updateFooter, updateSidebar };
