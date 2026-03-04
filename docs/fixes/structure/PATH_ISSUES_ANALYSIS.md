# Анализ проблем с путями в инструкциях CMS

## Проблема

Скрипты запускаются из папки `C:\runs`, а сайт находится в `C:\Users\abefremov\SiteMGTS`. Это может привести к ошибкам в следующих местах:

## Найденные проблемы

### 1. В `CMS_IMPLEMENTATION_PLAN.md`

#### Проблема 1.1: Относительные пути в скриптах извлечения контента

**Местоположение:** Строки 303, 523, 1478

**Проблемный код:**
```javascript
// Строка 303
const siteRoot = path.join(__dirname, '../../SiteMGTS');

// Строка 523
const relativePath = path.relative(
  path.join(__dirname, '../../SiteMGTS'),
  this.filePath
);

// Строка 1478
const imagesDir = path.join(__dirname, '../../SiteMGTS/images');
```

**Проблема:** Эти пути предполагают, что:
- Скрипт находится в `mgts-backend/scripts/extract-content/`
- Оттуда нужно подняться на 2 уровня вверх (`../../`)
- И найти `SiteMGTS` на том же уровне, что и `mgts-backend`

**Но в реальности:**
- `mgts-backend` находится в `C:\Users\abefremov\mgts-cms\mgts-backend`
- `SiteMGTS` находится в `C:\Users\abefremov\SiteMGTS`
- Если скрипт запускается из `C:\runs`, относительные пути не сработают

**Решение:** Использовать абсолютные пути или переменные окружения.

#### Проблема 1.2: Путь к API клиенту

**Местоположение:** Строка 1183

**Проблемный код:**
```javascript
// Создать файл: SiteMGTS/js/api-client.js
```

**Проблема:** Это относительный путь, который не будет работать, если скрипт запускается из другой директории.

**Решение:** Указать полный путь или использовать переменную окружения.

### 2. В `STEP_1_INSTRUCTIONS.md`

#### Проблема 2.1: Абсолютный путь к директории проекта

**Местоположение:** Строка 58

**Код:**
```powershell
cd C:\Users\abefremov\SiteMGTS
```

**Проблема:** Это жестко закодированный путь, который не будет работать для других пользователей.

**Решение:** Использовать переменную окружения или параметр скрипта.

### 3. В `setup_step1.ps1`

#### Проблема 3.1: Определение родительской директории

**Местоположение:** Строки 19-24

**Проблемный код:**
```powershell
$currentDir = Get-Location
$parentDir = Split-Path -Parent $currentDir.Path
Set-Location $parentDir
```

**Проблема:** Если скрипт запускается из `C:\runs`, то:
- `$currentDir` = `C:\runs`
- `$parentDir` = `C:\`
- Скрипт попытается создать `mgts-cms` в `C:\`, что неправильно

**Решение:** Использовать абсолютный путь к директории проекта или переменную окружения.

## Рекомендации по исправлению

### Вариант 1: Использовать переменные окружения (рекомендуется)

1. Создать файл `.env` или `.env.local` в корне проекта `mgts-backend`:
```env
SITE_ROOT=C:\Users\abefremov\SiteMGTS
CMS_ROOT=C:\Users\abefremov\mgts-cms
```

2. В скриптах использовать:
```javascript
const siteRoot = process.env.SITE_ROOT || path.join(__dirname, '../../SiteMGTS');
```

### Вариант 2: Использовать абсолютные пути в конфигурации

Создать файл `config/paths.js`:
```javascript
module.exports = {
  siteRoot: 'C:\\Users\\abefremov\\SiteMGTS',
  cmsRoot: 'C:\\Users\\abefremov\\mgts-cms',
  imagesDir: 'C:\\Users\\abefremov\\SiteMGTS\\images'
};
```

### Вариант 3: Автоматическое определение путей

В скриптах определить пути автоматически:
```javascript
// Найти SiteMGTS, поднимаясь по директориям
function findSiteRoot() {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    const siteDir = path.join(currentDir, 'SiteMGTS');
    if (fs.existsSync(siteDir)) {
      return siteDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('SiteMGTS directory not found');
}
```

## Исправления для скриптов

### Исправление для `setup_step1.ps1`

```powershell
# Определить путь к директории проекта
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if ($scriptPath -like "*SiteMGTS*") {
    $scriptPath
} else {
    # Если скрипт запущен из C:\runs, использовать абсолютный путь
    "C:\Users\abefremov\SiteMGTS"
}

# Родительская директория для mgts-cms
$parentDir = Split-Path -Parent $projectRoot
```

### Исправление для скриптов извлечения контента

```javascript
// В начале каждого скрипта
const SITE_ROOT = process.env.SITE_ROOT || 
  (() => {
    // Попытка найти SiteMGTS автоматически
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      const siteDir = path.join(currentDir, '..', '..', 'SiteMGTS');
      if (fs.existsSync(siteDir)) {
        return siteDir;
      }
      currentDir = path.dirname(currentDir);
    }
    // Если не найдено, использовать относительный путь
    return path.join(__dirname, '../../SiteMGTS');
  })();
```

## Чек-лист исправлений

- [ ] Обновить `CMS_IMPLEMENTATION_PLAN.md` с правильными путями
- [ ] Обновить `STEP_1_INSTRUCTIONS.md` с использованием переменных окружения
- [ ] Исправить `setup_step1.ps1` для правильного определения путей
- [ ] Создать файл конфигурации путей
- [ ] Обновить все скрипты извлечения контента
- [ ] Добавить проверку существования путей в скриптах
- [ ] Создать документацию по настройке путей

## Приоритет исправлений

1. **Высокий:** Исправить `setup_step1.ps1` - это критично для Этапа 1
2. **Высокий:** Обновить инструкции в `CMS_IMPLEMENTATION_PLAN.md` для Этапа 2
3. **Средний:** Создать систему конфигурации путей
4. **Низкий:** Добавить автоматическое определение путей

