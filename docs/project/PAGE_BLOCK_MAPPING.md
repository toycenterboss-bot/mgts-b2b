# Маппинг страниц → HTML-блоки (Stitch)

Источники:
- `design/html_pages/*.html` (атрибут `data-stitch-block`)
- `docs/project/STITCH_MISSING_PAGES.md` (routes → шаблоны)

## 0) Канонический каркас страницы (обязательные элементы) и опциональные обвязки

Мы разделяем **layout‑каркас** и **контентные блоки**:

- **Канонические (обязательные на каждой странице):**
  - `header` (верхнее меню) + `mega-menu`
  - `breadcrumbs`
  - `footer`
- **Опциональные (обвязки вокруг контента):**
  - `sidebarNav` — всегда **слева**, влияет на всю область контента
  - `ctaForm` — если есть, то **под контентом** и **перед футером**

Правило компоновки (инвариант):

- Сверху контентная область ограничена `hero` (если у страницы есть hero).
- Слева контентная область может быть ограничена `sidebarNav`.
- Снизу контентная область ограничена `footer`, либо `ctaForm + footer`.

Важно: внутри **контентной области справа** допускается **любое количество** блоков (например, для страниц типа `page_ceo_feedback` это может быть hero + контент + видео + форма и т.п.).

## 1) Шаблоны (TPL_*) → какие блоки входят

### TPL_Home
- **assembled page**: `tpl_home.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `hero_section_and_cta_banner_1`
  - `service_and_scenario_cards_1`
  - `news_and_documents_list_1`
  - `footer_and_contact_form`

### TPL_Segment_Landing
- **assembled page**: `tpl_segment_landing.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `developers_industry_hero`
  - `service_and_scenario_cards_2`
  - `footer_and_contact_form`
- **routes**:
  - `/business`
  - `/developers`
  - `/government`
  - `/government/all_services`
  - `/operators`
  - `/operators/all_services`
  - `/partners`
  - `/partners/all_services`
  - `/services`

### TPL_Scenario
- **assembled page**: `tpl_scenario.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `connectivity_hero_variant`
  - `service_and_scenario_cards_1`
  - `accordions_and_sidebar_ui_2`
  - `footer_and_contact_form`
- **routes**:
  - `/services/scenario-connecting-object`
  - `/services/scenario-connectivity-data`
  - `/services/scenario-infrastructure-360`
  - `/services/scenario-network-ops`
  - `/services/scenario-safe-object`
  - `/services/scenario-video-access`

### TPL_Service
- **assembled page**: `tpl_service.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `hero_section_and_cta_banner_2`
  - `pricing_and_specs_table`
  - `accordions_and_sidebar_ui_1`
  - `footer_and_contact_form`
- **routes**:
  - `/business/access_internet`
  - `/business/digital_television`
  - `/business/equipment_setup`
  - `/business/equipment_setup/computer_help`
  - `/business/mobile_connection`
  - `/business/payment_methods`
  - `/business/security_alarm`
  - `/business/telephony`
  - `/business/video_surveillance_office`
  - `/developers/compensation_for_losses`
  - `/developers/connecting_objects`
  - `/developers/connecting_objects/connecting_commercial`
  - `/developers/connecting_objects/connecting_construction`
  - `/developers/connecting_objects/connecting_residential`
  - `/developers/digital_solutions`
  - `/government/communications_infrastructure`
  - `/government/communications_infrastructure/external_communication`
  - `/government/communications_infrastructure/local_computing_network`
  - `/government/communications_infrastructure/network_operation`
  - `/government/communications_infrastructure/structured_cabling_networks`
  - `/government/customized_solutions`
  - `/government/digital_services`
  - `/government/digital_services/access_control_systems`
  - `/government/digital_services/automated_control_systems`
  - `/government/digital_services/automated_system_monitoring_accounting`
  - `/government/digital_services/entrance_video_surveillance`
  - `/government/digital_services/equipment`
  - `/government/digital_services/introduction_security_tv_systems`
  - `/government/digital_services/main_and_backup_data_transmission`
  - `/government/digital_services/maintenance_interface_device`
  - `/government/digital_services/speakerphone`
  - `/government/digital_services/video_surveillance_building`
  - `/government/digital_services/video_surveillance_maintenance`
  - `/operators/data_transfer`
  - `/operators/infrastructure`
  - `/operators/infrastructure/accommodation_at_sites`
  - `/operators/infrastructure/avr_ppr`
  - `/operators/infrastructure/lks_kr`
  - `/operators/infrastructure/pir_smr_mgts`
  - `/operators/joining_and_passing_traffic`
  - `/operators/nondiscriminatory_access`

