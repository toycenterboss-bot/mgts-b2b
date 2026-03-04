/**
 * Скрипт для миграции нормализованных страниц в Strapi
 * 
 * Задачи:
 * 1. Загрузить нормализованный HTML из pages-content-normalized/
 * 2. Разобрать HTML на компоненты согласно классификации
 * 3. Для каждой секции определить тип компонента
 * 4. Извлечь контент для каждого компонента
 * 5. Создать запись Page в Strapi с массивом компонентов
 * 6. Сохранить originalUrl для редиректов
 * 7. Установить иерархию (parent, order, section)
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
const REPORT_FILE = path.join(OUTPUT_DIR, 'migration-report.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/MIGRATION_REPORT.md');

/**
 * Загрузить иерархию страниц
 */
function loadHierarchy() {
    if (!fs.existsSync(HIERARCHY_FILE)) {
        console.warn('⚠️  Файл иерархии не найден, будет создана плоская структура');
        return null;
    }
    
    const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
    console.log(`✅ Загружена иерархия для ${hierarchy.totalPages} страниц\n`);
    return hierarchy;
}

/**
 * Разобрать HTML на компоненты
 */
function parseHTMLToComponents(html, slug) {
    if (!html) return [];
    
    try {
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const components = [];
        
        // Находим все секции
        const sections = doc.querySelectorAll('section[class]');
        
        sections.forEach(section => {
            const classes = section.className.split(' ').filter(c => c);
            const componentType = detectComponentType(classes, section);
            
            if (componentType) {
                const component = extractComponentData(componentType, section, classes);
                if (component) {
                    components.push(component);
                }
            }
        });
        
        return components;
    } catch (error) {
        console.warn(`⚠️  Ошибка при парсинге HTML для ${slug}:`, error.message);
        return [];
    }
}

/**
 * Определить тип компонента по классам
 */
function detectComponentType(classes, element) {
    // Проверяем классы компонентов
    if (classes.includes('hero')) return 'page.hero';
    if (classes.includes('section-text')) return 'page.section-text';
    if (classes.includes('section-cards')) return 'page.section-cards';
    if (classes.includes('service-tariffs')) return 'page.service-tariffs';
    if (classes.includes('service-faq')) return 'page.service-faq';
    if (classes.includes('service-order-form')) return 'page.service-order-form';
    if (classes.includes('section-map')) return 'page.section-map';
    if (classes.includes('files-table')) return 'page.files-table';
    if (classes.includes('tariff-table')) return 'page.tariff-table';
    if (classes.includes('history-timeline')) return 'page.history-timeline';
    if (classes.includes('mobile-app-section')) return 'page.mobile-app-section';
    if (classes.includes('crm-cards')) return 'page.crm-cards';
    
    return null;
}

/**
 * Извлечь данные компонента
 */
function extractComponentData(componentType, element, classes) {
    const component = {
        __component: componentType
    };
    
    // Базовые поля для всех компонентов
    const titleElement = element.querySelector('h1, h2, h3, .title, [class*="title"]');
    if (titleElement) {
        component.title = titleElement.textContent.trim();
    }
    
    // Специфичная обработка для каждого типа компонента
    switch (componentType) {
        case 'page.hero':
            const heroTitle = element.querySelector('.hero__title, h1');
            const heroSubtitle = element.querySelector('.hero__subtitle, p');
            if (heroTitle) component.title = heroTitle.textContent.trim();
            if (heroSubtitle) component.subtitle = heroSubtitle.textContent.trim();
            break;
            
        case 'page.section-text':
            const content = element.querySelector('.section-text__content, .section-text');
            if (content) {
                component.content = content.innerHTML;
            }
            break;
            
        case 'page.section-cards':
            const cards = element.querySelectorAll('.section-cards__card, .card');
            component.cards = Array.from(cards).map(card => ({
                title: card.querySelector('.card__title, h3, h4')?.textContent.trim() || '',
                description: card.querySelector('.card__description, p')?.textContent.trim() || '',
                image: card.querySelector('img')?.src || null,
                link: card.querySelector('a')?.href || null
            }));
            break;
            
        case 'page.service-tariffs':
            const tariffs = element.querySelectorAll('.service-tariffs__tariff, .tariff-card');
            component.tariffs = Array.from(tariffs).map(tariff => ({
                name: tariff.querySelector('.tariff__name, h3')?.textContent.trim() || '',
                price: tariff.querySelector('.tariff__price, .price')?.textContent.trim() || '',
                description: tariff.querySelector('.tariff__description, p')?.textContent.trim() || '',
                features: Array.from(tariff.querySelectorAll('.tariff__feature, li')).map(f => f.textContent.trim())
            }));
            break;
            
        case 'page.service-faq':
            const items = element.querySelectorAll('.service-faq__item, .faq-item');
            component.items = Array.from(items).map(item => ({
                question: item.querySelector('.service-faq__question, .question')?.textContent.trim() || '',
                answer: item.querySelector('.service-faq__answer, .answer')?.textContent.trim() || ''
            }));
            break;
            
        case 'page.service-order-form':
            const form = element.querySelector('form');
            if (form) {
                component.formAction = form.action || '#';
                component.formMethod = form.method || 'post';
                const fields = form.querySelectorAll('input, textarea, select');
                component.fields = Array.from(fields).map(field => ({
                    name: field.name || '',
                    type: field.type || 'text',
                    placeholder: field.placeholder || '',
                    required: field.required || false
                }));
            }
            break;
            
        case 'page.section-map':
            const mapContainer = element.querySelector('.section-map__container, .map');
            if (mapContainer) {
                component.mapType = 'yandex';
                // Извлекаем координаты и маркеры из data-атрибутов или скриптов
                const dataLat = mapContainer.getAttribute('data-lat');
                const dataLng = mapContainer.getAttribute('data-lng');
                if (dataLat) component.centerLat = parseFloat(dataLat);
                if (dataLng) component.centerLng = parseFloat(dataLng);
            }
            break;
            
        // Для остальных компонентов извлекаем базовую структуру
        default:
            component.content = element.innerHTML;
            break;
    }
    
    return component;
}

