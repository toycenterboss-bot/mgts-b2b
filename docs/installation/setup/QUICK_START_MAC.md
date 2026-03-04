# 🚀 Быстрый старт на macOS

## Первоначальная настройка

### 1. Проверка окружения

```bash
./check_environment.sh
```

Этот скрипт проверит:
- ✅ Node.js и npm
- ✅ Python 3
- ✅ Наличие директорий проекта
- ✅ Установленные зависимости

### 2. Установка зависимостей (если нужно)

```bash
cd mgts-backend
npm install
cd ..
```

### 3. Настройка переменных окружения (опционально)

Добавьте в `~/.zshrc`:
```bash
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"
```

Затем:
```bash
source ~/.zshrc
```

### 4. Перегенерировать JSON файлы с путями

Если вы видите Windows пути (`C:\runs\...`) в JSON файлах:

```bash
cd mgts-backend/scripts/extract-content
node inventory.js
cd ../../..
```

---

## 🎯 Ежедневная работа

### Запуск проекта

**Терминал 1 - Strapi (бэкенд):**
```bash
./start_strapi.sh
```

Откроется админ-панель: http://localhost:1337/admin

**Терминал 2 - Локальный сервер (фронтенд):**
```bash
cd SiteMGTS
./START_SERVER.sh
```

Откроется сайт: http://localhost:8000

---

## 📝 Полезные команды

### Python скрипты
```bash
cd SiteMGTS

# Копирование шрифтов МТС
python3 copy_mts_fonts.py

# Обновление навигации
python3 update_nav.py

# Сбор структуры сайта
python3 site_structure_builder.py
```

### Strapi команды
```bash
cd mgts-backend

# Разработка
npm run develop

# Сборка
npm run build

# Продакшен
npm run start

# Проверка компонентов
node scripts/check-components.js
```

---

## ⚠️ Важные замечания

1. **PowerShell скрипты (.ps1)** - не работают на macOS, используйте `.sh` версии
2. **Batch файлы (.bat)** - не работают на macOS, используйте `.sh` версии
3. **Python** - используйте `python3` вместо `python`
4. **Пути** - все пути должны использовать `/` вместо `\`

---

## 🔍 Решение проблем

### Node.js не найден
```bash
# Установить через Homebrew
brew install node

# Или скачать с https://nodejs.org/
```

### Python не найден
```bash
# Установить через Homebrew
brew install python3
```

### Права доступа на скрипты
```bash
chmod +x *.sh
```

### Strapi не запускается
```bash
cd mgts-backend
rm -rf .cache dist
npm install
npm run develop
```

---

## 📚 Дополнительная документация

- `MAC_MIGRATION_GUIDE.md` - Подробное руководство по миграции
- `CONTEXT.md` - Полный контекст проекта





