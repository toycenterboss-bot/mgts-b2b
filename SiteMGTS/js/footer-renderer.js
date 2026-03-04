/**
 * Footer Renderer
 * Рендерит футер из данных Strapi API
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
    }

    /**
     * Рендеринг футера
     */
    async function render(targetSelector) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.warn(`[FooterRenderer] Target selector "${targetSelector}" not found.`);
            return Promise.reject(new Error('Target not found'));
        }

        // Проверяем, не заполнен ли уже футер статичным HTML
        if (target.innerHTML.trim() !== '' && target.querySelector('footer')) {
            console.log('[FooterRenderer] Footer placeholder already has content, clearing...');
            target.innerHTML = '';
        }

        if (!window.StrapiAPI) {
            console.warn('[FooterRenderer] StrapiAPI not available, falling back to static.');
            renderStatic(target);
            return Promise.resolve();
        }

        try {
            console.log('[FooterRenderer] Loading footer from API...');
            const footerResponse = await window.StrapiAPI.getFooter();
            
            // Логируем структуру ответа для отладки
            console.log('[FooterRenderer] API response:', footerResponse);
            
            // Проверяем структуру ответа
            // Endpoint /pages/footer возвращает: { data: { sections: [...], copyright: ..., legalLinks: [...] } }
            if (!footerResponse || !footerResponse.data) {
                console.warn('[FooterRenderer] No footer data received from API, falling back to static.');
                console.warn('[FooterRenderer] Response:', footerResponse);
                renderStatic(target);
                return Promise.resolve();
            }
            
            // Используем data напрямую
            const footerData = footerResponse.data;
            
            console.log('[FooterRenderer] Extracted footer data:', footerData);

            // Проверяем наличие данных (sections или copyright)
            if (!footerData.sections && !footerData.copyright && !footerData.data) {
                console.warn('[FooterRenderer] Footer data structure is invalid, falling back to static.');
                console.warn('[FooterRenderer] Data structure:', JSON.stringify(footerData, null, 2));
                renderStatic(target);
                return Promise.resolve();
            }
            
            // Endpoint /pages/footer возвращает { data: { sections: [...], copyright: ..., legalLinks: [...] } }
            // Используем data напрямую
            const data = footerData;

            const basePath = getBasePath();
            let footerHtml = `
                <footer class="footer" role="contentinfo">
                    <div class="container">
                        <div class="footer-content">
            `;

            // Footer Sections
            if (data.sections && Array.isArray(data.sections)) {
                data.sections
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .forEach(section => {
                        footerHtml += `
                            <div class="footer-section">
                                <h4>${section.title}</h4>
                                <ul class="footer-links" role="list">
                        `;
                        if (section.links && Array.isArray(section.links)) {
                            section.links.forEach(link => {
                                const linkHref = link.href.startsWith('http') || link.href.startsWith('tel:') || link.href.startsWith('mailto:') || link.href.startsWith('/')
                                    ? link.href
                                    : basePath + link.href;
                                
                                // Добавляем aria-label для специальных ссылок
                                let ariaLabel = '';
                                if (link.href.startsWith('tel:')) {
                                    ariaLabel = ` aria-label="Позвонить по телефону ${link.label}"`;
                                } else if (link.href.startsWith('mailto:')) {
                                    ariaLabel = ` aria-label="Написать на email ${link.label}"`;
                                }
                                
                                footerHtml += `<li><a href="${linkHref}"${ariaLabel} ${link.isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} data-base-path>${link.label}</a></li>`;
                            });
                        }
                        footerHtml += `
                                </ul>
                            </div>
                        `;
                    });
            }

            footerHtml += `
                        </div>
                        <div class="footer-bottom">
                            <p>${data.copyright || '© 2025 МГТС. Все права защищены.'}</p>
            `;

            // Legal Links
            if (data.legalLinks && Array.isArray(data.legalLinks) && data.legalLinks.length > 0) {
                footerHtml += `<p style="margin-top: var(--spacing-sm);">`;
                data.legalLinks.forEach((link, index) => {
                    const linkHref = link.href.startsWith('http') || link.href.startsWith('/')
                        ? link.href
                        : basePath + link.href;
                    footerHtml += `<a href="${linkHref}" style="color: var(--color-gray-500);" ${link.isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>${link.label}</a>`;
                    if (index < data.legalLinks.length - 1) {
                        footerHtml += ` | `;
                    }
                });
                footerHtml += `</p>`;
            }

            footerHtml += `
                        </div>
                    </div>
                </footer>
            `;
            
            target.innerHTML = footerHtml;
            updatePaths(target, basePath);
            console.log('[FooterRenderer] Footer rendered from API successfully.');
            return Promise.resolve();

        } catch (error) {
            console.error('[FooterRenderer] Error rendering footer from API:', error);
            renderStatic(target);
            return Promise.reject(error);
        }
    }

    /**
     * Статический рендеринг (fallback)
     */
    function renderStatic(target) {
        console.log('[FooterRenderer] Rendering static footer.html');
        // Fallback to loading static footer.html if API fails
        if (window.ComponentLoader && typeof window.ComponentLoader.load === 'function') {
            window.ComponentLoader.load('footer', target.closest('[data-component="footer"]') ? '[data-component="footer"]' : target);
        }
    }

    // Экспорт
    window.FooterRenderer = {
        render: render
    };
})();
