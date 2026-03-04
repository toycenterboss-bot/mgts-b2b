# Структура файлов Strapi

## Где сохраняются компоненты и типы контента

### 📁 Компоненты (Components)

**Директория:** `src/components/`

**Структура:**
```
src/components/
  └── категория/
      └── имя-компонента/
          └── schema.json
```

**Пример:**
```
src/components/
  └── page/
      ├── meta/
      │   └── schema.json
      ├── hero/
      │   └── schema.json
      ├── cta-button/
      │   └── schema.json
      └── card/
          └── schema.json
```

**Путь к компоненту Meta:**
```
C:\runs\mgts-backend\src\components\page\meta\schema.json
```

**Формат schema.json компонента:**
```json
{
  "collectionName": "components_page_metas",
  "info": {
    "displayName": "Meta",
    "description": "Метаданные страницы"
  },
  "options": {},
  "attributes": {
    "description": {
      "type": "text"
    },
    "keywords": {
      "type": "string"
    }
  }
}
```

---

### 📁 Типы контента (Content Types)

**Директория:** `src/api/`

**Структура:**
```
src/api/
  └── имя-типа/
      ├── content-types/
      │   └── имя-типа/
      │       └── schema.json
      ├── controllers/
      │   └── имя-типа.js
      ├── routes/
      │   └── имя-типа.js
      └── services/
          └── имя-типа.js
```

**Пример для типа Page:**
```
src/api/
  └── page/
      ├── content-types/
      │   └── page/
      │       └── schema.json    ← Здесь хранится схема с полями
      ├── controllers/
      │   └── page.js
      ├── routes/
      │   └── page.js
      └── services/
          └── page.js
```

**Путь к типу Page:**
```
C:\runs\mgts-backend\src\api\page\content-types\page\schema.json
```

**Формат schema.json типа контента:**
```json
{
  "kind": "collectionType",
  "collectionName": "pages",
  "info": {
    "singularName": "page",
    "pluralName": "pages",
    "displayName": "Page"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "slug": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "title": {
      "type": "string",
      "required": true
    },
    "meta": {
      "type": "component",
      "repeatable": false,
      "component": "page.meta"
    }
  }
}
```

---

## 📋 Где что хранится

### Компоненты
- **Местоположение:** `src/components/категория/имя-компонента/schema.json`
- **Создаются через:** Content-Type Builder → Components → Create new component
- **Содержат:** Определение компонента и его полей

### Типы контента (Collection Types)
- **Местоположение:** `src/api/имя-типа/content-types/имя-типа/schema.json`
- **Создаются через:** Content-Type Builder → Create new collection type
- **Содержат:** Определение типа контента и всех его полей

### Поля (Fields)
- **Хранятся в:** `schema.json` соответствующего компонента или типа контента
- **В разделе:** `attributes`
- **Не создаются отдельными файлами** - они часть схемы

---

## 🔍 Как найти файлы

### Найти все компоненты:
```powershell
Get-ChildItem -Path "src\components" -Recurse -Filter "schema.json"
```

### Найти все типы контента:
```powershell
Get-ChildItem -Path "src\api" -Recurse -Filter "schema.json"
```

### Просмотреть структуру:
```powershell
tree /F src\components
tree /F src\api
```

---

## ⚠️ Важно

1. **Не редактируйте schema.json вручную** во время работы Strapi - изменения могут быть потеряны
2. **Всегда создавайте через админ-панель** - Strapi автоматически создаст/обновит файлы
3. **После создания через админ-панель** файлы появляются в файловой системе автоматически
4. **Файлы созданные вручную** (без админ-панели) могут не загрузиться в Strapi 5

---

## 📝 Примеры путей

### Компоненты:
- Meta: `C:\runs\mgts-backend\src\components\page\meta\schema.json`
- Hero: `C:\runs\mgts-backend\src\components\page\hero\schema.json`
- Card: `C:\runs\mgts-backend\src\components\page\card\schema.json`

### Типы контента (после создания):
- Page: `C:\runs\mgts-backend\src\api\page\content-types\page\schema.json`
- Service: `C:\runs\mgts-backend\src\api\service\content-types\service\schema.json`

---

## 🔄 Процесс создания

1. **Создаете через админ-панель:**
   - Content-Type Builder → Create new component/type
   - Заполняете поля
   - Сохраняете

2. **Strapi автоматически:**
   - Создает файл `schema.json` в правильной директории
   - Обновляет структуру проекта
   - Генерирует TypeScript типы (если включено)

3. **Файлы появляются в:**
   - `src/components/` для компонентов
   - `src/api/` для типов контента

---

## 📚 Дополнительная информация

- **Контроллеры:** `src/api/имя-типа/controllers/`
- **Роуты:** `src/api/имя-типа/routes/`
- **Сервисы:** `src/api/имя-типа/services/`
- **Конфигурация:** `config/`
- **Расширения:** `src/extensions/`

