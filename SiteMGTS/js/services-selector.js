/**
 * Services Selector - Управление переключением карточек услуг
 * Улучшает интерактивность секции "Наши услуги"
 */

(function() {
    'use strict';

    function initServicesSelector() {
        const selectorItems = document.querySelectorAll('.selector-item');
        // Ищем карточки по обоим селекторам: card-our-services и card--info
        const serviceCards = document.querySelectorAll('.card-our-services, .card--info');
        
        if (selectorItems.length === 0) {
            return;
        }

        console.log('[Services Selector] Found', selectorItems.length, 'selector items and', serviceCards.length, 'service cards');

        // Функция для показа карточки
        function showCard(card) {
            if (!card) return;
            
            // Убедиться, что карточка видима
            card.style.setProperty('display', 'block', 'important');
            card.style.setProperty('opacity', '1', 'important');
            card.style.setProperty('visibility', 'visible', 'important');
            card.style.setProperty('max-height', 'none', 'important');
            
            // Если карточка внутри card-collapse, показать и родителя
            const cardCollapse = card.closest('.card-collapse');
            if (cardCollapse) {
                cardCollapse.style.setProperty('display', 'block', 'important');
                cardCollapse.style.setProperty('opacity', '1', 'important');
                cardCollapse.style.setProperty('visibility', 'visible', 'important');
            }
            
            // Добавить класс show для анимации
            card.classList.add('show');
            
            console.log('[Services Selector] Showing card:', card.querySelector('.card-our-services__content-title, h3')?.textContent);
        }

        // Функция для скрытия карточки
        function hideCard(card) {
            if (!card) return;
            
            card.classList.remove('show');
            card.style.setProperty('display', 'none', 'important');
            
            // Если карточка внутри card-collapse, скрыть и родителя
            const cardCollapse = card.closest('.card-collapse');
            if (cardCollapse) {
                cardCollapse.style.setProperty('display', 'none', 'important');
            }
            
            console.log('[Services Selector] Hiding card');
        }

        // Функция для активации селектора
        function activateSelector(selectorItem) {
            // Убрать active со всех селекторов
            selectorItems.forEach(item => {
                item.classList.remove('active');
            });
            
            // Добавить active к выбранному
            selectorItem.classList.add('active');
            
            console.log('[Services Selector] Activated selector:', selectorItem.querySelector('.selector-item__text')?.textContent);
        }

        // Обработчик клика на селектор
        selectorItems.forEach((selectorItem, index) => {
            selectorItem.addEventListener('click', function() {
                // Активировать селектор
                activateSelector(selectorItem);
                
                // Найти соответствующую карточку
                // Предполагаем, что порядок селекторов соответствует порядку карточек
                const card = serviceCards[index];
                
                if (card) {
                    // Скрыть все карточки
                    serviceCards.forEach(c => hideCard(c));
                    
                    // Показать выбранную карточку
                    setTimeout(() => {
                        showCard(card);
                    }, 100);
                } else {
                    console.warn('[Services Selector] No card found for selector index:', index);
                    // Если карточка не найдена, показать все карточки
                    serviceCards.forEach(c => showCard(c));
                }
            });
            
            // Добавить поддержку клавиатуры
            selectorItem.setAttribute('tabindex', '0');
            selectorItem.setAttribute('role', 'button');
            selectorItem.setAttribute('aria-label', selectorItem.querySelector('.selector-item__text')?.textContent || 'Выбрать услугу');
            
            selectorItem.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectorItem.click();
                }
            });
        });

        // Сделать все селекторы активными (синими) по умолчанию
        selectorItems.forEach(item => {
            item.classList.add('active');
        });
        
        // Показать все карточки по умолчанию (без переключения)
        serviceCards.forEach(card => showCard(card));
        
        // Если пользователь кликнет на селектор, тогда будет переключение
        // Но по умолчанию все карточки видны и все селекторы активны

        console.log('[Services Selector] Initialized successfully');
    }

    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServicesSelector);
    } else {
        initServicesSelector();
    }

    // Инициализация после загрузки контента из CMS
    if (typeof window !== 'undefined') {
        window.addEventListener('cms-content-loaded', function() {
            setTimeout(initServicesSelector, 500);
        });
    }
})();

