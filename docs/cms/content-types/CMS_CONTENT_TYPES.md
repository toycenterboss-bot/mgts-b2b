# Типизация контента из Strapi CMS

## Общая структура

Все страницы из Strapi должны содержать HTML контент, который может включать следующие типы блоков:

## Типы блоков

### 1. Hero Content (`hero-content`)
**Класс:** `.hero-content`  
**Расположение:** Внутри `.hero` секции  
**Обработка:** Удаляется из CMS контента, так как hero уже есть в HTML

```html
<div class="hero-content">
    <h1>Заголовок страницы</h1>
    <p>Подзаголовок страницы</p>
</div>
```

### 2. Regular Section (`section`)
**Класс:** `section` (базовый класс)  
**Обработка:** Нормализуется и сопоставляется с существующими секциями на странице

```html
<section class="section">
    <div class="container">
        <h2 class="section-title">Заголовок секции</h2>
        <p>Контент секции...</p>
    </div>
</section>
```

**Варианты:**
- `section.section` - базовая секция
- `section.section.section-gray` - серая секция
- `section.section.section-blue` - синяя секция

### 3. Service Tariffs (`service-tariffs`)
**Класс:** `service-tariffs`  
**ID:** `service-tariffs` (опционально)  
**Обработка:** Специальная секция, вставляется отдельно, не дублируется

```html
<section class="service-tariffs" id="service-tariffs">
    <div class="container">
        <h2 class="section-title">Тарифы и цены</h2>
        <div class="tariffs-grid">
            <div class="tariff-card">
                <div class="tariff-card__header">
                    <h3 class="tariff-card__title">Название тарифа</h3>
                    <div class="tariff-card__price">
                        <span class="tariff-card__price-amount">от 1 500</span>
                        <span class="tariff-card__price-period">₽/мес</span>
                    </div>
                </div>
                <div class="tariff-card__body">
                    <ul class="tariff-card__features">
                        <li class="tariff-card__feature">Характеристика 1</li>
                        <li class="tariff-card__feature">Характеристика 2</li>
                    </ul>
                </div>
                <div class="tariff-card__footer">
                    <button class="btn btn-primary btn-lg">Выбрать тариф</button>
                </div>
            </div>
        </div>
    </div>
</section>
```

**Обязательные элементы:**
- `.tariffs-grid` - контейнер для тарифов
- `.tariff-card` - карточка тарифа
- `.tariff-card__title` - название тарифа
- `.tariff-card__price` - цена тарифа

### 4. Service FAQ (`service-faq`)
**Класс:** `service-faq`  
**Обработка:** Специальная секция, вставляется отдельно, не дублируется

```html
<section class="service-faq">
    <div class="container">
        <h2>Часто задаваемые вопросы</h2>
        <div class="faq-list">
            <div class="faq-item">
                <button class="faq-question" type="button" aria-expanded="false">
                    <span>Вопрос</span>
                    <span class="faq-icon" aria-hidden="true">...</span>
                </button>
                <div class="faq-answer" aria-expanded="false">
                    <div class="faq-answer-content">
                        <p>Ответ</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
```

**Обязательные элементы:**
- `.faq-list` - контейнер для вопросов
- `.faq-item` - элемент вопроса/ответа
- `.faq-question` - кнопка вопроса
- `.faq-answer` - блок ответа

### 5. Service Features (`service-features`)
**Класс:** `service-features`  
**Обработка:** Специальная секция, вставляется отдельно

```html
<section class="service-features">
    <div class="container">
        <h2 class="section-title">Преимущества услуги</h2>
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-card__icon">
                    <i class="fas fa-icon" aria-hidden="true"></i>
                </div>
                <h3 class="feature-card__title">Название преимущества</h3>
                <p class="feature-card__description">Описание преимущества</p>
            </div>
        </div>
    </div>
</section>
```

**Обязательные элементы:**
- `.features-grid` - контейнер для карточек
- `.feature-card` - карточка преимущества
- `.feature-card__title` - заголовок преимущества

