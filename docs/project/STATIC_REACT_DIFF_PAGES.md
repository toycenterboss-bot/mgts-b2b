# Постраничное сравнение: статичный (8002) vs React (3000)

Метод: список блоков в шаблоне + секции в Strapi (без JS-рендера шаблонов).

## Обновление статуса (2026-02-22)
- Добавлены fallback-блоки для отсутствующих секций через `template.block`.
- Добавлен рендер `footer_and_contact_form` на страницах шаблонов.
- Добавлены `data-stitch-block` для breadcrumbs и cms_page_renderer.
- Добавлен отчет: `docs/project/STATIC_REACT_VISUAL_CHECK.md` (сверка блоков шаблонов vs React).
- QA прогон: 100/100 OK, отчет `docs/project/NEXTJS_QA_REPORT.md`.

## about_mgts
- template: TPL_DeepNav
- static_url: http://localhost:8002/about_mgts
- react_url: http://localhost:3000/about_mgts
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.history-timeline
- content_len: 0

## about_registrar
- template: TPL_DeepNav
- static_url: http://localhost:8002/about_registrar
- react_url: http://localhost:3000/about_registrar
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text, page.section-text, page.section-text, page.section-cards, page.service-faq
- content_len: 0

## access_internet
- template: TPL_Service
- static_url: http://localhost:8002/business/access_internet
- react_url: http://localhost:3000/access_internet
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text, page.section-text
- content_len: 0

## accommodation_at_sites
- template: TPL_Service
- static_url: http://localhost:8002/operators/infrastructure/accommodation_at_sites
- react_url: http://localhost:3000/accommodation_at_sites
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-map, page.service-consultation-card
- content_len: 0

## affiliated_persons
- template: TPL_Doc_Page
- static_url: http://localhost:8002/affiliated_persons
- react_url: http://localhost:3000/affiliated_persons
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## ai-chat
- template: TPL_AI_Chat
- static_url: http://localhost:8002/ai-chat
- react_url: http://localhost:3000/ai-chat
- template_blocks: ai_assistant_landing_page, breadcrumbs, footer_and_contact_form, header_and_mega_menu
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: ai_assistant_landing_page, breadcrumbs, footer_and_contact_form, header_and_mega_menu

## automated_control_systems
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/automated_control_systems
- react_url: http://localhost:3000/automated_control_systems
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## automated_system_monitoring_accounting
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/automated_system_monitoring_accounting
- react_url: http://localhost:3000/automated_system_monitoring_accounting
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## avr_ppr
- template: TPL_Service
- static_url: http://localhost:8002/operators/infrastructure/avr_ppr
- react_url: http://localhost:3000/avr_ppr
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.service-consultation-card
- content_len: 0

## bank_details
- template: TPL_DeepNav
- static_url: http://localhost:8002/bank_details
- react_url: http://localhost:3000/bank_details
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-table
- content_len: 0

## business
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/business
- react_url: http://localhost:3000/business
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards, page.section-cards, page.section-cards
- content_len: 0

## business_equipment_setup
- template: TPL_Service
- static_url: http://localhost:8002/business/equipment_setup
- react_url: http://localhost:3000/business_equipment_setup
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-text, page.section-text, page.section-cards, page.how-to-connect
- content_len: 0

## business_payment_methods
- template: TPL_Service
- static_url: http://localhost:8002/business/payment_methods
- react_url: http://localhost:3000/business_payment_methods
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.service-order-form
- content_len: 0

## career
- template: TPL_CMS_Page
- static_url: http://localhost:8002/career
- react_url: http://localhost:3000/career
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.career-values, page.career-vacancies, page.career-why-company, page.career-cv-form
- content_len: 0

## computer_help
- template: TPL_Service
- static_url: http://localhost:8002/business/equipment_setup/computer_help
- react_url: http://localhost:3000/computer_help
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-text, page.section-cards, page.service-order-form
- content_len: 0

## connecting_commercial
- template: TPL_Service
- static_url: http://localhost:8002/developers/connecting_objects/connecting_commercial
- react_url: http://localhost:3000/connecting_commercial
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.service-order-form
- content_len: 0

