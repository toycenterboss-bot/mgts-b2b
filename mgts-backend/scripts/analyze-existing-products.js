/**
 * Скрипт для анализа существующих услуг в Strapi
 * и сравнения их с извлеченными услугами со старого сайта
 * 
 * Задачи:
 * 1. Загрузить все существующие страницы из Strapi
 * 2. Построить дерево услуг на основе структуры страниц (section, slug, parent)
 * 3. Сравнить с извлеченными услугами со старого сайта
 * 4. Определить услуги, которые есть в новом сайте, но отсутствуют на старом
 * 5. Создать отчет с рекомендациями
 * 
 * ВНИМАНИЕ: Не удаляет автоматически, только создает отчет для ручного решения
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
    console.error('  3. Name: Product Analysis Script');
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
const SERVICES_TREE_FILE = path.join(OUTPUT_DIR, 'services-tree.json');
const ALL_SERVICES_FILE = path.join(OUTPUT_DIR, 'all-services.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'existing-products-analysis.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/EXISTING_PRODUCTS_ANALYSIS.md');

/**
 * Загрузить все страницы из Strapi и построить дерево услуг
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
                    'populate': ['parent']
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
        
        // Анализируем секции страниц
        const sectionsCount = {};
        allPages.forEach(p => {
            const section = p.attributes?.section || 'no-section';
            sectionsCount[section] = (sectionsCount[section] || 0) + 1;
        });
        console.log('📊 Распределение страниц по секциям:');
        Object.keys(sectionsCount).sort().forEach(section => {
            console.log(`   ${section}: ${sectionsCount[section]}`);
        });
        console.log('');
        
        // Показываем первые 10 slug для отладки
        console.log('📋 Примеры slug страниц в Strapi (первые 10):');
        allPages.slice(0, 10).forEach(p => {
            console.log(`   - ${p.attributes?.slug || 'no-slug'}`);
        });
        console.log('');
        
        // Фильтруем страницы-услуги (исключаем новости, о компании и т.д.)
        const excludedSlugs = ['news', 'about_mgts', 'about_', 'contact_', 'home', 'index', 
                               'general_director_message', 'mgts_values', 'bank_details',
                               'cookie_processing', 'data_processing', 'corporate_documents',
                               'decisions_meetings_shareholders', 'infoformen', 'labor_safety',
                               'licenses', 'mgts_compliance_policies', 'offers', 'operinfo',
                               'principles_corporate_manage', 'single_hotline', 'stockholder_copies_document',
                               'timing_malfunctions', 'wca', 'forms_doc'];
        
        // Анализируем все страницы и определяем секцию по slug
        const servicePages = allPages.filter(p => {
            const slug = p.attributes?.slug || '';
            
            // Исключаем страницы с определенными slug
            if (excludedSlugs.some(ex => slug.includes(ex))) {
                return false;
            }
            
            // Определяем секцию по slug
            let detectedSection = p.attributes?.section;
            if (!detectedSection) {
                if (slug.startsWith('business') || slug.includes('business_')) {
                    detectedSection = 'business';
                } else if (slug.startsWith('operators') || slug.includes('operators_')) {
                    detectedSection = 'operators';
                } else if (slug.startsWith('government') || slug.includes('government_')) {
                    detectedSection = 'government';
                } else if (slug.startsWith('partners') || slug.includes('partners_')) {
                    detectedSection = 'partners';
                } else if (slug.startsWith('developers') || slug.includes('developers_')) {
                    detectedSection = 'developers';
                }
            }
            
            // Включаем только страницы с определенной секцией услуг
            return detectedSection && ['business', 'operators', 'government', 'partners', 'developers'].includes(detectedSection);
        });
        
        console.log(`✅ Найдено страниц-услуг: ${servicePages.length}\n`);
        
        // Строим дерево услуг на основе структуры
        const servicesTree = buildServicesTree(servicePages);
        
        return {
            allPages: allPages,
            servicePages: servicePages,
            servicesTree: servicesTree
        };
    } catch (error) {
        console.error('❌ Ошибка при загрузке страниц из Strapi:', error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        throw error;
    }
}

/**
 * Построить дерево услуг на основе структуры страниц
 */
