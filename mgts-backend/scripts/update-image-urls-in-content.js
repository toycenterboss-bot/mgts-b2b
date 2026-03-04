/**
 * Скрипт для обновления путей к изображениям в HTML-контенте страниц
 * Заменяет старые пути (/images/...) на URL из Strapi Media Library
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Форматирование прогресс-бара
function formatProgress(current, total, width = 40) {
    if (total === 0) return '[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0/0 (0%)';
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = Math.max(0, width - filled);
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(empty);
    return `[${bar}] ${current}/${total} (${percent}%)`;
}

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
    process.exit(1);
}

const http = require('http');
const https = require('https');

// Создаем кастомные агенты с принудительным использованием IPv4
const httpAgent = new http.Agent({
    family: 4, // Принудительно использовать IPv4
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50
});

const httpsAgent = new https.Agent({
    family: 4, // Принудительно использовать IPv4
    keepAlive: true,
    keepAliveMsecs: 1000,
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

// Проверка токена
if (!API_TOKEN || API_TOKEN.length < 50) {
    console.error('\n❌ Ошибка: API токен не найден или невалидный');
    console.error('   Токен должен быть установлен в переменной окружения STRAPI_API_TOKEN');
    console.error('   или в файле docs/project/CONTEXT.md\n');
    process.exit(1);
}

/**
 * Извлечь HTML из richtext поля Strapi
 * Strapi v5 может хранить richtext как JSON структуру или как HTML строку
 */
function extractHtmlFromRichtext(richtext) {
    if (!richtext) return '';
    
    // Если это строка - возвращаем как есть
    if (typeof richtext === 'string') {
        return richtext;
    }
    
    // Если это объект/массив - пробуем извлечь HTML
    if (typeof richtext === 'object') {
        // Strapi richtext может быть массивом блоков
        if (Array.isArray(richtext)) {
            return richtext.map(block => {
                if (typeof block === 'string') return block;
                if (block.type === 'paragraph' && block.children) {
                    return block.children.map(child => {
                        if (typeof child === 'string') return child;
                        if (child.text) return child.text;
                        return '';
                    }).join('');
                }
                return '';
            }).join('\n');
        }
        
        // Если это объект с полем html или content
        if (richtext.html) return richtext.html;
        if (richtext.content) return extractHtmlFromRichtext(richtext.content);
    }
    
    return '';
}

/**
 * Обновить все текстовые поля страницы, которые могут содержать HTML
 */
function extractAllHtmlFields(page) {
    const htmlFields = {};
    
    // Основное поле content
    if (page.content) {
        htmlFields.content = extractHtmlFromRichtext(page.content);
    }
    
    // Hero subtitle может содержать HTML
    if (page.heroSubtitle) {
        htmlFields.heroSubtitle = extractHtmlFromRichtext(page.heroSubtitle);
    }
    
    // Meta description (обычно текст, но проверим)
    if (page.metaDescription) {
        htmlFields.metaDescription = page.metaDescription;
    }
    
    return htmlFields;
}

/**
 * Извлечь пути к файлам из HTML-контента страницы
 */
function extractFilePathsFromContent(html) {
    if (!html) return [];
    
    const filePaths = new Set();
    
    // Ищем все img теги
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('#')) {
            filePaths.add(src);
        }
    }
    
    // Ищем все ссылки на файлы (a[href] с расширениями файлов)
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt', 'odt', 'ods'];
    const fileExtPattern = fileExtensions.join('|');
    
    // Вариант 1: <a href="...">
    const linkRegex = new RegExp(`<a[^>]+href=["']([^"']+\\.(${fileExtPattern}))["'][^>]*>`, 'gi');
    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
            filePaths.add(href);
        }
    }
    
    // Вариант 2: Любые URL с расширениями файлов (в кавычках или без)
    const urlRegex = new RegExp(`["']([^"']+\\.(${fileExtPattern}))["']`, 'gi');
    while ((match = urlRegex.exec(html)) !== null) {
        const url = match[1];
        if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('#') && !url.startsWith('mailto:')) {
            // Проверяем, что это не часть уже найденного пути
            let isPartOfFound = false;
            for (const foundPath of filePaths) {
                if (foundPath.includes(url) || url.includes(foundPath)) {
                    isPartOfFound = true;
                    break;
                }
            }
            if (!isPartOfFound) {
                filePaths.add(url);
            }
        }
    }
    
    return Array.from(filePaths);
}

