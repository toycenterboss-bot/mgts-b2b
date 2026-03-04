# Правила иерархии классов в HTML структуре

## Обзор

Данный документ определяет обязательные и опциональные правила вложенности классов внутри HTML контента из Strapi CMS.

## Обязательная иерархия (строгие правила)

### 1. Grid System (Сетка)

#### Правила:
- ✅ `.grid-item` **ОБЯЗАТЕЛЬНО** должен быть внутри `.grid`
- ❌ `.grid-item` **НЕ МОЖЕТ** быть отдельно от `.grid`
- ✅ `.card` может быть внутри `.grid` (напрямую) или использоваться отдельно
- ✅ `.card` может быть внутри `.grid-item` (опционально, для более сложной структуры)

#### Правильная структура:
```html
<!-- Вариант 1: grid-item внутри grid -->
<div class="grid">
    <div class="grid-item">
        <h3>Заголовок</h3>
        <p>Описание</p>
    </div>
</div>

<!-- Вариант 2: card внутри grid -->
<div class="grid">
    <div class="card">
        <h3>Заголовок</h3>
    </div>
</div>

<!-- Вариант 3: card внутри grid-item (для сложной структуры) -->
<div class="grid">
    <div class="grid-item">
        <div class="card">
            <h3>Заголовок</h3>
        </div>
    </div>
</div>
```

#### Неправильная структура:
```html
<!-- ❌ НЕПРАВИЛЬНО: grid-item без grid -->
<div class="grid-item">
    <h3>Заголовок</h3>
</div>
```

### 2. Card System (Карточки)

#### Правила:
- ✅ `.card-body` **ОБЯЗАТЕЛЬНО** должен быть внутри `.card`
- ❌ `.card-body` **НЕ МОЖЕТ** быть отдельно от `.card`
- ✅ `.card` может содержать контент напрямую (без `.card-body`)
- ✅ `.card` может быть внутри `.grid` или использоваться отдельно

#### Правильная структура:
```html
<!-- Вариант 1: card-body внутри card -->
<div class="card">
    <div class="card-body">
        <h3>Заголовок</h3>
        <p>Текст</p>
    </div>
</div>

<!-- Вариант 2: card без card-body (допустимо) -->
<div class="card">
    <h3>Заголовок</h3>
    <p>Текст</p>
</div>
```

#### Неправильная структура:
```html
<!-- ❌ НЕПРАВИЛЬНО: card-body без card -->
<div class="card-body">
    <h3>Заголовок</h3>
</div>
```

### 3. Tariff System (Тарифы)

#### Правила:
- ✅ `.tariff-card` **ОБЯЗАТЕЛЬНО** должен быть внутри `.tariffs-grid`
- ✅ `.tariff-card__header` **ОБЯЗАТЕЛЬНО** должен быть внутри `.tariff-card`
- ✅ `.tariff-price` или `.tariff-card__price` **ОБЯЗАТЕЛЬНО** должен быть внутри `.tariff-card__header`
- ❌ Ни один элемент тарифа **НЕ МОЖЕТ** быть отдельно

#### Правильная структура:
```html
<div class="tariffs-grid">
    <div class="tariff-card">
        <div class="tariff-card__header">
            <h3 class="tariff-card__title">Название тарифа</h3>
            <div class="tariff-card__price">
                <span class="tariff-card__price-amount">1 500</span>
                <span class="tariff-card__price-period">₽/мес</span>
            </div>
        </div>
        <div class="tariff-card__body">
            <ul class="tariff-card__features">
                <li class="tariff-card__feature">Характеристика</li>
            </ul>
        </div>
    </div>
</div>
```

#### Неправильная структура:
```html
<!-- ❌ НЕПРАВИЛЬНО: tariff-card без tariffs-grid -->
<div class="tariff-card">...</div>

<!-- ❌ НЕПРАВИЛЬНО: tariff-card__header без tariff-card -->
<div class="tariff-card__header">...</div>
```

### 4. FAQ System (Вопросы и ответы)

