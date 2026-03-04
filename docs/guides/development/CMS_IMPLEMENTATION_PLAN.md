# Детальный план создания CMS для сайта МГТС

## Общая информация

**Цель:** Интегрировать систему управления контентом (CMS) для удобного редактирования сайта без изменения кода.

**Выбранная платформа:** Strapi (Headless CMS)

**Общее время реализации:** 4-6 недель

**Команда:** 1-2 разработчика

---

## Этап 1: Подготовка и настройка окружения

### Шаг 1.1: Установка необходимых инструментов

**Время:** 2-4 часа

#### 1.1.1. Проверка системных требований

**Требования:**
- Node.js 18.x или выше
- npm 9.x или выше
- PostgreSQL 14+ (или MySQL 8+, или SQLite для разработки)
- Git

**Проверка:**
```bash
node --version    # Должно быть v18.x или выше
npm --version     # Должно быть 9.x или выше
git --version     # Любая версия
```

**Если не установлено:**
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/
- Git: https://git-scm.com/downloads

#### 1.1.2. Установка Strapi CLI

```bash
npm install -g @strapi/strapi
```

**Проверка установки:**
```bash
strapi --version
```

#### 1.1.3. Создание директории проекта

```bash
# Перейти в родительскую директорию проекта
cd ..

# Создать директорию для CMS
mkdir mgts-cms
cd mgts-cms
```

**Результат:** Готовая директория для CMS проекта

---

### Шаг 1.2: Создание нового Strapi проекта

**Время:** 30 минут

#### 1.2.1. Инициализация проекта

```bash
npx create-strapi-app@latest mgts-backend --quickstart
```

**Параметры при установке:**
- Database: SQLite (для разработки) или PostgreSQL (для продакшена)
- Template: Quickstart (базовая настройка)

**Альтернатива (ручная настройка):**
```bash
npx create-strapi-app@latest mgts-backend
# Выбрать: Custom (manual setup)
# Database: PostgreSQL
# Username: postgres
# Password: [ваш пароль]
# Database: mgts_cms
# Host: 127.0.0.1
# Port: 5432
```

#### 1.2.2. Проверка запуска

```bash
cd mgts-backend
npm run develop
```

**Ожидаемый результат:**
- Сервер запускается на http://localhost:1337
- Открывается страница регистрации администратора

**Если есть ошибки:**
- Проверить, что порт 1337 свободен
- Проверить подключение к базе данных
- Проверить логи в консоли

#### 1.2.3. Создание администратора

1. Открыть http://localhost:1337/admin
2. Заполнить форму регистрации:
   - First name: Admin
   - Last name: User
   - Email: admin@mgts.ru
   - Password: [надежный пароль]
3. Сохранить пароль в безопасном месте

**Результат:** Создан первый администратор CMS

---

### Шаг 1.3: Настройка базы данных (для продакшена)

**Время:** 1-2 часа

#### 1.3.1. Установка PostgreSQL (если не установлен)

**Windows:**
- Скачать с https://www.postgresql.org/download/windows/
- Установить с настройками по умолчанию
- Запомнить пароль для пользователя postgres

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 1.3.2. Создание базы данных

```bash
# Войти в PostgreSQL
psql -U postgres

# Создать базу данных
CREATE DATABASE mgts_cms;

# Создать пользователя (опционально)
CREATE USER mgts_user WITH PASSWORD 'secure_password';

# Дать права
GRANT ALL PRIVILEGES ON DATABASE mgts_cms TO mgts_user;

# Выйти
\q
```

#### 1.3.3. Настройка подключения в Strapi

**Файл:** `config/database.js`

```javascript
module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'mgts_cms'),
      user: env('DATABASE_USERNAME', 'postgres'),
      password: env('DATABASE_PASSWORD', ''),
      ssl: env.bool('DATABASE_SSL', false),
    },
  },
});
```

**Файл:** `.env` (создать в корне проекта)

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys-here
API_TOKEN_SALT=your-api-token-salt-here
ADMIN_JWT_SECRET=your-admin-jwt-secret-here
TRANSFER_TOKEN_SALT=your-transfer-token-salt-here
JWT_SECRET=your-jwt-secret-here

DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=mgts_cms
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password_here
DATABASE_SSL=false
```

**Генерация секретных ключей:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Выполнить 5 раз для каждого ключа
```

**Результат:** Настроена база данных PostgreSQL

---

### Шаг 1.4: Настройка структуры проекта

**Время:** 1 час

#### 1.4.1. Создание структуры директорий

```bash
# В корне проекта mgts-backend
mkdir -p scripts/migration
mkdir -p scripts/extract-content
mkdir -p config/custom
```

#### 1.4.2. Настройка Git (если еще не настроен)

```bash
# Создать .gitignore если его нет
cat > .gitignore << EOF
# Dependencies
node_modules/
package-lock.json

# Build
build/
dist/
.strapi-updater.json

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db
EOF

# Инициализировать репозиторий
git init
git add .
git commit -m "Initial Strapi setup"
```

