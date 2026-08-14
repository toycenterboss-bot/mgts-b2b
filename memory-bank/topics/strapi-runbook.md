# Runbook: операционка Strapi и локального окружения

Выжимка из `docs/project/STRAPI_RUNBOOK.md` + проверка по коду 2026-08-14.

## Запуск

```bash
./scripts/dev/start_all.sh        # статика design/ :8002 + Strapi :1337; pid и логи в .dev/
./scripts/dev/stop_all.sh         # гасит по pid-файлам и по портам
cd mgts-frontend && npm run dev   # Next :3000
```

Порты: Strapi **1337**, Next **3000**, статика design **8002**.
⚠️ В старых документах фигурируют `:8000` и `:8001` — это мёртвые адреса поколения A.
Логи: `.dev/strapi.log` (актуально), `/tmp/strapi.log` — старое, не искать там.

`start_all.sh`/`stop_all.sh` зависят от **`lsof`** — на Windows и в минимальных
Linux-образах его нет.

Альтернативный статик-сервер: `design/dev_server.py` на **:8080** — дублирует
`scripts/dev/static_server.py` (:8002) с другим набором правил роутинга. Две реализации
одного; для visual-compare нужен именно **:8002**.

## HTTP API vs EntityService

| | HTTP (axios) | EntityService |
|---|---|---|
| Токен | нужен `STRAPI_API_TOKEN` | не нужен |
| Скорость | медленно, лимит payload | быстрее |
| Когда | диагностика, мелкие операции | ⭐ **миграции и массовые операции** |

Эталон entityService-скрипта: `mgts-backend/scripts/migration/import-content-strapi.js`,
обёртка — `run-*.js` (поднимает `createStrapi(...).load()`).

## Ограничение Dynamic Zone в Strapi v5

`populate[sections]=*` **невозможен** — DZ требует `on`-фрагменты. Обходы:
- server-side ручной populate — `src/api/page/controllers/page.ts:1011-1160` (`findBySlug`);
- спец-эндпоинт `/api/pages/sections-stats` для аналитики.

Не пытаться «просто добавить populate=*» — это тупик, уже проверенный.

## Reset dev-базы, не теряя медиа

```bash
./scripts/dev/stop_all.sh
node mgts-backend/scripts/backup-strapi-pages.js     # бэкап страниц
rm mgts-backend/.tmp/data.db                          # ⚠️ см. предупреждение ниже
./scripts/dev/start_all.sh
```

`mgts-backend/public/uploads/` остаётся нетронутым.

⚠️ **Путь к БД неочевиден.** `config/database.ts:45-50` собирает
`path.join(__dirname, '..', '..', DATABASE_FILENAME)`, где `__dirname` = `mgts-backend/config`.
То есть дефолт указывает **над** `mgts-backend`, а не внутрь него. Перед `rm` —
`find . -name "*.db"`, а не вера в путь из документации.

**Мягкий reset:** `node mgts-backend/scripts/delete-all-strapi-pages.js --yes`
(или `STRAPI_DELETE_ALL_PAGES_YES=1`).

## Договорённость по Media Library

```
Documents/<page-slug>/…
Images/<page-slug>/…
Shared/{Images,Icons,Logos,Media}/…
```

## «Strapi часто падает» — типовая причина в этом репозитории

Смотреть `.dev/strapi.log`. Частая причина — попадание посторонних TS-исходников из
`mgts-backend/temp/**` в компиляцию. Лечение: узкий `include` + явный `exclude` в
`mgts-backend/tsconfig.json`.

Вторая известная причина — крах sqlite/knex/tarn при `app.destroy()`; в
`scripts/migration/run-import-pages-v2.js:50-61` от `destroy()` намеренно отказались
(включается флагом `MGTS_STRAPI_DESTROY=1`).

## Переменные окружения

`mgts-backend/.env.example` содержит: `HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`,
`ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`.

🔴 **В нём нет половины реально используемых переменных:** ни одной `DATABASE_*`,
ни `STRAPI_ADMIN_EMAIL`/`STRAPI_ADMIN_PASSWORD` (читаются в `src/index.ts:24-54`),
ни `STRAPI_API_TOKEN`, ни `STRAPI_URL`, ни `PERPLEXITY_API_KEY`,
ни `MGTS_DISABLE_PAGE_LIFECYCLES`, `MGTS_BOOTSTRAP_IMPORT`, `MGTS_BOOTSTRAP_MAINTENANCE`,
`MGTS_PAGE_ANALYSIS_DIR`, `MGTS_STRAPI_DESTROY`, `MGTS_INCLUDE_CMS_ADAPTER`.
Задача — B-03.

⛔ **Секреты в мемори-банк не пишем.** Только плейсхолдеры `${STRAPI_API_TOKEN}`.
Значения — в `memory-bank/secrets.local.md`, который в `.gitignore`.

## Флаги, которые меняют поведение бэкенда

| Переменная | Что делает | Где |
|---|---|---|
| `MGTS_DISABLE_PAGE_LIFECYCLES=1` | отключает пересборку Navigation/Footer при правке страниц | `lifecycles.ts:11,25,36` |
| `MGTS_BOOTSTRAP_IMPORT=1` | включает legacy-импорт при старте | `src/index.ts:58-162` |
| `MGTS_BOOTSTRAP_MAINTENANCE=1` | включает legacy-«maintenance» | `src/index.ts:164-221` |
| `MGTS_PAGE_ANALYSIS_DIR` | переопределяет источник spec-файлов | `import-pages-v2.js:17-31` |
| `MGTS_STRAPI_DESTROY=1` | возвращает `app.destroy()` в обёртках миграции | `run-import-pages-v2.js:50-61` |

## Права доступа — частая причина «изменения в CMS не видны»

Класс проблем, повторявшийся многократно (см. К-06 в каталоге):
1. запись не опубликована в Strapi (Draft & Publish);
2. не открыты Public-права: Settings → Users & Permissions → Roles → Public → `find`/`findOne`;
3. кэш ISR (300 с для страниц, 120 с для новостей) — теги не инвалидируются, ждать таймер;
4. кэш браузера.

Проверять сверху вниз, начиная с прямого `curl` к Strapi — это отделяет CMS от фронта
за один шаг.
