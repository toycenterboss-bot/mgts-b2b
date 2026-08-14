# Фронтенд: как JSON из Strapi становится страницей

Замер по коду 2026-08-14. `mgts-frontend/`, Next 16.1.6 App Router, React 19.2.3.

## Маршруты — 7 страниц + 1 route handler

| Файл | URL | Что делает |
|---|---|---|
| `src/app/page.tsx` | `/` | `getPageBySlug("home")` → `PageRenderer` |
| `src/app/[...slug]/page.tsx` | `/*` | `resolvePageByPath()`; явные `notFound()` для `html_pages/` (`:17`) и `news` (`:21`) |
| `src/app/ai-chat/page.tsx` | `/ai-chat` | обёртка над `resolvePageByPath` |
| `src/app/career/page.tsx` | `/career` | fallback `career` → `career_list` (`:7-9`) |
| `src/app/contact/page.tsx` | `/contact` | `contact` → `contact_details` |
| `src/app/search/page.tsx` | `/search` | `search` → `search_results` |
| `src/app/news/page.tsx` | `/news` | `getNewsList({pageSize:3})` + `getNewsTags()` |
| `src/app/news/archive/page.tsx` | `/news/archive` | `pageSize:12` + `getNewsYears()` |
| `src/app/news/[slug]/page.tsx` | `/news/:slug` | контент через `dangerouslySetInnerHTML` (`:92`) |
| `src/app/assets/[...path]/route.ts` | `/assets/*` | **Node-route, читающий файлы с диска из `../design/assets`** |

Четыре страницы (`ai-chat`, `career`, `contact`, `search`) — тонкие обёртки, которые
catch-all обслужил бы и так.

**Чего нет вообще:** `middleware.ts`, `not-found.tsx`, `error.tsx`, `global-error.tsx`,
`loading.tsx`, `robots.ts`, `sitemap.ts`, `generateMetadata`, `generateStaticParams`.

## Цепочка рендеринга

```
page.tsx
  → PageRenderer.tsx (739 строк) — каскад if по page.template
      TPL_Home            :148 → HomePage
      TPL_Segment_Landing :157 → SegmentLandingPage
      TPL_Form_Page       :172 · TPL_Doc_Page :188
      TPL_CMS_Page/DeepNav:254 · TPL_Service :620 · TPL_Scenario :643
      TPL_Contact_Hub     :649 · TPL_Search_Results/AI_Chat :665 · default :716
  → SectionRenderer.tsx (148 строк) — switch по section.__component (:62-144)
      31 тип компонента, default: return null (:143)
  → конкретный React-компонент секции
```

🔴 **`default: return null` в `SectionRenderer.tsx:143`** — неизвестный компонент
исчезает молча. В Strapi 29 компонентов DZ, в свитче 31 ветка; расхождение обеих сторон
никем не проверяется. Это готовый механизм «тихого» дефекта: контент есть, на странице
его нет, ничего не падает. Ровно тот класс, что описан в К-04 каталога.

## Вспомогательные модули

| Файл | Что |
|---|---|
| `src/lib/strapi.ts` (220) | Единственный клиент API. Все типы — `Record<string, unknown>` (`:28-32`) |
| `src/lib/fallbacks.ts` (7) | `applyPageFallbacks` — hero из `page.hero` либо из плоских `heroTitle`/`heroSubtitle` |
| `src/lib/routes.ts` (56) | `toPrettyRoute` / `normalizeCmsHref` — `.../foo.html?slug=bar` → `/bar` |
| `src/lib/media.ts` (35) | `resolveMediaUrl` разбирает **4** формы медиа (Strapi v4 `data.attributes`, v5 плоская, массив, строка) — схема данных не зафиксирована |
| `src/lib/templateBlocks.ts` (92) | Читает **сырой HTML с диска** из `../design/html_pages`, вырезает `<section data-stitch-block>` регуляркой (`:39-64`), вставляет через `dangerouslySetInnerHTML` |
| `src/lib/hierarchy.ts` | Читает `../mgts-backend/temp/services-extraction/pages-hierarchy.json` |

## Интеграция со Strapi

Env (все, что реально читаются): `NEXT_PUBLIC_STRAPI_BASE_URL` (`strapi.ts:35`),
`STRAPI_BASE_URL` (`:36`), `NODE_ENV` (`:112`), плюс дубль константы в
`components/news/NewsListing.tsx:27`. Fallback — `http://localhost:1337`.
**Токенов авторизации в коде нет** — все запросы анонимные.

