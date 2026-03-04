# Реализация типов гридов через CMS (Strapi)

## План реализации

### 1. Обновление компонента Card

**Файл:** `mgts-backend/src/components/page/card/schema.json`

**Добавить поле:**
```json
{
  "cardType": {
    "type": "enumeration",
    "enum": [
      "navigation",
      "info",
      "service",
      "tariff"
    ],
    "default": "info",
    "required": false
  }
}
```

**Типы карточек:**
- `navigation` - Карточка-ссылка (вся карточка кликабельна, кнопка "Узнать больше" НЕ нужна)
- `info` - Информационная карточка (без ссылок, кнопка "Узнать больше" НЕ нужна)
- `service` - Карточка услуги (может иметь ссылку внутри, кнопка "Узнать больше" нужна если есть ссылка)
- `tariff` - Тарифная карточка (с ценой, условиями, кнопка "Заказать" нужна)

---

### 2. Обновление компонента SectionGrid

**Файл:** `mgts-backend/src/components/page/section-grid/schema.json`

**Добавить поле:**
```json
{
  "gridType": {
    "type": "enumeration",
    "enum": [
      "navigation",
      "info",
      "service",
      "tariff",
      "mixed"
    ],
    "default": "mixed",
    "required": false
  }
}
```

**Типы гридов:**
- `navigation` - Грид с карточками-ссылками (все карточки кликабельны целиком)
- `info` - Грид с информационными карточками (без ссылок)
- `service` - Грид с карточками услуг (могут иметь ссылки)
- `tariff` - Грид с тарифными карточками (с ценами и условиями)
- `mixed` - Смешанный грид (тип определяется по `cardType` каждой карточки)

---

### 3. Обновление JavaScript кода

**Файл:** `SiteMGTS/js/cms-loader.js`

**Изменения:**

1. **Функция `enhanceServiceCard`:**
   - Читать `cardType` из данных карточки (если есть в HTML через data-атрибут или из API)
   - Если `cardType === 'navigation'` → не создавать кнопку, сделать всю карточку ссылкой
   - Если `cardType === 'info'` → не создавать кнопку
   - Если `cardType === 'service'` → создавать кнопку только если есть ссылка
   - Если `cardType === 'tariff'` → обрабатывать как тарифную карточку

2. **Функция `wrapCardsInGrid`:**
   - Читать `gridType` из данных секции (если есть)
   - Применять соответствующие стили и логику в зависимости от типа грида

3. **Функция `renderContent`:**
   - При рендеринге контента из CMS, добавлять data-атрибуты `data-card-type` и `data-grid-type` для передачи типа в JavaScript

---

## Структура данных в API

### Card в API ответе:
```json
{
  "id": 1,
  "title": "Ценности МГТС",
  "description": "Принципы, которые определяют нашу работу",
  "image": {...},
  "link": "/about/values/index.html",
  "cardType": "navigation"
}
```

### SectionGrid в API ответе:
```json
{
  "id": 1,
  "title": "Дополнительная информация",
  "items": [
    {
      "id": 1,
      "title": "Ценности МГТС",
      "cardType": "navigation",
      "link": "/about/values/index.html"
    },
    {
      "id": 2,
      "title": "Деловая этика",
      "cardType": "navigation",
      "link": "/about/ethics/index.html"
    }
  ],
  "gridType": "navigation"
}
```

---

## Логика обработки в JavaScript

### Приоритет определения типа:

1. **Если есть `cardType` в данных карточки (из CMS):**
   - Использовать явно заданный тип
   
2. **Если есть `gridType` в данных секции:**
   - Применить тип ко всем карточкам в гриде (если `gridType !== 'mixed'`)
   
3. **Если нет явного типа:**
   - Использовать автоопределение (текущая логика `detectCardType`)

### Код обработки:

```javascript
function getCardType(card, gridType = null) {
    // 1. Проверить data-атрибут карточки
    const cardTypeAttr = card.getAttribute('data-card-type');
    if (cardTypeAttr) {
        return cardTypeAttr;
    }
    
    // 2. Проверить gridType (если не mixed)
    if (gridType && gridType !== 'mixed') {
        return gridType;
    }
    
    // 3. Автоопределение (текущая логика)
    return detectCardType(card);
}

function enhanceServiceCard(card, cardType = null) {
    // Определить тип карточки
    const type = cardType || getCardType(card);
    
    // Обработка в зависимости от типа
    switch(type) {
        case 'navigation':
            // Вся карточка - ссылка, кнопка не нужна
            break;
        case 'info':
            // Информационная карточка, кнопка не нужна
            break;
        case 'service':
            // Карточка услуги, кнопка нужна если есть ссылка
            break;
        case 'tariff':
            // Тарифная карточка, обработать как тариф
            break;
    }
}
```

---

## Шаги реализации

### Шаг 1: Обновить схемы в Strapi

1. Открыть Strapi Admin Panel
2. Content-Type Builder → Components → `page.card`
3. Добавить поле `cardType` (Enumeration)
4. Сохранить

5. Content-Type Builder → Components → `page.section-grid`
6. Добавить поле `gridType` (Enumeration)
7. Сохранить

### Шаг 2: Обновить JavaScript код

1. Обновить `cms-loader.js` для чтения `cardType` и `gridType`
2. Добавить логику обработки типов
3. Обновить функции `enhanceServiceCard`, `enhanceTariffCard`, `wrapCardsInGrid`

### Шаг 3: Обновить рендеринг контента

1. При рендеринге HTML из CMS, добавлять data-атрибуты:
   - `data-card-type="navigation"` на карточки
   - `data-grid-type="navigation"` на гриды

### Шаг 4: Тестирование

1. Протестировать на всех страницах раздела "О компании"
2. Проверить, что типы карточек определяются правильно
3. Проверить, что кнопки создаются/не создаются в зависимости от типа

---

## Преимущества подхода

1. ✅ **Явное управление** - тип карточки задается в CMS, а не определяется автоматически
2. ✅ **Гибкость** - можно задать тип для всей секции или для каждой карточки отдельно
3. ✅ **Обратная совместимость** - если тип не задан, используется автоопределение
4. ✅ **Расширяемость** - легко добавить новые типы карточек в будущем
5. ✅ **Контроль** - контент-менеджер может явно указать, как должна отображаться карточка




