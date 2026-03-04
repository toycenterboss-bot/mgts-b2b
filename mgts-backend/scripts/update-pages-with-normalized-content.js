/**
 * Скрипт для обновления страниц в Strapi с нормализованным контентом через API
 * Использует API токен из docs/project/CONTEXT.md
 * 
 * Использование:
 *   node scripts/update-pages-with-normalized-content.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { JSDOM } = require('jsdom');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Читаем токен из контекста
function getApiToken() {
    const contextPath = path.join(__dirname, '../../docs/project/CONTEXT.md');
    if (fs.existsSync(contextPath)) {
        const context = fs.readFileSync(contextPath, 'utf-8');
        const patterns = [
            /export STRAPI_API_TOKEN="([^"]+)"/i,
            /STRAPI_API_TOKEN[:\s=]+([a-zA-Z0-9]{200,})/i,
            /STRAPI_API_TOKEN[:\s=]+([^\s\n]+)/i,
        ];
        for (const pattern of patterns) {
            const tokenMatch = context.match(pattern);
            if (tokenMatch && tokenMatch[1]) {
                return tokenMatch[1].trim();
            }
        }
    }
    return process.env.STRAPI_API_TOKEN || '';
}

const API_TOKEN = getApiToken();

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    console.error('   Токен должен быть в docs/project/CONTEXT.md или переменной окружения STRAPI_API_TOKEN\n');
    process.exit(1);
}

const http = require('http');
const https = require('https');

// Создаем кастомные агенты с принудительным использованием IPv4
const httpAgent = new http.Agent({
    family: 4,
    keepAlive: false, // Отключаем keepAlive для предотвращения проблем с соединением
    maxSockets: 50
});

const httpsAgent = new https.Agent({
    family: 4,
    keepAlive: false,
    maxSockets: 50
});

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 30000,
    httpAgent: httpAgent,
    httpsAgent: httpsAgent
});

// Режимы работы
const DRY_RUN = process.env.DRY_RUN === 'true';
const TEST_PAGES = process.env.TEST_PAGES ? process.env.TEST_PAGES.split(',') : null;

// Пути к файлам
const possiblePaths = [
    path.join(__dirname, '../../temp/services-extraction'),
    path.join(__dirname, '../temp/services-extraction'),
    '/Users/andrey_efremov/Downloads/runs/temp/services-extraction'
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
    process.exit(1);
}

const NORMALIZED_DIR = path.join(OUTPUT_DIR, 'pages-content-normalized');
const HIERARCHY_FILE = path.join(OUTPUT_DIR, 'pages-hierarchy.json');

/**
 * Загрузить иерархию страниц
 */
function loadHierarchy() {
    if (!fs.existsSync(HIERARCHY_FILE)) {
        console.warn('⚠️  Файл иерархии не найден');
        return null;
    }
    return JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
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
        case 'document-tabs':
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
        case 'service-tabs':
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
        case 'history-tabs':
            if (!tabs || tabs.length === 0) return '';
            let historyTabsHTML = '<section class="history-tabs">';
            if (title) {
                historyTabsHTML += `<h2 class="history-tabs__title">${title}</h2>`;
            }
            historyTabsHTML += '<div class="history-tabs__tabs">';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                historyTabsHTML += `<button class="history-tabs__tab-button ${isActive}" data-tab-index="${index}">${tab.name || `Таб ${index + 1}`}</button>`;
            });
            historyTabsHTML += '</div>';
            tabs.forEach((tab, index) => {
                const isActive = index === (dynamicContent.defaultTab || 0) ? 'active' : '';
                historyTabsHTML += `<div class="history-tabs__tab-content ${isActive}" data-tab-index="${index}">${tab.content || ''}</div>`;
            });
            historyTabsHTML += '</section>';
            return historyTabsHTML;

        case 'carousel':
            if (!items || items.length === 0) return '';
            let carouselHTML = '<section class="image-carousel"><div class="image-carousel__slider">';
            items.forEach((item, index) => {
                carouselHTML += `<div class="image-carousel__slide ${index === 0 ? 'active' : ''}" data-slide-index="${index}">${item.content || ''}</div>`;
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
            'document-tabs': ['section-text', 'service-order-form'],
            'service_tabs': ['section-cards', 'service-order-form'],
            'service-tabs': ['section-cards', 'service-order-form'],
            'history_tabs': ['hero', 'section-text'],
            'history-tabs': ['hero', 'section-text'],
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

        if (sections.length > 0) {
            return { type: 'end', lastSection: sections[sections.length - 1] };
        }

        return null;
    } catch (error) {
        console.warn(`⚠️  Ошибка при поиске места вставки: ${error.message}`);
        return null;
    }
}

