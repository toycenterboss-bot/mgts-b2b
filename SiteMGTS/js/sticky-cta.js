/**
 * Sticky CTA для страниц услуг
 * Показывает закрепленную кнопку CTA при прокрутке страницы вниз
 */

(function() {
    'use strict';

    const STICKY_CTA_SELECTOR = '#sticky-cta';
    const SCROLL_THRESHOLD = 300; // Показывать после прокрутки на 300px
    const STORAGE_KEY = 'sticky-cta-closed';

    /**
     * Инициализация sticky CTA
     */
    function initStickyCTA() {
        const stickyCTA = document.querySelector(STICKY_CTA_SELECTOR);
        if (!stickyCTA) {
            return;
        }

        // Проверяем, не был ли sticky CTA закрыт пользователем
        const wasClosed = localStorage.getItem(STORAGE_KEY);
        if (wasClosed === 'true') {
            return;
        }

        // Обработчик прокрутки
        let lastScrollTop = 0;
        let ticking = false;

        function handleScroll() {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    
                    // Показываем sticky CTA после прокрутки вниз на определенное расстояние
                    if (scrollTop > SCROLL_THRESHOLD) {
                        stickyCTA.classList.add('sticky-cta--visible');
                    } else {
                        stickyCTA.classList.remove('sticky-cta--visible');
                    }

                    lastScrollTop = scrollTop;
                    ticking = false;
                });
                ticking = true;
            }
        }

        // Обработчик закрытия
        const closeButton = stickyCTA.querySelector('#sticky-cta-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                stickyCTA.classList.remove('sticky-cta--visible');
                // Сохраняем состояние закрытия в localStorage
                localStorage.setItem(STORAGE_KEY, 'true');
            });
        }

        // Обработчик клика по кнопке CTA (прокрутка к форме заказа)
        const ctaButton = stickyCTA.querySelector('.sticky-cta__btn');
        if (ctaButton) {
            ctaButton.addEventListener('click', (e) => {
                const href = ctaButton.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        // Фокус на форму для доступности
                        const firstInput = targetElement.querySelector('input, textarea, select');
                        if (firstInput) {
                            setTimeout(() => {
                                firstInput.focus();
                            }, 500);
                        }
                    }
                }
            });
        }

        // Добавляем обработчик прокрутки
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Проверяем начальную позицию прокрутки
        handleScroll();
    }

    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStickyCTA);
    } else {
        initStickyCTA();
    }

    // Инициализация после загрузки контента из CMS (если используется)
    if (typeof window !== 'undefined') {
        window.addEventListener('cms-content-loaded', initStickyCTA);
    }
})();


