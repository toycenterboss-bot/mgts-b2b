# Маппинг компонентов Strapi на CSS классы

**Дата:** 2026-01-09  
**Назначение:** Документация для разработчиков фронтенда о том, какие CSS классы должны использоваться при рендеринге компонентов Strapi

## Общие принципы

Все компоненты используют BEM-нотацию: `component-name__element-name--modifier`

## Компоненты

### 1. `page.section-text` (Section Text)

**Структура:**
```html
<section class="section-text">
  <h1 class="section-text__title">Заголовок</h1>
  <h2 class="section-text__subtitle">Подзаголовок</h2>
  <h3 class="section-text__subtitle">Подзаголовок 3 уровня</h3>
  <div class="section-text__content">Основной контент</div>
  <div class="section-text__content--narrow">Узкий контент</div>
  <div class="section-text__content--medium">Средний контент</div>
  <div class="section-text__content--small">Мелкий контент</div>
</section>
```

**CSS классы:**
- `section-text` - основной контейнер
- `section-text__title` - заголовок (h1 или div с классом h1-wide-med)
- `section-text__subtitle` - подзаголовок (h2/h3 с классами h2-comp-med/h3-comp-med)
- `section-text__content` - основной контент (p, div с классами p1-text-reg, p1-comp-reg, p2-comp-reg)
- `section-text__content--narrow` - узкий контент (short-text-width, text-width)
- `section-text__content--medium` - средний контент (p1-comp-med, p2-comp-med)
- `section-text__content--small` - мелкий контент (p3-comp-reg)

**Дополнительные классы:**
- `section-text__hero` - для hero секций (promo-long)
- `section-text__hero--default` - модификатор для hero (default)
- `section-text__column` - для колонок (column-info)
- `section-text__tags` - для тегов (content-tags)
- `section-text__buttons` - для кнопок (content-buttons)
- `section-text__text-box` - для текстовых блоков (text-box)
- `section-text__banner` - для баннеров (banner)
- `section-text__banner--gray` - серый баннер (gray)
- `section-text__form-question` - для вопросов в формах (form-question)
- `section-text__box-container` - контейнер для боксов (box-container)
- `section-text__tag` - тег (box-item)
- `section-text__item` - элемент списка (item)
- `section-text__item-title` - заголовок элемента (item-title)
- `section-text__item-text` - текст элемента (item-text)
- `section-text__button` - кнопка (button-item)
- `section-text__buttons-box` - контейнер кнопок (buttons-box)
- `section-text__button-nav` - навигационная кнопка (buttons-box-item)
- `section-text__button-nav--left` - левая навигационная кнопка (buttons-box-item--left)
- `section-text__row-selection` - выбор строки (row-selection)
- `section-text__list` - список (list, unordered-list)
- `section-text__breadcrumbs` - хлебные крошки (crumbs-row)
- `section-text__breadcrumb-item` - элемент хлебных крошек (crumb-item)
- `section-text__breadcrumb-link` - ссылка хлебных крошек (crumb-item-text)
- `section-text__images` - контейнер изображений (images-container)
- `section-text__images-scroll` - скролл изображений (images-scroll-container)
- `section-text__images-line` - линия изображений (images-line)
- `section-text__image` - изображение (image, section-img)
- `section-text__slider` - слайдер (management-slider)
- `section-text__slider-container` - контейнер слайдера (selectors-container)
- `section-text__slider-scroll` - скролл слайдера (selectors-scroll-container)
- `section-text__slider-scroll--blur` - размытие скролла (blur)
- `section-text__slider-line` - линия слайдера (selectors-line)
- `section-text__slider-item` - элемент слайдера (selectors-line-item)
- `section-text__message` - сообщение (message-content)
- `section-text__message-image` - изображение сообщения (message-content-img)
- `section-text__message-card` - карточка сообщения (message-content-card)
- `section-text__message-title` - заголовок сообщения (message-content-card-title)
- `section-text__message-note` - заметка сообщения (message-content-card-note)
- `section-text__message-divider` - разделитель сообщения (message-gray-line)
- `section-text__note-title` - заголовок заметки (note-title)
- `section-text__note-text` - текст заметки (note-text)
- `section-text__value-row` - строка значения (mgts-value-row)
- `section-text__value-tag` - тег значения (mgts-value-row__tag)
- `section-text__objects` - объекты (objects-container)
- `section-text__objects-list` - список объектов (objects-list)
- `section-text__object-item` - элемент объекта (object-item)
- `section-text__map-wrapper` - обертка карты (objects-wrapper)
- `section-text__app` - приложение (surveillance-app)
- `section-text__app-content` - контент приложения (surveillance-app-content-box)
- `section-text__app-download` - загрузка приложения (surveillance-app-download-app-box)
- `section-text__step-title` - заголовок шага (work-step-title)
- `section-text__step-link` - ссылка шага (work-step-link)
- `section-text__scheme-image` - изображение схемы (shareholders_meeting_scheme)
- `section-text__file-name` - имя файла (name)
- `section-text__file-size` - размер файла (size)

