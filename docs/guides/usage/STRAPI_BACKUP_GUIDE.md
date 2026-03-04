# Руководство по работе с бэкапами Strapi

## Создание бэкапа

Для создания бэкапа всех страниц из Strapi выполните:

```bash
cd /Users/andrey_efremov/Downloads/runs
node mgts-backend/scripts/backup-strapi-pages.js
```

Бэкап будет сохранен в директории `strapi-backups/{timestamp}/`, где `{timestamp}` - дата и время создания бэкапа.

### Структура бэкапа

Каждый бэкап содержит:

- `index.json` - индексный файл со списком всех страниц и метаданными
- `README.md` - описание бэкапа и инструкции
- `{slug}.json` - полные данные страницы в JSON формате
- `{slug}.html` - HTML контент страницы (для удобства просмотра)

### Пример структуры

```
strapi-backups/
└── 2026-01-07_19-29-07/
    ├── index.json
    ├── README.md
    ├── main_page.json
    ├── main_page.html
    ├── business_telephony.json
    ├── business_telephony.html
    └── ...
```

## Восстановление из бэкапа

### Просмотр списка бэкапов

```bash
node mgts-backend/scripts/restore-from-backup.js
```

### Восстановление всех страниц из последнего бэкапа

```bash
node mgts-backend/scripts/restore-from-backup.js latest
```

### Восстановление всех страниц из конкретного бэкапа

```bash
node mgts-backend/scripts/restore-from-backup.js 2026-01-07_19-29-07
```

### Восстановление одной страницы

```bash
node mgts-backend/scripts/restore-from-backup.js latest business/telephony
```

или

```bash
node mgts-backend/scripts/restore-from-backup.js 2026-01-07_19-29-07 business/telephony
```

## Важные замечания

1. **Перед восстановлением** убедитесь, что Strapi запущен и доступен на `http://localhost:1337`
2. **Восстановление перезаписывает** текущий контент страниц в Strapi
3. **Рекомендуется** создать новый бэкап перед восстановлением старого
4. **Бэкапы хранятся** в директории `strapi-backups/` - не удаляйте их без необходимости

## Автоматизация

### Создание бэкапа перед изменениями

Перед началом работы с доработкой HTML рекомендуется создать бэкап:

```bash
node mgts-backend/scripts/backup-strapi-pages.js
```

### Восстановление при ошибках

Если что-то пошло не так при доработке HTML, можно быстро восстановить:

```bash
# Восстановить все страницы из последнего бэкапа
node mgts-backend/scripts/restore-from-backup.js latest

# Или восстановить только проблемную страницу
node mgts-backend/scripts/restore-from-backup.js latest business/telephony
```

## Проверка бэкапа

Для проверки содержимого бэкапа:

```bash
# Посмотреть список страниц в бэкапе
cat strapi-backups/2026-01-07_19-29-07/index.json | jq '.pages[] | {slug, title, hasContent}'

# Посмотреть HTML контент конкретной страницы
cat strapi-backups/2026-01-07_19-29-07/business_telephony.html
```

## Текущий бэкап

Последний созданный бэкап: `2026-01-07_19-29-07`

Всего страниц в бэкапе: 42
Страниц с контентом: 42


