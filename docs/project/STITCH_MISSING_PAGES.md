# Статус страниц по Stitch

## 1) Готовые полноэкранные страницы (уже есть)
- `/ai-chat` → `ai_assistant_landing_page`
- `/career` → `careers_and_recruitment_page`
- `/contact` → `contacts_with_interactive_3d_map`
- `/general_director_message` → `ceo_address_and_feedback_page`
- `/search` → `search_results_layout`

## 2) Страницы для сборки из блоков (новая генерация не обязательна)
### TPL_Home
- `/`

### TPL_Segment_Landing
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
- `/services/scenario-connecting-object`
- `/services/scenario-connectivity-data`
- `/services/scenario-infrastructure-360`
- `/services/scenario-network-ops`
- `/services/scenario-safe-object`
- `/services/scenario-video-access`

### TPL_Service
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

### TPL_News_List
- `/news`
- `/offers`

### TPL_Contact_Hub
- `/contact`
- `/contact_details`

### TPL_Form_Page
- `/operators/contact_for_operators`

### TPL_DeepNav
> Шаблон “контентная страница с deep‑nav”: слева SidebarNav (desktop) / dropdown-accordion (mobile),
> справа — **любой набор** контентных блоков (может быть несколько), опционально CTA‑форма перед футером.

#### DeepNav: О компании (sidebarNavKey=about)
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

#### DeepNav: Документы (sidebarNavKey=documents)
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

#### DeepNav: Раскрытие информации (sidebarNavKey=disclosure)
- `/disclosure`
- `/essential_facts`
- `/affiliated_persons`
- `/stocks_reports`
- `/reports`
- `/emission`

### TPL_Doc_Page
- `/bank_details`
- `/partners/documents`
- `/partners/procedure_admission_work`
- `/partners/purchas`
- `/partners/ramochnie_dogovori`
- `/partners/realization`
- `/partners/tariffs`
- `/terms`

## 3) Нужные новые паттерны/шаблоны (генерация в Stitch)
- File list (строки с типом файла + действия)
- Document preview in page (встроенный предпросмотр)
- Sitemap list (структурный список ссылок)
- TPL_News_Detail (детальная страница новости/акции)

## 4) Неклассифицированные страницы (нужно вручную отнести к шаблону)
- `/partners/creating_work_order`
- `/sitemap`
- `/virtual_ate`