## connecting_construction
- template: TPL_Service
- static_url: http://localhost:8002/developers/connecting_objects/connecting_construction
- react_url: http://localhost:3000/connecting_construction
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-table, page.service-order-form
- content_len: 0

## connecting_residential
- template: TPL_Service
- static_url: http://localhost:8002/developers/connecting_objects/connecting_residential
- react_url: http://localhost:3000/connecting_residential
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-table, page.service-order-form
- content_len: 0

## contact
- template: TPL_Contact_Hub
- static_url: http://localhost:8002/contact
- react_url: http://localhost:3000/contact
- template_blocks: breadcrumbs, contacts_with_interactive_3d_map, footer_and_contact_form, header_and_mega_menu
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, contacts_with_interactive_3d_map, footer_and_contact_form, header_and_mega_menu

## contact_details
- template: TPL_DeepNav
- static_url: http://localhost:8002/contact_details
- react_url: http://localhost:3000/contact_details
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-cards, page.section-text
- content_len: 0

## contact_for_operators
- template: TPL_DeepNav
- static_url: http://localhost:8002/operators/contact_for_operators
- react_url: http://localhost:3000/contact_for_operators
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-cards
- content_len: 0

## cookie_processing
- template: TPL_DeepNav
- static_url: http://localhost:8002/cookie_processing
- react_url: http://localhost:3000/cookie_processing
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text
- content_len: 0

## corporate_documents
- template: TPL_DeepNav
- static_url: http://localhost:8002/corporate_documents
- react_url: http://localhost:3000/corporate_documents
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.document-tabs
- content_len: 0

## data_processing
- template: TPL_DeepNav
- static_url: http://localhost:8002/data_processing
- react_url: http://localhost:3000/data_processing
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-table, page.section-text, page.section-table, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-text, page.section-table, page.section-table
- content_len: 0

## data_transfer
- template: TPL_Service
- static_url: http://localhost:8002/operators/data_transfer
- react_url: http://localhost:3000/data_transfer
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.service-consultation-card
- content_len: 0

## decisions_meetings_shareholders
- template: TPL_DeepNav
- static_url: http://localhost:8002/decisions_meetings_shareholders
- react_url: http://localhost:3000/decisions_meetings_shareholders
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.document-tabs
- content_len: 0

## developers
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/developers
- react_url: http://localhost:3000/developers
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards, page.service-consultation-card
- content_len: 0

## developers_compensation_for_losses
- template: TPL_DeepNav
- static_url: http://localhost:8002/developers/compensation_for_losses
- react_url: http://localhost:3000/developers_compensation_for_losses
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text, page.section-text, page.service-faq
- content_len: 0

## developers_connecting_objects
- template: TPL_DeepNav
- static_url: http://localhost:8002/developers/connecting_objects
- react_url: http://localhost:3000/developers_connecting_objects
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## digital_television
- template: TPL_Service
- static_url: http://localhost:8002/business/digital_television
- react_url: http://localhost:3000/digital_television
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-cards, page.section-text, page.section-text, page.section-text
- content_len: 0

## disclosure
- template: TPL_DeepNav
- static_url: http://localhost:8002/disclosure
- react_url: http://localhost:3000/disclosure
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu

## documents
- template: TPL_Doc_Page
- static_url: http://localhost:8002/partners/documents
- react_url: http://localhost:3000/documents
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: page.document-tabs, page.service-order-form, page.service-consultation-card
- content_len: 0

## emission
- template: TPL_Doc_Page
- static_url: http://localhost:8002/emission
- react_url: http://localhost:3000/emission
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## entrance_video_surveillance
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/entrance_video_surveillance
- react_url: http://localhost:3000/entrance_video_surveillance
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-text, page.section-cards, page.service-order-form
- content_len: 0

## equipment
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/equipment
- react_url: http://localhost:3000/equipment
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text, page.service-order-form
- content_len: 0

## essential_facts
- template: TPL_Doc_Page
- static_url: http://localhost:8002/essential_facts
- react_url: http://localhost:3000/essential_facts
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## external_communication
- template: TPL_Service
- static_url: http://localhost:8002/government/communications_infrastructure/external_communication
- react_url: http://localhost:3000/external_communication
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## forms_doc
- template: TPL_DeepNav
- static_url: http://localhost:8002/forms_doc
- react_url: http://localhost:3000/forms_doc
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-table, page.document-tabs
- content_len: 0

