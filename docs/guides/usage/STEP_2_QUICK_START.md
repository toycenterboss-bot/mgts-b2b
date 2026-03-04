# Быстрый старт Этапа 2

## Проблема: Файл analyze-content-types.js не найден

Если вы получили ошибку `Cannot find module`, значит файл еще не создан.

## Решение

### Вариант 1: Файлы уже созданы

Файлы уже находятся в правильном месте:
`C:\runs\mgts-backend\scripts\extract-content\`

Если файлы отсутствуют, скопируйте их из `C:\runs\SiteMGTS\scripts\extract-content\`:

```powershell
# Создать директорию, если её нет
mkdir C:\runs\mgts-backend\scripts\extract-content -Force

# Скопировать файлы
Copy-Item C:\runs\SiteMGTS\scripts\extract-content\*.js C:\runs\mgts-backend\scripts\extract-content\
```

## Проверка установки зависимостей

Перед запуском убедитесь, что установлен `jsdom`:

```powershell
cd C:\runs\mgts-backend
npm install jsdom
```

## Правильный порядок выполнения

1. **Сначала запустите инвентаризацию:**
```powershell
cd C:\runs\mgts-backend\scripts\extract-content
$env:SITE_ROOT = "C:\runs\SiteMGTS"
node inventory.js
```

2. **Затем запустите анализ:**
```powershell
node analyze-content-types.js
```

## Проверка файлов

Убедитесь, что все файлы на месте:

```powershell
cd C:\runs\mgts-backend\scripts\extract-content
dir
```

Должны быть:
- ✅ `inventory.js`
- ✅ `analyze-content-types.js`
- ✅ `inventory.json` (после запуска inventory.js)
- ✅ `content-analysis.json` (после запуска analyze-content-types.js)

## Если проблемы продолжаются

1. Проверьте путь к проекту:
```powershell
cd C:\runs\mgts-backend
```

2. Убедитесь, что вы в правильной директории:
```powershell
pwd
# Должно быть: C:\runs\mgts-backend\scripts\extract-content
```

3. Проверьте наличие файла:
```powershell
Test-Path analyze-content-types.js
# Должно вернуть: True
```

