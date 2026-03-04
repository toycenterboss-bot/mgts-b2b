/**
 * Скрипт для полного сравнения всех страниц между Strapi и старым сайтом
 * 
 * Задачи:
 * 1. Загрузить все страницы из Strapi
 * 2. Загрузить все страницы со старого сайта (из pages-content)
 * 3. Сравнить их по slug, title, URL
 * 4. Определить страницы, которые есть в Strapi, но отсутствуют на старом сайте
 * 5. Определить страницы, которые есть на старом сайте, но отсутствуют в Strapi
 * 6. Создать полный отчет по всем страницам
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
    console.error('\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN');
    console.error('\nСоздайте токен в Strapi:');
    console.error('  1. Откройте http://localhost:1337/admin');
    console.error('  2. Settings → API Tokens → Create new API Token');
    console.error('  3. Name: Pages Comparison Script');
    console.error('  4. Token duration: Unlimited');
    console.error('  5. Token type: Full access');
    console.error('  6. Скопируйте токен и установите:');
    console.error('     export STRAPI_API_TOKEN="your_token_here"\n');
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
const REPORT_FILE = path.join(OUTPUT_DIR, 'all-pages-comparison.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/ALL_PAGES_COMPARISON.md');

/**
 * Нормализовать slug для сравнения
 */
function normalizeSlug(slug) {
    if (!slug) return '';
    return slug.toLowerCase().trim().replace(/[\/_]/g, '-');
}

/**
 * Загрузить все страницы из Strapi
 */
