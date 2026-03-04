# Статус миграции на macOS

## ✅ Выполнено

1. **Созданы bash скрипты:**
   - ✅ `start_strapi.sh` - запуск Strapi
   - ✅ `check_environment.sh` - проверка окружения
   - ✅ `setup_env.sh` - настройка переменных окружения
   - ✅ `SiteMGTS/START_SERVER.sh` - запуск локального сервера

2. **Проверены права доступа:**
   - ✅ Все `.sh` скрипты имеют права на выполнение

3. **Проверена структура проекта:**
   - ✅ Директория `SiteMGTS` существует
   - ✅ Директория `mgts-backend` существует
   - ✅ Зависимости Strapi установлены (`node_modules`)

4. **Создана документация:**
   - ✅ `MAC_MIGRATION_GUIDE.md` - подробное руководство
   - ✅ `QUICK_START_MAC.md` - быстрый старт
   - ✅ `SETUP_NODEJS.md` - инструкция по установке Node.js
   - ✅ Обновлен `CONTEXT.md` с информацией о macOS

## ⏳ Требует действий

### 1. Установить Node.js

Node.js **не установлен**. Это необходимо для работы Strapi.

**Инструкция:** См. `SETUP_NODEJS.md`

**Быстрая установка:**
```bash
# Через Homebrew (если установлен)
brew install node

# Или скачать с https://nodejs.org/
```

### 2. Перегенерировать JSON файлы

После установки Node.js нужно перегенерировать файлы с путями:

```bash
cd mgts-backend/scripts/extract-content
node inventory.js
cd ../../..
```

**Текущие файлы содержат Windows пути:**
- `inventory.json` - содержит `C:\runs\...`
- `content-analysis.json` - содержит `C:\runs\...`

### 3. Настроить переменные окружения (опционально)

Добавить в `~/.zshrc`:
```bash
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"
```

Затем:
```bash
source ~/.zshrc
```

Или использовать скрипт:
```bash
./setup_env.sh
```

## ✅ Что уже работает

1. **Python скрипты** - готовы к использованию
2. **Bash скрипты** - созданы и имеют права на выполнение
3. **Структура проекта** - корректна
4. **Зависимости Strapi** - установлены

## 🚀 После установки Node.js

1. Проверьте окружение:
   ```bash
   ./check_environment.sh
   ```

2. Перегенерируйте JSON файлы:
   ```bash
   cd mgts-backend/scripts/extract-content
   node inventory.js
   cd ../../..
   ```

3. Запустите Strapi:
   ```bash
   ./start_strapi.sh
   ```

4. Запустите локальный сервер:
   ```bash
   cd SiteMGTS
   ./START_SERVER.sh
   ```

## 📝 Итоговый чек-лист

- [x] Созданы bash скрипты
- [x] Проверены права доступа
- [x] Проверена структура проекта
- [x] Создана документация
- [ ] **Установить Node.js** ← Требуется действие
- [ ] Перегенерировать JSON файлы (после установки Node.js)
- [ ] Настроить переменные окружения (опционально)

## 📚 Документация

- `QUICK_START_MAC.md` - быстрый старт
- `MAC_MIGRATION_GUIDE.md` - подробное руководство
- `SETUP_NODEJS.md` - установка Node.js
- `CONTEXT.md` - полный контекст проекта





