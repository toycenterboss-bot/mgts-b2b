# Шаблон унифицированного меню

## Структура меню для всех страниц:

```html
<nav class="nav" id="mainNav">
    <a href="[path_to_root]/index.html" class="nav-link">Главная</a>
    <a href="[path_to_root]/business/internet/index.html" class="nav-link">Услуги</a>
    <a href="[path_to_root]/business/index.html" class="nav-link">Бизнес</a>
    <a href="[path_to_root]/operators/index.html" class="nav-link">Операторы</a>
    <a href="[path_to_root]/developers/index.html" class="nav-link">Застройщики</a>
    <a href="[path_to_root]/partners/index.html" class="nav-link">Партнеры</a>
    <a href="[path_to_root]/government/index.html" class="nav-link">Госсектор</a>
    <a href="[path_to_root]/about/index.html" class="nav-link">О компании</a>
    <a href="[path_to_root]/contacts/index.html" class="nav-link">Контакты</a>
    <a href="tel:+749563600636" class="nav-link">📞 8 800 250-0-250</a>
</nav>
```

## Пути к корню по уровням:

- **Корень (index.html)**: `index.html` или `./`
- **Уровень 1 (business/index.html)**: `../index.html`
- **Уровень 2 (business/internet/index.html)**: `../../index.html`
- **Уровень 3 (business/internet/gpon/index.html)**: `../../../index.html`

## Mega-menu только на главной странице

Mega-menu добавляется только в index.html, на остальных страницах просто ссылки.

