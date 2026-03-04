# 🚀 Быстрый старт для редакторов

## 📋 Первые шаги

### 1. Войти в админ-панель

Откройте: http://localhost:1337/admin

### 2. Создать первую страницу

1. **Content Manager** → **Pages** → **Create new entry**

2. **Заполните:**
   - **Slug:** `test-page`
   - **Title:** `Тестовая страница`
   - **Meta Description:** `Описание тестовой страницы`
   - **Content:** `<p>Это тестовая страница</p>`

3. **Save** → **Publish**

### 3. Проверить результат

Откройте в браузере:
```
http://localhost:8001/page-template.html?slug=test-page
```

Или через API:
```bash
curl http://localhost:1337/api/pages/slug/test-page
```

---

## 📝 Основные операции

### Создать страницу
1. Content Manager → Pages → Create new entry
2. Заполните поля
3. Save → Publish

### Редактировать страницу
1. Content Manager → Pages
2. Найдите страницу
3. Нажмите на неё
4. Внесите изменения
5. Save → Publish

### Загрузить изображение
1. Media Library → Add new assets
2. Выберите файл
3. Дождитесь загрузки

---

## ⚠️ Важно

- **Slug** должен быть уникальным
- **Title** обязателен
- Страница должна быть **Published** чтобы отображаться на сайте
- Используйте только латиницу в slug

---

**Подробное руководство:** `EDITOR_GUIDE.md`





