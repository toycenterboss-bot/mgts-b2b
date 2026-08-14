# Безопасность и гигиена репозитория

Замер 2026-08-14. Значения секретов здесь **не приводятся** — только пути и типы.

## 🔴 Секреты, лежащие в git-истории

| Файл : строка | Тип | Отслеживается git |
|---|---|---|
| `docs/project/CONTEXT.md:17` | Perplexity API key (`pplx-…`) | да |
| `docs/project/CONTEXT.md:22` | тот же ключ в `export PERPLEXITY_API_KEY="…"` | да |
| `docs/project/CONTEXT.md` | логин и пароль локального Penpot | да |
| `docs/project/CHAT_LOG_2026_02_09_Cards_Issue.md:166225` | Strapi API token (полный hex) | да |
| `docs/project/CHAT_LOG_2026_02_09_Cards_Issue.md:166235,166236,166245,166246` | тот же токен, ещё 4 вхождения | да |
| `docs/project/CHAT_LOG_2026_02_09_Cards_Issue.md:19144` | пользователь диктует ключ в переписке | да |

**Ключ не просто лежит — он читается кодом.**
`mgts-backend/scripts/analyze-infoformen-accordion.js:146-156` парсит `pplx-[A-Za-z0-9]+`
из `CONTEXT.md`, если нет env. Поэтому порядок действий обязателен:
**сначала перевести скрипты на env → потом отзывать ключи → потом чистить историю.**
Иначе сломается пайплайн анализа.

**Противоречие, которое всё это объясняет:** `docs/project/STRAPI_RUNBOOK.md` §1 гласит
«не хранить токены/пароли в репозитории (ни в docs, ни в scripts)». Правило написано,
лежит в **той же папке**, что и нарушающий файл, и ни разу не применено.
Ровно случай из §0 методологии: правило без того, кто его проверяет, не исполняется.
Аналогично `scripts/mapping/perplexity_crosscheck.py:9` — докстринг «Keys must NOT be
stored in the repository. Use env only» при реализации, читающей ключ из репозитория.

## 🔴 Куки браузера в репозитории

455 файлов профиля Chrome закоммичены:
`mgts-backend/temp/page-analysis-llm/infoformen_chrome_profile/Default/` и
`.../infoformen_chrome_home/profile/Default/` — включая `Cookies`, `Cookies-journal`,
`Login Data`, `Web Data`, `Local State`, `Secure Preferences`, `Session Storage/*`,
`Sessions/Session_*`, `Trust Tokens`, `History` (163 КБ).

Проверено (только счётчики, содержимое не извлекалось): в обоих `Cookies` по **19 записей**,
хосты `.mgts.ru`, `.mts.ru`, `.yandex.ru`, `mc.yandex.ru`. В `Login Data` — **0 записей**,
паролей нет. Куки mgts.ru/mts.ru — потенциально сессионные.

## ✅ Что чисто

- В `mgts-backend/src/`, `config/`, `database/`, `types/` — **ни одного** захардкоженного
  токена/пароля/ключа. Регулярки на `pplx-`, `sk-`, JWT (`eyJ…`), hex ≥40,
  `token|secret|password = "…"` дали 0 совпадений.
- `config/admin.ts` и `config/server.ts` берут всё из env, без fallback-значений.
- Во фронте (`mgts-frontend/src`) токенов авторизации нет вообще — запросы к Strapi анонимные.
- Cloudinary: только имена переменных в `scripts/migration/upload-images.js:11-24`.
- `.env` файлов на диске нет, только `.env.example` с плейсхолдерами.

## 🔴 Публичные пишущие эндпоинты

`mgts-backend/src/api/page/routes/custom-page.ts` — **все 11 маршрутов с `auth: false`**:

| Строки | Маршрут |
|---|---|
| `:50-58` | **`DELETE /api/pages/delete-all`** — удаление всех страниц без авторизации |
| `:59-68` | `POST /api/pages/update-parent-relations` |
| `:93-101` | `POST /api/pages/seed-service-sections` |
| `:106-114` | `POST /api/pages/seed-doc-sections` |
| `:119-127` | `POST /api/pages/seed-contact-hub` |
| `:132-140` | `POST /api/pages/seed-segment-landing` |

Остальные — GET. Прочие роутеры (`custom-news.ts`, `custom-product.ts`,
`custom-navigation.ts`) и базовые тоже `auth: false`, но только на чтение.

