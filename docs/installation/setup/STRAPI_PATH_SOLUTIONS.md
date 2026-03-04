# Решения проблемы с групповыми политиками для Strapi

## Проблема

Запуск Strapi из текущей директории (`C:\mgts-cms\mgts-backend`) запрещен групповыми политиками.

## Решения

### Вариант 1: Перенос проекта в разрешенную директорию (рекомендуется)

Если у вас есть директория, где запуск разрешен (например, `C:\runs`), перенесите туда проект.

#### Шаг 1: Перенести проект

```powershell
# Создать структуру в разрешенной директории
mkdir C:\runs\mgts-cms
mkdir C:\runs\mgts-cms\mgts-backend

# Скопировать проект (или переместить)
# ВАЖНО: Используйте robocopy для сохранения всех атрибутов
robocopy C:\mgts-cms\mgts-backend C:\runs\mgts-cms\mgts-backend /E /COPYALL

# Или просто переместить (если копирование не нужно)
# Move-Item C:\mgts-cms\mgts-backend C:\runs\mgts-cms\mgts-backend
```

#### Шаг 2: Обновить пути в проекте

После переноса проверьте, что все пути корректны:

```powershell
cd C:\runs\mgts-cms\mgts-backend
npm install
npm run develop
```

#### Шаг 3: Обновить переменные окружения

Если используете переменные окружения:

```powershell
$env:SITE_ROOT = "C:\Users\abefremov\SiteMGTS"
$env:CMS_ROOT = "C:\runs\mgts-cms"
```

### Вариант 2: Использование символических ссылок

Создать символическую ссылку из разрешенной директории на проект.

#### Шаг 1: Создать символическую ссылку

```powershell
# Создать директорию для ссылок
mkdir C:\runs\mgts-cms -ErrorAction SilentlyContinue

# Создать символическую ссылку (требуются права администратора)
# Запустить PowerShell от имени администратора
New-Item -ItemType SymbolicLink -Path "C:\runs\mgts-cms\mgts-backend" -Target "C:\mgts-cms\mgts-backend"
```

#### Шаг 2: Работать через ссылку

```powershell
cd C:\runs\mgts-cms\mgts-backend
npm run develop
```

**Преимущества:**
- Проект остается на месте
- Работаете из разрешенной директории
- Изменения применяются к оригинальному проекту

### Вариант 3: Запуск из другой директории с указанием пути

Запускать команды из разрешенной директории, указывая путь к проекту.

#### Создать скрипт запуска

Создайте файл `C:\runs\start_strapi.ps1`:

```powershell
# start_strapi.ps1
$projectPath = "C:\mgts-cms\mgts-backend"

if (Test-Path $projectPath) {
    Set-Location $projectPath
    npm run develop
} else {
    Write-Host "Project not found: $projectPath" -ForegroundColor Red
}
```

Запуск:
```powershell
cd C:\runs
.\start_strapi.ps1
```

### Вариант 4: Использование npm scripts с полными путями

Модифицировать `package.json` для работы из любой директории.

#### Обновить package.json

```json
{
  "scripts": {
    "develop": "cd C:\\mgts-cms\\mgts-backend && strapi develop",
    "start": "cd C:\\mgts-cms\\mgts-backend && strapi start"
  }
}
```

Но это не очень удобно, лучше использовать скрипт.

### Вариант 5: Переменные окружения и скрипты

Создать универсальные скрипты, которые работают из любой директории.

#### Создать скрипт управления

Создайте `C:\runs\strapi_manager.ps1`:

```powershell
# strapi_manager.ps1
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("develop", "start", "build", "install")]
    [string]$Command
)

$projectPath = "C:\mgts-cms\mgts-backend"

if (-not (Test-Path $projectPath)) {
    Write-Host "Project not found: $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath

switch ($Command) {
    "develop" {
        npm run develop
    }
    "start" {
        npm run start
    }
    "build" {
        npm run build
    }
    "install" {
        npm install
    }
}
```

Использование:
```powershell
cd C:\runs
.\strapi_manager.ps1 develop
.\strapi_manager.ps1 install
.\strapi_manager.ps1 start
```

## Рекомендуемый подход

**Для вашего случая рекомендую Вариант 1 (перенос проекта):**

1. Проект будет в разрешенной директории
2. Не нужно запускать от администратора
3. Все команды работают напрямую
4. Проще управлять

### Пошаговая инструкция переноса

```powershell
# 1. Создать структуру в разрешенной директории
mkdir C:\runs\mgts-cms
mkdir C:\runs\mgts-cms\mgts-backend

# 2. Скопировать проект (сохраняя все файлы и атрибуты)
robocopy C:\mgts-cms\mgts-backend C:\runs\mgts-cms\mgts-backend /E /COPYALL /R:3 /W:5

# 3. Перейти в новую директорию
cd C:\runs\mgts-cms\mgts-backend

# 4. Переустановить зависимости (на всякий случай)
npm install

# 5. Запустить Strapi
npm run develop
```

## Обновление путей в документации

После переноса нужно обновить:
- `CMS_IMPLEMENTATION_PLAN.md` - пути к проекту
- `STEP_1_INSTRUCTIONS.md` - инструкции
- Все скрипты, которые ссылаются на `C:\mgts-cms`

## Проверка после переноса

```powershell
cd C:\runs\mgts-cms\mgts-backend
.\check_strapi_setup.ps1
```

Если всё работает - перенос успешен!

