# CSS Компоненты

**Дата создания:** 2026-01-09T15:41:02.776Z

**Всего классов:** 253
**Компонентов:** 10

## Структура

CSS файлы организованы по компонентам:

- `crm-cards.css` - 11 классов
- `history-timeline.css` - 16 классов
- `mobile-app-section.css` - 7 классов
- `section-cards.css` - 12 классов
- `section-map.css` - 5 классов
- `section-text.css` - 115 классов
- `service-faq.css` - 13 классов
- `service-order-form.css` - 61 классов
- `service-tariffs.css` - 7 классов
- `tariff-table.css` - 6 классов

## Использование

Импортируйте главный файл в ваш основной CSS:

```css
@import './components/components.css';
```

Или импортируйте отдельные компоненты:

```css
@import './components/crm-cards.css';
@import './components/history-timeline.css';
@import './components/mobile-app-section.css';
@import './components/section-cards.css';
@import './components/section-map.css';
@import './components/section-text.css';
@import './components/service-faq.css';
@import './components/service-order-form.css';
@import './components/service-tariffs.css';
@import './components/tariff-table.css';
```

## Переменные CSS

Стили используют CSS переменные. Убедитесь, что они определены:

```css
:root {
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-3xl: 3rem;
  --color-white: #ffffff;
  --color-gray-100: #f3f4f6;
  --color-gray-300: #d1d5db;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-primary: #0066cc;
  --color-primary-dark: #0052a3;
  --container-max-width: 1200px;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```
