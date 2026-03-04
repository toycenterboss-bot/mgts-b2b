# 🔧 Решение проблемы: изменения в CMS не отображаются на сайте

## 🔍 Возможные причины

### 1. Страница не опубликована ⚠️ (Наиболее частая причина)

**Проблема:** В Strapi страницы могут быть в статусе "Draft" (черновик) или "Published" (опубликована).

**Решение:**
1. Откройте страницу в админ-панели: http://localhost:1337/admin
2. Content Manager → Pages → Найдите вашу страницу
3. Убедитесь, что страница **Published** (зеленая галочка)
4. Если нет - нажмите **Publish**

**Проверка через API:**
```bash
curl http://localhost:1337/api/pages/slug/your-slug
```

Если `publishedAt: null` - страница не опубликована.

---

### 2. Кэширование на клиенте 🔄

**Проблема:** Браузер или API клиент кэширует старые данные.

**Решение:**

**Вариант 1: Очистить кэш в консоли браузера**
```javascript
// Откройте консоль (F12) и выполните:
window.StrapiAPI.clearCache();
location.reload();
```

**Вариант 2: Перезагрузить с обходом кэша**
```javascript
// В консоли браузера:
window.CMSLoader.reload();
```

**Вариант 3: Жесткая перезагрузка страницы**
- Windows/Linux: `Ctrl + Shift + R` или `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Вариант 4: Добавить параметр в URL**
```
http://localhost:8001/index.html?cms=true&nocache=1
```

---

### 3. CMS Loader не включен 📝

**Проблема:** Фронтенд использует статический контент вместо API.

**Проверка:**
1. Откройте консоль браузера (F12)
2. Проверьте сообщения:
   - Должно быть: `[CMS Loader] Loading page from API: ...`
   - Если нет - CMS Loader не работает

**Решение:**

**Включить CMS Loader:**
- Добавьте `?cms=true` в URL: `http://localhost:8001/index.html?cms=true`
- Или установите в консоли: `localStorage.setItem('useCMS', 'true')`

**Проверить настройки:**
```javascript
// В консоли браузера:
console.log('USE_CMS_API:', window.location.search.includes('cms=true'));
```

---

### 4. API возвращает старые данные 🔄

**Проблема:** Strapi кэширует данные или не обновил базу.

**Решение:**

1. **Перезапустить Strapi:**
   ```bash
   # Остановить
   kill $(cat /tmp/strapi.pid)
   
   # Запустить заново
   cd /Users/andrey_efremov/Downloads/runs/mgts-backend
   npm run develop
   ```

2. **Проверить через API напрямую:**
   ```bash
   curl http://localhost:1337/api/pages/slug/your-slug
   ```
   
   Сравните `updatedAt` с временем вашего изменения.

---

### 5. Неправильный slug 🔍

**Проблема:** Используется неправильный slug для загрузки страницы.

**Проверка:**
1. Проверьте slug страницы в админ-панели
2. Проверьте, какой slug используется на фронтенде
3. Убедитесь, что они совпадают

**Решение:**
- Используйте правильный slug в URL или в коде

---

## ✅ Быстрое решение

### Шаг 1: Проверить публикацию
1. http://localhost:1337/admin → Content Manager → Pages
2. Найдите вашу страницу
3. Убедитесь, что она **Published**

### Шаг 2: Очистить кэш
В консоли браузера (F12):
```javascript
window.StrapiAPI?.clearCache();
window.CMSLoader?.reload();
```

### Шаг 3: Жесткая перезагрузка
- `Ctrl + Shift + R` (Windows/Linux)
- `Cmd + Shift + R` (Mac)

### Шаг 4: Проверить API
```bash
curl http://localhost:1337/api/pages/slug/your-slug
```

Проверьте `updatedAt` - должно совпадать с временем изменения.

---

## 🔧 Что было исправлено

### 1. Обновлен контроллер API
- Теперь возвращает только опубликованные страницы
- Фильтр: `publishedAt: { $notNull: true }`

### 2. Добавлена функция обхода кэша
- `window.CMSLoader.reload()` - перезагрузить с обходом кэша
- `window.StrapiAPI.clearCache()` - очистить весь кэш
- `getPage(slug, bypassCache)` - получить страницу без кэша

### 3. Улучшена логика CMS Loader
- Более гибкое управление включением/выключением API
- Поддержка параметра `?cms=false` для отключения

---

## 📝 Инструкция для редакторов

### После изменения страницы:

1. **Сохранить изменения:**
   - Нажмите **Save**

2. **Опубликовать страницу:**
   - Нажмите **Publish** (если не опубликована)
   - Или **Update** (если уже опубликована)

3. **Проверить на сайте:**
   - Откройте страницу на сайте
   - Нажмите `Ctrl + Shift + R` для жесткой перезагрузки
   - Или очистите кэш в консоли браузера

---

## 🆘 Если ничего не помогает

1. **Проверить логи Strapi:**
   ```bash
   tail -50 /tmp/strapi.log
   ```

2. **Проверить консоль браузера:**
   - Откройте DevTools (F12)
   - Проверьте вкладку Console на ошибки
   - Проверьте вкладку Network на запросы к API

3. **Перезапустить все сервисы:**
   ```bash
   # Остановить Strapi
   kill $(cat /tmp/strapi.pid)
   
   # Остановить фронтенд
   kill $(cat /tmp/frontend.pid)
   
   # Запустить заново
   cd /Users/andrey_efremov/Downloads/runs/mgts-backend && npm run develop &
   cd /Users/andrey_efremov/Downloads/runs/SiteMGTS && python3 -m http.server 8001 &
   ```

---

**Дата:** 27 декабря 2024
**Статус:** ✅ Проблемы исправлены, добавлены функции обхода кэша





