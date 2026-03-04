# Рекомендации по исправлению страниц сегментов

## Результаты анализа

Проанализированы страницы сегментов и бизнеса:
- `developers` (Застройщики)
- `government` (Госсектор)
- `partners` (Партнеры)
- `business` (Бизнес) и все подстраницы
- `operators` (Операторы) - найдена (ID: 361)

## Найденные проблемы

### 1. **developers** и **government**
- **18 div элементов без класса** - в основном обертки для иконок и контента внутри `card-body`
- **35 проблемных элементов без класса** - включая служебные элементы (html, head, body)

**Детали:**
- Div элементы внутри `card-body` используются как обертки для иконок (эмодзи) и контента
- Структура: `<div class="card-body"><div>🏗️</div><div><h3>...</h3><p>...</p></div></div>`
- Эти div должны быть частью структуры карточки или иметь классы

### 2. **partners**
- **3 карточки не в grid контейнере** - карточки должны быть обернуты в grid
- **4 div без класса** - обертки для иконок внутри `card-body`

### 3. **operators**
- **15 div без класса** - обертки для иконок и контента внутри `card-body` (аналогично developers и government)

### 4. **business** и подстраницы
- **15 div без класса** на главной странице business
- **6 проблем** на `business/cloud`
- **3 проблемы** на `business/telephony/fixed`
- **3 проблемы** на `business/cloud/storage`
- **12 проблем** на `business/security/video-surveillance`
- **6 проблем** на `business/telephony/mobile`
- **6 проблем** на `business/security`

## Рекомендации по исправлению

### Вариант 1: Автоматическое исправление (рекомендуется)

Использовать скрипт `fix-segment-pages.js`, который:

1. **Исправляет карточки без структуры:**
   - Определяет тип карточки (тариф или service-card)
   - Добавляет правильную структуру (card-header, card-body, card-footer или service-card-icon, service-card-body)

2. **Организует карточки в grid:**
   - Находит карточки, которые не находятся в grid
   - Группирует последовательные карточки
   - Обертывает их в grid контейнер с правильным количеством колонок

3. **Добавляет классы к div без класса:**
   - Для структурных элементов добавляет класс `content-block`
   - Пропускает служебные элементы и элементы в специальных секциях

**Запуск:**
```bash
# Тестовый запуск (dry-run)
cd mgts-backend
node scripts/fix-segment-pages.js --dry-run

# Применение изменений
node scripts/fix-segment-pages.js --apply
```

### Вариант 2: Ручное исправление в Strapi

#### Для страниц developers и government:

**Проблема:** Div элементы внутри `card-body` без класса

**Текущая структура:**
```html
<div class="card-body">
    <div>🏗️</div>
    <div>
        <h3>Подключение объектов</h3>
        <p>...</p>
    </div>
</div>
```

**Рекомендуемая структура:**
```html
<div class="card-body">
    <div class="card-icon">🏗️</div>
    <div class="card-content">
        <h3>Подключение объектов</h3>
        <p>...</p>
    </div>
</div>
```

**Или использовать service-card структуру:**
```html
<div class="service-card">
    <div class="service-card-icon">🏗️</div>
    <div class="service-card-body">
        <h3>Подключение объектов</h3>
        <p>...</p>
    </div>
</div>
```

#### Для страницы partners:

**Проблема:** 3 карточки не в grid контейнере

**Текущая структура:**
```html
<div class="container">
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
</div>
```

**Рекомендуемая структура:**
```html
<div class="container">
    <div class="grid grid-cols-3">
        <div class="grid-item">
            <div class="card">...</div>
        </div>
        <div class="grid-item">
            <div class="card">...</div>
        </div>
        <div class="grid-item">
            <div class="card">...</div>
        </div>
    </div>
</div>
```

## Правила типизации контента

Согласно `CMS_CONTENT_TYPES.md`, все элементы должны соответствовать следующим правилам:

1. **Карточки должны иметь правильную структуру:**
   - Тарифы: `card-header`, `card-body`, `card-footer`
   - Service cards: `service-card-icon`, `service-card-body`

2. **Несколько карточек должны быть в grid:**
   - Обернуты в `<div class="grid grid-cols-N">`
   - Каждая карточка в `<div class="grid-item">`

3. **Div элементы должны иметь классы:**
   - Структурные элементы: `container`, `grid`, `grid-item`, `card-body`, `service-card-body`
   - Контентные блоки: `content-block` или специфичные классы

## Статус

✅ Скрипт для автоматического исправления создан  
✅ Тестовый запуск выполнен успешно  
✅ Скрипт улучшен для обработки div внутри card-body  
✅ Скрипт обновлен для обработки всех страниц business и подстраниц
✅ Найдено и будет исправлено **99 проблем на 11 страницах**:
   - developers: 15 проблем
   - government: 15 проблем
   - partners: 3 проблемы
   - operators: 15 проблем
   - business: 15 проблем
   - business/cloud: 6 проблем
   - business/telephony/fixed: 3 проблемы
   - business/cloud/storage: 3 проблемы
   - business/security/video-surveillance: 12 проблем
   - business/telephony/mobile: 6 проблем
   - business/security: 6 проблем

⏳ Ожидается применение изменений

## Следующие шаги

1. Запустить скрипт с флагом `--apply` для применения изменений
2. Проверить страницы в браузере после исправления
3. При необходимости внести дополнительные корректировки вручную

