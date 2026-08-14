# Схема Strapi: типы, компоненты, Dynamic Zone

Замер по коду 2026-08-14. `mgts-backend/`, Strapi 5.36.

## Content-types — 8 штук

| Тип | Kind | D&P | Назначение |
|---|---|---|---|
| `page` | collection | ✅ | Страница сайта — ядро CMS |
| `news` | collection | ✅ | Новости |
| `news-category` | collection | ❌ | Категория новостей |
| `news-tag` | collection | ❌ | Тег новостей |
| `product` | collection | ✅ | Товары/услуги (по плану заменяется на `service`, не заменён) |
| `product-category` | collection | ❌ | Категория товаров |
| `navigation` | **single** | ❌ | Главное меню |
| `footer` | **single** | ❌ | Подвал |

Пути: `mgts-backend/src/api/<тип>/content-types/<тип>/schema.json`.

## 🔴 `api::icon.icon` — тип, которого нет в репозитории

Используется в четырёх местах:
- `src/plugins/icon-picker/server/src/controllers/icon-picker.js:10`
- `types/generated/contentTypes.d.ts:1376` (интерфейс с `name`, `label`, `preview`, стр. 483-494)
- `src/api/page/controllers/page.ts:1047-1051, 1060-1064, 1112-1116` (populate иконок)
- `scripts/migration/import-icons-from-media-local.js:56,89,113`

Каталога `src/api/icon/` **не существует**. Тип создавался через admin UI и жил только
в БД разработчика. Следствия: плагин icon-picker падает при вызове `/icon-picker/list`;
восстановить тип из репозитория невозможно. См. B-03.

## `page` — самый нагруженный тип (179 строк)

`src/api/page/content-types/page/schema.json`:

- `template` — enum из **15** шаблонов (`:15-35`): `TPL_Home`, `TPL_Segment_Landing`,
  `TPL_Service`, `TPL_Scenario`, `TPL_DeepNav`, `TPL_CMS_Page`, `TPL_Doc_Page`,
  `TPL_Contact_Hub`, `TPL_News_List`, `TPL_News_Detail`, `TPL_News_Archive`,
  `TPL_Search_Results`, `TPL_Form_Page`, `TPL_AI_Chat`, `TPL_Career_List`.
- `slug` (required + unique, `:36-40`), `title` (`:41-44`).
- Флаги рендера: `showBreadcrumbs` (`:45`), `showNewsBlock` (`:50`), `deepNavKey` (`:55`),
  `ctaKey` (`:59`).
- `hero` — компонент `page.hero` (`:63-69`).
- **`sections` — Dynamic Zone из 29 компонентов** (`:70-104`).
- Иерархия: `parent` manyToOne → `api::page.page` (`:136-141`), `children` oneToMany
  mappedBy `parent` (`:142-148`), `order` (`:149`).
- **Легаси-поля рядом с новой моделью** (важно — двойная модель одного и того же):
  `heroTitle` (`:111`), `heroSubtitle` (`:114`), `heroBackgroundImage` (`:117`),
  `content: richtext` (`:122`), `breadcrumbs: json` (`:125`), `sidebar: enum` (`:128`).
  Фронт умеет собирать hero из обоих источников — `mgts-frontend/src/lib/fallbacks.ts`.
- Миграционные: `section` enum из 9 разделов (`:154-168`), `originalUrl` (`:169`),
  `isMenuVisible` (`:173`).

## Компоненты — 72 рабочих

`mgts-backend/src/components/<группа>/<имя>.json` (**плоский** формат — только он грузится):

| Группа | Кол-во | Что |
|---|---|---|
| `page/` | **59** | Секции страниц + вложенные элементы |
| `navigation/` | 8 | `menu-item`, `menu-link`, `mega-menu`, `mega-menu-section`, `mega-menu-cta`, `deep-nav-tree`, `deep-nav-item`, `deep-nav-link` |
| `footer/` | 3 | `footer-section`, `legal-link`, `social-link` |
| `product/` | 2 | `specification`, `variant` — **не используются** |

Подтверждение: `types/generated/components.d.ts` содержит ровно 72 интерфейса.

Крупнейшие компоненты: `page/service-order-form.json` (24 поля), `page/ceo-feedback.json`
(16 полей), `page/section-map.json` (9 полей, Яндекс.Карты).
Карьерный блок — 9 компонентов, блок главной — 4.

⚠️ В поле `description` многих компонентов записаны **целевые CSS-классы фронта** —
это осознанная связка CMS ↔ вёрстка, чтобы редактор видел классы прямо в админке
(`docs/STRAPI_SCHEMAS_UPDATED.md`, покрыто 14 компонентов). Не считать мусором.

## 🔴 68 мёртвых дублей схем — главная ловушка бэкенда

Помимо плоских файлов существуют 68 файлов `src/components/<группа>/<имя>/schema.json`
в формате content-type. **Strapi их не загружает.** Правка в них не делает ничего.

