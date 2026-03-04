/**
 * Скрипт для миграции услуг (Products) из нормализованных страниц в Strapi
 * Определяет страницы-услуги и создает записи Product
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
const SERVICES_TREE_FILE = path.join(__dirname, '../../temp/services-extraction/services-tree.json');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/products-migration-report.json');
const MD_REPORT_FILE = path.join(__dirname, '../../docs/PRODUCTS_MIGRATION_REPORT.md');

/**
 * Определить, является ли страница услугой
 */
function isServicePage(pageData) {
    const section = pageData.section || '';
    const slug = pageData.slug || '';
    const title = (pageData.title || '').toLowerCase();
    
    // Страницы из раздела business обычно являются услугами
    if (section === 'business') {
        // Исключаем общие страницы
        if (slug === 'business' || slug === 'business/index' || slug.includes('all_services')) {
            return false;
        }
        return true;
    }
    
    // Другие разделы обычно не являются услугами
    return false;
}

/**
 * Извлечь информацию об услуге из страницы
 */
function extractProductInfo(pageData) {
    const title = pageData.title || '';
    const slug = pageData.slug || '';
    const metaDescription = pageData.metaDescription || '';
    const heroTitle = pageData.heroTitle || '';
    const heroSubtitle = pageData.heroSubtitle || '';
    
    // Используем heroTitle как название, если есть, иначе title
    const name = heroTitle || title;
    
    // Используем heroSubtitle как описание, если есть, иначе metaDescription
    const description = heroSubtitle || metaDescription || '';
    
    return {
        name: name,
        slug: slug,
        description: description,
        section: pageData.section || 'business',
        originalUrl: pageData.originalUrl || pageData.url || '',
        originalSlug: pageData.originalSlug || slug
    };
}

/**
 * Генерировать slug из названия
 */
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Создать категорию услуг в Strapi
 */
async function createProductCategory(name, slug = null, parentId = null) {
    try {
        // Генерируем slug, если не передан
        const categorySlug = slug || generateSlug(name);
        
        // Проверяем, существует ли уже категория
        const existing = await api.get('/product-categories', {
            params: {
                'filters[slug][$eq]': categorySlug
            }
        });
        
        if (existing.data.data && existing.data.data.length > 0) {
            return existing.data.data[0];
        }
        
        // Создаем новую категорию
        const response = await api.post('/product-categories', {
            data: {
                name: name,
                slug: categorySlug,
                parent: parentId
            }
        });
        
        return response.data.data;
    } catch (error) {
        throw new Error(error.response?.data?.error?.message || error.message);
    }
}

/**
 * Создать продукт в Strapi
 */
async function createProduct(productInfo, categoryId = null) {
    try {
        // Проверяем, существует ли уже продукт
        const existing = await api.get('/products', {
            params: {
                'filters[slug][$eq]': productInfo.slug
            }
        });
        
        // Формируем данные для создания/обновления
        // Согласно схеме Product обязательны: name, slug, shortDescription, fullDescription, images
        const productData = {
            name: productInfo.name,
            slug: productInfo.slug,
            section: productInfo.section,
            shortDescription: productInfo.description || productInfo.name, // Обязательное поле
            fullDescription: productInfo.description || productInfo.name, // Обязательное поле
            images: [] // Обязательное поле, но может быть пустым массивом
        };
        
        if (categoryId) {
            productData.category = categoryId;
        }
        
        // Добавляем дополнительные поля, если они есть
        if (productInfo.originalUrl) {
            productData.originalUrl = productInfo.originalUrl;
        }
        if (productInfo.originalSlug) {
            productData.originalSlug = productInfo.originalSlug;
        }
        
        if (existing.data.data && existing.data.data.length > 0) {
            // Обновляем существующий
            const productId = existing.data.data[0].id;
            const response = await api.put(`/products/${productId}`, {
                data: productData
            });
            
            return response.data.data;
        }
        
        // Создаем новый продукт
        const response = await api.post('/products', {
            data: productData
        });
        
        return response.data.data;
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error(`   Детали ошибки:`, error.response?.data);
        throw new Error(errorMessage);
    }
}

/**
 * Главная функция
 */