#### Правила:
- ✅ `.faq-item` **ОБЯЗАТЕЛЬНО** должен быть внутри `.faq-list`
- ✅ `.faq-answer` **ОБЯЗАТЕЛЬНО** должен быть внутри `.faq-item`
- ✅ `.faq-answer-content` **ОБЯЗАТЕЛЬНО** должен быть внутри `.faq-answer`
- ❌ Ни один элемент FAQ **НЕ МОЖЕТ** быть отдельно

#### Правильная структура:
```html
<div class="faq-list">
    <div class="faq-item">
        <button class="faq-question" type="button" aria-expanded="false">
            <span>Вопрос</span>
        </button>
        <div class="faq-answer" id="faq-answer-1" aria-expanded="false">
            <div class="faq-answer-content">
                <p>Ответ</p>
            </div>
        </div>
    </div>
</div>
```

#### Неправильная структура:
```html
<!-- ❌ НЕПРАВИЛЬНО: faq-item без faq-list -->
<div class="faq-item">...</div>

<!-- ❌ НЕПРАВИЛЬНО: faq-answer без faq-item -->
<div class="faq-answer">...</div>
```

## Опциональная иерархия (гибкие правила)

### Card в Grid

`.card` может использоваться тремя способами:

1. **Напрямую в grid** (рекомендуется для простых сеток):
```html
<div class="grid">
    <div class="card">...</div>
    <div class="card">...</div>
</div>
```

2. **Внутри grid-item** (для более сложной структуры):
```html
<div class="grid">
    <div class="grid-item">
        <div class="card">...</div>
    </div>
</div>
```

3. **Отдельно** (не в сетке):
```html
<div class="card">...</div>
```

## Статистика использования (на основе анализа 42 страниц)

### Grid System
- `.grid-item` внутри `.grid`: 11 случаев
- `.grid-item` отдельно: 0 случаев ✅
- `.card` внутри `.grid`: 25 случаев
- `.card` отдельно: 27 случаев

### Card System
- `.card-body` внутри `.card`: 7 случаев
- `.card-body` отдельно: 1 случай ⚠️ (требует исправления)

### Tariff System
- `.tariff-card` внутри `.tariffs-grid`: 11 случаев
- `.tariff-card` отдельно: 0 случаев ✅
- `.tariff-card__header` внутри `.tariff-card`: 11 случаев
- `.tariff-card__header` отдельно: 0 случаев ✅
- `.tariff-price` внутри `.tariff-card__header`: 11 случаев
- `.tariff-price` отдельно: 0 случаев ✅

### FAQ System
- `.faq-item` внутри `.faq-list`: 4 случая
- `.faq-item` отдельно: 0 случаев ✅
- `.faq-answer` внутри `.faq-item`: 8 случаев
- `.faq-answer` отдельно: 0 случаев ✅
- `.faq-answer-content` внутри `.faq-answer`: 4 случая
- `.faq-answer-content` отдельно: 0 случаев ✅

## Автоматическая проверка и исправление

Используйте скрипт для проверки иерархии:
```bash
# Проверка (без изменений)
node mgts-backend/scripts/check-class-hierarchy.js --dry-run

# Исправление
node mgts-backend/scripts/check-class-hierarchy.js
```

Скрипт автоматически:
- Обернет `.grid-item` в `.grid` если он используется отдельно
- Обернет `.card-body` в `.card` если он используется отдельно
- Обернет `.tariff-card` в `.tariffs-grid` если он используется отдельно
- Обернет `.faq-item` в `.faq-list` если он используется отдельно

## Резюме правил

### Обязательные правила (строгие):
1. `.grid-item` → обязательно внутри `.grid`
2. `.card-body` → обязательно внутри `.card`
3. `.tariff-card` → обязательно внутри `.tariffs-grid`
4. `.tariff-card__header` → обязательно внутри `.tariff-card`
5. `.tariff-price` → обязательно внутри `.tariff-card__header`
6. `.faq-item` → обязательно внутри `.faq-list`
7. `.faq-answer` → обязательно внутри `.faq-item`
8. `.faq-answer-content` → обязательно внутри `.faq-answer`

### Опциональные правила (гибкие):
1. `.card` → может быть в `.grid`, в `.grid-item`, или отдельно
2. `.card-body` → опционально внутри `.card` (card может содержать контент напрямую)