**Результат:** Готовая структура проекта

---

## Этап 2: Извлечение и структурирование контента

### Шаг 2.1: Анализ существующего контента

**Время:** 4-6 часов

#### 2.1.1. Инвентаризация страниц

**Создать скрипт:** `scripts/extract-content/inventory.js`

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
// Вариант 1: Использовать переменную окружения
const siteRoot = process.env.SITE_ROOT || 
  // Вариант 2: Автоматически найти SiteMGTS
  (() => {
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      const siteDir = path.join(currentDir, '..', '..', 'SiteMGTS');
      if (fs.existsSync(siteDir)) {
        return siteDir;
      }
      currentDir = path.dirname(currentDir);
    }
    // Вариант 3: Относительный путь (если скрипт в mgts-backend/scripts/extract-content/)
    return path.join(__dirname, '../../SiteMGTS');
  })();

// Проверка существования директории
if (!fs.existsSync(siteRoot)) {
  console.error(`Ошибка: Директория SiteMGTS не найдена по пути: ${siteRoot}`);
  console.error('Установите переменную окружения SITE_ROOT или запустите скрипт из правильной директории');
  process.exit(1);
}

const htmlFiles = findHtmlFiles(siteRoot);

console.log(`Найдено HTML файлов: ${htmlFiles.length}`);
console.log('\nСтруктура:');
htmlFiles.forEach(file => {
  console.log(`  ${file.relativePath} (уровень ${file.depth})`);
});

// Сохранить в JSON
fs.writeFileSync(
  path.join(__dirname, 'inventory.json'),
  JSON.stringify(htmlFiles, null, 2)
);
```

**Запуск:**
```bash
cd scripts/extract-content
node inventory.js
```

**Результат:** Файл `inventory.json` со списком всех страниц

#### 2.1.2. Анализ типов контента

**Создать скрипт:** `scripts/extract-content/analyze-content-types.js`

```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

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
const inventory = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'inventory.json'), 'utf-8')
);

const analyses = inventory.map(file => analyzePage(file.path));

fs.writeFileSync(
  path.join(__dirname, 'content-analysis.json'),
  JSON.stringify(analyses, null, 2)
);

console.log('Анализ завершен. Результаты в content-analysis.json');
```

**Установка зависимостей:**
```bash
npm install jsdom
```

**Результат:** Анализ структуры всех страниц

---

### Шаг 2.2: Определение схемы данных

**Время:** 4-6 часов

#### 2.2.1. Создание типов контента

**На основе анализа определить:**

1. **Page (Страница)**
   - slug (string, unique)
   - title (string)
   - meta (component: Meta)
   - hero (component: Hero)
   - content (dynamic zone)
   - breadcrumbs (json)
   - sidebar (enum: none, about)
   - publishedAt (datetime)

2. **Meta (Компонент)**
   - description (text)
   - keywords (text)
   - ogImage (media)

3. **Hero (Компонент)**
   - title (string)
   - subtitle (text)
   - backgroundImage (media)
   - ctaButtons (component: CTAButton[])

4. **Section (Компонент)**
   - type (enum: text, cards, grid, table)
   - title (string)
   - content (richtext)
   - backgroundColor (string)

5. **Service (Услуга)**
   - slug (string, unique)
   - name (string)
   - category (relation: Category)
   - description (text)
   - features (json)
   - pricing (json)
   - image (media)

6. **Category (Категория)**
   - slug (string, unique)
   - name (string)
   - description (text)
   - icon (string)

#### 2.2.2. Создание схем в Strapi

**Через админ-панель:**

1. Открыть http://localhost:1337/admin
2. Content-Type Builder → Create new collection type
3. Создать каждый тип контента по схеме выше

**Или через код (рекомендуется):**

**Создать файл:** `scripts/setup-content-types.js`

```javascript
// Этот скрипт создаст структуру через Strapi API
// Или можно использовать Strapi CLI для генерации

