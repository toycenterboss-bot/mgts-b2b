# Быстрый старт Strapi из разрешенной директории

## Проблема

Запуск из `C:\mgts-cms\mgts-backend` запрещен групповыми политиками.

## Решение 1: Перенести проект (рекомендуется)

### Автоматический перенос

```powershell
cd C:\Users\abefremov\SiteMGTS
.\move_strapi_to_runs.ps1
```

Скрипт автоматически:
- Скопирует проект в `C:\runs\mgts-cms\mgts-backend`
- Переустановит зависимости
- Готов к запуску

### Ручной перенос

```powershell
# Создать директорию
mkdir C:\runs\mgts-cms

# Скопировать проект
robocopy C:\mgts-cms\mgts-backend C:\runs\mgts-cms\mgts-backend /E /COPYALL

# Перейти в новую директорию
cd C:\runs\mgts-cms\mgts-backend

# Установить зависимости
npm install

# Запустить
npm run develop
```

## Решение 2: Использовать скрипт запуска

Если не хотите переносить проект, используйте скрипт:

```powershell
cd C:\runs
.\start_strapi.ps1
```

Скрипт автоматически найдет проект и запустит его.

## Решение 3: Символическая ссылка

Создать ссылку из разрешенной директории:

```powershell
# Запустить PowerShell от имени администратора
New-Item -ItemType SymbolicLink -Path "C:\runs\mgts-backend" -Target "C:\mgts-cms\mgts-backend"

# Работать через ссылку
cd C:\runs\mgts-backend
npm run develop
```

## После переноса

### Запуск Strapi

```powershell
cd C:\runs\mgts-cms\mgts-backend
npm run develop
```

### Открыть админ-панель

```
http://localhost:1337/admin
```

### Проверка установки

```powershell
cd C:\runs\mgts-cms\mgts-backend
.\check_strapi_setup.ps1
```

## Обновление путей

После переноса обновите в документации:
- `C:\mgts-cms` → `C:\runs\mgts-cms`
- Все скрипты будут работать из новой директории

