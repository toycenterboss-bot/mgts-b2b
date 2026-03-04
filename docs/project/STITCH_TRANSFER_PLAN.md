# План работы в Stitch (без переноса в Penpot)

Источник: `design/stitch_header_and_mega_menu 2/` (основной набор, более полный)

## 1) Что уже покрыто в Stitch (по папкам)
- Навигация: `header_and_mega_menu`, `dropdown_and_menu_states`
- Аккордеоны/сайдбар: `accordions_and_sidebar_ui_1`, `accordions_and_sidebar_ui_2`
- Чат: `ai_chat_widget_and_panel_*`, `ai_chat_proactive_popup`
- AI-чат лендинг: `ai_assistant_landing_page`
- Формы/опросы: `b2b_survey_and_feedback_form`
- Иконки: `b2b_svg_icon_collection`
- Кнопки/инпуты/состояния: `button_and_input_states`
- Core UI компоненты: `core_ui_components_sheet` (breadcrumbs, badges/chips, lists, radio, checkbox, file upload)
- Карьера: `careers_and_recruitment_page`
- Карусели/табы: `carousel_and_tab_components`
- Страница CEO/обратная связь: `ceo_address_and_feedback_page`
- Hero‑варианты: `cloud_solutions_hero_variant`, `connectivity_hero_variant`,
  `cybersecurity_hero_variant`, `developers_industry_hero`, `general_business_hero`,
  `government_sector_hero`, `partners_program_hero`, `telecom_operators_hero`
- Контакты/карта: `contacts_with_interactive_3d_map`
- Превью документов: `document_preview_modal`
- Footer + контактная форма: `footer_and_contact_form`
- Hero + CTA: `hero_section_and_cta_banner_1`, `hero_section_and_cta_banner_2`
- Временная шкала: `interactive_company_history_timeline`
- Модалки: `modals_and_confirmations`
- Новости/документы: `news_and_documents_list_1`, `news_and_documents_list_2`
- Пагинация: `pagination_and_display_controls`
- Таблицы/прайс: `pricing_and_specs_table`
- Скелетоны: `pricing_table_skeleton_loader`, `service_cards_skeleton_loader`
- Search results layout: `search_results_layout`
- Поиск + логотипы: `search_and_partner_logos_1`, `search_and_partner_logos_2`
- Карточки услуг/сценариев: `service_and_scenario_cards_1`, `service_and_scenario_cards_2`
- Фоны/сезонные темы: `text_section_with_*_background`,
  `text_section_with_summer_tech_background`, `text_section_with_winter_tech_background`

## 1.1) Уже готовые страницы/шаблоны (можно брать без генерации)
- AI‑chat landing: `ai_assistant_landing_page`
- Карьера: `careers_and_recruitment_page`
- Обращение CEO + форма: `ceo_address_and_feedback_page`
- Результаты поиска: `search_results_layout`
- Контакты/карта: `contacts_with_interactive_3d_map`

## 2) План генерации и упаковки HTML (что → куда)
### 3.1 UI Kit (Stitch)
- Header/Desktop + Menu/Top + Menu/Mega → `header_and_mega_menu`
- Dropdown/Select + Menu states → `dropdown_and_menu_states`
- Button/Primary + Button/Secondary + Input/States → `button_and_input_states`
- Accordion/Item + Menu/Sidebar → `accordions_and_sidebar_ui_*`
- Tabs + Carousel/Slider → `carousel_and_tab_components`
- Modal/Base + Modal/Confirm → `modals_and_confirmations`
- Document Preview Modal → `document_preview_modal`
- AI/Chat Widget + AI/Chat Panel + Proactive Popup → `ai_chat_widget_and_panel_*`, `ai_chat_proactive_popup`
- Search/Input + Logo Wall → `search_and_partner_logos_*`
- Card/Service + Card/Scenario → `service_and_scenario_cards_*`
- Card/News + Document List → `news_and_documents_list_*`
- Table/Base + Pricing → `pricing_and_specs_table`
- Pagination → `pagination_and_display_controls`
- Footer/Desktop + Contact Form → `footer_and_contact_form`
- Icon set → `b2b_svg_icon_collection`
- Skeleton loaders → `pricing_table_skeleton_loader`, `service_cards_skeleton_loader`

### 3.2 Шаблоны страниц (Stitch)
- `TPL_Home`: hero + CTA → `hero_section_and_cta_banner_*`
- `TPL_Service`: service cards + table + FAQ → `service_and_scenario_cards_*`, `pricing_and_specs_table`, `accordions_and_sidebar_ui_*`
- `TPL_DeepNav`: deep‑nav layout (левый sidebar + mobile dropdown/accordion) + **content slot справа**
  - справа может быть **несколько блоков** (например, весь контент `ceo_address_and_feedback_page`)
  - опционально `CTA form` **под контентом** и **перед футером**
- `TPL_Segment_Landing`: hero variants → sector hero folders
- `TPL_News_List` / `TPL_News_Detail`: `news_and_documents_list_*`
- `TPL_Contact_Hub`: `contacts_with_interactive_3d_map` + `footer_and_contact_form`
- `TPL_Career_List/Detail`: `careers_and_recruitment_page`
- `TPL_Doc_Page`: (простые контентные страницы без deep‑nav) `news_and_documents_list_*` + `document_preview_modal`
- `TPL_AI_Chat`: `ai_chat_widget_and_panel_*`

### 3.3 Экспорт в CMS
- Сохранять HTML по блокам (секциям), а не целиком страницей
- Для каждого блока: `block.html` + список используемых ассетов
- Собирать страницы в CMS из готовых блоков без правок стилей

## 3) Очередность генерации (рекомендуемая)
1) Header + Button/Input states
2) Hero + CTA
3) Cards (Service/Scenario/News)
4) Footer + Form
5) Table + Pagination
6) Accordion + Sidebar
7) AI Chat + Document Preview
8) Seasonal backgrounds

## 4) Что вероятно нужно додизайнить
- File list (строки с типом файла + действия)
- Паттерн “Document preview in page” (не модалка)
- TPL_DeepNav layout: SidebarNav (desktop) + dropdown/accordion (mobile) + content slot справа

## 5) План батчей генерации (лимит ~320)
Цель: закрыть недостающие паттерны и получить 1–2 варианта ключевых шаблонов.

### Батч 1 — Недостающие паттерны (приоритет)
- File list (ряд файла: тип/размер/дата/действия)
- Document preview in page (встроенный предпросмотр)
- News detail view (открытие новости по клику: отдельный экран или модалка)
- Video material view (открытие видео по клику: отдельный экран или модалка)
- Sitemap list (структурный список ссылок)

### Батч 2 — Шаблонные страницы (минимальный набор)
- TPL_Doc_Page (документы/политики)
- TPL_Form_Page (форма/заявка)
- TPL_Service (страница услуги)
- TPL_Scenario (страница сценария)
- TPL_DeepNav (О компании / Документы / Раскрытие: deep‑nav слева + контент справа)

### Батч 3 — Альтернативы/вариативность (если есть бюджет)
- TPL_Segment_Landing (вариант каталога)
- TPL_News_Detail (детальная новость/акция)
- Доп. варианты CTA/hero
