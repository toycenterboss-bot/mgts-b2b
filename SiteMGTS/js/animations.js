/**
 * МГТС Business - Продвинутые анимации и интерактивность
 */

(function() {
    'use strict';

    // === Ripple Effect для кнопок ===
    function initRippleButtons() {
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
        
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple-effect');
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }

    // === Параллакс эффект для hero ===
    function initParallax() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const parallaxElements = hero.querySelectorAll('.hero-content');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.5;
            
            parallaxElements.forEach(element => {
                element.style.transform = `translateY(${rate}px)`;
                element.style.opacity = 1 - (scrolled / 500);
            });
        }, { passive: true });
    }

    // === Scroll Animations ===
    function initScrollAnimations() {
        if (!('IntersectionObserver' in window)) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-in');
                        
                        // Добавляем различные типы анимаций
                        if (entry.target.classList.contains('card')) {
                            const cards = Array.from(entry.target.parentElement.children);
                            const cardIndex = cards.indexOf(entry.target);
                            if (cardIndex % 2 === 0) {
                                entry.target.classList.add('animate-slide-left');
                            } else {
                                entry.target.classList.add('animate-slide-right');
                            }
                        }
                    }, index * 100);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Наблюдаем за элементами
        document.querySelectorAll('.card, .service-card, .section > .container > *').forEach(el => {
            observer.observe(el);
        });
    }

    // === Улучшенное мобильное меню ===
    function initMobileMenu() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.nav');
        const body = document.body;

        if (toggle && nav) {
            toggle.addEventListener('click', () => {
                const isActive = nav.classList.toggle('active');
                toggle.setAttribute('aria-expanded', isActive);
                
                if (isActive) {
                    body.style.overflow = 'hidden';
                    nav.style.transform = 'translateX(0)';
                } else {
                    body.style.overflow = '';
                    nav.style.transform = 'translateX(100%)';
                }
            });

            // Закрытие при клике на ссылку
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    nav.classList.remove('active');
                    toggle.setAttribute('aria-expanded', 'false');
                    body.style.overflow = '';
                });
            });
        }
    }

    // === Smooth Scroll с offset ===
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#' || href.length <= 1) return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const headerOffset = 100;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // === Counter Animation ===
    function animateCounter(element, target, duration = 2000) {
        let current = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target.toLocaleString('ru-RU');
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current).toLocaleString('ru-RU');
            }
        }, 16);
    }

    // === Инициализация всех функций ===
    function init() {
        initRippleButtons();
        initScrollAnimations();
        initMobileMenu();
        initSmoothScroll();
        
        // Параллакс только на десктопе
        if (window.innerWidth > 768) {
            initParallax();
        }
    }

    // Запуск при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Обработка изменения размера окна
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768) {
                initParallax();
            }
        }, 250);
    });

})();

