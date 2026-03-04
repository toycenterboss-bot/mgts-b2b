# CMS target schema (Strapi) — page builder под Stitch-first

Цель: редактор в Strapi должен **собирать страницу как набор блоков (секции)** + **настраивать экземпляры внутри блока** (карточки/файлы/FAQ/таблица и т.д.) без копирования/правки HTML.

Принцип: **разметка/классы остаются в Stitch HTML**, а Strapi хранит **только данные + порядок секций**. На фронтенде для каждого типа секции есть “рендерер” (или адаптер), который берет данные и подставляет их в канонический HTML блока.

---

## 1) Core: `api::page.page` (collection type)

**Зачем**: единая модель для всех роутов (`/about_mgts`, `/disclosure`, `/docs`, `/services/...`) с возможностью drag&drop секций.

Рекомендуемые поля:
- **routing**
  - `slug` (uid) — route path или slug (договоримся, что именно хранится; для простоты можно хранить “/path”)
  - `title` (string)
  - `template` (enum): `TPL_Home`, `TPL_Segment_Landing`, `TPL_Service`, `TPL_Scenario`, `TPL_News_List`, `TPL_News_Detail`, `TPL_Contact_Hub`, `TPL_Career_List`, `TPL_Career_Detail`, `TPL_Doc_Page`, `TPL_Form_Page`, `TPL_Search_Results`, `TPL_AI_Chat`, **`TPL_DeepNav`**
- **seo** (component `shared.seo`, single)
  - `metaTitle`, `metaDescription`, `canonicalUrl`, `noIndex`
- **layout / wrappers (канонические рамки)**
  - `showBreadcrumbs` (boolean)
  - `deepNavKey` (string) — ключ дерева бокового меню для `TPL_DeepNav` (например: `"about_company"`)
  - `ctaKey` (string, optional) — ссылка на preset CTA (или флаг/настройки для CTA блока)
- **content**
  - `hero` (component `sections.hero`, single, optional)
  - `sections` (**dynamic zone**) — основной список блоков справа/внутри контента (drag&drop порядок)

### 1.1 `TPL_DeepNav` как правило сборки
Для страниц `TPL_DeepNav`:
- слева всегда рисуется sidebar по `deepNavKey`
- справа рендерится `hero` (если есть) + `sections[]` **в любом количестве**
- CTA (если включена) — всегда **после** `sections[]` и **перед** footer

---

## 2) Navigation/Footer (single types)

### 2.1 `api::navigation.navigation`
**Зачем**: единая шапка + мегаменю + deep-nav деревья (для левого меню).

Рекомендуем перейти от `json` к компонентам (чтобы были валидации + удобный редактор):
- `mainMenu` (repeatable component `nav.menuItem`)
- `megaMenus` (repeatable component `nav.megaMenu`)
- `deepNavTrees` (repeatable component `nav.deepNavTree`)
  - `key` (string) — то, что попадет в `page.deepNavKey`
  - `title` (string)
  - `items` (repeatable component `nav.deepNavItem`, поддержка вложенности)

### 2.2 `api::footer.footer`
Аналогично: заменить `json` на repeatable компоненты `footer.section`/`footer.link`.

---

## 3) Сущности данных (для листингов и детальных страниц)

### 3.1 Posts: `api::post.post` (collection type) — рекомендовано вместо разрозненных `news/offer/video`
**Зачем**: общий движок листинга + детальной страницы и единая пагинация.

Поля:
- `type` (enum): `news | offer | video | doc` (если “документы” решим хранить как посты)  
- `slug` (uid), `title` (string)
- `excerpt` (text), `content` (richtext/blocks)
- `cover` (media), `publishedAt` (datetime)
- `tags` (relation), `category` (relation)
- (для video) `videoUrl` (string) / `videoEmbed` (text)

Примечание по проекту (текущее состояние):
- В Strapi уже существуют `api::news.news`, `api::news-category.news-category`, `api::news-tag.news-tag`
  и контент в них уже загружен. На ближайшем этапе целесообразно **переиспользовать их** как источник для
  `TPL_News_List`/`TPL_News_Detail`, а унификацию в `post` делать позже (если потребуется).

### 3.2 Documents (вариант B): `api::document.document` (collection type)
Если документы — отдельная сущность:
- `title` (string)
- `file` (media)
- `fileType` (enum/string), `publishedAt` (date), `number` (string), `issuer` (string)
- `category`/`tab` (relation) — чтобы собрать “табы документов”

### 3.3 Career: `api::vacancy.vacancy` (collection type)
- `title`, `city`, `department`, `employmentType`
- `description` (richtext/blocks)
- `applyUrl` или `applyEmail`
- `publishedAt`, `isActive`

### 3.4 Contact hub: `api::location.location` (collection type)
- `title`
- `category` (enum): `office | network`
- `lat`, `lng`
- `address`, `phones[]`, `workHours`
- `services[]` (optional)

---

## 4) Секции (components) для `page.sections` (dynamic zone)

Ниже “минимально достаточный” набор секций, который закрывает текущие Stitch блоки:

- `sections.richText` — простые текстовые зоны (редактору удобно)
- `sections.cardsGrid`
  - `items[]`: `title`, `text`, `icon/media`, `link` (component `shared.link`), `badge`
- `sections.accordion`
  - `items[]`: `title`, `body`
- `sections.fileList`
  - `items[]`: `title`, `file(media)` или `url`, `meta` (size/date/type)
- `sections.docTabs`
  - `tabs[]`: `title`, `items[]` (document refs или `fileListItem`)
- `sections.pricingTable`
  - `billingModes[]`: monthly/yearly
  - `rows[]/plans[]` (структурированно; детали уточним по блоку)
- `sections.contactHub`
  - `source` enum: `locations` (relation) | `inline`
  - `locations[]` (if inline): совпадает с `api::location.location`
- `sections.postsList`
  - `postType` (enum: news/offer/video)
  - `pageSize` (int)
  - `filters` (json/relations)
  - `display` (enum): list/grid

Опционально (по мере надобности):
- `sections.formEmbed` (ключ/ID формы + контекст)
- `sections.switcherPanels` (для `TPL_Scenario`/side switcher): `menuItems[]` + `panels[]` с `key`

---

## 5) Пагинация: где считается pageCount и как UI её использует

**Источник правды — API**, а не HTML:
- API ответа листинга должен возвращать `meta.pagination`:
  - `page`, `pageSize`, `pageCount`, `total`
- UI пагинатор (канонический блок) строит кнопки по `pageCount` и дергает загрузку следующей страницы (или роутинг) по `page`.

Рекомендуемая схема:
- если листинг рендерится сервером/SSG: `page` в URL (`?page=2`)
- если листинг рендерится на клиенте: запросы в Strapi с `pagination[page]` / `pagination[pageSize]`

---

## 6) Что это дает редактору (то, что ты хочешь)
- **Drag&drop секций страницы**: `page.sections` (dynamic zone) — переупорядочивание блоков в UI Strapi.
- **Экземпляры внутри блока**: repeatable components (`items[]`, `tabs[]`) — без HTML.
- **Единый контракт интерактива**: `mgts:open`, `mgts:choiceChange`, `mgts:billingChange`, `mgts:switch` + `meta.pagination`.

