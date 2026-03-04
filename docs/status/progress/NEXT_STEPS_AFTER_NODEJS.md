# Следующие шаги после установки Node.js

## ✅ После установки Node.js выполните:

### Шаг 1: Проверить установку

Откройте **новый терминал** и выполните:

```bash
cd /Users/andrey_efremov/Downloads/runs

# Проверить версии
node --version
npm --version

# Проверить окружение проекта
./check_environment.sh
```

**Ожидаемый результат:**
- ✅ Node.js: v20.x.x или выше
- ✅ npm: 9.x.x или выше
- ✅ Все проверки окружения пройдены

---

### Шаг 2: Перегенерировать JSON файлы

JSON файлы содержат Windows пути (`C:\runs\...`). Их нужно обновить:

```bash
cd mgts-backend/scripts/extract-content
node inventory.js
cd ../../..
```

Это создаст новые файлы с правильными macOS путями.

**Проверка:**
```bash
# Посмотреть первые строки обновленного файла
head -5 mgts-backend/scripts/extract-content/inventory.json
```

Должны быть пути вида `/Users/andrey_efremov/Downloads/runs/...` вместо `C:\runs\...`

---

### Шаг 3: Настроить переменные окружения (опционально)

Для постоянной настройки добавьте в `~/.zshrc`:

```bash
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"
```

Затем:
```bash
source ~/.zshrc
```

Или используйте скрипт:
```bash
./setup_env.sh
```

---

### Шаг 4: Запустить Strapi

```bash
./start_strapi.sh
```

Откроется админ-панель: http://localhost:1337/admin

**Примечание:** Первый запуск может занять некоторое время.

---

### Шаг 5: Запустить локальный сервер для фронтенда

В **другом терминале**:

```bash
cd SiteMGTS
./START_SERVER.sh
```

Откроется сайт: http://localhost:8000

---

## 🔍 Проверка работоспособности

### Проверить Strapi API:

```bash
# В новом терминале
curl http://localhost:1337/api
```

Должен вернуть JSON с информацией об API.

### Проверить фронтенд:

Откройте в браузере: http://localhost:8000

Должна загрузиться главная страница сайта.

---

## ⚠️ Если что-то не работает

### Node.js не найден после установки:

1. Перезапустите терминал
2. Проверьте PATH: `echo $PATH`
3. Проверьте установку: `which node`

### Ошибки при запуске Strapi:

```bash
cd mgts-backend
rm -rf .cache dist
npm install
npm run develop
```

### Ошибки в JSON файлах:

Убедитесь, что перегенерировали файлы:
```bash
cd mgts-backend/scripts/extract-content
node inventory.js
```

---

## 📋 Итоговый чек-лист

- [ ] Node.js установлен и проверен
- [ ] npm установлен и проверен
- [ ] JSON файлы перегенерированы
- [ ] Переменные окружения настроены (опционально)
- [ ] Strapi запускается без ошибок
- [ ] Локальный сервер запускается
- [ ] Сайт открывается в браузере

---

## 📚 Полезные команды

```bash
# Проверить окружение
./check_environment.sh

# Запустить Strapi
./start_strapi.sh

# Запустить локальный сервер
cd SiteMGTS && ./START_SERVER.sh

# Проверить версии
node --version
npm --version
```

---

**После выполнения всех шагов проект готов к работе! 🚀**





