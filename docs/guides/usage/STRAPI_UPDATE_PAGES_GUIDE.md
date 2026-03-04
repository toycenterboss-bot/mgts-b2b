# Руководство по обновлению страниц в Strapi через API

## 🔑 API Токен

API токен должен быть установлен в переменной окружения `STRAPI_API_TOKEN` (не хранить в репозитории):

```bash
export STRAPI_API_TOKEN="your_token_here"
```

## 📝 Шаблон скрипта для обновления страницы

### Базовый шаблон (Node.js + axios)

```javascript
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API токен из переменных окружения
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  throw new Error('STRAPI_API_TOKEN is required (create token in Strapi Admin → Settings → API Tokens)');
}

// URL Strapi
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Создать axios клиент
const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Обновление страницы
 */
async function updatePage(slug, newContent) {
  try {
    console.log(`[Update Page] Начинаю обновление страницы ${slug}...\n`);

    // Получить текущую страницу из Strapi
    console.log('[Update Page] Получение текущей страницы из Strapi...');
    const findResponse = await api.get('/pages', {
      params: {
        'filters[slug][$eq]': slug
      }
    });

    if (!findResponse.data.data || findResponse.data.data.length === 0) {
      console.error(`❌ Страница с slug "${slug}" не найдена в Strapi`);
      return false;
    }

    const page = findResponse.data.data[0];
    const pageId = page.documentId || page.id;
    
    console.log(`[Update Page] Найдена страница: ${page.title || 'без названия'} (ID: ${pageId})`);

    // Подготовить данные для обновления
    const updateData = {
      content: newContent,
      // Можно добавить другие поля:
      // title: newTitle,
      // metaDescription: newMetaDescription,
      // heroTitle: newHeroTitle,
      // и т.д.
    };

    // Обновить страницу в Strapi
    console.log('[Update Page] Обновление контента в Strapi...');
    const updateResponse = await api.put(`/pages/${pageId}`, {
      data: updateData
    });

    if (updateResponse.status !== 200) {
      throw new Error(`Ошибка при обновлении: ${updateResponse.status}`);
    }

    console.log('\n✅ Страница успешно обновлена в Strapi!');
    return true;
  } catch (error) {
    console.error('\n❌ Ошибка при обновлении страницы:', error.message);
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Запуск
if (require.main === module) {
  const slug = 'business/security'; // Замените на нужный slug
  const newContent = '<section>...</section>'; // Новый контент
  
  updatePage(slug, newContent)
    .then(success => {
      if (success) {
        console.log('✅ Готово! Обновите страницу в браузере (Ctrl+F5)');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { updatePage };
```

## 🔄 Процесс обновления

### 1. Получить текущую страницу

```javascript
const findResponse = await api.get('/pages', {
  params: {
    'filters[slug][$eq]': 'business/security'
  }
});

const page = findResponse.data.data[0];
const pageId = page.documentId || page.id; // В Strapi v5 может быть documentId
```

### 2. Обновить страницу

```javascript
const updateResponse = await api.put(`/pages/${pageId}`, {
  data: {
    content: newContent,
    title: newTitle, // опционально
    metaDescription: newMetaDescription, // опционально
    // другие поля...
  }
});
```

## 📋 Примеры использования

### Пример 1: Обновление контента из JSON файла

```javascript
// Загрузить исправленный контент из файла
const fixedContentPath = path.join(__dirname, '../../strapi-backups/2026-01-07_19-29-07/business_security_fixed.json');
const fixedData = JSON.parse(fs.readFileSync(fixedContentPath, 'utf-8'));

// Обновить страницу
await updatePage(fixedData.slug, fixedData.content);
```

### Пример 2: Обновление только контента

```javascript
const newContent = `
<section class="section">
    <div class="container">
        <h2 class="section-title">Заголовок</h2>
        <div class="grid grid-cols-3">
            <div class="card">...</div>
        </div>
    </div>
</section>
`;

await updatePage('business/security', newContent);
```

### Пример 3: Обновление нескольких полей

```javascript
const updateData = {
  content: newContent,
  title: 'Новый заголовок',
  metaDescription: 'Новое описание',
  heroTitle: 'Новый hero заголовок',
  heroSubtitle: 'Новый hero подзаголовок',
  breadcrumbs: JSON.stringify([
    { name: 'Главная', url: '../../index.html' },
    { name: 'Бизнес', url: '../index.html' }
  ]),
  sidebar: 'none'
};

const page = await getPage('business/security');
await api.put(`/pages/${page.documentId || page.id}`, { data: updateData });
```

## 🛠️ Готовые скрипты

В проекте уже есть готовые скрипты для обновления:

1. **`mgts-backend/scripts/update-security-page.js`** - обновление страницы business/security
2. **`mgts-backend/scripts/fix-telephony-page.js`** - исправление страницы business/telephony
3. **`mgts-backend/scripts/update-classes-in-strapi.js`** - обновление классов в контенте

## ⚠️ Важные моменты

1. **ID страницы**: В Strapi v5 может использоваться `documentId` вместо `id`. Всегда проверяйте оба варианта:
   ```javascript
   const pageId = page.documentId || page.id;
   ```

2. **Структура данных**: При обновлении данные должны быть обернуты в объект `data`:
   ```javascript
   {
     data: {
       content: newContent
     }
   }
   ```

3. **Ошибка 401**: Если получаете ошибку авторизации, проверьте:
   - Правильность API токена
   - Что токен не истек
   - Что токен имеет права на обновление (Full access)

4. **Ошибка 404**: Если страница не найдена:
   - Проверьте правильность slug
   - Убедитесь, что страница существует в Strapi
   - Проверьте, что страница опубликована (publishedAt не null)

## 🚀 Быстрый запуск

```bash
# Установить токен (опционально, если не в скрипте)
export STRAPI_API_TOKEN="<REDACTED>"

# Запустить скрипт
cd mgts-backend
node scripts/update-security-page.js
```

## 📚 Дополнительные ресурсы

- **CONTEXT.md** - содержит API токен и общую информацию о проекте
- **CONTEXT.md** - общий контекст проекта (без секретов); токены хранить в env/.env
- **CMS_CONTENT_TYPES.md** - правила типизации контента
- **STRAPI_CONTENT_FIX_business_security.md** - пример исправления конкретной страницы

