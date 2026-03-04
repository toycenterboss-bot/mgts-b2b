const fs = require('fs');
const path = require('path');

/**
 * Извлекает все slug из PAGES_HIERARCHY.md
 */
function extractAllSlugs() {
    const hierarchyFile = path.join(__dirname, '..', '..', 'docs', 'PAGES_HIERARCHY.md');
    
    if (!fs.existsSync(hierarchyFile)) {
        return [];
    }
    
    const content = fs.readFileSync(hierarchyFile, 'utf-8');
    const slugs = [];
    
    // Ищем все slug в формате `slug`
    const slugRegex = /- \*\*.*?\*\* \(`([^`]+)`\)/g;
    let match;
    
    while ((match = slugRegex.exec(content)) !== null) {
        const slug = match[1];
        if (slug && slug !== 'index' && !slugs.includes(slug)) {
            slugs.push(slug);
        }
    }
    
    // Добавляем home
    if (!slugs.includes('home')) {
        slugs.unshift('home');
    }
    
    return slugs.sort();
}

/**
 * Извлекает slug и URL из PAGES_HIERARCHY.md
 */
function extractSlugsWithUrls() {
    const hierarchyFile = path.join(__dirname, '..', '..', 'docs', 'PAGES_HIERARCHY.md');
    
    if (!fs.existsSync(hierarchyFile)) {
        return [];
    }
    
    const content = fs.readFileSync(hierarchyFile, 'utf-8');
    const pages = [];
    
    // Ищем все записи с slug и URL
    const pageRegex = /- \*\*.*?\*\* \(`([^`]+)`\)[\s\S]*?Оригинальный URL: (https:\/\/business\.mgts\.ru[^\s]+)/g;
    let match;
    
    while ((match = pageRegex.exec(content)) !== null) {
        const slug = match[1];
        const url = match[2];
        if (slug && url) {
            pages.push({ slug, url });
        }
    }
    
    // Добавляем home
    pages.unshift({ slug: 'home', url: 'https://business.mgts.ru' });
    
    return pages;
}

if (require.main === module) {
    // Если запущен напрямую, выводим список slug
    const slugs = extractAllSlugs();
    console.log(JSON.stringify(slugs, null, 2));
}

module.exports = {
    extractAllSlugs,
    extractSlugsWithUrls
};
