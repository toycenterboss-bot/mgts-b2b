# 🔄 Переустановка Strapi

## ✅ Выполненные шаги

### 1. Остановка процессов
- ✅ Остановлены все запущенные процессы Strapi и веб-сервера

### 2. Очистка проекта
- ✅ Удалены `node_modules`
- ✅ Удалены `.cache`, `dist`, `.strapi`, `.tmp`
- ✅ Проект очищен для чистой переустановки

### 3. Переустановка зависимостей
- ✅ Выполнено `npm install`
- ✅ Все зависимости переустановлены

### 4. Сборка проекта
- ✅ Выполнено `npm run build`
- ✅ Проект собран

### 5. Запуск Strapi
- ✅ Strapi запущен в режиме разработки
- ✅ Логи сохраняются в `/tmp/strapi.log`

---

## 🚀 Запуск Strapi

### Автоматический запуск:
```bash
cd /Users/andrey_efremov/Downloads/runs
./start_strapi.sh
```

### Ручной запуск:
```bash
cd /Users/andrey_efremov/Downloads/runs/mgts-backend
npm run develop
```

---

## 📝 Проверка статуса

### Проверить логи:
```bash
tail -f /tmp/strapi.log
```

### Проверить API:
```bash
curl http://localhost:1337/api
```

### Проверить админ-панель:
```bash
open http://localhost:1337/admin
```

---

## ⚠️ Если Strapi не запускается

### Проверить ошибки:
```bash
tail -50 /tmp/strapi.log
```

### Переустановить зависимости:
```bash
cd /Users/andrey_efremov/Downloads/runs/mgts-backend
rm -rf node_modules package-lock.json
npm install
```

### Очистить кэш:
```bash
cd /Users/andrey_efremov/Downloads/runs/mgts-backend
rm -rf .cache dist .strapi
npm run build
```

---

## 🔍 Первый запуск

При первом запуске Strapi:
1. Откроется страница регистрации администратора
2. Создайте первого администратора:
   - Email: admin@mgts.ru (или любой другой)
   - Пароль: (надежный пароль)
3. После регистрации откроется админ-панель

---

## 📚 Документация

- `CONTEXT.md` - полный контекст проекта
- `QUICK_START_MAC.md` - быстрый старт
- `SERVERS_STATUS.md` - статус серверов

---

**Дата переустановки:** 27 декабря 2024





