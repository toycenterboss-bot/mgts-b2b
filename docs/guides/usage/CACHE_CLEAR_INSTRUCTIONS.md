# Инструкция по очистке кэша браузера

## Проблема
Браузер использует кэшированную версию файла `cms-loader.js`, поэтому предупреждения все еще появляются, хотя код уже исправлен.

## Решение

### Способ 1: Жесткая перезагрузка страницы

**Windows/Linux:**
- **Chrome/Edge:** `Ctrl + Shift + R` или `Ctrl + F5`
- **Firefox:** `Ctrl + Shift + R` или `Ctrl + F5`

**Mac:**
- **Chrome/Edge:** `Cmd + Shift + R`
- **Firefox:** `Cmd + Shift + R`
- **Safari:** `Cmd + Option + R`

### Способ 2: Через DevTools (рекомендуется)

1. Откройте DevTools (F12 или `Cmd + Option + I` на Mac)
2. Перейдите на вкладку **Network** (Сеть)
3. Установите флажок **"Disable cache"** (Отключить кэш)
4. Оставьте DevTools открытым
5. Перезагрузите страницу (F5 или `Cmd + R`)

### Способ 3: Полная очистка кэша браузера

**Chrome/Edge:**
1. Нажмите `Ctrl + Shift + Delete` (Windows/Linux) или `Cmd + Shift + Delete` (Mac)
2. Выберите "Изображения и файлы в кэше"
3. Выберите период "За все время"
4. Нажмите "Удалить данные"

**Firefox:**
1. Нажмите `Ctrl + Shift + Delete` (Windows/Linux) или `Cmd + Shift + Delete` (Mac)
2. Выберите "Кэш"
3. Выберите период "Все"
4. Нажмите "Очистить сейчас"

### Способ 4: Проверка версии файла

После очистки кэша проверьте в консоли:
- Должны появиться сообщения: `[CMS Loader] Card has service-card class, defaulting to SERVICE type: ...`
- Предупреждения `Card has service-card class but detected as tariff` должны исчезнуть

### Способ 5: Если используете локальный сервер

Убедитесь, что файл `SiteMGTS/js/cms-loader.js` действительно обновлен на сервере. Если используете live-reload или подобные инструменты, перезапустите сервер.

## Проверка успешности

После очистки кэша в консоли должны появиться:
- ✅ `[CMS Loader] Card has service-card class, defaulting to SERVICE type: "Название карточки"`
- ❌ НЕ должно быть: `[CMS Loader] Card has service-card class but detected as tariff, forcing service type`