### 6. Service Order Form (`service-order`)
**Класс:** `service-order`  
**ID:** `order-form` (обязательно)  
**Обработка:** Специальная секция, вставляется отдельно, строго одна на странице

```html
<section class="service-order" id="order-form">
    <div class="container">
        <h2>Заказать услугу</h2>
        <form class="order-form" action="#" method="POST">
            <div class="order-form__group">
                <label for="order-name" class="order-form__label">
                    Ваше имя
                    <span class="order-form__required">*</span>
                </label>
                <input type="text" id="order-name" name="name" class="order-form__input" required>
            </div>
            <!-- Другие поля формы -->
            <button type="submit" class="btn btn-primary btn-lg order-form__submit">
                Отправить заявку
            </button>
        </form>
    </div>
</section>
```

**Обязательные элементы:**
- `.order-form` - форма заказа
- Поля формы с правильными `id` и `name`
- Кнопка отправки

### 7. Service Specs (`service-specs`)
**Класс:** `service-specs`  
**Обработка:** Специальная секция, вставляется отдельно

```html
<section class="service-specs">
    <div class="container">
        <h2 class="section-title">Технические характеристики</h2>
        <div class="specs-content">
            <div class="specs-grid">
                <div class="spec-item">
                    <div class="spec-item__label">Название характеристики</div>
                    <div class="spec-item__value">Значение</div>
                </div>
            </div>
        </div>
    </div>
</section>
```

**Обязательные элементы:**
- `.specs-grid` - контейнер для характеристик
- `.spec-item` - элемент характеристики
- `.spec-item__label` - название характеристики
- `.spec-item__value` - значение характеристики

### 8. Service Cases (`service-cases`)
**Класс:** `service-cases`  
**Обработка:** Специальная секция, вставляется отдельно

```html
<section class="service-cases">
    <div class="container">
        <h2 class="section-title">Кейсы наших клиентов</h2>
        <div class="cases-grid">
            <div class="case-card">
                <div class="case-card__header">
                    <div class="case-card__logo">...</div>
                    <div class="case-card__company">
                        <h3 class="case-card__company-name">Название компании</h3>
                        <p class="case-card__company-industry">Отрасль</p>
                    </div>
                </div>
                <div class="case-card__body">
                    <p class="case-card__quote">Отзыв клиента</p>
                    <div class="case-card__result">...</div>
                </div>
            </div>
        </div>
    </div>
</section>
```

**Обязательные элементы:**
- `.cases-grid` - контейнер для кейсов
- `.case-card` - карточка кейса
- `.case-card__quote` - отзыв клиента

### 9. Service HowTo (`service-howto`)
**Класс:** `service-howto`  
**Обработка:** Специальная секция, вставляется отдельно

```html
<section class="service-howto">
    <div class="container">
        <h2 class="section-title">Как подключить услугу</h2>
        <div class="howto-steps">
            <div class="howto-step">
                <div class="howto-step__number">1</div>
                <div class="howto-step__content">
                    <h3 class="howto-step__title">Название шага</h3>
                    <p class="howto-step__description">Описание шага</p>
                </div>
            </div>
        </div>
    </div>
</section>
```

**Обязательные элементы:**
- `.howto-steps` - контейнер для шагов
- `.howto-step` - элемент шага
- `.howto-step__number` - номер шага
- `.howto-step__title` - название шага

## Типы страниц

### Service Page (конкретная услуга)
**Примеры:** `business/internet/gpon`, `business/telephony/fixed`  
**Обработка:** Контент добавляется к существующему, не заменяется полностью

### Category Page (категория услуг)
**Примеры:** `business/telephony`, `business/internet`  
**Обработка:** Контент заменяется полностью, секции обрабатываются стандартно

### Regular Page (обычная страница)
**Примеры:** `about`, `government`  
**Обработка:** Контент заменяется полностью, секции обрабатываются стандартно

## Правила обработки

1. **Hero Content** - всегда удаляется из CMS контента
2. **Special Sections** (`service-*`) - обрабатываются отдельно, не дублируются
3. **Regular Sections** - нормализуются и сопоставляются с существующими секциями
4. **Service Pages** - контент добавляется к существующему
5. **Category/Regular Pages** - контент заменяется полностью