// Пример структуры для Page
const pageSchema = {
  kind: 'collectionType',
  collectionName: 'pages',
  info: {
    singularName: 'page',
    pluralName: 'pages',
    displayName: 'Page',
    description: 'Страница сайта'
  },
  options: {
    draftAndPublish: true
  },
  attributes: {
    slug: {
      type: 'string',
      unique: true,
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    // ... остальные поля
  }
};
```

**Результат:** Определена структура данных

---

### Шаг 2.3: Извлечение контента из HTML

**Время:** 8-12 часов

#### 2.3.1. Создание парсера HTML

**Создать скрипт:** `scripts/extract-content/html-parser.js`

```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class HTMLParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.html = fs.readFileSync(filePath, 'utf-8');
    this.dom = new JSDOM(this.html);
    this.document = this.dom.window.document;
  }
  
  extractSlug() {
    // Из пути файла: about/ethics/index.html -> about/ethics
    // Определить корень сайта (аналогично inventory.js)
    const siteRoot = process.env.SITE_ROOT || 
      (() => {
        let currentDir = __dirname;
        while (currentDir !== path.dirname(currentDir)) {
          const siteDir = path.join(currentDir, '..', '..', 'SiteMGTS');
          if (fs.existsSync(siteDir)) {
            return siteDir;
          }
          currentDir = path.dirname(currentDir);
        }
        return path.join(__dirname, '../../SiteMGTS');
      })();
    
    const relativePath = path.relative(siteRoot, this.filePath);
    return relativePath.replace(/\/index\.html$/, '').replace(/\\/g, '/');
  }
  
  extractTitle() {
    const titleEl = this.document.querySelector('title');
    return titleEl ? titleEl.textContent.trim() : '';
  }
  
  extractMeta() {
    return {
      description: this.document.querySelector('meta[name="description"]')?.content || '',
      keywords: this.document.querySelector('meta[name="keywords"]')?.content || ''
    };
  }
  
  extractHero() {
    const hero = this.document.querySelector('.hero');
    if (!hero) return null;
    
    return {
      title: hero.querySelector('h1')?.textContent.trim() || '',
      subtitle: hero.querySelector('p')?.textContent.trim() || '',
      backgroundImage: null, // Извлечь из стилей если есть
      ctaButtons: Array.from(hero.querySelectorAll('a.btn')).map(btn => ({
        text: btn.textContent.trim(),
        href: btn.href,
        style: btn.className.includes('btn-primary') ? 'primary' : 'outline'
      }))
    };
  }
  
  extractBreadcrumbs() {
    const breadcrumbs = this.document.querySelector('.breadcrumbs-list');
    if (!breadcrumbs) return [];
    
    return Array.from(breadcrumbs.querySelectorAll('.breadcrumbs-item')).map(item => ({
      name: item.querySelector('a, span')?.textContent.trim() || '',
      url: item.querySelector('a')?.href || null
    }));
  }
  
  extractSections() {
    const sections = [];
    const sectionElements = this.document.querySelectorAll('section.section');
    
    sectionElements.forEach(section => {
      const sectionData = {
        type: this.detectSectionType(section),
        title: section.querySelector('h2, h3')?.textContent.trim() || '',
        content: this.extractSectionContent(section),
        backgroundColor: this.extractBackgroundColor(section)
      };
      sections.push(sectionData);
    });
    
    return sections;
  }
  
  detectSectionType(section) {
    if (section.querySelector('.card')) return 'cards';
    if (section.querySelector('.grid')) return 'grid';
    if (section.querySelector('table')) return 'table';
    return 'text';
  }
  
  extractSectionContent(section) {
    // Извлечь текст, сохраняя структуру
    const content = [];
    
    // Параграфы
    section.querySelectorAll('p').forEach(p => {
      content.push({
        type: 'paragraph',
        text: p.textContent.trim()
      });
    });
    
    // Списки
    section.querySelectorAll('ul, ol').forEach(list => {
      content.push({
        type: 'list',
        items: Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim())
      });
    });
    
    // Карточки
    section.querySelectorAll('.card').forEach(card => {
      content.push({
        type: 'card',
        title: card.querySelector('h3')?.textContent.trim() || '',
        content: card.textContent.trim()
      });
    });
    
    return content;
  }
  
  extractBackgroundColor(section) {
    const style = section.getAttribute('style') || '';
    const match = style.match(/background-color:\s*([^;]+)/);
    return match ? match[1].trim() : null;
  }
  
  extractSidebar() {
    return this.document.querySelector('[data-component="sidebar-about"]') ? 'about' : 'none';
  }
  
  parse() {
    return {
      slug: this.extractSlug(),
      title: this.extractTitle(),
      meta: this.extractMeta(),
      hero: this.extractHero(),
      breadcrumbs: this.extractBreadcrumbs(),
      sections: this.extractSections(),
      sidebar: this.extractSidebar(),
      publishedAt: new Date().toISOString()
    };
  }
}

// Использование
const inventory = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'inventory.json'), 'utf-8')
);

const parsedContent = inventory.map(file => {
  const parser = new HTMLParser(file.path);
  return parser.parse();
});

fs.writeFileSync(
  path.join(__dirname, 'parsed-content.json'),
  JSON.stringify(parsedContent, null, 2)
);

console.log(`Извлечено ${parsedContent.length} страниц`);
```

**Установка зависимостей:**
```bash
npm install jsdom
```

**Запуск:**
```bash
node scripts/extract-content/html-parser.js
```

**Результат:** Файл `parsed-content.json` с извлеченным контентом

---

### Шаг 2.4: Очистка и валидация данных

**Время:** 2-4 часа

#### 2.4.1. Создание скрипта валидации

**Создать скрипт:** `scripts/extract-content/validate-content.js`

```javascript
const fs = require('fs');
const path = require('path');

