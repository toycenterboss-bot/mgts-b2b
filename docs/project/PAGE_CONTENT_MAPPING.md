# Маппинг страниц → контент → поля CMS (draft)

Этот документ **не** полагается на текущие Strapi `schema.json` как на истину.
Источник требований: `docs/project/TECHNICAL_TASK_NEW_SITE.md` + `MGTS_PAGE_ANALYSIS_DIR/*_spec.json` (текущее значение: `/Users/andrey_efremov/Downloads/runs/mgts-backend/data/page-analysis-llm/branches/2026-01-22`).

См. также (опционально): `docs/project/PERPLEXITY_CROSSCHECK.md`.

## 0) Правила группировки (layout vs content)

Для маппинга важно разделять:

- **Layout‑каркас (канонический):** header+mega, breadcrumbs, footer.
- **Опциональные обвязки:** `sidebarNav` (слева) и `ctaForm` (снизу перед footer).
- **Контент справа** — это **массив блоков** (`contentBlocks[]`), их может быть сколько угодно.

Итого: даже если страница “богатая” (например, как `page_ceo_feedback`), она всё равно описывается как hero + `contentBlocks[]` внутри одного layout‑контейнера (с optional `sidebarNav`/`ctaForm`).

## 1) Ожидаемые поля по шаблонам (целевой контракт)

### TPL_Home
- `seo.title / seo.description`
- `hero.title / hero.subtitle / hero.cta`
- `servicesTabs (категории + карточки)`
- `newsPreview (заголовок, список карточек/слайдер)`
- `footer CTA (если не глобальный)`

### TPL_Segment_Landing
- `seo.*`
- `segmentHero (variant)`
- `serviceCards / scenarioCards`
- `filters (если есть)`

### TPL_Scenario
- `seo.*`
- `hero.*`
- `sidebar switcher (menu items)`
- `content panels (per menu item)`
- `FAQ (accordion)`
- `CTA/form`

### TPL_Service
- `seo.*`
- `hero.*`
- `benefits/cards`
- `tariffs/pricing table + billing toggle`
- `FAQ (accordion)`
- `lead form`

### TPL_News_List
- `seo.*`
- `hero.title`
- `news list query (category/year/tag)`
- `pagination state (page/perPage)`

### TPL_Contact_Hub
- `seo.*`
- `locations[] (id, category, title, address, lat, lng, phones, hours)`

### TPL_Form_Page
- `seo.*`
- `form definition (fields + validation + consent)`
- `submit behavior (integration endpoint)`

### TPL_Doc_Page
- `seo.*`
- `content header`
- `sidebar menu (optional)`
- `tabs + file list items (name, url, type, size, updatedAt)`
- `document preview (modal or inline) hook`

### TPL_DeepNav
- `seo.*`
- `hero.* (если применимо)`
- `sidebarNavKey (about|documents|disclosure|...)`
- `contentBlocks[] (упорядоченный список блоков справа от sidebar)`
- `ctaForm (опционально, перед footer)`

## 2) Постраничный маппинг (route → шаблон → источник контента)

> Столбец **Status**: `OK` — spec найден; `MISSING_SPEC` — нет *_spec.json; `NEEDS_REVIEW` — вероятно не тот шаблон/контент.

