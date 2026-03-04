# Stitch → шаблоны страниц (мэппинг по дереву сайта)

Источник дизайн‑ассетов: `design/stitch_header_and_mega_menu 2/`

## 1) Готовые страницы (использовать как есть)
- AI‑chat landing → `ai_assistant_landing_page`
- Карьера → `careers_and_recruitment_page`
- Обращение CEO + форма → `ceo_address_and_feedback_page`
- Результаты поиска → `search_results_layout`
- Контакты/карта → `contacts_with_interactive_3d_map`

## 2) Шаблоны и базовые блоки (из Stitch)
- Header/Mega‑menu → `header_and_mega_menu`
- Footer + contact form → `footer_and_contact_form`
- Hero + CTA → `hero_section_and_cta_banner_1`, `hero_section_and_cta_banner_2`
- Hero variants (сегменты) → `developers_industry_hero`, `telecom_operators_hero`,
  `government_sector_hero`, `general_business_hero`, `partners_program_hero`
- Cards → `service_and_scenario_cards_1`, `service_and_scenario_cards_2`
- FAQ/Accordion → `accordions_and_sidebar_ui_1`, `accordions_and_sidebar_ui_2`
- Таблицы/прайс → `pricing_and_specs_table`
- Новости/документы (листинг) → `news_and_documents_list_1`, `news_and_documents_list_2`
- Пагинация → `pagination_and_display_controls`
- Формы → `b2b_survey_and_feedback_form`
- Док‑превью (модалка) → `document_preview_modal`
- AI‑чат (виджеты) → `ai_chat_widget_and_panel_*`, `ai_chat_proactive_popup`

## 3) Мэппинг по шаблонам сайта
### 3.1 Главная
- `/` → TPL_Home
  - hero + CTA, cards, trust/partners, news, footer

### 3.2 Каталог услуг и сценарии
- `/services` → TPL_Segment_Landing (каталог/фильтры)
- `/services/scenario-*` → TPL_Scenario

### 3.3 Сегментные разделы
- `/developers`, `/operators`, `/government`, `/business`, `/partners`
  → TPL_Segment_Landing + соответствующий hero‑variant

### 3.4 Страницы услуг (единый шаблон услуги)
Использовать TPL_Service для:
- Все страницы услуг в разделах `/business/*`, `/operators/*`, `/government/*`,
  `/developers/*` (кроме очевидных “контентных” страниц)

### 3.5 Новости и акции
- `/news`, `/offers` → TPL_News_List

### 3.6 Контакты и формы
- `/contact` → TPL_Contact_Hub (готовая страница)
- `/contact_details` → TPL_Contact_Hub (вариант без карты/с меньшим набором блоков)
- `/operators/contact_for_operators`
  → TPL_Form_Page (база: `b2b_survey_and_feedback_form`)

### 3.7 Карьера
- `/career` → готовая страница `careers_and_recruitment_page`

### 3.8 AI и поиск
- `/ai-chat` → готовая страница `ai_assistant_landing_page`
- `/search` → готовая страница `search_results_layout`
- `/sitemap` → TPL_Doc_Page (простая структура/листинг ссылок)

### 3.9 Deep‑nav контентные страницы (О компании / Документы / Раскрытие)
Использовать **TPL_DeepNav** для страниц, где требуется:
- слева **SidebarNav** (desktop) и dropdown/accordion (mobile),
- справа **контентная область** с **произвольным количеством блоков**,
- опционально CTA‑форма перед футером.

#### DeepNav: О компании (sidebarNavKey=about)
- `/about_mgts`, `/mgts_values`, `/general_director_message`, `/mgts_compliance_policies`,
  `/interaction_with_partners`, `/partners_feedback_form`, `/single_hotline`,
  `/principles_corporate_manage`, `/corporate_documents`, `/decisions_meetings_shareholders`,
  `/infoformen`, `/about_registrar`
  - примечание: `/general_director_message` использует готовый блок `ceo_address_and_feedback_page` внутри контентной области
  - примечание: `/partners_feedback_form` использует блок формы `b2b_survey_and_feedback_form` внутри контентной области

#### DeepNav: Документы (sidebarNavKey=documents)
- `/documents`, `/licenses`, `/forms_doc`, `/operinfo`, `/wca`, `/stockholder_copies_document`,
  `/timing_malfunctions`, `/data_processing`, `/cookie_processing`, `/labor_safety`

#### DeepNav: Раскрытие информации (sidebarNavKey=disclosure)
- `/disclosure`, `/essential_facts`, `/affiliated_persons`, `/stocks_reports`, `/reports`, `/emission`

### 3.10 Прочие контентные страницы (без deep‑nav)
Использовать TPL_Doc_Page для:
- `/bank_details`, `/terms`

### 3.11 Спорные/граничные страницы (требуют уточнения)
- `/partners/documents`, `/partners/tariffs`, `/partners/ramochnie_dogovori`,
  `/partners/procedure_admission_work`, `/partners/realization`, `/partners/purchas`
  → вероятно TPL_Doc_Page (нужен паттерн “File list”)

## 4) Нужны доп. макеты (пока отсутствуют в Stitch)
- File list (строки с типом файла + действия)
- Document preview in page (не модалка)
- TPL_DeepNav layout: SidebarNav (desktop) + dropdown/accordion (mobile) + content slot справа