### 2. `page.section-cards` (Section Cards)

**Структура:**
```html
<section class="section-cards">
  <h1 class="section-cards__title">Заголовок</h1>
  <div class="section-cards__container">
    <div class="section-cards__card">
      <div class="section-cards__card-header">
        <div class="section-cards__card-icon">...</div>
      </div>
      <div class="section-cards__card-content">
        <h2 class="section-cards__card-title">Заголовок карточки</h2>
        <div class="section-cards__card-text">Текст карточки</div>
      </div>
    </div>
  </div>
</section>
```

**CSS классы:**
- `section-cards` - основной контейнер
- `section-cards__title` - заголовок секции (h1-wide-title-text, services-section-title)
- `section-cards__title-wrapper` - обертка заголовка (h1-wide)
- `section-cards__description` - описание (h1-wide-description-text)
- `section-cards__container` - контейнер карточек (advantage-cards-container, cards-1-containers, cards-2-container, cards-3-container, container-scroll, services-cards, scroll-container, text-cards)
- `section-cards__card` - карточка (advantage-card, card-type-1, card-type-2, card-type-3, services-card, text-card, object-card, gray-card-item, row-item)
- `section-cards__card-header` - заголовок карточки (advantage-card-title-wrapper, card-type-1-header, card-type-2-header, card-type-3-header, card-header)
- `section-cards__card-content` - контент карточки (advantage-card-text-list-wrapper, card-type-1-content-wrapper, card-type-2-content-wrapper, card-type-3-text, card-content-wrapper, content-wrapper, content, object-card-info-box, gray-card-item-info, row-item-text-box)
- `section-cards__card-title` - заголовок карточки (h2-comp-med, h3-comp-med, content-title, card-type-3-header-title, safe-region-title, gray-card-item-title)
- `section-cards__card-text` - текст карточки (content-text, safe-region-text)
- `section-cards__card-image-wrapper` - обертка изображения (object-card-img-wrapper)
- `section-cards__card-image` - изображение карточки (row-item-image, object-card-img)
- `section-cards__card-icon` - иконка карточки (icon)
- `section-cards__card-icon--circle` - круглая иконка (circle)

### 3. `page.history-timeline` (History Timeline)

**Структура:**
```html
<section class="history-timeline">
  <h2 class="history-timeline__title">История</h2>
  <div class="history-timeline__tabs">
    <div class="history-timeline__tabs-container">
      <button class="history-timeline__tab-button">2019 —</button>
    </div>
  </div>
  <div class="history-timeline__content">
    <div class="history-timeline__content-box">
      <div class="history-timeline__periods-list">
        <div class="history-timeline__period">
          <div class="history-timeline__period-title">2019</div>
          <div class="history-timeline__period-content">Контент периода</div>
        </div>
      </div>
    </div>
    <div class="history-timeline__image-container">
      <div class="history-timeline__image">
        <img class="history-timeline__image-img" src="...">
        <span class="history-timeline__image-description">Описание</span>
      </div>
      <div class="history-timeline__note">Заметка</div>
    </div>
  </div>
</section>
```

**CSS классы:**
- `history-timeline` - основной контейнер
- `history-timeline__title` - заголовок (h2-comp-med)
- `history-timeline__tabs` - табы (tabs-row-selection)
- `history-timeline__tabs-container` - контейнер табов (tab-buttons-container)
- `history-timeline__tab-button` - кнопка таба (tab-button-item)
- `history-timeline__content` - контент (history-content)
- `history-timeline__content-box` - бокс контента (content-box)
- `history-timeline__periods-list` - список периодов (data-content-list)
- `history-timeline__period` - период (data-info-item)
- `history-timeline__period-title` - заголовок периода (data-title, h1-wide-med)
- `history-timeline__period-content` - контент периода (p1-text-reg)
- `history-timeline__image-container` - контейнер изображения (image-note-container)
- `history-timeline__image` - изображение (image-box)
- `history-timeline__image-img` - img элемент (image-box__image)
- `history-timeline__image-description` - описание изображения (image-box__description-text)
- `history-timeline__note` - заметка (note-info)

