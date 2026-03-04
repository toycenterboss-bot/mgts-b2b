# Исправление проблемы с компонентами

## Проблема
При открытии страниц через `file://` протокол компоненты не загружаются из-за CORS политики браузера.

## Решение

### ⚠️ ВАЖНО: Используйте локальный HTTP сервер!

Компоненты **НЕ БУДУТ РАБОТАТЬ** при открытии HTML файлов напрямую через `file://` протокол.

### Быстрый запуск сервера

**Windows:**
```bash
START_SERVER.bat
```

**Linux/Mac:**
```bash
chmod +x START_SERVER.sh
./START_SERVER.sh
```

**Или вручную:**
```bash
python -m http.server 8000
```

Затем откройте в браузере: `http://localhost:8000`

## Что было исправлено

1. ✅ Улучшено вычисление базового пути для file:// и http:// протоколов
2. ✅ Добавлены информативные сообщения об ошибках
3. ✅ Добавлена функция `initNavigation()` для правильной инициализации навигации
4. ✅ Улучшена обработка ошибок с понятными сообщениями

## Проверка работы

1. Запустите HTTP сервер: `python -m http.server 8000`
2. Откройте: `http://localhost:8000/test-components.html`
3. Проверьте консоль браузера (F12) - не должно быть ошибок CORS
4. Header и Footer должны загрузиться автоматически

## Отладка

Если компоненты не загружаются:

1. Проверьте консоль браузера (F12)
2. Убедитесь, что используете HTTP сервер, а не file://
3. Проверьте, что файлы существуют:
   - `components/header.html`
   - `components/footer.html`
   - `js/components-loader.js`

4. Проверьте пути в консоли:
   ```javascript
   console.log('Base path:', ComponentLoader.getBasePath());
   console.log('Protocol:', window.location.protocol);
   ```

## Альтернативные серверы

Если Python недоступен:

**Node.js:**
```bash
npx http-server -p 8000
```

**PHP:**
```bash
php -S localhost:8000
```

**VS Code Live Server:**
Установите расширение "Live Server" и используйте кнопку "Go Live"

