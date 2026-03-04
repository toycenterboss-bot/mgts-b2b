/**
 * Скрипт для обновления межстраничных ссылок в контенте страниц
 * Заменяет старые URL (https://business.mgts.ru/...) на новые относительные пути
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

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const HIERARCHY_FILE = path.join(__dirname, '../../temp/services-extraction/pages-hierarchy.json');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/internal-links-update-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/INTERNAL_LINKS_UPDATE_REPORT.md');

/**
 * Построить полный путь к странице на основе slug и иерархии
 */
function buildPagePath(slug, hierarchy) {
    if (!hierarchy || hierarchy.length === 0) {
        // Если иерархия не загружена, используем простой путь
        if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            return '/index.html';
        }
        return `/${slug}/index.html`;
    }
    
    const page = hierarchy.find(p => p.slug === slug);
    if (!page) {
        // Страница не найдена в иерархии, используем простой путь
        if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            return '/index.html';
        }
        return `/${slug}/index.html`;
    }
    
    // Главная страница
    if (!page.parentSlug) {
        if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            return '/index.html';
        }
        return `/${slug}/index.html`;
    }
    
    // Строим путь с учетом полной иерархии от корня до текущей страницы
    const pathParts = [];
    
    // Строим цепочку от корня к текущей странице
    const buildParentChain = (currentSlug, visited = new Set()) => {
        if (visited.has(currentSlug)) {
            return; // Предотвращаем циклы
        }
        visited.add(currentSlug);
        
        const parentPage = hierarchy.find(p => p.slug === currentSlug);
        if (!parentPage || !parentPage.parentSlug) {
            // Дошли до корня или страница не найдена
            return;
        }
        
        // Рекурсивно добавляем родителя
        buildParentChain(parentPage.parentSlug, visited);
        // Добавляем родителя в путь (избегаем дубликатов)
        if (!pathParts.includes(parentPage.parentSlug)) {
            pathParts.push(parentPage.parentSlug);
        }
    };
    
    // Строим цепочку родителей
    buildParentChain(slug);
    
    // Добавляем текущий slug в конец
    if (!pathParts.includes(slug)) {
        pathParts.push(slug);
    }
    
    return '/' + pathParts.join('/') + '/index.html';
}

/**
 * Создать карту старых URL -> новых путей (с учетом иерархии)
 */