### 4. `page.service-tariffs` (Service Tariffs)

**Структура:**
```html
<section class="service-tariffs">
  <div class="service-tariffs__title-wrapper">
    <h1 class="service-tariffs__title">Тарифы</h1>
    <div class="service-tariffs__description">Описание</div>
  </div>
  <div class="service-tariffs__container">
    <div class="service-tariffs__tariff">
      <h3 class="service-tariffs__tariff-title">Название тарифа</h3>
      <div class="service-tariffs__tariff-services">
        <div class="service-tariffs__tariff-feature">
          <div class="service-tariffs__tariff-feature-label">Скорость</div>
          <div class="service-tariffs__tariff-feature-value">
            <div class="service-tariffs__tariff-feature-unit">мбит</div>
            <div class="service-tariffs__tariff-feature-period">/сек</div>
          </div>
        </div>
      </div>
      <div class="service-tariffs__tariff-footer">
        <div class="service-tariffs__tariff-price">
          <div class="service-tariffs__tariff-price-value">525 ₽</div>
          <div class="service-tariffs__tariff-price-period">/мес</div>
        </div>
      </div>
      <div class="service-tariffs__tariff-comment">Комментарий</div>
      <div class="service-tariffs__tariff-footer-comment">Комментарий в футере</div>
    </div>
  </div>
  <div class="service-tariffs__table-wrapper">
    <div class="service-tariffs__table">
      <div class="service-tariffs__table-row">
        <div class="service-tariffs__table-cell service-tariffs__table-cell--header">Наименование</div>
        <div class="service-tariffs__table-cell service-tariffs__table-cell--text">Текст</div>
        <div class="service-tariffs__table-cell service-tariffs__table-cell--price">Цена</div>
      </div>
    </div>
  </div>
</section>
```

**CSS классы:**
- `service-tariffs` - основной контейнер
- `service-tariffs__title-wrapper` - обертка заголовка (h1-wide)
- `service-tariffs__title` - заголовок (h1-wide-title-text)
- `service-tariffs__description` - описание (h1-wide-description-text)
- `service-tariffs__container` - контейнер тарифов (tariff-cards-container, cards-container-scroll, b2b_connection_request)
- `service-tariffs__tariff` - тариф (tariff-card)
- `service-tariffs__tariff-title` - заголовок тарифа (h3-comp-med)
- `service-tariffs__tariff-services` - услуги тарифа (card-services-box)
- `service-tariffs__tariff-feature` - характеристика тарифа (row-item)
- `service-tariffs__tariff-feature-label` - метка характеристики (row-item-text)
- `service-tariffs__tariff-feature-value` - значение характеристики (row-item-info-box)
- `service-tariffs__tariff-feature-unit` - единица измерения (row-item-info-box-unit)
- `service-tariffs__tariff-feature-period` - период (row-item-info-box-period)
- `service-tariffs__tariff-footer` - футер тарифа (card-tariff)
- `service-tariffs__tariff-price` - цена тарифа (card-tariff-text)
- `service-tariffs__tariff-price-value` - значение цены (card-tariff-text-price)
- `service-tariffs__tariff-price-period` - период цены (card-tariff-text-periods)
- `service-tariffs__tariff-comment` - комментарий тарифа (card-comment)
- `service-tariffs__tariff-footer-comment` - комментарий в футере (card-footer-comment)
- `service-tariffs__table-wrapper` - обертка таблицы (tariff-table)
- `service-tariffs__table` - таблица (table)
- `service-tariffs__table-row` - строка таблицы (table-row)
- `service-tariffs__table-cell` - ячейка таблицы (table-row-item)
- `service-tariffs__table-cell--header` - заголовок ячейки (table-row-item--header)
- `service-tariffs__table-cell--text` - текст ячейки (table-row-item--text)
- `service-tariffs__table-cell--price` - цена ячейки (table-row-item--price)

### 5. `page.service-faq` (Service FAQ)

**Структура:**
```html
<section class="service-faq">
  <div class="service-faq__title-wrapper">
    <h1 class="service-faq__title">FAQ</h1>
  </div>
  <div class="service-faq__items">
    <div class="service-faq__item">
      <div class="service-faq__question">Вопрос</div>
      <div class="service-faq__answer">Ответ</div>
    </div>
  </div>
</section>
```