### TPL_DeepNav
- **assembled page**: `tpl_deepnav.html`
- **blocks (order)**:
  - (нет данных — файл не найден или не содержит `data-stitch-block`)
- **routes**:
  - `/about_mgts`
  - `/mgts_values`
  - `/general_director_message`
  - `/mgts_compliance_policies`
  - `/interaction_with_partners`
  - `/partners_feedback_form`
  - `/single_hotline`
  - `/principles_corporate_manage`
  - `/corporate_documents`
  - `/decisions_meetings_shareholders`
  - `/infoformen`
  - `/about_registrar`
  - `/documents`
  - `/licenses`
  - `/forms_doc`
  - `/operinfo`
  - `/wca`
  - `/stockholder_copies_document`
  - `/timing_malfunctions`
  - `/data_processing`
  - `/cookie_processing`
  - `/labor_safety`
  - `/disclosure`
  - `/essential_facts`
  - `/affiliated_persons`
  - `/stocks_reports`
  - `/reports`
  - `/emission`

### TPL_News_List
- **assembled page**: `tpl_news_list.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `news_and_documents_list_2`
  - `pagination_and_display_controls`
  - `footer_and_contact_form`
- **routes**:
  - `/news`
  - `/offers`

### TPL_Contact_Hub
- **assembled page**: `tpl_contact_hub.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `contacts_with_interactive_3d_map`
  - `footer_and_contact_form`
- **routes**:
  - `/contact`
  - `/contact_details`

### TPL_Form_Page
- **assembled page**: `tpl_form_page.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `b2b_survey_and_feedback_form`
  - `footer_and_contact_form`
- **routes**:
  - `/operators/contact_for_operators`

### TPL_Doc_Page
- **assembled page**: `tpl_doc_page.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `news_and_documents_list_1`
  - `pagination_and_display_controls`
  - `footer_and_contact_form`
- **routes**:
  - `/bank_details`
  - `/partners/documents`
  - `/partners/procedure_admission_work`
  - `/partners/purchas`
  - `/partners/ramochnie_dogovori`
  - `/partners/realization`
  - `/partners/tariffs`
  - `/terms`

## 2) Готовые полноэкранные страницы (page_*)

### `/ai-chat`
- **stitch source**: `ai_assistant_landing_page`
- **assembled page**: `tpl_ai_chat.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `ai_assistant_landing_page`
  - `footer_and_contact_form`

### `/career`
- **stitch source**: `careers_and_recruitment_page`
- **assembled page**: `page_career.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `careers_and_recruitment_page`
  - `footer_and_contact_form`

### `/contact`
- **stitch source**: `contacts_with_interactive_3d_map`
- **assembled page**: `tpl_contact_hub.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `contacts_with_interactive_3d_map`
  - `footer_and_contact_form`

### `/general_director_message`
- **stitch source**: `ceo_address_and_feedback_page`
- **assembled page**: `page_ceo_feedback.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `ceo_address_and_feedback_page`
  - `footer_and_contact_form`

### `/search`
- **stitch source**: `search_results_layout`
- **assembled page**: `tpl_search_results.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `search_results_layout`
  - `footer_and_contact_form`

## 3) Собранные страницы (файлы в `design/html_pages/`)

### `_canonical_shell.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `footer_and_contact_form`

### `page_career.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `careers_and_recruitment_page`
  - `footer_and_contact_form`

### `page_ceo_feedback.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `ceo_address_and_feedback_page`
  - `footer_and_contact_form`

### `page_dropdown_demo.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `dropdown_and_menu_states`
  - `footer_and_contact_form`

### `page_modal_demo.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `document_preview_modal_overlay`
  - `footer_and_contact_form`

### `page_tabs_demo.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `carousel_and_tab_components`
  - `footer_and_contact_form`

### `tpl_ai_chat.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `ai_assistant_landing_page`
  - `footer_and_contact_form`

### `tpl_contact_hub.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `contacts_with_interactive_3d_map`
  - `footer_and_contact_form`

### `tpl_doc_page.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `news_and_documents_list_1`
  - `pagination_and_display_controls`
  - `footer_and_contact_form`

### `tpl_form_page.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `b2b_survey_and_feedback_form`
  - `footer_and_contact_form`

### `tpl_home.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `hero_section_and_cta_banner_1`
  - `service_and_scenario_cards_1`
  - `news_and_documents_list_1`
  - `footer_and_contact_form`

### `tpl_news_list.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `news_and_documents_list_2`
  - `pagination_and_display_controls`
  - `footer_and_contact_form`