## Типизация DIV элементов внутри секций

Все div элементы внутри секций должны соответствовать следующим типам:

### 1. Grid System (Сетка)

#### `.grid` - Базовая сетка
**Назначение:** Контейнер для размещения элементов в сетке  
**Использование:** Для создания сеток с карточками, элементами, преимуществами

```html
<div class="grid">
    <div class="card">...</div>
    <div class="card">...</div>
</div>
```

**Модификаторы:**
- `.grid.grid-cols-2` - сетка с 2 колонками
- `.grid.grid-cols-3` - сетка с 3 колонками
- `.grid.grid-cols-4` - сетка с 4 колонками (если используется)

#### `.grid-item` - Элемент сетки
**Назначение:** Отдельный элемент внутри сетки  
**Использование:** Для размещения контента в ячейках сетки

```html
<div class="grid">
    <div class="grid-item">
        <h3>Заголовок</h3>
        <p>Описание</p>
    </div>
</div>
```

### 2. Card System (Карточки)

#### `.card` - Базовая карточка
**Назначение:** Универсальная карточка для отображения контента  
**Использование:** Для услуг, преимуществ, функций, информации

```html
<div class="card">
    <h3>Заголовок карточки</h3>
    <p>Содержимое карточки</p>
</div>
```

**Структура:**
- Может содержать заголовки (`h2`, `h3`)
- Может содержать параграфы (`p`)
- Может содержать списки (`ul`, `ol`)
- Может содержать ссылки (`a`)

#### `.card-body` - Тело карточки
**Назначение:** Внутренний контейнер для содержимого карточки  
**Использование:** Для структурирования содержимого карточки

```html
<div class="card">
    <div class="card-body">
        <h3>Заголовок</h3>
        <p>Текст</p>
    </div>
</div>
```

#### `.service-card` - Карточка услуги/информации
**Назначение:** Специальная карточка для отображения услуг, информации или навигации  
**Использование:** Для услуг, информационных блоков, навигационных карточек на страницах раздела "О компании" и других страницах

```html
<div class="service-card">
    <h3>Заголовок карточки</h3>
    <p>Содержимое карточки</p>
</div>
```

**Структура:**
- Может содержать заголовки (`h2`, `h3`)
- Может содержать параграфы (`p`)
- Может содержать списки (`ul`, `ol`)
- Может содержать ссылки (`a`)
- Может содержать иконки (эмодзи или `.service-card-icon`)
- Может иметь атрибут `data-card-type` со значениями: `navigation`, `info`, `service`

**Модификаторы:**
- `data-card-type="navigation"` - навигационная карточка (вся карточка - ссылка)
- `data-card-type="info"` - информационная карточка (без ссылок и кнопок)
- `data-card-type="service"` - карточка услуги (может иметь ссылку)

**Обработка:**
- Автоматически преобразуется в структуру с `.service-card-body` и `.service-card-icon` при наличии иконки
- Может быть размещена в `.grid` для создания сетки карточек
- Используется на страницах раздела "О компании" для отображения навигационных и информационных блоков

### 3. Tariff System (Тарифы)

#### `.tariffs-grid` - Сетка тарифов
**Назначение:** Контейнер для карточек тарифов  
**Использование:** Только внутри секции `service-tariffs`

```html
<div class="tariffs-grid">
    <div class="tariff-card">...</div>
    <div class="tariff-card">...</div>
</div>
```

#### `.tariff-card` - Карточка тарифа
**Назначение:** Карточка отдельного тарифа  
**Использование:** Внутри `.tariffs-grid`

```html
<div class="tariff-card">
    <div class="tariff-card__header">
        <h3 class="tariff-card__title">Название тарифа</h3>
        <div class="tariff-card__price">
            <span class="tariff-card__price-amount">от 1 500</span>
            <span class="tariff-card__price-period">₽/мес</span>
        </div>
    </div>
    <div class="tariff-card__body">
        <ul class="tariff-card__features">
            <li class="tariff-card__feature">Характеристика</li>
        </ul>
    </div>
    <div class="tariff-card__footer">
        <button class="btn btn-primary">Выбрать</button>
    </div>
</div>
```

