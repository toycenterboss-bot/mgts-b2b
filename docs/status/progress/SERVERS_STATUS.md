# 🚀 Статус запущенных серверов

## ✅ Серверы запущены

### Strapi (бэкенд)
- **Порт:** 1337
- **Админ-панель:** http://localhost:1337/admin
- **API:** http://localhost:1337/api
- **PID:** 6070
- **Логи:** /tmp/strapi.log
- **Статус:** ⏳ Запускается (может занять 30-60 секунд)

### Локальный веб-сервер (фронтенд)
- **Порт:** 8000
- **Сайт:** http://localhost:8000
- **PID:** 6104
- **Логи:** /tmp/webserver.log
- **Статус:** ✅ Работает (HTTP 200)

---

## 📝 Управление серверами

### Остановить Strapi:
```bash
kill 6070
# Или
kill $(cat /tmp/strapi.pid)
```

### Остановить веб-сервер:
```bash
kill 6104
# Или
kill $(cat /tmp/webserver.pid)
```

### Остановить все:
```bash
kill 6070 6104 2>/dev/null
```

### Просмотр логов Strapi:
```bash
tail -f /tmp/strapi.log
```

### Просмотр логов веб-сервера:
```bash
tail -f /tmp/webserver.log
```

---

## 🔍 Проверка статуса

### Проверить Strapi:
```bash
curl http://localhost:1337/api
```

### Проверить веб-сервер:
```bash
curl http://localhost:8000
```

### Проверить процессы:
```bash
ps aux | grep -E "(strapi|http.server)" | grep -v grep
```

---

## 🌐 Открыть в браузере

### Strapi админ-панель:
```bash
open http://localhost:1337/admin
```

### Сайт:
```bash
open http://localhost:8000
```

---

## ⚠️ Важно

Strapi может занять 30-60 секунд для полного запуска. Если админ-панель не открывается сразу, подождите немного и обновите страницу.

---

**Дата запуска:** 27 декабря 2024
