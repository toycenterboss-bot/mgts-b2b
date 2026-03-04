/**
 * Navigation Renderer
 * Рендерит главное меню из данных Strapi API
 */

(function() {
    'use strict';

    /**
     * Вычисление базового пути относительно корня сайта
     */
    function getBasePath() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(p => p && p !== 'index.html' && p.length > 0);
        
        if (parts.length === 0) {
            return '';
        }
        
        const depth = parts.length;
        return '../'.repeat(depth);
    }

    /**
     * Обновление путей в ссылках
     */
    function updatePaths(element, basePath) {
        if (!basePath) return;
        
        const links = element.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && 
                !href.startsWith('tel:') && !href.startsWith('mailto:') && 
                !href.startsWith('/')) {
                link.setAttribute('href', basePath + href);
            }
        });

        const images = element.querySelectorAll('img[src]');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:') && 
                !src.startsWith('/') && src.startsWith('images/')) {
                img.setAttribute('src', basePath + src);
            }
        });
    }

    /**
     * Рендеринг главного меню
     */
    async function render(targetSelector) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.warn(`[Navigation Renderer] Target selector "${targetSelector}" not found.`);
            return Promise.reject(new Error('Target not found'));
        }

        if (!window.StrapiAPI) {
            console.warn('[Navigation Renderer] StrapiAPI not available, falling back to static.');
            renderStatic(target);
            return Promise.resolve();
        }

        try {
            console.log('[Navigation Renderer] Loading navigation from API...');
            // Используем getMainMenu() для получения меню из /pages/main-menu
            const menuData = await window.StrapiAPI.getMainMenu();
            
            if (!menuData) {
                console.warn('[Navigation Renderer] No menu data received from API, falling back to static.');
                renderStatic(target);
                return Promise.resolve();
            }

            // Используем функцию renderMainMenu из cms-loader.js, если она доступна
            // Она уже правильно обрабатывает структуру menuData из getMainMenu()
            if (window.CMSLoader && typeof window.CMSLoader.renderMainMenu === 'function') {
                console.log('[Navigation Renderer] Using CMSLoader.renderMainMenu');
                window.CMSLoader.renderMainMenu(menuData);
                
                // Инициализируем навигацию после рендеринга
                setTimeout(() => {
                    if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
                        Navigation.init();
                    } else if (window.Navigation && typeof window.Navigation.init === 'function') {
                        window.Navigation.init();
                    }
                }, 100);
                return Promise.resolve();
            }

            // Fallback: если CMSLoader.renderMainMenu недоступен, используем прямую обработку menuData
            console.log('[Navigation Renderer] CMSLoader.renderMainMenu not available, using direct rendering');
            // Используем функцию renderMainMenuFromMenuData для обработки структуры getMainMenu()
            const success = renderMainMenuFromMenuData(menuData, target);
            if (success) {
                console.log('[Navigation Renderer] Navigation rendered successfully');
                // Инициализируем навигацию после рендеринга
                setTimeout(() => {
                    if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
                        Navigation.init();
                    } else if (window.Navigation && typeof window.Navigation.init === 'function') {
                        window.Navigation.init();
                    } else {
                        // Если Navigation еще не загружен, ждем еще
                        setTimeout(() => {
                            if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
                                Navigation.init();
                            } else if (window.Navigation && typeof window.Navigation.init === 'function') {
                                window.Navigation.init();
                            }
                        }, 300);
                    }
                }, 100);
                return Promise.resolve();
            } else {
                renderStatic(target);
                return Promise.resolve();
            }
        } catch (error) {
            console.error('[Navigation Renderer] Error rendering navigation from API:', error);
            renderStatic(target);
            return Promise.reject(error);
        }
    }

    /**
     * Рендеринг главного меню из структуры menuData (getMainMenu format)
     */
    function renderMainMenuFromMenuData(menuData, container) {
        if (!menuData) {
            console.error('[Navigation Renderer] Invalid menu data');
            return false;
        }

        const basePath = getBasePath();
        
        // Проверяем, есть ли уже header в контейнере
        let header = container.querySelector('header');
        if (!header) {
            header = document.createElement('header');
            header.className = 'header';
            container.appendChild(header);
        } else {
            // Очищаем существующий header, но сохраняем структуру
            const existingNav = header.querySelector('#mainNav');
            if (existingNav) {
                existingNav.innerHTML = '';
            }
        }
        
        // Убеждаемся, что есть контейнер внутри header
        let containerDiv = header.querySelector('.container');
        if (!containerDiv) {
            containerDiv = document.createElement('div');
            containerDiv.className = 'container';
            header.appendChild(containerDiv);
        }
        
        let headerInner = containerDiv.querySelector('.header-inner');
        if (!headerInner) {
            headerInner = document.createElement('div');
            headerInner.className = 'header-inner';
            containerDiv.appendChild(headerInner);
        }
        
        // Логотип (если еще нет)
        let logo = headerInner.querySelector('.logo');
        if (!logo) {
            logo = document.createElement('a');
            logo.href = basePath + 'index.html';
            logo.className = 'logo';
            logo.setAttribute('data-base-path', '');
            logo.setAttribute('aria-label', 'МГТС - Главная страница');
            headerInner.insertBefore(logo, headerInner.firstChild);
        }
        
        // Навигация (находим или создаем)
        let nav = headerInner.querySelector('#mainNav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.className = 'nav';
            nav.id = 'mainNav';
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Главная навигация');
            headerInner.appendChild(nav);
        } else {
            // Очищаем существующие ссылки (кроме телефона)
            const existingLinks = nav.querySelectorAll('.nav-link:not([href^="tel:"])');
            existingLinks.forEach(link => link.remove());
        }
        
        // Удаляем старые мега-меню
        const existingMegaMenus = document.querySelectorAll('.mega-menu');
        existingMegaMenus.forEach(menu => menu.remove());
        
        // Маппинг секций на названия меню
        const sectionLabels = {
            'business': 'Бизнес',
            'operators': 'Операторам',
            'government': 'Госсектор',
            'partners': 'Партнерам',
            'developers': 'Застройщикам',
            'about_mgts': 'О компании',
            'news': 'Новости',
            'other': 'Прочее'
        };
        
        // Добавляем главную ссылку
        const homeLink = document.createElement('a');
        homeLink.href = basePath + 'index.html';
        homeLink.className = 'nav-link';
        homeLink.setAttribute('data-base-path', '');
        homeLink.setAttribute('aria-label', 'Главная страница');
        homeLink.textContent = 'Главная';
        nav.appendChild(homeLink);
        
        // Функция для получения пути страницы
        const getPagePath = (page) => {
            if (!page.parent && !page.parentSlug) {
                return basePath + `${page.slug}/index.html`;
            }
            if (page.parentSlug && !page.parent) {
                return basePath + `${page.parentSlug}/${page.slug}/index.html`;
            }
            if (page.parent) {
                const pathParts = [page.slug];
                let parent = page.parent;
                while (parent && typeof parent === 'object') {
                    const parentData = parent.attributes || parent;
                    pathParts.unshift(parentData.slug);
                    parent = parentData.parent;
                }
                return basePath + pathParts.join('/') + '/index.html';
            }
            return basePath + `${page.slug}/index.html`;
        };
        
        // Группируем страницы по секциям
        const sectionOrder = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts', 'news'];
        
        sectionOrder.forEach(section => {
            const sectionPages = menuData.bySection && menuData.bySection[section] || [];
            if (sectionPages.length === 0) return;
            
            const rootSectionPages = sectionPages.filter(page => !page.parent && !page.parentSlug);
            if (rootSectionPages.length === 0) return;
            
            const hasChildren = sectionPages.some(page => (page.children && page.children.length > 0) || page.parentSlug);
            
            if (rootSectionPages.length === 1 && !hasChildren) {
                // Простая ссылка
                const page = rootSectionPages[0];
                const link = document.createElement('a');
                link.href = getPagePath(page);
                link.className = 'nav-link';
                link.setAttribute('data-base-path', '');
                link.textContent = page.title || sectionLabels[section] || section;
                nav.appendChild(link);
            } else {
                // Мега-меню
                const megaMenuId = `${section}Menu`;
                const link = document.createElement('a');
                link.href = `#${section}`;
                link.className = 'nav-link';
                link.setAttribute('data-mega-menu', megaMenuId);
                link.setAttribute('aria-haspopup', 'true');
                link.setAttribute('aria-expanded', 'false');
                link.setAttribute('aria-controls', megaMenuId);
                link.textContent = sectionLabels[section] || section;
                nav.appendChild(link);
                
                // Создаем мега-меню
                createMegaMenuFromMenuData(megaMenuId, section, sectionPages, basePath, getPagePath);
            }
        });
        
        // Мобильное меню (если еще нет)
        let mobileToggle = headerInner.querySelector('.mobile-menu-toggle');
        if (!mobileToggle) {
            mobileToggle = document.createElement('button');
            mobileToggle.className = 'mobile-menu-toggle';
            mobileToggle.setAttribute('aria-label', 'Меню');
            mobileToggle.setAttribute('aria-expanded', 'false');
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            svg.setAttribute('aria-hidden', 'true');
            
            for (let i = 0; i < 3; i++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', '3');
                line.setAttribute('y1', String(6 + i * 6));
                line.setAttribute('x2', '21');
                line.setAttribute('y2', String(6 + i * 6));
                svg.appendChild(line);
            }
            
            mobileToggle.appendChild(svg);
            headerInner.appendChild(mobileToggle);
        }
        
        // Обновляем пути
        updatePaths(header, basePath);
        
        return true;
    }
    
    /**
     * Создать мега-меню из структуры menuData
     */
    function createMegaMenuFromMenuData(megaMenuId, section, pages, basePath, getPagePath) {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const megaMenu = document.createElement('div');
        megaMenu.id = megaMenuId;
        megaMenu.className = 'mega-menu';
        megaMenu.setAttribute('role', 'menu');
        megaMenu.setAttribute('aria-label', `Меню ${section}`);
        megaMenu.setAttribute('aria-hidden', 'true');
        
        const container = document.createElement('div');
        container.className = 'container';
        
        const grid = document.createElement('div');
        grid.className = 'mega-menu-grid';
        
        const rootPages = pages.filter(page => !page.parent && !page.parentSlug);
        rootPages.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        rootPages.forEach(rootPage => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'mega-menu-section';
            
            const h3 = document.createElement('h3');
            const h3Link = document.createElement('a');
            h3Link.href = getPagePath(rootPage);
            h3Link.style.cssText = 'color: inherit; text-decoration: none;';
            h3Link.setAttribute('data-base-path', '');
            h3Link.textContent = rootPage.title || rootPage.slug;
            h3.appendChild(h3Link);
            sectionDiv.appendChild(h3);
            
            // Дочерние страницы
            const children = rootPage.children || pages.filter(p => 
                (p.parentSlug === rootPage.slug) || 
                (p.parent && (p.parent.attributes || p.parent).slug === rootPage.slug)
            );
            
            if (children.length > 0) {
                const list = document.createElement('ul');
                list.className = 'mega-menu-list';
                
                children.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(child => {
                    const li = document.createElement('li');
                    li.className = 'mega-menu-item';
                    
                    const link = document.createElement('a');
                    link.href = getPagePath(child);
                    link.setAttribute('data-base-path', '');
                    link.textContent = child.title || child.slug;
                    li.appendChild(link);
                    list.appendChild(li);
                });
                
                sectionDiv.appendChild(list);
            }
            
            grid.appendChild(sectionDiv);
        });
        
        container.appendChild(grid);
        megaMenu.appendChild(container);
        header.appendChild(megaMenu);
    }

    /**
     * Рендеринг главного меню (внутренняя функция) - старая версия для совместимости
     */
    function renderMainMenu(navData, container) {
        if (!navData || !navData.data) {
            console.error('[Navigation Renderer] Invalid navigation data');
            return false;
        }

        const data = navData.data;
        const basePath = getBasePath();
        
        // Создаем структуру header
        const header = document.createElement('header');
        header.className = 'header';
        
        const containerDiv = document.createElement('div');
        containerDiv.className = 'container';
        
        const headerInner = document.createElement('div');
        headerInner.className = 'header-inner';
        
        // Логотип
        const logo = document.createElement('a');
        logo.href = basePath + 'index.html';
        logo.className = 'logo';
        logo.setAttribute('data-base-path', '');
        logo.setAttribute('aria-label', 'МГТС - Главная страница');
        
        if (data.logo && data.logo.url) {
            const logoImg = document.createElement('img');
            logoImg.src = basePath + (data.logo.url.startsWith('/') ? data.logo.url.substring(1) : data.logo.url);
            logoImg.alt = data.logoAlt || 'МГТС';
            logoImg.setAttribute('data-base-path', '');
            logo.appendChild(logoImg);
        }
        
        headerInner.appendChild(logo);
        
        // Главное меню
        const nav = document.createElement('nav');
        nav.className = 'nav';
        nav.id = 'mainNav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Главная навигация');
        
        if (data.mainMenuItems && Array.isArray(data.mainMenuItems)) {
            // Сортируем по order
            const sortedItems = [...data.mainMenuItems]
                .filter(item => item.isVisible !== false)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            
            sortedItems.forEach(item => {
                const link = document.createElement('a');
                link.href = item.href.startsWith('http') || item.href.startsWith('#') || 
                           item.href.startsWith('tel:') || item.href.startsWith('mailto:') || 
                           item.href.startsWith('/') 
                    ? item.href 
                    : basePath + item.href;
                link.className = 'nav-link';
                link.textContent = item.label;
                link.setAttribute('data-base-path', '');
                // Все ссылки должны быть доступны с клавиатуры
                link.setAttribute('tabindex', '0');
                
                // Добавляем aria-label если это телефон или специальная ссылка
                if (item.href.startsWith('tel:')) {
                    link.setAttribute('aria-label', `Позвонить по телефону ${item.label}`);
                    // Обертываем номер телефона в span с aria-hidden для эмодзи
                    const phoneText = link.textContent;
                    link.innerHTML = `📞 <span aria-hidden="true">${phoneText.replace('📞 ', '')}</span>`;
                } else if (item.href === basePath + 'index.html' || item.href === 'index.html') {
                    link.setAttribute('aria-label', 'Главная страница');
                }
                
                if (item.hasMegaMenu && item.megaMenuId) {
                    link.setAttribute('data-mega-menu', item.megaMenuId);
                    link.setAttribute('aria-haspopup', 'true');
                    link.setAttribute('aria-expanded', 'false');
                    link.setAttribute('aria-controls', item.megaMenuId);
                }
                
                // Проверяем, является ли это текущая страница
                const currentPath = window.location.pathname;
                const linkPath = link.href.replace(window.location.origin, '');
                if (currentPath === linkPath || 
                    (currentPath.endsWith('/') && linkPath === currentPath.slice(0, -1)) ||
                    (currentPath.endsWith('index.html') && linkPath === currentPath.replace('index.html', ''))) {
                    link.setAttribute('aria-current', 'page');
                }
                
                nav.appendChild(link);
            });
        }
        
        // Телефон
        if (data.phone) {
            const phoneLink = document.createElement('a');
            phoneLink.href = `tel:${data.phone}`;
            phoneLink.className = 'nav-link';
            phoneLink.setAttribute('aria-label', `Позвонить по телефону ${data.phoneDisplay || data.phone}`);
            const phoneDisplay = data.phoneDisplay || data.phone;
            phoneLink.innerHTML = `📞 <span aria-hidden="true">${phoneDisplay}</span>`;
            nav.appendChild(phoneLink);
        }
        
        headerInner.appendChild(nav);
        
        // Мобильное меню
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-menu-toggle';
        mobileToggle.setAttribute('aria-label', 'Меню');
        mobileToggle.setAttribute('aria-expanded', 'false');
        // Создаем SVG иконку гамбургер-меню
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        
        // Создаем три линии для гамбургер-меню
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', '3');
        line1.setAttribute('y1', '6');
        line1.setAttribute('x2', '21');
        line1.setAttribute('y2', '6');
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', '3');
        line2.setAttribute('y1', '12');
        line2.setAttribute('x2', '21');
        line2.setAttribute('y2', '12');
        
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line3.setAttribute('x1', '3');
        line3.setAttribute('y1', '18');
        line3.setAttribute('x2', '21');
        line3.setAttribute('y2', '18');
        
        svg.appendChild(line1);
        svg.appendChild(line2);
        svg.appendChild(line3);
        
        // Добавляем скрытый текст для доступности
        const srOnly = document.createElement('span');
        srOnly.className = 'sr-only';
        srOnly.textContent = 'Меню';
        
        mobileToggle.appendChild(svg);
        mobileToggle.appendChild(srOnly);
        headerInner.appendChild(mobileToggle);
        
        containerDiv.appendChild(headerInner);
        header.appendChild(containerDiv);
        
        // Mega-menu
        if (data.megaMenus && Array.isArray(data.megaMenus)) {
            data.megaMenus.forEach(megaMenu => {
                const megaMenuDiv = document.createElement('div');
                megaMenuDiv.id = megaMenu.id;
                megaMenuDiv.className = 'mega-menu';
                megaMenuDiv.setAttribute('role', 'menu');
                megaMenuDiv.setAttribute('aria-label', `Меню ${megaMenu.title || megaMenu.id}`);
                megaMenuDiv.setAttribute('aria-hidden', 'true');
                
                const megaContainer = document.createElement('div');
                megaContainer.className = 'container';
                
                const megaGrid = document.createElement('div');
                megaGrid.className = 'mega-menu-grid';
                
                if (megaMenu.sections && Array.isArray(megaMenu.sections)) {
                    megaMenu.sections.forEach(section => {
                        const sectionDiv = document.createElement('div');
                        sectionDiv.className = 'mega-menu-section';
                        
                        if (section.title) {
                            const title = document.createElement('h3');
                            if (section.titleHref) {
                                const titleLink = document.createElement('a');
                                titleLink.href = section.titleHref.startsWith('http') || 
                                               section.titleHref.startsWith('/') 
                                    ? section.titleHref 
                                    : basePath + section.titleHref;
                                titleLink.style.cssText = 'color: inherit; text-decoration: none;';
                                titleLink.setAttribute('data-base-path', '');
                                titleLink.textContent = section.title;
                                title.appendChild(titleLink);
                            } else {
                                title.textContent = section.title;
                            }
                            sectionDiv.appendChild(title);
                        }
                        
                        if (section.description) {
                            const desc = document.createElement('p');
                            desc.textContent = section.description;
                            sectionDiv.appendChild(desc);
                        }
                        
                        if (section.links && Array.isArray(section.links) && section.links.length > 0) {
                            const list = document.createElement('ul');
                            list.className = 'mega-menu-list';
                            
                            section.links.forEach(linkData => {
                                const listItem = document.createElement('li');
                                listItem.className = 'mega-menu-item';
                                
                                const link = document.createElement('a');
                                link.href = linkData.href.startsWith('http') || 
                                          linkData.href.startsWith('/') 
                                    ? linkData.href 
                                    : basePath + linkData.href;
                                link.textContent = linkData.label;
                                link.setAttribute('data-base-path', '');
                                
                                if (linkData.isExternal) {
                                    link.setAttribute('target', '_blank');
                                    link.setAttribute('rel', 'noopener noreferrer');
                                }
                                
                                listItem.appendChild(link);
                                list.appendChild(listItem);
                            });
                            
                            sectionDiv.appendChild(list);
                        }
                        
                        megaGrid.appendChild(sectionDiv);
                    });
                }
                
                megaContainer.appendChild(megaGrid);
                megaMenuDiv.appendChild(megaContainer);
                header.appendChild(megaMenuDiv);
            });
        }
        
        // Обновляем пути
        updatePaths(header, basePath);
        
        // Вставляем в контейнер
        container.innerHTML = '';
        container.appendChild(header);
        
        return true;
    }

    /**
     * Статический рендеринг (fallback)
     */
    function renderStatic(target) {
        console.log('[Navigation Renderer] Rendering static header.html');
        // Fallback to loading static header.html if API fails
        if (window.ComponentLoader && typeof window.ComponentLoader.load === 'function') {
            window.ComponentLoader.load('header', '[data-component="header"]', {
                onLoad: function(target) {
                    setTimeout(() => {
                        if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
                            Navigation.init();
                        } else if (window.Navigation && typeof window.Navigation.init === 'function') {
                            window.Navigation.init();
                        }
                    }, 200);
                }
            });
        }
    }

    // Экспорт
    window.NavigationRenderer = {
        render: render
    };
})();

