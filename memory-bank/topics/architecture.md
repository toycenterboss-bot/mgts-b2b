# Архитектура: три поколения и что из них живо

> Главное, что нужно понимать при чтении любого документа в `docs/`: **архитектура
> менялась трижды**, и документы разных поколений лежат вперемешку, не помечая друг
> друга отменёнными. Прежде чем применить инструкцию из `docs/`, определи её поколение.

## Поколение A — «HTML-in-richtext + мутации DOM» (дек 2024 – янв 2026)

```
SiteMGTS/*.html (легаси)
  → inventory.js → html-parser.js → импорт (41, позже 98 страниц)
Strapi: api::page.page.content = richtext (кусок HTML целиком)
  → GET /api/pages/slug/:slug
SiteMGTS/js/api-client.js → cms-loader.js → cms-processors.js
  → вставка секций прямо в DOM готовой статической страницы
```

Почему умерло — названо самими авторами (`docs/cms/integration/CMS_NEXT_STEPS.md`):
`renderContent()` разросся до ~2500 строк, смешивал типы обработки. Плюс класс багов
«двойной обработки»: loader мутировал уже готовый DOM.

**Что от него осталось в репозитории (живой мёртвый код):**
`SiteMGTS/js/cms-loader.js`, `cms-loader-v2.js`, `cms-loader-backup.js` (418 КБ),
`cms-processors.js`. `docs/project/NEXTJS_QA_ROLLOUT.md` §7.1 утверждает, что «legacy
`/html_pages/*` и `cms_loader` удалены» — **это неверно**: удалены маршруты, не код.

## Поколение B — «Stitch-first, Dynamic Zones, loader + adapter» (янв–фев 2026)

```
Stitch → design/html_blocks/<63 блока> → build_html_pages.py → design/html_pages/tpl_*.html
Strapi: page.sections = Dynamic Zone (структурированные компоненты)
  → /api/navigation, /api/footer, /api/pages/by-slug, /api/news/*, /api/icons
design/cms_loader/{loader,adapter}/*.js → наполнение статического шаблона
```

Четыре принципа этого поколения — **они действуют до сих пор**:
1. HTML из Stitch — источник истины по разметке и классам.
2. CMS хранит только данные и порядок секций, не вёрстку.
3. Интерактив — через `data-*` хуки, не через прямые обработчики.
4. Единый контракт событий: `mgts:open` (cancelable), `mgts:choiceChange`,
   `mgts:billingChange`, `mgts:switch`.

`design/cms_loader/` жив на диске, но фронтом не используется.

## Поколение C — «Next.js App Router» (фев 2026 – сейчас)

```
Strapi 5.36 (SQLite dev, :1337)
  → REST
mgts-frontend: Next 16.1.6 / React 19.2.3 (:3000)
  app/[...slug]/page.tsx → PageRenderer → SectionRenderer → React-компоненты
```

Драйвер перехода (`docs/project/NEXTJS_MIGRATION_AUDIT.md`, 2026-02-19): уйти от
loader-мутаций DOM, сохранив классы, маршруты и SEO-структуру; получить SSR/ISR,
CDN для медиа, инвалидацию кэша по тегам.

Детали рендеринга — `topics/frontend-render.md`.

## Почему Strapi

Обоснование — `docs/cms/integration/CMS_READINESS_ANALYSIS.md`: у легаси-сайта нет
backend/API/БД, нет управления медиа, версионирования контента, прав доступа и WYSIWYG;
при этом уже есть компонентная архитектура и иерархическая навигация, то есть сайт
готов к «headless».

⚠️ **Альтернативы не рассматривались.** Сравнительного анализа в `docs/` нет —
`docs/guides/development/CMS_IMPLEMENTATION_PLAN.md` просто фиксирует выбор.
Это не «плохое решение», это отсутствие записанного обоснования: если завтра встанет
вопрос «почему не Directus / не Payload», отвечать будет нечем.

## Почему Next.js

Обоснование в документах — не «почему Next», а «почему уходим от loader» (см. выше).
Выбор конкретного фреймворка тоже не сравнивался с альтернативами.

## Текущий стек — проверено по коду (2026-08-14)

| Слой | Что | Где проверено |
|---|---|---|
| CMS | `@strapi/strapi` 5.36.0, `better-sqlite3` 12.4.1 | `mgts-backend/package.json:19-31` |
| Фронт | `next` 16.1.6, `react` 19.2.3, `tailwindcss` ^4 | `mgts-frontend/package.json` |
| БД | SQLite по умолчанию; ветки mysql/postgres в конфиге не используются | `mgts-backend/config/database.ts:4,45-50` |
| Загрузка медиа | provider `local`. Cloudinary установлен, но **не подключён** | `mgts-backend/config/plugins.ts:6` |
| Тесты | нет ни одного, CI нет | `find`, отсутствие `.github/` |

## Что заброшено — не воскрешать, не читая

- **Penpot** — статус `paused` в `docs/project/PLAN_MGTS_NEW_SITE.md` §3, решение принято
  в пользу Stitch. Артефакты: `tools/penpot/docker-compose.yml`, `scripts/penpot/*.py`,
  `docs/project/PENPOT_STRUCTURE.md`. Две несогласованные конфигурации (:9001 в compose,
  :3449 в `scripts/setup/penpot_dev.sh`).
- **`api::product.product`** — по плану заменяется на `api::service.service`.
  Проверено: `service`, `document`, `vacancy`, `location` в `mgts-backend/src/api/` **нет**,
  `product` и `product-category` живы. См. вопрос Q3 в `backlog.md`.
- **Поиск (Meilisearch/Typesense) и AI-чат (Ollama/Perplexity)** — только в планах,
  кода нет. При этом шаблоны `TPL_Search_Results` и `TPL_AI_Chat` существуют и рендерятся.

## Три рендерера одного контента — почему их три

Исторический артефакт, а не замысел: `SiteMGTS/js/cms-loader.js` (поколение A),
`design/cms_loader/*` (поколение B), React-компоненты (поколение C). Первые два —
мёртвый груз. Знать про них нужно только чтобы не чинить их по ошибке.
