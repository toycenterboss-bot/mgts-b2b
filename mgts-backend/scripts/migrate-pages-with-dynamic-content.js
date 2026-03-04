/**
 * Скрипт для миграции нормализованных страниц в Strapi с правильной вставкой dynamicContent
 * 
 * Задачи:
 * 1. Загрузить нормализованные файлы из pages-content-normalized/
 * 2. Вставить dynamicContent в правильное место в normalizedHTML
 * 3. Обновить существующие страницы или создать новые
 * 4. Установить иерархию (parent, order, section)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

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

// Пути к файлам
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const NORMALIZED_DIR = path.join(OUTPUT_DIR, 'pages-content-normalized');
const HIERARCHY_FILE = path.join(OUTPUT_DIR, 'pages-hierarchy.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'migration-with-dynamic-report.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/MIGRATION_WITH_DYNAMIC_REPORT.md');

/**
 * Загрузить иерархию страниц
 */
function loadHierarchy() {
    if (!fs.existsSync(HIERARCHY_FILE)) {
        console.warn('⚠️  Файл иерархии не найден, будет создана плоская структура');
        return null;
    }
    
    const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
    console.log(`✅ Загружена иерархия для ${hierarchy.totalPages || hierarchy.flat?.length || 0} страниц\n`);
    return hierarchy;
}

/**
 * Преобразовать dynamicContent в HTML компонент
 */
function dynamicContentToHTML(dynamicContent) {
    if (!dynamicContent || !dynamicContent.type) {
        return '';
    }

    const { type, items, tabs, title } = dynamicContent;

    switch (type) {
        case 'accordion':
            if (!items || items.length === 0) return '';
            let accordionHTML = '<section class="service-faq">';
            if (title) {
                accordionHTML += `<div class="service-faq__title-wrapper"><h1 class="service-faq__title">${title}</h1></div>`;
            }
            items.forEach(item => {
                accordionHTML += `<div class="service-faq__item">${item.content || ''}</div>`;
            });
            accordionHTML += '</section>';
            return accordionHTML;

        case 'document_tabs':
            if (!tabs || tabs.length === 0) return '';
            let documentTabsHTML = '<section class="document-tabs">';
            if (title) {
                documentTabsHTML += `<h2 class="document-tabs__title">${title}</h2>`;
            }
            documentTabsHTML += '<div class="document-tabs__tabs">';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                documentTabsHTML += `<button class="document-tabs__tab-button ${isActive}" data-tab-index="${index}">${tab.name || `Таб ${index + 1}`}</button>`;
            });
            documentTabsHTML += '</div>';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                documentTabsHTML += `<div class="document-tabs__tab-content ${isActive}" data-tab-index="${index}">${tab.content || ''}</div>`;
            });
            documentTabsHTML += '</section>';
            return documentTabsHTML;

        case 'service_tabs':
            if (!tabs || tabs.length === 0) return '';
            let serviceTabsHTML = '<section class="service-tabs">';
            if (title) {
                serviceTabsHTML += `<h2 class="service-tabs__title">${title}</h2>`;
            }
            serviceTabsHTML += '<div class="service-tabs__tabs">';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                serviceTabsHTML += `<button class="service-tabs__tab-button ${isActive}" data-tab-index="${index}">${tab.name || `Таб ${index + 1}`}</button>`;
            });
            serviceTabsHTML += '</div>';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                serviceTabsHTML += `<div class="service-tabs__tab-content ${isActive}" data-tab-index="${index}">${tab.content || ''}</div>`;
            });
            serviceTabsHTML += '</section>';
            return serviceTabsHTML;

        case 'history_tabs':
            if (!tabs || tabs.length === 0) return '';
            let historyTabsHTML = '<section class="history-timeline">';
            if (title) {
                historyTabsHTML += `<h2 class="history-timeline__title">${title}</h2>`;
            }
            historyTabsHTML += '<div class="history-timeline__tabs">';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                historyTabsHTML += `<button class="history-timeline__tab-button ${isActive}" data-tab-index="${index}">${tab.name || `Период ${index + 1}`}</button>`;
            });
            historyTabsHTML += '</div>';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                historyTabsHTML += `<div class="history-timeline__tab-content ${isActive}" data-tab-index="${index}">${tab.content || ''}</div>`;
            });
            historyTabsHTML += '</section>';
            return historyTabsHTML;

        case 'carousel':
            if (!items || items.length === 0) return '';
            let carouselHTML = '<section class="image-carousel">';
            if (title) {
                carouselHTML += `<h2 class="image-carousel__title">${title}</h2>`;
            }
            carouselHTML += '<div class="image-carousel__container">';
            items.forEach((item, index) => {
                carouselHTML += `<div class="image-carousel__item" data-index="${index}">${item.content || ''}</div>`;
            });
            carouselHTML += '</div></section>';
            return carouselHTML;

        default:
            return '';
    }
}

