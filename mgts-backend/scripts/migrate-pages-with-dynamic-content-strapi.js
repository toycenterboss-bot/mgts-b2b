/**
 * Скрипт для миграции нормализованных страниц в Strapi через entityService
 * Запускается внутри контекста Strapi (через console)
 * 
 * Использование:
 *   npm run strapi console
 *   .load scripts/migrate-pages-with-dynamic-content-strapi.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

module.exports = async ({ strapi }) => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 МИГРАЦИЯ СТРАНИЦ С DYNAMIC CONTENT В STRAPI');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Пути к файлам (относительно корня проекта runs/)
    const possiblePaths = [
        path.join(process.cwd(), '../../temp/services-extraction'), // Из mgts-backend/
        path.join(process.cwd(), '../temp/services-extraction'),    // Альтернативный путь
        path.join(process.cwd(), 'temp/services-extraction'),       // Если запущено из корня
        '/Users/andrey_efremov/Downloads/runs/temp/services-extraction' // Абсолютный путь
    ];
    
    let OUTPUT_DIR = null;
    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            OUTPUT_DIR = possiblePath;
            break;
        }
    }
    
    if (!OUTPUT_DIR) {
        console.error(`❌ Директория с данными не найдена. Проверенные пути:`, possiblePaths);
        return;
    }
    
    const NORMALIZED_DIR = path.join(OUTPUT_DIR, 'pages-content-normalized');
    const HIERARCHY_FILE = path.join(OUTPUT_DIR, 'pages-hierarchy.json');
    const REPORT_FILE = path.join(OUTPUT_DIR, 'migration-with-dynamic-report.json');

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
     */
    function findInsertionPoint(normalizedHTML, dynamicContentType) {
        if (!normalizedHTML) return null;

        try {
            const dom = new JSDOM(normalizedHTML);
            const doc = dom.window.document;
            const sections = Array.from(doc.querySelectorAll('section'));

            const insertionMarkers = {
                'accordion': ['service-tariffs', 'service-order-form'],
                'document_tabs': ['section-text', 'service-order-form'],
                'service_tabs': ['section-cards', 'service-order-form'],
                'history_tabs': ['hero', 'section-text'],
                'carousel': ['hero', 'section-cards']
            };

            const markers = insertionMarkers[dynamicContentType] || ['service-tariffs', 'service-order-form'];
            const [beforeMarker, afterMarker] = markers;

            let beforeIndex = -1;
            for (let i = 0; i < sections.length; i++) {
                const classes = sections[i].className.split(' ');
                if (classes.includes(beforeMarker)) {
                    beforeIndex = i;
                    break;
                }
            }

            let afterIndex = -1;
            for (let i = 0; i < sections.length; i++) {
                const classes = sections[i].className.split(' ');
                if (classes.includes(afterMarker)) {
                    afterIndex = i;
                    break;
                }
            }

            if (beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex) {
                return { type: 'between', beforeIndex, afterIndex, beforeSection: sections[beforeIndex], afterSection: sections[afterIndex] };
            }

            if (beforeIndex >= 0) {
                return { type: 'after', index: beforeIndex, section: sections[beforeIndex] };
            }

            if (afterIndex >= 0) {
                return { type: 'before', index: afterIndex, section: sections[afterIndex] };
            }

            const orderFormIndex = sections.findIndex(s => s.className.includes('service-order-form'));
            if (orderFormIndex >= 0) {
                return { type: 'before', index: orderFormIndex, section: sections[orderFormIndex] };
            }

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
            return normalizedHTML + dynamicHTML;
        }

        try {
            const dom = new JSDOM(normalizedHTML);
            const doc = dom.window.document;
            const sections = Array.from(doc.querySelectorAll('section'));

            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = dynamicHTML;
            const newSection = tempDiv.querySelector('section');
            if (!newSection) {
                return normalizedHTML + dynamicHTML;
            }

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
                const lastSection = sections[sections.length - 1];
                lastSection.parentNode.appendChild(newSection);
            }

            return doc.body.innerHTML;
        } catch (error) {
            console.warn(`⚠️  Ошибка при вставке dynamicContent: ${error.message}`);
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
            const hierarchyInfo = hierarchy?.flat?.find(p => p.slug === pageData.slug);
            const section = normalizeSection(hierarchyInfo?.section || pageData.section);
            
            let finalHTML = pageData.normalizedHTML || '';
            if (pageData.dynamicContent) {
                finalHTML = insertDynamicContent(finalHTML, pageData.dynamicContent);
            }

            const pagePayload = {
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
            };

            // Проверяем, существует ли страница
            const existing = await strapi.entityService.findMany('api::page.page', {
                filters: { slug: pageData.slug },
                limit: 1
            });

            if (existing && existing.length > 0) {
                const pageId = existing[0].id;
                const updated = await strapi.entityService.update('api::page.page', pageId, {
                    data: pagePayload
                });
                return { action: 'updated', data: updated, id: pageId };
            } else {
                const created = await strapi.entityService.create('api::page.page', {
                    data: pagePayload
                });
                return { action: 'created', data: created, id: created.id };
            }
        } catch (error) {
            console.error(`❌ Ошибка при создании/обновлении страницы ${pageData.slug}:`, error.message);
            throw error;
        }
    }

    // Загружаем иерархию
    const hierarchy = loadHierarchy();

    // Загружаем нормализованные файлы
    if (!fs.existsSync(NORMALIZED_DIR)) {
        console.error(`❌ Директория не найдена: ${NORMALIZED_DIR}`);
        return;
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

        // Пропускаем index.json если slug пустой
        if (!slug || slug === 'undefined') {
            console.log(`⚠️  Пропускаем ${file}: нет slug`);
            continue;
        }

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
        } catch (error) {
            results.failed.push({
                slug,
                error: error.message
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

    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📄 Отчет сохранен: ${REPORT_FILE}\n`);

    if (results.failed.length > 0) {
        console.log('❌ Ошибки:');
        results.failed.slice(0, 10).forEach(item => {
            console.log(`   - ${item.slug}: ${item.error}`);
        });
        if (results.failed.length > 10) {
            console.log(`   ... и еще ${results.failed.length - 10} ошибок`);
        }
    }
};