## general_director_message
- template: TPL_DeepNav
- static_url: http://localhost:8002/general_director_message
- react_url: http://localhost:3000/general_director_message
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text, page.ceo-feedback
- content_len: 0

## government
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/government
- react_url: http://localhost:3000/government
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.service-order-form
- content_len: 0

## government_all_services
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/government/all_services
- react_url: http://localhost:3000/government_all_services
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards, page.section-text, page.section-cards, page.section-cards, page.section-cards
- content_len: 0

## government_communications_infrastructure
- template: TPL_Service
- static_url: http://localhost:8002/government/communications_infrastructure
- react_url: http://localhost:3000/government_communications_infrastructure
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## government_customized_solutions
- template: TPL_Service
- static_url: http://localhost:8002/government/customized_solutions
- react_url: http://localhost:3000/government_customized_solutions
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## government_digital_services
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services
- react_url: http://localhost:3000/government_digital_services
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-text, page.section-cards, page.section-cards, page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## index
- template: TPL_DeepNav
- static_url: http://localhost:8002/about_mgts
- react_url: http://localhost:3000/index
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text
- content_len: 0

## infoformen
- template: TPL_DeepNav
- static_url: http://localhost:8002/infoformen
- react_url: http://localhost:3000/infoformen
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.service-faq
- content_len: 0

## interaction_with_partners
- template: TPL_DeepNav
- static_url: http://localhost:8002/interaction_with_partners
- react_url: http://localhost:3000/interaction_with_partners
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-table, page.section-text, page.service-consultation-card
- content_len: 0

## introduction_security_tv_systems
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/introduction_security_tv_systems
- react_url: http://localhost:3000/introduction_security_tv_systems
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## joining_and_passing_traffic
- template: TPL_Service
- static_url: http://localhost:8002/operators/joining_and_passing_traffic
- react_url: http://localhost:3000/joining_and_passing_traffic
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.service-consultation-card
- content_len: 0

## labor_safety
- template: TPL_DeepNav
- static_url: http://localhost:8002/labor_safety
- react_url: http://localhost:3000/labor_safety
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-table
- content_len: 0

## licenses
- template: TPL_DeepNav
- static_url: http://localhost:8002/licenses
- react_url: http://localhost:3000/licenses
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text
- content_len: 0

## lks_kr
- template: TPL_Service
- static_url: http://localhost:8002/operators/infrastructure/lks_kr
- react_url: http://localhost:3000/lks_kr
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.service-order-form
- content_len: 0

## local_computing_network
- template: TPL_Service
- static_url: http://localhost:8002/government/communications_infrastructure/local_computing_network
- react_url: http://localhost:3000/local_computing_network
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text
- content_len: 0

## main_and_backup_data_transmission
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/main_and_backup_data_transmission
- react_url: http://localhost:3000/main_and_backup_data_transmission
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## maintenance_interface_device
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/maintenance_interface_device
- react_url: http://localhost:3000/maintenance_interface_device
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text
- content_len: 0

## mgts_compliance_policies
- template: TPL_DeepNav
- static_url: http://localhost:8002/mgts_compliance_policies
- react_url: http://localhost:3000/mgts_compliance_policies
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-table, page.section-text
- content_len: 0

## mobile_connection
- template: TPL_Service
- static_url: http://localhost:8002/business/mobile_connection
- react_url: http://localhost:3000/mobile_connection
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text, page.section-text
- content_len: 0

## network_operation
- template: TPL_Service
- static_url: http://localhost:8002/government/communications_infrastructure/network_operation
- react_url: http://localhost:3000/network_operation
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## news
- template: TPL_News_List
- static_url: http://localhost:8002/news?year=2024
- react_url: http://localhost:3000/news
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_2, pagination_and_display_controls
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_2, pagination_and_display_controls

## news
- template: TPL_News_List
- static_url: http://localhost:8002/news
- react_url: http://localhost:3000/news
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_2, pagination_and_display_controls
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_2, pagination_and_display_controls

