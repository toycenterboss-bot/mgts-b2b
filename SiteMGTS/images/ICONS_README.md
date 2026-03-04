# Инструкция по установке иконок с Flaticon.com

## Рекомендуемая коллекция иконок

Для сайта МГТС Бизнес рекомендуется использовать одну из следующих коллекций с Flaticon.com:

### Вариант 1: Business Icons (Рекомендуется)
**Ссылка:** https://www.flaticon.com/packs/business-and-finance
- Стиль: Современный, плоский дизайн
- Формат: SVG (для лучшего качества)
- Цвет: Можно использовать одноцветные или цветные версии

### Вариант 2: Technology Icons
**Ссылка:** https://www.flaticon.com/packs/technology
- Стиль: Минималистичный, техно-стиль
- Подходит для: Интернет, облачные решения, телефония

### Вариант 3: Network & Communication Icons
**Ссылка:** https://www.flaticon.com/packs/network-and-communication
- Стиль: Профессиональный
- Подходит для: Телекоммуникации, сетевые услуги

## Необходимые иконки для сайта

### Основные разделы:
1. 🌐 **Интернет** - icon-internet.svg
2. 📞 **Телефония** - icon-telephony.svg
3. 🔒 **Безопасность** - icon-security.svg
4. ☁️ **Облачные решения** - icon-cloud.svg
5. 📺 **Цифровое ТВ** - icon-tv.svg
6. 🏢 **Бизнес** - icon-business.svg

### Услуги интернета:
7. 🚀 **GPON** - icon-fiber.svg или icon-speed.svg
8. 💼 **Выделенный интернет** - icon-dedicated.svg
9. 🏢 **Офисный интернет** - icon-office.svg

### Услуги телефонии:
10. ☎️ **Фиксированная телефония** - icon-phone.svg
11. 📱 **IP-телефония** - icon-voip.svg
12. 🎛️ **Виртуальная АТС** - icon-pbx.svg
13. 📲 **Корпоративная мобильная связь** - icon-mobile.svg

### Безопасность:
14. 📹 **Видеонаблюдение** - icon-camera.svg
15. 🔐 **Контроль доступа** - icon-access.svg
16. 🚨 **Охранная сигнализация** - icon-alarm.svg

### Облачные решения:
17. 💾 **Облачное хранилище** - icon-storage.svg
18. 🖥️ **Виртуальные серверы** - icon-server.svg
19. ☁️ **Облачные сервисы** - icon-services.svg

### Цифровое ТВ:
20. 📺 **IPTV** - icon-iptv.svg
21. 🏢 **Корпоративное ТВ** - icon-corporate-tv.svg

### Сегменты:
22. 📡 **Операторы** - icon-operator.svg
23. 🏗️ **Застройщики** - icon-construction.svg
24. 🤝 **Партнеры** - icon-partners.svg
25. 🏛️ **Госсектор** - icon-government.svg

## Шаги по установке:

1. **Перейдите на Flaticon.com** и выберите одну из рекомендованных коллекций
2. **Скачайте иконки в формате SVG** (желательно одноцветные, чтобы можно было менять цвет через CSS)
3. **Переименуйте файлы** согласно списку выше
4. **Поместите файлы** в папку `SiteMGTS/images/icons/`
5. **Обновите HTML** - замените эмодзи на теги `<svg>` или `<img>` с указанием пути к иконкам

## Альтернативный вариант (Font Awesome):

Если вы хотите использовать готовую библиотеку иконок, можно использовать Font Awesome:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

Пример использования:
```html
<i class="fas fa-wifi"></i> <!-- Интернет -->
<i class="fas fa-phone"></i> <!-- Телефония -->
<i class="fas fa-shield-alt"></i> <!-- Безопасность -->
```

## Текущее состояние:

Сейчас в коде используются эмодзи (🌐, 📞, 🔒 и т.д.), которые нужно заменить на SVG иконки после их установки.

После установки иконок нужно будет обновить файлы HTML, заменив:
- `<div style="font-size: 4rem;">🌐</div>` на `<img src="images/icons/icon-internet.svg" alt="Интернет" class="icon">`

или использовать SVG inline:
- `<svg>...</svg>`