#### `.tariff-card__header` - Заголовок карточки тарифа
**Назначение:** Верхняя часть карточки с названием и ценой  
**Обязательные элементы:**
- `.tariff-card__title` - название тарифа
- `.tariff-card__price` или `.tariff-price` - цена тарифа

#### `.tariff-price` - Цена тарифа
**Назначение:** Отображение цены тарифа  
**Альтернатива:** `.tariff-card__price` (предпочтительнее)

```html
<div class="tariff-price">
    <span class="tariff-card__price-amount">от 1 500</span>
    <span class="tariff-card__price-period">₽/мес</span>
</div>
```

### 4. FAQ System (Вопросы и ответы)

#### `.faq-list` - Список FAQ
**Назначение:** Контейнер для списка вопросов и ответов  
**Использование:** Только внутри секции `service-faq`

```html
<div class="faq-list">
    <div class="faq-item">...</div>
</div>
```

#### `.faq-item` - Элемент FAQ
**Назначение:** Отдельный вопрос-ответ  
**Структура:**
- Кнопка вопроса (`.faq-question`)
- Блок ответа (`.faq-answer`)

```html
<div class="faq-item">
    <button class="faq-question" type="button" aria-expanded="false">
        <span>Вопрос</span>
        <span class="faq-icon" aria-hidden="true">...</span>
    </button>
    <div class="faq-answer" id="faq-answer-1" aria-expanded="false">
        <div class="faq-answer-content">
            <p>Ответ</p>
        </div>
    </div>
</div>
```

#### `.faq-answer` - Блок ответа
**Назначение:** Контейнер для ответа на вопрос  
**Атрибуты:**
- `id="faq-answer-{номер}"` - уникальный ID
- `aria-expanded="false"` - состояние раскрытия

#### `.faq-answer-content` - Содержимое ответа
**Назначение:** Внутренний контейнер для текста ответа

### 5. Form System (Формы)

#### `.form-group` - Группа полей формы
**Назначение:** Контейнер для группы связанных полей формы  
**Использование:** Для структурирования полей формы

```html
<div class="form-group">
    <label for="field-id">Название поля</label>
    <input type="text" id="field-id" name="field-name">
</div>
```

**Примечание:** В формах заказа используется `.order-form__group` (см. Service Order Form)

### 6. Специфичные классы (требуют нормализации)

#### `.container-mgts` - Контейнер МГТС
**Статус:** Устаревший, должен быть заменен на `.container`  
**Действие:** Нормализовать в `.container`

#### `.home-section-container` - Контейнер секции главной страницы
**Статус:** Специфичный для главной страницы  
**Действие:** Оставить как есть для `main_page`, для других страниц нормализовать

#### `.section-promo-note__content-container` - Контейнер промо-контента
**Статус:** Специфичный для главной страницы  
**Действие:** Оставить как есть для `main_page`

#### Классы главной страницы (`.about-company`, `.mirror-slider`, `.selector-item` и т.д.)
**Статус:** Специфичные для главной страницы  
**Действие:** Оставить как есть для `main_page`, не использовать на других страницах

## Правила иерархии классов

### Обязательная иерархия (строгие правила)

#### 1. Grid System
```
.container
  └── .grid (обязательно для .grid-item)
      └── .grid-item (обязательно внутри .grid)
          └── [любой контент]
```

**Правила:**
- ✅ `.grid-item` **ОБЯЗАТЕЛЬНО** должен быть внутри `.grid`
- ❌ `.grid-item` не может быть отдельно от `.grid`
- ✅ `.card` может быть внутри `.grid` (напрямую) или отдельно
- ✅ `.card` может быть внутри `.grid-item` (опционально)