## news/aaa4c17b-30c7-4ae2-bea2-c1a3cd1aa54f
- template: TPL_News_Detail
- static_url: http://localhost:8002/news/aaa4c17b-30c7-4ae2-bea2-c1a3cd1aa54f
- react_url: http://localhost:3000/news/aaa4c17b-30c7-4ae2-bea2-c1a3cd1aa54f
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_detail_page
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_detail_page

## offers
- template: TPL_DeepNav
- static_url: http://localhost:8002/offers
- react_url: http://localhost:3000/offers
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.document-tabs
- content_len: 0

## operators
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/operators
- react_url: http://localhost:3000/operators
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards, page.service-consultation-card
- content_len: 0

## operators/infrastructure
- template: TPL_Service
- static_url: http://localhost:8002/operators/infrastructure
- react_url: http://localhost:3000/operators/infrastructure
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card

## operators_all_services
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/operators/all_services
- react_url: http://localhost:3000/operators_all_services
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.service-order-form
- content_len: 0

## operators_nondiscriminatory_access
- template: TPL_Service
- static_url: http://localhost:8002/operators/nondiscriminatory_access
- react_url: http://localhost:3000/operators_nondiscriminatory_access
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-table, page.section-text, page.section-text, page.section-table
- content_len: 0

## operinfo
- template: TPL_DeepNav
- static_url: http://localhost:8002/operinfo
- react_url: http://localhost:3000/operinfo
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.document-tabs
- content_len: 0

## partner
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/partners
- react_url: http://localhost:3000/partner
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards
- content_len: 0

## partners
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/partners
- react_url: http://localhost:3000/partners
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards, page.section-text
- content_len: 0

## partners_creating_work_order
- template: TPL_Form_Page
- static_url: http://localhost:8002/partners/creating_work_order
- react_url: http://localhost:3000/partners_creating_work_order
- template_blocks: b2b_survey_and_feedback_form, breadcrumbs, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.form-section, page.service-order-form
- content_len: 0

## partners_feedback_form
- template: TPL_DeepNav
- static_url: http://localhost:8002/partners_feedback_form
- react_url: http://localhost:3000/partners_feedback_form
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.form-section, page.service-order-form
- content_len: 0

## partners_ramochnie_dogovori
- template: TPL_Doc_Page
- static_url: http://localhost:8002/partners_ramochnie_dogovori
- react_url: http://localhost:3000/partners_ramochnie_dogovori
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: page.files-table
- content_len: 0

## principles_corporate_manage
- template: TPL_DeepNav
- static_url: http://localhost:8002/principles_corporate_manage
- react_url: http://localhost:3000/principles_corporate_manage
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text, page.section-text
- content_len: 0

## procedure_admission_work
- template: TPL_DeepNav
- static_url: http://localhost:8002/partners/procedure_admission_work
- react_url: http://localhost:3000/procedure_admission_work
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.how-to-connect, page.service-consultation-card, page.service-order-form
- content_len: 0

## purchas
- template: TPL_Doc_Page
- static_url: http://localhost:8002/partners/purchas
- react_url: http://localhost:3000/purchas
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: page.section-text, page.section-table, page.section-table, page.document-tabs, page.section-text
- content_len: 0

## realization
- template: TPL_DeepNav
- static_url: http://localhost:8002/partners/realization
- react_url: http://localhost:3000/realization
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-table, page.service-order-form
- content_len: 0

## reports
- template: TPL_Doc_Page
- static_url: http://localhost:8002/reports
- react_url: http://localhost:3000/reports
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## scenario_demo
- template: TPL_Scenario
- static_url: http://localhost:8002/scenario_demo
- react_url: http://localhost:3000/scenario_demo
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: page.service-tabs, page.service-faq
- content_len: 0

## search
- template: TPL_Search_Results
- static_url: http://localhost:8002/search
- react_url: http://localhost:3000/search
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, search_results_layout
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, search_results_layout

## security_alarm
- template: TPL_Service
- static_url: http://localhost:8002/business/security_alarm
- react_url: http://localhost:3000/security_alarm
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-text, page.section-cards, page.tariff-table, page.tariff-table, page.section-cards, page.service-faq
- content_len: 0