**CSS классы:**
- `service-faq` - основной контейнер
- `service-faq__title-wrapper` - обертка заголовка (h1-wide)
- `service-faq__title` - заголовок (h1-wide-title-text)
- `service-faq__items` - контейнер элементов
- `service-faq__item` - элемент FAQ (accordion-row)
- `service-faq__question` - вопрос (accordion-row__header, row-header-text)
- `service-faq__answer` - ответ (accordion-row__content)

### 6. `page.service-order-form` (Service Order Form)

**Структура:**
```html
<section class="service-order-form">
  <div class="service-order-form__header">
    <h1 class="service-order-form__title service-order-form__title--high">Заголовок</h1>
    <div class="service-order-form__header-note">Заметка</div>
  </div>
  <form class="service-order-form__form">
    <div class="service-order-form__form-row">
      <div class="service-order-form__field-wrapper">
        <label class="service-order-form__label">Метка</label>
        <div class="service-order-form__input-wrapper">
          <input class="service-order-form__input" type="text">
        </div>
      </div>
    </div>
    <button class="service-order-form__button">
      <span class="service-order-form__button-text">Отправить</span>
    </button>
  </form>
</section>
```

**CSS классы:**
- `service-order-form` - основной контейнер
- `service-order-form__header` - заголовок формы (header)
- `service-order-form__header-title` - заголовок (header-title, header-title-text, h1-wide-med)
- `service-order-form__header-title-content` - контент заголовка (header-title-html-text)
- `service-order-form__header-title--high` - высокий заголовок (high)
- `service-order-form__header-title--low` - низкий заголовок (low)
- `service-order-form__header-note` - заметка (header-note)
- `service-order-form__form` - форма (form-container)
- `service-order-form__form-row` - строка формы (form-container-row-box)
- `service-order-form__field-wrapper` - обертка поля (wrapper)
- `service-order-form__label` - метка (label)
- `service-order-form__input-wrapper` - обертка ввода (box)
- `service-order-form__input` - поле ввода (item)
- `service-order-form__select` - селект (item--select)
- `service-order-form__select-placeholder` - плейсхолдер селекта (item-placeholder)
- `service-order-form__checkbox` - чекбокс (box-input)
- `service-order-form__checkbox-label` - метка чекбокса (box-text)
- `service-order-form__checkbox-style` - стиль чекбокса (box-style)
- `service-order-form__button` - кнопка (button)
- `service-order-form__button-text` - текст кнопки (text)
- `service-order-form__contacts` - контакты (contacts)
- `service-order-form__contacts-column` - колонка контактов (contacts-column)
- `service-order-form__contacts-column-title` - заголовок колонки (contacts-column-title)
- `service-order-form__contacts-column-text` - текст колонки (contacts-column-text)
- `service-order-form__info-row` - строка информации (list-row)
- `service-order-form__info-row-title` - заголовок строки (list-row-title)
- `service-order-form__info-row-text` - текст строки (list-row-text)
- `service-order-form__lk-section` - секция ЛК (request-lk)
- `service-order-form__lk-button-wrapper` - обертка кнопки ЛК (lk-button-box)
- `service-order-form__lk-label` - метка ЛК (lk-button-box-label)
- `service-order-form__lk-qr` - QR код ЛК (lk-qr-img)

### 7. `page.section-map` (Section Map)

**Структура:**
```html
<section class="section-map">
  <h2 class="section-map__title">Карта</h2>
  <div class="section-map__container">
    <div class="section-map__objects">
      <div class="section-map__objects-list">
        <div class="section-map__object-item">Адрес</div>
      </div>
    </div>
    <div class="section-map__map-wrapper">
      <!-- Яндекс карта -->
    </div>
  </div>
</section>
```

**CSS классы:**
- `section-map` - основной контейнер
- `section-map__title` - заголовок
- `section-map__container` - контейнер
- `section-map__objects` - объекты (objects-container)
- `section-map__objects-list` - список объектов (objects-list)
- `section-map__object-item` - элемент объекта (object-item)
- `section-map__map-wrapper` - обертка карты (objects-wrapper)

### 8. `page.mobile-app-section` (Mobile App Section)

**Структура:**
```html
<section class="mobile-app-section">
  <div class="mobile-app-section__header">
    <div class="mobile-app-section__title-wrapper">
      <h1 class="mobile-app-section__title">Приложение</h1>
    </div>
    <div class="mobile-app-section__download">
      <div class="mobile-app-section__stores">
        <!-- Ссылки на магазины -->
      </div>
    </div>
  </div>
</section>
```

