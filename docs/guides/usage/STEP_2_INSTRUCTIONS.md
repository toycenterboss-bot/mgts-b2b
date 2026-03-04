# Инструкции по выполнению Этапа 2: Извлечение и структурирование контента

## Текущий статус

✅ **Этап 1 завершен:**
- Strapi установлен и развернут
- Админ-панель доступна
- Первый администратор создан

⏭️ **Этап 2: Извлечение и структурирование контента**

## Обзор Этапа 2

Этап 2 включает:
1. **Анализ существующего контента** - инвентаризация всех страниц
2. **Определение схемы данных** - создание типов контента в Strapi
3. **Извлечение контента из HTML** - парсинг существующих страниц
4. **Очистка и валидация данных** - проверка и исправление данных

**Время выполнения:** 18-24 часа  
**Приоритет:** ВЫСОКИЙ

---

## Шаг 2.1: Анализ существующего контента

**Время:** 4-6 часов

### Цель

Создать полный список всех HTML страниц сайта и проанализировать их структуру.

### Подготовка

1. **Убедитесь, что вы в правильной директории:**

```powershell
# Проект Strapi находится в:
cd C:\runs\mgts-backend
```

2. **Перейти в директорию проекта Strapi:**

```powershell
# Если проект в C:\runs\mgts-backend
cd C:\runs\mgts-backend

# Создать структуру для скриптов (если еще не создана)
mkdir scripts -Force
mkdir scripts\extract-content -Force
```

### Задача 2.1.1: Создание скрипта инвентаризации

Создайте файл `scripts/extract-content/inventory.js`:

```javascript
const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findHtmlFiles(filePath, fileList);
    } else if (file === 'index.html') {
      fileList.push({
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        depth: filePath.split(path.sep).length - 1
      });
    }
  });
  
  return fileList;
}

// Определение пути к корню сайта
const siteRoot = process.env.SITE_ROOT || 
  (() => {
    // Попытка найти SiteMGTS автоматически
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      const siteDir = path.join(currentDir, '..', '..', '..', 'SiteMGTS');
      if (fs.existsSync(siteDir)) {
        return siteDir;
      }
      currentDir = path.dirname(currentDir);
    }
    // Путь по умолчанию
    return path.join(__dirname, '..', '..', '..', 'SiteMGTS');
  })();

// Проверка существования директории
if (!fs.existsSync(siteRoot)) {
  console.error(`Ошибка: Директория SiteMGTS не найдена по пути: ${siteRoot}`);
  console.error('Установите переменную окружения SITE_ROOT');
  console.error('Пример: $env:SITE_ROOT="C:\\Users\\abefremov\\SiteMGTS"');
  process.exit(1);
}

console.log(`Поиск HTML файлов в: ${siteRoot}`);

const htmlFiles = findHtmlFiles(siteRoot);

console.log(`\nНайдено HTML файлов: ${htmlFiles.length}`);
console.log('\nСтруктура:');
htmlFiles.forEach(file => {
  console.log(`  ${file.relativePath} (уровень ${file.depth})`);
});

// Сохранить в JSON
const outputPath = path.join(__dirname, 'inventory.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(htmlFiles, null, 2)
);

console.log(`\nРезультаты сохранены в: ${outputPath}`);
```

### Задача 2.1.2: Запуск инвентаризации

```powershell
# Установить переменную окружения (если нужно)
$env:SITE_ROOT = "C:\runs\SiteMGTS"

# Перейти в директорию проекта Strapi
cd C:\runs\mgts-backend\scripts\extract-content

# Запустить скрипт
node inventory.js
```

**Ожидаемый результат:** Файл `inventory.json` со списком всех страниц.

### Задача 2.1.3: Анализ типов контента

Создайте файл `scripts/extract-content/analyze-content-types.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Установить jsdom: npm install jsdom

function analyzePage(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const analysis = {
    path: filePath,
    title: document.querySelector('title')?.textContent || '',
    meta: {
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || ''
    },
    hasHero: !!document.querySelector('.hero'),
    hasBreadcrumbs: !!document.querySelector('.breadcrumbs'),
    hasSidebar: !!document.querySelector('[data-component="sidebar-about"]'),
    sections: [],
    images: [],
    links: []
  };
  
  // Анализ секций
  document.querySelectorAll('section').forEach(section => {
    analysis.sections.push({
      class: section.className,
      hasTitle: !!section.querySelector('h1, h2, h3'),
      hasCards: !!section.querySelector('.card'),
      hasGrid: !!section.querySelector('.grid')
    });
  });
  
  // Анализ изображений
  document.querySelectorAll('img').forEach(img => {
    analysis.images.push({
      src: img.src,
      alt: img.alt || ''
    });
  });
  
  return analysis;
}

// Запуск анализа
const inventoryPath = path.join(__dirname, 'inventory.json');
if (!fs.existsSync(inventoryPath)) {
  console.error('Сначала запустите inventory.js');
  process.exit(1);
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

console.log('Анализ контента...');
const analyses = inventory.map(file => {
  try {
    return analyzePage(file.path);
  } catch (error) {
    console.error(`Ошибка при анализе ${file.path}:`, error.message);
    return null;
  }
}).filter(Boolean);

const outputPath = path.join(__dirname, 'content-analysis.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(analyses, null, 2)
);

console.log(`Анализ завершен. Результаты в ${outputPath}`);
console.log(`Проанализировано страниц: ${analyses.length}`);
```