function buildServicesTree(pages) {
    const services = {
        flat: [],
        bySlug: new Map(),
        byId: new Map(),
        tree: {}
    };
    
    // Создаем карту страниц по ID
    pages.forEach(page => {
        // Определяем секцию по slug, если section не заполнено
        let detectedSection = page.attributes?.section;
        const slug = page.attributes?.slug || '';
        if (!detectedSection) {
            if (slug.startsWith('business') || slug.startsWith('business_')) {
                detectedSection = 'business';
            } else if (slug.startsWith('operators') || slug.startsWith('operators_')) {
                detectedSection = 'operators';
            } else if (slug.startsWith('government') || slug.startsWith('government_')) {
                detectedSection = 'government';
            } else if (slug.startsWith('partners') || slug.startsWith('partners_')) {
                detectedSection = 'partners';
            } else if (slug.startsWith('developers') || slug.startsWith('developers_')) {
                detectedSection = 'developers';
            }
        }
        
        const pageData = {
            id: page.id,
            name: page.attributes?.title || slug,
            slug: slug,
            section: detectedSection || '',
            parentId: page.attributes?.parent?.data?.id || null,
            parentSlug: page.attributes?.parent?.data?.attributes?.slug || null,
            order: page.attributes?.order || 0,
            originalUrl: page.attributes?.originalUrl || '',
            originalSlug: page.attributes?.originalSlug || '',
            path: []
        };
        
        services.byId.set(page.id, pageData);
    });
    
    // Строим пути для каждой страницы
    services.byId.forEach((pageData, id) => {
        const path = [];
        let currentId = id;
        let currentPage = pageData;
        
        while (currentPage) {
            path.unshift(currentPage.slug);
            if (currentPage.parentId && services.byId.has(currentPage.parentId)) {
                currentPage = services.byId.get(currentPage.parentId);
                currentId = currentPage.id;
            } else {
                break;
            }
        }
        
        pageData.path = path;
        pageData.fullPath = '/' + path.join('/');
    });
    
    // Группируем по секциям
    services.byId.forEach(pageData => {
        const section = pageData.section;
        if (!services.tree[section]) {
            services.tree[section] = [];
        }
        
        services.flat.push(pageData);
        if (pageData.slug) {
            services.bySlug.set(pageData.slug, pageData);
        }
        if (pageData.originalSlug) {
            services.bySlug.set(pageData.originalSlug, pageData);
        }
    });
    
    // Сортируем по order
    Object.keys(services.tree).forEach(section => {
        services.tree[section].sort((a, b) => a.order - b.order);
    });
    
    return services;
}

/**
 * Загрузить услуги со старого сайта
 */
