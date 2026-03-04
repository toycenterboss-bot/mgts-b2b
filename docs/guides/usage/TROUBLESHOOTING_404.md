# Устранение ошибки 404

## Что было сделано

1. ✅ Добавлено детальное логирование в `js/components-loader.js`
2. ✅ Все компоненты проверены и находятся на месте
3. ✅ Логика вычисления базового пути проверена

## Как найти проблему

### Шаг 1: Откройте страницу с ошибкой
Например: `http://localhost:8000/about/ethics/general-director-message/index.html`

### Шаг 2: Откройте консоль браузера (F12)
Найдите вкладку "Console" (Консоль)

### Шаг 3: Найдите сообщения с префиксом `[ComponentLoader]`
Вы должны увидеть:
```
[ComponentLoader] Loading component: header
[ComponentLoader] Base path: "../../../"
[ComponentLoader] Component path: "../../../components/header.html"
[ComponentLoader] Current location: /about/ethics/general-director-message/index.html
```

### Шаг 4: Проверьте ошибки
Если видите ошибку 404, проверьте:
- **Какой компонент не загружается?** (header, footer, sidebar-about)
- **Какой путь запрашивается?** (должен быть `../../../components/header.html`)
- **Правильно ли вычислен базовый путь?** (для уровня 3 должен быть `../../../`)

## Возможные проблемы и решения

### Проблема 1: Неправильный базовый путь
**Симптом:** В консоли видно неправильный путь, например `../../components/header.html` вместо `../../../components/header.html`

**Решение:** Проверьте функцию `getBasePath()` в `js/components-loader.js`. Для страницы третьего уровня должно быть `../../../`

### Проблема 2: Компонент не найден
**Симптом:** Ошибка 404 для конкретного компонента

**Решение:** 
1. Проверьте, существует ли файл `components/header.html` (или другой компонент)
2. Проверьте права доступа к файлу
3. Убедитесь, что HTTP сервер запущен

### Проблема 3: Проблемы с путями в sidebar
**Симптом:** Ссылки в боковом меню ведут на 404

**Решение:** Проверьте логику обновления путей в функции `updatePaths()` для sidebar-about

## Пример правильного вывода

```
[ComponentLoader] Loading component: header
[ComponentLoader] Base path: "../../../"
[ComponentLoader] Component path: "../../../components/header.html"
[ComponentLoader] Current location: /about/ethics/general-director-message/index.html
[ComponentLoader] Full URL: http://localhost:8000/about/ethics/general-director-message/index.html
[ComponentLoader] Component header loaded successfully

[ComponentLoader] Loading component: footer
[ComponentLoader] Base path: "../../../"
[ComponentLoader] Component path: "../../../components/footer.html"
[ComponentLoader] Component footer loaded successfully

[ComponentLoader] Loading component: sidebar-about
[ComponentLoader] Base path: "../../../"
[ComponentLoader] Component path: "../../../components/sidebar-about.html"
[ComponentLoader] Component sidebar-about loaded successfully
```

## Если проблема не решена

1. Скопируйте все сообщения из консоли браузера
2. Проверьте, какой именно файл не загружается
3. Проверьте структуру папок проекта
4. Убедитесь, что HTTP сервер запущен и работает корректно