**Установка зависимостей:**

```powershell
npm install jsdom
```

**Запуск:**

```powershell
# Перейти в директорию проекта Strapi
cd C:\runs\mgts-backend\scripts\extract-content

# Запустить анализ
node analyze-content-types.js
```

---

## Шаг 2.2: Определение схемы данных

**Время:** 4-6 часов

### Цель

Создать типы контента в Strapi на основе анализа существующих страниц.

### ⚠️ Важные замечания перед началом

1. **Формат Category для компонентов:**
   - Должен быть в формате API ID: только строчные буквы, цифры и дефисы
   - **Правильно:** `page`, `section`, `ui-component`
   - **Неправильно:** `Page`, `UI Component`, `page component` (вызовет ошибку "The value does not match the regex")
   - Если категории нет, просто введите новое значение - она создастся автоматически

2. **Порядок работы:**
   - Сначала создайте все компоненты (Задача 2.2.2)
   - Затем добавьте поля типа Component в тип Page (Задача 2.2.1, шаг 7)
   - Компоненты должны существовать, чтобы их можно было выбрать

### Задача 2.2.1: Создание типа Page

**Важно:** Сначала создайте все компоненты (см. Задачу 2.2.2), а затем добавляйте поля типа Component в тип Page. Компоненты должны существовать, чтобы их можно было выбрать при добавлении поля.

1. Откройте админ-панель: `http://localhost:1337/admin`
2. Перейдите в **Content-Type Builder**
3. Нажмите **Create new collection type**
4. Заполните:
   - **Display name:** `Page`
   - **API ID (singular):** `page`
   - **API ID (plural):** `pages`

5. Добавьте базовые поля (без компонентов пока):

| Field name | Type | Options |
|------------|------|---------|
| slug | Text | Required, Unique |
| title | Text | Required |
| breadcrumbs | JSON | Optional |
| sidebar | Enumeration | none, about |
| publishedAt | Date | Optional |

6. **Сохраните** тип Page (кнопка "Finish" или "Save")

7. После создания всех компонентов (см. Задачу 2.2.2), вернитесь к типу Page и добавьте поля компонентов:

| Field name | Type | Options |
|------------|------|---------|
| meta | Component | Meta (single) |
| hero | Component | Hero (single, optional) |
| sections | Dynamic Zone | Section types |

**Примечание:** Dynamic Zone позволяет добавлять разные типы секций. После создания компонентов секций (SectionText, SectionCards, SectionGrid, SectionTable) они появятся в списке доступных компонентов для Dynamic Zone.

### Задача 2.2.2: Создание компонентов

⚠️ **Важно:** В Strapi 5 компоненты нужно создавать через админ-панель. Файлы в файловой системе созданы для справки, но компоненты нужно создать вручную.

**Создайте компоненты через админ-панель:**

1. Откройте `http://localhost:1337/admin`
2. Перейдите в **Content-Type Builder** → **Components**
3. Нажмите **Create new component**

**Подробная инструкция:** См. файл `C:\runs\mgts-backend\CREATE_COMPONENTS_MANUAL.md`

**Краткая инструкция:**

#### Компонент Meta
- Category: `page`
- Display name: `Meta`
- API ID: `meta`
- Поля: description (Text, Long text), keywords (Text), ogImage (Media, Single)

#### Компонент CTAButton
- Category: `page`
- Display name: `CTA Button`
- API ID: `cta-button`
- Поля: text (Text, Required), href (Text, Required), style (Enumeration: primary, outline, secondary)

#### Компонент Hero
- Category: `page`
- Display name: `Hero`
- API ID: `hero`
- Поля: title (Text, Required), subtitle (Text, Long text), backgroundImage (Media, Single), ctaButtons (Component: CTAButton, Repeatable)

**Порядок создания важен!** Сначала создайте Meta и CTAButton, затем Hero (так как Hero использует CTAButton).

**Структура созданных компонентов:**

#### Компонент Meta
- `description` (Text, Optional)
- `keywords` (String, Optional)
- `ogImage` (Media, Single, Optional)

