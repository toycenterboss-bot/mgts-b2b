# Coverage Matrix: Static blocks vs React

Source: [docs/project/STATIC_REACT_DIFF_PAGES.md](/Users/andrey_efremov/Downloads/runs/docs/project/STATIC_REACT_DIFF_PAGES.md) and templates in [design/html_pages](/Users/andrey_efremov/Downloads/runs/design/html_pages).

## Global blocks
| Static block | React component/area | Status | Notes |
| --- | --- | --- | --- |
| `header_and_mega_menu` | Layout: `Header` + `MegaMenu` | covered | Structure exists; needs visual parity check. |
| `breadcrumbs` | `Breadcrumbs` | covered | Needs URL parity and styling alignment. |
| `footer_and_contact_form` | none | missing | Needs dedicated React section (CTA form + footer). |

## Template coverage

### `TPL_Home` (`tpl_home.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `hero_section_and_cta_banner_1` | `Hero` | partial |
| `service_and_scenario_cards_1` | `SectionCards` | partial |
| `news_and_documents_list_2` | none | missing (removed previously) |
| `footer_and_contact_form` | none | missing |

### `TPL_Segment_Landing` (`tpl_segment_landing.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `developers_industry_hero` | `Hero` | partial |
| `service_and_scenario_cards_2` | `SectionCards` | partial |
| `service_cta_banner` | none | missing |
| `footer_and_contact_form` | none | missing |

### `TPL_Service` (`tpl_service.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `hero_section_and_cta_banner_2` | `Hero` | partial |
| `service_customization_panel` | `ServiceCustomizationPanel` | covered |
| `service_stats_card` | `ServiceStatsCard` | covered |
| `pricing_and_specs_table` | `TariffTable` / `SectionTable` | partial |
| `service_faq_section` | `ServiceFaq` | covered |
| `service_consultation_card` | `ServiceConsultationCard` | covered |
| `service_cta_banner` | none | missing |
| `footer_and_contact_form` | none | missing |

### `TPL_Scenario` (`tpl_scenario.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `connectivity_hero_variant` | `Hero` | partial |
| `accordions_and_sidebar_ui_2` | none | missing |
| `scenario_faq_block` | `ServiceFaq` (potential) | partial/missing |
| `service_and_scenario_cards_1` | `SectionCards` | partial |
| `footer_and_contact_form` | none | missing |

### `TPL_Doc_Page` (`tpl_doc_page.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `news_and_documents_list_1` | `DocumentTabs` + `FilesTable` | partial (not wired) |
| `service_consultation_card` | `ServiceConsultationCard` | covered |
| `footer_and_contact_form` | none | missing |

### `TPL_Contact_Hub` (`tpl_contact_hub.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `contacts_with_interactive_3d_map` | `SectionMap` | partial |
| `footer_and_contact_form` | none | missing |

### `TPL_CMS_Page` / `TPL_DeepNav` (`tpl_cms_page.html`, `tpl_deepnav.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `cms_page_renderer` | `page.content` (HTML) + `SectionRenderer` | partial |
| `footer_and_contact_form` | none | missing |

### `TPL_Form_Page` (`tpl_form_page.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `b2b_survey_and_feedback_form` | `FormSection` | partial (styling/structure) |
| `footer_and_contact_form` | none | missing |

### `TPL_Search_Results` (`tpl_search_results.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `search_results_layout` | none | missing |
| `footer_and_contact_form` | none | missing |

### `TPL_AI_Chat` (`tpl_ai_chat.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `ai_assistant_landing_page` | none | missing |
| `footer_and_contact_form` | none | missing |

### `TPL_News_List` / `TPL_News_Detail`
| Block | React mapping | Status |
| --- | --- | --- |
| `news_and_documents_list_2` | `NewsListPage` | covered (layout parity TBD) |
| `news_detail_page` | `NewsDetailPage` | covered (layout parity TBD) |
| `pagination_and_display_controls` | none | missing |
| `footer_and_contact_form` | none | missing |

### `TPL_Career_List` / `TPL_Career_Detail` (`page_career.html`)
| Block | React mapping | Status |
| --- | --- | --- |
| `careers_and_recruitment_page` | `CareerValues`, `CareerVacancies`, `CareerWhyCompany`, `CareerCvForm` | partial |
| `footer_and_contact_form` | none | missing |