/**
 * Создать страницу в Strapi
 */
// Допустимые значения section
const VALID_SECTIONS = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts', 'news', 'home', 'other'];

function normalizeSection(section) {
    if (!section || typeof section !== 'string') return 'other';
    const normalized = section.trim().toLowerCase();
    return VALID_SECTIONS.includes(normalized) ? normalized : 'other';
}

async function createPageInStrapi(pageData, hierarchy) {
    try {
        // Находим информацию об иерархии
        const hierarchyInfo = hierarchy?.flat.find(p => p.slug === pageData.slug);
        
        // Нормализуем section
        const section = normalizeSection(hierarchyInfo?.section || pageData.section);
        
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
                content: pageData.normalizedHTML || '',
                sidebar: section === 'about_mgts' ? 'about' : 'none',
                publishedAt: new Date().toISOString()
            }
        };
        
        const response = await api.post('/pages', pagePayload);
        return response.data.data;
    } catch (error) {
        // Если страница уже существует, попробуем обновить
        if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('unique')) {
            try {
                // Находим информацию об иерархии (повторно, так как мы в catch блоке)
                const hierarchyInfoRetry = hierarchy?.flat.find(p => p.slug === pageData.slug);
                
                // Получаем существующую страницу
                const existing = await api.get(`/pages?filters[slug][$eq]=${pageData.slug}`);
                if (existing.data.data && existing.data.data.length > 0) {
                    const pageId = existing.data.data[0].id;
                    const section = normalizeSection(hierarchyInfoRetry?.section || pageData.section);
                    const updatePayload = {
                        data: {
                            title: pageData.title || pageData.heroTitle || pageData.slug,
                            heroTitle: pageData.heroTitle || null,
                            heroSubtitle: pageData.heroSubtitle || null,
                            metaDescription: pageData.metaDescription || null,
                            metaKeywords: pageData.metaKeywords || null,
                            section: section,
                            order: hierarchyInfoRetry?.order || 0,
                            originalUrl: pageData.originalUrl || pageData.url || '',
                            content: pageData.normalizedHTML || '',
                            sidebar: section === 'about_mgts' ? 'about' : 'none',
                            publishedAt: new Date().toISOString()
                        }
                    };
                    const updateResponse = await api.put(`/pages/${pageId}`, updatePayload);
                    return updateResponse.data.data;
                }
            } catch (updateError) {
                console.error(`❌ Ошибка при обновлении страницы ${pageData.slug}:`, updateError.message);
            }
        }
        
        console.error(`❌ Ошибка при создании страницы ${pageData.slug}:`, error.message);
        if (error.response) {
            console.error('   Ответ сервера:', error.response.data);
        }
        throw error;
    }
}

/**
 * Обновить parent связи после создания всех страниц
 */
