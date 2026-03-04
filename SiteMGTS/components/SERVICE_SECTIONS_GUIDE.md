# Руководство по использованию секций для страниц услуг

Этот документ описывает все доступные секции, которые можно использовать на страницах услуг в Strapi CMS.

## Доступные секции

### 1. `service-tariffs` - Тарифы и цены
**Класс:** `service-tariffs`  
**ID:** `service-tariffs` (опционально, для якорных ссылок)

Секция для отображения тарифных планов услуги. Включает:
- Название тарифа
- Цену
- Список характеристик/преимуществ
- Кнопку выбора тарифа

**Пример:** `components/service-tariffs-example.html`

---

### 2. `service-features` - Преимущества услуги
**Класс:** `service-features`

Секция для отображения ключевых преимуществ услуги в виде карточек с иконками.

**Пример:** `components/service-features-example.html`

---

### 3. `service-specs` - Технические характеристики
**Класс:** `service-specs`

Секция для отображения технических параметров услуги в виде таблицы характеристик.

**Пример:** `components/service-specs-example.html`

---

### 4. `service-faq` - Часто задаваемые вопросы
**Класс:** `service-faq`

Секция с аккордеоном вопросов и ответов.

**Пример:** `components/service-faq-example.html`

---

### 5. `service-cases` - Кейсы клиентов
**Класс:** `service-cases`

Секция для отображения отзывов и кейсов использования услуги реальными клиентами.

**Пример:** `components/service-cases-example.html`

---

### 6. `service-howto` - Как подключить
**Класс:** `service-howto`

Секция с пошаговой инструкцией по подключению услуги.

**Пример:** `components/service-howto-example.html`

---

### 7. `service-order` - Форма заказа
**Класс:** `service-order`  
**ID:** `service-order` (обязательно, для якорных ссылок)

Секция с формой заказа услуги или консультации.

**Пример:** `components/service-order-form-example.html`

---

## Как использовать в Strapi

1. Откройте страницу услуги в Strapi CMS
2. В редакторе контента добавьте HTML блок
3. Скопируйте HTML код из соответствующего примера (`components/*-example.html`)
4. Вставьте код в HTML блок
5. Настройте контент под вашу услугу (тексты, цены, характеристики)
6. Сохраните страницу

## Важные замечания

### Порядок секций
Рекомендуемый порядок секций на странице услуги:

1. Hero (заголовок и описание) - уже есть в шаблоне
2. Основной контент (описание услуги)
3. `service-features` - Преимущества
4. `service-specs` - Технические характеристики
5. `service-tariffs` - Тарифы
6. `service-cases` - Кейсы (опционально)
7. `service-faq` - FAQ
8. `service-howto` - Как подключить
9. `service-order` - Форма заказа

### Стилизация
Все секции автоматически стилизуются через `css/service-components.css`. Не нужно добавлять дополнительные классы или стили.

### Обработка в cms-loader.js
Все секции с классами `service-*` обрабатываются специальным образом:
- Они не проходят нормализацию
- Сохраняют свою оригинальную структуру
- Вставляются в конец контента страницы

### Доступность
Все секции включают:
- Семантическую разметку HTML5
- ARIA атрибуты для доступности
- Поддержку навигации с клавиатуры
- Правильные заголовки и структуру

## Пример полной страницы услуги

```html
<!-- Hero секция (уже есть в шаблоне) -->
<section class="hero">
    <div class="container">
        <h1>Название услуги</h1>
        <p>Краткое описание</p>
    </div>
</section>

<!-- Основной контент -->
<main id="main-content">
    <section class="section">
        <div class="container">
            <p>Подробное описание услуги...</p>
        </div>
    </section>

    <!-- Преимущества -->
    <section class="service-features">
        <!-- Код из service-features-example.html -->
    </section>

    <!-- Технические характеристики -->
    <section class="service-specs">
        <!-- Код из service-specs-example.html -->
    </section>

    <!-- Тарифы -->
    <section class="service-tariffs" id="service-tariffs">
        <!-- Код из service-tariffs-example.html -->
    </section>

    <!-- FAQ -->
    <section class="service-faq">
        <!-- Код из service-faq-example.html -->
    </section>

    <!-- Как подключить -->
    <section class="service-howto">
        <!-- Код из service-howto-example.html -->
    </section>

    <!-- Форма заказа -->
    <section class="service-order" id="service-order">
        <!-- Код из service-order-form-example.html -->
    </section>
</main>
```

## Поддержка

Если у вас возникли вопросы или проблемы с использованием секций, обратитесь к разработчику или проверьте:
- Консоль браузера на наличие ошибок JavaScript
- Правильность копирования HTML кода
- Наличие всех необходимых CSS и JS файлов на странице