### `tpl_scenario.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `connectivity_hero_variant`
  - `service_and_scenario_cards_1`
  - `accordions_and_sidebar_ui_2`
  - `footer_and_contact_form`

### `tpl_search_results.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `search_results_layout`
  - `footer_and_contact_form`

### `tpl_segment_landing.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `developers_industry_hero`
  - `service_and_scenario_cards_2`
  - `footer_and_contact_form`

### `tpl_service.html`
- **blocks (order)**:
  - `header_and_mega_menu`
  - `breadcrumbs`
  - `hero_section_and_cta_banner_2`
  - `pricing_and_specs_table`
  - `accordions_and_sidebar_ui_1`
  - `footer_and_contact_form`

## 4) Неклассифицированные страницы (требуют ручной привязки)

- `/partners/creating_work_order`
- `/sitemap`
- `/virtual_ate`

## 5) Все routes из TECHNICAL_TASK_NEW_SITE.md (coverage check)

> Это автоматический список для контроля покрытия. Он может содержать routes, которые ещё не собраны/не описаны в Stitch.

- `/about`
- `/about_mgts`
- `/about_registrar`
- `/affiliated_persons`
- `/ai-chat`
- `/bank_details`
- `/business`
- `/business/access_internet`
- `/business/digital_television`
- `/business/equipment_setup`
- `/business/equipment_setup/computer_help`
- `/business/mobile_connection`
- `/business/payment_methods`
- `/business/security_alarm`
- `/business/telephony`
- `/business/video_surveillance_office`
- `/career`
- `/contact`
- `/contact_details`
- `/cookie_processing`
- `/corporate_documents`
- `/data_processing`
- `/decisions_meetings_shareholders`
- `/developers`
- `/developers/compensation_for_losses`
- `/developers/connecting_objects`
- `/developers/connecting_objects/connecting_commercial`
- `/developers/connecting_objects/connecting_construction`
- `/developers/connecting_objects/connecting_residential`
- `/developers/digital_solutions`
- `/disclosure`
- `/documents`
- `/emission`
- `/essential_facts`
- `/forms_doc`
- `/general_director_message`
- `/government`
- `/government/all_services`
- `/government/communications_infrastructure`
- `/government/communications_infrastructure/external_communication`
- `/government/communications_infrastructure/local_computing_network`
- `/government/communications_infrastructure/network_operation`
- `/government/communications_infrastructure/structured_cabling_networks`
- `/government/customized_solutions`
- `/government/digital_services`
- `/government/digital_services/access_control_systems`
- `/government/digital_services/automated_control_systems`
- `/government/digital_services/automated_system_monitoring_accounting`
- `/government/digital_services/entrance_video_surveillance`
- `/government/digital_services/equipment`
- `/government/digital_services/introduction_security_tv_systems`
- `/government/digital_services/main_and_backup_data_transmission`
- `/government/digital_services/maintenance_interface_device`
- `/government/digital_services/speakerphone`
- `/government/digital_services/video_surveillance_building`
- `/government/digital_services/video_surveillance_maintenance`
- `/infoformen`
- `/interaction_with_partners`
- `/labor_safety`
- `/licenses`
- `/mgts_compliance_policies`
- `/mgts_values`
- `/news`
- `/offers`
- `/operators`
- `/operators/all_services`
- `/operators/contact_for_operators`
- `/operators/data_transfer`
- `/operators/infrastructure`
- `/operators/infrastructure/accommodation_at_sites`
- `/operators/infrastructure/avr_ppr`
- `/operators/infrastructure/lks_kr`
- `/operators/infrastructure/pir_smr_mgts`
- `/operators/joining_and_passing_traffic`
- `/operators/nondiscriminatory_access`
- `/operinfo`
- `/partners`
- `/partners/all_services`
- `/partners/creating_work_order`
- `/partners/documents`
- `/partners/procedure_admission_work`
- `/partners/purchas`
- `/partners/ramochnie_dogovori`
- `/partners/realization`
- `/partners/tariffs`
- `/partners_feedback_form`
- `/principles_corporate_manage`
- `/reports`
- `/services`
- `/services/scenario-connecting-object`
- `/services/scenario-connectivity-data`
- `/services/scenario-infrastructure-360`
- `/services/scenario-network-ops`
- `/services/scenario-safe-object`
- `/services/scenario-video-access`
- `/single_hotline`
- `/sitemap`
- `/stockholder_copies_document`
- `/stocks_reports`
- `/terms`
- `/timing_malfunctions`
- `/virtual_ate`
- `/wca`

