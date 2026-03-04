# Контракт интеграции MGTS (Stitch HTML → CMS)

Цель: зафиксировать единый способ подключения данных и роутинга к **готовым HTML-блокам** без потери верстки/стилей.

## 1) Базовые принципы
- **HTML из Stitch считается “источником истины” по разметке/классам**. В CMS мы режем на секции и не переписываем структуру.
- **Интерактив — через `design/cms_loader/cms-loader.js`** и `data-*` хуки.
- **CMS может переопределять поведение** через события (см. `mgts:open`) и/или меняя `data-open-mode`.

## 2) Канонические хуки (data-атрибуты)

### 2.1 Открытие контента (modal/route)
Триггеры:
- `data-modal-open="modalId"`: открыть модалку
- `data-route-open="/path"`: перейти по маршруту
- `data-open-mode="modal|navigate"`: выбор режима (по умолчанию: если есть `data-modal-open` → `modal`, иначе → `navigate`)
- (опционально) `data-content-type="news|video|doc|..."`, `data-content-id="..."`: идентификаторы сущности для CMS

Модалки:
- контейнер: `data-modal` + `id="..."`
- оверлей: `data-modal-overlay`
- диалог: `data-modal-dialog`
- кнопка закрытия: `data-modal-close`

### 2.2 Пагинация / сегментированные переключатели
- контейнер: `data-choice-group`
- элементы выбора: `data-choice` + `data-active-classes`/`data-inactive-classes` (в demo)
- стрелки: `data-choice-prev`, `data-choice-next`

Примечание по **пагинации**:
- UI не должен “угадывать” количество страниц из HTML.
- Источник `pageCount/total` — ответ API (Strapi), см. раздел 3.5.

### 2.3 Таблица тарифов (billing toggle)
- корень: `data-billing`
- текстовые узлы: `data-billing-text` + `data-monthly` / `data-yearly`

### 2.4 Сайдбар/меню → переключение панелей
- корень: `data-switcher` + `data-switcher-default="key"`
- триггеры: `data-switch-trigger` + `data-switch-key="..."`
- панели: `data-switch-panel` + `data-switch-key="..."`

### 2.5 Load more (список)
- корень: `data-loadmore` + `data-loadmore-visible="N"`
- список: `data-loadmore-list`
- элементы: `data-loadmore-item`
- кнопка: `data-loadmore-button`

### 2.6 Контакты/карта
- корень: `data-contact-hub`
- точки: `data-contact-marker` + `data-contact-id` + `data-contact-category`
- карточки: `data-contact-item` + `data-contact-id` + `data-contact-category` (+ `data-lat/data-lng` для реальной карты)

## 3) События (для CMS)
CMS может слушать события на `document` и выполнять загрузку/роутинг/подстановку данных.

### 3.1 `mgts:open` (cancelable) — главный хук роутинга/модалок
Триггерится при клике/Enter/Space на элементах с `data-modal-open` или `data-route-open`.

- **Отменяемое**: `event.preventDefault()` отменяет дефолтное действие (открыть модалку или навигацию).
- `event.detail`:
  - `openMode`: `"modal"` или `"navigate"`
  - `modalId`: строка или `null`
  - `url`: строка или `null`
  - `contentType`: строка или `null`
  - `contentId`: строка или `null`

Рекомендуемый паттерн:
- если CMS хочет **открывать отдельную страницу вместо модалки**:
  - ловим `mgts:open`, проверяем `contentType`, вызываем `preventDefault()`, делаем `navigate(url)` своим роутером.

### 3.2 `mgts:choiceChange`
Испускается `data-choice-group` при смене активного пункта.
- `detail.index`, `detail.text`

### 3.3 `mgts:billingChange`
Испускается `data-billing` при переключении monthly/yearly.
- `detail.cycle` = `"monthly" | "yearly"`

### 3.4 `mgts:switch`
Испускается `data-switcher` при смене панели.
- `detail.key`

### 3.5 Pagination contract (Strapi list → UI)
Для страниц/блоков со списками (news/documents/search results) backend должен отдавать:
- `meta.pagination.page`
- `meta.pagination.pageSize`
- `meta.pagination.pageCount`
- `meta.pagination.total`

UI использует эти значения, чтобы:
- отрисовать доступные страницы/стрелки
- запрашивать следующую страницу (через URL `?page=` или через API `pagination[page]=...`)

## 4) Где смотреть актуальную “карту интерактива”
- Аудит хуков по страницам: `docs/project/CMS_INTERACTIONS_AUDIT.md`
- Код: `design/cms_loader/cms-loader.js`

## 5) Пример CMS адаптера
Если нужно быстро проверить интеграцию на стороне CMS (роутинг/подстановка данных), см.:
- `design/cms_loader/cms-adapter-example.js`
