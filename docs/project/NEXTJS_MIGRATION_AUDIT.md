# Next.js Migration Audit (Baseline)

**Дата:** 2026-02-19  
**Цель:** зафиксировать текущие шаблоны, маршруты и динамические поведения, чтобы обеспечить полную паритетность при переходе на Next.js.

---

## 1) Инвентаризация шаблонов (HTML)

**Канонические шаблоны (TPL_*)** из `design/html_pages/`:
- `tpl_home.html` — главная
- `tpl_segment_landing.html` — лендинги сегментов (developers/operators/government/business/partners/services)
- `tpl_service.html` — страницы услуг (все сервисные слуги)
- `tpl_scenario.html` — сценарии `/services/scenario-*`
- `tpl_deepnav.html` — страницы с левой навигацией (о компании, документы и др.)
- `tpl_cms_page.html` — generic deepnav (часть страниц контента)
- `tpl_doc_page.html` — документы (tabs + files table)
- `tpl_contact_hub.html` — контакт‑хаб
- `tpl_news_list.html` — новости (список)
- `tpl_news_detail.html` — новости (деталка)
- `tpl_news_archive.html` — архив новостей
- `tpl_search_results.html` — результаты поиска
- `tpl_form_page.html` — формы (обратная связь и др.)
- `tpl_ai_chat.html` — AI‑чат

**Вспомогательные / демо шаблоны:**
`page_*`, `code_*.html` (используются как dev‑референсы/демо‑страницы).

---

## 2) Маппинг маршрутов (целевые URL)

**Главные сегменты:**
- `/` → `tpl_home.html`
- `/developers`, `/operators`, `/government`, `/business`, `/partners` → `tpl_segment_landing.html`
- `/services` → `tpl_segment_landing.html` (каталог)

**Сценарии:**
- `/services/scenario-connecting-object`
- `/services/scenario-infrastructure-360`
- `/services/scenario-safe-object`
- `/services/scenario-connectivity-data`
- `/services/scenario-video-access`
- `/services/scenario-network-ops`
→ все через `tpl_scenario.html`

**Услуги (обобщенно):**
Все сервисные страницы (например `/business/access_internet`, `/government/digital_services/*`, `/operators/infrastructure/*` и т.д.) → `tpl_service.html`

**О компании / Документы / DeepNav:**
Большинство страниц из блока “О компании” и части регуляторики → `tpl_deepnav.html` или `tpl_cms_page.html` (по факту в CMS loader)

**Контакты / новости / формы / поиск / AI‑чат:**
- `/contact` → `tpl_contact_hub.html`
- `/news` → `tpl_news_list.html`
- `/news/*` → `tpl_news_detail.html`
- `/news/archive` → `tpl_news_archive.html`
- `/search` → `tpl_search_results.html`
- `/ai-chat` → `tpl_ai_chat.html`
- `/partners_feedback_form`, `/single_hotline` и др. формы → `tpl_form_page.html`

---

## 3) Динамические поведения (CMS Loader)

**Loader‑модули** из `design/cms_loader/loader/`:
- `core.js` — общие утилиты, fetch, базовые хуки, старт
- `top-menu.js` — верхнее меню (mainMenuItems) + переключатель темы
- `mega-menu.js` — mega‑menu + CTA + иконки из Strapi
- `footer.js` — футер
- `components.js` — общие UI‑интеракции (tabs, dropdown, modal, accordion и др.)

**Adapter‑модули** из `design/cms_loader/adapter/`:
- `core.js` — общие утилиты, deepnav sidebar, media helpers
- `pages.js` — шаблонная логика рендера
- `sections.js` — рендер `page.sections` (Dynamic Zones)
- `news.js`, `documents.js`, `service.js`, `tariffs.js` — страничные модули

**Ключевые интеракции (паритет обязательный):**
- Mega‑menu (hover/click, категории, CTA, иконки)
- Tabs / ChoiceGroup / Dropdown
- Modal / Document preview
- Accordion (details)
- Carousel (horizontal scroll)
- Form behaviors / CTA routing

---

## 4) Strapi источники данных

Основные API:
- `/api/navigation` — header + mega‑menu (icons, CTA)
- `/api/footer` — footer
- `/api/pages/by-slug` — страницы и dynamic zones
- `/api/news/*` — новости
- `/api/icons` — библиотека иконок (SVG превью)

---

## 5) Вывод для Next.js

Для полного перехода на Next.js требуется:
1) Перевести шаблоны TPL_* в React‑компоненты при строгом сохранении классов.  
2) Реализовать динамические зоны (page.sections) и базовые UI‑интеракции в React.  
3) Перенести mega‑menu/nav/footer на Strapi‑данные (без loader‑мутаций DOM).  
4) Сохранить текущие маршруты и SEO‑структуру.