function validateContent(content) {
  const errors = [];
  const warnings = [];
  
  // Проверка обязательных полей
  if (!content.slug) {
    errors.push('Отсутствует slug');
  }
  
  if (!content.title) {
    errors.push('Отсутствует title');
  }
  
  // Проверка уникальности slug
  // (будет проверено при импорте)
  
  // Проверка формата slug
  if (content.slug && !/^[a-z0-9\/-]+$/.test(content.slug)) {
    errors.push(`Некорректный формат slug: ${content.slug}`);
  }
  
  // Предупреждения
  if (!content.meta.description) {
    warnings.push('Отсутствует meta description');
  }
  
  if (content.sections.length === 0) {
    warnings.push('Нет секций контента');
  }
  
  return { errors, warnings };
}

// Запуск валидации
const parsedContent = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'parsed-content.json'), 'utf-8')
);

const validationResults = parsedContent.map((content, index) => {
  const result = validateContent(content);
  return {
    index,
    slug: content.slug,
    ...result
  };
});

// Вывести результаты
validationResults.forEach(result => {
  if (result.errors.length > 0) {
    console.error(`❌ ${result.slug}:`, result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn(`⚠️  ${result.slug}:`, result.warnings);
  }
});

// Сохранить результаты
fs.writeFileSync(
  path.join(__dirname, 'validation-results.json'),
  JSON.stringify(validationResults, null, 2)
);

console.log('\nВалидация завершена. Результаты в validation-results.json');
```

**Результат:** Валидированный и очищенный контент

---

## Этап 3: Создание контент-типов в Strapi

### Шаг 3.1: Создание базовых типов контента

**Время:** 4-6 часов

#### 3.1.1. Создание типа Page

**Через админ-панель:**

1. Открыть http://localhost:1337/admin
2. Content-Type Builder → Create new collection type
3. Display name: `Page`
4. API ID (singular): `page`
5. API ID (plural): `pages`

**Добавить поля:**

| Field name | Type | Options |
|------------|------|---------|
| slug | Text | Required, Unique |
| title | Text | Required |
| meta | Component | Meta (single) |
| hero | Component | Hero (single, optional) |
| sections | Dynamic Zone | Section types |
| breadcrumbs | JSON | Optional |
| sidebar | Enumeration | none, about |
| publishedAt | Date | Optional |

**Сохранить**

#### 3.1.2. Создание компонента Meta

1. Content-Type Builder → Components → Create new component
2. Category: `Page`
3. Display name: `Meta`
4. API ID: `meta`

**Поля:**

| Field name | Type | Options |
|------------|------|---------|
| description | Text | Long text |
| keywords | Text | Optional |
| ogImage | Media | Single, optional |

#### 3.1.3. Создание компонента Hero

1. Create new component
2. Category: `Page`
3. Display name: `Hero`
4. API ID: `hero`

**Поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Required |
| subtitle | Text | Long text, optional |
| backgroundImage | Media | Single, optional |
| ctaButtons | Component | CTAButton (repeatable) |

#### 3.1.4. Создание компонента CTAButton

1. Create new component
2. Category: `Page`
3. Display name: `CTA Button`
4. API ID: `cta-button`

**Поля:**

| Field name | Type | Options |
|------------|------|---------|
| text | Text | Required |
| href | Text | Required |
| style | Enumeration | primary, outline, secondary |

#### 3.1.5. Создание компонентов для секций

**Создать компоненты:**
- `SectionText` - текстовая секция
- `SectionCards` - секция с карточками
- `SectionGrid` - сетка контента
- `SectionTable` - таблица

**Результат:** Созданы все базовые типы контента

---

### Шаг 3.2: Создание типов для услуг

**Время:** 2-3 часа

#### 3.2.1. Создание типа Category

1. Create new collection type
2. Display name: `Category`
3. API ID: `category`

**Поля:**

| Field name | Type | Options |
|------------|------|---------|
| slug | Text | Required, Unique |
| name | Text | Required |
| description | Text | Long text |
| icon | Text | Optional |
| parent | Relation | Category (self-relation, optional) |

#### 3.2.2. Создание типа Service

1. Create new collection type
2. Display name: `Service`
3. API ID: `service`

**Поля:**

| Field name | Type | Options |
|------------|------|---------|
| slug | Text | Required, Unique |
| name | Text | Required |
| category | Relation | Category (many-to-one) |
| description | Text | Long text |
| features | JSON | Optional |
| pricing | JSON | Optional |
| image | Media | Single, optional |
| publishedAt | Date | Optional |

**Результат:** Созданы типы для услуг

---

### Шаг 3.3: Настройка API прав доступа

**Время:** 1 час

#### 3.3.1. Настройка публичного доступа

1. Settings → Users & Permissions plugin → Roles → Public
2. Для каждого типа контента:
   - ✅ find (GET список)
   - ✅ findOne (GET один элемент)
   - ❌ create, update, delete (только для авторизованных)

3. Сохранить

#### 3.3.2. Создание роли Editor

1. Roles → Add new role
2. Name: `Editor`
3. Description: `Может редактировать контент`
4. Permissions:
   - Page: find, findOne, create, update
   - Service: find, findOne, create, update
   - Category: find, findOne, create, update
   - Upload: find, findOne, create, update

**Результат:** Настроены права доступа

---

## Этап 4: Импорт контента

### Шаг 4.1: Создание скрипта импорта

**Время:** 4-6 часов

#### 4.1.1. Установка Strapi SDK

```bash
npm install @strapi/strapi axios
```

#### 4.1.2. Создание скрипта импорта

**Создать файл:** `scripts/migration/import-content.js`

```javascript
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN; // Создать в Settings → API Tokens

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function importPage(pageData) {
  try {
    // Проверить, существует ли страница
    const existing = await api.get(`/pages?filters[slug][$eq]=${pageData.slug}`);
    
    if (existing.data.data.length > 0) {
      console.log(`⚠️  Страница ${pageData.slug} уже существует, обновляем...`);
      const pageId = existing.data.data[0].id;
      const response = await api.put(`/pages/${pageId}`, { data: pageData });
      return response.data;
    } else {
      console.log(`✅ Создаем страницу ${pageData.slug}...`);
      const response = await api.post('/pages', { data: pageData });
      return response.data;
    }
  } catch (error) {
    console.error(`❌ Ошибка при импорте ${pageData.slug}:`, error.response?.data || error.message);
    throw error;
  }
}

async function importAllPages() {
  const parsedContent = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../extract-content/parsed-content.json'), 'utf-8')
  );
  
  console.log(`Начинаем импорт ${parsedContent.length} страниц...\n`);
  
  let success = 0;
  let errors = 0;
  
  for (const pageData of parsedContent) {
    try {
      await importPage(pageData);
      success++;
      
      // Небольшая задержка, чтобы не перегрузить сервер
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      errors++;
    }
  }
  
  console.log(`\nИмпорт завершен:`);
  console.log(`  ✅ Успешно: ${success}`);
  console.log(`  ❌ Ошибок: ${errors}`);
}

