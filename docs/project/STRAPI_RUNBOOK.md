# Strapi runbook (что уже работало в проекте)

Цель: собрать “проверенные подходы” работы со Strapi (API / entityService / бэкапы / массовые правки), чтобы их переиспользовать для новой схемы (`CMS_TARGET_SCHEMA.md`).

## 1) Главное правило безопасности
- **Не хранить токены/пароли в репозитории** (ни в docs, ни в scripts).
- Для внешних скриптов используем:
  - `STRAPI_URL` (обычно `http://localhost:1337`)
  - `STRAPI_API_TOKEN` (создаётся в Strapi Admin → Settings → API Tokens)

## 2) Два способа работы со Strapi

### 2.1 HTTP API (axios, внешний доступ)
**Когда подходит**: простые операции, проверка/диагностика, небольшой объём данных.

**Где смотреть примеры**:
- `docs/STRAPI_API_GUIDE.md`
- `docs/guides/usage/STRAPI_UPDATE_PAGES_GUIDE.md`
- `mgts-backend/scripts/backup-strapi-pages.js`

**Плюсы**:
- быстро стартовать

**Минусы**:
- ограничения по размеру payload (зависит от конфигов)
- медленнее на больших объёмах
- нужен API token

### 2.2 EntityService (внутренний API) — рекомендовано для миграций ⭐
**Когда подходит**: импорт/миграция/массовые правки, большие payload, сложная логика.

**Где смотреть примеры**:
- `docs/STRAPI_API_GUIDE.md` (раздел EntityService)
- `mgts-backend/scripts/migration/import-content-strapi.js` (пример импорта внутри Strapi)

**Плюсы**:
- не нужен API token
- быстрее и стабильнее для миграций

## 3) Бэкап/восстановление страниц (проверено)

### 3.1 Бэкап
- Скрипт: `mgts-backend/scripts/backup-strapi-pages.js`
- Отчёт: `docs/BACKUP_STRAPI_PAGES.md`

### 3.2 Восстановление
- Скрипт: `mgts-backend/scripts/restore-strapi-pages.js`

## 4) Массовые правки контента (классы/URL/нормализация)
В проекте уже есть серия “maintenance” скриптов для точечных массовых исправлений, например:
- `mgts-backend/scripts/update-classes-in-strapi.js`
- `mgts-backend/scripts/update-image-urls-in-content.js`
- `mgts-backend/scripts/update-pages-with-normalized-content.js`

## 5) Пагинация (как было и как должно быть)
Скрипты уже используют стандартный контракт Strapi:
- запросы: `pagination[page]`, `pagination[pageSize]`
- ответ: `meta.pagination.page/pageSize/pageCount/total`

Это согласуется с нашим текущим контрактом UI ↔ CMS:
- см. `docs/project/CMS_INTEGRATION_CONTRACT.md` (раздел Pagination contract)

## 6) Как использовать это для новой схемы (Stitch-first)
Дальше мы переиспользуем “проверенные” вещи так:
- **seed**: navigation/footer + 2–3 страницы (через entityService)
- **import pipeline**: из `PAGE_CONTENT_MAPPING.md` + `page-analysis-llm` → поля `page.sections` (dynamic zone)
- **maintenance scripts**: для правок после миграции (например, массово поправить ссылки/классы)

## 7) “Обнулить Strapi и начать заново”, не удаляя файлы (uploads)

Важно: в текущей конфигурации Strapi по умолчанию использует **SQLite файл**:
- `mgts-backend/.tmp/data.db` (см. `mgts-backend/config/database.ts`)

При этом загруженные файлы лежат в:
- `mgts-backend/public/uploads/`

### 7.1 Полный reset для локальной разработки (SQLite)
**Цель**: удалить все страницы/контент/таблицы и начать с чистой базы, при этом **сохранить `public/uploads`**.

Шаги:
- Остановить Strapi
- (опционально) сделать бэкап страниц: `mgts-backend/scripts/backup-strapi-pages.js`
- Убедиться, что `mgts-backend/public/uploads/` остаётся на месте
- Удалить DB файл: `mgts-backend/.tmp/data.db`
- Запустить Strapi заново (он создаст DB/таблицы заново)

### 7.2 Мягкий reset: удалить только страницы через API
Если нужно оставить схему/таблицы, но удалить контент:
- Скрипт: `mgts-backend/scripts/delete-all-strapi-pages.js`
- Для non-interactive режима:
  - `node mgts-backend/scripts/delete-all-strapi-pages.js --yes`
  - или `STRAPI_DELETE_ALL_PAGES_YES=1`

## 8) Dev-скрипты запуска/остановки (Strapi + статический сервер) ✅

Проблема, которая уже встречалась в проекте: Strapi в режиме `develop` может выглядеть “зависшим” (после `Strapi started successfully` просто нет новых логов), а остановка через “Stop execution” в IDE убивает процесс.

### 8.1 Быстрый старт всего окружения

Из корня репозитория:

```bash
./scripts/dev/start_all.sh
```

Что делает:
- поднимает Strapi (`mgts-backend`) на `:1337`
- поднимает статический сервер для `design/` на `:8002`
- пишет логи и PID-файлы в `.dev/` (в корне репозитория)

Полезные URL:
- Admin: `http://localhost:1337/admin`
- HTML: `http://localhost:8002/html_pages/`

Логи:
- `.dev/strapi.log`
- `.dev/static.log`

### 8.2 Остановка всего окружения

```bash
./scripts/dev/stop_all.sh
```

### 8.3 Переопределение портов (если занято)

```bash
STATIC_PORT=8003 STRAPI_PORT=1338 ./scripts/dev/start_all.sh
```

### 8.4 Если “Strapi часто падает”

Смотреть первым делом `.dev/strapi.log`.

Типовой источник проблем в этом репозитории: попадание “посторонних” TS/monorepo исходников в компиляцию (например, `mgts-backend/temp/**`).
Решение: держать `mgts-backend/tsconfig.json` с узким `include` и явным `exclude` для `temp/**`.

## 9) Media Library: структура папок (договорённость для проекта)

Цель: чтобы файлы в Strapi Media Library были **предсказуемо разложены** и мы могли:
- быстро понять “какой документ относится к какой странице”
- переиспользовать общий медиа-контент (иконки/баннеры/фото) без дублей
- проще готовить миграции/бэкапы/чистки

### 9.1 Принцип
- **Документы** складываем “по месту использования” (обычно по slug страницы).
- **Shared** медиа (которое используется в нескольких местах) складываем отдельно.

### 9.2 Рекомендуемая структура папок

- **Documents (страничные)**:
  - `Documents/<page-slug>/...`
  - пример: `Documents/documents/`, `Documents/corporate_documents/`, `Documents/data_processing/`

- **Images (страничные)**:
  - `Images/<page-slug>/...`
  - пример: `Images/about_mgts/`, `Images/business/access_internet/`

- **Shared (переиспользуемые)**:
  - `Shared/Images/...`
  - `Shared/Icons/...`
  - `Shared/Logos/...`
  - `Shared/Media/...` (видео/файлы, которые используются на разных страницах)

### 9.3 Документы и категории (UI табы)

Для `TPL_Doc_Page` мы используем связку:
- `page.document-tabs.tabs[*].filterKey` — ключ категории (пусто = “Все”)
- `page.files-table.files[*].categoryKey` — ключ категории документа (пусто = “Все”)

Это позволяет строить переключатели “Категории” **не руками в HTML**, а из Strapi.
