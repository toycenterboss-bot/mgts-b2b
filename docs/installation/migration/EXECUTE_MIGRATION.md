# Выполнение миграции типов карточек

## ✅ Что уже сделано

1. ✅ Обновлены схемы компонентов в Strapi (добавлены поля `cardType` и `gridType`)
2. ✅ Обновлен JavaScript код для поддержки типов из CMS
3. ✅ Создан скрипт миграции `assign-card-types.js`
4. ✅ Скрипт успешно определяет типы карточек (проверено через API)

## 🚀 Выполнение миграции

### Способ 1: Через Strapi Console (РЕКОМЕНДУЕТСЯ)

1. **Убедитесь, что Strapi запущен:**
   ```bash
   cd mgts-backend
   npm run develop
   ```

2. **В другом терминале откройте консоль Strapi:**
   ```bash
   cd mgts-backend
   npm run strapi console
   ```

3. **Выполните миграцию:**
   ```javascript
   const assignCardTypes = require('./scripts/migration/assign-card-types.js');
   await assignCardTypes({ strapi });
   ```

### Способ 2: Через файл загрузки

1. **Откройте консоль Strapi:**
   ```bash
   cd mgts-backend
   npm run strapi console
   ```

2. **Загрузите скрипт:**
   ```
   .load scripts/migration/load-and-run.js
   ```

## 📊 Результаты тестирования

При тестировании через API скрипт успешно определил типы для всех карточек:

- ✅ Navigation Cards: определены правильно
- ✅ Info Cards: определены правильно
- ✅ Service Cards: определены правильно

**Примеры результатов:**
- `about/ethics` - 5 navigation cards, 3 info cards
- `about/governance` - 4 navigation cards, 3 info cards
- `about/values` - 6 info cards

## ⚠️ Важно

API требует авторизацию для обновления страниц (ошибка 403 Forbidden), поэтому миграцию нужно выполнять через Strapi console, который имеет прямой доступ к `entityService`.

## 🔍 Проверка результатов

После выполнения миграции:

1. Откройте страницу в браузере (например, `http://localhost:8001/about/index.html`)
2. Откройте консоль разработчика (F12)
3. Проверьте элементы карточек:
   ```javascript
   document.querySelectorAll('.card, .service-card').forEach(card => {
     console.log(card.getAttribute('data-card-type'), card.querySelector('h3')?.textContent);
   });
   ```
4. Убедитесь, что кнопки "Узнать больше" не появляются на navigation и info карточках