- 54 в `page/`, 6 в `footer/`, 6 в `navigation/`, 2 в `product/`.
- **31 содержательно расходится** с активной плоской версией (устаревшие редакции):
  `footer/footer-section`, `navigation/mega-menu`, `navigation/menu-item`, `page/card`,
  `page/hero`, `page/section-cards`, `page/service-order-form`, `product/specification`…
- **4 не имеют плоского аналога вообще** (нейминг без дефисов, полностью мёртвые):
  `footer/footersection/`, `footer/legallink/`, `footer/sociallink/`,
  `navigation/megamenusection/`.

Задача на удаление — B-11.

## Dynamic Zone: 29 компонентов, а «источник истины» знает про 16

`docs/project/IMPLEMENTATION_BACKLOG.md` объявляет себя single source of truth и
перечисляет 16 компонентов `page.sections`. В схеме их **29**. Отстал на 13:
`service-consultation-card`, `service-customization-panel`, `service-stats-card`,
`ceo-feedback`, `form-section`, `career-values`, `career-vacancies`, `career-why-company`,
`career-cv-form`, `home-cooperation-cta`, `home-industry-scenarios`, `home-private-zone`,
`template-block`.

**Ограничение Strapi v5:** `populate[sections]=*` для Dynamic Zone **невозможен** —
DZ требует `on`-фрагменты. Отсюда два обхода в коде:
- `page.findBySlug` (`src/api/page/controllers/page.ts:1011-1160`) — вручную собранный
  многоуровневый populate через `strapi.db.query`. Комментарий на `:1020-1022` объясняет,
  что entityService в v5 populate'ит DZ неглубоко.
- спец-эндпоинт `/api/pages/sections-stats` для аналитики.

## Кастомная логика бэкенда

Services — все дефолтные (`factories.createCoreService`, по 10-12 строк).
Controllers — 2696 строк TS всего:

| Файл | Строк | Методы |
|---|---|---|
| `src/api/page/controllers/page.ts` | **1234** | `deleteAll:10`, `updateParentRelations:42`, `checkParentRelations:161`, `getMainMenu:196`, `getFooter:318`, `seedServiceSections:480`, `seedDocSections:611`, `seedContactHub:785`, `seedSegmentLanding:895`, `findBySlug:1011`, `getSectionsStats:1162`, `getMenu:1198` |
| `src/api/news/controllers/news.ts` | 267 | `list:19`, `listYears:89`, `findBySlug:110`, `getFeatured:145`, `listCategories:169`, `listTags:176`, `getByCategory:183`, `getByTag:227` |
| `src/api/product/controllers/product.ts` | 96 | 3 метода |
| `src/api/navigation/controllers/navigation.ts` | 78 | `find`, `getDeepNavTree` |
| `src/api/footer/controllers/footer.ts` | 31 | переопределён `find` (populate) |

⚠️ `getMainMenu` и `getFooter` **читают JSON с диска**
(`temp/services-extraction/pages-hierarchy.json`) — рантайм API зависит от временного
миграционного артефакта. Это второй, конкурирующий источник меню и футера (B-13).

⚠️ `src/api/news/controllers/news.ts:113-114` — комментарий «entityService + filters
behaves inconsistently in our current setup», отсюда обход через `db.query`.

## Lifecycles

`src/api/page/content-types/page/lifecycles.ts` (121 строка) — `afterCreate/afterUpdate/
afterDelete` пересобирают Navigation и Footer. Отключаются `MGTS_DISABLE_PAGE_LIFECYCLES=1`.
Хелпер `getStrapiFromEvent` (`:44-53`) берёт `globalThis.strapi`, т.к. в v5 `event.strapi`
отсутствует.

Рядом — `lifecycles.ts.disabled` (104 строки), старая редакция того же файла. Мёртвый код.

## Конфигурация — что реально применяется

| Файл | Ключевое |
|---|---|
| `config/database.ts:4` | `DATABASE_CLIENT` default `sqlite`; ветки mysql (`:7-24`) и postgres (`:25-44`) не используются |
| `config/database.ts:45-50` | путь sqlite: `__dirname/../../` — это **над** `mgts-backend`. Файла нет |
| `config/server.ts` | `HOST` 0.0.0.0, `PORT` 1337, `APP_KEYS` |
| `config/admin.ts` | `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `/admin` |
| `config/plugins.ts:6` | upload provider **`local`**. Cloudinary в зависимостях, но не подключён |
| `config/plugins.ts:14-21` | локальные плагины `media-library-fix` (пустышка: `register.js` и `bootstrap.js` — пустые функции) и `icon-picker` |
| `config/middlewares.ts:8` | `frameguard: false` (помечено «Dev-only», но это боевой конфиг репо) |
| `config/middlewares.ts:50,53` | CORS origin включает `'null'` при `credentials: true` |
| `config/api.ts` | `defaultLimit` 25, `maxLimit` 100, `withCount` true |

## Миграции БД

`mgts-backend/database/migrations/` — **только `.gitkeep`**. Ноль миграций при 8 типах
и 72 компонентах. Схема создаётся автосинком Strapi при старте. Файл БД не в репозитории.
Это B-03 и главная причина, по которой проект не разворачивается с нуля.