async function main() {
    console.log('🛍️  Миграция услуг (Products) в Strapi\n');
    console.log('='.repeat(60) + '\n');
    
    // Загружаем все нормализованные страницы
    const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📦 Загружено файлов: ${files.length}\n`);
    
    const allPages = files.map(file => {
        const filePath = path.join(NORMALIZED_DIR, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
    
    // Определяем страницы-услуги
    const servicePages = allPages.filter(isServicePage);
    console.log(`✅ Найдено страниц-услуг: ${servicePages.length}\n`);
    
    // Загружаем структуру услуг (если есть)
    let servicesTree = null;
    if (fs.existsSync(SERVICES_TREE_FILE)) {
        servicesTree = JSON.parse(fs.readFileSync(SERVICES_TREE_FILE, 'utf-8'));
        console.log(`📋 Загружена структура услуг из services-tree.json\n`);
    }
    
    const results = {
        timestamp: new Date().toISOString(),
        total: servicePages.length,
        categories: [],
        products: [],
        failed: []
    };
    
    // Создаем категории на основе структуры услуг
    const categoryMap = new Map();
    
    if (servicesTree && servicesTree.categories) {
        console.log('📁 Создание категорий услуг...\n');
        
        for (const category of servicesTree.categories) {
            try {
                const categoryData = await createProductCategory(
                    category.name,
                    category.slug,
                    null // Пока не обрабатываем вложенные категории
                );
                
                categoryMap.set(category.slug, categoryData.id);
                results.categories.push({
                    name: category.name,
                    slug: category.slug,
                    id: categoryData.id
                });
                
                console.log(`   ✅ Категория: ${category.name}`);
            } catch (error) {
                console.error(`   ❌ Ошибка создания категории ${category.name}: ${error.message}`);
            }
        }
        
        console.log('');
    }
    
    // Создаем продукты
    console.log('🛍️  Создание продуктов...\n');
    
    for (let i = 0; i < servicePages.length; i++) {
        const page = servicePages[i];
        const productInfo = extractProductInfo(page);
        
        console.log(`[${i + 1}/${servicePages.length}] ${productInfo.name}...`);
        
        try {
            // Определяем категорию (пока упрощенно - по section)
            let categoryId = null;
            if (productInfo.section === 'business') {
                // Можно добавить логику определения категории по slug или другим признакам
                categoryId = null;
            }
            
            const product = await createProduct(productInfo, categoryId);
            
            results.products.push({
                name: productInfo.name,
                slug: productInfo.slug,
                id: product.id,
                categoryId: categoryId
            });
            
            console.log(`   ✅ Создан продукт (ID: ${product.id})`);
        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}`);
            results.failed.push({
                name: productInfo.name,
                slug: productInfo.slug,
                error: error.message
            });
        }
        
        console.log('');
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Создаем Markdown отчет
    let md = `# Отчет о миграции услуг (Products)\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц-услуг:** ${results.total}\n`;
    md += `- **Создано категорий:** ${results.categories.length}\n`;
    md += `- **Создано продуктов:** ${results.products.length}\n`;
    md += `- **Ошибок:** ${results.failed.length}\n\n`;
    
    if (results.categories.length > 0) {
        md += `## 📁 Категории\n\n`;
        md += `| Название | Slug | ID |\n`;
        md += `|----------|------|-----|\n`;
        results.categories.forEach(cat => {
            md += `| ${cat.name} | ${cat.slug} | ${cat.id} |\n`;
        });
        md += `\n`;
    }
    
    if (results.products.length > 0) {
        md += `## 🛍️  Продукты\n\n`;
        md += `| Название | Slug | ID |\n`;
        md += `|---------|------|-----|\n`;
        results.products.slice(0, 50).forEach(prod => {
            md += `| ${prod.name} | ${prod.slug} | ${prod.id} |\n`;
        });
        if (results.products.length > 50) {
            md += `\n*... и еще ${results.products.length - 50} продуктов*\n`;
        }
        md += `\n`;
    }
    
    if (results.failed.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Название | Ошибка |\n`;
        md += `|---------|--------|\n`;
        results.failed.forEach(prod => {
            md += `| ${prod.name} | ${prod.error} |\n`;
        });
        md += `\n`;
    }
    
    fs.writeFileSync(MD_REPORT_FILE, md, 'utf-8');
    
    console.log('='.repeat(60) + '\n');
    console.log('✅ Миграция услуг завершена!\n');
    console.log(`   Создано категорий: ${results.categories.length}`);
    console.log(`   Создано продуктов: ${results.products.length}`);
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

module.exports = { main };
