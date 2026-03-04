/**
 * CMS Loader v2 - Загрузка и рендеринг контента из Strapi API
 * 
 * Архитектура:
 * - Модульная структура с поддержкой общих и индивидуальных обработчиков
 * - Система регистрации процессоров для разных типов элементов
 * - Разделение ответственности: загрузка, рендеринг, обработка
 * 
 * @version 2.0
 * @date 2026-01-11
 */

(function() {
    'use strict';

    /**
     * ========================================================================
     * КОНФИГУРАЦИЯ
     * ========================================================================
     */
    
    const CONFIG = {
        // Использовать API по умолчанию на localhost
        useAPI: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        
        // Селекторы контейнеров
        selectors: {
            mainContent: '#main-content, main',
            hero: '.hero',
            breadcrumbs: '.breadcrumbs, nav.breadcrumbs',
            sidebar: '[data-component="sidebar-about"]'
        },
        
        // Задержки для инициализации компонентов (мс)
        delays: {
            contentProcess: 50,
            componentInit: 200
        }
    };

    // Переопределение через URL параметры или localStorage
    if (window.location.search.includes('cms=false')) CONFIG.useAPI = false;
    if (window.location.search.includes('cms=true')) CONFIG.useAPI = true;
    if (localStorage.getItem('useCMS') === 'false') CONFIG.useAPI = false;
    if (localStorage.getItem('useCMS') === 'true') CONFIG.useAPI = true;

    /**
     * ========================================================================
     * УТИЛИТЫ
     * ========================================================================
     */
    
    const Utils = {
        /**
         * Извлечь slug из пути страницы
         */
        extractSlug(pathname) {
            const cleanPath = pathname.replace(/^\/|\/$/g, '').replace(/index\.html$/, '');
            const parts = cleanPath.split('/').filter(p => p && p !== 'index.html' && p !== 'page-template.html');
            
            if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index')) {
                return 'home';
            }
            
            // Возвращаем только последнюю часть пути (slug страницы в Strapi)
            // Например: /about_mgts/about_registrar/index.html -> about_registrar
            return parts[parts.length - 1] || 'home';
        },

        /**
         * Создать элемент из HTML строки
         */
        createElement(html) {
            const div = document.createElement('div');
            div.innerHTML = html.trim();
            return div.firstElementChild || div;
        },

        /**
         * Ожидание (promise-based setTimeout)
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Получить текущий slug
         */
        getCurrentSlug() {
            return this.extractSlug(window.location.pathname);
        }
    };

    /**
     * ========================================================================
     * СИСТЕМА ПРОЦЕССОРОВ (PROCESSORS)
     * ========================================================================
     * 
     * Позволяет регистрировать обработчики для разных типов элементов:
     * - Общие процессоры (для всех страниц)
     * - Индивидуальные процессоры (для конкретных страниц или типов элементов)
     */
    
    const ProcessorRegistry = {
        // Общие процессоры (применяются ко всем страницам)
        global: new Map(),
        
        // Индивидуальные процессоры (по slug страницы)
        pageSpecific: new Map(),
        
        // Индивидуальные процессоры (по селектору/типу элемента)
        elementSpecific: new Map(),

        /**
         * Регистрация общего процессора
         * @param {string} name - Имя процессора
         * @param {Function} processor - Функция обработки (element, context) => void
         */
        registerGlobal(name, processor) {
            this.global.set(name, processor);
            console.log(`[CMS Loader] Registered global processor: ${name}`);
        },

        /**
         * Регистрация процессора для конкретной страницы
         * @param {string} slug - Slug страницы
         * @param {string} name - Имя процессора
         * @param {Function} processor - Функция обработки
         */
        registerForPage(slug, name, processor) {
            if (!this.pageSpecific.has(slug)) {
                this.pageSpecific.set(slug, new Map());
            }
            this.pageSpecific.get(slug).set(name, processor);
            console.log(`[CMS Loader] Registered page-specific processor: ${name} for page: ${slug}`);
        },

        /**
         * Регистрация процессора для типа элемента
         * @param {string} selector - CSS селектор или тип элемента
         * @param {string} name - Имя процессора
         * @param {Function} processor - Функция обработки
         */
        registerForElement(selector, name, processor) {
            if (!this.elementSpecific.has(selector)) {
                this.elementSpecific.set(selector, new Map());
            }
            this.elementSpecific.get(selector).set(name, processor);
            console.log(`[CMS Loader] Registered element-specific processor: ${name} for selector: ${selector}`);
        },

        /**
         * Применить все подходящие процессоры к элементу
         * @param {HTMLElement} element - Элемент для обработки
         * @param {string} slug - Slug текущей страницы
         * @param {Object} context - Дополнительный контекст
         */
        process(element, slug, context = {}) {
            // Применить общие процессоры
            for (const [name, processor] of this.global) {
                try {
                    processor(element, { slug, ...context });
                } catch (error) {
                    console.error(`[CMS Loader] Error in global processor "${name}":`, error);
                }
            }

            // Применить процессоры для конкретной страницы
            if (this.pageSpecific.has(slug)) {
                for (const [name, processor] of this.pageSpecific.get(slug)) {
                    try {
                        processor(element, { slug, ...context });
                    } catch (error) {
                        console.error(`[CMS Loader] Error in page-specific processor "${name}":`, error);
                    }
                }
            }

            // Применить процессоры для типа элемента
            for (const [selector, processors] of this.elementSpecific) {
                if (element.matches && element.matches(selector)) {
                    for (const [name, processor] of processors) {
                        try {
                            processor(element, { slug, ...context });
                        } catch (error) {
                            console.error(`[CMS Loader] Error in element-specific processor "${name}":`, error);
                        }
                    }
                }
            }
        }
    };

    /**
     * ========================================================================
     * РЕНДЕРЕРЫ (RENDERERS)
     * ========================================================================
     */
    
    const Renderers = {
        /**
         * Рендеринг метаданных страницы
         */
        metadata(pageData) {
            // Title
            if (pageData.title) {
                document.title = pageData.title;
            }

            // Meta description
            if (pageData.metaDescription) {
                let metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    metaDesc = document.createElement('meta');
                    metaDesc.name = 'description';
                    document.head.appendChild(metaDesc);
                }
                metaDesc.content = pageData.metaDescription;
            }

            // Meta keywords
            if (pageData.metaKeywords) {
                let metaKeywords = document.querySelector('meta[name="keywords"]');
                if (!metaKeywords) {
                    metaKeywords = document.createElement('meta');
                    metaKeywords.name = 'keywords';
                    document.head.appendChild(metaKeywords);
                }
                metaKeywords.content = pageData.metaKeywords;
            }
        },

        /**
         * Рендеринг Hero секции
         */
        hero(container, pageData) {
            if (!pageData.heroTitle && !pageData.heroSubtitle) {
                return;
            }

            let heroSection = container.querySelector(CONFIG.selectors.hero);
            
            if (!heroSection) {
                heroSection = document.createElement('section');
                heroSection.className = 'hero';
                const mainContent = container.querySelector(CONFIG.selectors.mainContent);
                if (mainContent) {
                    mainContent.insertBefore(heroSection, mainContent.firstChild);
                } else {
                    container.insertBefore(heroSection, container.firstChild);
                }
            }

            let heroContent = heroSection.querySelector('.hero-content');
            if (!heroContent) {
                heroContent = document.createElement('div');
                heroContent.className = 'hero-content';
                let containerDiv = heroSection.querySelector('.container');
                if (!containerDiv) {
                    containerDiv = document.createElement('div');
                    containerDiv.className = 'container';
                    heroSection.appendChild(containerDiv);
                }
                containerDiv.appendChild(heroContent);
            }

            // Заголовок
            if (pageData.heroTitle) {
                let title = heroContent.querySelector('h1');
                if (!title) {
                    title = document.createElement('h1');
                    heroContent.insertBefore(title, heroContent.firstChild);
                }
                title.textContent = pageData.heroTitle;
            }

            // Подзаголовок
            if (pageData.heroSubtitle) {
                let subtitle = heroContent.querySelector('p');
                if (!subtitle) {
                    subtitle = document.createElement('p');
                    heroContent.appendChild(subtitle);
                }
                subtitle.textContent = pageData.heroSubtitle;
            }
        },

        /**
         * Рендеринг основного контента
         */
        content(container, pageData, slug) {
            if (!pageData.content) {
                console.warn('[CMS Loader] No content to render');
                return;
            }

            const mainContent = container.querySelector(CONFIG.selectors.mainContent);
            if (!mainContent) {
                console.error('[CMS Loader] Main content container not found');
                return;
            }

            // Очистить контейнер от placeholder контента (если есть)
            // Оставляем только комментарии и элементы с data-keep атрибутом
            const keepElements = mainContent.querySelectorAll('[data-keep]');
            const keepHTML = Array.from(keepElements).map(el => el.outerHTML).join('');
            mainContent.innerHTML = keepHTML;

            // Создать временный контейнер для HTML из CMS
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = pageData.content;

            // Переместить все элементы из временного контейнера в основной
            while (tempDiv.firstChild) {
                const element = tempDiv.firstChild;
                mainContent.appendChild(element);
                
                // Применить процессоры к добавленному элементу
                ProcessorRegistry.process(element, slug, { pageData });
                
                // Рекурсивно обработать дочерние элементы
                const children = element.querySelectorAll('*');
                children.forEach(child => {
                    ProcessorRegistry.process(child, slug, { pageData });
                });
            }
        },

        /**
         * Рендеринг breadcrumbs
         */
        breadcrumbs(container, pageData) {
            if (!pageData.breadcrumbs) {
                return;
            }

            let breadcrumbs = pageData.breadcrumbs;
            if (typeof breadcrumbs === 'string') {
                try {
                    breadcrumbs = JSON.parse(breadcrumbs);
                } catch (e) {
                    console.warn('[CMS Loader] Invalid breadcrumbs format');
                    return;
                }
            }

            if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
                return;
            }

            let breadcrumbsNav = container.querySelector(CONFIG.selectors.breadcrumbs);
            if (!breadcrumbsNav) {
                breadcrumbsNav = document.createElement('nav');
                breadcrumbsNav.className = 'breadcrumbs';
                const mainContent = container.querySelector(CONFIG.selectors.mainContent);
                if (mainContent) {
                    mainContent.insertBefore(breadcrumbsNav, mainContent.firstChild);
                }
            }

            breadcrumbsNav.innerHTML = breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return isLast
                    ? `<span class="breadcrumbs-item">${item.name || item.title}</span>`
                    : `<a href="${item.url || item.path || '#'}" class="breadcrumbs-item">${item.name || item.title}</a>`;
            }).join(' / ');
        }
    };

    /**
     * ========================================================================
     * ОСНОВНОЙ КЛАСС CMSLoader
     * ========================================================================
     */
    
    class CMSLoader {
        constructor() {
            this.currentPageData = null;
            this.currentSlug = null;
            this.isLoading = false;
            this.isLoaded = false;
        }

        /**
         * Загрузка данных страницы из Strapi API
         */
        async loadPageData(slug, bypassCache = false) {
            if (!CONFIG.useAPI || !window.StrapiAPI) {
                console.warn('[CMS Loader] API not available, skipping load');
                return null;
            }

            try {
                console.log(`[CMS Loader] Loading page data: ${slug}`);
                const response = await window.StrapiAPI.getPage(slug, bypassCache);
                
                if (!response) {
                    return null;
                }

                // Нормализация структуры данных (Strapi v4/v5)
                const pageData = response.data?.attributes || response.data || response.attributes || response;
                
                if (!pageData) {
                    console.warn(`[CMS Loader] Page data not found for slug: ${slug}`);
                    return null;
                }

                console.log(`[CMS Loader] Page data loaded: ${slug}`, {
                    title: pageData.title,
                    hasContent: !!pageData.content,
                    contentLength: pageData.content?.length || 0
                });

                return pageData;
            } catch (error) {
                console.error(`[CMS Loader] Error loading page data for ${slug}:`, error);
                return null;
            }
        }

        /**
         * Основной метод загрузки и рендеринга страницы
         */
        async load(slug = null) {
            if (this.isLoading) {
                console.warn('[CMS Loader] Load already in progress');
                return;
            }

            if (this.isLoaded) {
                console.warn('[CMS Loader] Page already loaded');
                return;
            }

            this.isLoading = true;

            try {
                const currentSlug = slug || Utils.getCurrentSlug();
                this.currentSlug = currentSlug;

                console.log(`[CMS Loader] Starting load for slug: ${currentSlug}`);

                // Загрузить данные страницы
                const pageData = await this.loadPageData(currentSlug);
                
                if (!pageData) {
                    console.warn('[CMS Loader] Page data not available');
                    this.isLoading = false;
                    return;
                }

                this.currentPageData = pageData;

                // Рендеринг
                await this.render(pageData);

                // Инициализация компонентов
                await this.initComponents();

                this.isLoaded = true;
                console.log('[CMS Loader] Page loaded successfully');

                // Отправить событие
                window.dispatchEvent(new CustomEvent('cmsContentLoaded', { detail: { pageData, slug: currentSlug } }));
                window.dispatchEvent(new CustomEvent('cms-content-loaded', { detail: { pageData, slug: currentSlug } }));

            } catch (error) {
                console.error('[CMS Loader] Error during load:', error);
            } finally {
                this.isLoading = false;
            }
        }

        /**
         * Рендеринг всех частей страницы
         */
        async render(pageData) {
            const container = document.body;
            const slug = this.currentSlug;

            // Метаданные
            Renderers.metadata(pageData);

            // Hero
            Renderers.hero(container, pageData);

            // Breadcrumbs
            Renderers.breadcrumbs(container, pageData);

            // Основной контент
            await Utils.delay(CONFIG.delays.contentProcess);
            Renderers.content(container, pageData, slug);
        }

        /**
         * Инициализация интерактивных компонентов
         */
        async initComponents() {
            await Utils.delay(CONFIG.delays.componentInit);

            // История с табами
            if (window.initHistoryTimelines && typeof window.initHistoryTimelines === 'function') {
                window.initHistoryTimelines();
            }

            // Карусели изображений
            if (window.initMirrorSliders && typeof window.initMirrorSliders === 'function') {
                window.initMirrorSliders();
            }

            // Карты с точками
            if (window.initSectionMaps && typeof window.initSectionMaps === 'function') {
                window.initSectionMaps();
            }

            // Мобильное приложение
            if (window.initMobileAppSections && typeof window.initMobileAppSections === 'function') {
                window.initMobileAppSections();
            }

            // CRM карточки
            if (window.initCrmCards && typeof window.initCrmCards === 'function') {
                window.initCrmCards();
            }
        }

        /**
         * Получить текущие данные страницы
         */
        getPageData() {
            return this.currentPageData;
        }

        /**
         * Получить текущий slug
         */
        getSlug() {
            return this.currentSlug;
        }

        /**
         * API для регистрации процессоров
         */
        get processors() {
            return ProcessorRegistry;
        }
    }

    /**
     * ========================================================================
     * ИНИЦИАЛИЗАЦИЯ И ЭКСПОРТ
     * ========================================================================
     */
    
    // Создать единственный экземпляр
    const cmsLoader = new CMSLoader();

    // Экспорт в глобальную область
    window.CMSLoader = cmsLoader;

    // Автоматическая инициализация
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                cmsLoader.load();
            });
        } else {
            cmsLoader.load();
        }
    }

    init();

    // Экспорт для использования в других скриптах
    window.CMSLoaderAPI = {
        CMSLoader: cmsLoader,
        ProcessorRegistry: ProcessorRegistry,
        Renderers: Renderers,
        Utils: Utils,
        CONFIG: CONFIG
    };

    console.log('[CMS Loader v2] Initialized');

})();