#### Компонент Hero
- `title` (String, Required)
- `subtitle` (Text, Optional)
- `backgroundImage` (Media, Single, Optional)
- `ctaButtons` (Component, repeatable) - использует компонент `cta-button`

#### Компонент CTAButton
- `text` (String, Required)
- `href` (String, Required)
- `style` (Enumeration: primary, outline, secondary)

### Задача 2.2.3: Создание компонентов для секций

⚠️ **Создайте компоненты через админ-панель:**

**Подробная инструкция:** См. файл `C:\runs\mgts-backend\CREATE_COMPONENTS_MANUAL.md`

**Краткая инструкция:**

#### Компонент Card
- Category: `page`
- Display name: `Card`
- API ID: `card`
- Поля: title (Text, Required), description (Text), image (Media, Single), link (Text)

#### Компонент SectionText
- Category: `page`
- Display name: `Section Text`
- API ID: `section-text`
- Поля: title (Text), content (Rich text), backgroundColor (Text)

#### Компонент SectionCards
- Category: `page`
- Display name: `Section Cards`
- API ID: `section-cards`
- Поля: title (Text), cards (Component: Card, Repeatable)

#### Компонент SectionGrid
- Category: `page`
- Display name: `Section Grid`
- API ID: `section-grid`
- Поля: title (Text), items (Component: Card, Repeatable)

#### Компонент SectionTable
- Category: `page`
- Display name: `Section Table`
- API ID: `section-table`
- Поля: title (Text), tableData (JSON)

**Порядок создания:** Сначала создайте Card, затем SectionCards и SectionGrid (они используют Card).

**Структура созданных компонентов:**

#### Компонент Card
- `title` (Text, Required)
- `description` (Text, Optional)
- `image` (Media, Single, Optional)
- `link` (Text, Optional)

#### Компонент SectionText
- `title` (Text, Optional)
- `content` (Rich text, Optional)
- `backgroundColor` (Text, Optional)

#### Компонент SectionCards
- `title` (Text, Optional)
- `cards` (Component, repeatable) - использует компонент `Card`

#### Компонент SectionGrid
- `title` (Text, Optional)
- `items` (Component, repeatable) - использует компонент `Card`

#### Компонент SectionTable
- `title` (Text, Optional)
- `tableData` (JSON, Optional)

---

## Шаг 2.3: Извлечение контента из HTML

**Время:** 8-12 часов

### Задача 2.3.1: Создание HTML парсера

Создайте файл `scripts/extract-content/html-parser.js` (см. `CMS_IMPLEMENTATION_PLAN.md` строка 505).

### Задача 2.3.2: Запуск парсера

```powershell
# Перейти в директорию проекта Strapi
cd C:\runs\mgts-backend\scripts\extract-content

# Запустить парсер
node html-parser.js
```

**Результат:** Файл `parsed-content.json` с извлеченным контентом.

---

## Шаг 2.4: Очистка и валидация данных

**Время:** 2-4 часа

### Задача 2.4.1: Создание скрипта валидации

Создайте файл `scripts/extract-content/validate-content.js` (см. `CMS_IMPLEMENTATION_PLAN.md` строка 684).

### Задача 2.4.2: Запуск валидации

```powershell
# Перейти в директорию проекта Strapi
cd C:\runs\mgts-backend\scripts\extract-content

# Запустить валидацию
node validate-content.js
```

**Результат:** Отчет о валидации с ошибками и предупреждениями.

---

## Чек-лист Этапа 2

- [ ] Создан скрипт инвентаризации
- [ ] Запущена инвентаризация всех страниц
- [ ] Создан скрипт анализа типов контента
- [ ] Проанализированы все страницы
- [ ] Создан тип контента Page в Strapi
- [ ] Созданы все необходимые компоненты
- [ ] Создан HTML парсер
- [ ] Извлечен контент из всех страниц
- [ ] Создан скрипт валидации
- [ ] Валидирован весь контент
- [ ] Исправлены все ошибки валидации

---

## Следующие шаги

После завершения Этапа 2:
- ⏭️ **Этап 3:** Создание контент-типов в Strapi (через админ-панель)
- ⏭️ **Этап 4:** Импорт контента в Strapi

---

## Полезные команды

```powershell
# Установить переменную окружения
$env:SITE_ROOT = "C:\runs\SiteMGTS"

# Перейти в директорию проекта Strapi
cd C:\runs\mgts-backend

# Установить зависимости
npm install jsdom

# Запустить инвентаризацию
cd scripts\extract-content
node inventory.js

# Запустить анализ
node analyze-content-types.js
```

---

**Готовы начать? Начните с Шага 2.1 - создания скрипта инвентаризации!**

