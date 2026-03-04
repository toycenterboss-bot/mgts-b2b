const fs = require('fs');
const path = require('path');

const NORMALIZE_SCRIPT = path.join(__dirname, 'normalize-html-structure.js');

// Загружаем скрипт
let scriptContent = fs.readFileSync(NORMALIZE_SCRIPT, 'utf-8');

// Полный маппинг всех оставшихся классов (вручную проверенный)
const allMappings = {
    'files-table': {
        'file-item__type-img': 'files-table__item-icon',
    },
    'service-tariffs': {
        'title-h1-wide': 'service-tariffs__title-wrapper',
        'title-h1-wide__title-text': 'service-tariffs__title',
        'title-h1-wide__description-text': 'service-tariffs__description',
        'b2b_connection_request': '', // служебный класс, удаляем
        'block-tariff-table': 'service-tariffs__table-wrapper',
        'p3-comp-reg': 'service-tariffs__description',
    },
    'service-faq': {
        'link-img': 'service-faq__link-icon',
        'h2-comp-med': 'service-faq__subtitle',
        'step-title-block': 'service-faq__title',
        'mb-32': '', // служебный класс, удаляем
        'block-text-box': 'service-faq__text-box',
        'nolink_inmobile': '', // служебный класс, удаляем
    },
    'service-order-form': {
        'information-list-row': 'service-order-form__info-row',
        'information-list-row__title': 'service-order-form__info-row-title',
        'information-list-row__text': 'service-order-form__info-row-text',
        'p1-comp-med': 'service-order-form__text--medium',
        'input-item--select': 'service-order-form__select',
        'select-item-placeholder': 'service-order-form__select-placeholder',
        'request-header__title-description': 'service-order-form__header-description',
        'drag-and-drop': 'service-order-form__drag-drop',
        'drag-and-drop__item': 'service-order-form__drag-drop-item',
        'drag-and-drop__item-button': 'service-order-form__drag-drop-button',
        'drag-and-drop__item-button-input': 'service-order-form__drag-drop-input',
        'drag-and-drop__description': 'service-order-form__drag-drop-description',
        'input-box': 'service-order-form__input-wrapper',
        'input-item': 'service-order-form__input',
        'label-not-required': 'service-order-form__label--optional',
        'upload-completed-application-form': 'service-order-form__upload-completed',
        'underlining': 'service-order-form__underline',
        'textarea-box': 'service-order-form__textarea-wrapper',
        'textarea-box__label': 'service-order-form__label',
        'textarea-box__input': 'service-order-form__textarea',
        'textarea-box__text-description': 'service-order-form__textarea-description',
    },
    'section-text': {
        'bread-crumbs-row': '', // хлебные крошки, удаляем
        'link-img': 'section-text__link-icon',
        'title-h1-wide': 'section-text__title-wrapper',
        'title-h1-wide__title-text': 'section-text__title',
        'title-h1-wide__description-text': 'section-text__description',
        'information-list-row': 'section-text__info-row',
        'information-list-row__title': 'section-text__info-row-title',
        'information-list-row__text': 'section-text__info-row-text',
        'news-row-item': 'section-text__news-item',
        'news-row-item__date': 'section-text__news-date',
        'news-row-item__content': 'section-text__news-content',
        'news-row-item__content-wrapper': 'section-text__news-content-wrapper',
        'news-title': 'section-text__title',
        'news-info-box': 'section-text__news-info',
        'news-info-box__text': 'section-text__news-info-text',
        'news-info-box__chevron': 'section-text__news-info-chevron',
        'news-item-page': 'section-text__news-page',
        'news-item-page__content': 'section-text__news-page-content',
        'content-header': 'section-text__header',
        'header__title': 'section-text__header-title',
        'header__date': 'section-text__header-date',
        'feedback-form-question': 'section-text__form-question',
        'radios-box': 'section-text__radios',
        'radios-box-container': 'section-text__radios-container',
        'radios-box-description': 'section-text__radios-description',
        'mt-48': '', // служебный класс, удаляем
        'admission-work-step-title': 'section-text__step-title',
        'admission-work-step-link': 'section-text__step-link',
        'mb-24': '', // служебный класс, удаляем
        'tabs-row-selection': 'section-text__tabs',
        'tab-buttons-container': 'section-text__tabs-container',
        'tablet-content__text': 'section-text__tablet-text',
        'mb-120': '', // служебный класс, удаляем
        'select-chevron': 'section-text__select-chevron',
        'slider-selectors-line__item': 'section-text__slider-item',
        'slider-image': 'section-text__slider-image',
        'step-section__text': 'section-text__step-text',
        'statistic-item': 'section-text__statistic-item',
        'header-text': 'section-text__header-text',
        'footer-text': 'section-text__footer-text',
        'content-container': 'section-text__container',
        'news-list-column': 'section-text__news-column',
        'column-text-box': 'section-text__column-text',
        'mobile-app-store': 'section-text__app-store',
        'arrow-buttons-box__item': 'section-text__arrow-button',
        'banner-safe-region': 'section-text__banner-safe-region',
        'banner-safe-region-text': 'section-text__banner-safe-region-text',
        'ceo-message-content': 'section-text__message-content',
        'message-note-title': 'section-text__note-title',
        'message-note-text': 'section-text__note-text',
        'about-company__content-logo': 'section-text__content-logo',
        'about-company__content-text': 'section-text__content-text',
        'news-page': 'section-text__news-page',
        'news-page-header': 'section-text__news-page-header',
        'header-select-wrapper': 'section-text__select-wrapper',
        'select-item-text': 'section-text__select-item-text',
        'news-list-end': 'section-text__news-list-end',
        'spinner': 'section-text__spinner',
        'type-spinner-L': 'section-text__spinner--large',
        'color-spinner-black': 'section-text__spinner--black',
        'documents-container': 'section-text__documents-container',
        'feedback-form-container': 'section-text__form-container',
        'mb-80': '', // служебный класс, удаляем
        'columns-text-box': 'section-text__columns-text',
        'video-surveillance-app': 'section-text__surveillance-app',
        'video-surveillance-app__content-box': 'section-text__surveillance-app-content',
        'video-surveillance-app__download-app-box': 'section-text__surveillance-app-download',
        'mobile-app-stores-box': 'section-text__app-stores',
        'our-advantages-container': 'section-text__advantages-container',
        'advantages-row-column': 'section-text__advantages-column',
        'call-management-slider': 'section-text__slider',
        'slider-selectors-container': 'section-text__slider-selectors',
        'slider-selectors-line': 'section-text__slider-line',
        'arrow-buttons-box': 'section-text__arrow-buttons',
        'arrow-buttons-box__item--left': 'section-text__arrow-button--left',
        'slider-images-container': 'section-text__slider-images',
        'slider-images-line': 'section-text__slider-images-line',
        'p1-comp-med': 'section-text__content--medium',
    },
    'section-cards': {
        'mt-80': '', // служебный класс, удаляем
        'title-margin-top': '', // служебный класс, удаляем
        'p1-comp-reg': 'section-cards__card-text',
        'h1-wide-med': 'section-cards__title',
        'all-services-section__title': 'section-cards__title',
        'p2-comp-reg': 'section-cards__card-text',
    },
    'mobile-app-section': {
        'qr-code-item': 'mobile-app-section__qr-item',
    },
};