function createUrlToSlugMap(pages, hierarchy = []) {
    const urlMap = new Map();
    
    pages.forEach(page => {
        const oldUrl = page.originalUrl || page.url || '';
        const slug = page.slug || '';
        
        if (oldUrl && slug) {
            // Строим новый путь с учетом иерархии
            const newPath = buildPagePath(slug, hierarchy);
            
            // Добавляем различные варианты URL
            const urlVariants = [
                oldUrl, // Полный URL
                oldUrl.replace('https://business.mgts.ru', ''), // Без домена
                oldUrl.replace('https://', ''), // Без протокола
                oldUrl.replace('http://', ''), // Без протокола http
                oldUrl.replace('https://business.mgts.ru/', ''), // Только путь
                oldUrl.replace('https://business.mgts.ru', '').replace(/^\/+/, ''), // Без домена и начального слэша
            ];
            
            urlVariants.forEach(variant => {
                if (variant) {
                    urlMap.set(variant, newPath);
                    urlMap.set(variant + '/', newPath);
                    urlMap.set('/' + variant, newPath);
                    urlMap.set('/' + variant + '/', newPath);
                    // Также добавляем вариант без начального слэша
                    if (variant.startsWith('/')) {
                        urlMap.set(variant.substring(1), newPath);
                    }
                }
            });
            
            // Также добавляем slug как ключ для прямого поиска
            urlMap.set(slug, newPath);
            urlMap.set('/' + slug, newPath);
            urlMap.set('/' + slug + '/', newPath);
            
            // Добавляем варианты с префиксами разделов
            const sectionPrefixes = ['business', 'operators', 'government', 'developers', 'partners', 'about_mgts'];
            sectionPrefixes.forEach(prefix => {
                const prefixedSlug = `${prefix}/${slug}`;
                urlMap.set(prefixedSlug, newPath);
                urlMap.set('/' + prefixedSlug, newPath);
                urlMap.set('/' + prefixedSlug + '/', newPath);
            });
            
            // Добавляем варианты из originalUrl (если есть вложенные пути)
            if (oldUrl.includes('/')) {
                const urlParts = oldUrl.replace('https://business.mgts.ru', '').replace('http://business.mgts.ru', '').split('/').filter(p => p);
                if (urlParts.length > 0) {
                    // Добавляем полный путь из URL
                    const fullPath = '/' + urlParts.join('/');
                    urlMap.set(fullPath, newPath);
                    urlMap.set(fullPath + '/', newPath);
                    // Добавляем варианты без первого сегмента (раздела), если есть несколько сегментов
                    if (urlParts.length > 1) {
                        const withoutSection = '/' + urlParts.slice(1).join('/');
                        urlMap.set(withoutSection, newPath);
                        urlMap.set(withoutSection + '/', newPath);
                        // Добавляем последний сегмент как slug
                        const lastPart = urlParts[urlParts.length - 1];
                        if (lastPart === slug) {
                            urlMap.set(lastPart, newPath);
                            urlMap.set('/' + lastPart, newPath);
                            urlMap.set('/' + lastPart + '/', newPath);
                        }
                    }
                }
            }
        }
    });
    
    return urlMap;
}

/**
 * Обновить ссылки в HTML контенте
 */
