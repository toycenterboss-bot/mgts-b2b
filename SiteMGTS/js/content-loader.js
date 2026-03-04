/**
 * Content Loader
 * Загружает контент страниц через iframe или fetch API
 */

(function() {
    'use strict';

    // Загрузка контента через iframe
    function loadContentIframe(contentPath, targetSelector, options = {}) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.warn(`Target selector not found: ${targetSelector}`);
            return false;
        }
        
        // Очищаем предыдущий контент
        target.innerHTML = '';
        
        const iframe = document.createElement('iframe');
        iframe.src = contentPath;
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = 'auto';
        iframe.style.display = 'block';
        iframe.style.minHeight = '400px';
        
        iframe.onload = function() {
            // Синхронизация высоты iframe с содержимым
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const body = iframeDoc.body;
                const html = iframeDoc.documentElement;
                
                // Устанавливаем высоту на основе содержимого
                const height = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                );
                
                iframe.style.height = (height + 20) + 'px';
                
                // Обновляем высоту при изменении размера окна
                window.addEventListener('resize', function() {
                    const newHeight = Math.max(
                        body.scrollHeight,
                        body.offsetHeight,
                        html.clientHeight,
                        html.scrollHeight,
                        html.offsetHeight
                    );
                    iframe.style.height = (newHeight + 20) + 'px';
                });
            } catch (e) {
                // CORS ограничения - используем фиксированную высоту
                console.warn('Cannot access iframe content due to CORS, using fixed height');
                iframe.style.height = options.height || '800px';
            }
            
            if (options.onLoad) {
                options.onLoad(iframe);
            }
        };
        
        iframe.onerror = function() {
            console.error(`Failed to load content: ${contentPath}`);
            target.innerHTML = '<p style="padding: 20px; color: var(--color-error);">Ошибка загрузки контента</p>';
        };
        
        target.appendChild(iframe);
        return true;
    }

    // Загрузка контента через fetch API (лучше для SEO)
    async function loadContent(contentPath, targetSelector, options = {}) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.warn(`Target selector not found: ${targetSelector}`);
            return false;
        }
        
        try {
            const response = await fetch(contentPath);
            if (!response.ok) {
                throw new Error(`Failed to load content: ${contentPath}`);
            }
            
            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Извлекаем только содержимое body (или main, если есть)
            let content = tempDiv.querySelector('main') || tempDiv.querySelector('body') || tempDiv;
            
            // Обновляем пути в контенте
            if (options.basePath) {
                updateContentPaths(content, options.basePath);
            }
            
            // Вставляем контент
            target.innerHTML = content.innerHTML;
            
            // Выполняем скрипты из загруженного контента
            const scripts = content.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                target.appendChild(newScript);
            });
            
            if (options.onLoad) {
                options.onLoad(target);
            }
            
            return true;
        } catch (error) {
            console.error(`Error loading content ${contentPath}:`, error);
            target.innerHTML = '<p style="padding: 20px; color: var(--color-error);">Ошибка загрузки контента</p>';
            return false;
        }
    }

    // Обновление путей в контенте
    function updateContentPaths(element, basePath) {
        if (!basePath) return;
        
        // Обновляем ссылки
        const links = element.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
                link.setAttribute('href', basePath + href);
            }
        });
        
        // Обновляем изображения
        const images = element.querySelectorAll('img[src]');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                img.setAttribute('src', basePath + src);
            }
        });
    }

    // Экспорт функций
    window.ContentLoader = {
        load: loadContent,
        loadIframe: loadContentIframe
    };
})();

