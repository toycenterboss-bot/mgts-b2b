# Исправление контента страницы business/security в Strapi

## Проблемы, которые были обнаружены:

1. **Отсутствие подключения CSS** - на странице `/business/security/index.html` не был подключен файл `service-components.css`, из-за чего форма заказа услуг отображалась с некорректными стилями.

2. **Неправильная структура HTML контента** - элементы `.card` находились сразу внутри `.container` без обертки в `.section` и `.grid`, что нарушает правила типизации контента.

## Исправления:

### 1. HTML страница (уже исправлено)
✅ Добавлено подключение `service-components.css` в `<head>`:
```html
<link rel="stylesheet" href="../../css/service-components.css">
```

### 2. Контент в Strapi (требуется обновление)

**Текущая структура (неправильная):**
```html
<h2>Видеонаблюдение</h2>
<div class="card">...</div>
<div class="card">...</div>
<div class="card">...</div>
```

**Правильная структура:**
```html
<section class="section">
    <div class="container">
        <h2 class="section-title">Услуги безопасности</h2>
        <div class="grid grid-cols-3">
            <div class="card">...</div>
            <div class="card">...</div>
            <div class="card">...</div>
        </div>
    </div>
</section>
```

## Полный исправленный контент для Strapi:

```html
<div class="container">
    <div class="hero-content">
        <p>Комплексные решения безопасности: видеонаблюдение, контроль доступа, охранная сигнализация. Защита вашего бизнеса 24/7.</p>
    </div>
</div>
<section class="section">
    <div class="container">
        <h2 class="section-title">Услуги безопасности</h2>
        <div class="grid grid-cols-3">
            <div class="card">
                <h3>Видеонаблюдение</h3>
                <p>Системы видеонаблюдения для офисов, складов и производственных объектов.</p>
            </div>
            <div class="card">
                <h3>Контроль доступа</h3>
                <p>Системы контроля доступа для управления входом в офисные помещения.</p>
            </div>
            <div class="card">
                <h3>Охранная сигнализация</h3>
                <p>Охранные системы для защиты помещений от несанкционированного доступа.</p>
            </div>
        </div>
    </div>
</section>
<section class="section">
    <div class="container">
        <h2 class="section-title">Почему выбирают МГТС для безопасности</h2>
        <div class="grid grid-cols-3">
            <div class="card">
                <h3>Комплексный подход</h3>
                <p>Полный спектр услуг безопасности: от проектирования до обслуживания</p>
            </div>
            <div class="card">
                <h3>Установка и обслуживание</h3>
                <p>Профессиональная установка и круглосуточное обслуживание систем</p>
            </div>
            <div class="card">
                <h3>Удаленный доступ</h3>
                <p>Управление системами безопасности из любой точки мира через мобильное приложение</p>
            </div>
        </div>
    </div>
</section>
<section class="section">
    <div class="container">
        <h2 class="section-title">Нужна консультация по безопасности?</h2>
        <div style="max-width: 600px; margin: 0 auto; text-align: center;">
            <a href="../../consultation/" class="btn btn-primary btn-lg">
                Получить консультацию
            </a>
        </div>
    </div>
</section>
```

## Правила, которые были применены:

1. **Иерархия классов:**
   - `.card` должен быть внутри `.grid` (для сетки) или внутри `.section` (для отдельных карточек)
   - `.grid` должен быть внутри `.container`
   - `.container` должен быть внутри `.section`

2. **Заголовки:**
   - Все `<h2>` должны иметь класс `section-title`
   - Заголовки должны быть внутри `.section` с `.container`

3. **Структура секций:**
   - Каждая логическая группа контента должна быть обернута в `<section class="section">`
   - Внутри секции должен быть `<div class="container">`

## Файл с исправленным контентом:
`strapi-backups/2026-01-07_19-29-07/business_security_fixed.json`

## Инструкция по обновлению в Strapi:

1. Откройте Strapi Admin Panel
2. Перейдите в раздел "Pages" или "Custom Pages"
3. Найдите страницу с `slug: "business/security"`
4. Откройте поле "Content"
5. Замените весь HTML контент на исправленную версию выше
6. Сохраните изменения
7. Опубликуйте страницу

## Проверка после обновления:

1. Откройте страницу `/business/security/` в браузере
2. Проверьте, что форма заказа услуг отображается корректно (должна быть в конце страницы, перед footer)
3. Проверьте, что карточки услуг отображаются в сетке (3 колонки)
4. Проверьте консоль браузера на наличие ошибок