// Запуск
if (!API_TOKEN) {
  console.error('❌ Необходимо установить STRAPI_API_TOKEN');
  console.log('Создайте токен в Strapi: Settings → API Tokens → Create new API Token');
  process.exit(1);
}

importAllPages().catch(console.error);
```

#### 4.1.3. Создание API токена

1. Открыть http://localhost:1337/admin
2. Settings → API Tokens → Create new API Token
3. Name: `Import Script`
4. Token duration: `Unlimited`
5. Token type: `Full access`
6. Скопировать токен

#### 4.1.4. Запуск импорта

```bash
# Установить токен в переменную окружения
export STRAPI_API_TOKEN=your_token_here  # Linux/Mac
set STRAPI_API_TOKEN=your_token_here     # Windows

# Запустить импорт
node scripts/migration/import-content.js
```

**Результат:** Контент импортирован в Strapi

---

### Шаг 4.2: Проверка импортированного контента

**Время:** 1-2 часа

#### 4.2.1. Проверка через админ-панель

1. Открыть http://localhost:1337/admin
2. Content Manager → Pages
3. Проверить несколько страниц:
   - Правильность slug
   - Наличие title
   - Корректность секций
   - Метаданные

#### 4.2.2. Проверка через API

```bash
# Получить список страниц
curl http://localhost:1337/api/pages

# Получить конкретную страницу
curl http://localhost:1337/api/pages?filters[slug][$eq]=about
```

**Результат:** Подтверждена корректность импорта

---

## Этап 5: Настройка API и интеграция с фронтендом

### Шаг 5.1: Настройка API endpoints

**Время:** 2-3 часа

#### 5.1.1. Создание кастомных контроллеров

**Создать файл:** `src/api/page/controllers/custom-page.js`

```javascript
'use strict';

module.exports = {
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    
    const page = await strapi.entityService.findMany('api::page.page', {
      filters: { slug },
      populate: {
        meta: {
          populate: ['ogImage']
        },
        hero: {
          populate: ['backgroundImage', 'ctaButtons']
        },
        sections: {
          populate: '*'
        }
      }
    });
    
    if (!page || page.length === 0) {
      return ctx.notFound('Page not found');
    }
    
    return page[0];
  },
  
  async getMenu(ctx) {
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: { publishedAt: { $notNull: true } },
      fields: ['slug', 'title'],
      sort: { slug: 'asc' }
    });
    
    // Построить иерархию меню
    const menu = buildMenuHierarchy(pages);
    
    return menu;
  }
};

function buildMenuHierarchy(pages) {
  // Логика построения иерархии на основе slug
  // Например: about/ethics -> about -> ethics
  const menu = {};
  
  pages.forEach(page => {
    const parts = page.slug.split('/');
    let current = menu;
    
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          children: {},
          page: index === parts.length - 1 ? page : null
        };
      }
      current = current[part].children;
    });
  });
  
  return menu;
}
```

#### 5.1.2. Создание кастомных роутов

**Создать файл:** `src/api/page/routes/custom-page.js`

```javascript
'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/pages/slug/:slug',
      handler: 'custom-page.findBySlug',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/menu',
      handler: 'custom-page.getMenu',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
