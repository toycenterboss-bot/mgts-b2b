/**
 * Mirror Slider - Интерактивный слайдер для секции "Почему МГТС?"
 * 
 * Функциональность:
 * - Навигационные точки (dots)
 * - Стрелки навигации (prev/next)
 * - Автоматическая прокрутка
 * - Поддержка клавиатуры
 * - Пауза при наведении
 */

(function() {
    'use strict';

    class MirrorSlider {
        constructor(container) {
            this.container = container;
            this.leftCards = container.querySelectorAll('.mirror-slider__left-card-box');
            this.rightImages = container.querySelectorAll('.mirror-slider__right-card-img');
            this.currentSlide = 0;
            this.totalSlides = this.leftCards.length;
            this.autoPlayInterval = null;
            this.autoPlayDelay = 5000; // 5 секунд
            this.isPaused = false;
            
            // Проверяем наличие элементов
            if (this.totalSlides === 0) {
                console.warn('[Mirror Slider] No slides found');
                return;
            }
            
            this.init();
        }

        init() {
            // Создаем элементы навигации
            this.createNavigation();
            
            // Инициализируем первый слайд
            this.goToSlide(0);
            
            // Запускаем автопрокрутку
            this.startAutoPlay();
            
            // Добавляем обработчики событий
            this.attachEventListeners();
            
            // Логирование для отладки
            console.log(`[Mirror Slider] Инициализирован слайдер с ${this.totalSlides} слайдами`);
        }

        createNavigation() {
            // Проверяем, не существует ли уже навигация
            const existingNav = this.container.querySelector('.mirror-slider__navigation');
            if (existingNav) {
                console.log('[Mirror Slider] Навигация уже существует, пропускаем создание');
                // Используем существующую навигацию
                this.prevButton = existingNav.querySelector('.mirror-slider__arrow--prev');
                this.nextButton = existingNav.querySelector('.mirror-slider__arrow--next');
                this.dots = existingNav.querySelectorAll('.mirror-slider__dot');
                return;
            }
            
            // Создаем контейнер для навигации
            const navContainer = document.createElement('div');
            navContainer.className = 'mirror-slider__navigation';
            
            // Создаем стрелки
            const prevButton = document.createElement('button');
            prevButton.className = 'mirror-slider__arrow mirror-slider__arrow--prev';
            prevButton.setAttribute('aria-label', 'Предыдущий слайд');
            prevButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            const nextButton = document.createElement('button');
            nextButton.className = 'mirror-slider__arrow mirror-slider__arrow--next';
            nextButton.setAttribute('aria-label', 'Следующий слайд');
            nextButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            // Создаем точки навигации
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'mirror-slider__dots';
            dotsContainer.setAttribute('role', 'tablist');
            dotsContainer.setAttribute('aria-label', 'Навигация по слайдам');
            
            for (let i = 0; i < this.totalSlides; i++) {
                const dot = document.createElement('button');
                dot.className = 'mirror-slider__dot';
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-label', `Слайд ${i + 1}`);
                dot.setAttribute('aria-selected', 'false');
                dot.setAttribute('data-slide', i);
                dotsContainer.appendChild(dot);
            }
            
            // Добавляем элементы в контейнер
            navContainer.appendChild(prevButton);
            navContainer.appendChild(dotsContainer);
            navContainer.appendChild(nextButton);
            
            // Добавляем контейнер навигации в слайдер
            this.container.appendChild(navContainer);
            
            // Сохраняем ссылки на элементы
            this.prevButton = prevButton;
            this.nextButton = nextButton;
            this.dots = dotsContainer.querySelectorAll('.mirror-slider__dot');
        }

        goToSlide(index) {
            if (index < 0 || index >= this.totalSlides) {
                console.warn(`[Mirror Slider] Некорректный индекс слайда: ${index}`);
                return;
            }
            
            // Удаляем активные классы со всех слайдов
            this.leftCards.forEach((card, i) => {
                if (i === index) {
                    card.classList.remove('close-left-slide');
                    card.classList.add('open-left-slide');
                } else {
                    card.classList.remove('open-left-slide');
                    card.classList.add('close-left-slide');
                }
            });
            
            this.rightImages.forEach((img, i) => {
                if (i === index) {
                    img.classList.remove('close-right-slide');
                    img.classList.add('open-right-slide');
                } else {
                    img.classList.remove('open-right-slide');
                    img.classList.add('close-right-slide');
                }
            });
            
            // Обновляем точки навигации
            if (this.dots && this.dots.length > 0) {
                this.dots.forEach((dot, i) => {
                    if (i === index) {
                        dot.classList.add('mirror-slider__dot--active');
                        dot.setAttribute('aria-selected', 'true');
                    } else {
                        dot.classList.remove('mirror-slider__dot--active');
                        dot.setAttribute('aria-selected', 'false');
                    }
                });
            }
            
            this.currentSlide = index;
            
            // Перезапускаем автопрокрутку
            this.restartAutoPlay();
        }

        nextSlide() {
            const nextIndex = (this.currentSlide + 1) % this.totalSlides;
            this.goToSlide(nextIndex);
        }

        prevSlide() {
            const prevIndex = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
            this.goToSlide(prevIndex);
        }

        startAutoPlay() {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
            }
            
            if (!this.isPaused) {
                this.autoPlayInterval = setInterval(() => {
                    this.nextSlide();
                }, this.autoPlayDelay);
            }
        }

        stopAutoPlay() {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
            }
        }

        restartAutoPlay() {
            this.stopAutoPlay();
            this.startAutoPlay();
        }

        pauseAutoPlay() {
            this.isPaused = true;
            this.stopAutoPlay();
        }

        resumeAutoPlay() {
            this.isPaused = false;
            this.startAutoPlay();
        }

        attachEventListeners() {
            // Стрелки навигации
            this.prevButton.addEventListener('click', () => {
                this.prevSlide();
            });
            
            this.nextButton.addEventListener('click', () => {
                this.nextSlide();
            });
            
            // Точки навигации
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    this.goToSlide(index);
                });
            });
            
            // Клавиатура
            this.container.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.prevSlide();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextSlide();
                }
            });
            
            // Пауза при наведении
            this.container.addEventListener('mouseenter', () => {
                this.pauseAutoPlay();
            });
            
            this.container.addEventListener('mouseleave', () => {
                this.resumeAutoPlay();
            });
            
            // Пауза при фокусе (для доступности)
            this.container.addEventListener('focusin', () => {
                this.pauseAutoPlay();
            });
            
            this.container.addEventListener('focusout', () => {
                this.resumeAutoPlay();
            });
            
            // Останавливаем автопрокрутку при уходе со страницы
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseAutoPlay();
                } else {
                    this.resumeAutoPlay();
                }
            });
        }

        destroy() {
            this.stopAutoPlay();
            // Удаляем обработчики событий и элементы навигации
            const navContainer = this.container.querySelector('.mirror-slider__navigation');
            if (navContainer) {
                navContainer.remove();
            }
        }
    }

    // Инициализация всех слайдеров на странице
    function initMirrorSliders() {
        const sliders = document.querySelectorAll('.mirror-slider');
        
        if (sliders.length === 0) {
            console.log('[Mirror Slider] Слайдеры не найдены на странице');
            return;
        }
        
        console.log(`[Mirror Slider] Найдено слайдеров: ${sliders.length}`);
        
        const sliderInstances = [];
        
        sliders.forEach((slider, index) => {
            // Пропускаем уже инициализированные слайдеры
            if (slider.dataset.initialized === 'true') {
                console.log(`[Mirror Slider] Слайдер ${index + 1} уже инициализирован, пропускаем`);
                return;
            }
            
            try {
                const instance = new MirrorSlider(slider);
                slider.dataset.initialized = 'true'; // Помечаем как инициализированный
                sliderInstances.push(instance);
                console.log(`[Mirror Slider] Слайдер ${index + 1} инициализирован успешно`);
            } catch (error) {
                console.error(`[Mirror Slider] Ошибка при инициализации слайдера ${index + 1}:`, error);
            }
        });
        
        // Сохраняем экземпляры для возможного использования
        if (!window.mirrorSliders) {
            window.mirrorSliders = [];
        }
        window.mirrorSliders.push(...sliderInstances);
        
        if (sliderInstances.length > 0) {
            console.log(`[Mirror Slider] Инициализировано новых слайдеров: ${sliderInstances.length}`);
        }
    }

    // Инициализация при загрузке DOM
    function initWhenReady() {
        // Проверяем наличие слайдера (может быть загружен из CMS)
        const sliders = document.querySelectorAll('.mirror-slider');
        if (sliders.length > 0) {
            initMirrorSliders();
        } else {
            // Если слайдер еще не загружен, ждем немного и проверяем снова
            setTimeout(() => {
                const slidersRetry = document.querySelectorAll('.mirror-slider');
                if (slidersRetry.length > 0) {
                    initMirrorSliders();
                }
            }, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }

    // Также инициализируем при загрузке контента из CMS
    // Слушаем событие, которое может быть отправлено после загрузки контента
    window.addEventListener('cmsContentLoaded', () => {
        setTimeout(initMirrorSliders, 100);
    });

    // Экспорт для использования в других скриптах
    window.MirrorSlider = MirrorSlider;
    window.initMirrorSliders = initMirrorSliders;
})();

