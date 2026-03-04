/**
 * CMS Processors - Модульная система обработки контента из Strapi
 * Каждый тип контента обрабатывается отдельным модулем
 */

(function() {
    'use strict';

    /**
     * Базовый класс для всех процессоров
     */
    class BaseProcessor {
        constructor() {
            this.type = 'base';
        }

        /**
         * Проверяет, может ли процессор обработать данный элемент
         * @param {HTMLElement} element - Элемент для проверки
         * @returns {boolean}
         */
        canProcess(element) {
            return false;
        }

        /**
         * Обрабатывает элемент
         * @param {HTMLElement} element - Элемент для обработки
         * @param {Object} context - Контекст обработки
         * @returns {HTMLElement|null} - Обработанный элемент или null
         */
        process(element, context) {
            return element;
        }

        /**
         * Нормализует элемент (удаляет лишние классы, стили и т.д.)
         * @param {HTMLElement} element - Элемент для нормализации
         */
        normalize(element) {
            // Удалить классы анимации
            element.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
            element.querySelectorAll('*').forEach(el => {
                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
            });

            // Установить видимость
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('visibility', 'visible', 'important');
            element.style.setProperty('display', '', 'important');
        }
    }

    /**
     * Процессор для hero-content (удаляет его)
     */
    class HeroContentProcessor extends BaseProcessor {
        constructor() {
            super();
            this.type = 'hero-content';
        }

        canProcess(element) {
            return element.classList.contains('hero-content') || 
                   element.querySelector('.hero-content') !== null;
        }

        process(element, context) {
            const heroContent = element.classList.contains('hero-content') 
                ? element 
                : element.querySelector('.hero-content');
            
            if (heroContent) {
                console.log('[CMS Processor] Removing hero-content');
                heroContent.remove();
            }
            
            return null; // Hero content не возвращается
        }
    }

    /**
     * Процессор для специальных секций (service-*)
     */
    class SpecialSectionProcessor extends BaseProcessor {
        constructor() {
            super();
            this.type = 'special-section';
            this.specialClasses = [
                'service-tariffs',
                'service-faq',
                'service-features',
                'service-order',
                'service-specs',
                'service-cases',
                'service-howto'
            ];
        }

        canProcess(element) {
            if (element.tagName !== 'SECTION') return false;
            
            return this.specialClasses.some(cls => element.classList.contains(cls));
        }

        process(element, context) {
            const sectionClass = this.specialClasses.find(cls => element.classList.contains(cls));
            
            if (!sectionClass) {
                return null;
            }

            console.log(`[CMS Processor] Processing special section: ${sectionClass}`);

            // Проверить, что секция не пустая
            const sectionContent = element.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
            const hasContent = sectionContent.length > 50 && 
                              (element.querySelector('form, .order-form, h2, h3, p, .card, .grid') !== null);

            if (!hasContent) {
                console.warn(`[CMS Processor] Special section "${sectionClass}" is empty, skipping`);
                return null;
            }

            // Удалить существующие дубликаты
            const existingSections = document.querySelectorAll(`section.${sectionClass}`);
            if (existingSections.length > 0) {
                console.log(`[CMS Processor] Removing ${existingSections.length} duplicate special section(s): ${sectionClass}`);
                existingSections.forEach(s => s.remove());
            }

            // Клонировать и нормализовать
            const cloned = element.cloneNode(true);
            cloned.setAttribute('data-cms-processed', 'true');
            
            // КРИТИЧНО: Убедиться, что секция имеет правильные классы
            // Добавить класс 'section' если его нет
            if (!cloned.classList.contains('section')) {
                cloned.classList.add('section');
            }
            // Убедиться, что специальный класс сохранен
            if (!cloned.classList.contains(sectionClass)) {
                cloned.classList.add(sectionClass);
                console.warn(`[CMS Processor] ⚠️ Special class "${sectionClass}" was missing, added it back`);
            }
            
            this.normalize(cloned);
            
            // Логирование для отладки
            console.log(`[CMS Processor] Processed special section "${sectionClass}" with classes:`, cloned.className);

            return cloned;
        }
    }

    /**
     * Процессор для обычных секций
     */
    class RegularSectionProcessor extends BaseProcessor {
        constructor() {
            super();
            this.type = 'regular-section';
        }

        canProcess(element) {
            if (element.tagName !== 'SECTION') return false;
            
            // Не обрабатываем специальные секции
            const specialClasses = [
                'service-tariffs', 'service-faq', 'service-features',
                'service-order', 'service-specs', 'service-cases', 'service-howto'
            ];
            
            if (specialClasses.some(cls => element.classList.contains(cls))) {
                return false;
            }

            // Не обрабатываем секции с формами заказа
            const hasOrderForm = element.querySelector('.order-form, form.order-form, [class*="order-form"]') !== null;
            if (hasOrderForm) {
                return false;
            }

            // Принимаем секцию, если она имеет класс section или main-section
            // ИЛИ если это просто section без специальных классов (может быть первая секция)
            const hasSectionClass = element.classList.contains('section') || 
                                   element.classList.contains('main-section');
            
            // Если нет класса section, но это секция и не специальная - тоже принимаем
            if (!hasSectionClass && element.tagName === 'SECTION') {
                // Проверить, что это не специальная секция
                const hasSpecialClass = specialClasses.some(cls => element.classList.contains(cls));
                if (!hasSpecialClass && !hasOrderForm) {
                    return true; // Принимаем секцию без класса section, если она не специальная
                }
            }
            
            return hasSectionClass;
        }

        process(element, context) {
            console.log('[CMS Processor] Processing regular section');

            // Найти заголовок секции
            const titleElement = element.querySelector('.title-promo-short, h2, h1, .section-title');
            const sectionTitle = titleElement ? titleElement.textContent.trim() : '';

            // Нормализовать классы
            const sectionClasses = element.className.split(' ').filter(cls => {
                return cls !== 'main-section' && cls !== 'home-section-container';
            });
            
            if (!sectionClasses.includes('section')) {
                sectionClasses.unshift('section');
            }
            
            element.className = sectionClasses.join(' ');

            // Удалить inline стили
            element.removeAttribute('style');
            element.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

            // Удалить неправильные классы из заголовков
            element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                if (heading.classList.contains('section') && 
                    !heading.classList.contains('section-title') && 
                    !heading.classList.contains('section-subtitle')) {
                    heading.classList.remove('section');
                }
                heading.classList.remove('main-section', 'home-section-container');
            });

            return {
                element: element,
                title: sectionTitle
            };
        }
    }

    /**
     * Процессор для контента без секций (просто в container)
     */
    class ContainerContentProcessor extends BaseProcessor {
        constructor() {
            super();
            this.type = 'container-content';
        }

        canProcess(element) {
            // Проверяем, есть ли контент в container, но нет секций
            const container = element.querySelector('.container');
            if (!container) return false;

            const hasSections = container.querySelectorAll('section').length > 0;
            const hasContent = container.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length > 50;
            
            return hasContent && !hasSections;
        }

        process(element, context) {
            console.log('[CMS Processor] Processing container content without sections');
            
            const container = element.querySelector('.container');
            if (!container) return null;

            // Обернуть контент в секцию
            const wrapperSection = document.createElement('section');
            wrapperSection.className = 'section';
            
            while (container.firstChild) {
                wrapperSection.appendChild(container.firstChild);
            }
            
            return wrapperSection;
        }
    }

    /**
     * Менеджер процессоров
     */
    class ProcessorManager {
        constructor() {
            this.processors = [
                new HeroContentProcessor(),
                new SpecialSectionProcessor(),
                new RegularSectionProcessor(),
                new ContainerContentProcessor()
            ];
        }

        /**
         * Обрабатывает элемент через подходящий процессор
         * @param {HTMLElement} element - Элемент для обработки
         * @param {Object} context - Контекст обработки
         * @returns {HTMLElement|null} - Обработанный элемент или null
         */
        process(element, context = {}) {
            for (const processor of this.processors) {
                if (processor.canProcess(element)) {
                    return processor.process(element, context);
                }
            }
            
            return null;
        }

        /**
         * Разделяет элементы на специальные и обычные
         * @param {NodeList|Array} elements - Элементы для разделения
         * @returns {Object} - Объект с specialSections и regularSections
         */
        separateSections(elements) {
            const specialSections = [];
            const regularSections = [];
            
            Array.from(elements).forEach(element => {
                if (new SpecialSectionProcessor().canProcess(element)) {
                    specialSections.push(element);
                } else if (new RegularSectionProcessor().canProcess(element)) {
                    regularSections.push(element);
                }
            });
            
            return {
                specialSections,
                regularSections
            };
        }
    }

    // Экспорт
    window.CMSProcessors = {
        ProcessorManager,
        BaseProcessor,
        HeroContentProcessor,
        SpecialSectionProcessor,
        RegularSectionProcessor,
        ContainerContentProcessor
    };

})();