/**
 * Найти файл в Strapi Media Library по имени (плоская структура)
 */
async function findFileInMediaLibrary(fileName) {
    try {
        // Ищем файл по имени (может быть с hash или без)
        const baseName = path.parse(fileName).name.toLowerCase();
        const ext = path.parse(fileName).ext.toLowerCase();
        
        // Пробуем найти файл через API
        try {
            // Сначала пробуем точное совпадение по name
            let response;
            try {
                response = await Promise.race([
                    api.get('/upload/files', {
                        params: {
                            'filters[name][$eq]': fileName,
                            'pagination[pageSize]': 10
                        },
                        timeout: 10000
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Таймаут поиска файла (10 сек)')), 10000)
                    )
                ]);
            } catch (error) {
                // Продолжаем поиск другими методами
                response = null;
            }
            
            if (response) {
                let files = response.data.data || response.data || [];
                if (files.length > 0) {
                    return files[0];
                }
            }
            
            // Пробуем поиск по части имени (без hash)
            try {
                response = await Promise.race([
                    api.get('/upload/files', {
                        params: {
                            'filters[$or][0][name][$contains]': baseName,
                            'filters[$or][1][filename][$contains]': baseName,
                            'pagination[pageSize]': 100
                        },
                        timeout: 10000
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Таймаут поиска файла (10 сек)')), 10000)
                    )
                ]);
            } catch (error) {
                response = null;
            }
            
            if (response) {
                let files = response.data.data || response.data || [];
                
                // Фильтруем по расширению и базовому имени
                const matchingFiles = files.filter(file => {
                    const fileUrl = file.url || '';
                    const fileNameFromUrl = path.basename(fileUrl).toLowerCase();
                    const fileExt = path.parse(fileUrl).ext.toLowerCase() || path.parse(file.name || '').ext.toLowerCase();
                    const fileBaseName = path.parse(fileNameFromUrl).name.toLowerCase();
                    
                    // Проверяем, что базовое имя совпадает (может быть с hash в конце)
                    const nameMatches = fileBaseName.startsWith(baseName) || fileBaseName.includes(baseName);
                    const extMatches = fileExt === ext;
                    
                    return nameMatches && extMatches;
                });
                
                if (matchingFiles.length > 0) {
                    return matchingFiles[0];
                }
            }
            
            // Если не нашли, пробуем загрузить все файлы и искать вручную
            try {
                response = await Promise.race([
                    api.get('/upload/files', {
                        params: {
                            'pagination[pageSize]': 200
                        },
                        timeout: 10000
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Таймаут загрузки файлов (10 сек)')), 10000)
                    )
                ]);
            } catch (error) {
                return null;
            }
            
            if (response) {
                const files = response.data.data || response.data || [];
                
                // Ищем по базовому имени в URL или name
                for (const file of files) {
                    const fileUrl = file.url || '';
                    const fileNameFromUrl = path.basename(fileUrl).toLowerCase();
                    const fileExt = path.parse(fileUrl).ext.toLowerCase() || path.parse(file.name || '').ext.toLowerCase();
                    const fileBaseName = path.parse(fileNameFromUrl).name.toLowerCase();
                    const fileDisplayName = (file.name || '').toLowerCase();
                    
                    // Проверяем совпадение базового имени и расширения
                    if ((fileBaseName.startsWith(baseName) || fileBaseName.includes(baseName) || 
                         fileDisplayName.includes(baseName)) && fileExt === ext) {
                        return file;
                    }
                }
            }
            
        } catch (error) {
            // Если ошибка API, возвращаем null
            return null;
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Создать маппинг файлов из Media Library только для используемых файлов
 */
async function createMappingForUsedFiles(usedFilePaths) {
    const mapping = new Map();
    const baseUrl = STRAPI_URL;
    
    process.stdout.write(`\n📋 Поиск файлов в Media Library для ${usedFilePaths.length} путей...\n`);
    
    let found = 0;
    let notFound = 0;
    
    for (let i = 0; i < usedFilePaths.length; i++) {
        const oldPath = usedFilePaths[i];
        const fileName = path.basename(oldPath);
        
        process.stdout.write(`\r   [${i + 1}/${usedFilePaths.length}] ${fileName.padEnd(50)}`);
        
        const file = await findFileInMediaLibrary(fileName);
        
        if (file) {
            let fileUrl = file.url || '';
            if (fileUrl.startsWith('/uploads/')) {
                fileUrl = `${baseUrl}${fileUrl}`;
            } else if (!fileUrl.startsWith('http')) {
                fileUrl = `${baseUrl}/uploads/${file.hash}${file.ext || path.extname(fileName)}`;
            }
            
            // Создаем маппинг для разных вариантов старого пути
            const oldPaths = [
                oldPath,
                oldPath.toLowerCase(),
                path.basename(oldPath),
                path.basename(oldPath).toLowerCase(),
                `/images/${fileName}`,
                `images/${fileName}`,
                `/static/images/${fileName}`,
                `static/images/${fileName}`,
            ];
            
            oldPaths.forEach(path => {
                mapping.set(path, fileUrl);
            });
            
            found++;
        } else {
            notFound++;
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    process.stdout.write(`\r   ✅ Найдено: ${found}, не найдено: ${notFound}\n\n`);
    
    return mapping;
}

/**
 * Получить все изображения из Strapi Media Library (старая версия - не используется)
 */
async function getAllImagesFromStrapi_OLD() {
    try {
        console.log('📥 Загрузка изображений из Strapi Media Library (API Uploads)...\n');
        console.log(`   🔑 Используется API токен: ${API_TOKEN.substring(0, 20)}...${API_TOKEN.substring(API_TOKEN.length - 10)}\n`);
        
        // Сначала проверяем подключение простым запросом
        process.stdout.write('   🔍 Проверка подключения к Strapi...');
        try {
            const testResponse = await Promise.race([
                api.get('/upload/files', {
                    params: {
                        'pagination[pageSize]': 1
                    }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Таймаут подключения (10 сек)')), 10000)
                )
            ]);
            process.stdout.write('\r   ✅ Подключение успешно (статус: ' + testResponse.status + ')\n\n');
        } catch (testError) {
            process.stdout.write('\r');
            console.error(`   ❌ Ошибка подключения: ${testError.response?.status || testError.code || testError.message}`);
            if (testError.response?.data?.error?.message) {
                console.error(`   Сообщение: ${testError.response.data.error.message}`);
            }
            throw testError;
        }
        
        let allImages = [];
        let page = 1;
        let pageSize = 100;
        let hasMore = true;
        let workingEndpoint = null;
        
        // Основной endpoint для Media Library - "API Uploads"
        // Рабочий endpoint: /upload/files (проверено через test-strapi-files-api.js)
        const endpoint = '/upload/files';
        
        while (hasMore) {
            try {
                process.stdout.write(`\r   📥 Загрузка страницы ${page}...`);
                
                const response = await Promise.race([
                    api.get(endpoint, {
                        params: {
                            'pagination[page]': page,
                            'pagination[pageSize]': pageSize,
                            'sort': 'createdAt:desc'
                        },
                        timeout: 30000
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Таймаут запроса страницы ${page} (30 сек)`)), 30000)
                    )
                ]);
                
                if (!workingEndpoint) {
                    workingEndpoint = endpoint;
                    process.stdout.write(`\r   ✅ Endpoint работает: ${endpoint}\n`);
                }
                
                // Обработка разных форматов ответа Strapi v5
                let images = [];
                if (response.data) {
                    // Strapi v5: response.data.data или response.data
                    images = response.data.data || response.data;
                    if (!Array.isArray(images)) {
                        // Если это объект, пробуем найти массив внутри
                        if (response.data.files) {
                            images = response.data.files;
                        } else {
                            images = [];
                        }
                    }
                }
                
                // Не фильтруем по форматам - обрабатываем все файлы из Media Library
                // URL файлов могут быть: /uploads/filename.ext или http://localhost:1337/uploads/filename.ext
                allImages = allImages.concat(images);
                
                process.stdout.write(`\r   ✅ Страница ${page}: загружено ${images.length} файлов (всего: ${allImages.length})`);
                
                // Проверяем пагинацию
                const pagination = response?.data?.meta?.pagination;
                if (pagination) {
                    if (page < pagination.pageCount) {
                        page++;
                    } else {
                        hasMore = false;
                        process.stdout.write('\n');
                    }
                } else {
                    // Если нет пагинации и получили меньше чем запросили - значит это последняя страница
                    if (images.length < pageSize) {
                        hasMore = false;
                        process.stdout.write('\n');
                    } else {
                        page++;
                    }
                }
                
            } catch (error) {
                if (page === 1) {
                    // Первая страница - критическая ошибка
                    console.error(`\n❌ Ошибка при загрузке файлов из Media Library`);
                    console.error(`   Endpoint: ${endpoint}`);
                    console.error(`   Статус: ${error.response?.status || error.code}`);
                    console.error(`   Сообщение: ${error.response?.data?.error?.message || error.message}`);
                    if (error.response?.status === 401 || error.response?.status === 403) {
                        console.error(`\n   ⚠️  Проблема с авторизацией! Проверьте API токен.`);
                    }
                    throw error;
                } else {
                    // Последующие страницы - просто прекращаем
                    hasMore = false;
                }
            }
        }
        
        console.log(`   ✅ Загружено ${allImages.length} изображений\n`);
        return allImages;
        
    } catch (error) {
        console.error('❌ Ошибка при загрузке изображений:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Создать маппинг старых путей на новые URL
 * Работает с плоской структурой Media Library - маппинг по имени файла
 */
function createImageMapping(strapiImages) {
    const mapping = new Map();
    
    // Strapi URL базовый путь
    const baseUrl = STRAPI_URL;
    
    strapiImages.forEach(image => {
        // Получаем URL файла - пробуем разные поля
        // URL может быть: /uploads/filename.ext или http://localhost:1337/uploads/filename.ext
        let imageUrl = image.url || image.formats?.thumbnail?.url || image.formats?.small?.url || '';
        
        // Если URL относительный (начинается с /uploads/), добавляем базовый URL
        // Если URL уже полный (http://), используем как есть
        if (imageUrl.startsWith('/uploads/')) {
            imageUrl = `${baseUrl}${imageUrl}`;
        } else if (!imageUrl.startsWith('http')) {
            // Если URL неполный, пробуем построить из hash и name
            if (image.hash) {
                const fileName = image.name || image.filename || image.originalName || 'file';
                imageUrl = `${baseUrl}/uploads/${image.hash}${path.extname(fileName)}`;
            } else {
                console.warn(`   ⚠️  Пропущен файл без URL и hash: ${JSON.stringify(image).substring(0, 100)}`);
                return;
            }
        }
        
        // Получаем имя файла из URL (последняя часть после /uploads/)
        // Например: http://localhost:1337/uploads/compliance_victory_img_a0b98f9ad4.png
        // Или оригинальное имя файла из данных
        let fileName = image.name || image.filename || image.originalName;
        if (!fileName) {
            // Извлекаем из URL: берём последнюю часть после последнего /
            const urlPath = imageUrl.split('/').pop();
            // Убираем hash, если он есть в имени (например: compliance_victory_img_a0b98f9ad4.png)
            // Пробуем найти оригинальное имя
            if (image.hash && urlPath.includes(image.hash)) {
                // Если в имени есть hash, пробуем найти оригинальное имя в других полях
                fileName = urlPath;
            } else {
                fileName = urlPath;
            }
        }
        
        const strapiUrl = imageUrl;
        
        // Создаем маппинг для разных вариантов пути с этим именем файла
        // Имя файла может быть: compliance_victory_img_a0b98f9ad4.png
        // Старые пути могут быть: /images/compliance_victory_img.png
        
        // Нормализуем имя файла
        const fileKey = fileName.toLowerCase();
        const fileNameWithoutExt = path.parse(fileName).name;
        const fileExt = path.parse(fileName).ext;
        
        // Если имя файла содержит hash (например: compliance_victory_img_a0b98f9ad4.png),
        // извлекаем базовое имя (compliance_victory_img)
        // Hash обычно выглядит как короткая строка из букв и цифр в конце имени перед расширением
        let baseFileName = fileNameWithoutExt;
        const hashMatch = fileNameWithoutExt.match(/^(.+)_([a-z0-9]{8,})$/i);
        if (hashMatch) {
            baseFileName = hashMatch[1]; // Базовое имя без hash
        }
        
        // Маппинг по полному имени файла (с hash)
        const oldPaths = [
            `/images/${fileName}`,
            `images/${fileName}`,
            `./images/${fileName}`,
            `/static/images/${fileName}`,
            `static/images/${fileName}`,
            `/files/${fileName}`,
            `files/${fileName}`,
            fileName, // Только имя файла
        ];
        
        // Также добавляем варианты с базовым именем (без hash)
        if (baseFileName !== fileNameWithoutExt) {
            const baseFileNameWithExt = `${baseFileName}${fileExt}`;
            oldPaths.push(
                `/images/${baseFileNameWithExt}`,
                `images/${baseFileNameWithExt}`,
                `/static/images/${baseFileNameWithExt}`,
                `static/images/${baseFileNameWithExt}`,
                `/files/${baseFileNameWithExt}`,
                `files/${baseFileNameWithExt}`,
                baseFileNameWithExt
            );
        }
        
        oldPaths.forEach(oldPath => {
            const key = oldPath.toLowerCase();
            if (!mapping.has(key)) {
                mapping.set(key, strapiUrl);
            }
        });
        
        // Маппинг по имени файла (ключ для поиска в HTML) - для изображений и файлов
        mapping.set(`file_filename:${fileKey}`, strapiUrl);
        
        // Маппинг по имени без расширения (с hash)
        mapping.set(`file_filename:${fileNameWithoutExt.toLowerCase()}`, strapiUrl);
        
        // Маппинг по базовому имени без расширения (без hash)
        if (baseFileName !== fileNameWithoutExt) {
            mapping.set(`file_filename:${baseFileName.toLowerCase()}`, strapiUrl);
        }
    });
    
    return mapping;
}

/**
 * Обновить пути к файлам (изображениям и документам) в HTML-контенте
 * Ищет пути по имени файла (плоская структура Media Library)
 */
function updateImagePathsInContent(html, mapping) {
    if (!html) return { html, replacements: 0, changes: [] };
    
    let updatedHtml = html;
    let replacements = 0;
    const changes = [];
    
    // Функция для поиска нового URL по старому пути
    function findNewUrl(oldPath) {
        if (oldPath.startsWith('http') || oldPath.startsWith('data:') || oldPath.startsWith('#')) {
            return null;
        }
        
        const fileName = path.basename(oldPath);
        const fileKey = fileName.toLowerCase();
        
        // 1. Пробуем точное совпадение пути (в нижнем регистре)
        const pathKey = oldPath.toLowerCase();
        if (mapping.has(pathKey)) {
            return { url: mapping.get(pathKey), method: 'exact_path' };
        }
        
        // 2. Пробуем по имени файла
        const filenameKey = `file_filename:${fileKey}`;
        if (mapping.has(filenameKey)) {
            return { url: mapping.get(filenameKey), method: 'filename' };
        }
        
        // 3. Пробуем найти по имени без расширения
        const nameWithoutExt = path.parse(fileName).name.toLowerCase();
        for (const [key, url] of mapping.entries()) {
            if (!key.startsWith('file_filename:')) continue;
            const mappedFileName = key.replace('file_filename:', '');
            const mappedNameWithoutExt = path.parse(mappedFileName).name.toLowerCase();
            if (mappedNameWithoutExt === nameWithoutExt) {
                return { url, method: 'filename_without_ext' };
            }
        }
        
        return null;
    }
    
    // Обновляем изображения (<img src>)
    const imgRegex = /<img([^>]+)src=["']([^"']+)["']([^>]*)>/gi;
    updatedHtml = updatedHtml.replace(imgRegex, (match, beforeSrc, src, afterSrc) => {
        const result = findNewUrl(src);
        if (result) {
            replacements++;
            changes.push({
                oldPath: src,
                newUrl: result.url,
                fileName: path.basename(src),
                method: result.method,
                type: 'image'
            });
            return `<img${beforeSrc}src="${result.url}"${afterSrc}>`;
        }
        return match;
    });
    
    // Обновляем ссылки на файлы (<a href> с расширениями файлов)
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'txt', 'csv', 'xml', 'json'];
    const fileExtPattern = fileExtensions.join('|');
    const linkRegex = new RegExp(`<a([^>]+)href=["']([^"']+\\.(${fileExtPattern}))["']([^>]*)>`, 'gi');
    
    updatedHtml = updatedHtml.replace(linkRegex, (match, beforeHref, href, ext, afterHref) => {
        const result = findNewUrl(href);
        if (result) {
            replacements++;
            changes.push({
                oldPath: href,
                newUrl: result.url,
                fileName: path.basename(href),
                method: result.method,
                type: 'file'
            });
            return `<a${beforeHref}href="${result.url}"${afterHref}>`;
        }
        return match;
    });
    
    return { html: updatedHtml, replacements, changes };
}

/**
 * Получить все страницы из Strapi
 */
async function getAllPages() {
    try {
        let allPages = [];
        let page = 1;
        let pageSize = 100;
        let hasMore = true;
        
        while (hasMore) {
            const response = await api.get('/pages', {
                params: {
                    'pagination[page]': page,
                    'pagination[pageSize]': pageSize,
                    'populate': '*'
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
        
        return allPages;
        
    } catch (error) {
        console.error('❌ Ошибка при загрузке страниц:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Обновить контент страницы в Strapi
 */
async function updatePageContent(page, updatedFields) {
    try {
        // В Strapi v5 может использоваться documentId вместо id
        const pageId = page.documentId || page.id;
        
        // Обновляем все измененные поля
        const updateData = {
            data: updatedFields
        };
        
        const response = await Promise.race([
            api.put(`/pages/${pageId}`, updateData),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Таймаут обновления страницы (15 сек)')), 15000)
            )
        ]);
        
        return true;
    } catch (error) {
        const pageId = page.documentId || page.id;
        const slug = page.slug || `page-${pageId}`;
        if (error.response?.status === 404) {
            console.error(`\n   ❌ Страница ${slug} (ID: ${pageId}) не найдена в Strapi`);
            console.error(`      Возможно, используется другой ID. Попробуйте documentId.`);
        } else {
            console.error(`\n   ❌ Ошибка при обновлении страницы ${slug}:`, error.response?.data?.error?.message || error.message);
        }
        return false;
    }
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🖼️  ОБНОВЛЕНИЕ ПУТЕЙ К ИЗОБРАЖЕНИЯМ В КОНТЕНТЕ СТРАНИЦ');
    console.log('═'.repeat(70) + '\n');
    
    // Тестовый режим: указать страницы для тестирования
    const TEST_MODE = process.env.TEST_PAGES || '';
    const testPages = TEST_MODE ? TEST_MODE.split(',').map(s => s.trim()) : null;
    const DRY_RUN = process.env.DRY_RUN === 'true';
    
    if (testPages) {
        console.log(`🧪 ТЕСТОВЫЙ РЕЖИМ: ${testPages.join(', ')}\n`);
    }
    if (DRY_RUN) {
        console.log(`⚠️  РЕЖИМ ПРОВЕРКИ (DRY RUN): изменения не будут сохранены\n`);
    }
    
    const startTime = Date.now();
    
    // 1. Получить тестовые страницы из Strapi
    process.stdout.write('📄 Загрузка тестовых страниц из Strapi...');
    const allPages = await getAllPages();
    const pagesToProcess = testPages 
        ? allPages.filter(p => testPages.includes(p.slug || `page-${p.id}`))
        : allPages;
    process.stdout.write(`\r   ✅ Загружено ${pagesToProcess.length} страниц\n\n`);
    
    if (pagesToProcess.length === 0) {
        console.log(`❌ Страницы для обработки не найдены: ${testPages?.join(', ') || 'все'}\n`);
        process.exit(1);
    }
    
    // 2. Извлечь пути к файлам из контента страниц
    console.log('🔍 Извлечение путей к файлам из контента страниц...\n');
    const usedFilePaths = new Set();
    
    pagesToProcess.forEach((page, index) => {
        // Извлекаем HTML из всех полей страницы
        const htmlFields = extractAllHtmlFields(page);
        let totalFiles = 0;
        
        // Проверяем все поля с HTML
        Object.values(htmlFields).forEach(html => {
            const filePaths = extractFilePathsFromContent(html);
            filePaths.forEach(path => usedFilePaths.add(path));
            totalFiles += filePaths.length;
        });
        
        process.stdout.write(`\r   [${index + 1}/${pagesToProcess.length}] ${(page.slug || `page-${page.id}`).padEnd(50)} - найдено ${totalFiles} файлов`);
    });
    
    process.stdout.write(`\r   ✅ Всего уникальных файлов в контенте: ${usedFilePaths.size}\n\n`);
    
    if (usedFilePaths.size === 0) {
        console.log('⚠️  Файлы не найдены в контенте страниц\n');
        process.exit(0);
    }
    
    // 3. Найти соответствующие файлы в Media Library и создать маппинг
    const mapping = await createMappingForUsedFiles(Array.from(usedFilePaths));
    
    if (mapping.size === 0) {
        console.log('⚠️  Файлы в Media Library не найдены\n');
        process.exit(0);
    }
    
    // 4. Обновить контент каждой страницы
    console.log(`🔄 Обновление контента страниц${testPages ? ' (тестовый режим)' : ''}...\n`);
    
    const results = {
        total: pagesToProcess.length,
        updated: 0,
        skipped: 0,
        errors: 0,
        totalReplacements: 0,
        details: []
    };
    
    for (let i = 0; i < pagesToProcess.length; i++) {
        const page = pagesToProcess[i];
        const slug = page.slug || `page-${page.id}`;
        
        // Прогресс-бар
        const progress = formatProgress(i + 1, pagesToProcess.length);
        process.stdout.write(`\r${progress} | ${slug.substring(0, 50).padEnd(50)}`);
        
        // Извлекаем HTML из всех полей страницы
        const htmlFields = extractAllHtmlFields(page);
        
        // Обновляем все поля
        let totalReplacements = 0;
        const allChanges = [];
        const updatedFields = {};
        let hasChanges = false;
        
        for (const [fieldName, html] of Object.entries(htmlFields)) {
            if (!html || html.length === 0) continue;
            
            const { html: updatedHtml, replacements, changes } = updateImagePathsInContent(html, mapping);
            
            if (updatedHtml !== html) {
                updatedFields[fieldName] = updatedHtml;
                totalReplacements += replacements;
                allChanges.push(...changes.map(c => ({ ...c, field: fieldName })));
                hasChanges = true;
            }
        }
        
        if (!hasChanges || totalReplacements === 0) {
            // Нет изменений
            results.skipped++;
            continue;
        }
        
        // Статистика замен
        const changesByMethod = {};
        allChanges.forEach(change => {
            changesByMethod[change.method] = (changesByMethod[change.method] || 0) + 1;
        });
        
        // Проверка корректности замен
        const validationErrors = [];
        
        // Детальный лог каждые 10 страниц или для страниц с заменами
        if ((i + 1) % 10 === 0 || totalReplacements > 0) {
            process.stdout.write('\n');
            // Временно проверяем ошибки для лога
            allChanges.forEach(change => {
                if (!change.newUrl || change.newUrl.trim() === '') {
                    validationErrors.push(`Пустой URL для ${change.oldPath}`);
                }
                if (!change.newUrl.startsWith('http') && !change.newUrl.includes('uploads')) {
                    validationErrors.push(`Неправильный формат URL для ${change.oldPath}: ${change.newUrl}`);
                }
            });
            
            const statusIcon = validationErrors.length > 0 ? '⚠️' : '✅';
            console.log(`   ${statusIcon} ${slug.padEnd(50)} | Замен: ${totalReplacements} | Проверок: ${validationErrors.length === 0 ? 'OK' : validationErrors.length + ' ошибок'}`);
            
            // Показываем детали для страниц с заменами (первые 3 примера)
            if (totalReplacements > 0 && allChanges.length > 0 && (i < 3 || totalReplacements > 10)) {
                console.log(`      📝 Примеры замен:`);
                allChanges.slice(0, 3).forEach((change, idx) => {
                    const oldPath = change.oldPath.length > 55 
                        ? change.oldPath.substring(0, 52) + '...' 
                        : change.oldPath;
                    const newUrl = change.newUrl.length > 65 
                        ? change.newUrl.substring(0, 62) + '...' 
                        : change.newUrl;
                    console.log(`         ${idx + 1}. ${oldPath.padEnd(55)} → ${newUrl}`);
                });
                if (allChanges.length > 3) {
                    console.log(`         ... и еще ${allChanges.length - 3} замен`);
                }
            }
        }
        allChanges.forEach(change => {
            // Проверяем, что новый URL валидный
            if (!change.newUrl || change.newUrl.trim() === '') {
                validationErrors.push(`Пустой URL для ${change.oldPath}`);
            }
            // Проверяем, что новый URL начинается с http или содержит uploads
            if (!change.newUrl.startsWith('http') && !change.newUrl.includes('uploads')) {
                validationErrors.push(`Неправильный формат URL для ${change.oldPath}: ${change.newUrl}`);
            }
        });
        
        if (DRY_RUN) {
            // В режиме проверки только считаем замены, не сохраняем
            results.updated++;
            results.totalReplacements += totalReplacements;
            results.details.push({
                slug,
                id: page.id,
                replacements: totalReplacements,
                changes: allChanges,
                validationErrors: validationErrors.length,
                fields: Object.keys(updatedFields)
            });
            continue;
        }
        
        // Обновить страницу в Strapi
        const success = await updatePageContent(page, updatedFields);
        
        if (success) {
            results.updated++;
            results.totalReplacements += totalReplacements;
            results.details.push({
                slug,
                id: page.id,
                replacements: totalReplacements,
                changes: allChanges,
                validationErrors: validationErrors.length,
                fields: Object.keys(updatedFields)
            });
        } else {
            results.errors++;
        }
        
        // Небольшая задержка
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    // Итоговый отчет
    console.log('\n' + '═'.repeat(70));
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('═'.repeat(70) + '\n');
    
    console.log(`✅ Обновлено: ${results.updated}`);
    console.log(`⏭️  Пропущено: ${results.skipped}`);
    console.log(`❌ Ошибок: ${results.errors}`);
    console.log(`🔀 Всего замен: ${results.totalReplacements}`);
    console.log(`⏱️  Время выполнения: ${duration} сек\n`);
    
    if (DRY_RUN) {
        console.log('⚠️  РЕЖИМ ПРОВЕРКИ: изменения НЕ были сохранены\n');
        console.log('Для сохранения изменений запустите скрипт без DRY_RUN=true\n');
    } else if (testPages) {
        console.log(`🧪 ТЕСТОВЫЙ РЕЖИМ: изменения сохранены только для указанных страниц\n`);
        console.log('Для обновления всех страниц запустите скрипт без TEST_PAGES\n');
    }
    
    if (results.details.length > 0) {
        console.log('📝 Детали обновлений:\n');
        
        // Группируем по количеству замен
        const withReplacements = results.details.filter(d => d.replacements > 0);
        const withoutReplacements = results.details.filter(d => d.replacements === 0);
        
        if (withReplacements.length > 0) {
            console.log(`   📊 Страницы с заменами (${withReplacements.length}):\n`);
            withReplacements
                .sort((a, b) => b.replacements - a.replacements)
                .forEach((detail, idx) => {
                    const icon = detail.validationErrors > 0 ? '⚠️' : '✅';
                    console.log(`      ${icon} ${(idx + 1).toString().padStart(3)}. ${detail.slug.padEnd(50)} - ${detail.replacements} замен`);
                });
            console.log('');
        }
        
        if (withoutReplacements.length > 0 && withoutReplacements.length < 20) {
            console.log(`   ⏭️  Страницы без изменений (${withoutReplacements.length}):\n`);
            withoutReplacements.slice(0, 10).forEach(detail => {
                console.log(`      - ${detail.slug}`);
            });
            if (withoutReplacements.length > 10) {
                console.log(`      ... и еще ${withoutReplacements.length - 10} страниц`);
            }
            console.log('');
        }
    }
    
    // Сохранение отчета
    const reportPath = path.join(__dirname, '../../temp/migration/image-urls-update-report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        summary: {
            totalPages: results.total,
            updated: results.updated,
            skipped: results.skipped,
            errors: results.errors,
            totalReplacements: results.totalReplacements
        },
        details: results.details
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Детальный отчет сохранен: ${reportPath}\n`);
    
    console.log('═'.repeat(70) + '\n');
}

main().catch(error => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
});