```

**Результат:** Настроены кастомные API endpoints

---

### Шаг 5.2: Обновление фронтенда для работы с API

**Время:** 6-8 часов

#### 5.2.1. Создание API клиента

**Создать файл:** `js/api-client.js` (в корне сайта SiteMGTS)

**Важно:** Если скрипт запускается из другой директории, используйте абсолютный путь:
- Windows: `C:\Users\abefremov\SiteMGTS\js\api-client.js`
- Или используйте переменную окружения `SITE_ROOT`

```javascript
/**
 * API Client для работы с Strapi CMS
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:1337/api';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }
  
  async getPage(slug) {
    const response = await this.request(`/pages?filters[slug][$eq]=${slug}&populate=*`);
    return response.data?.[0] || null;
  }
  
  async getMenu() {
    return await this.request('/menu');
  }
  
  async getServices(category = null) {
    const filters = category ? `&filters[category][slug][$eq]=${category}` : '';
    const response = await this.request(`/services?populate=*${filters}`);
    return response.data || [];
  }
}

// Экспорт
window.ApiClient = ApiClient;
window.apiClient = new ApiClient();
```

#### 5.2.2. Обновление components-loader.js

**Добавить в начало файла:**

```javascript
// Проверка, использовать ли API
const USE_CMS_API = window.location.search.includes('cms=true') || 
                    localStorage.getItem('useCMS') === 'true';

if (USE_CMS_API && typeof ApiClient !== 'undefined') {
  // Использовать API для загрузки контента
  loadContentFromAPI();
} else {
  // Использовать статическую загрузку компонентов
  initComponents();
}
```

#### 5.2.3. Создание функции загрузки контента из API

**Добавить в components-loader.js:**

```javascript
async function loadContentFromAPI() {
  const currentPath = window.location.pathname;
  const slug = extractSlugFromPath(currentPath);
  
  try {
    const page = await apiClient.getPage(slug);
    
    if (page) {
      renderPageFromAPI(page);
    } else {
      console.warn('Page not found in CMS, using static content');
      initComponents();
    }
  } catch (error) {
    console.error('Failed to load from API, using static content:', error);
    initComponents();
  }
}

function extractSlugFromPath(pathname) {
  // Преобразовать /about/ethics/index.html -> about/ethics
  const parts = pathname.split('/').filter(p => p && p !== 'index.html');
  return parts.join('/') || 'index';
}

function renderPageFromAPI(page) {
  // Загрузить компоненты (header, footer)
  initComponents();
  
  // Заменить контент страницы
  const mainContent = document.querySelector('main') || document.body;
  
  // Hero section
  if (page.hero) {
    renderHero(mainContent, page.hero);
  }
  
  // Sections
  if (page.sections && page.sections.length > 0) {
    renderSections(mainContent, page.sections);
  }
  
  // Breadcrumbs
  if (page.breadcrumbs) {
    renderBreadcrumbs(page.breadcrumbs);
  }
  
  // Sidebar
  if (page.sidebar === 'about') {
    loadComponent('sidebar-about', '[data-component="sidebar-about"]');
  }
}

function renderHero(container, hero) {
  const heroSection = document.querySelector('.hero') || createHeroSection();
  
  if (hero.title) {
    const title = heroSection.querySelector('h1');
    if (title) title.textContent = hero.title;
  }
  
  if (hero.subtitle) {
    const subtitle = heroSection.querySelector('p');
    if (subtitle) subtitle.textContent = hero.subtitle;
  }
  
  // CTA buttons
  if (hero.ctaButtons && hero.ctaButtons.length > 0) {
    const actions = heroSection.querySelector('.hero-actions');
    if (actions) {
      actions.innerHTML = hero.ctaButtons.map(btn => 
        `<a href="${btn.href}" class="btn btn-${btn.style} btn-lg">${btn.text}</a>`
      ).join('');
    }
  }
}

function renderSections(container, sections) {
  // Найти или создать секции
  sections.forEach((section, index) => {
    const sectionEl = document.querySelectorAll('.section')[index];
    if (sectionEl) {
      renderSection(sectionEl, section);
    }
  });
}

function renderSection(element, section) {
  if (section.title) {
    const title = element.querySelector('h2, h3');
    if (title) title.textContent = section.title;
  }
  
  // Рендеринг контента в зависимости от типа
  switch (section.type) {
    case 'text':
      renderTextSection(element, section);
      break;
    case 'cards':
      renderCardsSection(element, section);
      break;
    case 'grid':
      renderGridSection(element, section);
      break;
  }
}
```

**Результат:** Фронтенд интегрирован с API

---

## Этап 6: Настройка медиа-библиотеки

### Шаг 6.1: Настройка Cloudinary

**Время:** 2-3 часа

#### 6.1.1. Создание аккаунта Cloudinary

1. Зарегистрироваться на https://cloudinary.com
2. Выбрать бесплатный план
3. Скопировать credentials из Dashboard:
   - Cloud name
   - API Key
   - API Secret

#### 6.1.2. Установка плагина

```bash
npm install @strapi/provider-upload-cloudinary
```

#### 6.1.3. Настройка конфигурации

**Создать файл:** `config/plugins.js`

```javascript
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
```

**Обновить `.env`:**

```env
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret
```

#### 6.1.4. Перезапуск Strapi

```bash
npm run develop
```

**Результат:** Настроена интеграция с Cloudinary

---

### Шаг 6.2: Миграция существующих изображений

**Время:** 2-4 часа

#### 6.2.1. Создание скрипта миграции

**Создать файл:** `scripts/migration/upload-images.js`

```javascript
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const axios = require('axios');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

async function uploadImage(filePath, folder = 'mgts') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      use_filename: true,
      unique_filename: false,
      overwrite: true
    });
    
    console.log(`✅ Загружено: ${filePath} -> ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при загрузке ${filePath}:`, error.message);
    throw error;
  }
}

async function migrateImages() {
  // Определить путь к директории изображений
  const siteRoot = process.env.SITE_ROOT || 
    (() => {
      let currentDir = __dirname;
      while (currentDir !== path.dirname(currentDir)) {
        const siteDir = path.join(currentDir, '..', '..', 'SiteMGTS');
        if (fs.existsSync(siteDir)) {
          return siteDir;
        }
        currentDir = path.dirname(currentDir);
      }
      return path.join(__dirname, '../../SiteMGTS');
    })();
  
  const imagesDir = path.join(siteRoot, 'images');
  
  // Проверка существования директории
  if (!fs.existsSync(imagesDir)) {
    console.error(`Ошибка: Директория images не найдена по пути: ${imagesDir}`);
    console.error('Установите переменную окружения SITE_ROOT или проверьте структуру проекта');
    process.exit(1);
  }
  
  const files = fs.readdirSync(imagesDir);
  
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file)
  );
  
  console.log(`Найдено ${imageFiles.length} изображений для загрузки\n`);
  
  for (const file of imageFiles) {
    const filePath = path.join(imagesDir, file);
    await uploadImage(filePath);
    
    // Небольшая задержка
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Миграция изображений завершена');
}

migrateImages().catch(console.error);
```

**Установка зависимостей:**
```bash
npm install cloudinary
```

**Запуск:**
```bash
node scripts/migration/upload-images.js
```

**Результат:** Изображения загружены в Cloudinary

---

## Этап 7: Настройка админ-панели и обучение

### Шаг 7.1: Настройка интерфейса админ-панели

**Время:** 2-3 часа

#### 7.1.1. Кастомизация брендинга

**Создать файл:** `config/admin.js`

```javascript
module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  url: '/admin',
  serveAdminPanel: true,
  // Кастомизация
  watchIgnoreFiles: [
    '**/config/sync/**',
  ],
});
```

#### 7.1.2. Настройка локализации

1. Settings → Internationalization
2. Добавить русский язык (если доступно)
3. Настроить переводы интерфейса

**Результат:** Настроена админ-панель

---

### Шаг 7.2: Создание документации для редакторов

**Время:** 4-6 часов

#### 7.2.1. Создание руководства

**Создать файл:** `docs/EDITOR_GUIDE.md`

```markdown
# Руководство редактора CMS МГТС

## Вход в систему

1. Открыть http://your-domain.com/admin
2. Ввести email и пароль
3. Нажать "Войти"

## Создание страницы

1. Content Manager → Pages → Create new entry
2. Заполнить поля:
   - Slug: уникальный идентификатор (например: about/team)
   - Title: заголовок страницы
   - Meta: описание и ключевые слова
   - Hero: главный блок (опционально)
   - Sections: секции контента
3. Нажать "Save"
4. Нажать "Publish" для публикации

## Редактирование страницы

1. Content Manager → Pages
2. Найти нужную страницу
3. Нажать на неё
4. Внести изменения
5. Сохранить и опубликовать

## Загрузка изображений

1. Media Library → Add new assets
2. Выбрать файлы
3. Дождаться загрузки
4. Заполнить:
   - Alternative text (обязательно для доступности)
   - Caption (опционально)
5. Сохранить

## Использование изображений в контенте

1. В редакторе контента нажать на иконку изображения
2. Выбрать изображение из медиа-библиотеки
3. Добавить альтернативный текст
4. Сохранить

## Часто задаваемые вопросы

**Q: Как изменить порядок секций?**
A: Перетащите секции мышью в нужном порядке.

**Q: Как удалить страницу?**
A: Откройте страницу → Actions → Delete

**Q: Как откатить изменения?**
A: Используйте историю версий (если настроена).
```

#### 7.2.2. Создание видео-инструкций (опционально)

- Записать скринкасты основных операций
- Разместить на внутреннем портале

**Результат:** Создана документация

---

### Шаг 7.3: Обучение редакторов

**Время:** 2-4 часа

#### 7.3.1. Проведение обучающей сессии

**Программа:**
1. Введение в CMS (15 мин)
2. Базовые операции (30 мин)
3. Работа с контентом (30 мин)
4. Работа с медиа (15 мин)
5. Практические задания (30 мин)
6. Q&A (15 мин)

**Результат:** Обучены редакторы

---

## Этап 8: Тестирование и запуск

### Шаг 8.1: Функциональное тестирование

**Время:** 4-6 часов

#### 8.1.1. Чек-лист тестирования

- [ ] Создание страницы
- [ ] Редактирование страницы
- [ ] Удаление страницы
- [ ] Публикация страницы
- [ ] Загрузка изображения
- [ ] Использование изображения в контенте
- [ ] Работа API endpoints
- [ ] Отображение контента на фронтенде
- [ ] Навигация между страницами
- [ ] Поиск контента
- [ ] Права доступа (разные роли)

#### 8.1.2. Исправление найденных ошибок

**Результат:** Протестирована функциональность

---

### Шаг 8.2: Нагрузочное тестирование

**Время:** 2-4 часа

#### 8.2.1. Настройка тестов

**Использовать инструменты:**
- Apache Bench (ab)
- Artillery
- k6

**Пример теста:**
```bash
# Установить k6
# https://k6.io/docs/getting-started/installation/

# Создать тест
cat > load-test.js << EOF
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const response = http.get('http://localhost:1337/api/pages');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

# Запустить тест
k6 run load-test.js
```

**Результат:** Проверена производительность

---

### Шаг 8.3: Развертывание в продакшен

**Время:** 4-8 часов

#### 8.3.1. Подготовка сервера

**Требования:**
- Ubuntu 20.04+ или аналогичный
- Node.js 18+
- PostgreSQL 14+
- Nginx (для reverse proxy)
- PM2 (для управления процессом)

#### 8.3.2. Установка на сервере

```bash
# На сервере
git clone your-repo-url
cd mgts-backend
npm install --production

# Настроить .env для продакшена
nano .env

# Запустить миграции
npm run build
npm run start
```

#### 8.3.3. Настройка Nginx

**Создать конфигурацию:** `/etc/nginx/sites-available/mgts-cms`

```nginx
server {
    listen 80;
    server_name api.mgts.ru;

    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 8.3.4. Настройка PM2

```bash
npm install -g pm2

# Создать ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mgts-cms',
    script: './node_modules/@strapi/strapi/bin/strapi.js',
    args: 'start',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
EOF

# Запустить
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Результат:** Развернуто в продакшене

---

## Итоговый чек-лист

### Подготовка
- [ ] Установлены все необходимые инструменты
- [ ] Создан проект Strapi
- [ ] Настроена база данных
- [ ] Создан администратор

### Контент
- [ ] Проанализирован существующий контент
- [ ] Определена схема данных
- [ ] Извлечен контент из HTML
- [ ] Валидирован контент

### CMS
- [ ] Созданы типы контента
- [ ] Настроены компоненты
- [ ] Настроены права доступа
- [ ] Импортирован контент

### API
- [ ] Настроены API endpoints
- [ ] Создан API клиент
- [ ] Интегрирован фронтенд

### Медиа
- [ ] Настроена медиа-библиотека
- [ ] Настроен Cloudinary
- [ ] Мигрированы изображения

### Документация
- [ ] Создана документация для редакторов
- [ ] Проведено обучение

### Тестирование
- [ ] Проведено функциональное тестирование
- [ ] Проведено нагрузочное тестирование
- [ ] Исправлены все ошибки

### Развертывание
- [ ] Развернуто в продакшене
- [ ] Настроен мониторинг
- [ ] Настроены резервные копии

---

## Временные затраты по этапам

| Этап | Время | Приоритет |
|------|-------|-----------|
| Этап 1: Подготовка | 8-12 часов | ВЫСОКИЙ |
| Этап 2: Извлечение контента | 18-24 часа | ВЫСОКИЙ |
| Этап 3: Создание типов | 8-12 часов | ВЫСОКИЙ |
| Этап 4: Импорт | 6-8 часов | ВЫСОКИЙ |
| Этап 5: API и интеграция | 10-14 часов | ВЫСОКИЙ |
| Этап 6: Медиа | 6-10 часов | СРЕДНИЙ |
| Этап 7: Документация | 8-12 часов | СРЕДНИЙ |
| Этап 8: Тестирование | 10-18 часов | ВЫСОКИЙ |
| **ИТОГО** | **74-110 часов** | **4-6 недель** |

---

## Следующие шаги после завершения

1. **Мониторинг:**
   - Настроить логирование
   - Настроить алерты
   - Настроить аналитику использования

2. **Оптимизация:**
   - Кэширование API
   - Оптимизация изображений
   - CDN настройка

3. **Расширение функциональности:**
   - Многоязычность
   - Версионирование контента
   - Расширенный поиск
   - Комментарии и обратная связь

---

## Полезные ресурсы

- **Strapi документация:** https://docs.strapi.io/
- **Strapi Community:** https://discord.strapi.io/
- **Cloudinary документация:** https://cloudinary.com/documentation
- **Примеры проектов:** https://github.com/strapi/strapi-examples

---

**Удачи в реализации! 🚀**