| Route | Template | Assembled HTML | Spec source | Status | Suggested CMS entity |
|---|---|---|---|---|---|
| `/about` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/about_mgts` | `TPL_DeepNav` | `tpl_deepnav.html` | `index_spec.json` | **OK** | `api::page.page` |
| `/about_registrar` | `TPL_DeepNav` | `tpl_deepnav.html` | `about_registrar_spec.json` | **OK** | `api::page.page` |
| `/affiliated_persons` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/ai-chat` | `READY` | `tpl_ai_chat.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/bank_details` | `TPL_Doc_Page` | `tpl_doc_page.html` | `bank_details_spec.json` | **OK** | `api::page.page` |
| `/business` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `business_spec.json` | **OK** | `api::page.page` |
| `/business/access_internet` | `TPL_Service` | `tpl_service.html` | `access_internet_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/digital_television` | `TPL_Service` | `tpl_service.html` | `digital_television_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/equipment_setup` | `TPL_Service` | `tpl_service.html` | `business_equipment_setup_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/equipment_setup/computer_help` | `TPL_Service` | `tpl_service.html` | `computer_help_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/mobile_connection` | `TPL_Service` | `tpl_service.html` | `mobile_connection_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/payment_methods` | `TPL_Service` | `tpl_service.html` | `business_payment_methods_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/security_alarm` | `TPL_Service` | `tpl_service.html` | `security_alarm_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/telephony` | `TPL_Service` | `tpl_service.html` | `telephony_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/business/video_surveillance_office` | `TPL_Service` | `tpl_service.html` | `video_surveillance_office_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/career` | `READY` | `page_career.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/contact` | `TPL_Contact_Hub` | `tpl_contact_hub.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/contact_details` | `TPL_Contact_Hub` | `tpl_contact_hub.html` | `contact_details_spec.json` | **OK** | `api::page.page` |
| `/cookie_processing` | `TPL_DeepNav` | `tpl_deepnav.html` | `cookie_processing_spec.json` | **OK** | `api::page.page` |
| `/corporate_documents` | `TPL_DeepNav` | `tpl_deepnav.html` | `corporate_documents_spec.json` | **OK** | `api::page.page` |
| `/data_processing` | `TPL_DeepNav` | `tpl_deepnav.html` | `data_processing_spec.json` | **OK** | `api::page.page` |
| `/decisions_meetings_shareholders` | `TPL_DeepNav` | `tpl_deepnav.html` | `decisions_meetings_shareholders_spec.json` | **OK** | `api::page.page` |
| `/developers` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `developers_spec.json` | **OK** | `api::page.page` |
| `/developers/compensation_for_losses` | `TPL_Service` | `tpl_service.html` | `developers_compensation_for_losses_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/developers/connecting_objects` | `TPL_Service` | `tpl_service.html` | `developers_connecting_objects_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/developers/connecting_objects/connecting_commercial` | `TPL_Service` | `tpl_service.html` | `connecting_commercial_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/developers/connecting_objects/connecting_construction` | `TPL_Service` | `tpl_service.html` | `connecting_construction_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/developers/connecting_objects/connecting_residential` | `TPL_Service` | `tpl_service.html` | `connecting_residential_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/developers/digital_solutions` | `TPL_Service` | `tpl_service.html` | `developers_digital_solutions_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/disclosure` | `TPL_DeepNav` | `tpl_deepnav.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/documents` | `TPL_DeepNav` | `tpl_deepnav.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/emission` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/essential_facts` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/forms_doc` | `TPL_DeepNav` | `tpl_deepnav.html` | `forms_doc_spec.json` | **OK** | `api::page.page` |
| `/general_director_message` | `TPL_DeepNav` | `page_ceo_feedback.html` | `general_director_message_spec.json` | **OK** | `api::page.page` |
| `/government` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `government_spec.json` | **OK** | `api::page.page` |
| `/government/all_services` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `government_all_services_spec.json` | **OK** | `api::page.page` |
| `/government/communications_infrastructure` | `TPL_Service` | `tpl_service.html` | `government_communications_infrastructure_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/communications_infrastructure/external_communication` | `TPL_Service` | `tpl_service.html` | `external_communication_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/communications_infrastructure/local_computing_network` | `TPL_Service` | `tpl_service.html` | `local_computing_network_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/communications_infrastructure/network_operation` | `TPL_Service` | `tpl_service.html` | `network_operation_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/communications_infrastructure/structured_cabling_networks` | `TPL_Service` | `tpl_service.html` | `structured_cabling_networks_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/customized_solutions` | `TPL_Service` | `tpl_service.html` | `government_customized_solutions_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services` | `TPL_Service` | `tpl_service.html` | `government_digital_services_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/access_control_systems` | `TPL_Service` | `tpl_service.html` | `access_control_systems_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/automated_control_systems` | `TPL_Service` | `tpl_service.html` | `automated_control_systems_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/automated_system_monitoring_accounting` | `TPL_Service` | `tpl_service.html` | `automated_system_monitoring_accounting_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/entrance_video_surveillance` | `TPL_Service` | `tpl_service.html` | `entrance_video_surveillance_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/equipment` | `TPL_Service` | `tpl_service.html` | `equipment_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/introduction_security_tv_systems` | `TPL_Service` | `tpl_service.html` | `introduction_security_tv_systems_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/main_and_backup_data_transmission` | `TPL_Service` | `tpl_service.html` | `main_and_backup_data_transmission_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/maintenance_interface_device` | `TPL_Service` | `tpl_service.html` | `maintenance_interface_device_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/speakerphone` | `TPL_Service` | `tpl_service.html` | `speakerphone_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/video_surveillance_building` | `TPL_Service` | `tpl_service.html` | `video_surveillance_building_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/government/digital_services/video_surveillance_maintenance` | `TPL_Service` | `tpl_service.html` | `video_surveillance_maintenance_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/infoformen` | `TPL_DeepNav` | `tpl_deepnav.html` | `infoformen_spec.json` | **OK** | `api::page.page` |
| `/interaction_with_partners` | `TPL_DeepNav` | `tpl_deepnav.html` | `interaction_with_partners_spec.json` | **OK** | `api::page.page` |
| `/labor_safety` | `TPL_DeepNav` | `tpl_deepnav.html` | `labor_safety_spec.json` | **OK** | `api::page.page` |
| `/licenses` | `TPL_DeepNav` | `tpl_deepnav.html` | `licenses_spec.json` | **OK** | `api::page.page` |
| `/mgts_compliance_policies` | `TPL_DeepNav` | `tpl_deepnav.html` | `mgts_compliance_policies_spec.json` | **OK** | `api::page.page` |
| `/mgts_values` | `TPL_DeepNav` | `tpl_deepnav.html` | `mgts_values_spec.json` | **OK** | `api::page.page` |
| `/news` | `TPL_News_List` | `tpl_news_list.html` | `news_spec.json` | **OK** | `api::page.page (листинг) + api::news.news (элементы)` |
| `/offers` | `TPL_News_List` | `tpl_news_list.html` | `offers_spec.json` | **OK** | `api::page.page (листинг) + api::news.news (элементы)` |
| `/operators` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `operators_spec.json` | **OK** | `api::page.page` |
| `/operators/all_services` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `operators_all_services_spec.json` | **OK** | `api::page.page` |
| `/operators/contact_for_operators` | `TPL_Form_Page` | `tpl_form_page.html` | `contact_for_operators_spec.json` | **OK** | `api::page.page` |
| `/operators/data_transfer` | `TPL_Service` | `tpl_service.html` | `data_transfer_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operators/infrastructure` | `TPL_Service` | `tpl_service.html` | `` | **MISSING_SPEC** | `api::product.product (или api::page.page + sections)` |
| `/operators/infrastructure/accommodation_at_sites` | `TPL_Service` | `tpl_service.html` | `accommodation_at_sites_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operators/infrastructure/avr_ppr` | `TPL_Service` | `tpl_service.html` | `avr_ppr_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operators/infrastructure/lks_kr` | `TPL_Service` | `tpl_service.html` | `lks_kr_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operators/infrastructure/pir_smr_mgts` | `TPL_Service` | `tpl_service.html` | `pir_smr_mgts_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operators/joining_and_passing_traffic` | `TPL_Service` | `tpl_service.html` | `joining_and_passing_traffic_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operators/nondiscriminatory_access` | `TPL_Service` | `tpl_service.html` | `operators_nondiscriminatory_access_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/operinfo` | `TPL_DeepNav` | `tpl_deepnav.html` | `operinfo_spec.json` | **OK** | `api::page.page` |
| `/partners` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `partners_spec.json` | **OK** | `api::page.page` |
| `/partners/all_services` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `developers_all_services_spec.json` | **NEEDS_REVIEW** | `api::page.page` |
| `/partners/creating_work_order` | `TPL_Form_Page` | `tpl_form_page.html` | `partners_creating_work_order_spec.json` | **OK** | `api::page.page` |
| `/partners/documents` | `TPL_Doc_Page` | `tpl_doc_page.html` | `documents_spec.json` | **OK** | `api::page.page` |
| `/partners/procedure_admission_work` | `TPL_Doc_Page` | `tpl_doc_page.html` | `procedure_admission_work_spec.json` | **OK** | `api::page.page` |
| `/partners/purchas` | `TPL_Doc_Page` | `tpl_doc_page.html` | `purchas_spec.json` | **OK** | `api::page.page` |
| `/partners/ramochnie_dogovori` | `TPL_Doc_Page` | `tpl_doc_page.html` | `partners_ramochnie_dogovori_spec.json` | **OK** | `api::page.page` |
| `/partners/realization` | `TPL_Doc_Page` | `tpl_doc_page.html` | `realization_spec.json` | **OK** | `api::page.page` |
| `/partners/tariffs` | `TPL_Doc_Page` | `tpl_doc_page.html` | `tariffs_spec.json` | **OK** | `api::page.page` |
| `/partners_feedback_form` | `TPL_DeepNav` | `tpl_deepnav.html` | `partners_feedback_form_spec.json` | **OK** | `api::page.page` |
| `/principles_corporate_manage` | `TPL_DeepNav` | `tpl_deepnav.html` | `principles_corporate_manage_spec.json` | **OK** | `api::page.page` |
| `/reports` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/search` | `READY` | `tpl_search_results.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services` | `TPL_Segment_Landing` | `tpl_segment_landing.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services/scenario-connecting-object` | `TPL_Scenario` | `tpl_scenario.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services/scenario-connectivity-data` | `TPL_Scenario` | `tpl_scenario.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services/scenario-infrastructure-360` | `TPL_Scenario` | `tpl_scenario.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services/scenario-network-ops` | `TPL_Scenario` | `tpl_scenario.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services/scenario-safe-object` | `TPL_Scenario` | `tpl_scenario.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/services/scenario-video-access` | `TPL_Scenario` | `tpl_scenario.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/single_hotline` | `TPL_DeepNav` | `tpl_deepnav.html` | `single_hotline_spec.json` | **OK** | `api::page.page` |
| `/sitemap` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/stockholder_copies_document` | `TPL_DeepNav` | `tpl_deepnav.html` | `stockholder_copies_document_spec.json` | **OK** | `api::page.page` |
| `/stocks_reports` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/terms` | `TPL_Doc_Page` | `tpl_doc_page.html` | `` | **MISSING_SPEC** | `api::page.page` |
| `/timing_malfunctions` | `TPL_DeepNav` | `tpl_deepnav.html` | `timing_malfunctions_spec.json` | **OK** | `api::page.page` |
| `/virtual_ate` | `TPL_Service` | `tpl_service.html` | `virtual_ate_spec.json` | **OK** | `api::product.product (или api::page.page + sections)` |
| `/wca` | `TPL_DeepNav` | `tpl_deepnav.html` | `wca_spec.json` | **OK** | `api::page.page` |

## 3) Краткие выжимки по spec (для контроля семантики)

> Это авто‑выжимка. Она помогает увидеть, что мы действительно подцепили нужный spec для route.

### `/about_mgts`
- **spec**: `index_spec.json`
- **title**: 'О МГТС'
- **heroTitle**: 'О МГТС'
- **sectionTypes**: `sidebar, hero, tabs`

### `/about_registrar`
- **spec**: `about_registrar_spec.json`
- **title**: 'О регистраторе ПАО МГТС'
- **heroTitle**: 'О регистраторе ПАО МГТС'
- **sectionTypes**: `breadcrumbs, hero, info-card, text-content, info-card, shares-info, faq`

### `/bank_details`
- **spec**: `bank_details_spec.json`
- **title**: 'Банковские реквизиты'
- **heroTitle**: 'Банковские реквизиты'
- **sectionTypes**: `breadcrumbs, sidebar, hero, information-list`

### `/business`
- **spec**: `business_spec.json`
- **title**: 'Бизнесу'
- **heroTitle**: 'Бизнесу'
- **heroSubtitle**: 'МГТС – готовые решения по организации связи для вашего бизнеса'
- **sectionTypes**: `hero, services, additional-info, advantages, request-form`

### `/business/access_internet`
- **spec**: `access_internet_spec.json`
- **title**: 'Доступ в интернет'
- **heroTitle**: 'Доступ в интернет'
- **sectionTypes**: `breadcrumbs, hero, cards, tariff_cards, accordion, contact_form`

### `/business/digital_television`
- **spec**: `digital_television_spec.json`
- **title**: 'Цифровое телевидение для бизнеса'
- **heroTitle**: 'Цифровое телевидение для бизнеса'
- **heroSubtitle**: 'Качественный видеоконтент для Вас и Ваших клиентов'
- **sectionTypes**: `breadcrumbs, hero, cards, tariffs, process, accordion, contact_form, contact_info`

### `/business/equipment_setup`
- **spec**: `business_equipment_setup_spec.json`
- **title**: 'Настройка оборудования'
- **sectionTypes**: `breadcrumbs, header, sidebar-navigation, sidebar-footer, step-by-step-guide`

### `/business/equipment_setup/computer_help`
- **spec**: `computer_help_spec.json`
- **title**: 'Компьютерная помощь с выездом в офис'
- **heroTitle**: 'Компьютерная помощь с выездом в офис'
- **sectionTypes**: `sidebar, breadcrumbs, hero, services, description, advantages, cta-form, contacts`

### `/business/mobile_connection`
- **spec**: `mobile_connection_spec.json`
- **title**: 'Мобильная связь'
- **heroTitle**: 'Мобильная связь'
- **heroSubtitle**: 'Быстрая передача данных и постоянный доступ к связи'
- **sectionTypes**: `breadcrumbs, hero, cards, tariffs, form, contacts`

### `/business/payment_methods`
- **spec**: `business_payment_methods_spec.json`
- **title**: 'Способы оплаты услуг для ИП и ООО'
- **heroTitle**: 'Способы оплаты услуг для ИП и ООО'
- **heroSubtitle**: 'Узнайте о разнообразных способах оплаты услуг МГТС, доступных как для индивидуальных предпринимателей, так и для юридических лиц. Мы ценим удобство и комфорт наших клиентов'
- **sectionTypes**: `breadcrumbs, hero, content, content, content, content, content, content, cta-form`

### `/business/security_alarm`
- **spec**: `security_alarm_spec.json`
- **title**: 'Охранная сигнализация для офиса'
- **heroTitle**: 'Охранная сигнализация для офиса'
- **heroSubtitle**: 'Комплексное решение для защиты вашего офиса. Оборудование и оперативное реагирование на потенциальные угрозы через связь с центральной станцией мониторинга и службой охраны'
- **sectionTypes**: `hero, content, list, tariffs, tariffs, advantages, accordion`

### `/business/telephony`
- **spec**: `telephony_spec.json`
- **title**: 'Телефония'
- **heroTitle**: 'Телефония'
- **heroSubtitle**: 'Обеспечьте надёжную и гибкую связь с телефонией от МГТС'
- **sectionTypes**: `hero, tariffs, faq, contact-form`

### `/business/video_surveillance_office`
- **spec**: `video_surveillance_office_spec.json`
- **title**: 'Видеонаблюдение для офиса'
- **heroTitle**: 'Видеонаблюдение для офиса'
- **sectionTypes**: `hero, advantages, tariffs, features, accordion, contacts`

### `/contact_details`
- **spec**: `contact_details_spec.json`
- **title**: 'Контактные данные'
- **heroTitle**: 'Контактные данные'
- **sectionTypes**: `breadcrumb, sidebar, hero, contact-card, disclaimer, social-networks`

### `/cookie_processing`
- **spec**: `cookie_processing_spec.json`
- **title**: 'Политика обработки cookies'
- **heroTitle**: 'Политика обработки файлов cookie в ПАО МГТС'
- **sectionTypes**: `sidebar, breadcrumbs, hero, content, content, content, content, content, content, content, content`

### `/corporate_documents`
- **spec**: `corporate_documents_spec.json`
- **title**: 'Корпоративные документы'
- **heroTitle**: 'Корпоративные документы'
- **sectionTypes**: `sidebar, breadcrumbs, hero, tabs`

### `/data_processing`
- **spec**: `data_processing_spec.json`
- **title**: 'Политика обработки персональных данных'
- **heroTitle**: 'Политика «Обработка персональных данных в ПАО МГТС»'
- **sectionTypes**: `sidebar, hero, content, content, content, content, content, content, tags, content, content, list, content, content, content, content, content, content, content, content, content, list, content, content, content, content`

### `/decisions_meetings_shareholders`
- **spec**: `decisions_meetings_shareholders_spec.json`
- **title**: 'Решения общих собраний акционеров'
- **heroTitle**: 'Решения общих собраний акционеров'
- **sectionTypes**: `breadcrumbs, hero, documents-list`

### `/developers`
- **spec**: `developers_spec.json`
- **title**: 'Застройщикам'
- **heroTitle**: 'Застройщикам'
- **sectionTypes**: `hero, services, advantages, request-form`

### `/developers/compensation_for_losses`
- **spec**: `developers_compensation_for_losses_spec.json`
- **title**: 'Компенсация убытков при выносе и/или ликвидации сооружений связи ПАО МГТС'
- **heroTitle**: 'Компенсация убытков при выносе и/или ликвидации сооружений связи ПАО МГТС'
- **heroSubtitle**: 'Компенсация убытков при ликвидации, перемещении или реконструкции объектов связи, принадлежащих ПАО МГТС, заказчиком (застройщиком), финансируемым из федерального бюджета, бюджета города Москвы или собственных средств'
- **sectionTypes**: `breadcrumbs, hero, sidebar-content, documents, forms, accordion`

### `/developers/connecting_objects`
- **spec**: `developers_connecting_objects_spec.json`
- **title**: 'Подключение объектов недвижимости к сетям связи'
- **heroTitle**: 'Подключение объектов недвижимости к сетям связи'
- **heroSubtitle**: 'Городской инфраструктурный оператор с самой обширной оптической сетью в России'
- **sectionTypes**: `breadcrumbs, hero, services, advantages, request-form`

### `/developers/connecting_objects/connecting_commercial`
- **spec**: `connecting_commercial_spec.json`
- **title**: 'Подключение объектов коммерческой недвижимости'
- **heroTitle**: 'Подключение объектов коммерческой недвижимости'
- **sectionTypes**: `breadcrumbs, hero, services, request-form`

### `/developers/connecting_objects/connecting_construction`
- **spec**: `connecting_construction_spec.json`
- **title**: 'Подключение объектов строительства и реконструкции к сетям электросвязи'
- **heroTitle**: 'Подключение объектов строительства и реконструкции к сетям электросвязи'
- **heroSubtitle**: 'Подключение многоквартирных домов, жилых и коммерческих комплексов к сетям электросвязи МГТС в соответствии с Постановлением Правительства РФ от 01.07.2022 года № 1196'
- **sectionTypes**: `hero, features, process, cta`

### `/developers/connecting_objects/connecting_residential`
- **spec**: `connecting_residential_spec.json`
- **title**: 'Подключение объектов жилой недвижимости'
- **heroTitle**: 'Подключение объектов жилой недвижимости'
- **sectionTypes**: `hero, services, documents, contact-form`

### `/developers/digital_solutions`
- **spec**: `developers_digital_solutions_spec.json`
- **title**: 'Цифровые решения'
- **heroTitle**: 'Цифровые решения'
- **heroSubtitle**: 'Широкополосный доступ в Интернет'
- **sectionTypes**: `hero, services-grid, automation-services, new-directions, smart-security, projects-slider, download-block, cta-form`

### `/forms_doc`
- **spec**: `forms_doc_spec.json`
- **title**: 'Формы типовых документов'
- **sectionTypes**: `sidebar, header, content, tabs, document_list`

### `/general_director_message`
- **spec**: `general_director_message_spec.json`
- **title**: 'Обращение Генерального директора'
- **heroTitle**: 'Обращение Генерального директора'
- **heroSubtitle**: 'Уважаемые друзья!'
- **sectionTypes**: `sidebar, hero, contact`

### `/government`
- **spec**: `government_spec.json`
- **title**: 'Госзаказчикам'
- **heroTitle**: 'Госзаказчикам'
- **sectionTypes**: `hero, tags, services, contact-form`

### `/government/all_services`
- **spec**: `government_all_services_spec.json`
- **title**: 'Все услуги'
- **heroTitle**: 'Все услуги'
- **sectionTypes**: `breadcrumbs, hero, tabs, services-grid, services-grid, services-subgroup, services-subgroup, services-subgroup`

### `/government/communications_infrastructure`
- **spec**: `government_communications_infrastructure_spec.json`
- **title**: 'Инфраструктура связи'
- **heroTitle**: 'Инфраструктура связи'
- **heroSubtitle**: 'Оптимальное и эффективное решение от МГТС. Создаём технологичные сети связи для бюджетных и государственных организаций'
- **sectionTypes**: `breadcrumbs, hero, services, advantages, contact-form`

### `/government/communications_infrastructure/external_communication`
- **spec**: `external_communication_spec.json`
- **title**: 'Наружные сети связи'
- **heroTitle**: 'Наружные сети связи'
- **sectionTypes**: `breadcrumbs, hero, services, experience, contact-form`

### `/government/communications_infrastructure/local_computing_network`
- **spec**: `local_computing_network_spec.json`
- **title**: 'Локальная вычислительная сеть, LAN'
- **heroTitle**: 'Локальная вычислительная сеть'
- **sectionTypes**: `breadcrumbs, hero, cards, cards, form`

### `/government/communications_infrastructure/network_operation`
- **spec**: `network_operation_spec.json`
- **title**: 'Эксплуатация сети'
- **heroTitle**: 'Эксплуатация сети'
- **heroSubtitle**: 'Поддержание стабильной и бесперебойной работы сетевой инфраструктуры и оборудования'
- **sectionTypes**: `breadcrumbs, hero, services, advantages, request-form`

### `/government/communications_infrastructure/structured_cabling_networks`
- **spec**: `structured_cabling_networks_spec.json`
- **title**: 'Структурированные кабельные сети'
- **heroTitle**: 'Структурированные кабельные сети'
- **sectionTypes**: `breadcrumbs, hero, services, content, cta-form`

### `/government/customized_solutions`
- **spec**: `government_customized_solutions_spec.json`
- **title**: 'Индивидуальные решения'
- **heroTitle**: 'Индивидуальные решения'
- **sectionTypes**: `breadcrumbs, hero, cards, cards, cards, form`

### `/government/digital_services`
- **spec**: `government_digital_services_spec.json`
- **title**: 'Цифровые сервисы'
- **heroTitle**: 'Цифровые сервисы'
- **sectionTypes**: `hero, section-header, cards, cards, services, cards, cards, cards, cards, request-form, sidebar, text, form, cookie-banner`

### `/government/digital_services/access_control_systems`
- **spec**: `access_control_systems_spec.json`
- **title**: 'Системы контроля доступа'
- **heroTitle**: 'Системы контроля доступа'
- **sectionTypes**: `breadcrumbs, hero, services, advantages, partnership`

### `/government/digital_services/automated_control_systems`
- **spec**: `automated_control_systems_spec.json`
- **title**: 'Автоматизированные системы управления'
- **heroTitle**: 'Автоматизированные системы управления'
- **sectionTypes**: `breadcrumbs, hero, services_grid, advantages_grid, partnership_cta`

### `/government/digital_services/automated_system_monitoring_accounting`
- **spec**: `automated_system_monitoring_accounting_spec.json`
- **title**: 'Автоматизированная система контроля и учёта энергоресурсов'
- **heroTitle**: 'Автоматизированная система контроля и учёта энергоресурсов'
- **heroSubtitle**: 'Современное решение для улучшения энергосбережения в промышленности, строительстве и бытовом секторе'
- **sectionTypes**: `breadcrumbs, hero, audience, advantages, partnership`

### `/government/digital_services/entrance_video_surveillance`
- **spec**: `entrance_video_surveillance_spec.json`
- **title**: 'Подъездное видеонаблюдение'
- **heroTitle**: 'Подъездное видеонаблюдение'
- **sectionTypes**: `breadcrumbs, hero, services, banner, advantages, request-form`

### `/government/digital_services/equipment`
- **spec**: `equipment_spec.json`
- **title**: 'Оборудование'
- **heroTitle**: 'Оборудование'
- **heroSubtitle**: 'Технологичное оборудование для эффективного и срочного информирования о чрезвычайных ситуациях по всей территории города Москвы'
- **sectionTypes**: `breadcrumbs, hero, services, advantages, features, contact-form`

### `/government/digital_services/introduction_security_tv_systems`
- **spec**: `introduction_security_tv_systems_spec.json`
- **title**: 'Внедрение систем охранного телевидения'
- **heroTitle**: 'Внедрение систем охранного телевидения'
- **heroSubtitle**: 'Обеспечьте безопасность государственных объектов с системой охранного телевидения'
- **sectionTypes**: `breadcrumbs, hero, audience, advantages, partnership-form`

### `/government/digital_services/main_and_backup_data_transmission`
- **spec**: `main_and_backup_data_transmission_spec.json`
- **title**: 'Сопряжение с Региональной системой оповещения г. Москвы'
- **heroTitle**: 'Сопряжение с Региональной системой оповещения г. Москвы'
- **sectionTypes**: `breadcrumbs, hero, content, content, cta`

### `/government/digital_services/maintenance_interface_device`
- **spec**: `maintenance_interface_device_spec.json`
- **title**: 'Техническое обслуживание устройства сопряжения'
- **heroTitle**: 'Техническое обслуживание устройства сопряжения'
- **sectionTypes**: `breadcrumbs, hero, cards, section, section`

### `/government/digital_services/speakerphone`
- **spec**: `speakerphone_spec.json`
- **title**: 'Громкоговорящая связь'
- **heroTitle**: 'Громкоговорящая связь'
- **sectionTypes**: `breadcrumbs, hero, cards, cards, cta_section`

### `/government/digital_services/video_surveillance_building`
- **spec**: `video_surveillance_building_spec.json`
- **title**: 'Видеонаблюдение на объектах строительства'
- **heroTitle**: 'Видеонаблюдение на объектах строительства'
- **sectionTypes**: `breadcrumbs, hero, features, control, advantages, hero, text, form, feedback`

### `/government/digital_services/video_surveillance_maintenance`
- **spec**: `video_surveillance_maintenance_spec.json`
- **title**: 'Техническое обслуживание системы видеонаблюдения'
- **heroTitle**: 'Техническое обслуживание системы видеонаблюдения'
- **sectionTypes**: `breadcrumbs, hero, content, content, form`

### `/infoformen`
- **spec**: `infoformen_spec.json`
- **title**: 'Информация для лиц, имеющих право на\xa0участие в годовых и\xa0внеочередных общих собраниях акционеров ПАО МГТС'
- **heroTitle**: 'Информация для лиц, имеющих право на участие в годовых и внеочередных общих собраниях акционеров ПАО МГТС'
- **heroSubtitle**: '11 сентября 2025 года'
- **sectionTypes**: `sidebar, hero, content, sidebar, content, notice, sidebar, content, content, documents, content, notice, accordion, intro, file-list, content, text-block, content, content, content, sidebar, notice, intro, documents, accordion, accordion, sidebar, content, accordion, intro, files, accordion, accordion, accordion, accordion, accordion, sidebar, content, content, file-list, notice, sidebar, content, accordion, accordion, accordion, sidebar, content, accordion`

### `/interaction_with_partners`
- **spec**: `interaction_with_partners_spec.json`
- **title**: 'Взаимодействие с партнерами'
- **heroTitle**: 'Взаимодействие с партнерами'
- **sectionTypes**: `hero, sidebar, documents, text_content, feedback`

### `/labor_safety`
- **spec**: `labor_safety_spec.json`
- **title**: 'Политика в области охраны труда ПАО МГТС'
- **heroTitle**: 'Политика в области охраны труда ПАО МГТС'
- **sectionTypes**: `sidebar, breadcrumbs, hero`

### `/licenses`
- **spec**: `licenses_spec.json`
- **title**: 'Лицензии и СРО +'
- **heroTitle**: 'Лицензии и СРО +'
- **sectionTypes**: `sidebar, breadcrumbs, hero, files, text`

### `/mgts_compliance_policies`
- **spec**: `mgts_compliance_policies_spec.json`
- **title**: 'Комплаенс-политики МГТС'
- **heroTitle**: 'Комплаенс-политики МГТС'
- **sectionTypes**: `sidebar, hero, content, awards`

### `/mgts_values`
- **spec**: `mgts_values_spec.json`
- **title**: 'Ценности МГТС'
- **heroTitle**: 'Ценности МГТС'
- **sectionTypes**: `sidebar, hero, cards, notice`

### `/news`
- **spec**: `news_spec.json`
- **title**: 'Новости'
- **heroTitle**: 'Новости'
- **sectionTypes**: `hero, news-list, sidebar, pagination`

### `/offers`
- **spec**: `offers_spec.json`
- **title**: 'Оферты'
- **heroTitle**: 'Оферты'
- **sectionTypes**: `sidebar, hero, title, tabs`

### `/operators`
- **spec**: `operators_spec.json`
- **title**: 'Операторам связи'
- **heroTitle**: 'СВЯЗАТЬСЯ С НАМИ'
- **sectionTypes**: `hero, section-header, services, advantages, contact`

### `/operators/all_services`
- **spec**: `operators_all_services_spec.json`
- **title**: 'Все услуги'
- **heroTitle**: 'Все услуги'
- **sectionTypes**: `breadcrumbs, hero, tabs, services`

### `/operators/contact_for_operators`
- **spec**: `contact_for_operators_spec.json`
- **title**: 'Контактные данные для операторов связи'
- **sectionTypes**: `breadcrumbs, sidebar, main-content`

### `/operators/data_transfer`
- **spec**: `data_transfer_spec.json`
- **title**: 'Передача данных'
- **heroTitle**: 'Передача данных'
- **sectionTypes**: `breadcrumbs, hero, advantages_cards, contact_section`

### `/operators/infrastructure/accommodation_at_sites`
- **spec**: `accommodation_at_sites_spec.json`
- **title**: 'Размещение на объектах'
- **heroTitle**: 'Размещение на объектах'
- **sectionTypes**: `breadcrumbs, hero, advantages, addresses-map, contact`

### `/operators/infrastructure/avr_ppr`
- **spec**: `avr_ppr_spec.json`
- **title**: 'Оказание услуг АВР и ППР'
- **heroTitle**: 'Оказание услуг АВР и ППР'
- **sectionTypes**: `breadcrumbs, hero, advantages, contact`

### `/operators/infrastructure/lks_kr`
- **spec**: `lks_kr_spec.json`
- **title**: 'Предоставление места в кабельной канализации'
- **heroTitle**: 'Предоставление места в кабельной канализации'
- **sectionTypes**: `breadcrumbs, hero, cards, cta`

### `/operators/infrastructure/pir_smr_mgts`
- **spec**: `pir_smr_mgts_spec.json`
- **title**: 'Проектирование и строительство сетей связи'
- **heroTitle**: 'Проектирование и строительство сетей связи'
- **sectionTypes**: `breadcrumbs, hero, services, contact`

### `/operators/joining_and_passing_traffic`
- **spec**: `joining_and_passing_traffic_spec.json`
- **title**: 'Присоединение и пропуск трафика'
- **heroTitle**: 'Присоединение и пропуск трафика'
- **heroSubtitle**: 'Полный пакет услуг для создания сетей связи в бюджетных и государственных организациях. Инновации, безопасность и эффективность'
- **sectionTypes**: `breadcrumbs, hero, cards, addresses_with_map, contact_section`

### `/operators/nondiscriminatory_access`
- **spec**: `operators_nondiscriminatory_access_spec.json`
- **title**: 'Недискриминационный доступ'
- **heroTitle**: 'Недискриминационный доступ'
- **sectionTypes**: `breadcrumbs, hero, content, sidebar, content, content`

### `/operinfo`
- **spec**: `operinfo_spec.json`
- **title**: 'Стандарты раскрытия информации'
- **heroTitle**: 'Стандарты раскрытия информации'
- **sectionTypes**: `hero, header, tabs, files-list, sidebar, content, content, content, content, content, content, sidebar, content, documents-section, documents-section, file-list, content`

### `/partners`
- **spec**: `partners_spec.json`
- **title**: 'Партнерам'
- **heroTitle**: 'СВЯЗАТЬСЯ С НАМИ'
- **sectionTypes**: `hero, section-header, services-grid, advantages, contact-form`

### `/partners/all_services`
- **spec**: `developers_all_services_spec.json`
- **title**: 'Все услуги'
- **heroTitle**: 'Все услуги'
- **sectionTypes**: `breadcrumbs, hero, tabs, services-cards`

### `/partners/creating_work_order`
- **spec**: `partners_creating_work_order_spec.json`
- **title**: 'Создание наряда на обследование люка'
- **heroTitle**: 'Допуск для проведения работ на линиях и сооружениях связи'
- **sectionTypes**: `breadcrumbs, hero, sidebar, form, contact`

### `/partners/documents`
- **spec**: `documents_spec.json`
- **title**: 'Документация'
- **sectionTypes**: `breadcrumbs, sidebar-menu, content-header, tabs-section, year-filter-tabs, files-list`

### `/partners/procedure_admission_work`
- **spec**: `procedure_admission_work_spec.json`
- **title**: 'Порядок допуска для проведения работ'
- **heroTitle**: 'Допуск для проведения работ на линиях и сооружениях связи'
- **sectionTypes**: `hero, sidebar, steps, modal-cards, notice, contact-banner`

### `/partners/purchas`
- **spec**: `purchas_spec.json`
- **title**: 'Закупки'
- **heroTitle**: 'Закупки'
- **sectionTypes**: `hero, content, breadcrumb, navigation, statement, content, content, content, files-list, content, files, content, sidebar, text`

### `/partners/ramochnie_dogovori`
- **spec**: `partners_ramochnie_dogovori_spec.json`
- **title**: 'Рамочный договор'
- **heroTitle**: 'Рамочный договор'
- **sectionTypes**: `sidebar, breadcrumbs, hero, tabs, content, files, content`

### `/partners/realization`
- **spec**: `realization_spec.json`
- **title**: 'Реализация ТМЦ'
- **heroTitle**: 'Реализация ТМЦ'
- **sectionTypes**: `sidebar, breadcrumbs, hero, contact-form`

### `/partners/tariffs`
- **spec**: `tariffs_spec.json`
- **title**: 'Тарифы'
- **heroTitle**: 'Актуальные тарифы'
- **sectionTypes**: `sidebar, breadcrumbs, hero`

### `/partners_feedback_form`
- **spec**: `partners_feedback_form_spec.json`
- **title**: 'Помогите нам стать лучше!'
- **heroTitle**: 'Помогите нам стать лучше!'
- **sectionTypes**: `hero, form, cookies`

### `/principles_corporate_manage`
- **spec**: `principles_corporate_manage_spec.json`
- **title**: 'Принципы корпоративного управления'
- **heroTitle**: 'Принципы корпоративного управления'
- **sectionTypes**: `sidebar, hero, text, text, text, text, text, text, cards, images`

### `/single_hotline`
- **spec**: `single_hotline_spec.json`
- **title**: 'Единая горячая линия'
- **heroTitle**: 'Единая горячая линия'
- **heroSubtitle**: 'Для сообщений о потенциальных или совершенных нарушениях законодательства'
- **sectionTypes**: `sidebar, hero, content, content, content, footer`

### `/stockholder_copies_document`
- **spec**: `stockholder_copies_document_spec.json`
- **title**: 'Предоставление копий документов'
- **heroTitle**: 'Предоставление копий документов'
- **sectionTypes**: `sidebar, breadcrumbs, hero, content, files`

### `/timing_malfunctions`
- **spec**: `timing_malfunctions_spec.json`
- **title**: 'Сроки устранения неисправностей'
- **heroTitle**: 'Сроки устранения неисправностей'
- **sectionTypes**: `sidebar, breadcrumbs, hero`

### `/virtual_ate`
- **spec**: `virtual_ate_spec.json`
- **title**: 'Виртуальная АТС'
- **heroTitle**: 'Виртуальная АТС'
- **sectionTypes**: `hero, advantages, cards, slider, mobile-app-promo, connection-guide, cta-section, content, content, accordion`

### `/wca`
- **spec**: `wca_spec.json`
- **title**: 'Специальная оценка условий труда'
- **heroTitle**: 'Специальная оценка условий труда'
- **sectionTypes**: `sidebar, hero, breadcrumbs, tabs`

