# Visual parity spot-check (template blocks vs React)

Method: take blocks from static template HTML files and compare with React page HTML (data-stitch-block only).
Note: style/images/fonts parity require manual visual verification.

## TPL_DeepNav
- template_file: tpl_deepnav.html
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- about_mgts: missing=∅; extra=∅
- about_registrar: missing=∅; extra=∅

## TPL_Service
- template_file: tpl_service.html
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, hero_section_and_cta_banner_2, pricing_and_specs_table, service_consultation_card, service_cta_banner, service_customization_panel, service_faq_section, service_stats_card
- access_internet: missing=hero_section_and_cta_banner_2; extra=∅
- accommodation_at_sites: missing=hero_section_and_cta_banner_2; extra=∅

## TPL_Doc_Page
- template_file: tpl_doc_page.html
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_1, service_consultation_card
- affiliated_persons: missing=service_consultation_card; extra=∅
- documents: missing=news_and_documents_list_1; extra=∅

## TPL_AI_Chat
- template_file: tpl_ai_chat.html
- template_blocks: ai_assistant_landing_page, breadcrumbs, footer_and_contact_form, header_and_mega_menu
- ai-chat: missing=∅; extra=∅

## TPL_Segment_Landing
- template_file: tpl_segment_landing.html
- template_blocks: breadcrumbs, developers_industry_hero, footer_and_contact_form, header_and_mega_menu, service_and_scenario_cards_2, service_cta_banner
- business: missing=developers_industry_hero, service_and_scenario_cards_2; extra=∅
- developers: missing=developers_industry_hero, service_and_scenario_cards_2; extra=service_consultation_card

## TPL_CMS_Page
- template_file: tpl_cms_page.html
- template_blocks: breadcrumbs, cms_page_renderer, footer_and_contact_form, header_and_mega_menu
- career: missing=∅; extra=∅

## TPL_Contact_Hub
- template_file: tpl_contact_hub.html
- template_blocks: breadcrumbs, contacts_with_interactive_3d_map, footer_and_contact_form, header_and_mega_menu
- contact: missing=∅; extra=∅

## TPL_News_List
- template_file: tpl_news_list.html
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_and_documents_list_2, pagination_and_display_controls
- news: missing=footer_and_contact_form, news_and_documents_list_2, pagination_and_display_controls; extra=∅
- news: missing=footer_and_contact_form, news_and_documents_list_2, pagination_and_display_controls; extra=∅

## TPL_News_Detail
- template_file: tpl_news_detail.html
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, news_detail_page
- news/aaa4c17b-30c7-4ae2-bea2-c1a3cd1aa54f: missing=footer_and_contact_form, news_detail_page; extra=∅

## TPL_Form_Page
- template_file: tpl_form_page.html
- template_blocks: b2b_survey_and_feedback_form, breadcrumbs, footer_and_contact_form, header_and_mega_menu
- partners_creating_work_order: missing=b2b_survey_and_feedback_form; extra=∅

## TPL_Scenario
- template_file: tpl_scenario.html
- template_blocks: accordions_and_sidebar_ui_2, breadcrumbs, connectivity_hero_variant, footer_and_contact_form, header_and_mega_menu, scenario_faq_block, service_and_scenario_cards_1
- scenario_demo: missing=accordions_and_sidebar_ui_2, connectivity_hero_variant, scenario_faq_block; extra=∅
- services/scenario-connecting-object: missing=accordions_and_sidebar_ui_2, connectivity_hero_variant; extra=∅

## TPL_Search_Results
- template_file: tpl_search_results.html
- template_blocks: breadcrumbs, footer_and_contact_form, header_and_mega_menu, search_results_layout
- search: missing=∅; extra=∅