async function loadStrapiPages() {
    console.log('📦 Загрузка страниц из Strapi...\n');
    
    try {
        let allPages = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            const response = await api.get('/pages', {
                params: {
                    'pagination[page]': page,
                    'pagination[pageSize]': 100,
                    'populate': '*',
                    'publicationState': 'live'
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
        
        console.log(`✅ Загружено страниц из Strapi: ${allPages.length}\n`);
        return allPages;
    } catch (error) {
        console.error('❌ Ошибка при загрузке страниц из Strapi:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        throw error;
    }
}

/**
 * Загрузить все страницы со старого сайта
 */
function loadOldSitePages() {
    console.log('📥 Загрузка страниц со старого сайта...\n');
    
    const pages = {
        flat: [],
        bySlug: new Map(),
        byUrl: new Map(),
        byNormalizedSlug: new Map()
    };
    
    const pagesDir = path.join(OUTPUT_DIR, 'pages-content');
    
    if (!fs.existsSync(pagesDir)) {
        console.warn('⚠️  Директория pages-content не найдена');
        return pages;
    }
    
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
    
    files.forEach(file => {
        try {
            const filePath = path.join(pagesDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            const slug = data.slug || file.replace('.json', '');
            const url = data.url || data.originalUrl || '';
            const title = data.title || data.heroTitle || slug;
            const section = data.section || '';
            
            // Определяем тип страницы
            let pageType = 'service';
            if (slug.includes('about') || slug.includes('about_')) {
                pageType = 'about';
            } else if (slug.includes('contact') || slug.includes('contacts')) {
                pageType = 'contacts';
            } else if (slug.includes('news') || slug.startsWith('news_')) {
                pageType = 'news';
            } else if (slug === 'home' || slug === 'index' || slug === 'main_page') {
                pageType = 'home';
            } else if (slug.includes('document') || slug.includes('policy') || slug.includes('compliance')) {
                pageType = 'document';
            } else if (section && ['business', 'operators', 'government', 'partners', 'developers'].includes(section)) {
                pageType = 'service';
            }
            
            const pageData = {
                name: title,
                slug: slug,
                url: url,
                section: section,
                pageType: pageType,
                path: slug.split(/[\/_]/).filter(p => p),
                description: data.metaDescription || '',
                originalFile: file
            };
            
            pages.flat.push(pageData);
            if (slug) {
                pages.bySlug.set(slug, pageData);
                const normalized = normalizeSlug(slug);
                if (!pages.byNormalizedSlug.has(normalized)) {
                    pages.byNormalizedSlug.set(normalized, pageData);
                }
            }
            if (url) {
                pages.byUrl.set(url, pageData);
            }
        } catch (error) {
            console.warn(`⚠️  Ошибка при обработке ${file}:`, error.message);
        }
    });
    
    console.log(`✅ Загружено страниц со старого сайта: ${pages.flat.length}\n`);
    return pages;
}

/**
 * Сравнить страницы
 */
function comparePages(strapiPages, oldSitePages) {
    console.log('🔍 Сравнение страниц...\n');
    
    const results = {
        matched: [],
        notInOldSite: [],
        notInStrapi: [],
        needsReview: [],
        byType: {
            service: { matched: 0, notInOldSite: 0, notInStrapi: 0 },
            about: { matched: 0, notInOldSite: 0, notInStrapi: 0 },
            contacts: { matched: 0, notInOldSite: 0, notInStrapi: 0 },
            news: { matched: 0, notInOldSite: 0, notInStrapi: 0 },
            home: { matched: 0, notInOldSite: 0, notInStrapi: 0 },
            document: { matched: 0, notInOldSite: 0, notInStrapi: 0 },
            other: { matched: 0, notInOldSite: 0, notInStrapi: 0 }
        }
    };
    
    // Создаем карты для быстрого поиска
    const oldSiteBySlug = oldSitePages.bySlug;
    const oldSiteByUrl = oldSitePages.byUrl;
    const oldSiteByNormalizedSlug = oldSitePages.byNormalizedSlug;
    const oldSiteByName = new Map();
    
    oldSitePages.flat.forEach(page => {
        if (page.name) {
            const normalized = page.name.toLowerCase().trim();
            if (!oldSiteByName.has(normalized)) {
                oldSiteByName.set(normalized, page);
            }
        }
    });
    
    // Проверяем каждую страницу из Strapi
    strapiPages.forEach(page => {
        // В Strapi v5 поля находятся напрямую в объекте
        const slug = page.slug || page.attributes?.slug || '';
        const title = page.title || page.attributes?.title || '';
        const section = page.section || page.attributes?.section || null;
        const originalUrl = page.originalUrl || page.attributes?.originalUrl || '';
        const originalSlug = page.originalSlug || page.attributes?.originalSlug || '';
        
        // Определяем тип страницы
        let pageType = 'other';
        if (section && ['business', 'operators', 'government', 'partners', 'developers'].includes(section)) {
            pageType = 'service';
        } else if (slug.includes('about') || slug.includes('/about')) {
            pageType = 'about';
        } else if (slug.includes('contact') || slug.includes('contacts')) {
            pageType = 'contacts';
        } else if (slug.includes('news')) {
            pageType = 'news';
        } else if (slug === 'home' || slug === 'index' || slug === 'main_page') {
            pageType = 'home';
        } else if (slug.includes('document') || slug.includes('policy') || slug.includes('compliance')) {
            pageType = 'document';
        }
        
        const pageData = {
            id: page.id,
            name: title,
            slug: slug,
            section: section || 'other',
            pageType: pageType,
            originalSlug: originalSlug,
            originalUrl: originalUrl,
            matchedBy: null,
            oldSitePage: null
        };
        
        let matched = false;
        
        // Попытка 1: По originalSlug
        if (originalSlug) {
            const normalized = normalizeSlug(originalSlug);
            if (oldSiteByNormalizedSlug.has(normalized)) {
                pageData.matchedBy = 'originalSlug';
                pageData.oldSitePage = oldSiteByNormalizedSlug.get(normalized);
                matched = true;
            }
        }
        
        // Попытка 2: По slug
        if (!matched && slug) {
            const normalized = normalizeSlug(slug);
            if (oldSiteByNormalizedSlug.has(normalized)) {
                pageData.matchedBy = 'slug';
                pageData.oldSitePage = oldSiteByNormalizedSlug.get(normalized);
                matched = true;
            }
        }
        
        // Попытка 3: По originalUrl
        if (!matched && originalUrl) {
            if (oldSiteByUrl.has(originalUrl)) {
                pageData.matchedBy = 'originalUrl';
                pageData.oldSitePage = oldSiteByUrl.get(originalUrl);
                matched = true;
            }
        }
        
        // Попытка 4: По имени (неточное совпадение)
        if (!matched && title) {
            const normalized = title.toLowerCase().trim();
            if (oldSiteByName.has(normalized)) {
                pageData.matchedBy = 'name';
                pageData.oldSitePage = oldSiteByName.get(normalized);
                matched = true;
                results.needsReview.push(pageData);
            }
        }
        
        if (matched && pageData.matchedBy !== 'name') {
            results.matched.push(pageData);
            results.byType[pageType].matched++;
        } else if (!matched) {
            results.notInOldSite.push(pageData);
            results.byType[pageType].notInOldSite++;
        }
    });
    
    // Находим страницы со старого сайта, которых нет в Strapi
    const strapiSlugs = new Set(strapiPages.map(p => normalizeSlug(p.slug || p.attributes?.slug || '')));
    const strapiOriginalSlugs = new Set(strapiPages.map(p => normalizeSlug(p.originalSlug || p.attributes?.originalSlug || '')));
    
    oldSitePages.flat.forEach(page => {
        const normalizedSlug = normalizeSlug(page.slug);
        const isInStrapi = strapiSlugs.has(normalizedSlug) || strapiOriginalSlugs.has(normalizedSlug);
        
        if (!isInStrapi) {
            results.notInStrapi.push(page);
            results.byType[page.pageType].notInStrapi++;
        }
    });
    
    console.log(`✅ Сравнение завершено:\n`);
    console.log(`   Совпало: ${results.matched.length}`);
    console.log(`   Не найдено на старом сайте: ${results.notInOldSite.length}`);
    console.log(`   Не найдено в Strapi: ${results.notInStrapi.length}`);
    console.log(`   Требует проверки: ${results.needsReview.length}\n`);
    
    return results;
}

/**
 * Создать отчет
 */
function createReport(comparisonResults, strapiPages, oldSitePages) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalStrapiPages: strapiPages.length,
            totalOldSitePages: oldSitePages.flat.length,
            matched: comparisonResults.matched.length,
            notInOldSite: comparisonResults.notInOldSite.length,
            notInStrapi: comparisonResults.notInStrapi.length,
            needsReview: comparisonResults.needsReview.length,
            byType: comparisonResults.byType
        },
        matched: comparisonResults.matched,
        notInOldSite: comparisonResults.notInOldSite,
        notInStrapi: comparisonResults.notInStrapi,
        needsReview: comparisonResults.needsReview
    };
    
    // Сохраняем JSON отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSON отчет сохранен: ${REPORT_FILE}\n`);
    
    // Создаем Markdown отчет
    let mdReport = `# Полное сравнение всех страниц между Strapi и старым сайтом\n\n`;
    mdReport += `**Дата анализа:** ${new Date().toISOString()}\n\n`;
    mdReport += `## 📊 Сводка\n\n`;
    mdReport += `- **Всего страниц в Strapi:** ${report.summary.totalStrapiPages}\n`;
    mdReport += `- **Всего страниц на старом сайте:** ${report.summary.totalOldSitePages}\n`;
    mdReport += `- **Совпало:** ${report.summary.matched}\n`;
    mdReport += `- **Не найдено на старом сайте:** ${report.summary.notInOldSite}\n`;
    mdReport += `- **Не найдено в Strapi:** ${report.summary.notInStrapi}\n`;
    mdReport += `- **Требует проверки:** ${report.summary.needsReview}\n\n`;
    
    mdReport += `### Распределение по типам страниц:\n\n`;
    mdReport += `| Тип | Совпало | Не в старом сайте | Не в Strapi |\n`;
    mdReport += `|-----|---------|-------------------|-------------|\n`;
    Object.keys(report.summary.byType).forEach(type => {
        const stats = report.summary.byType[type];
        mdReport += `| ${type} | ${stats.matched} | ${stats.notInOldSite} | ${stats.notInStrapi} |\n`;
    });
    mdReport += `\n`;
    
    if (report.notInOldSite.length > 0) {
        mdReport += `## 📄 Страницы в Strapi, отсутствующие на старом сайте\n\n`;
        mdReport += `**Рекомендация:** Проверить, нужны ли эти страницы, или их можно удалить.\n\n`;
        mdReport += `| ID | Название | Slug | Тип | Секция |\n`;
        mdReport += `|----|----------|------|-----|--------|\n`;
        
        report.notInOldSite.forEach(page => {
            mdReport += `| ${page.id} | ${page.name} | ${page.slug} | ${page.pageType} | ${page.section || '-'} |\n`;
        });
        mdReport += `\n`;
    }
    
    if (report.notInStrapi.length > 0) {
        mdReport += `## 📄 Страницы на старом сайте, отсутствующие в Strapi\n\n`;
        mdReport += `**Рекомендация:** Эти страницы нужно будет добавить при миграции.\n\n`;
        mdReport += `| Название | Slug | Тип | Секция | URL |\n`;
        mdReport += `|----------|------|-----|--------|-----|\n`;
        
        // Группируем по типам
        const byType = {};
        report.notInStrapi.forEach(page => {
            if (!byType[page.pageType]) {
                byType[page.pageType] = [];
            }
            byType[page.pageType].push(page);
        });
        
        Object.keys(byType).sort().forEach(type => {
            mdReport += `### ${type.toUpperCase()} (${byType[type].length} страниц)\n\n`;
            mdReport += `| Название | Slug | Секция | URL |\n`;
            mdReport += `|----------|------|--------|-----|\n`;
            
            byType[type].forEach(page => {
                mdReport += `| ${page.name} | ${page.slug} | ${page.section || '-'} | ${page.url || '-'} |\n`;
            });
            mdReport += `\n`;
        });
    }
    
    if (report.needsReview.length > 0) {
        mdReport += `## ⚠️ Страницы, требующие проверки\n\n`;
        mdReport += `Эти страницы совпали по имени, но могут быть разными.\n\n`;
        mdReport += `| ID | Название в Strapi | Название на старом сайте | Slug |\n`;
        mdReport += `|----|------------------|--------------------------|------|\n`;
        
        report.needsReview.forEach(page => {
            mdReport += `| ${page.id} | ${page.name} | ${page.oldSitePage?.name || '-'} | ${page.slug} |\n`;
        });
        mdReport += `\n`;
    }
    
    mdReport += `## 📝 Выводы\n\n`;
    mdReport += `1. **Найдено ${report.summary.matched} совпадающих страниц** между Strapi и старым сайтом\n`;
    mdReport += `2. **${report.summary.notInOldSite} страниц в Strapi** отсутствуют на старом сайте\n`;
    mdReport += `3. **${report.summary.notInStrapi} страниц на старом сайте** отсутствуют в Strapi и требуют миграции\n`;
    mdReport += `4. **${report.summary.needsReview} страниц** требуют ручной проверки\n\n`;
    
    fs.writeFileSync(REPORT_MD_FILE, mdReport, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${REPORT_MD_FILE}\n`);
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔍 Полное сравнение всех страниц между Strapi и старым сайтом\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // 1. Загрузить страницы из Strapi
        const strapiPages = await loadStrapiPages();
        
        // 2. Загрузить страницы со старого сайта
        const oldSitePages = loadOldSitePages();
        
        // 3. Сравнить
        const comparisonResults = comparePages(strapiPages, oldSitePages);
        
        // 4. Создать отчет
        createReport(comparisonResults, strapiPages, oldSitePages);
        
        console.log('✅ Анализ завершен!\n');
        console.log('📊 Результаты:');
        console.log(`   - Совпало: ${comparisonResults.matched.length}`);
        console.log(`   - Не найдено на старом сайте: ${comparisonResults.notInOldSite.length}`);
        console.log(`   - Не найдено в Strapi: ${comparisonResults.notInStrapi.length}`);
        console.log(`   - Требует проверки: ${comparisonResults.needsReview.length}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при выполнении анализа:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, loadStrapiPages, loadOldSitePages, comparePages };
