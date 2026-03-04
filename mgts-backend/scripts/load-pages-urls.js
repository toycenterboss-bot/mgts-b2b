const fs = require('fs');
const path = require('path');

/**
 * Загружает маппинг slug -> URL из PAGES_HIERARCHY.md
 */
function loadPagesUrls() {
    const hierarchyFile = path.join(__dirname, '..', '..', 'docs', 'PAGES_HIERARCHY.md');
    
    if (!fs.existsSync(hierarchyFile)) {
        console.warn('⚠️  Файл PAGES_HIERARCHY.md не найден, используем простые пути');
        return new Map();
    }
    
    const content = fs.readFileSync(hierarchyFile, 'utf-8');
    const urlMap = new Map();
    
    // Парсим построчно, чтобы не ошибаться на записях без URL
    const lines = content.split(/\r?\n/);
    const slugLineRegex = /- \*\*.*?\*\* \(`([^`]+)`\)/;
    const urlLineRegex = /Оригинальный URL:\s*(https:\/\/business\.mgts\.ru[^\s]+)/;
    let currentSlug = null;
    
    for (const line of lines) {
        const slugMatch = line.match(slugLineRegex);
        if (slugMatch) {
            currentSlug = slugMatch[1];
        }
        
        const urlMatch = line.match(urlLineRegex);
        if (urlMatch && currentSlug) {
            const url = urlMatch[1];
            urlMap.set(currentSlug, url);
            
            // Также добавляем варианты с подчеркиваниями вместо слешей
            const slugWithUnderscores = currentSlug.replace(/\//g, '_');
            if (slugWithUnderscores !== currentSlug) {
                urlMap.set(slugWithUnderscores, url);
            }
        }
    }
    
    // Добавляем специальные случаи
    urlMap.set('home', 'https://business.mgts.ru');
    urlMap.set('index', 'https://business.mgts.ru');
    // operinfo в иерархии имеет некорректный tab-параметр, используем базовый URL
    urlMap.set('operinfo', 'https://business.mgts.ru/operinfo');
    // wca в иерархии имеет tab-параметр, используем базовый URL
    urlMap.set('wca', 'https://business.mgts.ru/wca');
    
    return urlMap;
}

/**
 * Получить URL страницы по slug
 */
function getPageUrl(slug) {
    const urlMap = loadPagesUrls();
    
    // Пробуем найти точное совпадение
    if (urlMap.has(slug)) {
        return urlMap.get(slug);
    }
    
    // Пробуем найти с заменой слешей на подчеркивания
    const slugWithUnderscores = slug.replace(/\//g, '_');
    if (urlMap.has(slugWithUnderscores)) {
        return urlMap.get(slugWithUnderscores);
    }
    
    // Пробуем найти с заменой подчеркиваний на слеши
    const slugWithSlashes = slug.replace(/_/g, '/');
    if (urlMap.has(slugWithSlashes)) {
        return urlMap.get(slugWithSlashes);
    }
    
    // Fallback: строим URL из slug
    if (slug === 'home' || slug === 'index') {
        return 'https://business.mgts.ru';
    }
    
    // Заменяем подчеркивания на слеши и строим путь
    const pathParts = slug.replace(/_/g, '/').split('/').filter(p => p);
    return `https://business.mgts.ru/${pathParts.join('/')}`;
}

module.exports = {
    loadPagesUrls,
    getPageUrl
};