Эндпоинты: `/api/navigation`, `/api/footer`, `/api/navigation/deep-nav/{key}`,
`/api/pages/by-slug`, `/api/icons`, `/api/news/{list,slug/:slug,tags,years}`.

ISR: `strapi.ts:42-47` — `navigation/footer/page` = 300 с, `news` = 120 с;
`fetchJson` (`:49-69`) ставит `cache: "force-cache"` и `next: {revalidate, tags}`.
В dev для страниц принудительно `no-store` (`:112`).

🔴 **Кэш-теги мертвы.** Теги проставляются (`navigation`, `footer`, `page:{slug}`,
`icon:{name}`, `news`…), но `revalidateTag` / `revalidatePath` не вызывается нигде,
webhook-роута нет. Работает только таймер. См. B-15.

Слабые места:
- `layout.tsx:19` и `app/page.tsx:5` — **без try/catch**. Падение Strapi = 500 на каждой
  странице, потому что layout грузит navigation+footer всегда (B-09).
- `resolvePageByPath` (`:143-152`) перебирает до 5 вариантов слага **последовательно** —
  для несуществующей страницы это 5 промахов до 404.
- `PATH_SLUG_OVERRIDES` (`:131-133`) — хардкод-костыль ровно на один слаг.
- `ui/Icon.tsx:36` — async server-компонент с отдельным HTTP-запросом **на каждую иконку**
  (`<Icon` в 13 файлах, 15 вхождений). N+1 (B-16).
- `NewsListing.tsx:159,187` — клиентские `fetch` идут **напрямую в Strapi из браузера**
  с `no-store`, минуя Next. Значит Strapi обязан быть публично доступен и с CORS.
- `dangerouslySetInnerHTML` в 8+ местах, санитизации нет нигде. `stripScripts`
  (`templateBlocks.ts:66-67`) — регулярка, обходится тривиально.

## 🔴 Стили: Tailwind v4 установлен и не работает

Это корневая причина визуальных расхождений. Разбор:

1. `package.json:16,22` — `@tailwindcss/postcss ^4`, `tailwindcss ^4` (в lock — 4.2.0);
   `postcss.config.mjs:3` — плагин подключён.
2. **Но** в `src/app/globals.css` (1147 строк) и `src/app/light-theme.css` (689 строк)
   нет ни одной директивы `@import "tailwindcss"` / `@tailwind` / `@theme` / `@apply` /
   `@plugin` / `@source` / `@layer` — проверено grep'ом, 0 совпадений.
   Других `.css` в `src/` нет. Значит **утилиты не генерируются вообще**.
3. Реальный источник утилит — готовый бандл, подключаемый `<link>` в `layout.tsx:24`:
   `design/assets/css/stitch-tailwind.css` (109 КБ, минифицирован). Это сборка
   **Tailwind v3** (маркеры `--tw-border-spacing-x`, `--tw-pan-x`).
4. `design/tailwind/tailwind.config.cjs:3` — `content: ["../html_blocks/**/*.html"]`.
   **`mgts-frontend/src/**/*.tsx` в сканирование не входит.**

Следствие, подтверждённое пофайлово — классы есть в TSX, но правил в CSS нет:

| Класс | Где используется |
|---|---|
| `-mb-24` | `SectionCards.tsx:65,69`, `HomeServiceCards.tsx:151` |
| `min-h-[60vh]` | `PageRenderer.tsx:686`, `ScenarioPage.tsx:54`, `HomeHero.tsx:19`, `CareerHero.tsx:57`, `ServiceHero.tsx:56` |
| `aspect-[16/9]` | `news/[slug]/page.tsx:80`, `FilesTable.tsx:195`, `DocumentTabs.tsx:340`, `SectionTable.tsx:327`, `NewsListing.tsx:449` |
| `aspect-[3/4]` | `PageRenderer.tsx:357` |
| `tracking-[0.25em]` | `news/[slug]/page.tsx:67` |

Плюс классы, не определённые **нигде**: `tech-pattern` (`PageRenderer.tsx:696`),
`hero-mesh` (`HomeHero.tsx:19`), `layout-container` (`HomePage.tsx:48`, `PageRenderer.tsx:275`).

Что подключено суммарно:

| Источник | Как |
|---|---|
| `src/app/globals.css` (1147) | `import` в `layout.tsx:2`. Рукописный BEM: `.page__*`, `.breadcrumbs__*`, `.left-menu__*`, `.hero__*`, `.section-cards__*`. 15 `!important` |
| `src/app/light-theme.css` (689) | `import` в `layout.tsx:3`. **181 `!important`** — светлая тема сделана перекрытием Tailwind-классов (`html.light .bg-background-dark {…!important}`) |
| `design/assets/css/stitch-tailwind.css` | `<link>` через file-route |
| `design/assets/fonts/material-symbols-outlined/…` | `<link>` через file-route |
| Google Fonts Space Grotesk | `<link>` в `layout.tsx:26-29`, блокирующая внешняя загрузка. `next/font` **не используется**, вопреки README |