/**
 * Найти место для вставки dynamicContent в normalizedHTML
 * Логика: после service-tariffs, но перед service-order-form
 */
function findInsertionPoint(normalizedHTML, dynamicContentType) {
    if (!normalizedHTML) return null;

    try {
        const dom = new JSDOM(normalizedHTML);
        const doc = dom.window.document;
        const sections = Array.from(doc.querySelectorAll('section'));

        // Определяем маркеры для вставки
        const insertionMarkers = {
            'accordion': ['service-tariffs', 'service-order-form'],
            'document_tabs': ['section-text', 'service-order-form'],
            'service_tabs': ['section-cards', 'service-order-form'],
            'history_tabs': ['hero', 'section-text'],
            'carousel': ['hero', 'section-cards']
        };

        const markers = insertionMarkers[dynamicContentType] || ['service-tariffs', 'service-order-form'];
        const [beforeMarker, afterMarker] = markers;

        // Ищем секцию "beforeMarker"
        let beforeIndex = -1;
        for (let i = 0; i < sections.length; i++) {
            const classes = sections[i].className.split(' ');
            if (classes.includes(beforeMarker)) {
                beforeIndex = i;
                break;
            }
        }

        // Ищем секцию "afterMarker"
        let afterIndex = -1;
        for (let i = 0; i < sections.length; i++) {
            const classes = sections[i].className.split(' ');
            if (classes.includes(afterMarker)) {
                afterIndex = i;
                break;
            }
        }

        // Если нашли обе секции, вставляем между ними
        if (beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex) {
            return { type: 'between', beforeIndex, afterIndex, beforeSection: sections[beforeIndex], afterSection: sections[afterIndex] };
        }

        // Если нашли только beforeMarker, вставляем после него
        if (beforeIndex >= 0) {
            return { type: 'after', index: beforeIndex, section: sections[beforeIndex] };
        }

        // Если нашли только afterMarker, вставляем перед ним
        if (afterIndex >= 0) {
            return { type: 'before', index: afterIndex, section: sections[afterIndex] };
        }

        // Если ничего не нашли, вставляем перед service-order-form или в конец
        const orderFormIndex = sections.findIndex(s => s.className.includes('service-order-form'));
        if (orderFormIndex >= 0) {
            return { type: 'before', index: orderFormIndex, section: sections[orderFormIndex] };
        }

        // Вставляем в конец
        return { type: 'end', lastSection: sections[sections.length - 1] };
    } catch (error) {
        console.warn(`⚠️  Ошибка при поиске места вставки: ${error.message}`);
        return null;
    }
}

/**
 * Вставить dynamicContent в normalizedHTML в правильное место
 */
function insertDynamicContent(normalizedHTML, dynamicContent) {
    if (!dynamicContent || !dynamicContent.type) {
        return normalizedHTML;
    }

    const dynamicHTML = dynamicContentToHTML(dynamicContent);
    if (!dynamicHTML) {
        return normalizedHTML;
    }

    const insertionPoint = findInsertionPoint(normalizedHTML, dynamicContent.type);
    if (!insertionPoint) {
        // Если не нашли место, просто добавляем в конец
        return normalizedHTML + dynamicHTML;
    }

    try {
        const dom = new JSDOM(normalizedHTML);
        const doc = dom.window.document;
        const sections = Array.from(doc.querySelectorAll('section'));

        // Создаем новый элемент для dynamicContent
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = dynamicHTML;
        const newSection = tempDiv.querySelector('section');
        if (!newSection) {
            return normalizedHTML + dynamicHTML;
        }

        // Вставляем в нужное место
        if (insertionPoint.type === 'between') {
            const afterSection = sections[insertionPoint.afterIndex];
            afterSection.parentNode.insertBefore(newSection, afterSection);
        } else if (insertionPoint.type === 'after') {
            const section = sections[insertionPoint.index];
            section.parentNode.insertBefore(newSection, section.nextSibling);
        } else if (insertionPoint.type === 'before') {
            const section = sections[insertionPoint.index];
            section.parentNode.insertBefore(newSection, section);
        } else {
            // end
            const lastSection = sections[sections.length - 1];
            lastSection.parentNode.appendChild(newSection);
        }

        return doc.body.innerHTML;
    } catch (error) {
        console.warn(`⚠️  Ошибка при вставке dynamicContent: ${error.message}`);
        // В случае ошибки просто добавляем в конец
        return normalizedHTML + dynamicHTML;
    }
}

