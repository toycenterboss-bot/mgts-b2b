/**
 * Mobile App Section - Компонент секции мобильного приложения
 * 
 * Функциональность:
 * - Переключение изображений приложения по клику на SVG элементы (если требуется)
 * - Инициализация QR-кодов для скачивания приложения
 * - Обработка кликов на кнопки загрузки
 */

(function() {
    'use strict';

    class MobileAppSection {
        constructor(container) {
            this.container = container;
            this.imageSwitchers = container.querySelectorAll('.image-switcher, [data-switch-image]');
            this.appImages = container.querySelectorAll('.mobile-app-section__image, .mobile-app-section img');
            this.currentImageIndex = 0;
            
            // Проверяем наличие элементов
            if (this.imageSwitchers.length === 0) {
                console.log('[Mobile App Section] No image switchers found - static content');
                return;
            }
            
            this.init();
        }

        init() {
            // Инициализируем переключатели изображений, если они есть
            if (this.imageSwitchers.length > 0 && this.appImages.length > 1) {
                this.initImageSwitchers();
            }
            
            console.log(`[Mobile App Section] Инициализирована секция мобильного приложения`);
        }

        initImageSwitchers() {
            this.imageSwitchers.forEach((switcher, index) => {
                switcher.setAttribute('role', 'button');
                switcher.setAttribute('tabindex', '0');
                switcher.setAttribute('aria-label', `Показать изображение ${index + 1}`);
                
                // Обработчик клика
                switcher.addEventListener('click', () => {
                    this.switchImage(index);
                });
                
                // Поддержка клавиатуры
                switcher.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.switchImage(index);
                    }
                });
            });
        }

        switchImage(index) {
            if (index < 0 || index >= this.appImages.length) {
                return;
            }
            
            // Скрываем все изображения
            this.appImages.forEach((img, i) => {
                img.classList.remove('active');
                img.style.display = i === index ? '' : 'none';
            });
            
            // Показываем выбранное изображение
            if (this.appImages[index]) {
                this.appImages[index].classList.add('active');
                this.appImages[index].style.display = '';
            }
            
            // Обновляем активное состояние переключателей
            this.imageSwitchers.forEach((switcher, i) => {
                switcher.classList.toggle('active', i === index);
            });
            
            this.currentImageIndex = index;
            
            console.log(`[Mobile App Section] Переключено на изображение ${index + 1}`);
        }

        destroy() {
            // Удаляем обработчики событий
            this.imageSwitchers.forEach((switcher) => {
                const newSwitcher = switcher.cloneNode(true);
                switcher.parentNode.replaceChild(newSwitcher, switcher);
            });
        }
    }

    // Инициализация всех секций мобильного приложения на странице
    function initMobileAppSections() {
        const sections = document.querySelectorAll('.mobile-app-section');
        
        if (sections.length === 0) {
            console.log('[Mobile App Section] Секции мобильного приложения не найдены на странице');
            return;
        }
        
        console.log(`[Mobile App Section] Найдено секций: ${sections.length}`);
        
        const sectionInstances = [];
        
        sections.forEach((section, index) => {
            // Пропускаем уже инициализированные
            if (section.dataset.initialized === 'true') {
                console.log(`[Mobile App Section] Секция ${index + 1} уже инициализирована, пропускаем`);
                return;
            }
            
            try {
                const instance = new MobileAppSection(section);
                section.dataset.initialized = 'true'; // Помечаем как инициализированную
                sectionInstances.push(instance);
                console.log(`[Mobile App Section] Секция ${index + 1} инициализирована успешно`);
            } catch (error) {
                console.error(`[Mobile App Section] Ошибка при инициализации секции ${index + 1}:`, error);
            }
        });
        
        // Сохраняем экземпляры для возможного использования
        if (!window.mobileAppSections) {
            window.mobileAppSections = [];
        }
        window.mobileAppSections.push(...sectionInstances);
        
        if (sectionInstances.length > 0) {
            console.log(`[Mobile App Section] Инициализировано новых секций: ${sectionInstances.length}`);
        }
    }

    // Инициализация при загрузке DOM
    function initWhenReady() {
        // Проверяем наличие секций (может быть загружена из CMS)
        const sections = document.querySelectorAll('.mobile-app-section');
        if (sections.length > 0) {
            initMobileAppSections();
        } else {
            // Если секция еще не загружена, ждем немного и проверяем снова
            setTimeout(() => {
                const sectionsRetry = document.querySelectorAll('.mobile-app-section');
                if (sectionsRetry.length > 0) {
                    initMobileAppSections();
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
    window.addEventListener('cmsContentLoaded', () => {
        setTimeout(initMobileAppSections, 100);
    });
    window.addEventListener('cms-content-loaded', () => {
        setTimeout(initMobileAppSections, 100);
    });

    // Экспорт для использования в других скриптах
    window.MobileAppSection = MobileAppSection;
    window.initMobileAppSections = initMobileAppSections;
})();
