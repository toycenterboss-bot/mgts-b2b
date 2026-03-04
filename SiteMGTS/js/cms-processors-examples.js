/**
 * Примеры процессоров для CMS Loader v2
 * 
 * Этот файл содержит примеры процессоров для различных типов элементов.
 * Можно использовать их как есть или как основу для создания собственных процессоров.
 * 
 * Для использования раскомментируйте нужные процессоры в конце файла.
 */

(function() {
    'use strict';

    if (!window.CMSLoaderAPI || !window.CMSLoaderAPI.ProcessorRegistry) {
        console.warn('[CMS Processors] CMS Loader API not available');
        return;
    }

    const ProcessorRegistry = window.CMSLoaderAPI.ProcessorRegistry;

    /**
     * ========================================================================
     * ОБЩИЕ ПРОЦЕССОРЫ (для всех страниц)
     * ========================================================================
     */

    /**
     * Улучшение внутренних ссылок
     * Преобразует относительные ссылки в правильные пути
     */
    function enhanceInternalLinks(element, context) {
        if (element.tagName !== 'A' || !element.href) return;

        const href = element.getAttribute('href');
        
        // Пропускаем внешние ссылки, якоря, и специальные протоколы
        if (!href || href.startsWith('http') || href.startsWith('#') || 
            href.startsWith('tel:') || href.startsWith('mailto:')) {
            return;
        }

        // Если ссылка относительная, но не начинается с /, добавляем /
        if (!href.startsWith('/')) {
            const basePath = window.location.pathname.split('/').slice(0, -2).join('/') || '';
            element.href = (basePath ? basePath + '/' : '/') + href.replace(/^\.\//, '');
        }
    }

    /**
     * Улучшение изображений
     * Обрабатывает пути к изображениям и добавляет альтернативный текст
     */
    function enhanceImages(element, context) {
        if (element.tagName !== 'IMG') return;

        const src = element.getAttribute('src');
        if (!src) return;

        // Если путь относительный, преобразуем в абсолютный
        if (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
            const basePath = window.location.pathname.split('/').slice(0, -2).join('/') || '';
            element.src = (basePath ? basePath + '/' : '/') + src.replace(/^\.\//, '');
        }

        // Добавляем alt, если его нет
        if (!element.alt && element.title) {
            element.alt = element.title;
        }
    }

    /**
     * Обработка таблиц
     * Добавляет стили и улучшает доступность
     */
    function enhanceTables(element, context) {
        if (element.tagName !== 'TABLE') return;

        // Добавляем класс, если его нет
        if (!element.className) {
            element.className = 'table';
        }

        // Добавляем wrapper, если его нет
        if (element.parentElement && !element.parentElement.classList.contains('table-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            element.parentElement.insertBefore(wrapper, element);
            wrapper.appendChild(element);
        }
    }

    /**
     * ========================================================================
     * ПРОЦЕССОРЫ ДЛЯ КОНКРЕТНЫХ ТИПОВ ЭЛЕМЕНТОВ
     * ========================================================================
     */

    /**
     * Обработка карточек услуг (.service-card)
     * Добавляет иконки и улучшает структуру
     */
    function processServiceCards(element, context) {
        if (!element.classList.contains('service-card')) return;

        // Проверяем, есть ли уже иконка
        if (element.querySelector('.service-card-icon')) return;

        // Создаем иконку
        const iconDiv = document.createElement('div');
        iconDiv.className = 'service-card-icon';

        // Получаем заголовок для определения иконки
        const title = element.querySelector('h3, .service-card-title')?.textContent || '';
        const titleLower = title.toLowerCase();

        // Маппинг заголовков на иконки Font Awesome
        const iconMap = {
            'интернет': 'fa-globe',
            'телефония': 'fa-phone',
            'телевидение': 'fa-tv',
            'облако': 'fa-cloud',
            'безопасность': 'fa-shield-halved',
            'видеонаблюдение': 'fa-video',
            'сигнализация': 'fa-bell',
            'контроль доступа': 'fa-lock'
        };

        let iconClass = 'fa-circle'; // По умолчанию
        for (const [key, faClass] of Object.entries(iconMap)) {
            if (titleLower.includes(key)) {
                iconClass = faClass;
                break;
            }
        }

        iconDiv.innerHTML = `<i class="fas ${iconClass}"></i>`;

        // Добавляем иконку в начало карточки
        const body = element.querySelector('.service-card-body') || element;
        body.insertBefore(iconDiv, body.firstChild);
    }

    /**
     * Обработка секций с карточками
     * Улучшает структуру и стили
     */
    function processCardSections(element, context) {
        if (!element.classList.contains('section-cards')) return;

        // Проверяем, что есть контейнер для карточек
        if (!element.querySelector('.cards-grid, .cards-container')) {
            const cards = element.querySelectorAll('.service-card, .card');
            if (cards.length > 0) {
                const grid = document.createElement('div');
                grid.className = 'cards-grid';
                
                cards.forEach(card => {
                    grid.appendChild(card);
                });
                
                element.appendChild(grid);
            }
        }
    }

    /**
     * Обработка секций FAQ
     * Инициализирует аккордеон функциональность
     */
    function processFAQ(element, context) {
        if (!element.classList.contains('service-faq')) return;

        const items = element.querySelectorAll('.service-faq__item');
        items.forEach((item, index) => {
            const question = item.querySelector('.service-faq__question');
            const answer = item.querySelector('.service-faq__answer');
            
            if (question && answer) {
                // Добавляем обработчик клика
                question.addEventListener('click', function() {
                    const isActive = item.classList.contains('active');
                    
                    // Закрываем все другие элементы
                    items.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                        }
                    });
                    
                    // Переключаем текущий элемент
                    item.classList.toggle('active', !isActive);
                });
                
                // Первый элемент открыт по умолчанию
                if (index === 0) {
                    item.classList.add('active');
                }
            }
        });
    }

    /**
     * ========================================================================
     * ПРОЦЕССОРЫ ДЛЯ КОНКРЕТНЫХ СТРАНИЦ
     * ========================================================================
     */

    /**
     * Специальная обработка для страницы about_mgts
     * Пример индивидуальной обработки
     */
    function processAboutMgtsPage(element, context) {
        if (context.slug !== 'about_mgts') return;

        // Специальная обработка для этой страницы
        // Например, улучшение истории компании
        if (element.classList.contains('history-timeline')) {
            // Кастомная логика для истории
            console.log('[CMS Processors] Processing history timeline for about_mgts');
        }
    }

    /**
     * ========================================================================
     * РЕГИСТРАЦИЯ ПРОЦЕССОРОВ
     * ========================================================================
     * 
     * Раскомментируйте нужные процессоры для использования
     */

    // Общие процессоры
    ProcessorRegistry.registerGlobal('enhanceInternalLinks', enhanceInternalLinks);
    ProcessorRegistry.registerGlobal('enhanceImages', enhanceImages);
    ProcessorRegistry.registerGlobal('enhanceTables', enhanceTables);

    // Процессоры для типов элементов
    ProcessorRegistry.registerForElement('.service-card', 'processServiceCards', processServiceCards);
    ProcessorRegistry.registerForElement('.section-cards', 'processCardSections', processCardSections);
    ProcessorRegistry.registerForElement('.service-faq', 'processFAQ', processFAQ);

    // Процессоры для конкретных страниц
    ProcessorRegistry.registerForPage('about_mgts', 'processAboutMgtsPage', processAboutMgtsPage);

    console.log('[CMS Processors Examples] Processors registered');

})();
