/**
 * Скрипт для миграции новостей из формата Page в формат News в Strapi
 * Извлекает новости из pages-content-normalized и создает записи News с категориями и тегами
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

// Путь к нормализованным страницам
const PAGES_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');

// Функция для извлечения даты из HTML контента
function extractPublishDate(html, slug) {
    if (!html) return new Date().toISOString();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Пробуем найти дату в различных форматах
    const datePatterns = [
        /(\d{2})\.(\d{2})\.(\d{4})/g, // DD.MM.YYYY
        /(\d{4})-(\d{2})-(\d{2})/g,   // YYYY-MM-DD
    ];
    
    // Ищем дату в заголовке новости или breadcrumbs
    const dateElements = document.querySelectorAll('.header__date, .news-row-item__date, .publish-date');
    for (const elem of dateElements) {
        const text = elem.textContent.trim();
        const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) {
            const [, day, month, year] = match;
            return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
        }
    }
    
    // Если дата не найдена, пытаемся извлечь из текста
    const text = document.body.textContent || '';
    const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
    }
    
    // Fallback - используем текущую дату
    console.warn(`⚠️  Дата публикации не найдена для новости ${slug}, используется текущая дата`);
    return new Date().toISOString();
}

// Функция для извлечения краткого описания
function extractShortDescription(html, title) {
    if (!html) return title || '';
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Ищем краткое описание в различных местах
    const descriptionSelectors = [
        '.news-info-box__text',
        '.short-description',
        '.excerpt',
        'meta[name="description"]'
    ];
    
    for (const selector of descriptionSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
            const text = elem.textContent || elem.content || '';
            if (text.trim()) {
                // Ограничиваем длину до 300 символов
                return text.trim().substring(0, 300);
            }
        }
    }
    
    // Пытаемся извлечь первый абзац
    const firstParagraph = document.querySelector('p.p1-comp-reg, p.p1-text-reg, p');
    if (firstParagraph) {
        const text = firstParagraph.textContent.trim();
        if (text && text.length > 50) {
            return text.substring(0, 300);
        }
    }
    
    // Fallback - используем заголовок
    return title || '';
}

// Функция для определения категории новости на основе заголовка и контента
function determineCategory(title, content) {
    const titleLower = (title || '').toLowerCase();
    const contentLower = (content || '').toLowerCase();
    
    const combined = `${titleLower} ${contentLower}`;
    
    if (combined.includes('тариф') || combined.includes('стоимость') || combined.includes('цена')) {
        return 'Тарифы';
    }
    if (combined.includes('безопасность') || combined.includes('мошенничество') || combined.includes('защита')) {
        return 'Безопасность';
    }
    if (combined.includes('техническ') || combined.includes('оборудован') || combined.includes('работа')) {
        return 'Технические новости';
    }
    if (combined.includes('акция') || combined.includes('скидка') || combined.includes('промо')) {
        return 'Акции и предложения';
    }
    if (combined.includes('запрет') || combined.includes('ограничение')) {
        return 'Технические новости';
    }
    
    // Категория по умолчанию
    return 'Общие новости';
}

// Функция для извлечения тегов из контента
function extractTags(title, content) {
    const tags = new Set();
    const titleLower = (title || '').toLowerCase();
    const contentLower = (content || '').toLowerCase();
    const combined = `${titleLower} ${contentLower}`;
    
    // Определяем теги на основе ключевых слов
    if (combined.includes('тариф') || combined.includes('стоимость')) {
        tags.add('тарифы');
    }
    if (combined.includes('безопасность') || combined.includes('мошенничество')) {
        tags.add('безопасность');
    }
    if (combined.includes('бизнес') || combined.includes('корпоративн')) {
        tags.add('бизнес');
    }
    if (combined.includes('техническ')) {
        tags.add('технические');
    }
    if (combined.includes('акция')) {
        tags.add('акции');
    }
    if (combined.includes('мгтс')) {
        tags.add('мгтс');
    }
    
    return Array.from(tags);
}

// Функция для транслитерации русского текста
function transliterate(text) {
    const map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return text.toLowerCase()
        .split('')
        .map(char => map[char] || char)
        .join('')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Функция для создания или получения категории
async function getOrCreateCategory(categoryName) {
    // Генерируем slug из названия категории с транслитерацией
    let slug = transliterate(categoryName);
    
    // Если slug пустой, используем простую замену пробелов
    if (!slug || slug.length === 0) {
        slug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    }
    
    // Fallback - если все еще пустой, создаем slug из первых букв
    if (!slug || slug.length === 0) {
        slug = 'category-' + Date.now();
    }
    
    try {
        // Проверяем, существует ли категория по slug или name
        const existingBySlug = await api.get(`/news-categories?filters[slug][$eq]=${encodeURIComponent(slug)}`);
        if (existingBySlug.data && existingBySlug.data.data && existingBySlug.data.data.length > 0) {
            return existingBySlug.data.data[0].id;
        }
        
        // Проверяем по name
        const existingByName = await api.get(`/news-categories?filters[name][$eq]=${encodeURIComponent(categoryName)}`);
        if (existingByName.data && existingByName.data.data && existingByName.data.data.length > 0) {
            return existingByName.data.data[0].id;
        }
        
        // Создаем новую категорию
        const created = await api.post('/news-categories', {
            data: {
                name: categoryName,
                slug: slug,
                description: `Категория новостей: ${categoryName}`
            }
        });
        
        return created.data.data.id;
    } catch (error) {
        // Если ошибка "must be unique", значит категория уже существует - найдем ее
        if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('unique')) {
            try {
                const existing = await api.get(`/news-categories?filters[name][$eq]=${encodeURIComponent(categoryName)}`);
                if (existing.data && existing.data.data && existing.data.data.length > 0) {
                    return existing.data.data[0].id;
                }
            } catch (e) {
                // Игнорируем ошибку поиска
            }
        }
        const errorMsg = error.response?.data?.error || error.response?.data || error.message;
        console.error(`❌ Ошибка при создании категории "${categoryName}":`, JSON.stringify(errorMsg, null, 2));
        return null;
    }
}

// Функция для создания или получения тега
async function getOrCreateTag(tagName) {
    // Генерируем slug из названия тега с транслитерацией
    let slug = transliterate(tagName);
    
    // Если slug пустой, используем простую замену пробелов
    if (!slug || slug.length === 0) {
        slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    }
    
    // Fallback - если все еще пустой, создаем slug из первых букв
    if (!slug || slug.length === 0) {
        slug = 'tag-' + Date.now();
    }
    
    try {
        // Проверяем, существует ли тег по slug или name
        const existingBySlug = await api.get(`/news-tags?filters[slug][$eq]=${encodeURIComponent(slug)}`);
        if (existingBySlug.data && existingBySlug.data.data && existingBySlug.data.data.length > 0) {
            return existingBySlug.data.data[0].id;
        }
        
        // Проверяем по name
        const existingByName = await api.get(`/news-tags?filters[name][$eq]=${encodeURIComponent(tagName)}`);
        if (existingByName.data && existingByName.data.data && existingByName.data.data.length > 0) {
            return existingByName.data.data[0].id;
        }
        
        // Создаем новый тег
        const created = await api.post('/news-tags', {
            data: {
                name: tagName,
                slug: slug
            }
        });
        
        return created.data.data.id;
    } catch (error) {
        // Если ошибка "must be unique", значит тег уже существует - найдем его
        if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('unique')) {
            try {
                const existing = await api.get(`/news-tags?filters[name][$eq]=${encodeURIComponent(tagName)}`);
                if (existing.data && existing.data.data && existing.data.data.length > 0) {
                    return existing.data.data[0].id;
                }
            } catch (e) {
                // Игнорируем ошибку поиска
            }
        }
        const errorMsg = error.response?.data?.error || error.response?.data || error.message;
        console.error(`❌ Ошибка при создании тега "${tagName}":`, JSON.stringify(errorMsg, null, 2));
        return null;
    }
}

// Функция для создания изображения-заглушки
async function getOrCreateDefaultImage() {
    try {
        // Пробуем найти изображение по умолчанию
        const existing = await api.get('/upload/files?filters[name][$eq]=news-default.jpg');
        if (existing.data && existing.data.length > 0) {
            return existing.data[0].id;
        }
        
        // Если нет изображения, возвращаем null (featuredImage required, но можно использовать существующее)
        console.warn('⚠️  Изображение по умолчанию не найдено. Нужно загрузить featuredImage вручную или изменить схему.');
        return null;
    } catch (error) {
        console.warn('⚠️  Не удалось найти изображение по умолчанию:', error.message);
        return null;
    }
}

async function migrateNews() {
    console.log('🔄 Миграция новостей из формата Page в формат News...\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        // Находим все файлы новостей
        const files = fs.readdirSync(PAGES_DIR)
            .filter(file => file.startsWith('news_') && file.endsWith('.json'))
            .map(file => path.join(PAGES_DIR, file));
        
        console.log(`📄 Найдено файлов новостей: ${files.length}\n`);
        
        if (files.length === 0) {
            console.warn('⚠️  Файлы новостей не найдены');
            return;
        }
        
        let migrated = 0;
        let skipped = 0;
        let errors = 0;
        
        // Сначала создаем категории по умолчанию
        console.log('📂 Создание категорий новостей...\n');
        const categories = [
            'Общие новости',
            'Тарифы',
            'Безопасность',
            'Технические новости',
            'Акции и предложения'
        ];
        
        const categoryMap = new Map();
        for (const catName of categories) {
            const catId = await getOrCreateCategory(catName);
            if (catId) {
                categoryMap.set(catName, catId);
                console.log(`✅ Категория "${catName}" готова (ID: ${catId})`);
            }
        }
        console.log('');
        
        // Мигрируем каждую новость
        for (const filePath of files) {
            try {
                const newsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const slug = newsData.slug.replace('news_', ''); // Убираем префикс news_
                
                console.log(`📰 Миграция новости: ${newsData.title || slug}`);
                
                // Извлекаем данные (сначала извлекаем, чтобы использовать в update)
                const html = newsData.content?.html || newsData.normalizedHTML || '';
                const title = newsData.title || slug;
                const shortDescription = extractShortDescription(html, title);
                const publishDate = extractPublishDate(html, slug);
                const categoryName = determineCategory(title, html);
                const tags = extractTags(title, html);
                
                // Получаем ID категории
                const categoryId = categoryMap.get(categoryName);
                
                // Получаем ID тегов
                const tagIds = [];
                for (const tagName of tags) {
                    const tagId = await getOrCreateTag(tagName);
                    if (tagId) {
                        tagIds.push(tagId);
                    }
                }
                
                // Проверяем, существует ли уже эта новость
                // Используем endpoint /news-items (pluralName в схеме)
                const existing = await api.get(`/news-items?filters[slug][$eq]=${encodeURIComponent(slug)}`);
                if (existing.data && existing.data.data && existing.data.data.length > 0) {
                    // Если новость существует, обновляем ее связи (category и tags)
                    const existingNews = existing.data.data[0];
                    const existingId = existingNews.documentId || existingNews.id;
                    
                    console.log(`   ⚠️  Новость с slug "${slug}" уже существует, обновляем связи...`);
                    
                    const updatePayload = {
                        data: {}
                    };
                    
                    // Обновляем категорию если есть
                    if (categoryId) {
                        updatePayload.data.category = categoryId;
                    }
                    
                    // Обновляем теги если есть
                    if (tagIds.length > 0) {
                        updatePayload.data.tags = tagIds;
                    }
                    
                    // Если есть что обновлять, обновляем
                    if (Object.keys(updatePayload.data).length > 0) {
                        try {
                            await api.put(`/news-items/${existingId}`, updatePayload);
                            console.log(`   ✅ Связи обновлены (категория: ${categoryName}, тегов: ${tags.length})\n`);
                            migrated++;
                        } catch (updateError) {
                            console.log(`   ⚠️  Не удалось обновить связи: ${updateError.response?.status || updateError.message}\n`);
                            skipped++;
                        }
                    } else {
                        console.log(`   ⏭️  Пропущено: связи уже установлены\n`);
                        skipped++;
                    }
                    continue;
                }
                
                // Нормализуем HTML контент (убираем breadcrumbs, header)
                const normalizedContent = normalizeNewsContent(html);
                
                // Создаем новость
                // Для Strapi v5: manyToOne (category) - просто ID, manyToMany (tags) - массив ID
                const newsPayload = {
                    data: {
                        slug: slug,
                        title: title,
                        shortDescription: shortDescription,
                        content: normalizedContent,
                        publishDate: publishDate,
                        author: 'МГТС',
                        isFeatured: false,
                        viewsCount: 0,
                        metaDescription: newsData.metaDescription || shortDescription.substring(0, 160),
                        metaKeywords: newsData.metaKeywords || tags.join(', ')
                        // featuredImage не обязателен - можно добавить позже
                    }
                };
                
                // Добавляем категорию если есть
                if (categoryId) {
                    newsPayload.data.category = categoryId;
                }
                
                // Добавляем теги если есть
                if (tagIds.length > 0) {
                    newsPayload.data.tags = tagIds;
                }
                
                // Используем endpoint /news-items (pluralName в схеме)
                const created = await api.post('/news-items', newsPayload);
                if (created.data && created.data.data) {
                    console.log(`   ✅ Создано: ${title} (ID: ${created.data.data.id}, категория: ${categoryName}${categoryId ? ' (ID: ' + categoryId + ')' : ''}, тегов: ${tags.length}${tagIds.length > 0 ? ' (IDs: ' + tagIds.join(', ') + ')' : ''})\n`);
                    migrated++;
                } else {
                    console.log(`   ❌ Ошибка: не удалось создать новость\n`);
                    errors++;
                }
                
            } catch (error) {
                const errorMsg = error.response?.data?.error || error.response?.data || error.message;
                console.error(`   ❌ Ошибка при миграции ${filePath}:`, JSON.stringify(errorMsg, null, 2));
                if (error.response?.status === 404) {
                    console.error(`   ⚠️  Endpoint не найден. Убедитесь, что Strapi запущен и endpoint /api/news-items доступен.`);
                }
                errors++;
            }
        }
        
        console.log('='.repeat(60) + '\n');
        console.log('✅ Миграция новостей завершена!\n');
        console.log(`   - ✅ Мигрировано/Обновлено: ${migrated}`);
        console.log(`   - ⏭️  Пропущено: ${skipped}`);
        console.log(`   - ❌ Ошибок: ${errors}\n`);
        
    } catch (error) {
        console.error('\n❌ Ошибка при миграции новостей:', error.message);
        if (error.response) {
            console.error('   Статус:', error.response.status);
            console.error('   Ответ:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Функция для нормализации контента новости (убираем breadcrumbs, лишние элементы)
function normalizeNewsContent(html) {
    if (!html) return '';
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Удаляем breadcrumbs
    const breadcrumbs = document.querySelectorAll('.bread-crumbs-row, .breadcrumbs');
    breadcrumbs.forEach(el => el.remove());
    
    // Удаляем лишние контейнеры, оставляем только основной контент
    const mainContent = document.querySelector('.news-item-page__content, .content, .page-content') 
        || document.body;
    
    return mainContent.innerHTML || html;
}

// Запуск
if (require.main === module) {
    migrateNews();
}

module.exports = { migrateNews };