/**
 * Вставить dynamicContent в нормализованный HTML в правильное место
 */
function insertDynamicContent(normalizedHTML, dynamicContent) {
    if (!dynamicContent || !dynamicContent.type) {
        return normalizedHTML || '';
    }

    const dynamicHTML = dynamicContentToHTML(dynamicContent);
    if (!dynamicHTML) {
        return normalizedHTML || '';
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
 * Получить страницу по slug
 */
async function getPageBySlug(slug) {
    try {
        const encodedSlug = encodeURIComponent(slug);
        const response = await api.get(`/pages`, {
            params: {
                'filters[slug][$eq]': slug,
                'populate': '*'
            }
        });
        
        if (response.data && response.data.data && response.data.data.length > 0) {
            return response.data.data[0];
        }
        return null;
    } catch (error) {
        console.error(`   ❌ Ошибка при получении страницы ${slug}:`, error.response?.data?.error?.message || error.message);
        return null;
    }
}

/**
 * Обновить страницу в Strapi через API
 */
async function updatePageInStrapi(pageData, hierarchy) {
    try {
        const hierarchyInfo = hierarchy?.flat?.find(p => p.slug === pageData.slug);
        const section = normalizeSection(hierarchyInfo?.section || pageData.section);
        
        let finalHTML = pageData.normalizedHTML || pageData.content || '';
        const htmlBeforeInsertion = finalHTML.length;
        let insertionInfo = null;
        
        if (pageData.dynamicContent) {
            console.log(`   📋 Динамический контент найден: тип "${pageData.dynamicContent.type}"`);
            insertionInfo = findInsertionPoint(finalHTML, pageData.dynamicContent.type);
            if (insertionInfo) {
                console.log(`   📍 Место вставки: ${insertionInfo.type} (${insertionInfo.type === 'between' ? `${insertionInfo.beforeIndex}-${insertionInfo.afterIndex}` : insertionInfo.type === 'end' ? 'в конец' : `индекс ${insertionInfo.index}`})`);
            } else {
                console.log(`   ⚠️  Место вставки не найдено, будет добавлено в конец`);
            }
            finalHTML = insertDynamicContent(finalHTML, pageData.dynamicContent);
            const htmlAfterInsertion = finalHTML.length;
            console.log(`   ✅ HTML обновлен: ${htmlBeforeInsertion} → ${htmlAfterInsertion} символов (+${htmlAfterInsertion - htmlBeforeInsertion})`);
        } else {
            console.log(`   ℹ️  Динамический контент отсутствует`);
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

        // Получаем существующую страницу
        const existingPage = await getPageBySlug(pageData.slug);
        
        if (existingPage) {
            const pageId = existingPage.documentId || existingPage.id;
            if (DRY_RUN) {
                console.log(`   🔍 DRY RUN: Обновление страницы ${pageData.slug} (ID: ${pageId})`);
                console.log(`   📄 Длина контента: ${pagePayload.content.length} символов`);
                if (insertionInfo) {
                    console.log(`   ✓ Место вставки динамического контента определено корректно\n`);
                }
                return { action: 'updated', id: pageId, data: pagePayload };
            }
            
            const response = await api.put(`/pages/${pageId}`, {
                data: pagePayload
            });
            
            return { action: 'updated', id: pageId, data: response.data };
        } else {
            if (DRY_RUN) {
                console.log(`   🔍 DRY RUN: Создание страницы ${pageData.slug}`);
                return { action: 'created', id: null, data: pagePayload };
            }
            
            const response = await api.post(`/pages`, {
                data: pagePayload
            });
            
            return { action: 'created', id: response.data.data?.documentId || response.data.data?.id, data: response.data };
        }
    } catch (error) {
        const pageId = pageData.documentId || pageData.id;
        const slug = pageData.slug || `page-${pageId}`;
        if (error.response?.status === 404) {
            console.error(`   ❌ Страница ${slug} (ID: ${pageId}) не найдена в Strapi`);
        } else {
            console.error(`   ❌ Ошибка при обновлении страницы ${slug}:`, error.response?.data?.error?.message || error.message);
        }
        throw error;
    }
}

/**
 * Форматирование прогресса
 */
function formatProgress(current, total, width = 40) {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = Math.max(0, width - filled);
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(empty);
    return `[${bar}] ${current}/${total} (${percent}%)`;
}

/**
 * Основная функция
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 ОБНОВЛЕНИЕ СТРАНИЦ В STRAPI С НОРМАЛИЗОВАННЫМ КОНТЕНТОМ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (DRY_RUN) {
        console.log('⚠️  РЕЖИМ ТЕСТИРОВАНИЯ (DRY_RUN): изменения не будут сохранены\n');
    }
    
    console.log(`📁 Директория с нормализованными файлами: ${NORMALIZED_DIR}`);
    console.log(`🔗 Strapi URL: ${STRAPI_URL}`);
    console.log(`🔑 API токен: ${API_TOKEN.substring(0, 20)}...${API_TOKEN.substring(API_TOKEN.length - 10)}\n`);

    // Проверка подключения к Strapi
    try {
        console.log('🔍 Проверка подключения к Strapi...');
        const testResponse = await api.get('/pages', {
            params: {
                'pagination[pageSize]': 1
            }
        });
        console.log(`✅ Подключение успешно (статус: ${testResponse.status})\n`);
    } catch (error) {
        console.error(`❌ Ошибка подключения к Strapi: ${error.response?.status || error.code}`);
        console.error(`   Сообщение: ${error.response?.data?.error?.message || error.message}`);
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.error(`\n   ⚠️  Проблема с авторизацией! Проверьте API токен в docs/project/CONTEXT.md`);
        }
        process.exit(1);
    }

    // Загружаем иерархию
    const hierarchy = loadHierarchy();
    if (hierarchy) {
        console.log(`✅ Загружена иерархия для ${hierarchy.totalPages || hierarchy.flat?.length || 0} страниц\n`);
    }

    // Загружаем нормализованные файлы
    if (!fs.existsSync(NORMALIZED_DIR)) {
        console.error(`❌ Директория не найдена: ${NORMALIZED_DIR}`);
        process.exit(1);
    }

    const normalizedFiles = fs.readdirSync(NORMALIZED_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    
    let filesToProcess = normalizedFiles;
    if (TEST_PAGES) {
        filesToProcess = normalizedFiles.filter(f => TEST_PAGES.includes(f));
        console.log(`📋 Режим тестирования: обработка только ${filesToProcess.length} страниц из ${TEST_PAGES.length} указанных\n`);
    }

    console.log(`📂 Найдено нормализованных файлов: ${filesToProcess.length}\n`);

    const results = {
        timestamp: new Date().toISOString(),
        total: filesToProcess.length,
        updated: 0,
        created: 0,
        errors: 0,
        details: []
    };

    // Обрабатываем каждый файл
    for (let i = 0; i < filesToProcess.length; i++) {
        const slug = filesToProcess[i];
        process.stdout.write(`\r${formatProgress(i, filesToProcess.length)} [${slug}]`);
        
        try {
            const filePath = path.join(NORMALIZED_DIR, `${slug}.json`);
            if (!fs.existsSync(filePath)) {
                console.error(`\n   ⚠️  Файл не найден: ${slug}.json`);
                results.errors++;
                continue;
            }

            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const result = await updatePageInStrapi(pageData, hierarchy);
            
            if (result.action === 'updated') {
                results.updated++;
            } else if (result.action === 'created') {
                results.created++;
            }
            
            results.details.push({
                slug,
                action: result.action,
                id: result.id,
                hasDynamicContent: !!pageData.dynamicContent
            });
            
        } catch (error) {
            results.errors++;
            results.details.push({
                slug,
                action: 'error',
                error: error.message
            });
        }
        
        // Небольшая задержка
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Финальный отчет
    console.log(`\n\n${formatProgress(filesToProcess.length, filesToProcess.length)}`);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 ИТОГИ ОБНОВЛЕНИЯ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`✅ Обновлено: ${results.updated}`);
    console.log(`🆕 Создано: ${results.created}`);
    console.log(`❌ Ошибок: ${results.errors}`);
    console.log(`📋 Всего: ${results.total}\n`);
    
    if (results.errors > 0) {
        console.log('⚠️  Страницы с ошибками:');
        results.details
            .filter(d => d.action === 'error')
            .forEach(d => console.log(`   - ${d.slug}: ${d.error}`));
        console.log('');
    }
    
    // Сохраняем отчет
    const reportPath = path.join(OUTPUT_DIR, `update-pages-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📄 Отчет сохранен: ${reportPath}\n`);
}

// Запуск
main().catch(error => {
    console.error('\n❌ Критическая ошибка:', error.message);
    process.exit(1);
});
