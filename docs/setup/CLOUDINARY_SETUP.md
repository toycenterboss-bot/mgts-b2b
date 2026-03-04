# ⚙️ Настройка Cloudinary для Strapi

## 📋 Что было сделано

### ✅ 1. Установлен плагин Cloudinary
```bash
npm install @strapi/provider-upload-cloudinary
```

### ✅ 2. Настроена конфигурация
**Файл:** `mgts-backend/config/plugins.ts`

**Особенности:**
- Поддержка локального хранилища по умолчанию
- Возможность переключения на Cloudinary через переменную окружения
- Гибкая конфигурация

---

## 🔧 Настройка Cloudinary

### Шаг 1: Создать аккаунт Cloudinary

1. Зарегистрируйтесь на https://cloudinary.com
2. Выберите бесплатный план (Free tier)
3. Перейдите в Dashboard
4. Скопируйте credentials:
   - **Cloud name**
   - **API Key**
   - **API Secret**

### Шаг 2: Добавить переменные окружения

**Отредактируйте файл:** `mgts-backend/.env`

Добавьте следующие строки:

```env
# Cloudinary Configuration
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret
```

**Или создайте файл `.env` если его нет:**

```bash
cd /Users/andrey_efremov/Downloads/runs/mgts-backend
cat >> .env << EOF
# Cloudinary Configuration
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret
EOF
```

### Шаг 3: Перезапустить Strapi

```bash
# Остановить текущий процесс
kill $(cat /tmp/strapi.pid)

# Запустить заново
cd /Users/andrey_efremov/Downloads/runs/mgts-backend
npm run develop
```

### Шаг 4: Проверить работу

1. Откройте http://localhost:1337/admin
2. Перейдите в **Media Library**
3. Попробуйте загрузить изображение
4. Изображение должно загрузиться в Cloudinary

---

## 📝 Альтернатива: Локальное хранилище

Если не хотите использовать Cloudinary, можно оставить локальное хранилище:

**В `.env`:**
```env
UPLOAD_PROVIDER=local
```

Или просто не указывать переменную - по умолчанию используется `local`.

---

## ✅ Проверка конфигурации

### Проверить установку плагина:
```bash
cd /Users/andrey_efremov/Downloads/runs/mgts-backend
npm list @strapi/provider-upload-cloudinary
```

### Проверить конфигурацию:
```bash
cat config/plugins.ts
```

### Проверить переменные окружения:
```bash
cat .env | grep CLOUDINARY
```

---

## 🚀 Следующий шаг: Миграция изображений

После настройки Cloudinary можно мигрировать существующие изображения:

1. Создать скрипт миграции
2. Загрузить изображения из `SiteMGTS/images/` в Cloudinary
3. Обновить ссылки в контенте страниц

---

**Дата:** 27 декабря 2024
**Статус:** ✅ Плагин установлен и настроен, требуется настройка credentials





