# Отладка ошибки 404

## Проблема
Ошибка "Failed to load resource: the server responded with a status of 404 (File not found)".

## Добавлено детальное логирование

В `js/components-loader.js` добавлено подробное логирование для отладки:

1. **При загрузке компонента:**
   - Имя компонента
   - Базовый путь
   - Полный путь к компоненту
   - Текущий путь страницы
   - Полный URL

2. **При ошибке fetch:**
   - Детали ошибки
   - Запрошенный URL
   - Статус ответа

3. **При использовании XHR:**
   - Логирование попыток загрузки
   - Детали ошибок

## Как проверить

1. Откройте страницу с ошибкой (например, `about/ethics/general-director-message/index.html`)
2. Откройте консоль браузера (F12)
3. Найдите сообщения с префиксом `[ComponentLoader]`
4. Проверьте:
   - Какой компонент не загружается
   - Какой путь запрашивается
   - Правильно ли вычислен базовый путь

## Возможные причины

1. **Неправильный базовый путь** - для страницы третьего уровня должен быть `../../../`
2. **Компонент не существует** - проверьте наличие файла `components/header.html`
3. **Проблемы с сервером** - убедитесь, что HTTP сервер запущен

## Пример правильного вывода в консоли

```
[ComponentLoader] Loading component: header
[ComponentLoader] Base path: "../../../"
[ComponentLoader] Component path: "../../../components/header.html"
[ComponentLoader] Current location: /about/ethics/general-director-message/index.html
[ComponentLoader] Full URL: http://localhost:8000/about/ethics/general-director-message/index.html
[ComponentLoader] Component header loaded successfully
```

Если видите ошибку 404, проверьте путь к компоненту - он должен быть правильным относительно текущей страницы.

