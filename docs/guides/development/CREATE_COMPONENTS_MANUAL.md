# Создание компонентов вручную через админ-панель

## ⚠️ Важно

В Strapi 5 компоненты, созданные в файловой системе, не загружаются автоматически. Их нужно создавать через админ-панель.

## Пошаговая инструкция

### 1. Откройте админ-панель

```
http://localhost:1337/admin
```

### 2. Перейдите в Content-Type Builder

В левом меню найдите **Content-Type Builder** и нажмите на него.

### 3. Создайте компоненты

Нажмите на кнопку **"Create new component"** (справа вверху).

---

## Компонент 1: Meta

1. **Category:** Введите `page` (строчными буквами, без пробелов)
2. **Display name:** `Meta`
3. **API ID:** `meta` (будет заполнено автоматически)
4. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| description | Text | Long text, Optional |
| keywords | Text | Optional |
| ogImage | Media | Single, Optional |

Нажмите **Finish**

---

## Компонент 2: CTAButton

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `CTA Button`
4. **API ID:** `cta-button`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| text | Text | Required |
| href | Text | Required |
| style | Enumeration | Values: `primary`, `outline`, `secondary` |

Нажмите **Finish**

---

## Компонент 3: Hero

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `Hero`
4. **API ID:** `hero`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Required |
| subtitle | Text | Long text, Optional |
| backgroundImage | Media | Single, Optional |
| ctaButtons | Component | Component: `CTA Button`, Repeatable |

Нажмите **Finish**

---

## Компонент 4: Card

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `Card`
4. **API ID:** `card`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Required |
| description | Text | Optional |
| image | Media | Single, Optional |
| link | Text | Optional |

Нажмите **Finish**

---

## Компонент 5: SectionText

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `Section Text`
4. **API ID:** `section-text`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Optional |
| content | Rich text | Optional |
| backgroundColor | Text | Optional |

Нажмите **Finish**

---

## Компонент 6: SectionCards

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `Section Cards`
4. **API ID:** `section-cards`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Optional |
| cards | Component | Component: `Card`, Repeatable |

Нажмите **Finish**

---

## Компонент 7: SectionGrid

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `Section Grid`
4. **API ID:** `section-grid`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Optional |
| items | Component | Component: `Card`, Repeatable |

Нажмите **Finish**

---

## Компонент 8: SectionTable

1. **Create new component**
2. **Category:** `page`
3. **Display name:** `Section Table`
4. **API ID:** `section-table`
5. Нажмите **Continue**

**Добавьте поля:**

| Field name | Type | Options |
|------------|------|---------|
| title | Text | Optional |
| tableData | JSON | Optional |

Нажмите **Finish**

---

## Проверка

После создания всех компонентов:

1. В **Content-Type Builder** → **Components** должны быть видны все 8 компонентов
2. Они должны быть в категории `page`
3. Теперь можно создавать тип Page и добавлять поля компонентов

## Порядок создания (важно!)

Создавайте компоненты в следующем порядке:
1. Meta
2. CTAButton (нужен для Hero)
3. Hero (использует CTAButton)
4. Card (нужен для SectionCards и SectionGrid)
5. SectionText
6. SectionCards (использует Card)
7. SectionGrid (использует Card)
8. SectionTable

Это важно, потому что компоненты могут ссылаться друг на друга!

