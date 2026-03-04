/**
 * Components Loader
 * Загружает компоненты (header, footer, sidebar) на страницы
 */

(function() {
    'use strict';

    // Вычисление базового пути относительно корня сайта
    function getBasePath() {
        // Для file:// протокола - компоненты не будут работать из-за CORS
        // Но вычисляем путь для информативности
        if (window.location.protocol === 'file:') {
            const currentPath = window.location.pathname;
            // Для Windows: /C:/Users/... -> убираем первый слэш и разбиваем
            // Для Unix: /home/... -> разбиваем
            const pathParts = currentPath.split('/').filter(function(p) {
                return p && p !== 'index.html' && p !== 'test-components.html' && p.length > 0;
            });
            
            // Если файл в корне проекта (последний элемент - имя файла, перед ним может быть имя проекта)
            // Для test-components.html в корне: pathParts будет содержать только имя проекта или пусто
            // Определяем, в корне ли мы, проверяя количество элементов
            if (pathParts.length <= 1) {
                return '';
            }
            
            // Глубина = количество папок минус имя проекта (если есть)
            // Для файла в корне проекта depth = 0
            const fileName = currentPath.split('/').pop();
            const isInRoot = pathParts.length === 1 || (pathParts.length === 0);
            
            if (isInRoot) {
                return '';
            }
            
            // Для вложенных папок
            const depth = pathParts.length - 1; // -1 потому что последний элемент - это имя проекта или папки с файлом
            return '../'.repeat(Math.max(0, depth));
        }
        
        // Для HTTP протокола
        const path = window.location.pathname;
        // Убираем начальный слэш и разбиваем на части
        const parts = path.split('/').filter(function(p) {
            return p && p !== 'index.html' && p !== 'test-components.html' && p.length > 0;
        });
        
        // Если мы в корне (только index.html или пусто)
        if (parts.length === 0) {
            return '';
        }
        
        // Глубина = количество папок (не включая имя файла)
        // Например: /business/internet/office/index.html -> parts = ['business', 'internet', 'office'] -> depth = 3
        const depth = parts.length;
        return '../'.repeat(depth);
    }

    // Обновление путей в загруженном компоненте
    function updatePaths(element, basePath) {
        if (!basePath) {
            console.warn('[ComponentLoader] updatePaths: basePath is empty, skipping path updates');
            return;
        }
        
        console.log(`[ComponentLoader] updatePaths: basePath="${basePath}", element=`, element);
        
        // Определяем, находимся ли мы в разделе about/
        const currentPath = window.location.pathname;
        const isAboutSection = currentPath.includes('/about/');
        
        // Обновляем ссылки с атрибутом data-base-path
        const links = element.querySelectorAll('[data-base-path]');
        console.log(`[ComponentLoader] Found ${links.length} elements with data-base-path`);
        
        links.forEach(link => {
            if (link.tagName === 'A') {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
                    // Для sidebar-about ссылки уже содержат 'about/' в пути
                    // Просто добавляем базовый путь от текущей страницы
                    if (isAboutSection && element.closest('.sidebar-menu')) {
                        // Ссылки в sidebar уже содержат 'about/' в пути
                        // Например: 'about/ethics/general-director-message/index.html'
                        // Просто добавляем базовый путь от текущей страницы
                        // Результат: '../../about/ethics/general-director-message/index.html'
                        const finalHref = basePath + href;
                        
                        console.log('Sidebar link update:', {
                            currentPath: currentPath,
                            basePath: basePath,
                            originalHref: href,
                            finalHref: finalHref
                        });
                        
                        link.setAttribute('href', finalHref);
                    } else {
                        // Для остальных компонентов используем обычную логику
                        link.setAttribute('href', basePath + href);
                    }
                }
            } else if (link.tagName === 'IMG') {
                const src = link.getAttribute('src');
                if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
                    const newSrc = basePath + src;
                    link.setAttribute('src', newSrc);
                    console.log(`[ComponentLoader] Updated image path (data-base-path): ${src} -> ${newSrc}`);
                    // Принудительно обновить srcset, если есть
                    if (link.hasAttribute('srcset')) {
                        const srcset = link.getAttribute('srcset');
                        const newSrcset = srcset.split(',').map(item => {
                            const parts = item.trim().split(' ');
                            if (parts[0] && !parts[0].startsWith('http') && !parts[0].startsWith('data:') && !parts[0].startsWith('/')) {
                                return basePath + parts[0] + (parts[1] ? ' ' + parts[1] : '');
                            }
                            return item;
                        }).join(', ');
                        link.setAttribute('srcset', newSrcset);
                    }
                }
            }
        });
        
        // Обновляем все изображения (не только с data-base-path)
        const images = element.querySelectorAll('img');
        console.log(`[ComponentLoader] Found ${images.length} images total`);
        
        images.forEach(img => {
            const src = img.getAttribute('src');
            console.log(`[ComponentLoader] Processing image: src="${src}", has data-base-path=${img.hasAttribute('data-base-path')}`);
            
            // Пропускаем изображения, которые уже обработаны (с data-base-path)
            if (img.hasAttribute('data-base-path')) {
                console.log(`[ComponentLoader] Skipping image with data-base-path (already processed)`);
                return; // Уже обработано в цикле выше
            }
            
            if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
                // Если путь начинается с images/, добавляем basePath
                if (src.startsWith('images/')) {
                    const newSrc = basePath + src;
                    img.setAttribute('src', newSrc);
                    console.log(`[ComponentLoader] Updated image path: ${src} -> ${newSrc}`);
                } else if (!src.includes('../') && !src.includes('..\\')) {
                    // Относительный путь без ../ - добавляем basePath
                    const newSrc = basePath + src;
                    img.setAttribute('src', newSrc);
                    console.log(`[ComponentLoader] Updated image path: ${src} -> ${newSrc}`);
                }
            }
        });
    }

    // Загрузка компонента через XMLHttpRequest (альтернатива fetch)
    function loadComponentXHR(componentPath, callback) {
        console.log(`[ComponentLoader] XHR: Loading from ${componentPath}`);
        const xhr = new XMLHttpRequest();
        xhr.open('GET', componentPath, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) { // 0 для file:// протокола
                    console.log(`[ComponentLoader] XHR: Successfully loaded from ${componentPath}`);
                    callback(null, xhr.responseText);
                } else {
                    const error = new Error(`XHR failed: ${xhr.status} ${xhr.statusText}`);
                    console.error(`[ComponentLoader] XHR: Error loading ${componentPath}:`, error);
                    callback(error, null);
                }
            }
        };
        xhr.onerror = function() {
            const error = new Error('XHR network error');
            console.error(`[ComponentLoader] XHR: Network error loading ${componentPath}:`, error);
            callback(error, null);
        };
        xhr.send();
    }

    // Загрузка компонента
    async function loadComponent(componentName, targetSelector, options = {}) {
        const basePath = options.basePath || getBasePath();
        const componentPath = basePath + 'components/' + componentName + '.html';
        
        // Отладочная информация
        console.log(`[ComponentLoader] Loading component: ${componentName}`);
        console.log(`[ComponentLoader] Base path: "${basePath}"`);
        console.log(`[ComponentLoader] Component path: "${componentPath}"`);
        console.log(`[ComponentLoader] Current location: ${window.location.pathname}`);
        console.log(`[ComponentLoader] Full URL: ${window.location.href}`);
        
        return new Promise(function(resolve, reject) {
            // Пробуем сначала fetch
            if (typeof fetch !== 'undefined') {
                fetch(componentPath)
                    .then(function(response) {
                        if (!response.ok) {
                            const errorMsg = `Failed to load component: ${componentName} (${response.status} ${response.statusText})`;
                            console.error(`[ComponentLoader] ${errorMsg}`);
                            console.error(`[ComponentLoader] Requested URL: ${componentPath}`);
                            console.error(`[ComponentLoader] Response status: ${response.status}`);
                            throw new Error(errorMsg);
                        }
                        return response.text();
                    })
                    .then(function(html) {
                        console.log(`[ComponentLoader] Component ${componentName} loaded successfully`);
                        processComponentHTML(html, componentName, targetSelector, basePath, options, resolve, reject);
                    })
                    .catch(function(error) {
                        // Если fetch не сработал, пробуем XHR
                        console.warn(`[ComponentLoader] Fetch failed for ${componentName}, trying XHR:`, error);
                        loadComponentXHR(componentPath, function(err, html) {
                            if (err) {
                                console.error(`[ComponentLoader] Error loading component ${componentName} from ${componentPath}:`, err);
                                console.error(`[ComponentLoader] Base path: "${basePath}"`);
                                console.error(`[ComponentLoader] Full path: "${componentPath}"`);
                                console.error(`[ComponentLoader] Current pathname: ${window.location.pathname}`);
                                console.error(`[ComponentLoader] Current href: ${window.location.href}`);
                                
                                // Показываем пользователю понятное сообщение
                                const target = document.querySelector(targetSelector);
                                if (target) {
                                    target.innerHTML = `<div style="padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24;">
                                        <strong>Ошибка загрузки компонента ${componentName}</strong><br>
                                        Путь: ${componentPath}<br>
                                        Проверьте консоль браузера для деталей.
                                    </div>`;
                                }
                                
                                reject(err);
                            } else {
                                console.log(`[ComponentLoader] Component ${componentName} loaded via XHR`);
                                processComponentHTML(html, componentName, targetSelector, basePath, options, resolve, reject);
                            }
                        });
                    });
            } else {
                // Используем XHR если fetch недоступен
                loadComponentXHR(componentPath, function(err, html) {
                    if (err) {
                        console.error(`[ComponentLoader] Error loading component ${componentName} from ${componentPath}:`, err);
                        reject(err);
                    } else {
                        processComponentHTML(html, componentName, targetSelector, basePath, options, resolve, reject);
                    }
                });
            }
        });
    }

    // Обработка HTML компонента
    function processComponentHTML(html, componentName, targetSelector, basePath, options, resolve, reject) {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Обновляем пути ПЕРЕД вставкой в DOM
            updatePaths(tempDiv, basePath);
            
            // Вставляем компонент
            const target = document.querySelector(targetSelector);
            if (target) {
                // ВАЖНО: Сначала очищаем target, чтобы предотвратить загрузку изображений с неправильными путями
                target.innerHTML = '';
                
                // Используем appendChild вместо innerHTML для более контролируемой вставки
                // Клонируем все узлы из tempDiv
                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                target.appendChild(fragment);
                
                // Дополнительно обновляем пути в уже вставленном элементе
                // (на случай, если что-то пропустили)
                updatePaths(target, basePath);
                
                // Принудительно обновить все изображения еще раз
                const images = target.querySelectorAll('img');
                images.forEach(img => {
                    const src = img.getAttribute('src');
                    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
                        if (src.startsWith('images/') || (!src.includes('../') && !src.includes('..\\'))) {
                            const newSrc = basePath + (src.startsWith('images/') ? src : 'images/' + src);
                            const currentSrc = img.getAttribute('src');
                            if (currentSrc !== newSrc) {
                                // Удаляем старый src, чтобы предотвратить загрузку
                                img.removeAttribute('src');
                                // Устанавливаем новый src
                                img.setAttribute('src', newSrc);
                                console.log(`[ComponentLoader] Force updated image: ${currentSrc} -> ${newSrc}`);
                            }
                        }
                    }
                });
                
                // Инициализируем компонент, если есть функция
                if (options.onLoad) {
                    options.onLoad(target);
                }
                
                resolve(true);
            } else {
                const error = new Error(`Target selector not found: ${targetSelector}`);
                console.warn(error.message);
                reject(error);
            }
        } catch (error) {
            console.error(`Error processing component ${componentName}:`, error);
            reject(error);
        }
    }

    // Загрузка компонента через iframe (альтернативный метод)
    function loadComponentIframe(componentName, targetSelector, options = {}) {
        const basePath = options.basePath || getBasePath();
        const componentPath = basePath + 'components/' + componentName + '.html';
        const target = document.querySelector(targetSelector);
        
        if (!target) {
            console.warn(`Target selector not found: ${targetSelector}`);
            return false;
        }
        
        const iframe = document.createElement('iframe');
        iframe.src = componentPath;
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = 'auto';
        iframe.style.display = 'block';
        
        if (options.height) {
            iframe.style.height = options.height;
        }
        
        iframe.onload = function() {
            // Синхронизация высоты iframe с содержимым
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                iframe.style.height = iframeDoc.body.scrollHeight + 'px';
            } catch (e) {
                // CORS ограничения
                console.warn('Cannot access iframe content due to CORS');
            }
            
            if (options.onLoad) {
                options.onLoad(iframe);
            }
        };
        
        target.appendChild(iframe);
        return true;
    }

    // Инициализация компонентов при загрузке страницы
    function initComponents() {
        // Загружаем header (сначала пробуем из API, затем fallback на статический)
        const headerPlaceholder = document.querySelector('[data-component="header"]');
        if (headerPlaceholder) {
            // Пробуем загрузить из API через NavigationRenderer
            if (window.NavigationRenderer && typeof window.NavigationRenderer.render === 'function') {
                window.NavigationRenderer.render('[data-component="header"]').then(function() {
                    if (typeof initNavigation === 'function') {
                        initNavigation();
                    }
                }).catch(function(error) {
                    console.error('Failed to load header from API:', error);
                    // Fallback на статический компонент
                    loadComponent('header', '[data-component="header"]', {
                        onLoad: function(target) {
                            setTimeout(function() {
                                initNavigation();
                            }, 200);
                        }
                    }).catch(function(err) {
                        console.error('Failed to load header:', err);
                        handleComponentError(headerPlaceholder, 'header');
                    });
                });
            } else {
                // Если NavigationRenderer еще не загружен, используем статический компонент
                loadComponent('header', '[data-component="header"]', {
                    onLoad: function(target) {
                        setTimeout(function() {
                            initNavigation();
                        }, 200);
                    }
                }).catch(function(error) {
                    console.error('Failed to load header:', error);
                    handleComponentError(headerPlaceholder, 'header');
                });
            }
        }
        
        // Загружаем footer (сначала пробуем из API, затем fallback на статический)
        const footerPlaceholder = document.querySelector('[data-component="footer"]');
        if (footerPlaceholder) {
            // Проверяем, не заполнен ли уже футер статичным HTML
            if (footerPlaceholder.innerHTML.trim() !== '' && footerPlaceholder.querySelector('footer')) {
                console.log('[ComponentLoader] Footer already has content, clearing for CMS footer...');
                footerPlaceholder.innerHTML = '';
            }
            
            // Пробуем загрузить из API через FooterRenderer
            if (window.FooterRenderer && typeof window.FooterRenderer.render === 'function') {
                // FooterRenderer.render возвращает Promise или undefined
                const renderPromise = window.FooterRenderer.render('[data-component="footer"]');
                if (renderPromise && typeof renderPromise.catch === 'function') {
                    renderPromise.catch(function(error) {
                        console.error('Failed to load footer from API:', error);
                        // Fallback на статический компонент
                        loadComponent('footer', '[data-component="footer"]').catch(function(err) {
                            console.error('Failed to load footer:', err);
                            handleComponentError(footerPlaceholder, 'footer');
                        });
                    });
                }
            } else {
                // Если FooterRenderer еще не загружен, ждем немного и пробуем снова
                setTimeout(function() {
                    if (window.FooterRenderer && typeof window.FooterRenderer.render === 'function') {
                        const renderPromise = window.FooterRenderer.render('[data-component="footer"]');
                        if (renderPromise && typeof renderPromise.catch === 'function') {
                            renderPromise.catch(function(error) {
                                console.error('Failed to load footer from API (retry):', error);
                                loadComponent('footer', '[data-component="footer"]').catch(function(err) {
                                    console.error('Failed to load footer:', err);
                                    handleComponentError(footerPlaceholder, 'footer');
                                });
                            });
                        } else {
                            // Если render не вернул Promise, пробуем статический компонент
                            loadComponent('footer', '[data-component="footer"]').catch(function(error) {
                                console.error('Failed to load footer:', error);
                                handleComponentError(footerPlaceholder, 'footer');
                            });
                        }
                    } else {
                        // Если FooterRenderer все еще не загружен, используем статический компонент
                        loadComponent('footer', '[data-component="footer"]').catch(function(error) {
                            console.error('Failed to load footer:', error);
                            handleComponentError(footerPlaceholder, 'footer');
                        });
                    }
                }, 200);
            }
        }
        
        // Загружаем sidebar для раздела "О компании"
        const sidebarPlaceholder = document.querySelector('[data-component="sidebar-about"]');
        if (sidebarPlaceholder) {
            loadComponent('sidebar-about', '[data-component="sidebar-about"]', {
                onLoad: function(target) {
                    // Инициализируем боковое меню
                    setTimeout(function() {
                        initSidebarMenu();
                    }, 100);
                }
            }).catch(function(error) {
                console.error('Failed to load sidebar:', error);
                if (window.location.protocol === 'file:') {
                    sidebarPlaceholder.innerHTML = '<div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;">Используйте HTTP сервер для загрузки компонентов.</div>';
                } else {
                    sidebarPlaceholder.innerHTML = '<p style="padding: 20px; color: red;">Ошибка загрузки sidebar. Проверьте консоль браузера.</p>';
                }
            });
        }
    }

    // Инициализация навигации
    function initNavigation() {
        // Пробуем разные варианты доступа к Navigation
        if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
            Navigation.init();
        } else if (window.Navigation && typeof window.Navigation.init === 'function') {
            window.Navigation.init();
        } else {
            // Ждем загрузки main.js
            setTimeout(function() {
                if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
                    Navigation.init();
                } else if (window.Navigation && typeof window.Navigation.init === 'function') {
                    window.Navigation.init();
                } else {
                    console.warn('Navigation.init not found. Make sure js/main.js is loaded.');
                }
            }, 300);
        }
    }

    // Инициализация бокового меню
    function initSidebarMenu() {
        const sidebarMenu = document.querySelector('.sidebar-menu');
        if (!sidebarMenu) return;
        
        const parentLinks = sidebarMenu.querySelectorAll('.sidebar-parent');
        let hoverTimeout = null;
        
        parentLinks.forEach(parentLink => {
            const submenu = parentLink.nextElementSibling;
            if (submenu && submenu.classList.contains('sidebar-submenu')) {
                const parentLi = parentLink.closest('li');
                
                parentLi.addEventListener('mouseenter', function() {
                    clearTimeout(hoverTimeout);
                    submenu.style.maxHeight = '500px';
                    parentLi.classList.add('active');
                });
                
                parentLi.addEventListener('mouseleave', function(e) {
                    const relatedTarget = e.relatedTarget;
                    if (!parentLi.contains(relatedTarget)) {
                        hoverTimeout = setTimeout(() => {
                            submenu.style.maxHeight = '0';
                            parentLi.classList.remove('active');
                        }, 500);
                    }
                });
                
                submenu.addEventListener('mouseenter', function() {
                    clearTimeout(hoverTimeout);
                    submenu.style.maxHeight = '500px';
                    parentLi.classList.add('active');
                });
                
                submenu.addEventListener('mouseleave', function() {
                    hoverTimeout = setTimeout(() => {
                        submenu.style.maxHeight = '0';
                        parentLi.classList.remove('active');
                    }, 500);
                });
            }
        });
        
        // Определение активного пункта меню
        const currentPath = window.location.pathname;
        const sidebarLinks = sidebarMenu.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            try {
                const linkPath = new URL(link.href).pathname;
                const currentPathClean = currentPath.replace(/\/$/, '');
                const linkPathClean = linkPath.replace(/\/$/, '');
                
                if (currentPath.endsWith(linkPath) || currentPath === linkPath || 
                    currentPathClean === linkPathClean ||
                    currentPath.includes(linkPathClean) || linkPathClean.includes(currentPathClean)) {
                    link.style.backgroundColor = 'var(--color-primary)';
                    link.style.color = 'white';
                    link.style.fontWeight = 'var(--font-weight-medium)';
                    
                    const parentLi = link.closest('li.sidebar-has-submenu');
                    if (parentLi) {
                        const submenu = parentLi.querySelector('.sidebar-submenu');
                        if (submenu) {
                            submenu.style.maxHeight = '500px';
                            parentLi.classList.add('active');
                        }
                    }
                }
            } catch(e) {
                // Игнорируем ошибки парсинга URL
            }
        });
    }

    // Обработка ошибок загрузки компонентов
    function handleComponentError(placeholder, componentName) {
        const basePath = getBasePath();
        console.error(`Base path: ${basePath}`);
        console.error(`Component path should be: ${basePath}components/${componentName}.html`);
        
        if (window.location.protocol === 'file:') {
            placeholder.innerHTML = '<div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;"><strong>Внимание!</strong> Для работы компонентов необходимо использовать локальный HTTP сервер.<br><br>Запустите: <code>python -m http.server 8000</code><br>Затем откройте: <code>http://localhost:8000</code></div>';
        } else {
            placeholder.innerHTML = `<p style="padding: 20px; color: red;">Ошибка загрузки ${componentName}. Проверьте консоль браузера.</p>`;
        }
    }

    // Экспорт функций
    window.ComponentLoader = {
        load: loadComponent,
        loadIframe: loadComponentIframe,
        init: initComponents,
        getBasePath: getBasePath
    };

    // Автоматическая инициализация при загрузке DOM
    function startInit() {
        // Небольшая задержка для обеспечения загрузки всех скриптов
        setTimeout(function() {
            initComponents();
        }, 50);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInit);
    } else {
        startInit();
    }
})();