**Примеры правильного использования:**
```html
<!-- Правильно: grid-item внутри grid -->
<div class="grid">
    <div class="grid-item">
        <h3>Заголовок</h3>
        <p>Описание</p>
    </div>
</div>

<!-- Правильно: card внутри grid -->
<div class="grid">
    <div class="card">
        <h3>Заголовок</h3>
    </div>
</div>

<!-- Правильно: card отдельно -->
<div class="card">
    <h3>Заголовок</h3>
</div>
```

#### 2. Card System
```
.container
  └── .card (может быть внутри .grid или отдельно)
      └── .card-body (ОБЯЗАТЕЛЬНО внутри .card, опционально)
          └── [контент карточки]
```

**Правила:**
- ✅ `.card-body` **ОБЯЗАТЕЛЬНО** должен быть внутри `.card`
- ❌ `.card-body` не может быть отдельно от `.card`
- ✅ `.card` может быть внутри `.grid` или использоваться отдельно
- ⚠️ `.card` может содержать контент напрямую (без `.card-body`)

**Примеры правильного использования:**
```html
<!-- Правильно: card-body внутри card -->
<div class="card">
    <div class="card-body">
        <h3>Заголовок</h3>
        <p>Текст</p>
    </div>
</div>

<!-- Правильно: card без card-body -->
<div class="card">
    <h3>Заголовок</h3>
    <p>Текст</p>
</div>

<!-- НЕПРАВИЛЬНО: card-body отдельно -->
<div class="card-body">
    <h3>Заголовок</h3>
</div>
```

#### 3. Tariff System
```
.container
  └── .tariffs-grid (обязательно для .tariff-card)
      └── .tariff-card (ОБЯЗАТЕЛЬНО внутри .tariffs-grid)
          ├── .tariff-card__header (ОБЯЗАТЕЛЬНО внутри .tariff-card)
          │   └── .tariff-card__price или .tariff-price (ОБЯЗАТЕЛЬНО внутри .tariff-card__header)
          ├── .tariff-card__body (опционально)
          └── .tariff-card__footer (опционально)
```

**Правила:**
- ✅ `.tariff-card` **ОБЯЗАТЕЛЬНО** должен быть внутри `.tariffs-grid`
- ✅ `.tariff-card__header` **ОБЯЗАТЕЛЬНО** должен быть внутри `.tariff-card`
- ✅ `.tariff-price` или `.tariff-card__price` **ОБЯЗАТЕЛЬНО** должен быть внутри `.tariff-card__header`
- ❌ Ни один элемент тарифа не может быть отдельно

**Примеры правильного использования:**
```html
<!-- Правильно: полная иерархия тарифа -->
<div class="tariffs-grid">
    <div class="tariff-card">
        <div class="tariff-card__header">
            <h3 class="tariff-card__title">Название</h3>
            <div class="tariff-card__price">
                <span class="tariff-card__price-amount">1 500</span>
                <span class="tariff-card__price-period">₽/мес</span>
            </div>
        </div>
        <div class="tariff-card__body">
            <ul class="tariff-card__features">...</ul>
        </div>
    </div>
</div>
```

#### 4. FAQ System
```
.container
  └── .faq-list (обязательно для .faq-item)
      └── .faq-item (ОБЯЗАТЕЛЬНО внутри .faq-list)
          ├── .faq-question (кнопка вопроса)
          └── .faq-answer (ОБЯЗАТЕЛЬНО внутри .faq-item)
              └── .faq-answer-content (ОБЯЗАТЕЛЬНО внутри .faq-answer)
                  └── [текст ответа]
```

**Правила:**
- ✅ `.faq-item` **ОБЯЗАТЕЛЬНО** должен быть внутри `.faq-list`
- ✅ `.faq-answer` **ОБЯЗАТЕЛЬНО** должен быть внутри `.faq-item`
- ✅ `.faq-answer-content` **ОБЯЗАТЕЛЬНО** должен быть внутри `.faq-answer`
- ❌ Ни один элемент FAQ не может быть отдельно

**Примеры правильного использования:**
```html
<!-- Правильно: полная иерархия FAQ -->
<div class="faq-list">
    <div class="faq-item">
        <button class="faq-question" type="button">Вопрос</button>
        <div class="faq-answer" id="faq-answer-1">
            <div class="faq-answer-content">
                <p>Ответ</p>
            </div>
        </div>
    </div>
</div>
```