function updateLinksInContent(content, urlMap, pageSlug) {
    if (!content || typeof content !== 'string') {
        return { updated: false, content: content, changes: [] };
    }
    
    // JSDOM требует полный HTML документ, поэтому оборачиваем контент если нужно
    let wrappedContent = content.trim();
    if (!wrappedContent.startsWith('<!DOCTYPE') && !wrappedContent.startsWith('<html')) {
        wrappedContent = `<!DOCTYPE html><html><body>${wrappedContent}</body></html>`;
    }
    
    const dom = new JSDOM(wrappedContent);
    const doc = dom.window.document;
    const changes = [];
    let hasChanges = false;
    let debugInfo = [];
    
    // Обновляем все ссылки <a href="...">
    const links = doc.querySelectorAll('a[href]');
    links.forEach(link => {
        const oldHref = link.getAttribute('href');
        if (!oldHref) return;
        
        // Пропускаем внешние ссылки и якоря
        if (oldHref.startsWith('http://') || oldHref.startsWith('https://')) {
            if (!oldHref.includes('business.mgts.ru')) {
                return; // Внешняя ссылка
            }
        }
        
        if (oldHref.startsWith('#')) {
            return; // Якорь
        }
        
        if (oldHref.startsWith('mailto:') || oldHref.startsWith('tel:')) {
            return; // Специальные ссылки
        }
        
        // Ищем соответствие в карте
        let newHref = null;
        
        // Пробуем разные варианты
        const variants = [
            oldHref,
            oldHref.replace('https://business.mgts.ru', ''),
            oldHref.replace('https://business.mgts.ru/', ''),
            oldHref.replace('http://business.mgts.ru', ''),
            oldHref.replace('http://business.mgts.ru/', ''),
            oldHref.startsWith('/') ? oldHref : '/' + oldHref,
            // Убираем начальный слэш для поиска
            oldHref.startsWith('/') ? oldHref.substring(1) : oldHref,
            // Пробуем найти по последней части пути
            oldHref.split('/').filter(p => p).pop() || oldHref
        ];
        
        // Убираем дубликаты из вариантов
        const uniqueVariants = [...new Set(variants.filter(v => v))];
        
        for (const variant of uniqueVariants) {
            if (urlMap.has(variant)) {
                newHref = urlMap.get(variant);
                break;
            }
        }
        
        // Если не нашли в первых вариантах, пробуем найти по полному пути с префиксами разделов
        if (!newHref && oldHref.startsWith('/') && oldHref.includes('/')) {
            // Пробуем найти по полному пути
            const cleanPath = oldHref.replace(/^\/+/, '').replace(/\/+$/, '');
            if (urlMap.has(cleanPath)) {
                newHref = urlMap.get(cleanPath);
            } else if (urlMap.has('/' + cleanPath)) {
                newHref = urlMap.get('/' + cleanPath);
            } else if (urlMap.has('/' + cleanPath + '/')) {
                newHref = urlMap.get('/' + cleanPath + '/');
            }
        }
        
        // Если не нашли, пробуем найти по slug (последняя часть пути)
        if (!newHref && oldHref.includes('/')) {
            const pathParts = oldHref.split('/').filter(p => p && p !== 'business' && p !== 'operators' && p !== 'government' && p !== 'developers' && p !== 'partners' && p !== 'about_mgts');
            if (pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];
                // Ищем страницу с таким slug в карте
                for (const [url, slugPath] of urlMap.entries()) {
                    // Проверяем, содержит ли URL или путь последнюю часть
                    if (url === lastPart || url.endsWith('/' + lastPart) || url.endsWith('/' + lastPart + '/')) {
                        newHref = slugPath;
                        break;
                    }
                    // Также проверяем slugPath
                    if (slugPath.includes('/' + lastPart + '/index.html') || slugPath === '/' + lastPart + '/index.html') {
                        newHref = slugPath;
                        break;
                    }
                }
            }
        }
        
        // Если все еще не нашли и это относительный путь, пробуем найти по последней части как slug
        if (!newHref && oldHref.startsWith('/') && !oldHref.startsWith('//')) {
            const cleanPath = oldHref.replace(/^\/+/, '').replace(/\/+$/, '');
            const pathParts = cleanPath.split('/');
            if (pathParts.length > 0) {
                const potentialSlug = pathParts[pathParts.length - 1];
                // Прямой поиск по slug
                const slugPath = `/${potentialSlug}/index.html`;
                // Проверяем, существует ли такая страница в карте
                for (const [url, mappedPath] of urlMap.entries()) {
                    if (mappedPath === slugPath || url === potentialSlug || url.endsWith('/' + potentialSlug)) {
                        newHref = slugPath;
                        break;
                    }
                }
            }
        }
        
        if (newHref && newHref !== oldHref) {
            link.setAttribute('href', newHref);
            changes.push({
                type: 'link',
                old: oldHref,
                new: newHref
            });
            hasChanges = true;
            debugInfo.push(`✅ ${oldHref} → ${newHref}`);
        } else if (!newHref && oldHref && !oldHref.startsWith('mailto:') && !oldHref.startsWith('tel:') && !oldHref.startsWith('#') && !(oldHref.startsWith('http://') || oldHref.startsWith('https://'))) {
            // Внутренняя ссылка, которая не была найдена в карте
            debugInfo.push(`❌ Не найдено: ${oldHref}`);
        }
    });
    
    // Обновляем ссылки в формах <form action="...">
    const forms = doc.querySelectorAll('form[action]');
    forms.forEach(form => {
        const oldAction = form.getAttribute('action');
        if (!oldAction) return;
        
        // Пропускаем внешние ссылки
        if (oldAction.startsWith('http://') || oldAction.startsWith('https://')) {
            if (!oldAction.includes('business.mgts.ru')) {
                return;
            }
        }
        
        let newAction = null;
        const variants = [
            oldAction,
            oldAction.replace('https://business.mgts.ru', ''),
            oldAction.replace('https://business.mgts.ru/', ''),
        ];
        
        for (const variant of variants) {
            if (urlMap.has(variant)) {
                newAction = urlMap.get(variant);
                break;
            }
        }
        
        if (newAction && newAction !== oldAction) {
            form.setAttribute('action', newAction);
            changes.push({
                type: 'form',
                old: oldAction,
                new: newAction
            });
            hasChanges = true;
        }
    });
    
        // Получаем обновленный контент
        let updatedContent;

        // Если контент был обернут в body, извлекаем его содержимое
        const body = doc.body;
        if (body && body.children.length > 0) {
            // Если body содержит элементы, берем innerHTML
            updatedContent = body.innerHTML;
        } else if (body) {
            // Если body пустой, но существует, берем его содержимое
            updatedContent = body.innerHTML;
        } else {
            // Если body нет, используем весь документ и извлекаем содержимое
            const htmlContent = dom.serialize();
            // Пытаемся извлечь содержимое между body тегами
            const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                updatedContent = bodyMatch[1];
            } else {
                // Если body тегов нет, убираем html/head теги
                updatedContent = htmlContent.replace(/^[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
                updatedContent = updatedContent.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
                updatedContent = updatedContent.replace(/^[\s\S]*?<head[^>]*>[\s\S]*?<\/head>/, '');
            }
        }

        // Отладочная информация (только для первых нескольких страниц)
        if (hasChanges && changes.length > 0) {
            // console.log(`[DEBUG] ${pageSlug}: Обновлено ${changes.length} ссылок`);
        } else if (!hasChanges && debugInfo.length > 0 && debugInfo.length <= 5) {
            // Логируем только если есть внутренние ссылки, которые не были найдены
            // console.log(`[DEBUG] ${pageSlug}: ${debugInfo.join(', ')}`);
        }

        return {
            updated: hasChanges,
            content: updatedContent,
            changes: changes,
            debugInfo: debugInfo
        };
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔗 Обновление межстраничных ссылок\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем иерархию страниц для построения правильных путей
    let hierarchy = [];
    if (fs.existsSync(HIERARCHY_FILE)) {
        const hierarchyData = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
        hierarchy = hierarchyData.flat || [];
        console.log(`📂 Загружена иерархия из pages-hierarchy.json (${hierarchy.length} страниц)\n`);
    } else {
        console.log(`⚠️  Файл иерархии не найден: ${HIERARCHY_FILE}\n`);
        console.log(`   Пути будут построены без учета иерархии\n`);
    }
    
    // Загружаем все нормализованные страницы для создания карты URL -> slug
    const normalizedFiles = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📦 Загружено нормализованных файлов: ${normalizedFiles.length}\n`);
    
    const pages = normalizedFiles.map(file => {
        const filePath = path.join(NORMALIZED_DIR, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
    
    // Создаем карту URL -> путь (с учетом иерархии)
    const urlMap = createUrlToSlugMap(pages, hierarchy);
    console.log(`✅ Создана карта URL -> путь: ${urlMap.size} записей\n`);
    
    // Сначала проверим нормализованные файлы на наличие ссылок
    console.log('🔍 Проверка нормализованных файлов на наличие ссылок...\n');
    let totalLinksInFiles = 0;
    const filesWithLinks = [];
    
    normalizedFiles.forEach(file => {
        try {
            const filePath = path.join(NORMALIZED_DIR, file);
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const html = pageData.normalizedHTML || '';
            
            if (html) {
                const linkMatches = html.match(/<a[^>]*href=['"]([^'"]+)['"][^>]*>/gi) || [];
                if (linkMatches.length > 0) {
                    totalLinksInFiles += linkMatches.length;
                    filesWithLinks.push({
                        file: file,
                        linksCount: linkMatches.length,
                        sampleLinks: linkMatches.slice(0, 3).map(m => {
                            const hrefMatch = m.match(/href=['"]([^'"]+)['"]/i);
                            return hrefMatch ? hrefMatch[1] : '';
                        }).filter(l => l) // Убираем пустые
                    });
                }
            }
        } catch (error) {
            console.error(`Ошибка при обработке файла ${file}:`, error.message);
        }
    });
    
    console.log(`📊 Найдено ссылок в нормализованных файлах: ${totalLinksInFiles}`);
    if (filesWithLinks.length > 0) {
        console.log(`📄 Файлов со ссылками: ${filesWithLinks.length}`);
        console.log(`\nПримеры файлов со ссылками:`);
        filesWithLinks.slice(0, 5).forEach(f => {
            console.log(`   - ${f.file}: ${f.linksCount} ссылок`);
            f.sampleLinks.forEach(link => {
                if (link) console.log(`     → ${link.substring(0, 60)}`);
            });
        });
    }
    console.log('\n');
    
    // Загружаем все страницы из Strapi
    let allStrapiPages = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const response = await api.get('/pages', {
            params: {
                'pagination[page]': page,
                'pagination[pageSize]': 100,
                'publicationState': 'preview', // Получаем и опубликованные, и неопубликованные
                'locale': 'all' // Получаем все локали
            }
        });
        
        // В Strapi v5 структура может быть response.data.data или response.data
        const strapiPages = response.data.data || response.data || [];
        allStrapiPages = allStrapiPages.concat(Array.isArray(strapiPages) ? strapiPages : [strapiPages]);
        
        const pagination = response.data.meta?.pagination;
        if (pagination && page < pagination.pageCount) {
            page++;
        } else {
            hasMore = false;
        }
    }
    
    console.log(`📦 Загружено страниц из Strapi: ${allStrapiPages.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        total: normalizedFiles.length,
        updated: [],
        failed: [],
        skipped: [],
        totalChanges: 0,
        linksFoundInFiles: totalLinksInFiles,
        filesWithLinks: filesWithLinks.length,
        strapiPagesCount: allStrapiPages.length
    };
    
    // Создаем карту slug -> Strapi page для быстрого доступа
    const slugToStrapiPage = new Map();
    allStrapiPages.forEach(page => {
        // В Strapi v5 поля могут быть напрямую в объекте, не в attributes
        const slug = page.slug || page.attributes?.slug || (page.data && (page.data.slug || page.data.attributes?.slug));
        // Используем documentId если есть (Strapi v5), иначе id
        const pageId = page.documentId || page.id || (page.data && (page.data.documentId || page.data.id));
        if (slug && pageId) {
            slugToStrapiPage.set(slug, {
                id: pageId,
                documentId: page.documentId || (page.data && page.data.documentId),
                numericId: page.id || (page.data && page.data.id),
                page: page
            });
        }
    });
    
    console.log(`📋 Создана карта slug -> Strapi page: ${slugToStrapiPage.size} записей\n`);
    
    // Обновляем каждую страницу, используя контент из нормализованных файлов
    for (let i = 0; i < normalizedFiles.length; i++) {
        const file = normalizedFiles[i];
        const filePath = path.join(NORMALIZED_DIR, file);
        
        try {
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const pageSlug = pageData.slug || path.basename(file, '.json');
            
            // Используем контент из нормализованного файла (там есть ссылки)
            const content = pageData.normalizedHTML || '';
            
            if (!content || typeof content !== 'string') {
                results.skipped.push({
                    slug: pageSlug,
                    reason: 'Нет normalizedHTML или контент не строка'
                });
                continue;
            }
            
            // Проверяем наличие ссылок в контенте перед обработкой
            const linksInContent = (content.match(/<a[^>]*href=['"]([^'"]+)['"][^>]*>/gi) || []).length;
            
            // Находим соответствующую страницу в Strapi
            const strapiPageInfo = slugToStrapiPage.get(pageSlug);
            if (!strapiPageInfo) {
                results.failed.push({
                    slug: pageSlug,
                    error: 'Страница не найдена в Strapi'
                });
                continue;
            }
            
            // В Strapi v5 используем documentId для обновления, если есть
            const pageId = strapiPageInfo.documentId || strapiPageInfo.numericId || strapiPageInfo.id;
            
            console.log(`[${i + 1}/${normalizedFiles.length}] ${pageSlug}...`);
            if (linksInContent > 0) {
                console.log(`   🔗 Найдено ссылок в normalizedHTML: ${linksInContent}`);
            }
            
            const updateResult = updateLinksInContent(content, urlMap, pageSlug);
            
            // Отладочная информация для первых нескольких страниц со ссылками
            if (linksInContent > 0 && i < 15) {
                console.log(`   [DEBUG] updateResult.updated: ${updateResult.updated}, changes.length: ${updateResult.changes.length}`);
                if (updateResult.changes.length > 0) {
                    console.log(`   [DEBUG] Первые изменения:`, JSON.stringify(updateResult.changes.slice(0, 2), null, 2));
                }
            }
            
            if (updateResult.updated) {
                try {
                    // Извлекаем только body из обновленного контента (если он был обернут)
                    let updatedContent = updateResult.content;
                    if (updatedContent.includes('<body>')) {
                        const bodyMatch = updatedContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                        if (bodyMatch) {
                            updatedContent = bodyMatch[1];
                        }
                    }
                    
                    // ВАЖНО: Сохраняем обновленный normalizedHTML обратно в JSON файл
                    pageData.normalizedHTML = updatedContent;
                    pageData.linksUpdatedAt = new Date().toISOString();
                    fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
                    
                    // Пробуем обновить через API, используя documentId если есть
                    // В Strapi v5 может потребоваться использовать documentId вместо id
                    let updateUrl = `/pages/${pageId}`;
                    
                    // Пробуем сначала с documentId (если есть)
                    if (strapiPageInfo.documentId) {
                        updateUrl = `/pages/${strapiPageInfo.documentId}`;
                    }
                    
                    await api.put(updateUrl, {
                        data: {
                            content: updatedContent
                        }
                    });
                    
                    results.updated.push({
                        slug: pageSlug,
                        id: pageId,
                        documentId: strapiPageInfo.documentId,
                        numericId: strapiPageInfo.numericId,
                        changesCount: updateResult.changes.length,
                        linksFound: linksInContent,
                        changes: updateResult.changes.slice(0, 5) // Первые 5 изменений для примера
                    });
                    
                    results.totalChanges += updateResult.changes.length;
                    
                    console.log(`   ✅ Обновлено ${updateResult.changes.length} ссылок`);
                } catch (updateError) {
                    const status = updateError.response?.status;
                    const errorMsg = updateError.response?.data?.error?.message || updateError.message;
                    const errorDetails = updateError.response?.data || {};
                    
                    // Если ошибка 404 с documentId, пробуем с numericId
                    if (status === 404 && strapiPageInfo.documentId && strapiPageInfo.numericId) {
                        try {
                            console.log(`   🔄 Пробуем обновить с numericId: ${strapiPageInfo.numericId}`);
                            await api.put(`/pages/${strapiPageInfo.numericId}`, {
                                data: {
                                    content: updatedContent
                                }
                            });
                            
                            // Сохраняем обновленный normalizedHTML в JSON файл и здесь
                            pageData.normalizedHTML = updatedContent;
                            pageData.linksUpdatedAt = new Date().toISOString();
                            fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2), 'utf-8');
                            
                            results.updated.push({
                                slug: pageSlug,
                                id: strapiPageInfo.numericId,
                                documentId: strapiPageInfo.documentId,
                                numericId: strapiPageInfo.numericId,
                                changesCount: updateResult.changes.length,
                                linksFound: linksInContent,
                                changes: updateResult.changes.slice(0, 5),
                                note: 'Обновлено с numericId'
                            });
                            
                            results.totalChanges += updateResult.changes.length;
                            console.log(`   ✅ Обновлено ${updateResult.changes.length} ссылок (с numericId)`);
                        } catch (retryError) {
                            console.error(`   ❌ Ошибка при обновлении (retry): ${retryError.response?.status || 'unknown'} - ${retryError.message}`);
                            results.failed.push({
                                slug: pageSlug,
                                error: retryError.message,
                                status: retryError.response?.status,
                                id: pageId,
                                documentId: strapiPageInfo.documentId,
                                numericId: strapiPageInfo.numericId
                            });
                        }
                    } else {
                        console.error(`   ❌ Ошибка при обновлении: ${status || 'unknown'} - ${errorMsg}`);
                        if (errorDetails.error) {
                            console.error(`      Детали:`, JSON.stringify(errorDetails.error, null, 2));
                        }
                        results.failed.push({
                            slug: pageSlug,
                            error: errorMsg,
                            status: status,
                            id: pageId,
                            documentId: strapiPageInfo.documentId,
                            numericId: strapiPageInfo.numericId,
                            errorDetails: errorDetails
                        });
                    }
                }
            } else {
                results.skipped.push({
                    slug: pageSlug,
                    reason: linksInContent > 0 ? `Найдено ${linksInContent} ссылок, но не обновлено (внешние или уже корректные)` : 'Нет ссылок для обновления',
                    linksFound: linksInContent
                });
                if (linksInContent > 0) {
                    console.log(`   ⚠️  Найдено ${linksInContent} ссылок, но они не были обновлены (возможно, внешние или уже корректные)`);
                } else {
                    console.log(`   ⏭️  Нет ссылок для обновления`);
                }
            }
        } catch (error) {
            console.error(`   ❌ Ошибка обработки файла ${file}: ${error.message}`);
            results.failed.push({
                file: file,
                error: error.message
            });
        }
        
        console.log('');
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let md = `# Отчет об обновлении межстраничных ссылок\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${results.total}\n`;
    md += `- **Обновлено:** ${results.updated.length}\n`;
    md += `- **Пропущено:** ${results.skipped.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n`;
    md += `- **Всего изменений ссылок:** ${results.totalChanges}\n\n`;
    
    if (results.updated.length > 0) {
        md += `## ✅ Обновленные страницы\n\n`;
        md += `| Страница | Количество изменений | Примеры изменений |\n`;
        md += `|----------|----------------------|------------------|\n`;
        results.updated.slice(0, 30).forEach(item => {
            const examples = item.changes.slice(0, 2).map(c => 
                `\`${c.old}\` → \`${c.new}\``
            ).join(', ');
            md += `| ${item.slug} | ${item.changesCount} | ${examples || '-'} |\n`;
        });
        if (results.updated.length > 30) {
            md += `\n*... и еще ${results.updated.length - 30} страниц*\n`;
        }
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Страница | Ошибка |\n`;
        md += `|----------|--------|\n`;
        results.failed.forEach(item => {
            md += `| ${item.slug} | ${item.error} |\n`;
        });
        md += `\n`;
    }
    
    fs.writeFileSync(MD_REPORT_FILE, md, 'utf-8');
    
    console.log('='.repeat(60) + '\n');
    console.log('✅ Обновление межстраничных ссылок завершено!\n');
    console.log(`   Обновлено страниц: ${results.updated.length}`);
    console.log(`   Всего изменений ссылок: ${results.totalChanges}`);
    console.log(`   Пропущено: ${results.skipped.length}`);
    console.log(`   Ошибок: ${results.failed.length}\n`);
    console.log(`📄 Отчеты сохранены:`);
    console.log(`   - JSON: ${REPORT_FILE}`);
    console.log(`   - Markdown: ${MD_REPORT_FILE}\n`);
    
    return results;
}

// Запуск
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    });
}

module.exports = { 
    main, 
    updateLinksInContent, 
    createUrlToSlugMap, 
    buildPagePath 
};
