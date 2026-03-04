# Implementation Backlog (single source of truth)

Цель: иметь **один** список “что поддерживаем/рендерим/интегрируем” и двигаться по нему последовательно.

## Источники правды (уже есть в репо)

- **Routes → Templates → Stitch blocks**: `docs/project/PAGE_BLOCK_MAPPING.md` + `scripts/stitch/build_html_pages.py`
- **Routes → контент → CMS поля (план миграции/интеграции)**: `docs/project/PAGE_CONTENT_MAPPING.md`
- **Целевая модель Strapi (компоненты/динамические зоны)**: `docs/project/CMS_TARGET_SCHEMA.md`
- **Фактический список Dynamic Zone компонентов**: `mgts-backend/src/api/page/content-types/page/schema.json` (`Page.sections.components`)
- **Фактический прогресс по данным** (что реально встречается в базе): `GET /api/pages/sections-stats`

## 1) Templates (TPL_*) — “что должно уметь”

Смотри полный состав блоков в `PAGE_BLOCK_MAPPING.md`. На уровне CMS/рендера сейчас важно:

- **TPL_Home**: hero + promo/services + news preview
- **TPL_Segment_Landing**: hero + карточки сервисов/сценариев
- **TPL_Service**: hero + тарифы/таблицы + FAQ + lead form
- **TPL_Scenario**: hero + sidebar switcher + контент по панелям + FAQ
- **TPL_Doc_Page**: таблицы/файлы/табы + пагинация/поиск + preview modal
- **TPL_Contact_Hub**: локации + карта (markers/list sync)
- **TPL_News_List / TPL_News_Detail**: list + filters + pagination / detail + seo
- **TPL_DeepNav**: left sidebar tree (deepNavKey) + contentBlocks[] + optional CTA

## 2) Strapi Page.sections Dynamic Zone — полный список компонентов

Источник: `mgts-backend/src/api/page/content-types/page/schema.json`

- `page.section-text` ✅ (рендер в `tpl_cms_page`)
- `page.section-cards` ✅ (рендер в `tpl_cms_page`)
- `page.section-grid` ✅ (рендер в `tpl_cms_page`)
- `page.section-table` ✅ (рендер в `tpl_cms_page`)
- `page.tariff-table` ✅ (рендер в `tpl_cms_page` + маппинг в `tpl_service`)
- `page.service-faq` ✅ (рендер в `tpl_cms_page` + маппинг в `tpl_service`)
- `page.document-tabs` ✅ (рендер в `tpl_cms_page`)
- `page.history-timeline` ✅ (рендер в `tpl_cms_page`)
- `page.image-carousel` ✅ (рендер в `tpl_cms_page`, каноника `data-carousel`)
- `page.image-switcher` ✅ (рендер в `tpl_cms_page`, каноника `data-switcher`)
- `page.section-map` ✅ (рендер в `tpl_cms_page`, Яндекс.Карты через `window.ymaps`)
- `page.files-table` ✅ (рендер в `tpl_cms_page`)
- `page.crm-cards` ✅ (рендер в `tpl_cms_page`)
- `page.how-to-connect` ✅ (рендер в `tpl_cms_page`)
- `page.service-tabs` ✅ (рендер в `tpl_cms_page`, каноника `data-switcher`)
- `page.service-order-form` ✅ (рендер в `tpl_cms_page` + маппинг в `tpl_service`)

Легенда:
- ✅ реализовано в текущем демо-рендерере (`design/html_pages/tpl_cms_page.html` + `design/cms_loader/cms-adapter-example.js`)
- ⏳ нужно реализовать (и/или начать наполнять импортом в Strapi)

## 3) Канонические интерактивные модули (frontend)

Источник: `design/cms_loader/cms-loader.js` + `docs/project/CMS_INTEGRATION_CONTRACT.md`

- choiceGroup / switch / accordion / dropdown / loadMore / billingToggle / switcher / contactHubMap / modal ✅
- router hook (`mgts:open`, `data-route-open`) ✅
- news list/detail integration ✅

## 4) Практическое ограничение Strapi v5 по populate для Dynamic Zone (важно)

HTTP query вида `populate[sections]=*` **нельзя** — Dynamic Zone требует `on` fragments.
Поэтому для аналитики/экспорта используем:
- либо специальные endpoints (как `/api/pages/sections-stats`)
- либо server-side `entityService` в скриптах/контроллерах

## 5) Рекомендуемая последовательность закрытия (предложение)

1. **TPL_DeepNav / CMS Page renderer**: добить топовые секции по статистике + DeepNav UX
2. **TPL_Service**: тарифная таблица + FAQ + формы (и начать наполнять 1–2 сервисные страницы структурными секциями)
3. **TPL_Doc_Page**: files-table/document-tabs + pagination/filter + preview routing (modal vs page)
4. **TPL_Contact_Hub**: locations + map backend schema + интерактив

