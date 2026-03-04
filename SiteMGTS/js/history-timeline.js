/**
 * History Timeline - Компонент истории с переключением периодов
 * 
 * Функциональность:
 * - Переключение периодов по клику на вкладки
 * - Показ/скрытие контента соответствующих периодов
 * - Подсветка активной вкладки
 * - Поддержка клавиатуры
 */

(function() {
    'use strict';

    class HistoryTimeline {
        constructor(container) {
            this.container = container;
            this.tabs = container.querySelectorAll('.history-timeline__tab-button');
            this.periods = container.querySelectorAll('.history-timeline__period');
            this.currentIndex = 0;
            
            // Проверяем наличие элементов
            if (this.tabs.length === 0 || this.periods.length === 0) {
                console.warn('[History Timeline] No tabs or periods found');
                return;
            }
            
            // Проверяем соответствие количества вкладок и периодов
            if (this.tabs.length !== this.periods.length) {
                console.warn(`[History Timeline] Mismatch: ${this.tabs.length} tabs but ${this.periods.length} periods`);
            }
            
            this.init();
        }

        init() {
            // Инициализируем первую вкладку как активную
            this.goToPeriod(0);
            
            // Добавляем обработчики событий для вкладок
            this.attachEventListeners();
            
            // Логирование для отладки
            console.log(`[History Timeline] Инициализирован timeline с ${this.tabs.length} периодами`);
        }

        attachEventListeners() {
            this.tabs.forEach((tab, index) => {
                // Обработчик клика
                tab.addEventListener('click', () => {
                    this.goToPeriod(index);
                });
                
                // Поддержка клавиатуры
                tab.setAttribute('role', 'tab');
                tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
                tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
                tab.setAttribute('aria-controls', `history-period-${index}`);
                
                tab.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.goToPeriod(index);
                    } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prevIndex = index > 0 ? index - 1 : this.tabs.length - 1;
                        this.goToPeriod(prevIndex);
                        this.tabs[prevIndex].focus();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const nextIndex = index < this.tabs.length - 1 ? index + 1 : 0;
                        this.goToPeriod(nextIndex);
                        this.tabs[nextIndex].focus();
                    }
                });
            });
        }

        goToPeriod(index) {
            if (index < 0 || index >= this.tabs.length) {
                console.warn(`[History Timeline] Invalid period index: ${index}`);
                return;
            }
            
            // Убираем активное состояние со всех вкладок
            this.tabs.forEach((tab, i) => {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
                tab.setAttribute('tabindex', '-1');
            });
            
            // Скрываем все периоды
            this.periods.forEach((period, i) => {
                period.classList.remove('active');
                period.style.display = 'none';
                period.setAttribute('aria-hidden', 'true');
            });
            
            // Активируем выбранную вкладку
            this.tabs[index].classList.add('active');
            this.tabs[index].setAttribute('aria-selected', 'true');
            this.tabs[index].setAttribute('tabindex', '0');
            
            // Показываем соответствующий период
            if (this.periods[index]) {
                this.periods[index].classList.add('active');
                this.periods[index].style.display = '';
                this.periods[index].setAttribute('aria-hidden', 'false');
            }
            
            this.currentIndex = index;
            
            console.log(`[History Timeline] Переключено на период ${index + 1}`);
        }

        destroy() {
            // Удаляем обработчики событий
            this.tabs.forEach((tab) => {
                const newTab = tab.cloneNode(true);
                tab.parentNode.replaceChild(newTab, tab);
            });
        }
    }

    // Инициализация всех timeline на странице
    function initHistoryTimelines() {
        const timelines = document.querySelectorAll('.history-timeline');
        
        if (timelines.length === 0) {
            console.log('[History Timeline] Timeline компоненты не найдены на странице');
            return;
        }
        
        console.log(`[History Timeline] Найдено timeline компонентов: ${timelines.length}`);
        
        const timelineInstances = [];
        
        timelines.forEach((timeline, index) => {
            // Пропускаем уже инициализированные
            if (timeline.dataset.initialized === 'true') {
                console.log(`[History Timeline] Timeline ${index + 1} уже инициализирован, пропускаем`);
                return;
            }
            
            try {
                const instance = new HistoryTimeline(timeline);
                timeline.dataset.initialized = 'true'; // Помечаем как инициализированный
                timelineInstances.push(instance);
                console.log(`[History Timeline] Timeline ${index + 1} инициализирован успешно`);
            } catch (error) {
                console.error(`[History Timeline] Ошибка при инициализации timeline ${index + 1}:`, error);
            }
        });
        
        // Сохраняем экземпляры для возможного использования
        if (!window.historyTimelines) {
            window.historyTimelines = [];
        }
        window.historyTimelines.push(...timelineInstances);
        
        if (timelineInstances.length > 0) {
            console.log(`[History Timeline] Инициализировано новых timeline: ${timelineInstances.length}`);
        }
    }

    // Инициализация при загрузке DOM
    function initWhenReady() {
        // Проверяем наличие timeline (может быть загружен из CMS)
        const timelines = document.querySelectorAll('.history-timeline');
        if (timelines.length > 0) {
            initHistoryTimelines();
        } else {
            // Если timeline еще не загружен, ждем немного и проверяем снова
            setTimeout(() => {
                const timelinesRetry = document.querySelectorAll('.history-timeline');
                if (timelinesRetry.length > 0) {
                    initHistoryTimelines();
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
        setTimeout(initHistoryTimelines, 100);
    });
    window.addEventListener('cms-content-loaded', () => {
        setTimeout(initHistoryTimelines, 100);
    });

    // Экспорт для использования в других скриптах
    window.HistoryTimeline = HistoryTimeline;
    window.initHistoryTimelines = initHistoryTimelines;
})();
