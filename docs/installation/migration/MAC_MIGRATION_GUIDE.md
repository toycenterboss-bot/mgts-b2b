# Руководство по миграции с Windows на macOS

## 🔍 Что нужно исправить

### ✅ Что уже работает
- Python скрипты (используют `pathlib` и `platform.system()`)
- Node.js скрипты (используют `path.join()`)
- Bash скрипты (`.sh` файлы)
- HTML/CSS/JS код (кроссплатформенный)

### ❌ Что нужно исправить

1. **PowerShell скрипты (.ps1)** - не работают на macOS
2. **Batch файлы (.bat)** - не работают на macOS (но есть .sh версии)
3. **JSON файлы с Windows путями** - содержат `C:\runs\...`

---

## 📝 Пошаговая инструкция

### Шаг 1: Перегенерировать JSON файлы с путями

JSON файлы в `mgts-backend/scripts/extract-content/` содержат Windows пути. Их нужно перегенерировать:

```bash
cd mgts-backend/scripts/extract-content
node inventory.js
```

Это создаст новый `inventory.json` с правильными macOS путями.

### Шаг 2: Использовать bash скрипты вместо PowerShell

#### Запуск локального сервера
```bash
# Вместо START_SERVER.bat используйте:
cd SiteMGTS
./START_SERVER.sh

# Или напрямую:
python3 -m http.server 8000
```

#### Запуск Strapi
```bash
# Вместо start_strapi.ps1 используйте:
cd mgts-backend
npm run develop
```

### Шаг 3: Проверить переменные окружения

Если вы использовали переменные окружения в PowerShell, настройте их для macOS:

**Windows (PowerShell):**
```powershell
$env:SITE_ROOT="C:\runs\SiteMGTS"
```

**macOS (Bash/Zsh):**
```bash
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"
```

Добавьте в `~/.zshrc` или `~/.bash_profile`:
```bash
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"
```

### Шаг 4: Проверить Python скрипты

Python скрипты должны работать, но проверьте:

```bash
cd SiteMGTS
python3 copy_mts_fonts.py
python3 update_nav.py
```

Если используется `python` вместо `python3`, создайте алиас:
```bash
alias python=python3
```

---

## 🔧 Создание bash версий скриптов

### start_strapi.sh

Создайте файл `start_strapi.sh`:

```bash
#!/bin/bash
echo "Starting Strapi CMS..."
echo ""
cd mgts-backend
npm run develop
```

Сделайте исполняемым:
```bash
chmod +x start_strapi.sh
```

### check_environment.sh

Создайте файл `check_environment.sh`:

```bash
#!/bin/bash
echo "Checking environment..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
fi

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python: $(python3 --version)"
else
    echo "❌ Python3 not found"
fi

# Check Strapi
if [ -d "mgts-backend" ]; then
    echo "✅ mgts-backend directory exists"
    cd mgts-backend
    if [ -f "package.json" ]; then
        echo "✅ Strapi project found"
    fi
    cd ..
else
    echo "❌ mgts-backend directory not found"
fi
```

---

## 📋 Чек-лист миграции

- [ ] Перегенерировать `inventory.json` и `content-analysis.json`
- [ ] Настроить переменные окружения в `~/.zshrc`
- [ ] Проверить работу Python скриптов
- [ ] Проверить работу Node.js скриптов
- [ ] Запустить Strapi через `npm run develop`
- [ ] Запустить локальный сервер через `START_SERVER.sh`
- [ ] Убедиться, что все пути корректны

---

## 🚀 Быстрый старт на macOS

```bash
# 1. Перейти в корень проекта
cd /Users/andrey_efremov/Downloads/runs

# 2. Настроить переменные окружения (добавить в ~/.zshrc)
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"

# 3. Перегенерировать JSON файлы
cd mgts-backend/scripts/extract-content
node inventory.js
cd ../../..

# 4. Запустить Strapi (в одном терминале)
cd mgts-backend
npm run develop

# 5. Запустить локальный сервер для фронтенда (в другом терминале)
cd SiteMGTS
python3 -m http.server 8000
```

---

## ⚠️ Важные замечания

1. **PowerShell скрипты** можно игнорировать - они не нужны на macOS
2. **Batch файлы** можно игнорировать - используйте `.sh` версии
3. **Пути в JSON** будут автоматически правильными после регенерации
4. **Python скрипты** должны работать без изменений (они кросс-платформенные)

---

## 🔍 Проверка после миграции

```bash
# Проверить структуру проекта
ls -la SiteMGTS/
ls -la mgts-backend/

# Проверить пути в JSON
cat mgts-backend/scripts/extract-content/inventory.json | head -5

# Проверить работу скриптов
cd SiteMGTS
python3 --version
python3 copy_mts_fonts.py --help

# Проверить Strapi
cd ../mgts-backend
npm run develop
```

---

## 📞 Если что-то не работает

1. Проверьте права доступа: `chmod +x *.sh`
2. Проверьте пути: используйте абсолютные пути если относительные не работают
3. Проверьте версии: `node --version`, `python3 --version`
4. Проверьте переменные окружения: `echo $SITE_ROOT`



