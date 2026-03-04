# Проверка иконок

## Статус проверки

Все HTML файлы проверены на наличие эмодзи. Скрипт `icons-replace.js` автоматически заменяет все эмодзи на Font Awesome иконки при загрузке страницы.

## Маппинг эмодзи → Font Awesome

Всего обрабатывается **32 эмодзи**:

- 🌐 → fa-globe (Интернет)
- 📞 → fa-phone (Телефония)
- 🔒 → fa-shield-halved (Безопасность)
- ☁️ → fa-cloud (Облако)
- 📺 → fa-tv (ТВ)
- 🏢 → fa-building (Бизнес/Офис)
- 📡 → fa-satellite-dish (Операторы)
- 🏗️ → fa-building (Застройщики)
- 🤝 → fa-handshake (Партнеры)
- 🏛️ → fa-landmark (Госсектор)
- 🚀 → fa-rocket (GPON)
- 💼 → fa-briefcase (Выделенный интернет)
- 🎛️ → fa-sliders (Виртуальная АТС)
- 📱 → fa-mobile-screen-button (IP-телефония)
- 📲 → fa-mobile-screen (Мобильная связь)
- 📹 → fa-video (Видеонаблюдение)
- 🔐 → fa-lock (Контроль доступа)
- 🚨 → fa-bell (Охранная сигнализация)
- 💾 → fa-hard-drive (Облачное хранилище)
- 🖥️ → fa-server (Виртуальные серверы)
- ☎️ → fa-phone-alt (Фиксированная телефония)
- 🛡️ → fa-shield (Защита)
- ⚡ → fa-bolt (Скорость)
- 👥 → fa-users (Экспертиза)
- 🔧 → fa-wrench (Установка)
- 💻 → fa-laptop (IT/Цифровые решения)
- 🏠 → fa-house (Жилые объекты)
- 🔄 → fa-rotate-right (Передача трафика)
- 🔌 → fa-plug (Подключение)
- 💰 → fa-money-bill (Выгода)
- 🎯 → fa-bullseye (Поддержка)
- 📊 → fa-chart-line (Инструменты)
- ✅ → fa-check (Соответствие)
- 🏭 → fa-industry (Производство)
- 🔍 → fa-search (Поиск)
- 👤 → fa-user (Личный кабинет)

## Файлы с эмодзи (всего 17 файлов)

1. index.html (18 эмодзи)
2. business/index.html (7 эмодзи)
3. business/internet/index.html (3 эмодзи)
4. business/internet/gpon/index.html (3 эмодзи)
5. business/internet/dedicated/index.html (6 эмодзи)
6. business/telephony/index.html (7 эмодзи)
7. business/telephony/ip/index.html (3 эмодзи)
8. business/telephony/vpbx/index.html (3 эмодзи)
9. business/telephony/mobile/index.html (3 эмодзи)
10. business/security/index.html (6 эмодзи)
11. business/security/video-surveillance/index.html (3 эмодзи)
12. business/cloud/index.html (6 эмодзи)
13. business/tv/index.html (2 эмодзи)
14. operators/index.html (7 эмодзи)
15. developers/index.html (7 эмодзи)
16. government/index.html (7 эмодзи)
17. partners/index.html (3 эмодзи)

## Как работает замена

1. При загрузке страницы скрипт `icons-replace.js` автоматически выполняется
2. Он находит все элементы с эмодзи:
   - `<div style="font-size: ...">🌐</div>` → заменяется на `<i class="fas fa-globe"></i>`
   - `<div class="service-card-icon">🌐</div>` → заменяется на `<i class="fas fa-globe"></i>`
   - `<a class="nav-link">📞 8 800...</a>` → заменяется на `<a class="nav-link"><i class="fas fa-phone"></i> 8 800...</a>`

3. Все замены происходят автоматически, без необходимости редактировать HTML файлы

## Проверка работы

Откройте любую страницу сайта в браузере и проверьте:
- Все эмодзи должны быть заменены на Font Awesome иконки
- Иконки должны отображаться корректно
- В консоли браузера не должно быть ошибок

Если иконки не заменяются, проверьте:
1. Подключен ли Font Awesome CDN в `<head>` страницы
2. Подключен ли скрипт `icons-replace.js` перед закрывающим `</body>`
3. Откройте консоль браузера (F12) для проверки ошибок

