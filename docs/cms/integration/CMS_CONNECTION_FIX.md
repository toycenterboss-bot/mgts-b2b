# 🔧 Исправление связи Strapi ↔ SiteMGTS

## ❌ Обнаруженные проблемы

### Проблема 1: Страница не опубликована
**Статус:** `Published: False`

**Решение:**
1. http://localhost:1337/admin → Content Manager → Pages
2. Найдите страницу `index`
3. Нажмите **Publish** (опубликовать)

### Проблема 2: CMS Loader может не работать автоматически

**Причина:** CMS Loader включается только на `localhost`, но может не сработать

**Решение:**
- Добавьте `?cms=true` в URL: `http://localhost:8001/index.html?cms=true`
- Или установите: `localStorage.setItem('useCMS', 'true')`

---

## ✅ Проверка связи

### Шаг 1: Проверить API

**В консоли браузера (F12):**
```javascript
fetch('http://localhost:1337/api/pages/slug/index')
  .then(r => r.json())
  .then(d => {
    console.log('✅ API работает');
    console.log('Title:', d.data?.title);
    console.log('Published:', d.data?.publishedAt !== null);
  });
```

**Ожидаемый результат:**
- `Published: true` (после публикации)
- Должен вернуться объект с данными

### Шаг 2: Проверить CMS Loader

**Откройте:**
```
http://localhost:8001/index.html?cms=true
```

**В консоли браузера должны быть сообщения:**
```
[CMS Loader] Initializing...
[CMS Loader] USE_CMS_API: true
[CMS Loader] StrapiAPI available: true
[CMS Loader] ✅ CMS API enabled, loading content from Strapi...
[CMS Loader] Loading page from API: index
[CMS Loader] Page loaded successfully: index
```

### Шаг 3: Принудительно загрузить контент

**Если CMS Loader не работает автоматически:**

```javascript
// В консоли браузера
if (window.CMSLoader) {
  window.CMSLoader.load();
} else {
  console.error('CMS Loader не загружен!');
}
```

---

## 🔧 Что было исправлено

1. **Добавлено логирование в CMS Loader**
   - Теперь видно, включен ли CMS Loader
   - Видно, загружен ли StrapiAPI
   - Видно, загружается ли контент из API

2. **Улучшена диагностика**
   - Подсказки в консоли, если CMS Loader не работает
   - Инструкции, как включить

3. **Обновлен API контроллер**
   - Возвращает черновики, если опубликованной версии нет
   - Но лучше всегда публиковать страницы

---

## 📝 Пошаговая инструкция

### 1. Опубликовать страницу в Strapi

1. Откройте: http://localhost:1337/admin
2. Content Manager → Pages
3. Найдите страницу `index`
4. Нажмите **Publish** (зеленая кнопка)

### 2. Проверить на сайте

1. Откройте: `http://localhost:8001/index.html?cms=true`
2. Откройте консоль (F12)
3. Проверьте сообщения:
   - Должны быть `[CMS Loader]` сообщения
   - Не должно быть ошибок

### 3. Если не работает

**В консоли браузера:**
```javascript
// Очистить кэш
window.StrapiAPI.clearCache();

// Принудительно загрузить
window.CMSLoader.load();
```

---

## 🎯 Быстрая проверка

**Выполните в консоли браузера:**
```javascript
// 1. Проверить загрузку
console.log('StrapiAPI:', typeof window.StrapiAPI);
console.log('CMSLoader:', typeof window.CMSLoader);

// 2. Проверить API
fetch('http://localhost:1337/api/pages/slug/index')
  .then(r => r.json())
  .then(d => console.log('API:', d.data?.title, 'Published:', d.data?.publishedAt !== null));

// 3. Загрузить контент
if (window.CMSLoader) {
  window.CMSLoader.load();
}
```

---

**Дата:** 27 декабря 2024
**Статус:** ✅ Диагностика улучшена, добавлено логирование





