# План доработки HTML в Strapi согласно типизации

## Статус бэкапа

✅ **Бэкап создан:** `2026-01-07_19-29-07`  
✅ **Всего страниц:** 42  
✅ **Страниц с контентом:** 42  

**Восстановление:**
```bash
node mgts-backend/scripts/restore-from-backup.js latest
```

## Этапы доработки

### Этап 1: Анализ текущего состояния

Для каждой страницы нужно проверить:

1. **Структура секций:**
   - [ ] Все секции имеют класс `section`
   - [ ] Специальные секции имеют класс `service-*`
   - [ ] Форма заказа имеет `id="order-form"`

2. **Обязательные элементы:**
   - [ ] Проверить наличие всех обязательных элементов согласно `CMS_CONTENT_TYPES.md`
   - [ ] Проверить правильность классов и структуры

3. **Hero Content:**
   - [ ] Убедиться, что hero-content не дублируется в основном контенте

### Этап 2: Доработка по типам секций

#### 2.1. Service Tariffs (`service-tariffs`)

**Проверить:**
- [ ] Класс `service-tariffs` на секции
- [ ] Наличие `.tariffs-grid`
- [ ] Наличие `.tariff-card` для каждого тарифа
- [ ] Наличие `.tariff-card__title` и `.tariff-card__price`
- [ ] Наличие `.tariff-card__features` (список характеристик)

**Страницы с тарифами:**
- business/internet/gpon
- business/telephony/fixed
- business/telephony/ip
- business/telephony/vpbx
- business/telephony/mobile
- business/security/video-surveillance
- business/cloud/vps
- business/cloud/storage
- business/tv/iptv
- business/tv/office

#### 2.2. Service FAQ (`service-faq`)

**Проверить:**
- [ ] Класс `service-faq` на секции
- [ ] Наличие `.faq-list`
- [ ] Наличие `.faq-item` для каждого вопроса
- [ ] Наличие `.faq-question` (кнопка вопроса)
- [ ] Наличие `.faq-answer` (блок ответа)
- [ ] Правильные ARIA атрибуты (`aria-expanded`, `aria-controls`)

#### 2.3. Service Order Form (`service-order`)

**Проверить:**
- [ ] Класс `service-order` на секции
- [ ] **Обязательно:** `id="order-form"` на секции
- [ ] Наличие `.order-form` (форма)
- [ ] Правильные `id` и `name` для всех полей
- [ ] Наличие кнопки отправки `.order-form__submit`
- [ ] Правильные ARIA атрибуты

#### 2.4. Service Features (`service-features`)

**Проверить:**
- [ ] Класс `service-features` на секции
- [ ] Наличие `.features-grid`
- [ ] Наличие `.feature-card` для каждого преимущества
- [ ] Наличие `.feature-card__title` и `.feature-card__description`

#### 2.5. Service Specs (`service-specs`)

**Проверить:**
- [ ] Класс `service-specs` на секции
- [ ] Наличие `.specs-grid`
- [ ] Наличие `.spec-item` для каждой характеристики
- [ ] Наличие `.spec-item__label` и `.spec-item__value`

#### 2.6. Service Cases (`service-cases`)

**Проверить:**
- [ ] Класс `service-cases` на секции
- [ ] Наличие `.cases-grid`
- [ ] Наличие `.case-card` для каждого кейса
- [ ] Наличие `.case-card__quote` (отзыв клиента)

#### 2.7. Service HowTo (`service-howto`)

**Проверить:**
- [ ] Класс `service-howto` на секции
- [ ] Наличие `.howto-steps`
- [ ] Наличие `.howto-step` для каждого шага
- [ ] Наличие `.howto-step__number` и `.howto-step__title`

#### 2.8. Regular Sections (`section`)

**Проверить:**
- [ ] Класс `section` на секции
- [ ] Наличие `.container` внутри секции
- [ ] Наличие заголовка (`.section-title` или `h2`)
- [ ] Правильная структура контента

### Этап 3: Исправление проблем

Для каждой страницы, которая не соответствует типизации:

1. Открыть страницу в Strapi
2. Проверить HTML структуру
3. Привести к стандарту из `CMS_CONTENT_TYPES.md`
4. Сохранить изменения
5. Проверить отображение на сайте

### Этап 4: Приоритетные страницы

Начать с проблемных страниц:

1. **business/telephony** - категория, контент не отображается
2. **business/internet** - категория
3. **business/security** - категория
4. **business/cloud** - категория
5. **business/tv** - категория

Затем проверить service pages с тарифами (они уже работают хорошо).

## Чек-лист для каждой страницы

- [ ] Hero content удален из основного контента
- [ ] Все секции имеют класс `section`
- [ ] Специальные секции имеют правильные классы `service-*`
- [ ] Форма заказа имеет `id="order-form"`
- [ ] Все обязательные элементы присутствуют
- [ ] Правильная структура вложенности
- [ ] Правильные ARIA атрибуты
- [ ] Нет дублирующихся секций
- [ ] Контент отображается корректно на сайте

## Инструменты

### Просмотр HTML контента страницы

```bash
# Посмотреть HTML контент из бэкапа
cat strapi-backups/2026-01-07_19-29-07/business_telephony.html
```

### Проверка структуры через API

```bash
# Получить страницу через API
curl "http://localhost:1337/api/pages?filters[slug][\$eq]=business/telephony&populate=*" \
  -H "Authorization: Bearer {TOKEN}" | jq '.data[0].attributes.content'
```

## Следующие шаги

1. ✅ Создать бэкап (завершено)
2. ⏳ Начать доработку HTML согласно типизации
3. ⏳ Проверить каждую страницу
4. ⏳ Исправить проблемы
5. ⏳ Протестировать отображение