Плюс `config/middlewares.ts`: `frameguard: false` (`:8`), CORS `origin` включает `'null'`
(`:50`, разрешает `file://`) при `credentials: true` (`:53`), CSP `frame-ancestors`
со списком localhost-портов (`:12-26`). Помечено «Dev-only», но это боевой конфиг репозитория.

## Размер репозитория

| Что | Размер | Файлов |
|---|---|---|
| `mgts-backend/public/uploads/` | 1.2 ГБ | 1907 (png 846, **pdf 669**, svg 193, docx 93, xlsx 24…) |
| `mgts-backend/public/uploads.pre-restore-20260304-183020/` | 1.2 ГБ | 1857 — **полная резервная копия медиатеки** |
| `mgts-backend/temp/` | 546 МБ | 1250 в git (`infoformen-files-downloads` 308 МБ, `corporate-documents` 97 МБ, `operinfo` 49 МБ…) |
| `docs/` | 288 МБ | из них 3 чат-лога ≈ 19.7 МБ текста |
| `.git` | **1.2 ГБ** | |

Git LFS настроен ровно на один паттерн: `.gitattributes:1` —
`mgts-backend/temp/wca-files-downloads/*.pdf`. Остальные ~1.3 тыс. PDF — обычные blob-ы.

**Противоречие:** `mgts-backend/public/README.md:3` — «медиатеку Strapi (`uploads/`)
в репозиторий не коммитим», при этом коммиты `541cfc4` и `932e20e` её добавили,
сняв правило из `.gitignore`. Документ и действие разошлись, победило действие.

## Абсолютные пути `/Users/andrey_efremov/` — 72 вхождения

**Ломают исполнение (не просто данные):**

| Файл : строка | Что |
|---|---|
| `mgts-backend/src/api/page/controllers/page.ts:53,206,343` | **боевой контроллер** |
| `scripts/penpot/audit_form_fields.py:7-8` | без env-фолбэка, запустится только на машине автора |
| `scripts/setup/setup_env.sh:9,19,25` | `export SITE_ROOT=…` |
| `scripts/setup/penpot_local.sh:4`, `penpot_dev.sh:4` | |
| `scripts/utils/clean-html-from-rtf.js:193-194` | |
| `mgts-backend/scripts/apply-svgviewer-icons.py:96,454-479` | читает `.env` по абсолютному пути |
| `mgts-backend/scripts/monitor-*.sh:6` | |
| `SiteMGTS/js/components-loader.js` | в клиентском JS |

Плюс данные: `design/icon_svgviewer_selected_nav*.json` — сотни `selectedPath` с абсолютным
путём; и документация (`docs/project/CONTEXT.md`, `PAGE_CONTENT_MAPPING.md`, …).

**Контраст, который стоит держать в голове:** «правильные» скрипты
(`generate_mgts_mappings.py`, `build_html_pages.py`, `create_snapshot.py`,
`import-pages-v2.js`, `start_all.sh`) вычисляют корень через
`Path(__file__).resolve().parents[2]` / `dirname $BASH_SOURCE`. В проекте сосуществуют
**две культуры кода**, и по этому признаку легко отличить надёжный скрипт от одноразового.

## Кросс-платформенность

`scripts/setup/` наполовину PowerShell (10 `.ps1`), наполовину bash (8 `.sh`).
`utils/copy_mts_fonts` существует в **трёх** версиях: `.py`, `.ps1`, `.bat`.
`start_all.sh`/`stop_all.sh` зависят от `lsof`.

⚠️ `docs/guides/development/CROSS_PLATFORM_FINAL_REPORT.md` заявляет «10/10,
12/12 чек-листов пройдено» — это **самооценка по чек-листу без единого фактического
прогона на трёх ОС**. Предыдущий документ давал 6.5/10, следующий («DEEP_CHECK») —
четвёртую проверку того же. Рекомендация «удалить `.bat`/`.ps1`» не выполнена: файлы
на месте. Не доверять итоговым оценкам из этих документов.

## Что делать — порядок

Всё это оформлено задачами B-01, B-02, B-08, B-12 в `backlog.md`. Ключевой инвариант,
который стоит держать при внедрении любой из них:

🔒 **Мера не считается внедрённой, пока проверка не поймала искусственный инцидент.**
Установил gitleaks-хук — подсади фальшивый `pplx-`-ключ и убедись, что коммит упал.
Закрыл `delete-all` — дёрни `curl -X DELETE` и убедись, что 401, а не 200.
