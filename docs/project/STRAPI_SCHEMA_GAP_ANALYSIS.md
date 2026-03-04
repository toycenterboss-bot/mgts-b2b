# Gap analysis: Strapi schema (legacy) vs new Stitch-first блоки

Цель: показать, **чего не хватает** текущим Strapi `schema.json` для новой block‑based структуры.

## 1) Что есть сейчас (кратко)

### api::page.page
- **fields**:
  - `breadcrumbs`: `json`
  - `children`: `relation`
  - `content`: `richtext`
  - `ctaKey`: `string`
  - `deepNavKey`: `string`
  - `hero`: `component`
  - `heroBackgroundImage`: `media`
  - `heroSubtitle`: `text`
  - `heroTitle`: `string`
  - `isMenuVisible`: `boolean`
  - `metaDescription`: `text`
  - `metaKeywords`: `string`
  - `order`: `integer`
  - `originalUrl`: `string`
  - `parent`: `relation`
  - `section`: `enumeration`
  - `sections`: `dynamiczone`
  - `showBreadcrumbs`: `boolean`
  - `sidebar`: `enumeration`
  - `slug`: `string`
  - `template`: `enumeration`
  - `title`: `string`

### api::news.news
- **fields**:
  - `author`: `string`
  - `category`: `relation`
  - `content`: `richtext`
  - `featuredImage`: `media`
  - `gallery`: `media`
  - `isFeatured`: `boolean`
  - `metaDescription`: `text`
  - `metaKeywords`: `string`
  - `publishDate`: `datetime`
  - `shortDescription`: `text`
  - `slug`: `string`
  - `tags`: `relation`
  - `title`: `string`
  - `viewsCount`: `integer`

### api::product.product
- **fields**:
  - `category`: `relation`
  - `currency`: `string`
  - `fullDescription`: `richtext`
  - `images`: `media`
  - `isAvailable`: `boolean`
  - `isFromOldSite`: `boolean`
  - `metaDescription`: `text`
  - `metaKeywords`: `string`
  - `name`: `string`
  - `oldPrice`: `decimal`
  - `originalSlug`: `string`
  - `originalUrl`: `string`
  - `price`: `decimal`
  - `relatedProducts`: `relation`
  - `section`: `enumeration`
  - `shortDescription`: `text`
  - `sku`: `string`
  - `slug`: `string`
  - `specifications`: `json`
  - `stockQuantity`: `integer`
  - `variants`: `json`

### api::navigation.navigation
- **fields**:
  - `logo`: `media`
  - `logoAlt`: `string`
  - `mainMenuItems`: `json`
  - `megaMenus`: `json`
  - `phone`: `string`
  - `phoneDisplay`: `string`

### api::footer.footer
- **fields**:
  - `copyright`: `string`
  - `legalLinks`: `json`
  - `sections`: `json`

## 2) Главные несоответствия (high-signal)

- **Нет block-based модели страниц**: `api::page.page` хранит один `content: richtext` + немного SEO/hero. Для Stitch нужны *секции/блоки* (repeatable components или dynamic zone).
- **Нет структурированных секций**: карточки, тарифы, FAQ, табы, таблицы документов, списки файлов — всё должно быть *структурой*, а не richtext.
- **Документы и файлы**: нужен паттерн `fileList[]` (название, URL/Media, тип, размер, дата, действие), плюс хук предпросмотра (modal/inline).
- **Контакты/карта**: нужен контент‑тип/компонент для `locations[]` (lat/lng, категория, адреса, телефоны, часы) — сейчас этого нет.
- **Карьера**: вакансии — отдельная коллекция (`vacancy`) или JSON/relations; сейчас в схемах нет.
- **Сценарии/сайдбар‑переключатель**: требуется `menuItems[]` + `panels[]` с привязкой ключей — сейчас нет.
- **News/Offers**: `/news` и `/offers` делят листинг‑шаблон, но в Strapi есть только `news`. Нужна либо вторая коллекция `offer`, либо поле `type`/`category`.

## 3) Рекомендация целевой модели (черновик)

- **Page**: добавить `sections` как `dynamiczone` (или `components` repeatable) с компонентами:
  - `hero`, `ctaBanner`, `cardsGrid`, `tabs`, `accordion`, `pricingTable`, `docTabs`, `fileList`, `contactHub`, `form`, `pagination`
- **Product/Service**: либо расширить `api::product.product` секциями (как Page), либо хранить услуги в `api::page.page` с `section=...` и отдельным индексом/категориями.
- **News/Offer**: унифицировать модель публикаций: `post` (type=news|offer|video) или 2 коллекции + общий листинг.
- **Navigation/Footer**: оставить single types, но заменить `json` на структурированные компоненты, если понадобится редакторская валидация.

## 4) Что делать дальше (практически)

- Сначала утвердить **PAGE_CONTENT_MAPPING.md** (что за поля реально нужны по шаблонам).
- Затем обновлять Strapi схемы: добавить `sections` и компоненты, и только потом начинать массовое наполнение.
