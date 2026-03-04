# 🔍 Проверка связи между Strapi и SiteMGTS

## 📋 Диагностика проблемы

### Шаг 1: Проверить, загружается ли контент из API

**Откройте в браузере:**
```
http://localhost:8001/index.html?cms=true
```

**Откройте консоль браузера (F12) и проверьте сообщения:**

✅ **Если CMS Loader работает, вы увидите:**
```
[CMS Loader] Loading page from API: index
[CMS Loader] Page loaded successfully: index
```

❌ **Если CMS Loader НЕ работает, сообщений не будет**

---

### Шаг 2: Проверить, включен ли CMS Loader

**В консоли браузера выполните:**
```javascript
// Проверить, загружен ли CMS Loader
console.log('CMSLoader:', typeof window.CMSLoader);
console.log('StrapiAPI:', typeof window.StrapiAPI);

// Проверить настройки
console.log('URL:', window.location.href);
console.log('Hostname:', window.location.hostname);
```

**Ожидаемый результат:**
- `CMSLoader: object` - CMS Loader загружен
- `StrapiAPI: object` - API клиент загружен

---

### Шаг 3: Принудительно включить CMS Loader

**Если CMS Loader не работает автоматически:**

1. **Добавьте параметр в URL:**
   ```
   http://localhost:8001/index.html?cms=true
   ```

2. **Или в консоли браузера:**
   ```javascript
   localStorage.setItem('useCMS', 'true');
   location.reload();
   ```

3. **Или принудительно загрузить:**
   ```javascript
   if (window.CMSLoader) {
     window.CMSLoader.load();
   }
   ```

---

### Шаг 4: Проверить API напрямую

**В консоли браузера:**
```javascript
// Проверить доступность API
fetch('http://localhost:1337/api/pages/slug/index')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Page Title:', data.data?.title);
    console.log('Published:', data.data?.publishedAt !== null);
  })
  .catch(err => console.error('API Error:', err));
```

**Ожидаемый результат:**
- Должен вернуться объект с данными страницы
- `publishedAt` не должен быть `null`

---

## 🔧 Решение проблем

### Проблема 1: CMS Loader не загружается

**Причина:** Скрипты не подключены или загружаются в неправильном порядке

**Решение:**
1. Проверьте, что в `index.html` есть:
   ```html
   <script src="js/api-client.js"></script>
   <script src="js/components-loader.js"></script>
   <script src="js/cms-loader.js"></script>
   ```

2. Проверьте порядок загрузки - `api-client.js` должен быть первым

### Проблема 2: CMS Loader не включается автоматически

**Причина:** Логика определения не срабатывает

**Решение:**
- Добавьте `?cms=true` в URL
- Или установите `localStorage.setItem('useCMS', 'true')`

### Проблема 3: API возвращает старые данные

**Причина:** Кэширование или страница не обновлена

**Решение:**
```javascript
// Очистить кэш и перезагрузить
window.StrapiAPI.clearCache();
window.CMSLoader.reload();
```

### Проблема 4: CORS ошибка

**Причина:** Strapi блокирует запросы с фронтенда

**Решение:**
Проверьте настройки CORS в `mgts-backend/config/middlewares.ts`

---

## ✅ Быстрая проверка связи

**Выполните в консоли браузера:**
```javascript
// 1. Проверить загрузку скриптов
console.log('API Client:', typeof window.StrapiAPI);
console.log('CMS Loader:', typeof window.CMSLoader);

// 2. Проверить API
fetch('http://localhost:1337/api/pages/slug/index')
  .then(r => r.json())
  .then(d => {
    console.log('✅ API работает');
    console.log('Title:', d.data?.title);
    console.log('Published:', d.data?.publishedAt !== null);
  });

// 3. Принудительно загрузить контент
if (window.CMSLoader) {
  window.CMSLoader.load();
}
```

---

## 📝 Пошаговая инструкция

1. **Откройте страницу:**
   ```
   http://localhost:8001/index.html?cms=true
   ```

2. **Откройте консоль (F12)**

3. **Проверьте сообщения:**
   - Должны быть сообщения `[CMS Loader]`
   - Не должно быть ошибок CORS

4. **Если сообщений нет:**
   - Выполните: `window.CMSLoader.load()`
   - Проверьте, что скрипты загружены

5. **Если есть ошибки:**
   - Проверьте, что Strapi запущен: http://localhost:1337/admin
   - Проверьте CORS настройки

---

**Дата:** 27 декабря 2024





