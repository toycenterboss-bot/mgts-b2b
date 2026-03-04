/**
 * CRM Cards - Компонент карточек CRM систем
 * 
 * Функциональность:
 * - Отображение карточек с логотипами CRM систем
 * - Возможность добавления hover эффектов
 * - Обработка кликов на карточки (если требуется)
 */

(function() {
    'use strict';

    class CrmCards {
        constructor(container) {
            this.container = container;
            this.cards = container.querySelectorAll('.crm-cards__card');
            
            // Проверяем наличие элементов
            if (this.cards.length === 0) {
                console.log('[CRM Cards] No cards found');
                return;
            }
            
            this.init();
        }

        init() {
            // Добавляем обработчики событий для карточек (если требуется интерактивность)
            this.attachEventListeners();
            
            console.log(`[CRM Cards] Инициализированы карточки CRM: ${this.cards.length}`);
        }

        attachEventListeners() {
            this.cards.forEach((card, index) => {
                // Добавляем hover эффекты (если требуется)
                card.addEventListener('mouseenter', () => {
                    card.classList.add('hovered');
                });
                
                card.addEventListener('mouseleave', () => {
                    card.classList.remove('hovered');
                });
                
                // Обработчик клика (если требуется переход на страницу CRM)
                const link = card.querySelector('a[href]');
                if (link) {
                    card.addEventListener('click', (e) => {
                        // Если клик не по самой ссылке, переходим по ссылке
                        if (e.target !== link && !link.contains(e.target)) {
                            e.preventDefault();
                            window.location.href = link.href;
                        }
                    });
                }
            });
        }

        destroy() {
            // Удаляем обработчики событий
            this.cards.forEach((card) => {
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
            });
        }
    }

    // Инициализация всех секций CRM карточек на странице
    function initCrmCards() {
        const sections = document.querySelectorAll('.crm-cards');
        
        if (sections.length === 0) {
            console.log('[CRM Cards] Секции CRM карточек не найдены на странице');
            return;
        }
        
        console.log(`[CRM Cards] Найдено секций: ${sections.length}`);
        
        const sectionInstances = [];
        
        sections.forEach((section, index) => {
            // Пропускаем уже инициализированные
            if (section.dataset.initialized === 'true') {
                console.log(`[CRM Cards] Секция ${index + 1} уже инициализирована, пропускаем`);
                return;
            }
            
            try {
                const instance = new CrmCards(section);
                section.dataset.initialized = 'true'; // Помечаем как инициализированную
                sectionInstances.push(instance);
                console.log(`[CRM Cards] Секция ${index + 1} инициализирована успешно`);
            } catch (error) {
                console.error(`[CRM Cards] Ошибка при инициализации секции ${index + 1}:`, error);
            }
        });
        
        // Сохраняем экземпляры для возможного использования
        if (!window.crmCards) {
            window.crmCards = [];
        }
        window.crmCards.push(...sectionInstances);
        
        if (sectionInstances.length > 0) {
            console.log(`[CRM Cards] Инициализировано новых секций: ${sectionInstances.length}`);
        }
    }

    // Инициализация при загрузке DOM
    function initWhenReady() {
        // Проверяем наличие секций (может быть загружена из CMS)
        const sections = document.querySelectorAll('.crm-cards');
        if (sections.length > 0) {
            initCrmCards();
        } else {
            // Если секция еще не загружена, ждем немного и проверяем снова
            setTimeout(() => {
                const sectionsRetry = document.querySelectorAll('.crm-cards');
                if (sectionsRetry.length > 0) {
                    initCrmCards();
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
        setTimeout(initCrmCards, 100);
    });
    window.addEventListener('cms-content-loaded', () => {
        setTimeout(initCrmCards, 100);
    });

    // Экспорт для использования в других скриптах
    window.CrmCards = CrmCards;
    window.initCrmCards = initCrmCards;
})();
