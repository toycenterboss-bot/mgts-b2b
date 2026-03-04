/**
 * Замена эмодзи на Font Awesome иконки
 * Выполняется автоматически при загрузке страницы
 */

(function() {
    'use strict';
    
    // Маппинг эмодзи на Font Awesome классы
    const iconMap = {
        '🌐': 'fa-globe',
        '📞': 'fa-phone',
        '🔒': 'fa-shield-halved',
        '☁️': 'fa-cloud',
        '📺': 'fa-tv',
        '🏢': 'fa-building',
        '📡': 'fa-satellite-dish',
        '🏗️': 'fa-building',
        '🤝': 'fa-handshake',
        '🏛️': 'fa-landmark',
        '🚀': 'fa-rocket',
        '💼': 'fa-briefcase',
        '🎛️': 'fa-sliders',
        '📱': 'fa-mobile-screen-button',
        '📲': 'fa-mobile-screen',
        '📹': 'fa-video',
        '🔐': 'fa-lock',
        '🚨': 'fa-bell',
        '💾': 'fa-hard-drive',
        '🖥️': 'fa-server',
        '☎️': 'fa-phone-alt',
        '🛡️': 'fa-shield',
        '⚡': 'fa-bolt',
        '👥': 'fa-users',
        '🔧': 'fa-wrench',
        '💻': 'fa-laptop',
        '🏠': 'fa-house',
        '🔄': 'fa-rotate-right',
        '🔌': 'fa-plug',
        '💰': 'fa-money-bill',
        '🎯': 'fa-bullseye',
        '📊': 'fa-chart-line',
        '✅': 'fa-check',
        '🏭': 'fa-industry',
        '🔍': 'fa-search',
        '👤': 'fa-user'
    };
    
    // Функция замены эмодзи на иконки
    function replaceEmojisWithIcons() {
        // Проверяем, что Font Awesome загружен
        if (!document.querySelector('link[href*="font-awesome"]')) {
            // Если Font Awesome не загружен, ждем его загрузки
            setTimeout(replaceEmojisWithIcons, 100);
            return;
        }
        
        // Заменяем эмодзи в div с inline стилями font-size (основной случай)
        document.querySelectorAll('div[style*="font-size"]').forEach(div => {
            const text = div.textContent.trim();
            // Проверяем что это эмодзи и нет дочерних элементов
            if (text.length <= 2 && iconMap[text] && div.children.length === 0) {
                const fontSize = div.style.fontSize || '3rem';
                div.innerHTML = `<i class="fas ${iconMap[text]}" style="font-size: ${fontSize};" aria-hidden="true"></i>`;
                div.classList.add('fa-icon-wrapper');
            }
        });
        
        // Также заменяем эмодзи в service-card-icon
        document.querySelectorAll('.service-card-icon').forEach(icon => {
            const text = icon.textContent.trim();
            if (text.length <= 2 && iconMap[text] && icon.children.length === 0) {
                icon.innerHTML = `<i class="fas ${iconMap[text]}" aria-hidden="true"></i>`;
                icon.classList.add('fa-icon-wrapper');
            }
        });
        
        // Заменяем эмодзи в навигационных ссылках (например, 📞 8 800...)
        document.querySelectorAll('a.nav-link, a[href^="tel:"]').forEach(link => {
            const text = link.textContent.trim();
            // Ищем эмодзи в начале текста
            for (const emoji in iconMap) {
                if (text.startsWith(emoji)) {
                    const restOfText = text.substring(emoji.length).trim();
                    link.innerHTML = `<i class="fas ${iconMap[emoji]}" aria-hidden="true"></i> ${restOfText}`;
                    break;
                }
            }
        });
    }
    
    // Запуск при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', replaceEmojisWithIcons);
    } else {
        replaceEmojisWithIcons();
    }
})();

