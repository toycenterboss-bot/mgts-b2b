# QA чек‑лист: прогон всех страниц (MGTS New Site)

Источник истины: `docs/project/PAGE_CONTENT_MAPPING.md` (route → template → status).

**Как открывать локально (design server):**

- Для Page‑шаблонов: `http://localhost:8002/html_pages/<template>.html?slug=<slug>`
  - примеры: `.../tpl_home.html?slug=home`, `.../tpl_service.html?slug=business/access_internet`, `.../tpl_cms_page.html?slug=about_mgts`
- Для “READY” страниц: `tpl_ai_chat.html?slug=ai-chat`, `page_career.html?slug=career`, `tpl_search_results.html?slug=search`

**Минимум на каждую страницу:** 200/рендер, данные из Strapi, ссылки/роутинг, breadcrumbs, медиа, интерактив (где есть).

**QA 7C аудит:** `docs/project/QA_7C_SPEC_AUDIT.md` (сравнение spec.json ↔ Strapi, mapping‑based).  
Next: пройтись по списку из отчета и проверить страницы вручную.

---

## TPL_Segment_Landing
- [x] `business`
- [x] `developers`
- [x] `government`
- [x] `government/all_services`
- [x] `operators`
- [x] `operators/all_services`
- [x] `partners`
- [x] `partner`
- [x] `partners/all_services` *(NEEDS_REVIEW)*
- [x] `services` *(MISSING_SPEC)*

---

## TPL_Service
- [x] `business/access_internet`
- [x] `business/digital_television`
- [x] `business/equipment_setup`
- [x] `business/equipment_setup/computer_help`
- [x] `business/mobile_connection`
- [x] `business/payment_methods`
- [x] `business/security_alarm`
- [x] `business/telephony`
- [x] `business/video_surveillance_office`
- [x] `developers/compensation_for_losses`
- [x] `developers/connecting_objects`
- [x] `developers/connecting_objects/connecting_commercial`
- [x] `developers/connecting_objects/connecting_construction`
- [x] `developers/connecting_objects/connecting_residential`
- [x] `developers/digital_solutions`
- [x] `government/communications_infrastructure`
- [x] `government/communications_infrastructure/external_communication`
- [x] `government/communications_infrastructure/local_computing_network`
- [x] `government/communications_infrastructure/network_operation`
- [x] `government/communications_infrastructure/structured_cabling_networks`
- [x] `government/customized_solutions`
- [x] `government/digital_services`
- [x] `government/digital_services/access_control_systems`
- [x] `government/digital_services/automated_control_systems`
- [x] `government/digital_services/automated_system_monitoring_accounting`
- [x] `government/digital_services/entrance_video_surveillance`
- [x] `government/digital_services/equipment`
- [x] `government/digital_services/introduction_security_tv_systems`
- [x] `government/digital_services/main_and_backup_data_transmission`
- [x] `government/digital_services/maintenance_interface_device`
- [x] `government/digital_services/speakerphone`
- [x] `government/digital_services/video_surveillance_building`
- [x] `government/digital_services/video_surveillance_maintenance`
- [x] `operators/data_transfer`
- [x] `operators/infrastructure` *(MISSING_SPEC)*
- [x] `operators/infrastructure/accommodation_at_sites`
- [x] `operators/infrastructure/avr_ppr`
- [x] `operators/infrastructure/lks_kr`
- [x] `operators/infrastructure/pir_smr_mgts`
- [x] `operators/joining_and_passing_traffic`
- [x] `operators/nondiscriminatory_access`
- [x] `virtual_ate`

---

## TPL_Doc_Page
- [x] `about` *(MISSING_SPEC)*
- [~] `affiliated_persons` *(MISSING_SPEC, EMPTY_CONTENT)*
- [x] `bank_details`
- [~] `emission` *(MISSING_SPEC, EMPTY_CONTENT)*
- [~] `essential_facts` *(MISSING_SPEC, EMPTY_CONTENT)*
- [x] `partners/documents`
- [x] `partners/procedure_admission_work`
- [x] `partners/purchas`
- [x] `partners/ramochnie_dogovori`
- [x] `partners/realization`
- [x] `partners/tariffs`
- [~] `reports` *(MISSING_SPEC, EMPTY_CONTENT)*
- [~] `sitemap` *(MISSING_SPEC, EMPTY_CONTENT)*
- [~] `stocks_reports` *(MISSING_SPEC, EMPTY_CONTENT)*
- [~] `terms` *(MISSING_SPEC, EMPTY_CONTENT)*
  - Next: определить источник/спек и заполнить вручную в Strapi

---

## TPL_Form_Page
- [x] `operators/contact_for_operators`
- [x] `partners/creating_work_order`

---

## TPL_Contact_Hub
- [x] `contact` *(MISSING_SPEC)*
- [x] `contact_details`

---

## TPL_DeepNav
- [x] `about_mgts`
- [x] `about_registrar`
- [x] `cookie_processing`
- [x] `corporate_documents`
- [x] `data_processing` *(tables restored)*
- [x] `decisions_meetings_shareholders` *(Document Tabs populated)*
- [x] `disclosure` *(MISSING_SPEC)*
- [x] `documents` *(MISSING_SPEC)*
- [x] `forms_doc` *(2‑level tabs restored)*
- [x] `general_director_message`
- [x] `infoformen`
- [x] `interaction_with_partners`
- [x] `labor_safety`
- [x] `licenses`
- [x] `mgts_compliance_policies`
- [x] `mgts_values`
- [x] `operinfo`
- [x] `partners_feedback_form`
- [x] `principles_corporate_manage`
- [x] `single_hotline`
- [x] `stockholder_copies_document`
- [x] `timing_malfunctions`
- [x] `wca`

---

## TPL_News_List
- [x] `news`
- [x] `offers`

---

## TPL_Scenario
- [x] `services/scenario-connecting-object` *(MISSING_SPEC)*
- [x] `services/scenario-connectivity-data` *(MISSING_SPEC)*
- [x] `services/scenario-infrastructure-360` *(MISSING_SPEC)*
- [x] `services/scenario-network-ops` *(MISSING_SPEC)*
- [x] `services/scenario-safe-object` *(MISSING_SPEC)*
- [x] `services/scenario-video-access` *(MISSING_SPEC)*

---

## READY
- [x] `ai-chat` *(MISSING_SPEC)*
- [x] `career` *(MISSING_SPEC)*
- [x] `search` *(MISSING_SPEC)*

---

## Роуты “не из таблицы”, но обязательны к проверке

- [x] `/news/archive` (архив: years/tags/pagination)
- [x] `/news/<real-slug>` (деталка: slug из pathname, featuredImage fallback)