## services
- template: TPL_Segment_Landing
- static_url: http://localhost:8002/services
- react_url: http://localhost:3000/services
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## services/scenario-connecting-object
- template: TPL_Scenario
- static_url: http://localhost:8002/services/scenario-connecting-object
- react_url: http://localhost:3000/services/scenario-connecting-object
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1

## services/scenario-connectivity-data
- template: TPL_Scenario
- static_url: http://localhost:8002/services/scenario-connectivity-data
- react_url: http://localhost:3000/services/scenario-connectivity-data
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1

## services/scenario-infrastructure-360
- template: TPL_Scenario
- static_url: http://localhost:8002/services/scenario-infrastructure-360
- react_url: http://localhost:3000/services/scenario-infrastructure-360
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1

## services/scenario-network-ops
- template: TPL_Scenario
- static_url: http://localhost:8002/services/scenario-network-ops
- react_url: http://localhost:3000/services/scenario-network-ops
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1

## services/scenario-safe-object
- template: TPL_Scenario
- static_url: http://localhost:8002/services/scenario-safe-object
- react_url: http://localhost:3000/services/scenario-safe-object
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1

## services/scenario-video-access
- template: TPL_Scenario
- static_url: http://localhost:8002/services/scenario-video-access
- react_url: http://localhost:3000/services/scenario-video-access
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1

## single_hotline
- template: TPL_DeepNav
- static_url: http://localhost:8002/single_hotline
- react_url: http://localhost:3000/single_hotline
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-text, page.section-cards, page.section-text
- content_len: 0

## sitemap
- template: TPL_Doc_Page
- static_url: http://localhost:8002/sitemap
- react_url: http://localhost:3000/sitemap
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## speakerphone
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/speakerphone
- react_url: http://localhost:3000/speakerphone
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text
- content_len: 0

## stockholder_copies_document
- template: TPL_DeepNav
- static_url: http://localhost:8002/stockholder_copies_document
- react_url: http://localhost:3000/stockholder_copies_document
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-text, page.section-table
- content_len: 0

## stocks_reports
- template: TPL_Doc_Page
- static_url: http://localhost:8002/stocks_reports
- react_url: http://localhost:3000/stocks_reports
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## structured_cabling_networks
- template: TPL_Service
- static_url: http://localhost:8002/government/communications_infrastructure/structured_cabling_networks
- react_url: http://localhost:3000/structured_cabling_networks
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## tariffs
- template: TPL_Doc_Page
- static_url: http://localhost:8002/tariffs
- react_url: http://localhost:3000/tariffs
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: page.files-table
- content_len: 0

## telephony
- template: TPL_Service
- static_url: http://localhost:8002/business/telephony
- react_url: http://localhost:3000/telephony
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text
- content_len: 0

## terms
- template: TPL_Doc_Page
- static_url: http://localhost:8002/terms
- react_url: http://localhost:3000/terms
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- strapi_sections: ∅
- content_len: 0
- react_missing_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card

## timing_malfunctions
- template: TPL_DeepNav
- static_url: http://localhost:8002/timing_malfunctions
- react_url: http://localhost:3000/timing_malfunctions
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.section-table
- content_len: 0

## video_surveillance_building
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/video_surveillance_building
- react_url: http://localhost:3000/video_surveillance_building
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## video_surveillance_maintenance
- template: TPL_Service
- static_url: http://localhost:8002/government/digital_services/video_surveillance_maintenance
- react_url: http://localhost:3000/video_surveillance_maintenance
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.service-order-form
- content_len: 0

## video_surveillance_office
- template: TPL_Service
- static_url: http://localhost:8002/business/video_surveillance_office
- react_url: http://localhost:3000/video_surveillance_office
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.section-text, page.service-faq, page.service-order-form
- content_len: 0

## virtual_ate
- template: TPL_Service
- static_url: http://localhost:8002/virtual_ate
- react_url: http://localhost:3000/virtual_ate
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- strapi_sections: page.section-cards, page.section-cards, page.image-switcher, page.section-cards, page.section-cards, page.section-text, page.section-cards, page.section-text, page.section-text
- content_len: 0

## wca
- template: TPL_DeepNav
- static_url: http://localhost:8002/wca
- react_url: http://localhost:3000/wca
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- strapi_sections: page.document-tabs
- content_len: 0
