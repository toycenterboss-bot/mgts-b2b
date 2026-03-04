/**
 * Partnership Slider - Улучшение секции "Зарабатывайте в партнерстве"
 * Добавляет навигационные стрелки и визуальные индикаторы скролла
 */

(function() {
    'use strict';

    // Делаем функцию доступной глобально для принудительной инициализации
    window.initPartnershipSlider = function initPartnershipSlider() {
        // Ищем секцию партнерства
        const partnershipSection = document.querySelector('.section-gray-horizontal-slider');
        if (!partnershipSection) {
            console.log('[Partnership Slider] Partnership section not found, skipping initialization');
            return;
        }

        // Ищем контейнер карточек (может быть в разных местах)
        let cardsContainer = partnershipSection.querySelector('.cards-container');
        if (!cardsContainer) {
            // Если нет .cards-container, ищем .gray-container или любой контейнер со скроллом
            cardsContainer = partnershipSection.querySelector('.gray-container, [class*="container"]');
        }
        
        if (!cardsContainer) {
            console.log('[Partnership Slider] Cards container not found, skipping initialization');
            return;
        }

        // Ищем контейнер со скроллом
        let cardsScrollContainer = cardsContainer.querySelector('.cards-scroll-container');
        if (!cardsScrollContainer) {
            // Если нет .cards-scroll-container, используем сам cardsContainer или ищем все карточки напрямую
            cardsScrollContainer = cardsContainer;
        }

        // Проверяем, не инициализирован ли уже слайдер
        // Но если карточек мало, переинициализируем (возможно, карточки загрузились позже)
        const currentCardsCount = partnershipSection.querySelectorAll('.card-box, .card, .card--navigation, [class*="card"]').length;
        if (cardsContainer.dataset.sliderInitialized === 'true' && currentCardsCount > 1) {
            console.log('[Partnership Slider] Already initialized with', currentCardsCount, 'cards, skipping');
            return;
        }

        cardsContainer.dataset.sliderInitialized = 'true';
        console.log('[Partnership Slider] Initializing...');
        
        // Ищем карточки в секции партнерства (только нужные, не все с "card" в классе)
        // Ищем сначала по специфичным классам, потом по структуре
        let allCardsInSection = partnershipSection.querySelectorAll('.card-box');
        if (allCardsInSection.length === 0) {
            // Если нет .card-box, ищем .card или .card--navigation в контейнере карточек
            allCardsInSection = cardsContainer ? cardsContainer.querySelectorAll('.card, .card--navigation') : partnershipSection.querySelectorAll('.card, .card--navigation');
        }
        if (allCardsInSection.length === 0) {
            // Последняя попытка - ищем любые элементы с классом card в контейнере
            allCardsInSection = cardsContainer ? cardsContainer.querySelectorAll('[class*="card"]') : [];
        }
        
        console.log('[Partnership Slider] Found', allCardsInSection.length, 'cards in entire section');
        
        if (allCardsInSection.length === 0) {
            console.log('[Partnership Slider] No cards found, skipping initialization');
            return;
        }

        // Если карточки не находятся в cards-scroll-container, создаем или используем существующий контейнер
        if (cardsScrollContainer === cardsContainer) {
            // Если cards-scroll-container не найден, создаем его или используем cardsContainer
            console.log('[Partnership Slider] Using cardsContainer as scroll container');
        }

        // Принудительно устанавливаем горизонтальное расположение
        cardsContainer.style.setProperty('display', 'block', 'important');
        cardsContainer.style.setProperty('overflow-x', 'auto', 'important');
        cardsContainer.style.setProperty('overflow-y', 'hidden', 'important');
        cardsContainer.style.setProperty('width', '100%', 'important');
        cardsContainer.style.setProperty('white-space', 'normal', 'important');

        // Убеждаемся, что cardsScrollContainer - это flex контейнер
        // Применяем стили через cssText для максимальной агрессивности
        cardsScrollContainer.style.cssText = `
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: max-content !important;
            min-width: max-content !important;
            flex-flow: row nowrap !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 24px !important;
        `;
        
        console.log('[Partnership Slider] Applied flex styles to scroll container');
        console.log('[Partnership Slider] Scroll container computed display:', window.getComputedStyle(cardsScrollContainer).display);
        console.log('[Partnership Slider] Scroll container computed flex-direction:', window.getComputedStyle(cardsScrollContainer).flexDirection);
        
        // КРИТИЧНО: Находим и удаляем обертку grid, если она есть
        // Структура: .grid > .grid-item > .card.card--navigation (все 3 карточки в одном grid-item!)
        const gridWrapper = cardsScrollContainer.querySelector('.grid.grid-cols-3, .grid');
        if (gridWrapper) {
            console.log('[Partnership Slider] Found grid wrapper, extracting cards from it...');
            
            // Находим все grid-item внутри grid
            const gridItems = gridWrapper.querySelectorAll('.grid-item');
            console.log('[Partnership Slider] Found', gridItems.length, 'grid-items');
            
            // Извлекаем карточки из каждого grid-item
            gridItems.forEach((gridItem, itemIndex) => {
                // Находим все карточки внутри этого grid-item
                const cardsInItem = gridItem.querySelectorAll('.card.card--navigation, .card--navigation.card--hoverable, .card');
                console.log(`[Partnership Slider] Grid-item ${itemIndex} contains`, cardsInItem.length, 'cards');
                
                // Извлекаем каждую карточку
                cardsInItem.forEach((card, cardIndex) => {
                    if (card.classList.contains('card')) {
                        try {
                            // Перемещаем карточку напрямую в cardsScrollContainer
                            cardsScrollContainer.appendChild(card);
                            console.log(`[Partnership Slider] ✓ Extracted card ${cardIndex} from grid-item ${itemIndex} to scroll container`);
                        } catch (error) {
                            console.error(`[Partnership Slider] ✗ Error extracting card ${cardIndex} from grid-item ${itemIndex}:`, error);
                        }
                    }
                });
            });
            
            // Также ищем карточки напрямую в grid (на случай, если они не в grid-item)
            const directCardsInGrid = Array.from(gridWrapper.children).filter(child => 
                child.classList.contains('card') || child.classList.contains('card--navigation')
            );
            console.log('[Partnership Slider] Found', directCardsInGrid.length, 'direct cards in grid');
            
            directCardsInGrid.forEach((card, index) => {
                try {
                    cardsScrollContainer.appendChild(card);
                    console.log(`[Partnership Slider] ✓ Extracted direct card ${index} from grid to scroll container`);
                } catch (error) {
                    console.error(`[Partnership Slider] ✗ Error extracting direct card ${index}:`, error);
                }
            });
            
            // Удаляем grid wrapper после небольшой задержки
            setTimeout(() => {
                const remainingChildren = Array.from(gridWrapper.children).filter(child => 
                    child.children.length > 0 || child.textContent.trim().length > 0
                );
                if (remainingChildren.length === 0) {
                    gridWrapper.remove();
                    console.log('[Partnership Slider] Removed empty grid wrapper');
                } else {
                    // Если остались элементы (например, пустые grid-item), скрываем grid wrapper
                    gridWrapper.style.setProperty('display', 'none', 'important');
                    console.log('[Partnership Slider] Hid grid wrapper (still has', remainingChildren.length, 'children)');
                }
            }, 100);
        }
        
        // Убеждаемся, что все карточки теперь в правильном контейнере
        // Ищем именно .card, не .grid-item
        const cardsInContainer = Array.from(cardsScrollContainer.children).filter(child => 
            !child.classList.contains('slider-nav') && 
            !child.classList.contains('grid') &&
            !child.classList.contains('grid-item') &&
            (child.classList.contains('card') || child.classList.contains('card--navigation') || child.classList.contains('card-box'))
        );
        console.log('[Partnership Slider] Cards now directly in scroll container:', cardsInContainer.length);
        
        // Если карточек все еще нет, ищем их в секции и перемещаем
        if (cardsInContainer.length === 0) {
            console.log('[Partnership Slider] No cards in container, searching in section...');
            const sectionCards = partnershipSection.querySelectorAll('.card.card--navigation, .card--navigation.card--hoverable, .card.card--hoverable');
            console.log('[Partnership Slider] Found', sectionCards.length, 'cards in section');
            
            sectionCards.forEach((card, index) => {
                if (card.parentElement !== cardsScrollContainer) {
                    try {
                        cardsScrollContainer.appendChild(card);
                        console.log(`[Partnership Slider] ✓ Moved card ${index} from section to scroll container`);
                    } catch (error) {
                        console.error(`[Partnership Slider] ✗ Error moving card ${index}:`, error);
                    }
                }
            });
        }
        
        // Принудительно устанавливаем стили для ВСЕХ карточек
        // Используем прямых дочерних элементов контейнера (они уже должны быть там после перемещения)
        console.log('[Partnership Slider] Looking for cards in scroll container...');
        const directChildren = Array.from(cardsScrollContainer.children).filter(child => !child.classList.contains('slider-nav'));
        
        // Также ищем карточки через селектор (но только прямых детей контейнера)
        const cardsAfterMove = Array.from(directChildren).filter(child => 
            child.classList.contains('card-box') || 
            child.classList.contains('card') || 
            child.classList.contains('card--navigation')
        );
        
        console.log('[Partnership Slider] Found', cardsAfterMove.length, 'cards via filter');
        console.log('[Partnership Slider] Found', directChildren.length, 'direct children total');
        
        // Используем найденные карточки или все прямые дети (кроме навигации)
        const cardsToStyle = cardsAfterMove.length > 0 ? cardsAfterMove : directChildren;
        console.log('[Partnership Slider] Will apply styles to', cardsToStyle.length, 'elements');
        
        // ВАЖНО: Применяем стили с задержкой, чтобы DOM успел обновиться после перемещения
        setTimeout(() => {
            // Применяем стили ко всем найденным элементам
            cardsToStyle.forEach((card, index) => {
                console.log(`[Partnership Slider] Processing element ${index}:`, card.tagName, card.className);
                
                // Удаляем все возможные классы, которые могут мешать
                card.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out');
                
                // Принудительно устанавливаем стили через cssText (более агрессивно)
                try {
                    // Устанавливаем стили через setProperty для каждого свойства отдельно
                    card.style.setProperty('display', 'flex', 'important');
                    card.style.setProperty('flex-direction', 'column', 'important');
                    card.style.setProperty('flex-shrink', '0', 'important');
                    card.style.setProperty('flex-grow', '0', 'important');
                    card.style.setProperty('flex-basis', '300px', 'important');
                    card.style.setProperty('min-width', '300px', 'important');
                    card.style.setProperty('max-width', '350px', 'important');
                    card.style.setProperty('width', '300px', 'important');
                    card.style.setProperty('float', 'none', 'important');
                    card.style.setProperty('clear', 'none', 'important');
                    card.style.setProperty('margin', '0', 'important');
                    card.style.setProperty('margin-right', '24px', 'important');
                    card.style.setProperty('position', 'relative', 'important');
                    
                    console.log(`[Partnership Slider] ✓ Applied styles to element ${index}:`, card.className, card.offsetWidth, 'x', card.offsetHeight);
                } catch (error) {
                    console.error(`[Partnership Slider] ✗ Error applying styles to element ${index}:`, error);
                }
            });
            
            // Принудительно пересчитываем размеры контейнера
            const scrollWidth = cardsScrollContainer.scrollWidth;
            const offsetWidth = cardsScrollContainer.offsetWidth;
            const computedDisplay = window.getComputedStyle(cardsScrollContainer).display;
            const computedFlexDirection = window.getComputedStyle(cardsScrollContainer).flexDirection;
            
            console.log('[Partnership Slider] After styles - scroll width:', scrollWidth, 'offset width:', offsetWidth);
            console.log('[Partnership Slider] Computed display:', computedDisplay, 'flex-direction:', computedFlexDirection);
            
            // Проверяем, действительно ли карточки в контейнере
            const finalChildren = Array.from(cardsScrollContainer.children).filter(c => !c.classList.contains('slider-nav'));
            console.log('[Partnership Slider] Final children count:', finalChildren.length);
            finalChildren.forEach((child, i) => {
                console.log(`[Partnership Slider] Final child ${i}:`, child.tagName, child.className, 'width:', child.offsetWidth, 'parent:', child.parentElement === cardsScrollContainer);
            });
            
            // Если ширина все еще мала, принудительно устанавливаем
            if (scrollWidth <= 400 && cardsToStyle.length > 1) {
                const calculatedWidth = 300 * cardsToStyle.length + 24 * (cardsToStyle.length - 1);
                cardsScrollContainer.style.setProperty('width', `${calculatedWidth}px`, 'important');
                console.log('[Partnership Slider] Forced container width to:', calculatedWidth);
            }
            
            // Дополнительная проверка: если flex-direction не row, принудительно исправляем
            if (computedFlexDirection !== 'row') {
                console.log('[Partnership Slider] WARNING: flex-direction is not row, forcing...');
                cardsScrollContainer.style.setProperty('flex-direction', 'row', 'important');
                cardsScrollContainer.style.setProperty('display', 'flex', 'important');
            }
        }, 100);
        
        // Принудительно обновляем размеры контейнера
        setTimeout(() => {
            const scrollWidth = cardsScrollContainer.scrollWidth;
            const offsetWidth = cardsScrollContainer.offsetWidth;
            const containerWidth = cardsContainer.offsetWidth;
            console.log('[Partnership Slider] Final - scroll width:', scrollWidth, 'offset width:', offsetWidth, 'container width:', containerWidth);
            
            // Если ширина контейнера все еще мала, принудительно устанавливаем
            if (scrollWidth <= 300 && cardsAfterMove.length > 1) {
                console.log('[Partnership Slider] Forcing container width...');
                cardsScrollContainer.style.setProperty('width', `${300 * cardsAfterMove.length + 24 * (cardsAfterMove.length - 1)}px`, 'important');
            }
        }, 100);
        

        console.log('[Partnership Slider] Applied horizontal layout to', allCards.length, 'cards and', directChildren.length, 'direct children');
        console.log('[Partnership Slider] Cards container width:', cardsScrollContainer.offsetWidth);
        console.log('[Partnership Slider] Cards container scroll width:', cardsScrollContainer.scrollWidth);
        console.log('[Partnership Slider] Cards container computed display:', window.getComputedStyle(cardsScrollContainer).display);
        console.log('[Partnership Slider] Cards container computed flex-direction:', window.getComputedStyle(cardsScrollContainer).flexDirection);
        
        // Принудительно пересчитываем размеры
        setTimeout(() => {
            console.log('[Partnership Slider] After timeout - container width:', cardsScrollContainer.offsetWidth);
            console.log('[Partnership Slider] After timeout - container scroll width:', cardsScrollContainer.scrollWidth);
        }, 100);

        // Создаем навигационные стрелки
        function createNavigationArrows() {
            // Проверяем, есть ли уже стрелки
            if (cardsContainer.querySelector('.slider-nav')) {
                return;
            }

            const navContainer = document.createElement('div');
            navContainer.className = 'slider-nav';
            navContainer.innerHTML = `
                <button class="slider-nav__btn slider-nav__btn--prev" aria-label="Предыдущие карточки">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="slider-nav__btn slider-nav__btn--next" aria-label="Следующие карточки">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;

            cardsContainer.style.position = 'relative';
            cardsContainer.appendChild(navContainer);

            // Обработчики для стрелок
            const prevBtn = navContainer.querySelector('.slider-nav__btn--prev');
            const nextBtn = navContainer.querySelector('.slider-nav__btn--next');

            prevBtn.addEventListener('click', () => {
                scrollCards(-400);
            });

            nextBtn.addEventListener('click', () => {
                scrollCards(400);
            });

            // Обновляем видимость стрелок
            updateArrowVisibility();
        }

        // Функция прокрутки
        function scrollCards(delta) {
            const currentScroll = cardsContainer.scrollLeft;
            cardsContainer.scrollTo({
                left: currentScroll + delta,
                behavior: 'smooth'
            });
        }

        // Обновление видимости стрелок и градиентов
        function updateArrowVisibility() {
            const prevBtn = cardsContainer.querySelector('.slider-nav__btn--prev');
            const nextBtn = cardsContainer.querySelector('.slider-nav__btn--next');

            if (!prevBtn || !nextBtn) {
                return;
            }

            const scrollLeft = cardsContainer.scrollLeft;
            const scrollWidth = cardsContainer.scrollWidth;
            const clientWidth = cardsContainer.clientWidth;
            const maxScroll = scrollWidth - clientWidth;

            // Обновляем видимость стрелок
            prevBtn.style.opacity = scrollLeft > 10 ? '1' : '0.3';
            prevBtn.style.pointerEvents = scrollLeft > 10 ? 'auto' : 'none';

            nextBtn.style.opacity = scrollLeft < maxScroll - 10 ? '1' : '0.3';
            nextBtn.style.pointerEvents = scrollLeft < maxScroll - 10 ? 'auto' : 'none';

            // Обновляем градиенты
            if (scrollLeft > 10) {
                cardsContainer.classList.add('scrollable-left');
            } else {
                cardsContainer.classList.remove('scrollable-left');
            }

            if (scrollLeft < maxScroll - 10) {
                cardsContainer.classList.add('scrollable-right');
            } else {
                cardsContainer.classList.remove('scrollable-right');
            }
        }

        // Создаем стрелки
        createNavigationArrows();

        // Обновляем видимость при скролле
        cardsContainer.addEventListener('scroll', updateArrowVisibility);

        // Обновляем при изменении размера окна
        window.addEventListener('resize', updateArrowVisibility);

        // Начальная проверка
        setTimeout(updateArrowVisibility, 100);

        console.log('[Partnership Slider] Initialized successfully');
    }

    // Инициализация при загрузке DOM
    function tryInit() {
        const cardsContainer = document.querySelector('.section-gray-horizontal-slider .cards-container');
        if (cardsContainer) {
            initPartnershipSlider();
        } else {
            // Если секция еще не загружена, попробуем еще раз через небольшую задержку
            setTimeout(tryInit, 200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(tryInit, 100);
        });
    } else {
        setTimeout(tryInit, 100);
    }

    // Инициализация после загрузки контента из CMS
    if (typeof window !== 'undefined') {
        // Слушаем оба варианта названия события (на случай разных версий)
        window.addEventListener('cmsContentLoaded', function() {
            setTimeout(initPartnershipSlider, 500);
        });
        window.addEventListener('cms-content-loaded', function() {
            setTimeout(initPartnershipSlider, 500);
        });
        
        // Также инициализируем при любых изменениях DOM (на случай, если контент загружается асинхронно)
        if ('MutationObserver' in window) {
            const observer = new MutationObserver(function(mutations) {
                const hasPartnershipSection = document.querySelector('.section-gray-horizontal-slider .cards-container');
                if (hasPartnershipSection) {
                    setTimeout(initPartnershipSlider, 100);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
})();