function loadOldSiteServices() {
    console.log('📥 Загрузка услуг со старого сайта...\n');
    
    const services = {
        flat: [],
        bySlug: new Map(),
        byUrl: new Map()
    };
    
    // Загружаем из services-tree.json
    if (fs.existsSync(SERVICES_TREE_FILE)) {
        const treeData = JSON.parse(fs.readFileSync(SERVICES_TREE_FILE, 'utf-8'));
        
        function extractServices(node, path = []) {
            if (node.services && Array.isArray(node.services)) {
                node.services.forEach(service => {
                    const serviceData = {
                        name: service.name || service.title,
                        slug: service.slug,
                        url: service.url,
                        path: [...path, node.name].filter(Boolean),
                        category: node.name,
                        description: service.description
                    };
                    
                    services.flat.push(serviceData);
                    if (service.slug) {
                        services.bySlug.set(service.slug, serviceData);
                    }
                    if (service.url) {
                        services.byUrl.set(service.url, serviceData);
                    }
                });
            }
            
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(child => {
                    extractServices(child, [...path, node.name]);
                });
            }
        }
        
        if (Array.isArray(treeData)) {
            treeData.forEach(node => extractServices(node));
        } else if (treeData.children) {
            extractServices(treeData);
        }
    }
    
    // Загружаем из all-services.json (если есть)
    if (fs.existsSync(ALL_SERVICES_FILE)) {
        try {
            const allServicesData = JSON.parse(fs.readFileSync(ALL_SERVICES_FILE, 'utf-8'));
            
            if (Array.isArray(allServicesData)) {
                allServicesData.forEach(service => {
                    if (!services.bySlug.has(service.slug) && !services.byUrl.has(service.url)) {
                        const serviceData = {
                            name: service.name || service.title,
                            slug: service.slug,
                            url: service.url,
                            path: service.path || [],
                            category: service.category,
                            description: service.description
                        };
                        
                        services.flat.push(serviceData);
                        if (service.slug) {
                            services.bySlug.set(service.slug, serviceData);
                        }
                        if (service.url) {
                            services.byUrl.set(service.url, serviceData);
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️  Не удалось загрузить all-services.json:', error.message);
        }
    }
    
    console.log(`✅ Загружено услуг со старого сайта: ${services.flat.length}\n`);
    return services;
}

/**
 * Нормализовать slug для сравнения
 */
function normalizeSlug(slug) {
    if (!slug) return '';
    return slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
}

/**
 * Загрузить услуги со старого сайта из файлов pages-content
 */
function loadOldSiteServicesFromPages() {
    console.log('📥 Загрузка услуг со старого сайта из pages-content...\n');
    
    const services = {
        flat: [],
        bySlug: new Map(),
        byUrl: new Map()
    };
    
    const pagesDir = path.join(OUTPUT_DIR, 'pages-content');
    
    if (!fs.existsSync(pagesDir)) {
        console.warn('⚠️  Директория pages-content не найдена');
        return services;
    }
    
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json') && !f.startsWith('news_') && f !== 'index.json' && f !== 'home.json');
    
    files.forEach(file => {
        try {
            const filePath = path.join(pagesDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            const slug = data.slug || file.replace('.json', '');
            const url = data.url || data.originalUrl || '';
            const title = data.title || data.heroTitle || slug;
            const section = data.section || '';
            
            // Определяем секцию из пути
            let detectedSection = section;
            if (!detectedSection) {
                if (slug.startsWith('business_') || slug.startsWith('business/')) {
                    detectedSection = 'business';
                } else if (slug.startsWith('operators_') || slug.startsWith('operators/')) {
                    detectedSection = 'operators';
                } else if (slug.startsWith('government_') || slug.startsWith('government/')) {
                    detectedSection = 'government';
                } else if (slug.startsWith('partners_') || slug.startsWith('partners/')) {
                    detectedSection = 'partners';
                } else if (slug.startsWith('developers_') || slug.startsWith('developers/')) {
                    detectedSection = 'developers';
                }
            }
            
            // Пропускаем страницы, которые не являются услугами
            if (slug.includes('about_') || slug.includes('contact_') || slug.includes('news') || 
                slug === 'home' || slug === 'index' || !detectedSection) {
                return;
            }
            
            const serviceData = {
                name: title,
                slug: slug,
                url: url,
                section: detectedSection,
                path: slug.split('_'),
                description: data.metaDescription || ''
            };
            
            services.flat.push(serviceData);
            if (slug) {
                services.bySlug.set(slug, serviceData);
            }
            if (url) {
                services.byUrl.set(url, serviceData);
            }
        } catch (error) {
            console.warn(`⚠️  Ошибка при обработке ${file}:`, error.message);
        }
    });
    
    console.log(`✅ Загружено услуг со старого сайта: ${services.flat.length}\n`);
    return services;
}

/**
 * Сравнить услуги
 */
function compareServices(strapiData, oldSiteServices) {
    console.log('🔍 Сравнение услуг...\n');
    
    const results = {
        matched: [],
        notInOldSite: [],
        notInStrapi: [],
        needsReview: []
    };
    
    const strapiServices = strapiData.servicesTree;
    
    // Создаем карты для быстрого поиска
    const oldSiteBySlug = new Map();
    const oldSiteByUrl = new Map();
    const oldSiteByName = new Map();
    
    oldSiteServices.flat.forEach(service => {
        if (service.slug) {
            const normalized = normalizeSlug(service.slug);
            if (!oldSiteBySlug.has(normalized)) {
                oldSiteBySlug.set(normalized, service);
            }
        }
        if (service.url) {
            oldSiteByUrl.set(service.url, service);
        }
        if (service.name) {
            const normalized = service.name.toLowerCase().trim();
            if (!oldSiteByName.has(normalized)) {
                oldSiteByName.set(normalized, service);
            }
        }
    });
    
    // Проверяем каждую услугу из Strapi
    strapiServices.flat.forEach(service => {
        const serviceData = {
            id: service.id,
            name: service.name || '',
            slug: service.slug || '',
            originalSlug: service.originalSlug || '',
            originalUrl: service.originalUrl || '',
            section: service.section || '',
            path: service.path || [],
            fullPath: service.fullPath || '',
            matchedBy: null,
            oldSiteService: null
        };
        
        let matched = false;
        
        // Попытка 1: По originalSlug
        if (serviceData.originalSlug) {
            const normalized = normalizeSlug(serviceData.originalSlug);
            if (oldSiteBySlug.has(normalized)) {
                serviceData.matchedBy = 'originalSlug';
                serviceData.oldSiteService = oldSiteBySlug.get(normalized);
                matched = true;
            }
        }
        
        // Попытка 2: По slug
        if (!matched && serviceData.slug) {
            const normalized = normalizeSlug(serviceData.slug);
            if (oldSiteBySlug.has(normalized)) {
                serviceData.matchedBy = 'slug';
                serviceData.oldSiteService = oldSiteBySlug.get(normalized);
                matched = true;
            }
        }
        
        // Попытка 3: По originalUrl
        if (!matched && serviceData.originalUrl) {
            if (oldSiteByUrl.has(serviceData.originalUrl)) {
                serviceData.matchedBy = 'originalUrl';
                serviceData.oldSiteService = oldSiteByUrl.get(serviceData.originalUrl);
                matched = true;
            }
        }
        
        // Попытка 4: По имени (неточное совпадение)
        if (!matched && serviceData.name) {
            const normalized = serviceData.name.toLowerCase().trim();
            if (oldSiteByName.has(normalized)) {
                serviceData.matchedBy = 'name';
                serviceData.oldSiteService = oldSiteByName.get(normalized);
                matched = true;
                results.needsReview.push(serviceData);
            }
        }
        
        if (matched && serviceData.matchedBy !== 'name') {
            results.matched.push(serviceData);
        } else if (!matched) {
            results.notInOldSite.push(serviceData);
        }
    });
    
    // Находим услуги со старого сайта, которых нет в Strapi
    const strapiSlugs = new Set(strapiServices.flat.map(s => normalizeSlug(s.slug || '')));
    const strapiOriginalSlugs = new Set(strapiServices.flat.map(s => normalizeSlug(s.originalSlug || '')));
    
    oldSiteServices.flat.forEach(service => {
        const normalized = normalizeSlug(service.slug || '');
        if (normalized && !strapiSlugs.has(normalized) && !strapiOriginalSlugs.has(normalized)) {
            results.notInStrapi.push({
                name: service.name,
                slug: service.slug,
                url: service.url,
                category: service.category,
                path: service.path
            });
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
function createReport(comparisonResults, strapiData, oldSiteServices) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalStrapiPages: strapiData.allPages.length,
            totalStrapiServices: strapiData.servicePages.length,
            totalOldSiteServices: oldSiteServices.flat.length,
            matched: comparisonResults.matched.length,
            notInOldSite: comparisonResults.notInOldSite.length,
            notInStrapi: comparisonResults.notInStrapi.length,
            needsReview: comparisonResults.needsReview.length
        },
        strapiServicesTree: strapiData.servicesTree.tree,
        matched: comparisonResults.matched,
        notInOldSite: comparisonResults.notInOldSite,
        notInStrapi: comparisonResults.notInStrapi,
        needsReview: comparisonResults.needsReview
    };
    
    // Сохраняем JSON отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSON отчет сохранен: ${REPORT_FILE}\n`);
    
    // Создаем Markdown отчет
    let mdReport = `# Анализ существующих продуктов\n\n`;
    mdReport += `**Дата анализа:** ${new Date().toISOString()}\n\n`;
    mdReport += `## 📊 Сводка\n\n`;
    mdReport += `- **Всего страниц в Strapi:** ${report.summary.totalStrapiPages}\n`;
    mdReport += `- **Страниц-услуг в Strapi:** ${report.summary.totalStrapiServices}\n`;
    mdReport += `- **Всего услуг на старом сайте:** ${report.summary.totalOldSiteServices}\n`;
    mdReport += `- **Совпало:** ${report.summary.matched}\n`;
    mdReport += `- **Не найдено на старом сайте:** ${report.summary.notInOldSite}\n`;
    mdReport += `- **Не найдено в Strapi:** ${report.summary.notInStrapi}\n`;
    mdReport += `- **Требует проверки:** ${report.summary.needsReview}\n\n`;
    
    if (Object.keys(report.strapiServicesTree).length > 0) {
        mdReport += `## 🌳 Дерево услуг в Strapi\n\n`;
        Object.keys(report.strapiServicesTree).forEach(section => {
            mdReport += `### ${section}\n\n`;
            const services = report.strapiServicesTree[section];
            services.forEach(service => {
                mdReport += `- ${service.name} (\`${service.slug}\`) - ${service.fullPath || service.path.join('/')}\n`;
            });
            mdReport += `\n`;
        });
    }
    
    if (report.notInOldSite.length > 0) {
        mdReport += `## ⚠️ Продукты, отсутствующие на старом сайте\n\n`;
        mdReport += `**Рекомендация:** Пометить \`isFromOldSite: false\` или удалить/архивировать.\n\n`;
        mdReport += `| ID | Название | Slug | Раздел | Путь |\n`;
        mdReport += `|----|----------|------|--------|------|\n`;
        
        report.notInOldSite.forEach(service => {
            mdReport += `| ${service.id} | ${service.name} | ${service.slug} | ${service.section || '-'} | ${service.fullPath || service.path.join('/')} |\n`;
        });
        
        mdReport += `\n`;
    }
    
    if (report.notInStrapi.length > 0) {
        mdReport += `## 📋 Услуги со старого сайта, отсутствующие в Strapi\n\n`;
        mdReport += `**Рекомендация:** Эти услуги нужно будет добавить при миграции.\n\n`;
        mdReport += `| Название | Slug | URL | Категория |\n`;
        mdReport += `|----------|------|-----|-----------|\n`;
        
        report.notInStrapi.slice(0, 50).forEach(service => {
            mdReport += `| ${service.name} | ${service.slug || '-'} | ${service.url || '-'} | ${service.category || '-'} |\n`;
        });
        
        if (report.notInStrapi.length > 50) {
            mdReport += `\n*... и еще ${report.notInStrapi.length - 50} услуг*\n`;
        }
        
        mdReport += `\n`;
    }
    
    if (report.needsReview.length > 0) {
        mdReport += `## 🔍 Продукты, требующие проверки\n\n`;
        mdReport += `**Рекомендация:** Проверить вручную, возможно совпадение по имени неточное.\n\n`;
        mdReport += `| ID | Название (Strapi) | Название (Старый сайт) | Slug |\n`;
        mdReport += `|----|------------------|------------------------|------|\n`;
        
        report.needsReview.forEach(service => {
            mdReport += `| ${service.id} | ${service.name} | ${service.oldSiteService?.name || '-'} | ${service.slug} |\n`;
        });
        
        mdReport += `\n`;
    }
    
    mdReport += `## 📝 Действия\n\n`;
    mdReport += `1. **Проверить продукты из раздела "Не найдено на старом сайте"**\n`;
    mdReport += `   - Пометить \`isFromOldSite: false\` для тех, которых точно нет на старом сайте\n`;
    mdReport += `   - Решить: удалить или архивировать\n\n`;
    mdReport += `2. **Добавить услуги из раздела "Не найдено в Strapi"**\n`;
    mdReport += `   - Эти услуги нужно будет добавить при миграции\n\n`;
    mdReport += `3. **Проверить продукты из раздела "Требует проверки"**\n`;
    mdReport += `   - Убедиться, что совпадение по имени корректно\n`;
    mdReport += `   - При необходимости обновить \`originalSlug\` или \`originalUrl\`\n\n`;
    
    fs.writeFileSync(REPORT_MD_FILE, mdReport, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${REPORT_MD_FILE}\n`);
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔍 Анализ существующих продуктов в Strapi\n');
    console.log('=' .repeat(60) + '\n');
    
    try {
        // 1. Загрузить страницы из Strapi и построить дерево услуг
        const strapiData = await loadStrapiPages();
        
        // 2. Загрузить услуги со старого сайта из pages-content
        const oldSiteServices = loadOldSiteServicesFromPages();
        
        // 3. Сравнить
        const comparisonResults = compareServices(strapiData, oldSiteServices);
        
        // 4. Создать отчет
        createReport(comparisonResults, strapiData, oldSiteServices);
        
        console.log('✅ Анализ завершен!\n');
        console.log('📊 Результаты:');
        console.log(`   - Совпало: ${comparisonResults.matched.length}`);
        console.log(`   - Не найдено на старом сайте: ${comparisonResults.notInOldSite.length}`);
        console.log(`   - Не найдено в Strapi: ${comparisonResults.notInStrapi.length}`);
        console.log(`   - Требует проверки: ${comparisonResults.needsReview.length}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при выполнении анализа:', error.message);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, loadStrapiPages, loadOldSiteServicesFromPages, compareServices };