/**
 * Нормализовать section
 */
const VALID_SECTIONS = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts', 'news', 'home', 'other'];

function normalizeSection(section) {
    if (!section || typeof section !== 'string') return 'other';
    const normalized = section.trim().toLowerCase();
    return VALID_SECTIONS.includes(normalized) ? normalized : 'other';
}

/**
 * Создать или обновить страницу в Strapi
 */
async function createOrUpdatePageInStrapi(pageData, hierarchy) {
    try {
        // Находим информацию об иерархии
        const hierarchyInfo = hierarchy?.flat?.find(p => p.slug === pageData.slug);
        
        // Нормализуем section
        const section = normalizeSection(hierarchyInfo?.section || pageData.section);
        
        // Вставляем dynamicContent в normalizedHTML
        let finalHTML = pageData.normalizedHTML || '';
        if (pageData.dynamicContent) {
            finalHTML = insertDynamicContent(finalHTML, pageData.dynamicContent);
        }

        const pagePayload = {
            data: {
                slug: pageData.slug,
                title: pageData.title || pageData.heroTitle || pageData.slug,
                heroTitle: pageData.heroTitle || null,
                heroSubtitle: pageData.heroSubtitle || null,
                metaDescription: pageData.metaDescription || null,
                metaKeywords: pageData.metaKeywords || null,
                section: section,
                order: hierarchyInfo?.order || 0,
                originalUrl: pageData.originalUrl || pageData.url || '',
                isMenuVisible: true,
                content: finalHTML,
                sidebar: section === 'about_mgts' ? 'about' : 'none',
                publishedAt: new Date().toISOString()
            }
        };

        // Проверяем, существует ли страница
        const existingResponse = await api.get(`/pages?filters[slug][$eq]=${pageData.slug}`);
        const existing = existingResponse.data.data;

        if (existing && existing.length > 0) {
            // Обновляем существующую страницу
            const pageId = existing[0].id;
            const updateResponse = await api.put(`/pages/${pageId}`, pagePayload);
            return { action: 'updated', data: updateResponse.data.data, id: pageId };
        } else {
            // Создаем новую страницу
            const createResponse = await api.post('/pages', pagePayload);
            return { action: 'created', data: createResponse.data.data, id: createResponse.data.data.id };
        }
    } catch (error) {
        console.error(`❌ Ошибка при создании/обновлении страницы ${pageData.slug}:`, error.message);
        if (error.response) {
            console.error('   Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

/**
 * Обновить parent связи после создания всех страниц
 */
async function updateParentRelations(pages, hierarchy) {
    console.log('🔗 Обновление родительских связей...\n');
    
    if (!hierarchy || !hierarchy.flat) return;
    
    // Создаем карту slug -> id
    const slugToId = new Map();
    pages.forEach(page => {
        if (page.slug) {
            slugToId.set(page.slug, page.id);
        }
    });

    let updated = 0;
    let errors = 0;

    for (const pageInfo of hierarchy.flat) {
        if (!pageInfo.parentSlug || !pageInfo.slug) continue;

        const pageId = slugToId.get(pageInfo.slug);
        const parentId = slugToId.get(pageInfo.parentSlug);

        if (!pageId || !parentId) {
            console.warn(`⚠️  Не найдены ID для ${pageInfo.slug} или родителя ${pageInfo.parentSlug}`);
            continue;
        }

        try {
            await api.put(`/pages/${pageId}`, {
                data: { parent: parentId }
            });
            updated++;
        } catch (error) {
            console.error(`❌ Ошибка при обновлении parent для ${pageInfo.slug}:`, error.message);
            errors++;
        }
    }

    console.log(`✅ Обновлено parent связей: ${updated}`);
    if (errors > 0) {
        console.log(`❌ Ошибок: ${errors}`);
    }
    console.log('');
}

/**
 * Основная функция
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 МИГРАЦИЯ СТРАНИЦ С DYNAMIC CONTENT В STRAPI');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Загружаем иерархию
    const hierarchy = loadHierarchy();

    // Загружаем нормализованные файлы
    if (!fs.existsSync(NORMALIZED_DIR)) {
        console.error(`❌ Директория не найдена: ${NORMALIZED_DIR}`);
        process.exit(1);
    }

    const normalizedFiles = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📂 Найдено нормализованных файлов: ${normalizedFiles.length}\n`);

    const results = {
        timestamp: new Date().toISOString(),
        total: normalizedFiles.length,
        created: [],
        updated: [],
        failed: [],
        withDynamicContent: 0
    };

    // Мигрируем каждую страницу
    for (let i = 0; i < normalizedFiles.length; i++) {
        const file = normalizedFiles[i];
        const filePath = path.join(NORMALIZED_DIR, file);
        const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const slug = pageData.slug || path.basename(file, '.json');

        process.stdout.write(`\r[${i + 1}/${normalizedFiles.length}] ${slug}...`);

        try {
            if (pageData.dynamicContent) {
                results.withDynamicContent++;
            }

            const result = await createOrUpdatePageInStrapi(pageData, hierarchy);
            
            if (result.action === 'created') {
                results.created.push({ slug, id: result.id });
            } else {
                results.updated.push({ slug, id: result.id });
            }

            // Небольшая задержка, чтобы не перегрузить сервер
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            results.failed.push({
                slug,
                error: error.message,
                response: error.response?.data
            });
            console.error(`\n❌ Ошибка при миграции ${slug}:`, error.message);
        }
    }

    process.stdout.write('\r' + ' '.repeat(80) + '\r');

    console.log('\n✅ Миграция завершена!\n');
    console.log(`📊 Результаты:`);
    console.log(`   - ✅ Создано: ${results.created.length}`);
    console.log(`   - 🔄 Обновлено: ${results.updated.length}`);
    console.log(`   - ❌ Ошибок: ${results.failed.length}`);
    console.log(`   - 📦 С dynamicContent: ${results.withDynamicContent}\n`);

    // Обновляем parent связи
    if (hierarchy && results.created.length + results.updated.length > 0) {
        const allPages = [...results.created, ...results.updated].map(r => ({ slug: r.slug, id: r.id }));
        await updateParentRelations(allPages, hierarchy);
    }

    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');

    // Создаем Markdown отчет
    let md = `# Отчет о миграции страниц с dynamicContent\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${results.total}\n`;
    md += `- **Создано:** ${results.created.length}\n`;
    md += `- **Обновлено:** ${results.updated.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n`;
    md += `- **С dynamicContent:** ${results.withDynamicContent}\n\n`;

    if (results.created.length > 0) {
        md += `## ✅ Созданные страницы\n\n`;
        md += `| Slug | ID |\n`;
        md += `|------|----|\n`;
        results.created.slice(0, 50).forEach(item => {
            md += `| ${item.slug} | ${item.id} |\n`;
        });
        if (results.created.length > 50) {
            md += `\n... и еще ${results.created.length - 50} страниц\n`;
        }
        md += `\n`;
    }

    if (results.updated.length > 0) {
        md += `## 🔄 Обновленные страницы\n\n`;
        md += `| Slug | ID |\n`;
        md += `|------|----|\n`;
        results.updated.slice(0, 50).forEach(item => {
            md += `| ${item.slug} | ${item.id} |\n`;
        });
        if (results.updated.length > 50) {
            md += `\n... и еще ${results.updated.length - 50} страниц\n`;
        }
        md += `\n`;
    }

    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Slug | Ошибка |\n`;
        md += `|------|--------|\n`;
        results.failed.forEach(item => {
            md += `| ${item.slug} | ${item.error} |\n`;
        });
        md += `\n`;
    }

    fs.writeFileSync(REPORT_MD_FILE, md, 'utf-8');

    console.log(`📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${REPORT_MD_FILE}\n`);

    if (results.failed.length > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Критическая ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { main };
