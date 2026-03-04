# Инструкция по запуску миграции типов карточек

## Шаг 1: Убедитесь, что Strapi запущен

```bash
cd mgts-backend
npm run develop
```

## Шаг 2: Откройте консоль Strapi в другом терминале

```bash
cd mgts-backend
npm run strapi console
```

## Шаг 3: Выполните миграцию

В консоли Strapi выполните:

```javascript
const assignCardTypes = require('./scripts/migration/assign-card-types.js');
await assignCardTypes({ strapi });
```

## Что делает скрипт

1. ✅ Находит все страницы из раздела "О компании" (slug начинается с `about/`)
2. ✅ Анализирует HTML контент каждой страницы
3. ✅ Определяет типы карточек на основе классификации:
   - **Navigation Cards** - карточки-ссылки (`<a class="card">`)
   - **Info Cards** - информационные карточки (без ссылок)
   - **Service Cards** - карточки услуг (с ссылками внутри)
   - **Tariff Cards** - тарифные карточки (с ценой и условиями)
4. ✅ Добавляет `data-card-type` атрибуты к карточкам
5. ✅ Добавляет `data-grid-type` атрибуты к гридам
6. ✅ Обновляет страницы в Strapi

## Классификация карточек

### Navigation Cards (карточки-ссылки)
- `/about/index.html` - раздел "Дополнительная информация"
- `/about/ethics/index.html` - раздел "О деловой этике и комплаенсе"
- `/about/governance/index.html` - раздел "О корпоративном управлении"
- `/about/governance/principles/index.html` - раздел "Связанные разделы"
- `/about/ethics/general-director-message/index.html` - раздел "Связанные разделы"

### Info Cards (информационные карточки)
- `/about/index.html` - раздел "Миссия и ценности"
- `/about/values/index.html` - раздел "Наши ценности"
- `/about/ethics/index.html` - раздел "Наши принципы"
- `/about/governance/index.html` - раздел "Основные принципы"
- `/about/governance/principles/index.html` - раздел "Основные принципы"

## Результат

После выполнения миграции:
- Все карточки будут иметь `data-card-type` атрибут
- Все гриды будут иметь `data-grid-type` атрибут
- JavaScript код автоматически будет использовать эти типы
- Кнопки "Узнать больше" будут создаваться только там, где нужно

## Проверка результата

После миграции проверьте:
1. Откройте страницу в браузере (например, `http://localhost:8001/about/index.html`)
2. Откройте консоль разработчика (F12)
3. Проверьте, что карточки имеют `data-card-type` атрибут
4. Проверьте, что кнопки "Узнать больше" не появляются на navigation и info карточках