### Опциональная иерархия (гибкие правила)

#### Card в Grid
- `.card` может быть напрямую внутри `.grid` (без `.grid-item`)
- `.card` может быть внутри `.grid-item` (если нужна дополнительная структура)
- `.card` может использоваться отдельно (не в сетке)

**Рекомендации:**
- Если карточки должны быть в сетке → использовать `.grid` с `.card` напрямую
- Если нужна более сложная структура → использовать `.grid` → `.grid-item` → `.card`

### Правила нормализации DIV элементов

### Целевые типы (стандартные)

1. **Grid:**
   - `.grid` - базовая сетка
   - `.grid-item` - элемент сетки (обязательно внутри `.grid`)
   - Модификаторы: `.grid-cols-2`, `.grid-cols-3`

2. **Cards:**
   - `.card` - базовая карточка (может быть в `.grid` или отдельно)
   - `.card-body` - тело карточки (обязательно внутри `.card`, опционально)

3. **Tariffs:**
   - `.tariffs-grid` - сетка тарифов
   - `.tariff-card` - карточка тарифа (обязательно внутри `.tariffs-grid`)
   - `.tariff-card__header` - заголовок карточки (обязательно внутри `.tariff-card`)
   - `.tariff-card__price` или `.tariff-price` - цена (обязательно внутри `.tariff-card__header`)

4. **FAQ:**
   - `.faq-list` - список FAQ
   - `.faq-item` - элемент FAQ (обязательно внутри `.faq-list`)
   - `.faq-answer` - блок ответа (обязательно внутри `.faq-item`)
   - `.faq-answer-content` - содержимое ответа (обязательно внутри `.faq-answer`)

### Правила замены

1. **Устаревшие контейнеры:**
   - `.container-mgts` → `.container` (если не на главной странице)

2. **Неправильные классы:**
   - Любые классы, не соответствующие типизации, должны быть заменены на ближайший эквивалент

3. **Стили в атрибутах:**
   - Inline стили (`style="..."`) должны быть удалены, стилизация через CSS классы

4. **Главная страница:**
   - Специфичные классы главной страницы оставляются без изменений

5. **Исправление иерархии:**
   - `.grid-item` без `.grid` → обернуть в `.grid` или удалить `.grid-item`
   - `.card-body` без `.card` → обернуть в `.card` или удалить `.card-body`
   - `.tariff-card` без `.tariffs-grid` → обернуть в `.tariffs-grid`
   - `.tariff-card__header` без `.tariff-card` → обернуть в `.tariff-card`
   - `.faq-item` без `.faq-list` → обернуть в `.faq-list`
   - `.faq-answer` без `.faq-item` → обернуть в `.faq-item`
   - `.faq-answer-content` без `.faq-answer` → обернуть в `.faq-answer`

## Правила расположения элементов верхнего уровня

### Элементы внутри container (но вне div/section)

Некоторые HTML элементы могут находиться напрямую внутри `.container`, но вне блоков `div` или `section`. Это допустимо только в определенных случаях.

#### Разрешенные элементы верхнего уровня:

##### 1. Заголовки (`<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`)

**Правила:**
- ✅ Могут находиться внутри `.container` напрямую
- ✅ Должны иметь класс `section-title` если это заголовок секции
- ✅ Должны быть первым элементом в секции или перед контентом секции
- ❌ Не должны находиться между секциями (вне container)

**Правильная структура:**
```html
<section class="section">
    <div class="container">
        <h2 class="section-title">Заголовок секции</h2>
        <p>Описание секции</p>
        <!-- остальной контент -->
    </div>
</section>
```

**Неправильная структура:**
```html
<!-- ❌ НЕПРАВИЛЬНО: h2 между секциями -->
<section class="section">...</section>
<h2>Заголовок</h2>
<section class="section">...</section>
```

##### 2. Параграфы (`<p>`)