**CSS классы:**
- `mobile-app-section` - основной контейнер
- `mobile-app-section__header` - заголовок (app-slider-header)
- `mobile-app-section__title-wrapper` - обертка заголовка (app-slider-header-title, h1-wide)
- `mobile-app-section__title` - заголовок (h1-wide-title-text)
- `mobile-app-section__download` - загрузка (app-slider-header-download-box)
- `mobile-app-section__stores` - магазины (app-stores, app-stores-box)
- `mobile-app-section__content` - контент

### 9. `page.crm-cards` (CRM Cards)

**Структура:**
```html
<section class="crm-cards">
  <h2 class="crm-cards__title">CRM</h2>
  <div class="crm-cards__container">
    <div class="crm-cards__card">
      <img class="crm-cards__card-image" src="...">
    </div>
  </div>
</section>
```

**CSS классы:**
- `crm-cards` - основной контейнер
- `crm-cards__title` - заголовок
- `crm-cards__container` - контейнер
- `crm-cards__card` - карточка (crm-card)
- `crm-cards__card-image` - изображение карточки (crm-card-img)

### 10. `page.image-carousel` (Image Carousel)

**Структура:**
```html
<section class="image-carousel">
  <h2 class="image-carousel__title">Карусель</h2>
  <div class="image-carousel__container">
    <div class="image-carousel__item">
      <img src="...">
      <div class="image-carousel__item-title">Заголовок</div>
    </div>
  </div>
</section>
```

**CSS классы:**
- `image-carousel` - основной контейнер
- `image-carousel__title` - заголовок
- `image-carousel__container` - контейнер
- `image-carousel__item` - элемент карусели

### 11. `page.image-switcher` (Image Switcher)

**Структура:**
```html
<section class="image-switcher">
  <h2 class="image-switcher__title">Переключатель</h2>
  <div class="image-switcher__container">
    <div class="image-switcher__item">
      <img src="...">
    </div>
  </div>
</section>
```

**CSS классы:**
- `image-switcher` - основной контейнер
- `image-switcher__title` - заголовок
- `image-switcher__container` - контейнер
- `image-switcher__item` - элемент переключателя

### 12. `page.how-to-connect` (How to Connect)

**Структура:**
```html
<section class="how-to-connect">
  <h2 class="how-to-connect__title">Как подключить</h2>
  <div class="how-to-connect__steps">
    <div class="how-to-connect__step">
      <!-- Шаг подключения -->
    </div>
  </div>
</section>
```

**CSS классы:**
- `how-to-connect` - основной контейнер
- `how-to-connect__title` - заголовок
- `how-to-connect__steps` - контейнер шагов
- `how-to-connect__step` - шаг подключения

### 13. `page.files-table` (Files Table)

**Структура:**
```html
<section class="files-table">
  <h2 class="files-table__title">Файлы</h2>
  <div class="files-table__container">
    <div class="files-table__item">
      <!-- Элемент файла -->
    </div>
  </div>
</section>
```

**CSS классы:**
- `files-table` - основной контейнер
- `files-table__title` - заголовок
- `files-table__container` - контейнер
- `files-table__item` - элемент файла

### 14. `page.tariff-table` (Tariff Table)

**Структура:**
```html
<section class="tariff-table">
  <h2 class="tariff-table__title">Тарифная таблица</h2>
  <div class="tariff-table__table">
    <!-- Таблица тарифов -->
  </div>
</section>
```

**CSS классы:**
- `tariff-table` - основной контейнер
- `tariff-table__title` - заголовок
- `tariff-table__table` - таблица

## Модификаторы

Общие модификаторы, которые могут использоваться с любыми компонентами:
- `size-L`, `size-M`, `size-S`, `size-XL` - размеры
- `primary`, `secondary` - стили кнопок
- `white`, `gray` - цвета фона
- `vertical`, `scroll` - направления
- `align-top` - выравнивание
- `default` - значение по умолчанию
- `high`, `low` - высота
- `width` - ширина
- `blur` - размытие
- `card-1`, `card-2` - варианты карточек
- `base-style` - базовый стиль
- `card` - карточка

## Примечания

1. Все классы должны быть определены в CSS файлах проекта
2. Классы соответствуют BEM-нотации
3. Модификаторы добавляются через двойное подчеркивание `--`
4. Элементы добавляются через одинарное подчеркивание `__`
5. Классы Яндекс карт (`ymaps3x0--*`) и SVG (`Logo_svg__*`) остаются без изменений
