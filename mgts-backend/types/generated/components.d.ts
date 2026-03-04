import type { Schema, Struct } from '@strapi/strapi';

export interface FooterFooterSection extends Struct.ComponentSchema {
  collectionName: 'components_footer_footersections';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0444\u0443\u0442\u0435\u0440\u0430';
    displayName: 'Footer Section';
  };
  attributes: {
    links: Schema.Attribute.Component<'navigation.menu-link', true>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FooterLegalLink extends Struct.ComponentSchema {
  collectionName: 'components_footer_legallinks';
  info: {
    description: '\u042E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u0432 \u0444\u0443\u0442\u0435\u0440\u0435';
    displayName: 'Legal Link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FooterSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_footer_sociallinks';
  info: {
    description: '\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0441\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u0443\u044E \u0441\u0435\u0442\u044C';
    displayName: 'Social Link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.Media;
    platform: Schema.Attribute.Enumeration<
      ['facebook', 'twitter', 'linkedin', 'vk', 'telegram', 'youtube']
    > &
      Schema.Attribute.Required;
  };
}

export interface NavigationDeepNavItem extends Struct.ComponentSchema {
  collectionName: 'components_navigation_deep_nav_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0434\u0435\u0440\u0435\u0432\u0430 \u043B\u0435\u0432\u043E\u0433\u043E \u043C\u0435\u043D\u044E (link \u0438\u043B\u0438 group \u0441 children)';
    displayName: 'Deep Nav Item';
  };
  attributes: {
    children: Schema.Attribute.Component<'navigation.deep-nav-link', true>;
    href: Schema.Attribute.String;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    kind: Schema.Attribute.Enumeration<['link', 'group']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'link'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface NavigationDeepNavLink extends Struct.ComponentSchema {
  collectionName: 'components_navigation_deep_nav_links';
  info: {
    description: '\u0421\u0441\u044B\u043B\u043A\u0430 \u0432 \u0434\u0435\u0440\u0435\u0432\u0435 \u043B\u0435\u0432\u043E\u0433\u043E \u043C\u0435\u043D\u044E (TPL_DeepNav)';
    displayName: 'Deep Nav Link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavigationDeepNavTree extends Struct.ComponentSchema {
  collectionName: 'components_navigation_deep_nav_trees';
  info: {
    description: '\u0414\u0435\u0440\u0435\u0432\u043E \u043B\u0435\u0432\u043E\u0433\u043E \u043C\u0435\u043D\u044E \u0434\u043B\u044F TPL_DeepNav (\u043A\u043B\u044E\u0447 + \u0441\u043F\u0438\u0441\u043E\u043A items)';
    displayName: 'Deep Nav Tree';
  };
  attributes: {
    items: Schema.Attribute.Component<'navigation.deep-nav-item', true>;
    key: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavigationMegaMenu extends Struct.ComponentSchema {
  collectionName: 'components_navigation_megamenus';
  info: {
    description: 'Mega-menu \u0434\u043B\u044F \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438';
    displayName: 'Mega Menu';
  };
  attributes: {
    href: Schema.Attribute.String;
    menuId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sections: Schema.Attribute.Component<'navigation.mega-menu-section', true>;
    title: Schema.Attribute.String;
  };
}

export interface NavigationMegaMenuCta extends Struct.ComponentSchema {
  collectionName: 'components_navigation_megamenu_ctas';
  info: {
    description: 'CTA \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0441\u043F\u0440\u0430\u0432\u0430 \u0432 mega-menu';
    displayName: 'Mega Menu CTA';
  };
  attributes: {
    backgroundIcon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    buttonHref: Schema.Attribute.String;
    buttonText: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    phoneIcon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    phoneText: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface NavigationMegaMenuSection extends Struct.ComponentSchema {
  collectionName: 'components_navigation_megamenusections';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0432 mega-menu';
    displayName: 'Mega Menu Section';
  };
  attributes: {
    description: Schema.Attribute.Text;
    links: Schema.Attribute.Component<'navigation.menu-link', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    titleHref: Schema.Attribute.String;
  };
}

export interface NavigationMenuItem extends Struct.ComponentSchema {
  collectionName: 'components_navigation_menuitems';
  info: {
    description: '\u041F\u0443\u043D\u043A\u0442 \u0433\u043B\u0430\u0432\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E';
    displayName: 'Menu Item';
  };
  attributes: {
    hasMegaMenu: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    megaMenuId: Schema.Attribute.String;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface NavigationMenuLink extends Struct.ComponentSchema {
  collectionName: 'components_navigation_menulinks';
  info: {
    description: '\u0421\u0441\u044B\u043B\u043A\u0430 \u0432 \u043C\u0435\u043D\u044E';
    displayName: 'Menu Link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageCard extends Struct.ComponentSchema {
  collectionName: 'components_page_cards';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043B\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u0432 \u0441\u0435\u043A\u0446\u0438\u044F\u0445';
    displayName: 'Card';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<'images'>;
    cardType: Schema.Attribute.Enumeration<
      ['navigation', 'info', 'service', 'tariff']
    > &
      Schema.Attribute.DefaultTo<'info'>;
    description: Schema.Attribute.Text;
    disclaimerHtml: Schema.Attribute.RichText;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    image: Schema.Attribute.Media;
    link: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    tag: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageCareerCvForm extends Struct.ComponentSchema {
  collectionName: 'components_page_career_cv_forms';
  info: {
    description: '\u0424\u043E\u0440\u043C\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0440\u0435\u0437\u044E\u043C\u0435';
    displayName: 'Career CV Form';
  };
  attributes: {
    buttonLabel: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    disclaimerHtml: Schema.Attribute.RichText;
    inputPlaceholder: Schema.Attribute.String;
    inputType: Schema.Attribute.Enumeration<['email', 'text', 'tel']> &
      Schema.Attribute.DefaultTo<'email'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String;
  };
}

export interface PageCareerVacancies extends Struct.ComponentSchema {
  collectionName: 'components_page_career_vacancies';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439';
    displayName: 'Career Vacancies';
  };
  attributes: {
    filters: Schema.Attribute.Component<'page.career-vacancy-filter', true>;
    initialVisible: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<2>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showMoreLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435'>;
    title: Schema.Attribute.String;
    totalCount: Schema.Attribute.Integer;
    totalSuffix: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438'>;
    vacancies: Schema.Attribute.Component<'page.career-vacancy-item', true>;
  };
}

export interface PageCareerVacancyFilter extends Struct.ComponentSchema {
  collectionName: 'components_page_career_vacancy_filters';
  info: {
    description: '\u0424\u0438\u043B\u044C\u0442\u0440 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439';
    displayName: 'Career Vacancy Filter';
  };
  attributes: {
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    key: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface PageCareerVacancyItem extends Struct.ComponentSchema {
  collectionName: 'components_page_career_vacancy_items';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438';
    displayName: 'Career Vacancy Item';
  };
  attributes: {
    ctaLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041E\u0442\u043A\u043B\u0438\u043A\u043D\u0443\u0442\u044C\u0441\u044F'>;
    ctaUrl: Schema.Attribute.String;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    meta: Schema.Attribute.Component<'page.career-vacancy-meta', true>;
    salaryText: Schema.Attribute.String;
    tags: Schema.Attribute.Component<'page.career-vacancy-tag', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageCareerVacancyMeta extends Struct.ComponentSchema {
  collectionName: 'components_page_career_vacancy_meta';
  info: {
    description: '\u041C\u0435\u0442\u0430-\u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 (\u0438\u043A\u043E\u043D\u043A\u0430 + \u0442\u0435\u043A\u0441\u0442)';
    displayName: 'Career Vacancy Meta';
  };
  attributes: {
    icon: Schema.Attribute.Enumeration<
      ['location_on', 'work_history', 'schedule', 'apartment']
    > &
      Schema.Attribute.DefaultTo<'location_on'>;
    text: Schema.Attribute.String;
  };
}

export interface PageCareerVacancyTag extends Struct.ComponentSchema {
  collectionName: 'components_page_career_vacancy_tags';
  info: {
    description: '\u0422\u044D\u0433 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 (\u0434\u043B\u044F \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u0438)';
    displayName: 'Career Vacancy Tag';
  };
  attributes: {
    key: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface PageCareerValueItem extends Struct.ComponentSchema {
  collectionName: 'components_page_career_value_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0435\u0439 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438';
    displayName: 'Career Value Item';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    title: Schema.Attribute.String;
  };
}

export interface PageCareerValues extends Struct.ComponentSchema {
  collectionName: 'components_page_career_values';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0435\u0439 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438 \u0434\u043B\u044F \u043A\u0430\u0440\u044C\u0435\u0440\u043D\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B';
    displayName: 'Career Values';
  };
  attributes: {
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    items: Schema.Attribute.Component<'page.career-value-item', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageCareerWhyCard extends Struct.ComponentSchema {
  collectionName: 'components_page_career_why_cards';
  info: {
    description: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0431\u043B\u043E\u043A\u0430 '\u041F\u043E\u0447\u0435\u043C\u0443 \u043C\u044B'";
    displayName: 'Career Why Card';
  };
  attributes: {
    accent: Schema.Attribute.String & Schema.Attribute.DefaultTo<'primary'>;
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    items: Schema.Attribute.Component<'page.career-why-item', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageCareerWhyCompany extends Struct.ComponentSchema {
  collectionName: 'components_page_career_why_companies';
  info: {
    description: "\u0421\u0435\u043A\u0446\u0438\u044F '\u041F\u043E\u0447\u0435\u043C\u0443 \u043C\u044B'";
    displayName: 'Career Why Company';
  };
  attributes: {
    cards: Schema.Attribute.Component<'page.career-why-card', true>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String;
  };
}

export interface PageCareerWhyItem extends Struct.ComponentSchema {
  collectionName: 'components_page_career_why_items';
  info: {
    description: '\u041F\u0443\u043D\u043A\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432';
    displayName: 'Career Why Item';
  };
  attributes: {
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    text: Schema.Attribute.String;
  };
}

export interface PageCarouselItem extends Struct.ComponentSchema {
  collectionName: 'components_page_carousel_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043A\u0430\u0440\u0443\u0441\u0435\u043B\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439';
    displayName: 'Carousel Item';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageCeoFeedback extends Struct.ComponentSchema {
  collectionName: 'components_page_ceo_feedbacks';
  info: {
    description: '\u0424\u043E\u0440\u043C\u0430 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u043A \u0433\u0435\u043D\u0435\u0440\u0430\u043B\u044C\u043D\u043E\u043C\u0443 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440\u0443. \u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043F\u043E \u0448\u0430\u0431\u043B\u043E\u043D\u0443 page_ceo_feedback.';
    displayName: 'CEO Feedback Form';
  };
  attributes: {
    companyLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041A\u043E\u043C\u043F\u0430\u043D\u0438\u044F'>;
    companyPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u0438'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u0423 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043F\u043E \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u044E \u043D\u0430\u0448\u0435\u0433\u043E \u0441\u0435\u0440\u0432\u0438\u0441\u0430 \u0438\u043B\u0438 \u0432\u044B \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043E\u0442\u0437\u044B\u0432\u043E\u043C \u043E \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u0435 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E? \u0412\u0430\u0448\u0435 \u043C\u043D\u0435\u043D\u0438\u0435 \u043A\u0440\u0430\u0439\u043D\u0435 \u0432\u0430\u0436\u043D\u043E \u0434\u043B\u044F \u043D\u0430\u0441.'>;
    disclaimer: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u041D\u0430\u0436\u0438\u043C\u0430\u044F \u043D\u0430 \u043A\u043D\u043E\u043F\u043A\u0443, \u0432\u044B \u0441\u043E\u0433\u043B\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044C \u0441 \u043F\u043E\u043B\u0438\u0442\u0438\u043A\u043E\u0439 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u043E\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445'>;
    emailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0412\u0430\u0448 E-mail'>;
    emailPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'email@company.ru'>;
    messageLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435'>;
    messagePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0412\u0430\u0448\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435...'>;
    nameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0418\u043C\u044F \u0438 \u0444\u0430\u043C\u0438\u043B\u0438\u044F'>;
    namePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041A\u043E\u043D\u0441\u0442\u0430\u043D\u0442\u0438\u043D \u041A\u043E\u043D\u0441\u0442\u0430\u043D\u0442\u0438\u043D\u043E\u043F\u043E\u043B\u044C\u0441\u043A\u0438\u0439'>;
    note: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0412\u0441\u0435 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u0440\u0430\u0441\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u043B\u0438\u0447\u043D\u043E'>;
    noteIcon: Schema.Attribute.String & Schema.Attribute.DefaultTo<'verified'>;
    portraitImage: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        upload: {
          allowedTypes: ['images'];
        };
      }>;
    submitLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0433\u0435\u043D\u0435\u0440\u0430\u043B\u044C\u043D\u043E\u043C\u0443 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440\u0443'>;
    video: Schema.Attribute.Media<'videos'> &
      Schema.Attribute.SetPluginOptions<{
        upload: {
          allowedTypes: ['videos'];
        };
      }>;
  };
}

export interface PageCrmCard extends Struct.ComponentSchema {
  collectionName: 'components_page_crm_cards_items';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 CRM \u0441\u0438\u0441\u0442\u0435\u043C\u044B';
    displayName: 'CRM Card';
  };
  attributes: {
    image: Schema.Attribute.Media;
    link: Schema.Attribute.String;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String;
  };
}

export interface PageCrmCards extends Struct.ComponentSchema {
  collectionName: 'components_page_crm_cards';
  info: {
    description: '\u0411\u043B\u043E\u043A \u0441 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u043C\u0438 CRM \u0441\u0438\u0441\u0442\u0435\u043C. CSS \u043A\u043B\u0430\u0441\u0441\u044B: crm-cards (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), crm-cards__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), crm-cards__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), crm-cards__card (\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430), crm-cards__card-image (\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438)';
    displayName: 'CRM Cards';
  };
  attributes: {
    cards: Schema.Attribute.Component<'page.crm-card', true>;
    description: Schema.Attribute.Text;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String;
  };
}

export interface PageCtaButton extends Struct.ComponentSchema {
  collectionName: 'components_page_cta_buttons';
  info: {
    description: '\u041A\u043D\u043E\u043F\u043A\u0430 \u043F\u0440\u0438\u0437\u044B\u0432\u0430 \u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044E';
    displayName: 'CTA Button';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    style: Schema.Attribute.Enumeration<['primary', 'outline', 'secondary']> &
      Schema.Attribute.DefaultTo<'primary'>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageDocumentTab extends Struct.ComponentSchema {
  collectionName: 'components_page_document_tabs_item';
  info: {
    description: '\u0422\u0430\u0431 \u0441 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438 (\u0444\u0430\u0439\u043B\u0430\u043C\u0438)';
    displayName: 'Document Tab';
  };
  attributes: {
    children: Schema.Attribute.JSON;
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    filterKey: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PageDocumentTabs extends Struct.ComponentSchema {
  collectionName: 'components_page_document_tabs';
  info: {
    description: '\u0411\u043B\u043E\u043A \u0441 \u0442\u0430\u0431\u0430\u043C\u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 (\u0444\u0430\u0439\u043B\u043E\u0432). CSS \u043A\u043B\u0430\u0441\u0441\u044B: document-tabs (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), document-tabs__title (h2 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), document-tabs__tabs (\u0442\u0430\u0431\u044B), document-tabs__tab-button (\u043A\u043D\u043E\u043F\u043A\u0430 \u0442\u0430\u0431\u0430), document-tabs__tab-content (\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0442\u0430\u0431\u0430), document-tabs__files-list (\u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432)';
    displayName: 'Document Tabs';
  };
  attributes: {
    defaultTab: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tabs: Schema.Attribute.Component<'page.document-tab', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_page_faq_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 FAQ';
    displayName: 'FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.RichText & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageFileItem extends Struct.ComponentSchema {
  collectionName: 'components_page_file_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0444\u0430\u0439\u043B\u0430 \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0435';
    displayName: 'File Item';
  };
  attributes: {
    categoryKey: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    file: Schema.Attribute.Media & Schema.Attribute.Required;
    fileType: Schema.Attribute.Enumeration<
      ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'other']
    > &
      Schema.Attribute.DefaultTo<'pdf'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    size: Schema.Attribute.String;
  };
}

export interface PageFilesTable extends Struct.ComponentSchema {
  collectionName: 'components_page_files_tables';
  info: {
    description: '\u0422\u0430\u0431\u043B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0444\u0430\u0439\u043B\u043E\u0432\u044B\u0445 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432. CSS \u043A\u043B\u0430\u0441\u0441\u044B: files-table (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), files-table__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), files-table__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), files-table__item (\u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0444\u0430\u0439\u043B\u0430)';
    displayName: 'Files Table';
  };
  attributes: {
    columns: Schema.Attribute.JSON;
    files: Schema.Attribute.Component<'page.file-item', true>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String;
  };
}

export interface PageFormField extends Struct.ComponentSchema {
  collectionName: 'components_page_form_fields';
  info: {
    description: '\u041F\u043E\u043B\u0435 \u0444\u043E\u0440\u043C\u044B (input/select/textarea/file/button)';
    displayName: 'Form Field';
  };
  attributes: {
    accept: Schema.Attribute.String;
    description: Schema.Attribute.String;
    dragDrop: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String;
    maxLength: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<300>;
    optional: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    options: Schema.Attribute.JSON;
    placeholder: Schema.Attribute.String;
    text: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['input', 'select', 'textarea', 'file', 'button']
    > &
      Schema.Attribute.Required;
  };
}

export interface PageFormSection extends Struct.ComponentSchema {
  collectionName: 'components_page_form_sections';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0444\u043E\u0440\u043C\u044B \u0434\u043B\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u0441 \u043E\u043F\u0440\u043E\u0441\u043D\u0438\u043A\u043E\u043C/\u0437\u0430\u044F\u0432\u043A\u043E\u0439';
    displayName: 'Form Section';
  };
  attributes: {
    disclaimerHtml: Schema.Attribute.RichText;
    elements: Schema.Attribute.Component<'page.form-field', true>;
    submitText: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface PageHero extends Struct.ComponentSchema {
  collectionName: 'components_page_heros';
  info: {
    description: '\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0431\u043B\u043E\u043A \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B. CSS \u043A\u043B\u0430\u0441\u0441\u044B: hero (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), hero__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), hero__subtitle (\u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), hero__content (\u043A\u043E\u043D\u0442\u0435\u043D\u0442)';
    displayName: 'Hero';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<'images'>;
    ctaButtons: Schema.Attribute.Component<'page.cta-button', true>;
    slaItems: Schema.Attribute.Component<'page.hero-sla-item', true>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageHeroSlaItem extends Struct.ComponentSchema {
  collectionName: 'components_page_hero_sla_items';
  info: {
    description: '\u041F\u0443\u043D\u043A\u0442 SLA/\u043C\u0435\u0442\u0440\u0438\u043A\u0438 \u0434\u043B\u044F \u0431\u043B\u043E\u043A\u0430 hero';
    displayName: 'Hero SLA Item';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageHistoryPeriod extends Struct.ComponentSchema {
  collectionName: 'components_page_history_periods';
  info: {
    description: '\u041F\u0435\u0440\u0438\u043E\u0434 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438';
    displayName: 'History Period';
  };
  attributes: {
    badgeLabel: Schema.Attribute.String;
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    factLabel: Schema.Attribute.String;
    factText: Schema.Attribute.Text;
    highlights: Schema.Attribute.JSON;
    image: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        upload: {
          allowedTypes: ['images'];
        };
      }>;
    imageDescription: Schema.Attribute.Text;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    period: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface PageHistoryTimeline extends Struct.ComponentSchema {
  collectionName: 'components_page_history_timelines';
  info: {
    description: '\u0411\u043B\u043E\u043A \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0441 \u043F\u043E\u0441\u0442\u0440\u0430\u043D\u0438\u0447\u043D\u044B\u043C \u043F\u0435\u0440\u0435\u043B\u0438\u0441\u0442\u044B\u0432\u0430\u043D\u0438\u0435\u043C \u0438 \u0442\u0430\u0431\u0430\u043C\u0438. CSS \u043A\u043B\u0430\u0441\u0441\u044B: history-timeline (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), history-timeline__title (h2 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), history-timeline__tabs (\u0442\u0430\u0431\u044B), history-timeline__tab-button (\u043A\u043D\u043E\u043F\u043A\u0430 \u0442\u0430\u0431\u0430), history-timeline__period (\u043F\u0435\u0440\u0438\u043E\u0434), history-timeline__period-title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043F\u0435\u0440\u0438\u043E\u0434\u0430), history-timeline__period-content (\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u043F\u0435\u0440\u0438\u043E\u0434\u0430), history-timeline__image (\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435)';
    displayName: 'History Timeline';
  };
  attributes: {
    ctaHref: Schema.Attribute.String;
    ctaLabel: Schema.Attribute.String;
    defaultPeriod: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    introSubtitle: Schema.Attribute.Text;
    introTitle: Schema.Attribute.String;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    periods: Schema.Attribute.Component<'page.history-period', true>;
    secondaryCtaHref: Schema.Attribute.String;
    secondaryCtaLabel: Schema.Attribute.String;
    secondaryCtaSecondaryHref: Schema.Attribute.String;
    secondaryCtaSecondaryLabel: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageHomeCooperationCta extends Struct.ComponentSchema {
  collectionName: 'components_page_home_cooperation_ctas';
  info: {
    description: 'CTA \u0431\u043B\u043E\u043A \u0437\u0430\u043F\u0440\u043E\u0441\u0430 \u043D\u0430 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E (\u0433\u043B\u0430\u0432\u043D\u0430\u044F)';
    displayName: 'Home Cooperation CTA';
  };
  attributes: {
    buttonHref: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#'>;
    buttonIcon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'> &
      Schema.Attribute.DefaultTo<'bolt'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041D\u0430\u0447\u0430\u0442\u044C \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u0442 \u0432\u0430\u0448\u0435\u0439 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0441\u0435\u0442\u0435\u0432\u043E\u0439 \u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B \u0438 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043F\u043E \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438 \u0437\u0430\u0442\u0440\u0430\u0442 \u043E\u0442 \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u043E\u0432 \u041C\u0413\u0422\u0421.'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    perks: Schema.Attribute.Component<'page.home-perk-item', true>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0422\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0439\u0442\u0435 \u0431\u0438\u0437\u043D\u0435\u0441 \u0441\u0435\u0433\u043E\u0434\u043D\u044F'>;
  };
}

export interface PageHomeIndustryScenarioItem extends Struct.ComponentSchema {
  collectionName: 'components_page_home_industry_scenario_items';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043E\u0442\u0440\u0430\u0441\u043B\u0435\u0432\u043E\u0433\u043E \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F \u0434\u043B\u044F \u0433\u043B\u0430\u0432\u043D\u043E\u0439';
    displayName: 'Home Industry Scenario Item';
  };
  attributes: {
    buttonHref: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041F\u041E\u0414\u0420\u041E\u0411\u041D\u0415\u0415'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043F\u043E\u0442\u043E\u043A\u043E\u0432, \u0442\u0435\u043F\u043B\u043E\u0432\u044B\u0435 \u043A\u0430\u0440\u0442\u044B \u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u043A\u0430\u0441\u0441 \u0441 \u0437\u0430\u0449\u0438\u0442\u043E\u0439 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u043A\u0443\u043F\u0430\u0442\u0435\u043B\u0435\u0439.'>;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'> &
      Schema.Attribute.DefaultTo<'shopping_cart'>;
    tag: Schema.Attribute.String & Schema.Attribute.DefaultTo<'FOR RETAIL'>;
    tagTone: Schema.Attribute.Enumeration<['accent', 'primary']> &
      Schema.Attribute.DefaultTo<'accent'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0423\u043C\u043D\u044B\u0439 \u0420\u0438\u0442\u0435\u0439\u043B'>;
  };
}

export interface PageHomeIndustryScenarios extends Struct.ComponentSchema {
  collectionName: 'components_page_home_industry_scenarios';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u043E\u0442\u0440\u0430\u0441\u043B\u0435\u0432\u044B\u0445 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0435\u0432 \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u043E\u0439';
    displayName: 'Home Industry Scenarios';
  };
  attributes: {
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    items: Schema.Attribute.Component<'page.home-industry-scenario-item', true>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041E\u0442\u0440\u0430\u0441\u043B\u0435\u0432\u044B\u0435 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438'>;
  };
}

export interface PageHomePerkItem extends Struct.ComponentSchema {
  collectionName: 'components_page_home_perk_items';
  info: {
    description: '\u041F\u0443\u043D\u043A\u0442 \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432\u0430 \u0434\u043B\u044F \u0431\u043B\u043E\u043A\u0430 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u043E\u0439';
    displayName: 'Home Perk Item';
  };
  attributes: {
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'> &
      Schema.Attribute.DefaultTo<'check_circle'>;
    label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E'>;
  };
}

export interface PageHomePrivateZone extends Struct.ComponentSchema {
  collectionName: 'components_page_home_private_zones';
  info: {
    description: '\u0411\u043B\u043E\u043A \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F \u0437\u043E\u043D\u0430 \u0434\u043B\u044F \u0433\u043B\u0430\u0432\u043D\u043E\u0439';
    displayName: 'Home Private Zone';
  };
  attributes: {
    buttonHref: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0412\u043E\u0439\u0442\u0438 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443'>;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u0414\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u043C \u043E\u0442\u0447\u0435\u0442\u0430\u043C \u0438 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u043C \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F\u043C \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u0435\u0440\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u0447\u0435\u0440\u0435\u0437 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442.'>;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'> &
      Schema.Attribute.DefaultTo<'lock_open'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F \u0437\u043E\u043D\u0430'>;
  };
}

export interface PageHowToConnect extends Struct.ComponentSchema {
  collectionName: 'components_page_how_to_connects';
  info: {
    description: '\u0420\u0430\u0437\u0434\u0435\u043B \u0441 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0435\u0439 \u043F\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044E \u0443\u0441\u043B\u0443\u0433\u0438. CSS \u043A\u043B\u0430\u0441\u0441\u044B: how-to-connect (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), how-to-connect__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), how-to-connect__steps (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 \u0448\u0430\u0433\u043E\u0432), how-to-connect__step (\u0448\u0430\u0433 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F)';
    displayName: 'How To Connect';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    description: Schema.Attribute.Text;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    steps: Schema.Attribute.Component<'page.how-to-connect-step', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageHowToConnectStep extends Struct.ComponentSchema {
  collectionName: 'components_page_how_to_connect_steps';
  info: {
    description: '\u0428\u0430\u0433 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u043F\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044E';
    displayName: 'How To Connect Step';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media;
    modalHtml: Schema.Attribute.RichText;
    stepNumber: Schema.Attribute.Integer & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageImageCarousel extends Struct.ComponentSchema {
  collectionName: 'components_page_image_carousels';
  info: {
    description: '\u041A\u0430\u0440\u0443\u0441\u0435\u043B\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0441 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430\u043C\u0438. CSS \u043A\u043B\u0430\u0441\u0441\u044B: image-carousel (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), image-carousel__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), image-carousel__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), image-carousel__item (\u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043A\u0430\u0440\u0443\u0441\u0435\u043B\u0438)';
    displayName: 'Image Carousel';
  };
  attributes: {
    autoPlay: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    interval: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<5000>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    items: Schema.Attribute.Component<'page.carousel-item', true>;
    showNavigation: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface PageImageSwitcher extends Struct.ComponentSchema {
  collectionName: 'components_page_image_switchers';
  info: {
    description: '\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043D\u0430 \u043A\u043B\u0438\u043A (SVG \u0442\u0440\u0438\u0433\u0433\u0435\u0440\u044B). CSS \u043A\u043B\u0430\u0441\u0441\u044B: image-switcher (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), image-switcher__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), image-switcher__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), image-switcher__item (\u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044F)';
    displayName: 'Image Switcher';
  };
  attributes: {
    defaultImage: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    items: Schema.Attribute.Component<'page.switcher-item', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageMeta extends Struct.ComponentSchema {
  collectionName: 'components_page_metas';
  info: {
    description: '\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B';
    displayName: 'Meta';
  };
  attributes: {
    description: Schema.Attribute.Text;
    keywords: Schema.Attribute.String;
    ogImage: Schema.Attribute.Media;
  };
}

export interface PageMobileAppSection extends Struct.ComponentSchema {
  collectionName: 'components_page_mobile_app_sections';
  info: {
    description: '\u0420\u0430\u0437\u0434\u0435\u043B \u0441 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0435\u0439 \u043E \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438. CSS \u043A\u043B\u0430\u0441\u0441\u044B: mobile-app-section (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), mobile-app-section__header (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), mobile-app-section__title-wrapper (\u043E\u0431\u0435\u0440\u0442\u043A\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430), mobile-app-section__title (h1 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), mobile-app-section__download (\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430), mobile-app-section__stores (\u043C\u0430\u0433\u0430\u0437\u0438\u043D\u044B \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439)';
    displayName: 'Mobile App Section';
  };
  attributes: {
    appStoreLinks: Schema.Attribute.JSON;
    content: Schema.Attribute.RichText;
    description: Schema.Attribute.Text;
    features: Schema.Attribute.Component<'page.section-text', true>;
    imageSwitcher: Schema.Attribute.Component<'page.image-switcher', false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageSectionCards extends Struct.ComponentSchema {
  collectionName: 'components_page_section_cards';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0441 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u043C\u0438. CSS \u043A\u043B\u0430\u0441\u0441\u044B: section-cards (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), section-cards__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), section-cards__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A), section-cards__card (\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430), section-cards__card-title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438), section-cards__card-content (\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438)';
    displayName: 'Section Cards';
  };
  attributes: {
    cards: Schema.Attribute.Component<'page.card', true>;
    columns: Schema.Attribute.Enumeration<['1', '2', '3', '4']> &
      Schema.Attribute.DefaultTo<'3'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface PageSectionGrid extends Struct.ComponentSchema {
  collectionName: 'components_page_section_grids';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0441 \u0441\u0435\u0442\u043A\u043E\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430';
    displayName: 'Section Grid';
  };
  attributes: {
    gridType: Schema.Attribute.Enumeration<
      ['navigation', 'info', 'service', 'tariff', 'mixed']
    > &
      Schema.Attribute.DefaultTo<'mixed'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    items: Schema.Attribute.Component<'page.card', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageSectionMap extends Struct.ComponentSchema {
  collectionName: 'components_page_section_maps';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0441 \u043A\u0430\u0440\u0442\u043E\u0439 (\u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442\u044B). CSS \u043A\u043B\u0430\u0441\u0441\u044B: section-map (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), section-map__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), section-map__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), section-map__objects (\u043E\u0431\u044A\u0435\u043A\u0442\u044B), section-map__objects-list (\u0441\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u0432), section-map__object-item (\u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u043E\u0431\u044A\u0435\u043A\u0442\u0430), section-map__map-wrapper (\u043E\u0431\u0435\u0440\u0442\u043A\u0430 \u043A\u0430\u0440\u0442\u044B)';
    displayName: 'Section Map';
  };
  attributes: {
    centerLat: Schema.Attribute.Float;
    centerLng: Schema.Attribute.Float;
    description: Schema.Attribute.Text;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    mapType: Schema.Attribute.Enumeration<['yandex', 'google', 'custom']> &
      Schema.Attribute.DefaultTo<'yandex'>;
    mapUrl: Schema.Attribute.String;
    markers: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
    zoom: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<10>;
  };
}

export interface PageSectionTable extends Struct.ComponentSchema {
  collectionName: 'components_page_section_tables';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0441 \u0442\u0430\u0431\u043B\u0438\u0446\u0435\u0439';
    displayName: 'Section Table';
  };
  attributes: {
    customizationButtonHref: Schema.Attribute.String;
    customizationButtonText: Schema.Attribute.String;
    customizationText: Schema.Attribute.Text;
    customizationTitle: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    showCustomization: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    tableData: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
  };
}

export interface PageSectionText extends Struct.ComponentSchema {
  collectionName: 'components_page_section_texts';
  info: {
    description: '\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u0430\u044F \u0441\u0435\u043A\u0446\u0438\u044F. CSS \u043A\u043B\u0430\u0441\u0441\u044B: section-text (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), section-text__title (h1/h2 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), section-text__subtitle (h2/h3 \u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), section-text__content (\u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442), section-text__content--narrow (\u0443\u0437\u043A\u0438\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442)';
    displayName: 'Section Text';
  };
  attributes: {
    backgroundColor: Schema.Attribute.String;
    backgroundImage: Schema.Attribute.Media<'images'>;
    content: Schema.Attribute.RichText;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    socialLinks: Schema.Attribute.Component<'page.social-links', false>;
    title: Schema.Attribute.String;
  };
}

export interface PageServiceConsultationCard extends Struct.ComponentSchema {
  collectionName: 'components_page_service_consultation_cards';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u0438 \u0434\u043B\u044F TPL_Service';
    displayName: 'Service Consultation Card';
  };
  attributes: {
    buttonHref: Schema.Attribute.String;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0421\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u043D\u0430\u043C\u0438'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u041D\u0430\u0448\u0438 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u044B \u0433\u043E\u0442\u043E\u0432\u044B \u043E\u0442\u0432\u0435\u0442\u0438\u0442\u044C \u043D\u0430 \u043B\u044E\u0431\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u043F\u043E \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438 24/7.'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041D\u0443\u0436\u043D\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044F?'>;
  };
}

export interface PageServiceCtaBanner extends Struct.ComponentSchema {
  collectionName: 'components_page_service_cta_banners';
  info: {
    description: 'CTA \u0431\u0430\u043D\u043D\u0435\u0440 (\u0413\u043E\u0442\u043E\u0432\u044B \u043A \u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438?) \u0434\u043B\u044F TPL_Service';
    displayName: 'Service CTA Banner';
  };
  attributes: {
    buttonHref: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0421\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u043D\u0430\u043C\u0438'>;
    icon: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::icon-picker.icon'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    note: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041E\u0442\u0432\u0435\u0447\u0430\u0435\u043C \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 15 \u043C\u0438\u043D\u0443\u0442 \u0432 \u0440\u0430\u0431\u043E\u0447\u0435\u0435 \u0432\u0440\u0435\u043C\u044F'>;
    subtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u041E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u044F\u0432\u043A\u0443 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u0443\u044E \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044E \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u0430 \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044E \u0418\u0422-\u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B \u0432\u0430\u0448\u0435\u0433\u043E \u043F\u0440\u0435\u0434\u043F\u0440\u0438\u044F\u0442\u0438\u044F.'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0413\u043E\u0442\u043E\u0432\u044B \u043A \u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438?'>;
  };
}

export interface PageServiceCustomizationPanel extends Struct.ComponentSchema {
  collectionName: 'components_page_service_customization_panels';
  info: {
    description: '\u041F\u0430\u043D\u0435\u043B\u044C \u043A\u0430\u0441\u0442\u043E\u043C\u0438\u0437\u0430\u0446\u0438\u0438 \u0443\u0441\u043B\u0443\u0433\u0438 (dropdown + \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u0438)';
    displayName: 'Service Customization Panel';
  };
  attributes: {
    applyText: Schema.Attribute.String;
    dropdownLabel: Schema.Attribute.String;
    dropdownOptions: Schema.Attribute.JSON;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.String;
    toggles: Schema.Attribute.JSON;
  };
}

export interface PageServiceFaq extends Struct.ComponentSchema {
  collectionName: 'components_page_service_faqs';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F FAQ \u0434\u043B\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u0443\u0441\u043B\u0443\u0433. CSS \u043A\u043B\u0430\u0441\u0441\u044B: service-faq (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), service-faq__title (h1 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), service-faq__items (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432), service-faq__item (\u044D\u043B\u0435\u043C\u0435\u043D\u0442 FAQ), service-faq__question (\u0432\u043E\u043F\u0440\u043E\u0441), service-faq__answer (\u043E\u0442\u0432\u0435\u0442)';
    displayName: 'Service FAQ';
  };
  attributes: {
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    items: Schema.Attribute.Component<'page.faq-item', true>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0427\u0430\u0441\u0442\u043E \u0437\u0430\u0434\u0430\u0432\u0430\u0435\u043C\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B'>;
  };
}

export interface PageServiceOrderForm extends Struct.ComponentSchema {
  collectionName: 'components_page_service_order_forms';
  info: {
    description: '\u0424\u043E\u0440\u043C\u0430 \u0437\u0430\u043A\u0430\u0437\u0430 \u0443\u0441\u043B\u0443\u0433\u0438. CSS \u043A\u043B\u0430\u0441\u0441\u044B: service-order-form (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), service-order-form__title (h1 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), service-order-form__form (\u0444\u043E\u0440\u043C\u0430), service-order-form__field-wrapper (\u043E\u0431\u0435\u0440\u0442\u043A\u0430 \u043F\u043E\u043B\u044F), service-order-form__label (\u043C\u0435\u0442\u043A\u0430), service-order-form__input (\u043F\u043E\u043B\u0435 \u0432\u0432\u043E\u0434\u0430), service-order-form__button (\u043A\u043D\u043E\u043F\u043A\u0430)';
    displayName: 'Service Order Form';
  };
  attributes: {
    badgeText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0413\u043E\u0442\u043E\u0432\u044B \u043A \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044E?'>;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443'>;
    disclaimerHtml: Schema.Attribute.RichText &
      Schema.Attribute.DefaultTo<'\u041D\u0430\u0436\u0438\u043C\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0443, \u0432\u044B \u0441\u043E\u0433\u043B\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044C \u0441 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C\u0438 <a href="#">\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445</a>'>;
    emailMaxLength: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<300>;
    emailRequired: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    formAction: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#'>;
    formMethod: Schema.Attribute.Enumeration<['POST', 'GET']> &
      Schema.Attribute.DefaultTo<'POST'>;
    formType: Schema.Attribute.Enumeration<
      [
        'business-request',
        'government-request',
        'partners-request',
        'developers-request',
        'feedback',
        'general-request',
      ]
    > &
      Schema.Attribute.DefaultTo<'general-request'>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    messageMaxLength: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<300>;
    messageRequired: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    nameMaxLength: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<300>;
    nameRequired: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    phoneMaxLength: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<18>;
    phoneRequired: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    recipientEmail: Schema.Attribute.Email;
    recipientPhone: Schema.Attribute.String;
    section: Schema.Attribute.Enumeration<
      [
        'business',
        'operators',
        'government',
        'partners',
        'developers',
        'about_mgts',
        'news',
        'other',
      ]
    >;
    subtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'\u041E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u044F\u0432\u043A\u0443, \u0438 \u043D\u0430\u0448 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u0441\u0432\u044F\u0436\u0435\u0442\u0441\u044F \u0441 \u0432\u0430\u043C\u0438 \u0434\u043B\u044F \u0434\u0435\u0442\u0430\u043B\u044C\u043D\u043E\u0439 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u0438 \u043F\u043E \u0438\u043D\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u044B\u043C \u0440\u0435\u0448\u0435\u043D\u0438\u044F\u043C \u041C\u0413\u0422\u0421.'>;
    supportEmailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Email \u0434\u043B\u044F \u0431\u0438\u0437\u043D\u0435\u0441\u0430'>;
    supportEmailValue: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'b2b@mgts.ru'>;
    supportPhoneLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430 24/7'>;
    supportPhoneValue: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'8 800 250 0890'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041E\u0431\u0441\u0443\u0434\u0438\u043C \u0432\u0430\u0448 \u043F\u0440\u043E\u0435\u043A\u0442'>;
  };
}

export interface PageServiceStatsCard extends Struct.ComponentSchema {
  collectionName: 'components_page_service_stats_cards';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438/\u043C\u0435\u0442\u0440\u0438\u043A\u0438 \u0434\u043B\u044F \u0443\u0441\u043B\u0443\u0433\u0438';
    displayName: 'Service Stats Card';
  };
  attributes: {
    bars: Schema.Attribute.JSON;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    statLabel: Schema.Attribute.String;
    statValue: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface PageServiceTab extends Struct.ComponentSchema {
  collectionName: 'components_page_service_tabs_item';
  info: {
    description: '\u0422\u0430\u0431 \u0441 \u0443\u0441\u043B\u0443\u0433\u0430\u043C\u0438 (\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u043C\u0438 \u0443\u0441\u043B\u0443\u0433)';
    displayName: 'Service Tab';
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PageServiceTabs extends Struct.ComponentSchema {
  collectionName: 'components_page_service_tabs';
  info: {
    description: '\u0411\u043B\u043E\u043A \u0441 \u0442\u0430\u0431\u0430\u043C\u0438 \u0443\u0441\u043B\u0443\u0433 (\u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u0443\u0441\u043B\u0443\u0433). CSS \u043A\u043B\u0430\u0441\u0441\u044B: service-tabs (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), service-tabs__title (h2 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), service-tabs__tabs (\u0442\u0430\u0431\u044B), service-tabs__tab-button (\u043A\u043D\u043E\u043F\u043A\u0430 \u0442\u0430\u0431\u0430), service-tabs__tab-content (\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0442\u0430\u0431\u0430), service-tabs__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A)';
    displayName: 'Service Tabs';
  };
  attributes: {
    defaultTab: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tabs: Schema.Attribute.Component<'page.service-tab', true>;
    title: Schema.Attribute.String;
  };
}

export interface PageServiceTariffs extends Struct.ComponentSchema {
  collectionName: 'components_page_service_tariffs';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u0442\u0430\u0440\u0438\u0444\u043E\u0432 \u0434\u043B\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u0443\u0441\u043B\u0443\u0433. CSS \u043A\u043B\u0430\u0441\u0441\u044B: service-tariffs (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), service-tariffs__title (h1 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), service-tariffs__container (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 \u0442\u0430\u0440\u0438\u0444\u043E\u0432), service-tariffs__tariff (\u0442\u0430\u0440\u0438\u0444), service-tariffs__tariff-title (h3 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0442\u0430\u0440\u0438\u0444\u0430), service-tariffs__table (\u0442\u0430\u0431\u043B\u0438\u0446\u0430), service-tariffs__table-row (\u0441\u0442\u0440\u043E\u043A\u0430 \u0442\u0430\u0431\u043B\u0438\u0446\u044B), service-tariffs__table-cell (\u044F\u0447\u0435\u0439\u043A\u0430 \u0442\u0430\u0431\u043B\u0438\u0446\u044B)';
    displayName: 'Service Tariffs';
  };
  attributes: {
    tariffs: Schema.Attribute.Component<'page.tariff-item', true>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0422\u0430\u0440\u0438\u0444\u044B \u0438 \u0446\u0435\u043D\u044B'>;
  };
}

export interface PageSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_page_social_links';
  info: {
    description: '\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0441\u043E\u0446\u0441\u0435\u0442\u044C (\u043B\u043E\u0433\u043E\u0442\u0438\u043F + \u043F\u043E\u0434\u043F\u0438\u0441\u044C)';
    displayName: 'Social Link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.Media;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    platform: Schema.Attribute.Enumeration<
      ['vk', 'ok', 'telegram', 'youtube', 'other']
    > &
      Schema.Attribute.DefaultTo<'other'>;
  };
}

export interface PageSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_page_social_links_groups';
  info: {
    description: '\u0413\u0440\u0443\u043F\u043F\u0430 \u0441\u0441\u044B\u043B\u043E\u043A \u043D\u0430 \u0441\u043E\u0446\u0441\u0435\u0442\u0438';
    displayName: 'Social Links';
  };
  attributes: {
    items: Schema.Attribute.Component<'page.social-link', true>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0421\u043E\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u0435\u0442\u0438'>;
  };
}

export interface PageSwitcherItem extends Struct.ComponentSchema {
  collectionName: 'components_page_switcher_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044F \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439';
    displayName: 'Switcher Item';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    svgIcon: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageTariffItem extends Struct.ComponentSchema {
  collectionName: 'components_page_tariff_items';
  info: {
    description: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0442\u0430\u0440\u0438\u0444\u0430';
    displayName: 'Tariff Item';
  };
  attributes: {
    badgeText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439'>;
    buttonLink: Schema.Attribute.String;
    buttonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0442\u0430\u0440\u0438\u0444'>;
    description: Schema.Attribute.Text;
    features: Schema.Attribute.Text & Schema.Attribute.Required;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    price: Schema.Attribute.String & Schema.Attribute.Required;
    pricePeriod: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/\u043C\u0435\u0441'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageTariffTable extends Struct.ComponentSchema {
  collectionName: 'components_page_tariff_tables';
  info: {
    description: '\u0422\u0430\u0431\u043B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0442\u0430\u0440\u0438\u0444\u043E\u0432. CSS \u043A\u043B\u0430\u0441\u0441\u044B: tariff-table (\u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440), tariff-table__title (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A), tariff-table__table (\u0442\u0430\u0431\u043B\u0438\u0446\u0430)';
    displayName: 'Tariff Table';
  };
  attributes: {
    columns: Schema.Attribute.JSON & Schema.Attribute.Required;
    description: Schema.Attribute.Text;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    rows: Schema.Attribute.JSON & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface PageTemplateBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_template_blocks';
  info: {
    description: '\u0412\u0441\u0442\u0430\u0432\u043A\u0430 \u0431\u043B\u043E\u043A\u0430 \u0438\u0437 \u0441\u0442\u0430\u0442\u0438\u0447\u043D\u043E\u0433\u043E \u0448\u0430\u0431\u043B\u043E\u043D\u0430 (\u043F\u043E data-stitch-block)';
    displayName: 'Template Block';
  };
  attributes: {
    block: Schema.Attribute.String & Schema.Attribute.Required;
    stripFooter: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    template: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProductSpecification extends Struct.ComponentSchema {
  collectionName: 'components_product_specifications';
  info: {
    description: '\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430 \u0442\u043E\u0432\u0430\u0440\u0430';
    displayName: 'Product Specification';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    unit: Schema.Attribute.String;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProductVariant extends Struct.ComponentSchema {
  collectionName: 'components_product_variants';
  info: {
    description: '\u0412\u0430\u0440\u0438\u0430\u043D\u0442 \u0442\u043E\u0432\u0430\u0440\u0430';
    displayName: 'Product Variant';
  };
  attributes: {
    isAvailable: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    oldPrice: Schema.Attribute.Decimal;
    price: Schema.Attribute.Decimal;
    sku: Schema.Attribute.String;
    stockQuantity: Schema.Attribute.Integer;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'footer.footer-section': FooterFooterSection;
      'footer.legal-link': FooterLegalLink;
      'footer.social-link': FooterSocialLink;
      'navigation.deep-nav-item': NavigationDeepNavItem;
      'navigation.deep-nav-link': NavigationDeepNavLink;
      'navigation.deep-nav-tree': NavigationDeepNavTree;
      'navigation.mega-menu': NavigationMegaMenu;
      'navigation.mega-menu-cta': NavigationMegaMenuCta;
      'navigation.mega-menu-section': NavigationMegaMenuSection;
      'navigation.menu-item': NavigationMenuItem;
      'navigation.menu-link': NavigationMenuLink;
      'page.card': PageCard;
      'page.career-cv-form': PageCareerCvForm;
      'page.career-vacancies': PageCareerVacancies;
      'page.career-vacancy-filter': PageCareerVacancyFilter;
      'page.career-vacancy-item': PageCareerVacancyItem;
      'page.career-vacancy-meta': PageCareerVacancyMeta;
      'page.career-vacancy-tag': PageCareerVacancyTag;
      'page.career-value-item': PageCareerValueItem;
      'page.career-values': PageCareerValues;
      'page.career-why-card': PageCareerWhyCard;
      'page.career-why-company': PageCareerWhyCompany;
      'page.career-why-item': PageCareerWhyItem;
      'page.carousel-item': PageCarouselItem;
      'page.ceo-feedback': PageCeoFeedback;
      'page.crm-card': PageCrmCard;
      'page.crm-cards': PageCrmCards;
      'page.cta-button': PageCtaButton;
      'page.document-tab': PageDocumentTab;
      'page.document-tabs': PageDocumentTabs;
      'page.faq-item': PageFaqItem;
      'page.file-item': PageFileItem;
      'page.files-table': PageFilesTable;
      'page.form-field': PageFormField;
      'page.form-section': PageFormSection;
      'page.hero': PageHero;
      'page.hero-sla-item': PageHeroSlaItem;
      'page.history-period': PageHistoryPeriod;
      'page.history-timeline': PageHistoryTimeline;
      'page.home-cooperation-cta': PageHomeCooperationCta;
      'page.home-industry-scenario-item': PageHomeIndustryScenarioItem;
      'page.home-industry-scenarios': PageHomeIndustryScenarios;
      'page.home-perk-item': PageHomePerkItem;
      'page.home-private-zone': PageHomePrivateZone;
      'page.how-to-connect': PageHowToConnect;
      'page.how-to-connect-step': PageHowToConnectStep;
      'page.image-carousel': PageImageCarousel;
      'page.image-switcher': PageImageSwitcher;
      'page.meta': PageMeta;
      'page.mobile-app-section': PageMobileAppSection;
      'page.section-cards': PageSectionCards;
      'page.section-grid': PageSectionGrid;
      'page.section-map': PageSectionMap;
      'page.section-table': PageSectionTable;
      'page.section-text': PageSectionText;
      'page.service-consultation-card': PageServiceConsultationCard;
      'page.service-cta-banner': PageServiceCtaBanner;
      'page.service-customization-panel': PageServiceCustomizationPanel;
      'page.service-faq': PageServiceFaq;
      'page.service-order-form': PageServiceOrderForm;
      'page.service-stats-card': PageServiceStatsCard;
      'page.service-tab': PageServiceTab;
      'page.service-tabs': PageServiceTabs;
      'page.service-tariffs': PageServiceTariffs;
      'page.social-link': PageSocialLink;
      'page.social-links': PageSocialLinks;
      'page.switcher-item': PageSwitcherItem;
      'page.tariff-item': PageTariffItem;
      'page.tariff-table': PageTariffTable;
      'page.template-block': PageTemplateBlock;
      'product.specification': ProductSpecification;
      'product.variant': ProductVariant;
    }
  }
}
