# Обновление схем компонентов Strapi

**Дата:** 2026-01-09  
**Статус:** ✅ Завершено

## Выполненные изменения

Добавлена информация о целевых CSS классах в описания (`description`) всех компонентов Strapi. Это поможет разработчикам фронтенда правильно рендерить компоненты с нужными CSS классами.

## Обновленные компоненты

### 1. `page.section-text`
- Добавлено описание CSS классов: `section-text`, `section-text__title`, `section-text__subtitle`, `section-text__content`, `section-text__content--narrow`

### 2. `page.section-cards`
- Добавлено описание CSS классов: `section-cards`, `section-cards__title`, `section-cards__container`, `section-cards__card`, `section-cards__card-title`, `section-cards__card-content`

### 3. `page.history-timeline`
- Добавлено описание CSS классов: `history-timeline`, `history-timeline__title`, `history-timeline__tabs`, `history-timeline__tab-button`, `history-timeline__period`, `history-timeline__period-title`, `history-timeline__period-content`, `history-timeline__image`

### 4. `page.service-tariffs`
- Добавлено описание CSS классов: `service-tariffs`, `service-tariffs__title`, `service-tariffs__container`, `service-tariffs__tariff`, `service-tariffs__tariff-title`, `service-tariffs__table`, `service-tariffs__table-row`, `service-tariffs__table-cell`

### 5. `page.service-faq`
- Добавлено описание CSS классов: `service-faq`, `service-faq__title`, `service-faq__items`, `service-faq__item`, `service-faq__question`, `service-faq__answer`

### 6. `page.service-order-form`
- Добавлено описание CSS классов: `service-order-form`, `service-order-form__title`, `service-order-form__form`, `service-order-form__field-wrapper`, `service-order-form__label`, `service-order-form__input`, `service-order-form__button`

### 7. `page.section-map`
- Добавлено описание CSS классов: `section-map`, `section-map__title`, `section-map__container`, `section-map__objects`, `section-map__objects-list`, `section-map__object-item`, `section-map__map-wrapper`

### 8. `page.mobile-app-section`
- Добавлено описание CSS классов: `mobile-app-section`, `mobile-app-section__header`, `mobile-app-section__title-wrapper`, `mobile-app-section__title`, `mobile-app-section__download`, `mobile-app-section__stores`

### 9. `page.crm-cards`
- Добавлено описание CSS классов: `crm-cards`, `crm-cards__title`, `crm-cards__container`, `crm-cards__card`, `crm-cards__card-image`

### 10. `page.image-carousel`
- Добавлено описание CSS классов: `image-carousel`, `image-carousel__title`, `image-carousel__container`, `image-carousel__item`

### 11. `page.image-switcher`
- Добавлено описание CSS классов: `image-switcher`, `image-switcher__title`, `image-switcher__container`, `image-switcher__item`

### 12. `page.how-to-connect`
- Добавлено описание CSS классов: `how-to-connect`, `how-to-connect__title`, `how-to-connect__steps`, `how-to-connect__step`

### 13. `page.files-table`
- Добавлено описание CSS классов: `files-table`, `files-table__title`, `files-table__container`, `files-table__item`

### 14. `page.tariff-table`
- Добавлено описание CSS классов: `tariff-table`, `tariff-table__title`, `tariff-table__table`

## Полная документация

Полная документация по всем CSS классам для всех компонентов находится в файле:
- `docs/STRAPI_COMPONENTS_CSS_CLASSES.md`

## Примечания

1. CSS классы определены в описаниях компонентов для удобства разработчиков
2. Все классы соответствуют BEM-нотации
3. При рендеринге компонентов на фронтенде необходимо использовать указанные CSS классы
4. Модификаторы добавляются через двойное подчеркивание `--`
5. Элементы добавляются через одинарное подчеркивание `__`

## Следующие шаги

1. ✅ Схемы компонентов обновлены
2. ⏭️ Необходимо создать CSS файлы с определениями всех классов
3. ⏭️ Необходимо обновить фронтенд компоненты для использования правильных CSS классов
