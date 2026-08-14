# CSS-классы: две системы, маппинг легаси→BEM, типы карточек, SVG

> 🔴 **Рамка, без которой всё ниже читается неправильно.** В проекте сосуществуют
> **две несовместимые системы классов**. Документы `docs/cms/structure/**` и
> `docs/cms/grid-types/**` описывают Систему I — она **мертва в текущем фронте**.
> Проверка: `grid-item`, `tariff-card`, `card-body`, `faq-answer-content` в
> `mgts-frontend/src` — **0 файлов**. `section-cards__card` — 2, `history-timeline__` — 2.
> Правила §1 ниже сохранены как история и как ключ к чтению старых документов,
> а не как руководство к действию.

## Система I — «semantic-lite» (поколение A, дек 2024 – янв 2026)

`.grid`, `.grid-item`, `.card`, `.card-body`, `.tariffs-grid`, `.tariff-card__*`,
`.faq-list`, `.faq-item`, `.section-title`.

**8 строгих правил иерархии** (`docs/cms/structure/CLASS_HIERARCHY_RULES.md`):
`.grid-item`→только в `.grid`; `.card-body`→только в `.card`; `.tariff-card`→только в
`.tariffs-grid`; `.tariff-card__header`→только в `.tariff-card`; `.tariff-price`→только
в `.tariff-card__header`; `.faq-item`→только в `.faq-list`; `.faq-answer`→только в
`.faq-item`; `.faq-answer-content`→только в `.faq-answer`.

**Ценно не само правило, а способ его получения:** правила выведены **эмпирически**
замером на 42 страницах, а не придуманы. Замер: `.grid-item` в `.grid` — 11/11 ✅;
`.card` в `.grid` — 25, отдельно — 27; `.card-body` в `.card` — 7, отдельно — **1 ⚠**;
тарифы 11/11; FAQ 4/4 и 8/8. То есть правила **описали то, что уже соблюдалось**,
и автоматизировали защиту от единственного отклонения.
Исполняется скриптом: `node mgts-backend/scripts/check-class-hierarchy.js [--dry-run]`
— он **оборачивает** сирот в недостающий родитель.

**Top-level элементы** (`TOP_LEVEL_ELEMENTS_RULES.md`) — про элементы внутри `.container`,
но вне блоков. Четыре правила: любой такой элемент внутри секции; нельзя между секциями;
нельзя после всех секций; заголовок секции обязан иметь класс `section-title`.
Исключения из последнего (часто забываются): заголовки в формах заказа (`service-order`),
со спец-классами (`.order-form__title`, `.faq-question`), внутри карточек
(`.card-title`, `.tariff-card__title`).
Результат применения: исправлено 35 страниц, 7 были корректны, элементов между/после
секций — 0. Скрипт: `mgts-backend/scripts/check-top-level-elements.js`.

**Нормализация DIV** (`DIV_NORMALIZATION_SUMMARY.md`, 24 из 42 страниц): удаление
inline-стилей — **но стили форм `.order-form__*` сохранены**; замена `.container-mgts`
→ `.container` — **кроме главной страницы**. Оба исключения осознанные.

## Система II — «BEM по компонентам Strapi» (с 2026-01-09, действует)

Принцип: каждому Strapi-компоненту `page.<name>` соответствует BEM-корень `<name>`,
элементы через `__`, модификаторы через `--`. Источник:
`docs/STRAPI_COMPONENTS_CSS_CLASSES.md` (25 КБ) + `docs/STRAPI_SCHEMAS_UPDATED.md`.

**Ключевая идея маппинга — «many-to-one»:** десяток исторических классов схлопывается
в один целевой. Это и есть механизм «100 % маппинга классов», о котором рапортует
`CONTEXT.md`. Примеры:

| Компонент | Легаси-классы (источники) | Целевой |
|---|---|---|
| `page.section-cards` | `advantage-cards-container`, `cards-1-containers`, `cards-2-container`, `cards-3-container`, `container-scroll`, `services-cards`, `scroll-container`, `text-cards` | `section-cards__container` |
| `page.section-cards` | `advantage-card`, `card-type-1/2/3`, `services-card`, `text-card`, `object-card`, `gray-card-item`, `row-item` | `section-cards__card` |
| `page.section-text` | `h1-wide-med` | `section-text__title` |
| `page.section-text` | `p1-text-reg`, `p1-comp-reg`, `p2-comp-reg` | `section-text__content` |
| `page.section-text` | `short-text-width`, `text-width` | `section-text__content--narrow` |
| `page.service-tariffs` | `tariff-card` | `service-tariffs__tariff` |
| `page.service-tariffs` | `table-row-item--header/--text/--price` | `service-tariffs__table-cell--header/--text/--price` |
| `page.service-faq` | `accordion-row` → `__item`; `accordion-row__header`/`row-header-text` → `__question`; `accordion-row__content` → `__answer` | |

`page.section-text` — самый «жирный» компонент (~60 позиций маппинга), он поглотил почти
весь разнородный легаси.

