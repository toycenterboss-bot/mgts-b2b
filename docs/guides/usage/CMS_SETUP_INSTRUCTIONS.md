# Инструкция по настройке CMS после создания контент-типов

## 📋 Шаг 1: Перезапуск Strapi

После создания всех контент-типов и компонентов необходимо перезапустить Strapi:

```bash
cd mgts-backend
# Остановите текущий процесс Strapi (Ctrl+C)
npm run develop
```

Strapi автоматически загрузит все новые контент-типы и компоненты.

---

## 🔐 Шаг 2: Настройка прав доступа (Public API)

После перезапуска Strapi:

1. Откройте админ-панель: http://localhost:1337/admin
2. Перейдите в **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**
3. В разделе **Permissions** найдите все новые контент-типы и включите:
   - ✅ **Navigation**: `find`
   - ✅ **Footer**: `find`
   - ✅ **News**: `find`, `findOne`
   - ✅ **News Category**: `find`, `findOne`
   - ✅ **News Tag**: `find`, `findOne`
   - ✅ **Product**: `find`, `findOne`
   - ✅ **Product Category**: `find`, `findOne`

4. Нажмите **Save**

---

## 📝 Шаг 3: Создание/обновление Navigation

### Вариант A: Через админ-панель

1. **Content Manager** → **Navigation** (Single Type)
2. Заполните поля:
   - **Logo**: Загрузите изображение логотипа
   - **Logo Alt**: "МГТС"
   - **Phone**: "+78002500250"
   - **Phone Display**: "8 800 250-0-250"
   - **Main Menu Items**: Добавьте пункты меню
   - **Mega Menus**: Добавьте mega-menu секции
3. Нажмите **Save**

### Вариант B: Через скрипт миграции

```bash
cd mgts-backend
node scripts/migrate-navigation-footer.js
```

**Примечание:** Скрипт миграции извлечет данные из `SiteMGTS/components/header.html` и создаст/обновит Navigation в Strapi.

---

## 📝 Шаг 4: Создание/обновление Footer

### Вариант A: Через админ-панель

1. **Content Manager** → **Footer** (Single Type)
2. Заполните поля:
   - **Sections**: Добавьте секции футера
   - **Copyright**: "© 2025 МГТС. Все права защищены."
   - **Legal Links**: Добавьте юридические ссылки
   - **Social Links**: Добавьте ссылки на социальные сети (опционально)
3. Нажмите **Save**

### Вариант B: Через скрипт миграции

Скрипт миграции автоматически создаст Footer из `SiteMGTS/components/footer.html`.

---

## 🧪 Шаг 5: Тестирование API

Проверьте, что API работает:

```bash
# Navigation
curl http://localhost:1337/api/navigation

# Footer
curl http://localhost:1337/api/footer

# News (после создания новостей)
curl http://localhost:1337/api/news

# Products (после создания товаров)
curl http://localhost:1337/api/products
```

---

## 🎨 Шаг 6: Тестирование Frontend

1. Откройте сайт: http://localhost:8001
2. Откройте консоль браузера (F12)
3. Проверьте логи:
   - `[Navigation Renderer] Loading navigation from API...`
   - `[Navigation Renderer] Navigation rendered successfully`
   - `[Footer Renderer] Loading footer from API...`
   - `[Footer Renderer] Footer rendered successfully`

Если API недоступен, будет использован fallback на статические компоненты.

---

## 📰 Шаг 7: Создание тестовых данных

### Создание категории новостей:

1. **Content Manager** → **News Category** → **Create new entry**
2. Заполните:
   - **Name**: "Компания"
   - **Slug**: "company"
   - **Description**: "Новости компании"
   - **Color**: "#0066CC"
3. **Save**

### Создание новости:

1. **Content Manager** → **News** → **Create new entry**
2. Заполните:
   - **Slug**: "test-news-1"
   - **Title**: "Тестовая новость"
   - **Short Description**: "Краткое описание новости"
   - **Content**: Полный текст новости
   - **Featured Image**: Загрузите изображение
   - **Publish Date**: Выберите дату
   - **Category**: Выберите созданную категорию
   - **Is Featured**: true (опционально)
3. **Save** и **Publish**

### Создание категории товаров:

1. **Content Manager** → **Product Category** → **Create new entry**
2. Заполните:
   - **Name**: "Интернет"
   - **Slug**: "internet"
   - **Description**: "Услуги интернета"
3. **Save**

### Создание товара:

1. **Content Manager** → **Product** → **Create new entry**
2. Заполните:
   - **Slug**: "gpon-business"
   - **Name**: "GPON для бизнеса"
   - **Short Description**: "Высокоскоростной интернет"
   - **Full Description**: Полное описание услуги
   - **Price**: 5000
   - **Currency**: "RUB"
   - **Images**: Загрузите изображения
   - **Category**: Выберите категорию
   - **Specifications**: Добавьте характеристики
3. **Save** и **Publish**

---

## ✅ Проверка работы

1. **Меню и футер загружаются из API** - проверьте консоль браузера
2. **Fallback работает** - отключите Strapi, меню и футер должны загрузиться из статических файлов
3. **API endpoints доступны** - проверьте через curl или браузер
4. **Новости отображаются** - создайте страницу списка новостей
5. **Товары отображаются** - создайте страницу каталога

---

## 🔧 Устранение проблем

### Проблема: API возвращает 403 Forbidden

**Решение:** Проверьте права доступа в Settings → Users & Permissions → Roles → Public

### Проблема: Меню/футер не загружаются

**Решение:** 
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что Strapi запущен на порту 1337
3. Проверьте, что Navigation и Footer созданы в Strapi
4. Проверьте права доступа

### Проблема: Логотип не отображается

**Решение:**
1. Загрузите логотип в Strapi Media Library
2. Свяжите его с Navigation в Content Manager
3. Проверьте путь к изображению в API ответе

---

**Дата создания:** 2025-01-XX



