# 🔧 Исправление кодировки и путей к скриптам

## ❌ Обнаруженные проблемы

### Проблема 1: Неправильные пути к скриптам
**Ошибка:** `404 (File not found) http://localhost:8001/contacts/js/components-loader.js`

**Причина:** Для страниц первого уровня (contacts, developers, и т.д.) путь должен быть `../js/`, а не `js/`

**Решение:** Исправлены пути на всех страницах

### Проблема 2: Проблемы с кодировкой
**Симптом:** После загрузки контента из CMS слетает кодировка страницы

**Причина:** 
- API может возвращать данные не в UTF-8
- При вставке HTML в DOM может теряться кодировка
- Мета-тег charset может отсутствовать

**Решение:** 
- Добавлена явная установка charset в API запросах
- Добавлена проверка и установка meta charset при загрузке контента
- Улучшена обработка текста при парсинге JSON

---

## ✅ Что было исправлено

### 1. Исправлены пути к скриптам

**Для страниц первого уровня** (contacts, developers, government, operators, partners):
- Было: `js/components-loader.js`
- Стало: `../js/components-loader.js`

**Для страниц второго уровня** (about, business):
- Путь: `../../js/components-loader.js`

**Для страниц третьего уровня** (about/ethics, business/internet):
- Путь: `../../../js/components-loader.js`

### 2. Исправлена кодировка

**В API клиенте:**
- Добавлен `charset=utf-8` в заголовки запросов
- Улучшена обработка текста при парсинге JSON

**В CMS Loader:**
- Добавлена проверка и установка meta charset
- Улучшена обработка HTML контента

---

## 🔍 Проверка

### Проверить пути к скриптам:

```bash
# Для страницы contacts
curl http://localhost:8001/../js/components-loader.js

# Должен вернуть содержимое файла
```

### Проверить кодировку:

1. Откройте страницу: `http://localhost:8001/contacts/index.html?cms=true`
2. Откройте консоль (F12)
3. Проверьте кодировку:
   ```javascript
   document.characterSet // Должно быть "UTF-8"
   document.querySelector('meta[charset]') // Должен существовать
   ```

---

## 📝 Дополнительные исправления

### Если кодировка все еще слетает:

1. **Проверить кодировку в Strapi:**
   - Убедиться, что контент сохранен в UTF-8
   - Проверить настройки базы данных

2. **Проверить HTTP заголовки:**
   ```bash
   curl -I http://localhost:1337/api/pages/slug/contacts
   ```
   Должен быть: `Content-Type: application/json; charset=utf-8`

3. **Принудительно установить кодировку:**
   ```javascript
   // В консоли браузера
   if (!document.querySelector('meta[charset]')) {
     const meta = document.createElement('meta');
     meta.setAttribute('charset', 'UTF-8');
     document.head.insertBefore(meta, document.head.firstChild);
   }
   ```

---

## ✅ Итоговый статус

- [x] Пути к скриптам исправлены на всех страницах
- [x] Кодировка UTF-8 установлена в API запросах
- [x] Добавлена проверка meta charset при загрузке контента
- [x] Улучшена обработка текста в API клиенте

---

**Дата:** 27 декабря 2024
**Статус:** ✅ Проблемы исправлены





