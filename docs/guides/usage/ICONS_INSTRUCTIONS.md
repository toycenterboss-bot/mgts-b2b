# Инструкция по установке иконок с Flaticon.com

## Что нужно сделать:

1. **Перейдите на Flaticon.com** и выберите коллекцию иконок
2. **Скачайте SVG иконки** (рекомендуется формат SVG для лучшего качества)
3. **Поместите файлы** в папку `SiteMGTS/images/icons/`
4. **Замените эмодзи в HTML** на теги с иконками

## Рекомендуемые коллекции с Flaticon.com:

### Лучший вариант: Business & Finance Icons
**Ссылка:** https://www.flaticon.com/packs/business-and-finance
- Стиль: Современный, плоский дизайн
- Подходит для: Все разделы сайта

### Альтернативные варианты:

1. **Technology & Devices**
   - https://www.flaticon.com/packs/technology-and-devices
   - Для: Интернет, телефония, облако

2. **Network & Communication**
   - https://www.flaticon.com/packs/network-and-communication
   - Для: Телекоммуникации

3. **Security & Protection**
   - https://www.flaticon.com/packs/security-and-protection
   - Для: Безопасность

## Список необходимых иконок:

| Иконка | Файл | Где используется |
|--------|------|------------------|
| 🌐 Интернет | `icon-internet.svg` | Интернет категория |
| 📞 Телефония | `icon-telephony.svg` | Телефония категория |
| 🔒 Безопасность | `icon-security.svg` | Безопасность категория |
| ☁️ Облако | `icon-cloud.svg` | Облачные решения |
| 📺 ТВ | `icon-tv.svg` | Цифровое ТВ |
| 🏢 Бизнес | `icon-business.svg` | Бизнес раздел |
| 📡 Операторы | `icon-operator.svg` | Операторы |
| 🏗️ Застройщики | `icon-construction.svg` | Застройщики |
| 🤝 Партнеры | `icon-partners.svg` | Партнеры |
| 🏛️ Госсектор | `icon-government.svg` | Госсектор |

И еще 15+ иконок для услуг (см. файл `images/ICONS_README.md`)

## Как заменить эмодзи на иконки:

### Текущий код (с эмодзи):
```html
<div style="font-size: 4rem;">🌐</div>
```

### Новый код (с SVG иконкой):
```html
<img src="images/icons/icon-internet.svg" alt="Интернет" class="icon" style="width: 64px; height: 64px;">
```

### Или inline SVG:
```html
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <!-- содержимое SVG из скачанного файла -->
</svg>
```

## CSS для иконок:

После установки можно добавить в `css/style.css`:

```css
.icon {
  width: 64px;
  height: 64px;
  display: inline-block;
  color: var(--color-primary);
}

.service-card-icon .icon {
  width: 48px;
  height: 48px;
}
```

## Альтернатива: Font Awesome

Если не хотите скачивать иконки вручную, можно использовать Font Awesome CDN:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

И использовать так:
```html
<i class="fas fa-wifi"></i> <!-- Интернет -->
<i class="fas fa-phone"></i> <!-- Телефония -->
<i class="fas fa-shield-alt"></i> <!-- Безопасность -->
```

