# Аудит интерактивных элементов (для CMS интеграции)

Источник: `design/html_pages/*.html`

Легенда: показываю наличие `data-*` хуков (каноника) по страницам/шаблонам.

## `_canonical_shell.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`

## `page_career.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-loadmore`

## `page_ceo_feedback.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-modal`
  - `data-modal-open`
- **modals**: `ceo-video-modal`

## `page_dropdown_demo.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-dropdown`

## `page_modal_demo.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-modal`
  - `data-modal-open`

## `page_tabs_demo.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-tabs`
  - `data-carousel`

## `tpl_ai_chat.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`

## `tpl_contact_hub.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-choice-group`
  - `data-contact-hub`

## `tpl_doc_page.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-modal`
  - `data-modal-open`
  - `data-route-open`
  - `data-choice-group`
- **modals**: `mgts-news-detail-modal`
- **modals**: `mgts-video-material-modal`

## `tpl_form_page.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`

## `tpl_home.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-modal`
  - `data-modal-open`
  - `data-route-open`
- **modals**: `mgts-news-detail-modal`

## `tpl_news_list.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-modal`
  - `data-modal-open`
  - `data-route-open`
  - `data-choice-group`
- **modals**: `mgts-news-detail-modal`
- **modals**: `mgts-video-material-modal`

## `tpl_scenario.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-dropdown`
  - `data-switcher`

## `tpl_search_results.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-choice-group`

## `tpl_segment_landing.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`

## `tpl_service.html`
- **hooks**:
  - `data-mega-root`
  - `data-mega-trigger`
  - `data-dropdown`
  - `data-billing`

---

## Page-specific overrides / init (adapter)
Цель: перенести/реализовать логику из `cms-adapter-example.js` в реальный адаптер CMS.
Prod адаптер заготовлен: `design/cms_loader/cms-adapter.js` (пока не подключен).

- [ ] `tpl_news_list` — загрузка списка, теги, пагинация, поведение `mgts:open` (example: [x], prod: [x])
- [ ] `tpl_news_archive` — список + годы, скрыть docs-блок, поведение `mgts:open` (example: [x], prod: [x])
- [ ] `tpl_news_detail` — рендер детальной новости по slug (example: [x], prod: [x])
- [ ] `tpl_cms_page` — рендер страницы с deep nav (example: [x], prod: [x])
- [ ] `tpl_service` — рендер секций услуги (тарифы/FAQ/CTA) (example: [x], prod: [x])
- [ ] `tpl_doc_page` — files-table + preview modal + фильтры/пагинация (example: [x], prod: [x])
- [ ] `tpl_contact_hub` — locations + карта + категории (example: [x], prod: [x])
- [ ] `tpl_home` — рендер главной (контентные блоки) (example: [x], prod: [x])
- [ ] `tpl_segment_landing` — рендер сегментных страниц (example: [x], prod: [x])
- [ ] `tpl_scenario` — рендер сценариев (example: [x], prod: [x])

