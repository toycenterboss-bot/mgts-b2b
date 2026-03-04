# Устранение проблем с компонентами

## Проблема: Mega-menu и footer не отображаются

### Возможные причины:

1. **Открытие файлов напрямую через file:// протокол**
   - Fetch API может не работать при открытии HTML файлов напрямую
   - **Решение:** Используйте локальный HTTP сервер

2. **Неправильные пути к компонентам**
   - Проверьте, что файлы компонентов существуют в папке `components/`
   - Проверьте консоль браузера на наличие ошибок

3. **Скрипт не загружается**
   - Убедитесь, что `js/components-loader.js` подключен перед закрывающим тегом `</body>`
   - Проверьте пути к скрипту на разных уровнях вложенности

## Решения:

### 1. Запуск локального HTTP сервера

**Python 3:**
```bash
python -m http.server 8000
```

**Node.js (http-server):**
```bash
npx http-server -p 8000
```

**PHP:**
```bash
php -S localhost:8000
```

Затем откройте в браузере: `http://localhost:8000`

### 2. Проверка консоли браузера

Откройте консоль разработчика (F12) и проверьте:
- Ошибки загрузки компонентов
- Пути к файлам компонентов
- Сообщения об ошибках

### 3. Проверка структуры файлов

Убедитесь, что существуют:
- `components/header.html`
- `components/footer.html`
- `components/sidebar-about.html`
- `js/components-loader.js`

### 4. Альтернативный метод загрузки

Если fetch не работает, скрипт автоматически попробует использовать XMLHttpRequest.

### 5. Ручная проверка компонентов

Откройте в браузере напрямую:
- `http://localhost:8000/components/header.html`
- `http://localhost:8000/components/footer.html`

Если они не открываются, проверьте пути.

## Отладка

Добавьте в консоль браузера:
```javascript
// Проверка базового пути
console.log('Base path:', ComponentLoader.getBasePath());

// Ручная загрузка компонента
ComponentLoader.load('header', '[data-component="header"]')
    .then(() => console.log('Header loaded'))
    .catch(err => console.error('Error:', err));
```