⚠️ Целевые классы **вписаны в поле `description` схем компонентов Strapi** (14 компонентов),
чтобы разработчик видел их прямо в админке. Не считать это мусором при чистке схем.

## Типы карточек — диагноз ценнее решения

**Исходный баг** (`docs/cms/grid-types/GRID_TYPES_ANALYSIS.md`). В `enhanceServiceCard`:

```javascript
if (link && !isCardLink) { /* создать кнопку "Узнать больше" */ }
```

Переменная `link` по умолчанию равна `'#'` (строка 404 в `cms-loader.js`), а `'#'` —
истинное значение. Итог: кнопка лепилась на карточки, где ссылки нет вовсе.
Замер: **~37 карточек** только в разделе «О компании» (~15 navigation + ~22 info).

Итоговое условие: `if (link && link !== '#' && link !== '' && !isCardLink)`.
**Общий урок → класс К-07 в `patterns/catalog.md`: дефолт-значение не должно быть
truthy, если по нему принимается решение.**

**Пять типов карточек:**

| Тип | HTML-признак | Кнопка |
|---|---|---|
| `navigation` | сама карточка — `<a class="card">` | НЕТ (кликабельна вся) |
| `info` | `<div class="card">` без ссылок | НЕТ |
| `service` со ссылкой | ссылка **внутри** карточки | «Узнать больше» |
| `service` без ссылки | ссылок нет | НЕТ |
| `tariff` | есть цена (₽/руб/мес), условия, список фич | «Заказать» — всегда |

**Почему автоопределение не годится:** `navigation` и `service без ссылки` визуально
и структурно неотличимы от `info` — надёжного признака нет. Отсюда решение:
**тип объявляется в CMS явно.**

Модель разрешения типа (приоритет сверху вниз):
1. `cardType` конкретной карточки (`data-card-type`);
2. `gridType` секции, если он ≠ `mixed`;
3. автоопределение `detectCardType(card)` — обратная совместимость.

`gridType` ∈ {`navigation`, `info`, `service`, `tariff`, `mixed` (default)};
`cardType` ∈ {`navigation`, `info` (default), `service`, `tariff`}.

**[проверено]** Поля дожили: `cardType` в `mgts-backend/src/components/page/card.json`,
`gridType` в `section-grid.json`. Во фронте упоминаются по одному файлу — механизм
формально жив, но почти не задействован. Вместо него работают эвристики по русским
подстрокам заголовков (`SectionCards.tsx:102-136`) — то есть **та же ошибка, что
чинили в 2026 году, вернулась в другой форме**.

## SVG — единственный документ с выводом «ничего делать не нужно»

Источник: `docs/SVG_ELEMENTS_HANDLING.md`. Ценен тем, что закрывает повторяющийся вопрос.

**Обрабатывается:** только CSS-классы на SVG-элементах (`<svg class="link-img">`,
`<g class="…">`) — через общий маппинг классов.

**НЕ обрабатывается, и это правильно:** атрибуты `d`, `fill`, `stroke`, `clip-path`,
`viewBox` (геометрия, не стиль); внутренняя структура `<path>`, `<g>`, `<clipPath>`,
`<defs>` (форма иконки).

**Классы-исключения, сохраняются как есть:** префиксы `Logo_svg__*`, `__cls-*`
(генераторы SVG), `ymaps3x0--*` (Яндекс.Карты) — их используют внешние библиотеки.

**Что проверять при миграции:** пути к внешним `.svg` (inline переносится как есть);
наличие CSS-правил для `link-img`, `file-item__type-img`; корректность `width`/`height`.

## Контракт интеракций Stitch ↔ CMS

Источники: `docs/project/CMS_INTEGRATION_CONTRACT.md`, `PROJECT_CONTEXT_RESTORED.md`.

**`data-*` хуки:** `data-modal-open`, `data-route-open`, `data-open-mode="modal|navigate"`,
`data-choice-group`, `data-billing`, `data-switcher`, `data-loadmore`, `data-contact-hub`,
`data-carousel`, `data-tabs`/`data-tab`/`data-panel`.

**События:** `mgts:open` (**cancelable** — главный хук роутинга и модалок),
`mgts:choiceChange`, `mgts:billingChange`, `mgts:switch`.

**Пагинация:** контракт Strapi as-is — запрос `pagination[page]`/`pagination[pageSize]`,
ответ `meta.pagination.{page,pageSize,pageCount,total}`.

**Категории документов строятся из CMS, не руками:** связка
`page.document-tabs.tabs[*].filterKey` ↔ `page.files-table.files[*].categoryKey`
(пусто = «Все»).

## Фиксированный порядок секций страницы услуги

Hero → Кому подходит → Возможности → Сценарии/кейсы → Пакеты (Start/Optimum/Enterprise)
→ SLA/сроки/цены → FAQ (6–10 вопросов) → Документы → Trust-signals → финальный CTA.
Правило CTA: основной CTA повторяется **минимум дважды** (hero + финал), ведёт на `/contact`.
