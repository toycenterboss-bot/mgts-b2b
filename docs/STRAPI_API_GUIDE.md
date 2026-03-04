# Руководство по работе со Strapi API

**Дата создания:** 2026-01-11  
**Последнее обновление:** 2026-01-11  
**Версия:** 1.0

## 📋 Содержание

1. [Способы работы со Strapi](#способы-работы-со-strapi)
2. [HTTP API](#http-api)
3. [EntityService (внутренний API)](#entityservice-внутренний-api)
4. [Создание/обновление страниц](#созданиеобновление-страниц)
5. [Работа с компонентами](#работа-с-компонентами)
6. [Типичные ошибки и решения](#типичные-ошибки-и-решения)

## 🔧 Способы работы со Strapi

### 1. HTTP API (внешний доступ)

**Использование:** Для внешних скриптов, интеграций, фронтенда

**Требования:**
- `STRAPI_API_TOKEN` должен быть установлен в переменных окружения
- Strapi должен быть запущен и доступен на `http://localhost:1337`

**Пример:**
```javascript
const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Создать страницу
const response = await api.post('/pages', {
    data: {
        slug: 'test-page',
        title: 'Test Page',
        content: '<p>Content</p>'
    }
});

// Получить страницу по slug
const page = await api.get(`/pages?filters[slug][$eq]=test-page`);

// Обновить страницу
const updateResponse = await api.put(`/pages/${pageId}`, {
    data: {
        title: 'Updated Title'
    }
});
```

**Ограничения:**
- Требуется API токен
- Ограничения размера payload (по умолчанию ~1MB)
- Может быть медленнее, чем entityService

### 2. EntityService (внутренний API) ⭐ РЕКОМЕНДУЕТСЯ

**Использование:** Для скриптов миграции, внутренних задач, запуска через Strapi console

**Преимущества:**
- Не требует API токена
- Нет ограничений на размер payload
- Быстрее, чем HTTP API
- Доступ к полному функционалу Strapi

**Пример скрипта для запуска через node:**
```javascript
const { createStrapi } = require('@strapi/strapi');

async function migratePages() {
    let app;
    try {
        app = await createStrapi({
            distDir: './dist',
            autoReload: false,
            serveAdminPanel: false,
        }).load();

        // Работа с entityService
        const pages = await app.entityService.findMany('api::page.page', {
            filters: { slug: 'test-page' },
            limit: 1
        });

        if (pages && pages.length > 0) {
            // Обновить существующую страницу
            const updated = await app.entityService.update('api::page.page', pages[0].id, {
                data: {
                    title: 'Updated Title',
                    content: '<p>New content</p>'
                }
            });
        } else {
            // Создать новую страницу
            const created = await app.entityService.create('api::page.page', {
                data: {
                    slug: 'test-page',
                    title: 'Test Page',
                    content: '<p>Content</p>'
                }
            });
        }
    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        if (app) {
            await app.destroy();
        }
    }
}

migratePages();
```

**Пример модуля для Strapi console:**
```javascript
// Файл: scripts/my-migration.js
module.exports = async ({ strapi }) => {
    // Используем strapi.entityService напрямую
    const pages = await strapi.entityService.findMany('api::page.page', {
        filters: { slug: 'test-page' }
    });
    
    // ... ваша логика
};
```

**Запуск через Strapi console:**
```bash
cd mgts-backend
npm run strapi console
# В консоли:
.load scripts/my-migration.js
```

**Запуск как standalone скрипт:**
```bash
cd mgts-backend
node scripts/run-migration-with-dynamic.js
```

## 📄 Создание/обновление страниц

### Проверка существования страницы

```javascript
// Через entityService (рекомендуется)
const existing = await strapi.entityService.findMany('api::page.page', {
    filters: { slug: pageData.slug },
    limit: 1
});

if (existing && existing.length > 0) {
    // Страница существует - обновляем
    const updated = await strapi.entityService.update('api::page.page', existing[0].id, {
        data: updateData
    });
} else {
    // Страница не существует - создаем
    const created = await strapi.entityService.create('api::page.page', {
        data: createData
    });
}
```

### Полная структура данных для Page

```javascript
const pageData = {
    slug: 'page-slug',                    // string, required, unique
    title: 'Page Title',                  // string, required
    heroTitle: 'Hero Title',              // string, optional
    heroSubtitle: 'Hero Subtitle',        // text, optional
    metaDescription: 'Meta description',  // text, optional
    metaKeywords: 'keywords',             // string, optional
    content: '<p>HTML content</p>',       // richtext, optional
    section: 'business',                  // enumeration: 'business'|'operators'|'government'|'partners'|'developers'|'about_mgts'|'news'|'home'|'other'
    order: 0,                             // integer, optional
    originalUrl: 'https://old-site.com/page', // string, optional
    isMenuVisible: true,                  // boolean, optional
    sidebar: 'none',                      // enumeration: 'none'|'about'
    parent: parentPageId,                 // relation (id страницы-родителя), optional
    publishedAt: new Date().toISOString() // datetime, optional
};
```

### Установка parent связи

```javascript
// После создания/обновления всех страниц
const parentPage = await strapi.entityService.findMany('api::page.page', {
    filters: { slug: 'parent-slug' },
    limit: 1
});

const childPage = await strapi.entityService.findMany('api::page.page', {
    filters: { slug: 'child-slug' },
    limit: 1
});

if (parentPage && childPage && parentPage.length > 0 && childPage.length > 0) {
    await strapi.entityService.update('api::page.page', childPage[0].id, {
        data: {
            parent: parentPage[0].id
        }
    });
}
```

## 🧩 Работа с компонентами

### Создание страницы с компонентами (Dynamic Zones)

Strapi поддерживает Dynamic Zones для повторяющихся компонентов. Однако, для простоты миграции, мы сохраняем весь HTML контент в поле `content` (richtext).

**Если нужно работать с компонентами напрямую:**

```javascript
const pageData = {
    slug: 'page-slug',
    title: 'Page Title',
    components: [
        {
            __component: 'page.hero',
            title: 'Hero Title',
            subtitle: 'Hero Subtitle'
        },
        {
            __component: 'page.section-text',
            content: '<p>Text content</p>'
        },
        {
            __component: 'page.service-faq',
            items: [
                {
                    question: 'Question 1',
                    answer: 'Answer 1'
                }
            ]
        }
    ]
};
```

## ❌ Типичные ошибки и решения

### Ошибка 404: "Not Found"

**Причина:** API endpoint недоступен или неправильный URL

**Решение:**
- Проверьте, запущен ли Strapi: `lsof -ti:1337` или `curl http://localhost:1337/_health`
- Используйте entityService вместо HTTP API
- Проверьте правильность формата URL: `/api/pages` (не `/pages`)

### Ошибка 400: "ValidationError"

**Причина:** Невалидные данные (отсутствуют required поля, неправильный тип данных)

**Решение:**
- Проверьте, что все required поля заполнены: `slug`, `title`
- Проверьте типы данных (enumeration должен быть из списка допустимых значений)
- Проверьте формат дат: используйте ISO 8601 (`new Date().toISOString()`)

### Ошибка 413: "PayloadTooLargeError"

**Причина:** Размер контента превышает лимит Strapi (по умолчанию ~1MB для HTTP API)

**Решение:**
- Используйте entityService вместо HTTP API (нет ограничений)
- Или увеличьте лимит в конфигурации Strapi (`config/middlewares.ts`)

### Ошибка 401: "Unauthorized"

**Причина:** Отсутствует или неверный API токен

**Решение:**
- Проверьте переменную окружения `STRAPI_API_TOKEN`
- Или используйте entityService (не требует токена)

### Ошибка: "slug must be a string type, but the final value was: null"

**Причина:** Slug не определен или пустой

**Решение:**
- Проверьте, что `pageData.slug` не пустой и не null
- Пропустите файлы без slug или установите дефолтное значение

## 📝 Примеры скриптов

### Пример 1: Миграция страниц из JSON файлов

```javascript
const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');

async function migratePages() {
    const app = await createStrapi({
        distDir: './dist',
        autoReload: false,
        serveAdminPanel: false,
    }).load();

    const pagesDir = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, file), 'utf-8'));
        
        if (!pageData.slug) {
            console.warn(`Пропускаю ${file}: нет slug`);
            continue;
        }

        const existing = await app.entityService.findMany('api::page.page', {
            filters: { slug: pageData.slug },
            limit: 1
        });

        const payload = {
            slug: pageData.slug,
            title: pageData.title || pageData.slug,
            content: pageData.normalizedHTML || '',
            publishedAt: new Date().toISOString()
        };

        if (existing && existing.length > 0) {
            await app.entityService.update('api::page.page', existing[0].id, { data: payload });
            console.log(`Обновлено: ${pageData.slug}`);
        } else {
            await app.entityService.create('api::page.page', { data: payload });
            console.log(`Создано: ${pageData.slug}`);
        }
    }

    await app.destroy();
}

migratePages();
```

### Пример 2: Вставка dynamicContent в normalizedHTML

```javascript
const { JSDOM } = require('jsdom');

function insertDynamicContent(normalizedHTML, dynamicContent) {
    if (!dynamicContent || !dynamicContent.type) {
        return normalizedHTML;
    }

    // Преобразовать dynamicContent в HTML
    const dynamicHTML = convertDynamicContentToHTML(dynamicContent);
    
    // Найти место для вставки (например, после service-tariffs, перед service-order-form)
    const insertionPoint = findInsertionPoint(normalizedHTML, dynamicContent.type);
    
    // Вставить в правильное место
    if (insertionPoint) {
        const dom = new JSDOM(normalizedHTML);
        const doc = dom.window.document;
        const sections = Array.from(doc.querySelectorAll('section'));
        
        // Логика вставки...
        
        return doc.body.innerHTML;
    }
    
    return normalizedHTML + dynamicHTML;
}
```

## 🔑 Ключевые принципы

1. **Используйте entityService для миграций** - это быстрее и надежнее
2. **Всегда проверяйте существование** перед созданием/обновлением
3. **Проверяйте required поля** перед отправкой данных
4. **Используйте правильные типы данных** для enumeration полей
5. **Обрабатывайте ошибки** - логируйте их для отладки
6. **Сохраняйте отчеты** - фиксируйте результаты миграции в JSON/Markdown

## 📚 Полезные ссылки

- [Strapi EntityService API](https://docs.strapi.io/dev-docs/backend-customization/services#entity-service-api)
- [Strapi REST API](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi Content-Types](https://docs.strapi.io/dev-docs/backend-customization/models)