async function updateParentRelations(pages, hierarchy) {
    console.log('🔗 Обновление родительских связей...\n');
    
    if (!hierarchy) return;
    
    // Создаем карту slug -> id
    const slugToId = new Map();
    pages.forEach(page => {
        if (page.slug) {
            slugToId.set(page.slug, page.id);
        }
    });
    
    let updated = 0;
    for (const page of pages) {
        const hierarchyInfo = hierarchy.flat.find(p => p.slug === page.slug);
        if (hierarchyInfo?.parentSlug) {
            const parentId = slugToId.get(hierarchyInfo.parentSlug);
            if (parentId) {
                try {
                    await api.put(`/pages/${page.id}`, {
                        data: {
                            parent: parentId
                        }
                    });
                    updated++;
                } catch (error) {
                    console.warn(`⚠️  Ошибка при обновлении parent для ${page.slug}:`, error.message);
                }
            }
        }
    }
    
    console.log(`✅ Обновлено родительских связей: ${updated}\n`);
}

/**
 * Главная функция миграции
 */
async function main() {
    console.log('🚀 Миграция нормализованных страниц в Strapi\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // 1. Загрузить иерархию
        const hierarchy = loadHierarchy();
        
        // 2. Загрузить нормализованные файлы
        if (!fs.existsSync(NORMALIZED_DIR)) {
            console.error(`❌ Директория не найдена: ${NORMALIZED_DIR}`);
            process.exit(1);
        }
        
        const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
        console.log(`📁 Найдено файлов: ${files.length}\n`);
        
        const results = {
            timestamp: new Date().toISOString(),
            total: files.length,
            created: [],
            failed: [],
            errors: []
        };
        
        const createdPages = [];
        
        // 3. Обработать каждую страницу
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if ((i + 1) % 10 === 0) {
                console.log(`  Обработано: ${i + 1}/${files.length} страниц...`);
            }
            
            try {
                const filePath = path.join(NORMALIZED_DIR, file);
                const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                
                const slug = pageData.slug || file.replace('.json', '');
                
                // Разобрать HTML на компоненты
                const html = pageData.normalizedHTML || '';
                const components = parseHTMLToComponents(html, slug);
                
                pageData.components = components;
                
                // Создать страницу в Strapi
                const createdPage = await createPageInStrapi(pageData, hierarchy);
                createdPages.push(createdPage);
                
                results.created.push({
                    id: createdPage.id,
                    slug: slug,
                    title: pageData.title || slug
                });
                
                // Небольшая задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                results.failed.push({
                    file: file,
                    error: error.message
                });
                results.errors.push({
                    file: file,
                    error: error.message,
                    response: error.response?.data
                });
                console.warn(`⚠️  Ошибка при обработке ${file}:`, error.message);
            }
        }
        
        // 4. Обновить parent связи
        if (hierarchy && createdPages.length > 0) {
            await updateParentRelations(createdPages, hierarchy);
        }
        
        // 5. Создать отчет
        fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
        console.log(`📄 JSON отчет сохранен: ${REPORT_FILE}\n`);
        
        // Создать Markdown отчет
        let md = `# Отчет о миграции страниц в Strapi\n\n`;
        md += `**Дата:** ${new Date().toISOString()}\n\n`;
        md += `## 📊 Сводка\n\n`;
        md += `- **Всего страниц:** ${results.total}\n`;
        md += `- **Успешно создано:** ${results.created.length}\n`;
        md += `- **Ошибок:** ${results.failed.length}\n\n`;
        
        if (results.created.length > 0) {
            md += `## ✅ Созданные страницы\n\n`;
            md += `| ID | Slug | Название |\n`;
            md += `|----|------|----------|\n`;
            results.created.forEach(page => {
                md += `| ${page.id} | ${page.slug} | ${page.title} |\n`;
            });
            md += `\n`;
        }
        
        if (results.failed.length > 0) {
            md += `## ❌ Ошибки\n\n`;
            md += `| Файл | Ошибка |\n`;
            md += `|------|--------|\n`;
            results.failed.forEach(item => {
                md += `| ${item.file} | ${item.error} |\n`;
            });
            md += `\n`;
        }
        
        fs.writeFileSync(REPORT_MD_FILE, md, 'utf-8');
        console.log(`📄 Markdown отчет сохранен: ${REPORT_MD_FILE}\n`);
        
        console.log('✅ Миграция завершена!\n');
        console.log('📊 Результаты:');
        console.log(`   - Создано: ${results.created.length}`);
        console.log(`   - Ошибок: ${results.failed.length}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при миграции:', error.message);
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

module.exports = { main, parseHTMLToComponents, createPageInStrapi };