⚠️ `layout.tsx:22` — `<html lang="ru" className="dark">` жёстко на сервере, потом
перебивается клиентским `ThemeInit` (`components/theme/ThemeInit.tsx:17-30`) →
гарантированный FOUC при светлой теме.

## Две несовместимые системы стилизации карточек

- **Tailwind-утилиты в JSX** — `SectionCards.tsx:38-45` строит `gridColsClass` из
  `section.columns`; варианты вычисляются на `:24-29`.
- **BEM-классы** — `SectionGrid.tsx:13-14`: `section-grid--{gridType}` +
  `data-section-grid-type`; карточки `section-cards__card`, `__card-icon`, `__card-title`.

Плюс эвристики вместо данных: `SectionCards.tsx:102-126` — `resolveServiceIcon`
из 15 `if` по подстроке **русского заголовка** («данн», «облак», «вирус»);
`:127-136` — `resolveContactIcon`; `LeftMenu.tsx:64-74` — `pickSidebarIcon`.
И выбор ветки по строковому совпадению названия секции: `SectionRenderer.tsx:68`
(`section?.title === "Сценарии"`), `SectionCards.tsx:20` (`=== "Контактные данные"`),
`PageRenderer.tsx:119,121,255` (по `page.slug`).

## Визуальное сравнение — единственный автоматический контроль

`mgts-frontend/scripts/visual-compare.js` (267 строк). **Скрипта в `package.json` нет**,
запуск руками: `node scripts/visual-compare.js`. Нужны три поднятых сервера
(адреса захардкожены, `:8-10`): Strapi 1337, React 3000, статика 8002.

Механика: `/api/pages` пагинацией → Playwright chromium 1440×900 `fullPage` →
`pixelmatch(threshold: 0.1)` → отчёты в `docs/project/visual-compare/`.

Результат последнего прогона (`report.md`, 118 страниц): худшие `/search` 34.65 %,
`/contact` 32.13 %, `/career` 25.04 %, `/operators` 24.67 %, `/` 20.86 %; лучшие ~1.5-2 %.
**Паритет не достигнут ни на одной странице.**

Слабости скрипта — знать, чтобы не доверять цифрам слепо:
- нет CLI-аргументов и порога fail, всегда `exit 0` — для CI непригоден;
- `padPng` (`:121-127`) добивает меньший PNG **белым**, а сайт тёмный
  (`globals.css:11` — `#0b0e14`) → разница высот раздувает mismatch искусственно;
- фиксированный `waitForTimeout(600)` — флаки на анимациях;
- один общий `page` на все 118 итераций → состояние (в т.ч. localStorage темы) протекает
  между снимками.

## Прочие находки

- **Ни одна форма не отправляет данные** (B-05): 6 форм с `action="#"`, у полей нет `name`.
- **Rules of Hooks нарушены в 9 компонентах** (B-06): ранний `return null` до хуков.
- **Мёртвый код** (B-14): недостижимые ветки в `PageRenderer.tsx:517-539` и
  `SectionCards.tsx` (12 веток `variant === "service-cards"`).
- **78 хардкод-фолбэков русского текста** вида `|| "…"` в 30+ компонентах;
  `CareerHero.tsx:8-26` — реальные имена сотрудников прямо в коде;
  `FooterContactForm.tsx:15,17` — телефон и почта; `HomePage.tsx:60-96` — заголовок,
  поиск и 4 кнопки-фильтра захардкожены и **нефункциональны** (нет state и onClick).
- `next.config.ts:3` — `images.unoptimized: true`, оптимизация отключена целиком;
  `:5-20` — `remotePatterns` разрешает только `localhost:1337` / `127.0.0.1:1337`.
- `public/` — 3.2 МБ, из них 2 МБ шрифтов Noto Sans, **не подключённых нигде**,
  плюс дефолтные SVG от `create-next-app`. Коллизия: `public/assets/**` и route-handler
  `app/assets/[...path]/route.ts` обслуживают один префикс `/assets/*`.
- **Комментариев TODO/FIXME/HACK — ноль.** Незавершённость видна не по маркерам,
  а по мёртвым веткам и заглушкам. Не искать TODO — это здесь не работает.