console.log('📋 ДОБАВЛЕНИЕ ВСЕХ МАППИНГОВ В СКРИПТ НОРМАЛИЗАЦИИ');
console.log('='.repeat(70));

// Для каждого компонента добавляем маппинги
Object.keys(allMappings).forEach(component => {
    const componentMapping = allMappings[component];
    const classCount = Object.keys(componentMapping).length;
    
    console.log(`\n${component}: ${classCount} классов`);
    
    // Находим определение компонента в скрипте
    const componentRegex = new RegExp(`(['"])${component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*:\\s*\\{`, 's');
    const match = scriptContent.match(componentRegex);
    
    if (match) {
        const startIndex = match.index + match[0].length - 1; // Позиция открывающей скобки
        
        // Находим закрывающую скобку компонента
        let braceCount = 0;
        let inString = false;
        let stringChar = null;
        let endIndex = startIndex;
        
        for (let i = startIndex; i < scriptContent.length; i++) {
            const char = scriptContent[i];
            const prevChar = i > 0 ? scriptContent[i - 1] : '';
            
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = null;
            } else if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Извлекаем текущее содержимое
        const currentContent = scriptContent.substring(startIndex + 1, endIndex);
        
        // Добавляем новые маппинги
        let newMappings = [];
        Object.keys(componentMapping).forEach(oldClass => {
            const newClass = componentMapping[oldClass];
            // Проверяем, нет ли уже такого маппинга
            const escapedOldClass = oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (!new RegExp(`['"]${escapedOldClass}['"]\\s*:`).test(currentContent)) {
                const comment = newClass === '' ? ' // служебный класс, удаляем' : '';
                newMappings.push(`        '${oldClass}': '${newClass}',${comment}`);
            }
        });
        
        if (newMappings.length > 0) {
            // Вставляем перед закрывающей скобкой
            const insertIndex = endIndex;
            const needsComma = !currentContent.trim().endsWith(',') && currentContent.trim().length > 0;
            const insertText = (needsComma ? ',' : '') + '\n' + newMappings.join('\n') + '\n';
            
            scriptContent = scriptContent.substring(0, insertIndex) + insertText + scriptContent.substring(insertIndex);
            console.log(`  ✅ Добавлено ${newMappings.length} маппингов`);
        } else {
            console.log(`  ⚠️  Все маппинги уже присутствуют`);
        }
    } else {
        console.log(`  ❌ Не найдено определение компонента ${component}`);
    }
});

// Сохраняем обновленный скрипт
fs.writeFileSync(NORMALIZE_SCRIPT, scriptContent, 'utf-8');

console.log('\n✅ Все маппинги добавлены в скрипт нормализации');
console.log('='.repeat(70));