**Правила:**
- ✅ Могут находиться внутри `.container` напрямую
- ✅ Должны быть внутри секции (внутри `.container` секции)
- ✅ Могут использоваться для краткого описания перед основным контентом
- ❌ Не должны находиться между секциями

**Правильная структура:**
```html
<section class="section">
    <div class="container">
        <h2 class="section-title">Заголовок</h2>
        <p>Краткое описание секции</p>
        <!-- остальной контент -->
    </div>
</section>
```

##### 3. Другие текстовые элементы

**Разрешенные:**
- `<span>` - для инлайн-форматирования
- `<strong>`, `<em>` - для выделения текста
- `<a>` - для ссылок (внутри текста)

**Правила:**
- ✅ Могут находиться внутри `.container` как часть текстового контента
- ✅ Должны быть внутри секции
- ❌ Не должны быть отдельными элементами верхнего уровня

##### 4. Списки (`<ul>`, `<ol>`, `<li>`)

**Правила:**
- ✅ Могут находиться внутри `.container` напрямую
- ✅ Должны быть внутри секции
- ✅ Могут быть частью контента секции

**Правильная структура:**
```html
<section class="section">
    <div class="container">
        <h2 class="section-title">Список</h2>
        <ul>
            <li>Элемент 1</li>
            <li>Элемент 2</li>
        </ul>
    </div>
</section>
```

### Запрещенные элементы верхнего уровня:

#### ❌ Блочные элементы вне секций:
- `<div>` - должен быть внутри секции или быть частью структуры
- `<section>` - должен быть основным контейнером
- `<article>`, `<aside>`, `<nav>` - должны быть внутри секций

#### ❌ Интерактивные элементы вне контекста:
- `<form>` - должен быть внутри секции (обычно `service-order`)
- `<button>` - должен быть внутри формы или карточки
- `<input>`, `<textarea>`, `<select>` - должны быть внутри формы

#### ❌ Медиа элементы вне контекста:
- `<img>` - должен быть внутри карточки, секции или другого контейнера
- `<video>`, `<audio>` - должны быть внутри секции

### Статистика использования (на основе анализа 42 страниц):

- **`<h2>`**: 86 использований на 42 страницах
  - Все внутри `.container` ✅
  - Все внутри секций ✅
  - Используются как заголовки секций ✅

- **`<p>`**: 25 использований на 23 страницах
  - Все внутри `.container` ✅
  - Все внутри секций ✅
  - Используются для описаний и вводного текста ✅

### Правила валидации:

1. **Все элементы верхнего уровня должны быть внутри секции:**
   ```html
   <!-- ✅ ПРАВИЛЬНО -->
   <section class="section">
       <div class="container">
           <h2>Заголовок</h2>
           <p>Текст</p>
       </div>
   </section>
   ```

2. **Элементы не должны находиться между секциями:**
   ```html
   <!-- ❌ НЕПРАВИЛЬНО -->
   <section class="section">...</section>
   <h2>Заголовок</h2>
   <section class="section">...</section>
   ```

3. **Элементы не должны находиться после всех секций:**
   ```html
   <!-- ❌ НЕПРАВИЛЬНО -->
   <section class="section">...</section>
   <p>Текст</p>
   ```

4. **Заголовки должны иметь класс `section-title` если это заголовок секции:**
   ```html
   <!-- ✅ ПРАВИЛЬНО -->
   <h2 class="section-title">Заголовок секции</h2>
   ```

5. **Исключения для класса `section-title`:**
   - Заголовки в формах заказа (`service-order`) могут не иметь `section-title`
   - Заголовки с специальными классами (`.order-form__title`, `.faq-question` и т.д.) не требуют `section-title`
   - Заголовки внутри карточек (`.card-title`, `.tariff-card__title`) не требуют `section-title`

## Обязательные атрибуты

- Все секции должны иметь класс `section` (базовый)
- Специальные секции должны иметь класс `service-*`
- Форма заказа должна иметь `id="order-form"`
- Все интерактивные элементы должны иметь правильные ARIA атрибуты
- FAQ элементы должны иметь правильные `id` и `aria-expanded`
- Заголовки секций должны иметь класс `section-title`

