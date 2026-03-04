/**
 * CMS Loader - Загрузка контента из Strapi API
 * Работает вместе с components-loader.js
 */

(function() {
    'use strict';

    // Проверка, использовать ли API
    // По умолчанию используем API на localhost, можно отключить через ?cms=false
    const USE_CMS_API = window.location.search.includes('cms=false') ? false :
                        window.location.search.includes('cms=true') ? true :
                        localStorage.getItem('useCMS') === 'false' ? false :
                        localStorage.getItem('useCMS') === 'true' ? true :
                        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Извлечение slug из пути
    function extractSlugFromPath(pathname) {
        // Преобразовать /about_mgts/index.html -> about_mgts
        // Или /about_mgts/about_registrar/index.html -> about_mgts/about_registrar
        // Или /business/internet/index.html -> business/internet
        // Для главной страницы (пустой путь или только index.html) -> home (slug в Strapi)
        // В Strapi главная страница имеет slug "home" с оригинальным URL "https://business.mgts.ru/"
        
        // Убрать начальный и конечный слэш, разбить по слэшам
        const cleanPath = pathname.replace(/^\/|\/$/g, '').replace(/index\.html$/, '');
        const parts = cleanPath.split('/').filter(p => p && p !== 'index.html' && p !== 'page-template.html');
        
        // Если путь пустой или содержит только index.html - это главная страница
        // В Strapi главная страница имеет slug "home"
        if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index')) {
            return 'home';
        }
        
        const slug = parts.join('/');
        
        // Если slug пустой - это главная страница
        if (!slug || slug === '') {
            return 'home';
        }
        
        return slug;
    }

    // Загрузка контента страницы из API
    async function loadPageFromAPI(slug, bypassCache = false) {
        if (!window.StrapiAPI) {
            console.warn('StrapiAPI not available, using static content');
            return null;
        }

        try {
            console.log(`[CMS Loader] Loading page from API: ${slug}${bypassCache ? ' (bypassing cache)' : ''}`);
            const page = await window.StrapiAPI.getPage(slug, bypassCache);
            
            // Нормализуем структуру для Strapi v5 (данные могут быть на верхнем уровне)
            let pageData = null;
            
            if (page && page.data) {
                // Структура Strapi v4: { data: { attributes: {...} } }
                pageData = page.data.attributes || page.data;
                console.log(`[CMS Loader] Page loaded successfully (v4 format): ${slug}`);
            } else if (page) {
                // Структура Strapi v5: данные на верхнем уровне
                pageData = page.attributes || page;
                console.log(`[CMS Loader] Page loaded successfully (v5 format): ${slug}`);
            } else {
                // Попробуем альтернативный метод
                const pageAlt = await window.StrapiAPI.getPageBySlug(slug);
                if (pageAlt) {
                    console.log(`[CMS Loader] Page loaded via alternative method: ${slug}`);
                    // getPageBySlug уже нормализует структуру
                    pageData = pageAlt.data || pageAlt;
                }
            }
            
            if (pageData) {
                // Убеждаемся, что контент доступен
                if (pageData.content) {
                    console.log(`[CMS Loader] Page content found, length: ${pageData.content.length}`);
                } else {
                    console.warn(`[CMS Loader] Page loaded but no content field found`);
                }
                return pageData;
            }
            
            console.warn(`[CMS Loader] Page not found in CMS: ${slug}`);
            return null;
        } catch (error) {
            console.error(`[CMS Loader] Error loading page ${slug}:`, error);
            return null;
        }
    }

    // Рендеринг Hero секции
    function renderHero(container, heroData) {
        let heroSection = container.querySelector('.hero');
        
        if (!heroSection) {
            heroSection = document.createElement('section');
            heroSection.className = 'hero';
            container.insertBefore(heroSection, container.firstChild);
        }

        const heroContent = heroSection.querySelector('.hero-content') || 
                           (() => {
                               const div = document.createElement('div');
                               div.className = 'hero-content';
                               heroSection.appendChild(document.createElement('div')).className = 'container';
                               heroSection.querySelector('.container').appendChild(div);
                               return div;
                           })();

        if (heroData.heroTitle) {
            let title = heroContent.querySelector('h1');
            if (!title) {
                title = document.createElement('h1');
                heroContent.insertBefore(title, heroContent.firstChild);
            }
            title.textContent = heroData.heroTitle;
        }

        if (heroData.heroSubtitle) {
            let subtitle = heroContent.querySelector('p');
            if (!subtitle) {
                subtitle = document.createElement('p');
                heroContent.appendChild(subtitle);
            }
            subtitle.textContent = heroData.heroSubtitle;
        }
    }

    // Функция для получения типа карточки с приоритетом:
    // 1. data-card-type атрибут (из CMS)
    // 2. Класс service-card (если есть, то по умолчанию service)
    // 3. gridType (если задан для всей секции и не mixed)
    // 4. Автоопределение
    function getCardType(card, gridType = null) {
        const hasServiceClass = card.classList.contains('service-card');
        const hasServiceStructure = card.querySelector('.service-card-body') && card.querySelector('.service-card-icon');
        const hasTariffStructure = card.querySelector('.card-header') && card.querySelector('.card-body') && card.querySelector('.card-footer');
        
        // КРИТИЧНО: Сначала проверим, есть ли цена - это ПРИОРИТЕТ над всем остальным
        // НО: если карточка имеет класс service-card, цена должна быть явной (содержать "₽", "руб" или "мес")
        const content = card.textContent.toLowerCase();
        // Более строгое регулярное выражение для поиска цены
        // Ищем: "от X ₽/мес", "X руб/мес", "X ₽", "X рублей" и т.д.
        const hasPrice = /(от\s*)?[\d\s]+[\s₽рубР]+(?:\/?мес|месяц)/i.test(content) || 
                        /[\d\s]+[\s₽рубР]+(?!\s*(год|лет|года|лета))/i.test(content) ||
                        /\d+\s*(₽|руб|рублей|руб\.)(?:\s*\/\s*мес|месяц)?/i.test(content);
        
        // Если есть цена - это ТАРИФ, независимо от класса или других признаков
        if (hasPrice) {
            console.log('[CMS Loader] Card has PRICE - forcing TARIFF type:', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            return 'tariff';
        }
        
        // Если карточка имеет класс service-card, но не имеет service структуры - принудительно service
        if (hasServiceClass && !hasServiceStructure && hasTariffStructure) {
            console.warn('[CMS Loader] Card has service-card class but tariff structure, forcing service type');
            return 'service';
        }
        
        // 1. Проверить data-атрибут карточки (явно заданный тип из CMS)
        const cardTypeAttr = card.getAttribute('data-card-type');
        if (cardTypeAttr && ['navigation', 'info', 'service', 'tariff'].includes(cardTypeAttr)) {
            console.log('[CMS Loader] Card type from data-attribute:', cardTypeAttr, 'for:', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            // Если в data-атрибуте service, но структура tariff - принудительно service
            if (cardTypeAttr === 'service' && hasTariffStructure && !hasServiceStructure) {
                console.warn('[CMS Loader] Card has data-card-type=service but tariff structure, forcing service');
                return 'service';
            }
            return cardTypeAttr;
        }
        
        // 2. КРИТИЧНО: Если карточка имеет класс service-card, по умолчанию это service
        // (если нет явных признаков тарифа - цена уже проверена выше)
        if (hasServiceClass) {
            // Проверить, есть ли явные признаки тарифа (условия тарифа + функции)
            const hasTariffConditions = /(до|от)\s*\d+\s*(номер|канал|мбит|гбит|линий|пользовател)/i.test(content);
            const hasFeatures = /[✓✔✗✘•]/.test(content) || card.querySelectorAll('li').length > 0;
            
            // Если есть условия тарифа И функции - это может быть тариф, но только если нет класса service-card
            // Но так как у нас есть класс service-card, это service
            console.log('[CMS Loader] Card has service-card class, defaulting to SERVICE type:', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            return 'service';
        }
        
        // 3. Проверить gridType (если задан для всей секции и не mixed)
        if (gridType && gridType !== 'mixed' && ['navigation', 'info', 'service', 'tariff'].includes(gridType)) {
            console.log('[CMS Loader] Card type from gridType:', gridType, 'for:', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            // Если gridType service, но структура tariff - принудительно service
            if (gridType === 'service' && hasTariffStructure && !hasServiceStructure) {
                console.warn('[CMS Loader] Card has gridType=service but tariff structure, forcing service');
                return 'service';
            }
            return gridType;
        }
        
        // 4. Автоопределение (текущая логика)
        const detectedType = detectCardType(card);
        return detectedType;
    }
    
    // Функция для определения типа карточки (автоопределение)
    // ВАЖНО: Эта функция вызывается только если карточка НЕ имеет класса service-card
    // (проверка на service-card выполняется в getCardType ДО вызова этой функции)
    function detectCardType(card) {
        const content = card.textContent.toLowerCase();
        const innerHTML = card.innerHTML;
        
        // ПРИОРИТЕТ 1: Признаки тарифной карточки (проверяем ПЕРВЫМИ, т.к. цена - главный признак тарифа)
        // - наличие цены (₽, руб, мес) - САМЫЙ ВАЖНЫЙ ПРИЗНАК
        const hasPrice = /(от\s*)?[\d\s]+[\s₽рубР]+\/?мес?/i.test(content) || 
                        /[\d\s]+[\s₽рубР]+/i.test(content) ||
                        /\d+\s*(₽|руб|рублей|руб\.)/i.test(content);
        // - наличие условий потребления (номеров, каналов, Мбит/с)
        const hasTariffConditions = /(до|от)\s*\d+\s*(номер|канал|мбит|гбит|линий|пользовател)/i.test(content);
        // - наличие списка функций с галочками
        const hasFeatures = /[✓✔✗✘•]/.test(content) || card.querySelectorAll('li').length > 0;
        
        // КРИТИЧНО: Если есть цена - это ТАРИФ, независимо от наличия иконки
        if (hasPrice) {
            console.log('[CMS Loader] Card detected as TARIFF (has price):', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            return 'tariff';
        }
        
        // Если есть условия тарифа И функции - тоже тариф
        if (hasTariffConditions && hasFeatures) {
            console.log('[CMS Loader] Card detected as TARIFF (has tariff conditions + features):', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            return 'tariff';
        }
        
        // ПРИОРИТЕТ 2: Признаки карточки услуги (только если НЕТ цены)
        // - есть описание услуги
        const hasServiceDescription = content.length > 50 && !hasPrice;
        // Проверяем иконку: img, service-card-icon, классы с icon, эмодзи в HTML, или div с font-size содержащий эмодзи
        const hasIcon = card.querySelector('img, .service-card-icon, [class*="icon"]') || 
                       /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️]/u.test(innerHTML) ||
                       (card.querySelector('div[style*="font-size"]') && /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️]/u.test(innerHTML));
        
        // Явная проверка: если есть div с font-size и эмодзи - это service card (но только если НЕТ цены)
        const hasEmojiInDiv = card.querySelector('div[style*="font-size"]') && /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️]/u.test(innerHTML);
        
        if (hasEmojiInDiv || (hasServiceDescription && hasIcon)) {
            console.log('[CMS Loader] Card detected as SERVICE (has icon/emoji, no price):', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
            return 'service';
        }
        
        // По умолчанию: если есть функции - тариф, иначе service
        // НО: если карточка имеет класс service-card, это должно быть обработано в getCardType ДО вызова этой функции
        const defaultType = hasFeatures ? 'tariff' : 'service';
        console.log('[CMS Loader] Card detected as', defaultType.toUpperCase(), '(default):', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
        return defaultType;
    }

    // Функция для преобразования простых карточек в структуру тарифов или услуг
    function enhanceTariffCards(container, gridType = null) {
        if (!container) return;
        
        // КРИТИЧНО: Проверить, является ли контейнер или его родитель частью нормализованного компонента
        // Если да, не обрабатывать карточки - они уже нормализованы
        const normalizedComponents = ['section-text', 'section-cards', 'section-grid', 'section-map', 
                                     'service-tariffs', 'service-faq', 'service-order-form',
                                     'history-timeline', 'mobile-app-section', 'crm-cards',
                                     'files-table', 'tariff-table', 'how-to-connect',
                                     'image-carousel', 'image-switcher'];
        
        const isInNormalizedSection = normalizedComponents.some(comp => {
            return container.closest(`section.${comp}, .${comp}`) !== null || 
                   container.classList.contains(comp) ||
                   container.querySelector(`section.${comp}, .${comp}`) !== null;
        });
        
        if (isInNormalizedSection) {
            console.log('[CMS Loader] Container is part of normalized component - skipping card enhancement');
            return;
        }
        
        // Найти все карточки, которые еще не имеют правильной структуры
        const cards = container.querySelectorAll('.card, .service-card');
        
        cards.forEach(card => {
            // КРИТИЧНО: Если карточка имеет класс service-card, обрабатываем её как service БЕЗ проверки типа
            if (card.classList.contains('service-card')) {
                // Проверить, не обработана ли уже как service
                const hasServiceStructure = card.querySelector('.service-card-body') && card.querySelector('.service-card-icon');
                
                // Если уже обработана, пропустить
                if (hasServiceStructure) {
                    return;
                }
                
                // КРИТИЧНО: Проверить, находится ли карточка в нормализованной секции
                const parentNormalizedSection = normalizedComponents.find(comp => {
                    return card.closest(`section.${comp}, .${comp}`) !== null;
                });
                
                if (parentNormalizedSection) {
                    console.log(`[CMS Loader] Card is in normalized section ${parentNormalizedSection} - skipping enhancement`);
                    return;
                }
                
                // Проверить, не обработана ли неправильно как tariff
                const hasTariffStructure = card.querySelector('.card-header') && card.querySelector('.card-body') && card.querySelector('.card-footer');
                if (hasTariffStructure) {
                    const cardTitle = card.querySelector('h3')?.textContent?.trim() || '';
                    console.warn('[CMS Loader] Card has service-card class but tariff structure, re-processing as service:', cardTitle);
                    // Сохранить оригинальное содержимое для повторной обработки
                    const originalContent = card.innerHTML;
                    // Очистить неправильную структуру
                    card.innerHTML = '';
                    // Восстановить оригинальное содержимое (без tariff структуры)
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = originalContent;
                    const h3 = tempDiv.querySelector('h3');
                    const paragraphs = tempDiv.querySelectorAll('p');
                    const description = paragraphs.length > 0 ? paragraphs[0].textContent.trim() : '';
                    // Восстановить простое содержимое
                    if (h3) {
                        card.innerHTML = h3.outerHTML;
                        if (description) {
                            card.innerHTML += `<p>${description}</p>`;
                        }
                    } else {
                        card.innerHTML = originalContent;
                    }
                }
                
                // Получить тип из data-атрибута или использовать 'service' по умолчанию
                const cardTypeAttr = card.getAttribute('data-card-type');
                const cardType = cardTypeAttr && ['navigation', 'info', 'service'].includes(cardTypeAttr) 
                    ? cardTypeAttr 
                    : 'service';
                
                console.log('[CMS Loader] Processing service-card as:', cardType, 'for:', card.querySelector('h3')?.textContent?.trim() || 'без заголовка');
                
                // Обработать как service карточку
                if (cardType === 'navigation') {
                    enhanceNavigationCard(card);
                } else if (cardType === 'info') {
                    enhanceInfoCard(card);
                } else {
                    enhanceServiceCard(card, cardType);
                }
                
                return; // Пропустить дальнейшую обработку
            }
            
            // Для обычных .card элементов - стандартная обработка
            // Проверить структуру карточки
            const hasTariffStructure = card.querySelector('.card-header') && card.querySelector('.card-body') && card.querySelector('.card-footer');
            const hasServiceStructure = card.querySelector('.service-card-body') && card.querySelector('.service-card-icon');
            
            if (hasTariffStructure && hasServiceStructure) {
                // Карточка имеет обе структуры - это ошибка, переобработаем
                console.warn('[CMS Loader] Card has both tariff and service structures, re-processing');
                card.innerHTML = '';
            } else if (hasTariffStructure || hasServiceStructure) {
                // Карточка уже правильно обработана
                return; // Пропустить уже правильно обработанные карточки
            }
            
            // Определить тип карточки с учетом данных из CMS
            const cardType = getCardType(card, gridType);
            const cardTitle = card.querySelector('h3')?.textContent?.trim() || '';
            console.log('[CMS Loader] Card type detected:', cardType, 'for card:', cardTitle, '(gridType:', gridType, ')');
            
            // Обработать карточку в зависимости от определенного типа
            if (cardType === 'tariff') {
                enhanceTariffCard(card);
            } else if (cardType === 'navigation') {
                // Navigation card - вся карточка должна быть ссылкой, кнопка не нужна
                enhanceNavigationCard(card);
            } else if (cardType === 'info') {
                // Info card - информационная карточка без ссылок, кнопка не нужна
                enhanceInfoCard(card);
            } else {
                // Service card - карточка услуги, может иметь ссылку
                enhanceServiceCard(card, cardType);
            }
        });
    }
    
    // Функция для преобразования карточки в структуру тарифа
    function enhanceTariffCard(card) {
        // КРИТИЧНО: Проверить, не является ли это service-card - если да, не обрабатывать как тариф
        if (card.classList.contains('service-card')) {
            console.warn('[CMS Loader] ⚠️ enhanceTariffCard called for service-card, skipping - should use enhanceServiceCard instead');
            return;
        }
        
        // Проверить, не обработана ли уже как service
        if (card.querySelector('.service-card-body') && card.querySelector('.service-card-icon')) {
            console.warn('[CMS Loader] ⚠️ enhanceTariffCard called for service card structure, skipping');
            return;
        }
        
        // Получить содержимое карточки
        const cardContent = card.innerHTML.trim();
        if (!cardContent) return;
        
        // Попытаться извлечь данные из содержимого
        // Ищем заголовок (h3 или первый жирный текст)
        let title = '';
        let mainText = '';
        let price = '';
        let features = [];
        
        // Создать временный контейнер для парсинга
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardContent;
        
        // Найти заголовок
        const h3 = tempDiv.querySelector('h3');
        if (h3) {
            title = h3.textContent.trim();
            h3.remove();
        } else {
            // Попробовать найти первый жирный текст
            const strong = tempDiv.querySelector('strong, b');
            if (strong) {
                title = strong.textContent.trim();
                strong.remove();
            }
        }
        
        // Найти основной текст (обычно самый большой)
        const allText = tempDiv.textContent.trim();
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
        
        // Попытаться найти цену (содержит ₽ или "от" или "мес")
        const pricePattern = /(от\s*)?[\d\s]+[\s₽рубР]+\/?мес?/i;
        const priceMatch = allText.match(pricePattern);
        if (priceMatch) {
            price = priceMatch[0].trim();
        }
        
        // Найти список функций (строки с галочками в списках)
        const listItems = tempDiv.querySelectorAll('li');
        listItems.forEach(item => {
            const text = item.textContent.trim();
            if (text && !text.match(pricePattern) && text !== title) {
                // Убрать галочку если есть
                const cleanText = text.replace(/^[✓✔✗✘•]\s*/, '').trim();
                if (cleanText && cleanText.length > 3) {
                    features.push(cleanText);
                }
            }
        });
        
        // Если не нашли функции в списках, ищем строки с галочками в параграфах и других элементах
        if (features.length === 0) {
            // Сначала проверим параграфы
            const paragraphs = tempDiv.querySelectorAll('p');
            paragraphs.forEach(p => {
                const text = p.textContent.trim();
                if (text && !text.match(pricePattern) && text !== title) {
                    // Если строка начинается с галочки, это функция
                    if (text.match(/^[✓✔✗✘•]/)) {
                        const cleanText = text.replace(/^[✓✔✗✘•]\s*/, '').trim();
                        if (cleanText && cleanText.length > 3) {
                            features.push(cleanText);
                        }
                    }
                }
            });
            
            // Если все еще не нашли, проверим все строки
            if (features.length === 0) {
                lines.forEach(line => {
                    // Пропустить заголовок и цену
                    if (line === title || line.match(pricePattern)) {
                        return;
                    }
                    // Если строка начинается с галочки, это функция
                    if (line.match(/^[✓✔✗✘•]/)) {
                        const cleanText = line.replace(/^[✓✔✗✘•]\s*/, '').trim();
                        if (cleanText && cleanText.length > 3) {
                            features.push(cleanText);
                        }
                    }
                });
            }
        }
        
        // Найти основной текст (первая строка после заголовка, которая не цена и не в списке)
        // Это обычно условие типа "До 5 номеров", "От 50 номеров" и т.д.
        if (lines.length > 0) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Пропустить заголовок и цену
                if (line === title || line.match(pricePattern)) {
                    continue;
                }
                // Пропустить строки, которые уже в списке функций
                const isInFeatures = features.some(f => {
                    const cleanLine = line.replace(/^[✓✔✗✘•]\s*/, '').trim();
                    return cleanLine === f || line.includes(f) || f.includes(cleanLine);
                });
                if (isInFeatures) {
                    continue;
                }
                // Пропустить строки с галочками (это функции)
                if (line.match(/^[✓✔✗✘•]/)) {
                    continue;
                }
                // Если строка не пустая и не слишком короткая, это может быть основной текст
                if (line.length > 3 && line.length < 100) {
                    // Проверить, не является ли это частью списка (если есть ul/ol, пропустить)
                    const parentElement = Array.from(tempDiv.querySelectorAll('*')).find(el => el.textContent.trim() === line);
                    if (parentElement && (parentElement.tagName === 'LI' || parentElement.closest('ul, ol'))) {
                        continue;
                    }
                    mainText = line;
                    break;
                }
            }
        }
        
        // Если основной текст не найден, но есть параграфы, попробуем взять первый
        if (!mainText) {
            const paragraphs = tempDiv.querySelectorAll('p');
            for (let i = 0; i < paragraphs.length; i++) {
                const pText = paragraphs[i].textContent.trim();
                if (pText && pText !== title && !pText.match(pricePattern) && pText.length > 3 && pText.length < 100) {
                    // Проверить, не является ли это функцией
                    const isFeature = features.some(f => {
                        const cleanPText = pText.replace(/^[✓✔✗✘•]\s*/, '').trim();
                        return cleanPText === f || pText.includes(f) || f.includes(cleanPText);
                    });
                    if (!isFeature && !pText.match(/^[✓✔✗✘•]/)) {
                        mainText = pText;
                        break;
                    }
                }
            }
        }
        
        // Если все еще не нашли, но есть строки без галочек, возьмем первую подходящую
        if (!mainText && lines.length > 0) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line !== title && !line.match(pricePattern) && !line.match(/^[✓✔✗✘•]/) && line.length > 3 && line.length < 100) {
                    const isFeature = features.some(f => {
                        const cleanLine = line.replace(/^[✓✔✗✘•]\s*/, '').trim();
                        return cleanLine === f || line.includes(f) || f.includes(cleanLine);
                    });
                    if (!isFeature) {
                        mainText = line;
                        break;
                    }
                }
            }
        }
        
        // Если нашли достаточно данных, преобразуем карточку
        if (title || mainText || price || features.length > 0) {
            console.log('[CMS Loader] Enhancing tariff card:', { title, mainText, price, featuresCount: features.length, features: features });
            
            // Очистить карточку
            card.innerHTML = '';
            
            // Создать card-header
            if (title) {
                const header = document.createElement('div');
                header.className = 'card-header';
                header.style.cssText = 'text-align: center; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: white;';
                const h3 = document.createElement('h3');
                h3.style.cssText = 'color: white; margin: 0;';
                h3.textContent = title;
                header.appendChild(h3);
                card.appendChild(header);
            }
            
            // Создать card-body
            const body = document.createElement('div');
            body.className = 'card-body';
            body.style.cssText = 'text-align: center;';
            
            // Основной текст (название тарифа)
            if (mainText) {
                const mainTextDiv = document.createElement('div');
                mainTextDiv.style.cssText = 'font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); color: var(--color-primary); margin-bottom: var(--spacing-sm);';
                mainTextDiv.textContent = mainText;
                body.appendChild(mainTextDiv);
            }
            
            // Цена
            if (price) {
                const priceDiv = document.createElement('div');
                priceDiv.style.cssText = 'font-size: var(--font-size-2xl); margin-bottom: var(--spacing-lg);';
                priceDiv.textContent = price;
                body.appendChild(priceDiv);
            }
            
            // Список функций
            if (features.length > 0) {
                const ul = document.createElement('ul');
                ul.style.cssText = 'list-style: none; padding: 0; text-align: left; color: var(--color-gray-600); margin-bottom: var(--spacing-lg);';
                features.forEach(feature => {
                    if (feature && feature.trim()) {
                        const li = document.createElement('li');
                        li.style.cssText = 'padding: var(--spacing-xs) 0;';
                        li.textContent = '✓ ' + feature.trim();
                        ul.appendChild(li);
                    }
                });
                // Добавить список только если в нем есть элементы
                if (ul.children.length > 0) {
                    body.appendChild(ul);
                    console.log('[CMS Loader] Added features list with', ul.children.length, 'items');
                } else {
                    console.warn('[CMS Loader] Features list is empty after filtering');
                }
            } else {
                // Это нормально - не все тарифы должны иметь функции
                // Убираем предупреждение, так как это не ошибка
                // console.warn('[CMS Loader] No features found for card');
            }
            
            // КРИТИЧНО: Добавить body только если в нем есть контент
            if (body.children.length > 0 || body.textContent.trim().length > 0) {
                card.appendChild(body);
            } else {
                // Это нормально - если карточка не имеет контента для тарифа, body может быть пустым
                // Убираем предупреждение, так как это не ошибка
                // console.warn('[CMS Loader] Card body is empty, not adding it');
            }
            
            // Создать card-footer с кнопкой
            const footer = document.createElement('div');
            footer.className = 'card-footer';
            const button = document.createElement('a');
            button.href = '../../consultation/' || '#';
            button.className = 'btn btn-primary btn-sm';
            button.style.cssText = 'width: 100%;';
            button.textContent = 'Заказать';
            footer.appendChild(button);
            card.appendChild(footer);
            
            // КРИТИЧНО: Проверить, что карточка не пустая после обработки
            if (card.children.length === 0 && card.textContent.trim().length === 0) {
                console.warn('[CMS Loader] ⚠️ Card became empty after enhancement, removing it');
                card.remove();
                return;
            }
        }
    }
    
    // Функция для преобразования карточки-ссылки (navigation)
    function enhanceNavigationCard(card) {
        // Если карточка уже является ссылкой, оставляем как есть
        if (card.tagName === 'A') {
            console.log('[CMS Loader] Navigation card is already a link, skipping enhancement');
            return;
        }
        
        // Если есть ссылка внутри, делаем всю карточку ссылкой
        const link = card.querySelector('a[href]');
        if (link) {
            const href = link.getAttribute('href');
            const linkText = link.textContent;
            
            // Сохраняем содержимое карточки
            const cardContent = card.innerHTML;
            
            // Создаем новую ссылку-карточку
            const newCard = document.createElement('a');
            newCard.href = href;
            newCard.className = card.className;
            newCard.style.cssText = card.style.cssText + '; text-decoration: none;';
            newCard.innerHTML = cardContent.replace(link.outerHTML, linkText);
            
            // Заменяем старую карточку новой
            card.parentNode.replaceChild(newCard, card);
            console.log('[CMS Loader] Navigation card converted to link');
        }
    }
    
    // Функция для преобразования информационной карточки (info)
    function enhanceInfoCard(card) {
        // Информационная карточка - просто стилизуем, кнопка не нужна
        // Можно добавить базовую стилизацию если нужно
        console.log('[CMS Loader] Info card processed (no button needed)');
    }
    
    // Функция для преобразования карточки в структуру услуги
    function enhanceServiceCard(card, cardType = null) {
        // Получить содержимое карточки
        const cardContent = card.innerHTML.trim();
        if (!cardContent) return;
        
        // Логируем содержимое карточки для отладки
        console.log('[CMS Loader] Service card content:', {
            title: card.querySelector('h3')?.textContent || 'N/A',
            contentPreview: cardContent.substring(0, 200),
            hasEmoji: /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️📱📞☎️🎧🎤📻📺💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎤🎧🎼🎹🎷🎺🎸🎻🎤🎧🎼🎵🎶🎙️📻📺📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴✉️🕒📍🏠📧💬📱☎️📞📠📺📻📡🌐💻🖥️⌨️🖱️💾💿📀📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴]/u.test(cardContent)
        });
        
        // Попытаться извлечь данные из содержимого
        let title = '';
        let description = '';
        let icon = '';
        let link = '#';
        
        // Создать временный контейнер для парсинга
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardContent;
        
        // Найти заголовок
        const h3 = tempDiv.querySelector('h3');
        if (h3) {
            title = h3.textContent.trim();
            h3.remove();
        } else {
            // Попробовать найти первый жирный текст
            const strong = tempDiv.querySelector('strong, b');
            if (strong) {
                title = strong.textContent.trim();
                strong.remove();
            }
        }
        
        // Найти иконку - приоритетный порядок поиска
        // 1. Проверим, есть ли уже элемент с классом service-card-icon
        const existingIcon = tempDiv.querySelector('.service-card-icon');
        if (existingIcon) {
            icon = existingIcon.innerHTML.trim();
            existingIcon.remove();
        } else {
            // 2. Ищем SVG элементы (inline SVG)
            const svg = tempDiv.querySelector('svg');
            if (svg) {
                icon = svg.outerHTML;
                svg.remove();
            } else {
                // 3. Ищем Font Awesome иконки (fas, far, fab, fal, fad)
                const faIcon = tempDiv.querySelector('i[class*="fa-"], i[class*="fas"], i[class*="far"], i[class*="fab"], i[class*="fal"], i[class*="fad"]');
                if (faIcon) {
                    icon = faIcon.outerHTML;
                    faIcon.remove();
                } else {
                    // 4. Ищем изображения (особенно SVG иконки)
                    const img = tempDiv.querySelector('img');
                    if (img) {
                        // Проверяем, что это иконка (по пути или классу)
                        const imgSrc = img.getAttribute('src') || '';
                        const imgClass = img.getAttribute('class') || '';
                        if (imgSrc.includes('icon') || imgSrc.includes('.svg') || imgClass.includes('icon')) {
                            icon = img.outerHTML;
                            img.remove();
                        } else {
                            // Если это не иконка, пропускаем
                            icon = null;
                        }
                    } else {
                        // 5. Ищем элементы с классами, содержащими "icon"
                        const iconEl = tempDiv.querySelector('[class*="icon"], [class*="Icon"]');
                        if (iconEl) {
                            icon = iconEl.innerHTML || iconEl.outerHTML;
                            iconEl.remove();
                        } else {
                            // 6. Ищем эмодзи в содержимом - сначала в div с font-size (иконки), потом в параграфах, потом везде
                            const emojiPattern = /[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️📱📞☎️🎧🎤📻📺💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎤🎧🎼🎹🎷🎺🎸🎻🎤🎧🎼🎵🎶🎙️📻📺📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴✉️🕒📍🏠📧💬📱☎️📞📠📺📻📡🌐💻🖥️⌨️🖱️💾💿📀📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴]/u;
                            
                            // Сначала ищем эмодзи в div с font-size (часто используется для больших иконок)
                            const divsWithFontSize = tempDiv.querySelectorAll('div[style*="font-size"], div[style*="fontSize"]');
                            for (const div of divsWithFontSize) {
                                const divText = div.textContent || '';
                                const emojiMatch = divText.trim().match(/^([🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️📱📞☎️🎧🎤📻📺💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎤🎧🎼🎹🎷🎺🎸🎻🎤🎧🎼🎵🎶🎙️📻📺📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴✉️🕒📍🏠📧💬📱☎️📞📠📺📻📡🌐💻🖥️⌨️🖱️💾💿📀📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴])/u);
                                if (emojiMatch && divText.trim().length <= 3) {
                                    // Если div содержит только эмодзи (и возможно пробелы), это иконка
                                    icon = emojiMatch[1];
                                    div.remove(); // Удаляем div с иконкой
                                    console.log('[CMS Loader] Icon found in div with font-size:', icon);
                                    break;
                                }
                            }
                            
                            // Если не нашли в div, ищем в начале параграфов
                            if (!icon) {
                                const paragraphs = tempDiv.querySelectorAll('p');
                                for (const p of paragraphs) {
                                    const pText = p.textContent || '';
                                    const emojiMatch = pText.trim().match(/^([🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️📱📞☎️🎧🎤📻📺💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎤🎧🎼🎹🎷🎺🎸🎻🎤🎧🎼🎵🎶🎙️📻📺📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴✉️🕒📍🏠📧💬📱☎️📞📠📺📻📡🌐💻🖥️⌨️🖱️💾💿📀📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴])/u);
                                    if (emojiMatch) {
                                        icon = emojiMatch[1];
                                        // Удаляем эмодзи из начала параграфа
                                        p.innerHTML = p.innerHTML.replace(/^([🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️📱📞☎️🎧🎤📻📺💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎤🎧🎼🎹🎷🎺🎸🎻🎤🎧🎼🎵🎶🎙️📻📺📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴✉️🕒📍🏠📧💬📱☎️📞📠📺📻📡🌐💻🖥️⌨️🖱️💾💿📀📷📹🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴])\s*/u, '');
                                        break;
                                    }
                                }
                            }
                            
                            // Если не нашли в div и параграфах, ищем везде в контенте
                            if (!icon) {
                                const emojiMatch = cardContent.match(emojiPattern);
                                if (emojiMatch) {
                                    icon = emojiMatch[0];
                                    // Удаляем эмодзи из контента
                                    const allTextNodes = [];
                                    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
                                    let node;
                                    while (node = walker.nextNode()) {
                                        if (node.textContent.includes(icon)) {
                                            node.textContent = node.textContent.replace(icon, '').trim();
                                        }
                                    }
                                }
                            }
                            
                            // Если иконка все еще не найдена, используем маппинг по названию услуги на Font Awesome
                            if (!icon && title) {
                                const iconMap = {
                                    'виртуальная атс': 'fa-sliders',
                                    'ip-телефония': 'fa-phone',
                                    'интернет для бизнеса': 'fa-globe',
                                    'облачные решения': 'fa-cloud',
                                    'безопасность': 'fa-shield-halved',
                                    'цифровое тв': 'fa-tv',
                                    'умный офис': 'fa-building',
                                    'корпоративная телефония': 'fa-phone',
                                    'фиксированная телефония': 'fa-phone-alt',
                                    'мобильная связь': 'fa-mobile-screen-button',
                                    'gpon': 'fa-rocket',
                                    'выделенный канал': 'fa-laptop',
                                    'видеонаблюдение': 'fa-video',
                                    'контроль доступа': 'fa-lock',
                                    'охранная сигнализация': 'fa-bell',
                                    'облачное хранилище': 'fa-hard-drive',
                                    'виртуальные серверы': 'fa-server',
                                    'резервное копирование': 'fa-hard-drive',
                                    'телефонная связь': 'fa-phone',
                                    'телефония': 'fa-phone',
                                    'интернет': 'fa-globe',
                                    'облако': 'fa-cloud'
                                };
                                
                                const titleLower = title.toLowerCase();
                                for (const [key, faClass] of Object.entries(iconMap)) {
                                    if (titleLower.includes(key)) {
                                        icon = `<i class="fas ${faClass}"></i>`;
                                        console.log('[CMS Loader] Icon mapped from title (Font Awesome):', { title, key, faClass });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log('[CMS Loader] Icon found for service card:', { 
            title, 
            hasIcon: !!icon, 
            iconType: icon ? (icon.includes('<svg') ? 'SVG' : icon.includes('<i') ? 'Font Awesome' : icon.includes('<img') ? 'Image' : icon.match(/[🌐📞☁️]/u) ? 'Emoji' : 'Other') : 'None',
            iconPreview: icon ? (icon.length > 100 ? icon.substring(0, 100) + '...' : icon) : null
        });
        
        // Найти описание (обычно параграф или текст после заголовка)
        const paragraphs = tempDiv.querySelectorAll('p');
        if (paragraphs.length > 0) {
            // Взять первый параграф как описание (обычно это основное описание)
            description = paragraphs[0].textContent.trim();
        } else {
            // Взять весь оставшийся текст, исключая заголовок и иконку
            const remainingText = tempDiv.textContent.trim();
            if (remainingText && remainingText !== title && !remainingText.match(/[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼]/u)) {
                description = remainingText;
            }
        }
        
        // Найти ссылку, если есть
        // Проверяем, является ли сама карточка ссылкой
        const isCardLink = card.tagName === 'A' && card.hasAttribute('href');
        if (isCardLink) {
            link = card.getAttribute('href');
        } else {
            // Ищем ссылку внутри карточки
            const existingLink = tempDiv.querySelector('a[href]');
            if (existingLink) {
                link = existingLink.getAttribute('href');
            }
        }
        
        // Если нашли достаточно данных, преобразуем карточку
        if (title || description) {
            console.log('[CMS Loader] Enhancing service card:', { 
                title, 
                description: description ? description.substring(0, 50) : '', 
                hasIcon: !!icon,
                hasLink: !!link,
                isCardLink: isCardLink
            });
            
            // Если карточка является ссылкой, сохраняем её атрибуты
            const cardHref = isCardLink ? card.getAttribute('href') : null;
            const cardStyle = isCardLink ? card.getAttribute('style') : null;
            
            // Изменить класс на service-card, если это была обычная card
            if (card.classList.contains('card') && !card.classList.contains('service-card')) {
                card.classList.remove('card');
                card.classList.add('service-card');
            }
            
            // Если карточка уже имеет класс service-card, оставляем его
            if (!card.classList.contains('service-card')) {
                card.classList.add('service-card');
            }
            
            // Очистить карточку
            card.innerHTML = '';
            
            // Создать service-card-body
            const body = document.createElement('div');
            body.className = 'service-card-body';
            
            // КРИТИЧНО: Проверить, что есть хотя бы title или description перед созданием структуры
            if (!title && !description) {
                console.warn('[CMS Loader] ⚠️ Service card has no title or description, skipping enhancement');
                return;
            }
            
            // Иконка - создаем всегда, используя Font Awesome если возможно
            const iconDiv = document.createElement('div');
            iconDiv.className = 'service-card-icon';
            
            if (icon) {
                // Если это эмодзи, заменяем на Font Awesome
                if (icon.match(/[🌐📞☁️🔒📺🏢📱🎛️📲☎️🔐🚨📹🎯💼🌍📡💻🖥️🎧🎤📻💡🔋⚡🔌💾💿📀💽🖨️⌨️🖱️📷🎥📼🎬🎞️🎭🎨🎪🎯🎲🎰🎮🃏🀄🎴🎵🎶🎸🎹🎺🎻🥁🎙️]/u)) {
                    // Маппинг эмодзи на Font Awesome
                    const emojiToFA = {
                        '🌐': 'fa-globe',
                        '📞': 'fa-phone',
                        '☁️': 'fa-cloud',
                        '🔒': 'fa-shield-halved',
                        '📺': 'fa-tv',
                        '🏢': 'fa-building',
                        '📱': 'fa-mobile-screen-button',
                        '📲': 'fa-mobile-screen',
                        '☎️': 'fa-phone-alt',
                        '🔐': 'fa-lock',
                        '🚨': 'fa-bell',
                        '📹': 'fa-video',
                        '🚀': 'fa-rocket',
                        '💻': 'fa-laptop',
                        '🎛️': 'fa-sliders',
                        '🖥️': 'fa-server',
                        '💾': 'fa-hard-drive'
                    };
                    const faClass = emojiToFA[icon] || 'fa-circle';
                    iconDiv.innerHTML = `<i class="fas ${faClass}"></i>`;
                } else {
                    // Для SVG, Font Awesome, img - используем innerHTML
                    iconDiv.innerHTML = icon;
                }
            } else {
                // Если иконка не найдена, используем маппинг по названию на Font Awesome
                const iconMap = {
                    'виртуальная атс': 'fa-sliders',
                    'ip-телефония': 'fa-phone',
                    'интернет для бизнеса': 'fa-globe',
                    'облачные решения': 'fa-cloud',
                    'безопасность': 'fa-shield-halved',
                    'цифровое тв': 'fa-tv',
                    'умный офис': 'fa-building',
                    'корпоративная телефония': 'fa-phone',
                    'фиксированная телефония': 'fa-phone-alt',
                    'мобильная связь': 'fa-mobile-screen-button',
                    'gpon': 'fa-rocket',
                    'выделенный канал': 'fa-laptop',
                    'видеонаблюдение': 'fa-video',
                    'контроль доступа': 'fa-lock',
                    'охранная сигнализация': 'fa-bell',
                    'облачное хранилище': 'fa-hard-drive',
                    'виртуальные серверы': 'fa-server',
                    'резервное копирование': 'fa-hard-drive',
                    'телефонная связь': 'fa-phone',
                    'телефония': 'fa-phone',
                    'интернет': 'fa-globe',
                    'облако': 'fa-cloud'
                };
                
                let faClass = 'fa-circle'; // Иконка по умолчанию
                if (title) {
                    const titleLower = title.toLowerCase();
                    for (const [key, fa] of Object.entries(iconMap)) {
                        if (titleLower.includes(key)) {
                            faClass = fa;
                            console.log('[CMS Loader] Icon mapped from title (Font Awesome fallback):', { title, key, faClass });
                            break;
                        }
                    }
                }
                iconDiv.innerHTML = `<i class="fas ${faClass}"></i>`;
            }
            // КРИТИЧНО: Иконка должна быть на том же уровне, что и body, а не внутри body
            card.appendChild(iconDiv);
            
            // Заголовок
            if (title) {
                const h3 = document.createElement('h3');
                h3.textContent = title;
                body.appendChild(h3);
            }
            
            // Описание
            if (description) {
                const p = document.createElement('p');
                p.textContent = description;
                body.appendChild(p);
            }
            
            // КРИТИЧНО: body должен быть после иконки
            card.appendChild(body);
            
            // КРИТИЧНО: Убедиться, что карточка видима после обработки
            card.style.setProperty('opacity', '1', 'important');
            card.style.setProperty('visibility', 'visible', 'important');
            card.style.setProperty('display', '', 'important');
            
            // Создать service-card-footer с кнопкой только если:
            // 1. Есть реальная ссылка (не # и не пустая)
            // 2. Карточка сама не является ссылкой
            // 3. Тип карточки не 'navigation' и не 'info'
            const shouldAddButton = link && 
                                   link !== '#' && 
                                   link !== '' && 
                                   !isCardLink && 
                                   cardType !== 'navigation' && 
                                   cardType !== 'info';
            
            if (shouldAddButton) {
                const footer = document.createElement('div');
                footer.className = 'service-card-footer';
                const button = document.createElement('a');
                button.href = link;
                button.className = 'btn btn-outline btn-sm';
                button.style.cssText = 'width: 100%;';
                button.textContent = 'Узнать больше';
                footer.appendChild(button);
                card.appendChild(footer);
                console.log('[CMS Loader] Added "Узнать больше" button for service card with link:', link);
            } else {
                console.log('[CMS Loader] No button added for service card:', {
                    hasLink: !!link,
                    link: link,
                    isCardLink: isCardLink,
                    cardType: cardType
                });
            }
            
            // КРИТИЧНО: Проверить, что body не пустой перед добавлением в карточку
            if (body.children.length === 0 && body.textContent.trim().length === 0) {
                console.warn('[CMS Loader] ⚠️ Service card body is empty after enhancement, removing card');
                card.remove();
                return;
            }
            
            // КРИТИЧНО: Проверить, что карточка не пустая после обработки
            if (card.children.length === 0 && card.textContent.trim().length === 0) {
                console.warn('[CMS Loader] ⚠️ Service card became empty after enhancement, removing it');
                card.remove();
                return;
            }
            
            // Если карточка является ссылкой, восстанавливаем её атрибуты
            if (isCardLink && cardHref) {
                card.setAttribute('href', cardHref);
                if (cardStyle) {
                    card.setAttribute('style', cardStyle);
                }
                // Добавляем стили для кликабельной карточки
                const currentStyle = card.getAttribute('style') || '';
                if (!currentStyle.includes('text-decoration')) {
                    card.setAttribute('style', currentStyle + (currentStyle ? '; ' : '') + 'text-decoration: none;');
                }
            }
        }
    }

    // Функция для организации service-card в grid и добавления отступов
    function organizeServiceCards(container) {
        if (!container) return;
        
        // КРИТИЧНО: Проверить, является ли контейнер частью нормализованного компонента
        const normalizedComponents = ['section-text', 'section-cards', 'section-grid', 'section-map', 
                                     'service-tariffs', 'service-faq', 'service-order-form',
                                     'history-timeline', 'mobile-app-section', 'crm-cards',
                                     'files-table', 'tariff-table', 'how-to-connect',
                                     'image-carousel', 'image-switcher'];
        
        const isInNormalizedSection = normalizedComponents.some(comp => {
            return container.closest(`section.${comp}, .${comp}`) !== null || 
                   container.classList.contains(comp);
        });
        
        if (isInNormalizedSection) {
            console.log('[CMS Loader] Container is part of normalized component - skipping card organization');
            return;
        }
        
        console.log('[CMS Loader] Organizing service cards in container');
        
        // Найти все заголовки h2.section-title
        const sectionTitles = container.querySelectorAll('h2.section-title');
        sectionTitles.forEach(title => {
            // Добавить отступ снизу для заголовков, чтобы карточки не наезжали
            if (!title.style.marginBottom || title.style.marginBottom === '') {
                title.style.marginBottom = 'var(--spacing-xl)';
            }
        });
        
        // Найти все service-card элементы, которые не находятся в grid
        // И не находятся в нормализованных секциях
        const allServiceCards = Array.from(container.querySelectorAll('.service-card')).filter(card => {
            const parent = card.parentElement;
            // Пропустить карточки, которые уже в grid
            if (parent && parent.classList.contains('grid')) {
                return false;
            }
            
            // Пропустить карточки в нормализованных секциях
            const parentNormalizedSection = normalizedComponents.find(comp => {
                return card.closest(`section.${comp}, .${comp}`) !== null;
            });
            if (parentNormalizedSection) {
                return false;
            }
            
            return true;
        });
        
        if (allServiceCards.length === 0) {
            console.log('[CMS Loader] No service cards found to organize (or all already in grid/normalized)');
            return;
        }
        
        console.log(`[CMS Loader] Found ${allServiceCards.length} service card(s) to organize`);
        
        // Группировать карточки: найти последовательные группы карточек
        let currentGroup = [];
        let currentGroupStart = null;
        
        // Пройти по всем дочерним элементам контейнера
        const containerChildren = Array.from(container.children);
        
        containerChildren.forEach((child) => {
            // Если это заголовок секции - завершить текущую группу и начать новую
            if (child.tagName === 'H2' && child.classList.contains('section-title')) {
                // Завершить предыдущую группу, если она есть
                if (currentGroup.length > 0 && currentGroupStart !== null) {
                    wrapServiceCardsInGrid(container, currentGroup, currentGroupStart);
                    currentGroup = [];
                    currentGroupStart = null;
                }
                // Добавить отступ снизу для заголовка
                if (!child.style.marginBottom || child.style.marginBottom === '') {
                    child.style.marginBottom = 'var(--spacing-xl)';
                }
            }
            // Если это service-card
            else if (child.classList.contains('service-card')) {
                // Если это первая карточка в группе, запомнить её
                if (currentGroup.length === 0) {
                    currentGroupStart = child;
                }
                currentGroup.push(child);
            }
            // Если это другой элемент (например, параграф, div и т.д.) - завершить группу
            else {
                // Завершить текущую группу, если она есть
                if (currentGroup.length > 0 && currentGroupStart !== null) {
                    wrapServiceCardsInGrid(container, currentGroup, currentGroupStart);
                    currentGroup = [];
                    currentGroupStart = null;
                }
            }
        });
        
        // Завершить последнюю группу, если она есть
        if (currentGroup.length > 0 && currentGroupStart !== null) {
            wrapServiceCardsInGrid(container, currentGroup, currentGroupStart);
        }
        
        console.log('[CMS Loader] ✅ Service cards organized');
    }
    
    // Функция для обертывания группы service-card в grid
    function wrapServiceCardsInGrid(container, cards, firstCard) {
        if (!cards || cards.length === 0 || !firstCard) return;
        
        // Определить количество колонок
        let cols = 3; // По умолчанию 3 колонки
        if (cards.length === 1) {
            cols = 1;
        } else if (cards.length === 2) {
            cols = 2;
        } else if (cards.length <= 4) {
            cols = cards.length <= 3 ? 3 : 2;
        } else {
            cols = 3;
        }
        
        console.log(`[CMS Loader] Wrapping ${cards.length} service card(s) in grid-cols-${cols}`);
        
        // Создать grid контейнер
        const gridWrapper = document.createElement('div');
        gridWrapper.className = `grid grid-cols-${cols}`;
        gridWrapper.style.marginBottom = 'var(--spacing-2xl)';
        
        // Вставить grid перед первой карточкой
        firstCard.parentNode.insertBefore(gridWrapper, firstCard);
        
        // Переместить все карточки в grid (создаем grid-item для каждой)
        cards.forEach(card => {
            // Проверить, что карточка все еще в DOM и не в grid
            if (card.parentElement && !gridWrapper.contains(card)) {
                // Создать grid-item обертку для каждой карточки
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                // Переместить карточку в grid-item
                gridItem.appendChild(card);
                gridWrapper.appendChild(gridItem);
            }
        });
        
        // Проверить, что grid не пустой
        if (gridWrapper.children.length === 0) {
            console.warn('[CMS Loader] ⚠️ Grid wrapper is empty, removing it');
            gridWrapper.remove();
        }
    }
    
    // Функция для обертки карточек в grid контейнер
    function wrapCardsInGrid(container, cards, startIndex, gridType = null) {
        if (cards.length === 0) return;
        
        // Фильтровать карточки - только те, которые еще не в grid контейнере
        const cardsToWrap = Array.from(cards).filter(card => {
            // Проверить, не находится ли карточка уже в grid контейнере
            const parent = card.parentElement;
            if (!parent) return false;
            // Если родитель уже grid контейнер, пропустить
            if (parent.classList.contains('grid')) {
                return false;
            }
            // Если карточка не является прямым дочерним элементом контейнера, пропустить
            if (parent !== container) {
                return false;
            }
            return true;
        });
        
        if (cardsToWrap.length === 0) {
            console.log('[CMS Loader] All cards are already wrapped, skipping');
            return;
        }
        
        // Определить количество колонок в зависимости от количества карточек
        let cols = 3;
        if (cardsToWrap.length === 1) {
            cols = 1;
        } else if (cardsToWrap.length === 2) {
            cols = 2;
        } else if (cardsToWrap.length <= 4) {
            cols = cardsToWrap.length <= 3 ? 3 : 2;
        } else {
            cols = 3;
        }
        
        console.log(`[CMS Loader] Wrapping ${cardsToWrap.length} cards in grid-cols-${cols} (gridType: ${gridType || 'auto'})`);
        
        // Создать grid контейнер
        const gridWrapper = document.createElement('div');
        gridWrapper.className = `grid grid-cols-${cols}`;
        // Добавить отступы для предотвращения налезания на заголовки
        gridWrapper.style.marginBottom = 'var(--spacing-2xl)';
        
        // Добавить data-атрибут gridType если задан
        if (gridType) {
            gridWrapper.setAttribute('data-grid-type', gridType);
        }
        
        // Найти первый элемент группы в DOM
        const firstCard = cardsToWrap[0];
        if (!firstCard || !firstCard.parentElement) {
            console.warn('[CMS Loader] Cannot wrap cards - first card not found or has no parent');
            return;
        }
        
        const parent = firstCard.parentElement;
        
        // Вставить grid контейнер перед первой карточкой
        parent.insertBefore(gridWrapper, firstCard);
        
        // Переместить все карточки в grid контейнер
        // Важно: создаем копию массива, так как при перемещении DOM изменяется
        const cardsCopy = [...cardsToWrap];
        cardsCopy.forEach(card => {
            // Дополнительная проверка - карточка все еще в нужном родителе
            if (card.parentElement === parent && !gridWrapper.contains(card)) {
                gridWrapper.appendChild(card);
            }
        });
        
        // КРИТИЧНО: Проверить, что gridWrapper не пустой после перемещения карточек
        if (gridWrapper.children.length === 0) {
            console.warn('[CMS Loader] ⚠️ Grid wrapper is empty after moving cards, removing it');
            gridWrapper.remove();
            return;
        }
        
        // Обработать карточки в гриде с учетом gridType
        if (gridType) {
            enhanceTariffCards(gridWrapper, gridType);
        } else {
            // Если gridType не задан, обработать карточки с автоопределением
            enhanceTariffCards(gridWrapper, null);
        }
        
        // КРИТИЧНО: После обработки карточек проверить, не стал ли gridWrapper пустым
        // (например, если все карточки были удалены при обработке)
        if (gridWrapper.children.length === 0) {
            console.warn('[CMS Loader] ⚠️ Grid wrapper became empty after card processing, removing it');
            gridWrapper.remove();
            return;
        }
        
        console.log(`[CMS Loader] Successfully wrapped ${gridWrapper.children.length} cards in grid`);
    }

    // Обновление путей к изображениям и ссылкам в контенте
    function updateContentPaths(element, basePath) {
        if (!basePath) {
            // Вычислить basePath автоматически
            const path = window.location.pathname;
            const parts = path.split('/').filter(p => p && p !== 'index.html' && p.length > 0);
            basePath = parts.length > 0 ? '../'.repeat(parts.length) : '';
        }
        
        // Обновить все изображения
        const images = element.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
                // Если путь начинается с images/, добавляем basePath
                if (src.startsWith('images/')) {
                    const newSrc = basePath + src;
                    img.setAttribute('src', newSrc);
                    console.log(`[CMS Loader] Updated image path: ${src} -> ${newSrc}`);
                } else if (!src.includes('../') && !src.includes('..\\')) {
                    // Относительный путь без ../ - добавляем basePath
                    const newSrc = basePath + src;
                    img.setAttribute('src', newSrc);
                    console.log(`[CMS Loader] Updated image path: ${src} -> ${newSrc}`);
                }
            }
        });
        
        // Обновить все ссылки
        const links = element.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
                if (!href.includes('../') && !href.includes('..\\')) {
                    const newHref = basePath + href;
                    link.setAttribute('href', newHref);
                    console.log(`[CMS Loader] Updated link path: ${href} -> ${newHref}`);
                }
            }
        });
    }

    // Рендеринг контента страницы
    // КРИТИЧНО: Флаг для предотвращения повторных вызовов renderContent
    let renderContentInProgress = false;
    let renderContentCompleted = false;
    
    /**
     * Обработка контента через модульную систему процессоров
     * @param {HTMLElement} tempDiv - Временный контейнер с HTML из CMS
     * @param {HTMLElement} mainContent - Основной контейнер для вставки контента
     * @param {boolean} isServicePage - Является ли страница service page
     * @param {Function} updateContentPaths - Функция для обновления путей
     */
    function processWithManager(tempDiv, mainContent, isServicePage, updateContentPaths) {
        // Проверка наличия модульной системы
        if (!window.CMSProcessors || !window.CMSProcessors.ProcessorManager) {
            console.warn('[CMS Loader] ⚠️ CMSProcessors not available, falling back to legacy processing');
            return false; // Вернуть false, чтобы использовать старую логику
        }
        
        // КРИТИЧНО: Для service pages - специальная обработка (просто добавить контент)
        if (isServicePage) {
            console.log('[CMS Loader] Service page detected in modular system - appending all content');
            
            // КРИТИЧНО: Проверить, что tempDiv содержит контент
            const tempDivContent = tempDiv.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
            if (!tempDivContent || tempDivContent.length < 10) {
                console.warn('[CMS Loader] ⚠️ Service page: tempDiv is empty or contains only comments, cannot process');
                return false; // Вернуть false, чтобы использовать старую логику
            }
            
            // Удалить только hero-content, если он есть
            const heroContentInTemp = tempDiv.querySelector('.hero-content');
            if (heroContentInTemp) {
                console.log('[CMS Loader] Removing hero-content from CMS content (should be in hero section)');
                heroContentInTemp.remove();
            }
            
            // Найти контейнер для вставки
            let container = mainContent.querySelector('.container');
            if (!container) {
                // Если контейнер не найден, создать его
                container = document.createElement('div');
                container.className = 'container';
                if (mainContent.tagName === 'SECTION') {
                    mainContent.appendChild(container);
                } else {
                    mainContent.appendChild(container);
                }
                console.log('[CMS Loader] Created container for service page content');
            }
            
            // Получить существующий контент
            const existingContent = container.innerHTML.trim();
            const cleanExistingContent = existingContent.replace(/<!--[\s\S]*?-->/g, '').trim();
            
            // Получить контент из CMS (после удаления hero-content)
            const cmsContent = tempDiv.innerHTML.trim();
            
            console.log('[CMS Loader] Existing content length:', cleanExistingContent.length);
            console.log('[CMS Loader] CMS content length:', cmsContent.length);
            console.log('[CMS Loader] CMS content preview (first 200 chars):', cmsContent.substring(0, 200));
            
            // КРИТИЧНО: Убедиться, что контент вставляется ПЕРЕД футером, а не после него
            // Найти футер
            const footer = document.querySelector('footer, [data-component="footer"]');
            if (footer && container) {
                // Проверить, не находится ли контейнер после футера
                const containerRect = container.getBoundingClientRect();
                const footerRect = footer.getBoundingClientRect();
                if (containerRect.top > footerRect.top) {
                    console.warn('[CMS Loader] ⚠️ Container is after footer, moving content before footer');
                    // Переместить контейнер перед футером
                    footer.parentNode.insertBefore(container, footer);
                }
            }
            
            // КРИТИЧНО: Проверить, что CMS контент не пустой
            if (!cmsContent || cmsContent.length < 10) {
                console.warn('[CMS Loader] ⚠️ Service page: CMS content is empty after processing, cannot insert');
                return false; // Вернуть false, чтобы использовать старую логику
            }
            
            // Если существующий контент пустой или очень короткий, просто вставить CMS контент
            if (!cleanExistingContent || cleanExistingContent.length < 50) {
                container.innerHTML = cmsContent;
                console.log('[CMS Loader] No existing content, inserted CMS content only');
            } else {
                // Проверить, не дублируется ли контент
                const cmsPreview = cmsContent.substring(0, 100);
                if (!cleanExistingContent.includes(cmsPreview)) {
                    // Добавить CMS контент к существующему
                    container.innerHTML = cleanExistingContent + '\n\n' + cmsContent;
                    console.log('[CMS Loader] Appended CMS content to existing content');
                } else {
                    // Контент уже есть, просто обновить
                    container.innerHTML = cmsContent;
                    console.log('[CMS Loader] CMS content already present, replaced with fresh content');
                }
            }
            
            // Удалить классы анимации из вставленного контента
            container.querySelectorAll('*').forEach(el => {
                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                el.style.setProperty('opacity', '1', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
            });
            
            // Убедиться, что контейнер виден
            container.style.setProperty('opacity', '1', 'important');
            container.style.setProperty('visibility', 'visible', 'important');
            
            // КРИТИЧНО: Проверить, является ли контент уже нормализованным HTML
            // Если секции имеют классы компонентов (section-text, section-cards, service-tariffs и т.д.),
            // то это нормализованный HTML и не нужно его переобрабатывать
            const normalizedComponents = ['section-text', 'section-cards', 'section-grid', 'section-map', 
                                         'service-tariffs', 'service-faq', 'service-order-form',
                                         'history-timeline', 'mobile-app-section', 'crm-cards',
                                         'files-table', 'tariff-table', 'how-to-connect',
                                         'image-carousel', 'image-switcher'];
            
            const hasNormalizedComponents = normalizedComponents.some(comp => {
                return container.querySelector(`section.${comp}, .${comp}, [class*="${comp}"]`) !== null;
            });
            
            if (hasNormalizedComponents) {
                console.log('[CMS Loader] Normalized HTML detected - skipping card enhancement, only organizing if needed');
                // Для нормализованного HTML только организуем карточки, если они не в grid, но не переобрабатываем их
                const unorganizedCards = container.querySelectorAll('.service-card:not(.grid .service-card), .card:not(.grid .card)');
                if (unorganizedCards.length > 0) {
                    // Проверяем, нужно ли обернуть их в grid (только если они последовательные)
                    organizeServiceCards(container);
                }
            } else {
                // Если это не нормализованный HTML, обрабатываем карточки как раньше
                console.log('[CMS Loader] Non-normalized HTML detected - processing cards');
                organizeServiceCards(container);
                enhanceTariffCards(container, null);
            }
            
            console.log('[CMS Loader] ✅ Service page content inserted successfully via modular system');
            console.log('[CMS Loader] Final container content length:', container.innerHTML.length);
            
            // Обновить пути
            updateContentPaths(mainContent, null);
            
            return true; // Успешно обработано
        }
        
        console.log('[CMS Loader] Using modular processor system');
        const processorManager = new window.CMSProcessors.ProcessorManager();
        
        // 1. Удалить hero-content через процессор
        const heroContent = tempDiv.querySelector('.hero-content');
        if (heroContent) {
            console.log('[CMS Loader] Removing hero-content via processor');
            processorManager.process(heroContent, { mainContent });
        }
        
        // 2. Найти все секции
        const allSections = tempDiv.querySelectorAll('section');
        console.log(`[CMS Loader] Found ${allSections.length} section(s) in CMS content`);
        
        // Логирование всех найденных секций для диагностики
        allSections.forEach((section, index) => {
            const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
            const title = titleElement ? titleElement.textContent.trim() : 'no title';
            const sectionClass = section.className || 'no class';
            const contentLength = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
            console.log(`[CMS Loader] Section ${index + 1}/${allSections.length}: "${title.substring(0, 50)}" (class: ${sectionClass}, content: ${contentLength} chars)`);
        });
        
        if (allSections.length === 0) {
            // Нет секций - проверить контент без секций
            const containerContent = tempDiv.querySelector('.container');
            if (containerContent) {
                const processed = processorManager.process(containerContent, { mainContent, isServicePage });
                if (processed) {
                    // Контент был обернут в секцию процессором
                    const newSections = tempDiv.querySelectorAll('section');
                    if (newSections.length > 0) {
                        // Использовать новую секцию
                        return processWithManager(tempDiv, mainContent, isServicePage, updateContentPaths);
                    }
                }
            }
            return false; // Нет секций для обработки, использовать старую логику
        }
        
        // 3. Разделить секции на специальные и обычные через ProcessorManager
        const { specialSections, regularSections } = processorManager.separateSections(allSections);
        
        console.log('[CMS Loader] Separated sections via ProcessorManager:', {
            total: allSections.length,
            special: specialSections.length,
            regular: regularSections.length
        });
        
        // Логирование разделенных секций для диагностики
        if (specialSections.length > 0) {
            console.log('[CMS Loader] Special sections:');
            specialSections.forEach((section, index) => {
                const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
                const title = titleElement ? titleElement.textContent.trim() : 'no title';
                console.log(`  ${index + 1}. "${title.substring(0, 50)}" (${section.className})`);
            });
        }
        if (regularSections.length > 0) {
            console.log('[CMS Loader] Regular sections:');
            regularSections.forEach((section, index) => {
                const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
                const title = titleElement ? titleElement.textContent.trim() : 'no title';
                console.log(`  ${index + 1}. "${title.substring(0, 50)}" (${section.className})`);
            });
        }
        
        // Проверить, не потерялись ли секции при разделении
        const totalSeparated = specialSections.length + regularSections.length;
        if (totalSeparated < allSections.length) {
            console.warn(`[CMS Loader] ⚠️ WARNING: ${allSections.length - totalSeparated} section(s) were not classified (lost during separation)!`);
            // Найти неклассифицированные секции
            allSections.forEach((section, index) => {
                const isSpecial = specialSections.includes(section);
                const isRegular = regularSections.includes(section);
                if (!isSpecial && !isRegular) {
                    const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
                    const title = titleElement ? titleElement.textContent.trim() : 'no title';
                    console.warn(`[CMS Loader] ⚠️ Unclassified section ${index + 1}: "${title.substring(0, 50)}" (${section.className})`);
                    // Попробовать добавить как обычную секцию, если она не специальная
                    const hasSpecialClass = section.classList.contains('service-order') || 
                                          section.classList.contains('service-tariffs') ||
                                          section.classList.contains('service-faq') ||
                                          section.classList.contains('service-features') ||
                                          section.classList.contains('service-specs') ||
                                          section.classList.contains('service-cases') ||
                                          section.classList.contains('service-howto');
                    if (!hasSpecialClass) {
                        console.log(`[CMS Loader] Adding unclassified section ${index + 1} to regular sections`);
                        regularSections.push(section);
                    }
                }
            });
        }
        
        // КРИТИЧНО: Сначала обработать обычные секции, чтобы они были в правильном порядке
        // Специальные секции (service-order) должны быть в конце страницы
        
        // 4. Обработать обычные секции ПЕРВЫМИ
        // Для обычных секций нужно сопоставить с существующими на странице
        // КРИТИЧНО: Исключить специальные секции из поиска существующих
        const existingSections = document.querySelectorAll('section.section:not([class*="service-"]), section[class*="section"]:not([class*="service-"])');
        const existingSectionsMap = new Map();
        const placeholderSections = []; // Массив плейсхолдеров для замены
        
        existingSections.forEach((existingSection, idx) => {
            // Пропустить специальные секции
            if (existingSection.classList.contains('service-order') || 
                existingSection.classList.contains('service-tariffs') ||
                existingSection.classList.contains('service-faq') ||
                existingSection.classList.contains('service-features') ||
                existingSection.classList.contains('service-specs') ||
                existingSection.classList.contains('service-cases') ||
                existingSection.classList.contains('service-howto')) {
                return; // Пропустить специальные секции
            }
            
            // КРИТИЧНО: Пропустить секции со sidebar (они не являются контентными секциями)
            if (existingSection.querySelector('[data-component="sidebar-about"]') !== null) {
                console.log(`[CMS Loader] Skipping section with sidebar (not a content section)`);
                return; // Пропустить секции со sidebar
            }
            
            // Расширенный поиск заголовка
            let titleElement = existingSection.querySelector('.title-promo-short, h2, h1, .section-title');
            // Если не найден, попробовать найти любой заголовок в .container
            if (!titleElement) {
                const container = existingSection.querySelector('.container');
                if (container) {
                    titleElement = container.querySelector('h1, h2, h3, .title-promo-short, .section-title');
                }
            }
            // Если все еще не найден, попробовать найти первый заголовок в секции
            if (!titleElement) {
                titleElement = existingSection.querySelector('h1, h2, h3');
            }
            
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Проверить, не является ли секция пустой или плейсхолдером
            const container = existingSection.querySelector('.container');
            const sectionContent = container ? container.innerHTML.trim() : existingSection.innerHTML.trim();
            const cleanContent = sectionContent.replace(/<!--[\s\S]*?-->/g, '').trim();
            const isPlaceholder = cleanContent.length < 50 || 
                                 cleanContent.includes('Контент из CMS будет вставлен') ||
                                 cleanContent.includes('Контент из CMS') ||
                                 cleanContent.includes('CMS content will be inserted');
            
            // Логирование для отладки
            console.log(`[CMS Loader] Existing section ${idx + 1}:`, {
                className: existingSection.className,
                hasTitleElement: !!titleElement,
                title: title || 'NO TITLE',
                titleElementTag: titleElement ? titleElement.tagName : 'none',
                innerHTMLLength: existingSection.innerHTML.length,
                containerExists: !!container,
                cleanContentLength: cleanContent.length,
                isPlaceholder: isPlaceholder,
                contentPreview: cleanContent.substring(0, 100)
            });
            
            // Если секция - плейсхолдер, добавить в массив плейсхолдеров для замены
            if (isPlaceholder) {
                console.log(`[CMS Loader] Found placeholder section ${idx + 1}, will be replaced by CMS content`);
                placeholderSections.push(existingSection);
                return;
            }
            
            if (title) {
                existingSectionsMap.set(title, existingSection);
            } else {
                // Если заголовок не найден, но есть контент, попробовать использовать первый значимый текст
                if (container) {
                    const firstHeading = container.querySelector('h1, h2, h3, h4, h5, h6');
                    if (firstHeading) {
                        const fallbackTitle = firstHeading.textContent.trim();
                        if (fallbackTitle && fallbackTitle.length > 3) {
                            console.log(`[CMS Loader] Using fallback title for section ${idx + 1}: "${fallbackTitle.substring(0, 50)}"`);
                            existingSectionsMap.set(fallbackTitle, existingSection);
                        }
                    }
                }
            }
        });
        
        console.log(`[CMS Loader] Found ${existingSections.length} existing sections on page, ${existingSectionsMap.size} with titles, ${placeholderSections.length} placeholders`);
        
        regularSections.forEach((section, index) => {
            const processed = processorManager.process(section, { mainContent, isServicePage });
            if (processed && processed.element) {
                const sectionTitle = processed.title || '';
                
                // КРИТИЧНО: Проверить, есть ли секция со sidebar, в которую нужно вставить контент
                const sectionWithSidebar = Array.from(document.querySelectorAll('section.section')).find(s => 
                    s.querySelector('[data-component="sidebar-about"]') !== null
                );
                
                if (sectionWithSidebar) {
                    // Найти div для контента внутри секции со sidebar
                    const sidebarPlaceholder = sectionWithSidebar.querySelector('[data-component="sidebar-about"]');
                    const gridParent = sidebarPlaceholder ? sidebarPlaceholder.closest('div[style*="grid-template-columns"]') : null;
                    
                    let contentDiv = null;
                    if (gridParent) {
                        const allChildren = Array.from(gridParent.children);
                        const sidebarIndex = allChildren.indexOf(sidebarPlaceholder);
                        if (sidebarIndex >= 0 && sidebarIndex < allChildren.length - 1) {
                            contentDiv = allChildren[sidebarIndex + 1];
                        }
                    } else if (sidebarPlaceholder && sidebarPlaceholder.parentElement) {
                        // Если нет grid parent, найти следующий div после sidebar
                        const allChildren = Array.from(sidebarPlaceholder.parentElement.children);
                        const sidebarIndex = allChildren.indexOf(sidebarPlaceholder);
                        if (sidebarIndex >= 0 && sidebarIndex < allChildren.length - 1) {
                            const nextElement = allChildren[sidebarIndex + 1];
                            if (nextElement && nextElement.tagName === 'DIV') {
                                contentDiv = nextElement;
                            }
                        }
                    }
                    
                    if (contentDiv) {
                        // Вставить контент в div внутри секции со sidebar
                        const sectionContainer = processed.element.querySelector('.container');
                        const sectionContent = sectionContainer ? sectionContainer.innerHTML : processed.element.innerHTML;
                        
                        // Удалить заголовок секции, если он есть (он уже есть в sidebar)
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = sectionContent;
                        const headings = tempDiv.querySelectorAll('h1, h2, h3, .section-title');
                        headings.forEach(heading => {
                            const headingText = heading.textContent.trim();
                            if (headingText === sectionTitle || headingText === 'О нас') {
                                heading.remove();
                            }
                        });
                        const cleanedContent = tempDiv.innerHTML;
                        
                        // Вставить контент в div
                        contentDiv.innerHTML = cleanedContent;
                        
                        // Обработать service-card элементы
                        setTimeout(() => {
                            enhanceTariffCards(contentDiv, null);
                            console.log(`[CMS Loader] Processed cards in sidebar section content div`);
                        }, 100);
                        
                        // Пометить секцию как обработанную
                        sectionWithSidebar.setAttribute('data-cms-processed', 'true');
                        
                        updateContentPaths(contentDiv, null);
                        console.log(`[CMS Loader] ✅ Inserted content into sidebar section div: "${sectionTitle}"`);
                        return; // Пропустить дальнейшую обработку
                    }
                }
                
                const existingSection = existingSectionsMap.get(sectionTitle);
                
                if (existingSection) {
                    // Заменить существующую секцию
                    const sectionContainer = processed.element.querySelector('.container');
                    const sectionContent = sectionContainer ? sectionContainer.innerHTML : processed.element.innerHTML;
                    
                    // КРИТИЧНО: Удалить дублирующиеся заголовки из контента
                    const tempContainer = document.createElement('div');
                    tempContainer.innerHTML = sectionContent;
                    const headingsInContent = tempContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    headingsInContent.forEach(heading => {
                        const headingText = heading.textContent.trim();
                        if (headingText === sectionTitle) {
                            console.log(`[CMS Loader] Removing duplicate heading "${sectionTitle}" from content`);
                            heading.remove();
                        }
                    });
                    const cleanedContent = tempContainer.innerHTML;
                    
                    // Очистить существующую секцию
                    const existingContainer = existingSection.querySelector('.container');
                    if (existingContainer) {
                        // Сохранить заголовок секции, если он есть
                        const existingTitle = existingContainer.querySelector('h2.section-title, h1.section-title');
                        existingContainer.innerHTML = '';
                        if (existingTitle) {
                            existingContainer.appendChild(existingTitle);
                        }
                        // Вставить очищенный контент
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = cleanedContent;
                        while (tempDiv.firstChild) {
                            existingContainer.appendChild(tempDiv.firstChild);
                        }
                    } else {
                        existingSection.innerHTML = cleanedContent;
                    }
                    
                    // Обновить классы
                    const mergedClasses = new Set(existingSection.className.split(' ').filter(c => c));
                    processed.element.className.split(' ').forEach(cls => {
                        if (cls && cls !== 'main-section' && cls !== 'home-section-container') {
                            mergedClasses.add(cls);
                        }
                    });
                    existingSection.className = Array.from(mergedClasses).join(' ');
                    
                    // Убедиться, что секция видна
                    existingSection.style.setProperty('opacity', '1', 'important');
                    existingSection.style.setProperty('visibility', 'visible', 'important');
                    existingSection.style.setProperty('display', '', 'important');
                    
                    // Удалить классы анимации
                    existingSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                    existingSection.querySelectorAll('*').forEach(el => {
                        el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                        el.style.setProperty('opacity', '1', 'important');
                        el.style.setProperty('visibility', 'visible', 'important');
                    });
                    
                    updateContentPaths(existingSection, null);
                    
                    // КРИТИЧНО: Обработать service-card элементы после замены контента
                    const replacedContainer = existingSection.querySelector('.container');
                    if (replacedContainer) {
                        setTimeout(() => {
                            enhanceTariffCards(replacedContainer, null);
                            console.log(`[CMS Loader] Processed cards in replaced section`);
                        }, 100);
                    }
                    
                    console.log(`[CMS Loader] ✅ Replaced section "${sectionTitle}" (${index + 1} of ${regularSections.length})`);
                    
                    existingSectionsMap.delete(sectionTitle);
                } else {
                    // КРИТИЧНО: Перед добавлением новой секции проверить, есть ли плейсхолдер для замены
                    let placeholderToReplace = null;
                    if (placeholderSections.length > 0) {
                        // Использовать первый доступный плейсхолдер
                        placeholderToReplace = placeholderSections.shift();
                        console.log(`[CMS Loader] Will replace placeholder section with CMS content: "${sectionTitle}"`);
                    }
                    
                    if (placeholderToReplace) {
                        // Заменить плейсхолдер контентом из CMS
                        const sectionContainer = processed.element.querySelector('.container');
                        const sectionContent = sectionContainer ? sectionContainer.innerHTML : processed.element.innerHTML;
                        
                        // Очистить плейсхолдер
                        const placeholderContainer = placeholderToReplace.querySelector('.container');
                        if (placeholderContainer) {
                            placeholderContainer.innerHTML = sectionContent;
                        } else {
                            placeholderToReplace.innerHTML = sectionContent;
                        }
                        
                        // Обновить классы
                        const mergedClasses = new Set(placeholderToReplace.className.split(' ').filter(c => c));
                        processed.element.className.split(' ').forEach(cls => {
                            if (cls && cls !== 'main-section' && cls !== 'home-section-container') {
                                mergedClasses.add(cls);
                            }
                        });
                        placeholderToReplace.className = Array.from(mergedClasses).join(' ');
                        
                        // Убедиться, что секция видна
                        placeholderToReplace.style.setProperty('opacity', '1', 'important');
                        placeholderToReplace.style.setProperty('visibility', 'visible', 'important');
                        placeholderToReplace.style.setProperty('display', '', 'important');
                        
                        // Удалить классы анимации
                        placeholderToReplace.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                        placeholderToReplace.querySelectorAll('*').forEach(el => {
                            el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            el.style.setProperty('opacity', '1', 'important');
                            el.style.setProperty('visibility', 'visible', 'important');
                        });
                        
                        updateContentPaths(placeholderToReplace, null);
                        
                        // КРИТИЧНО: Обработать service-card элементы после вставки контента
                        // placeholderContainer объявлен выше в этом же блоке if (placeholderToReplace)
                        if (placeholderContainer) {
                            setTimeout(() => {
                                enhanceTariffCards(placeholderContainer, null);
                                console.log(`[CMS Loader] Processed cards in placeholder section`);
                            }, 100);
                        }
                        
                        console.log(`[CMS Loader] ✅ Replaced placeholder section with "${sectionTitle}" (${index + 1} of ${regularSections.length})`);
                    } else {
                        // КРИТИЧНО: Перед добавлением новой секции проверить, нет ли уже на странице секции с таким заголовком
                        // Это может быть секция-плейсхолдер, которая не попала в existingSectionsMap
                        let foundExistingSection = null;
                        if (sectionTitle) {
                            // Поиск по всем секциям на странице, не только в mainContent
                            const allPageSections = document.querySelectorAll('section.section:not([class*="service-"])');
                            for (const pageSection of allPageSections) {
                                // Пропустить специальные секции
                                if (pageSection.classList.contains('service-order') || 
                                    pageSection.classList.contains('service-tariffs') ||
                                    pageSection.classList.contains('service-faq') ||
                                    pageSection.classList.contains('service-features') ||
                                    pageSection.classList.contains('service-specs') ||
                                    pageSection.classList.contains('service-cases') ||
                                    pageSection.classList.contains('service-howto')) {
                                    continue;
                                }
                                
                                const pageTitleElement = pageSection.querySelector('.title-promo-short, h2, h1, .section-title');
                                const pageTitle = pageTitleElement ? pageTitleElement.textContent.trim() : '';
                                if (pageTitle === sectionTitle) {
                                    foundExistingSection = pageSection;
                                    console.log(`[CMS Loader] Found existing section on page with same title (not in map): "${sectionTitle}"`);
                                    break;
                                }
                            }
                        }
                        
                        if (foundExistingSection) {
                            // Заменить найденную секцию (даже если она не была в карте)
                            const sectionContainer = processed.element.querySelector('.container');
                            const sectionContent = sectionContainer ? sectionContainer.innerHTML : processed.element.innerHTML;
                            
                            // КРИТИЧНО: Удалить дублирующиеся заголовки из контента
                            const tempContainer = document.createElement('div');
                            tempContainer.innerHTML = sectionContent;
                            const headingsInContent = tempContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            headingsInContent.forEach(heading => {
                                const headingText = heading.textContent.trim();
                                if (headingText === sectionTitle) {
                                    console.log(`[CMS Loader] Removing duplicate heading "${sectionTitle}" from content`);
                                    heading.remove();
                                }
                            });
                            const cleanedContent = tempContainer.innerHTML;
                            
                            // Очистить существующую секцию
                            const existingContainer = foundExistingSection.querySelector('.container');
                            if (existingContainer) {
                                // Сохранить заголовок секции, если он есть
                                const existingTitle = existingContainer.querySelector('h2.section-title, h1.section-title');
                                existingContainer.innerHTML = '';
                                if (existingTitle) {
                                    existingContainer.appendChild(existingTitle);
                                }
                                // Вставить очищенный контент
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = cleanedContent;
                                while (tempDiv.firstChild) {
                                    existingContainer.appendChild(tempDiv.firstChild);
                                }
                            } else {
                                foundExistingSection.innerHTML = cleanedContent;
                            }
                            
                            // Обновить классы
                            const mergedClasses = new Set(foundExistingSection.className.split(' ').filter(c => c));
                            processed.element.className.split(' ').forEach(cls => {
                                if (cls && cls !== 'main-section' && cls !== 'home-section-container') {
                                    mergedClasses.add(cls);
                                }
                            });
                            foundExistingSection.className = Array.from(mergedClasses).join(' ');
                            
                            // Убедиться, что секция видна
                            foundExistingSection.style.setProperty('opacity', '1', 'important');
                            foundExistingSection.style.setProperty('visibility', 'visible', 'important');
                            foundExistingSection.style.setProperty('display', '', 'important');
                            
                            // Удалить классы анимации
                            foundExistingSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            foundExistingSection.querySelectorAll('*').forEach(el => {
                                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                            });
                            
                            updateContentPaths(foundExistingSection, null);
                            console.log(`[CMS Loader] ✅ Replaced existing section "${sectionTitle}" (found on page, not in map)`);
                        } else {
                            // Добавить новую секцию (действительно новой нет на странице)
                            const clonedSection = processed.element.cloneNode(true);
                            
                            // Убедиться, что секция видна
                            clonedSection.style.setProperty('opacity', '1', 'important');
                            clonedSection.style.setProperty('visibility', 'visible', 'important');
                            clonedSection.style.setProperty('display', '', 'important');
                            
                            // Удалить классы анимации
                            clonedSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            clonedSection.querySelectorAll('*').forEach(el => {
                                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                            });
                            
                            // КРИТИЧНО: Вставить обычную секцию в mainContent, но ПЕРЕД специальными секциями
                            if (mainContent.tagName === 'SECTION') {
                                if (mainContent.parentNode) {
                                    mainContent.parentNode.insertBefore(clonedSection, mainContent.nextSibling);
                                } else {
                                    // Если нет родителя, просто добавить после
                                    mainContent.after(clonedSection);
                                }
                            } else {
                                // Найти последнюю обычную секцию в mainContent
                                const lastRegularSection = Array.from(mainContent.querySelectorAll('section.section:not([class*="service-"])')).pop();
                                if (lastRegularSection && lastRegularSection.nextSibling && lastRegularSection.parentNode === mainContent) {
                                    // nextSibling должен быть дочерним элементом mainContent
                                    try {
                                        mainContent.insertBefore(clonedSection, lastRegularSection.nextSibling);
                                    } catch (e) {
                                        // Если не удалось вставить перед nextSibling, вставить после lastRegularSection
                                        console.warn('[CMS Loader] ⚠️ Could not insert before nextSibling, inserting after lastRegularSection:', e.message);
                                        if (lastRegularSection.nextSibling) {
                                            lastRegularSection.nextSibling.before(clonedSection);
                                        } else {
                                            mainContent.appendChild(clonedSection);
                                        }
                                    }
                                } else {
                                    // Просто добавить в конец mainContent
                                    mainContent.appendChild(clonedSection);
                                }
                            }
                            
                            // КРИТИЧНО: Пометить секцию как обработанную, чтобы она не была удалена как пустая
                            clonedSection.setAttribute('data-cms-processed', 'true');
                            
                            updateContentPaths(clonedSection, null);
                            console.log(`[CMS Loader] ✅ Added new section "${sectionTitle}" (${index + 1} of ${regularSections.length})`);
                        }
                    }
                }
            }
        });
        
        // 5. Обработать специальные секции ПОСЛЕ обычных (чтобы они были в конце)
        specialSections.forEach((section) => {
            const processed = processorManager.process(section, { mainContent, isServicePage });
            if (processed) {
                // Проверить, не существует ли уже такая секция на странице
                const sectionClass = Array.from(processed.classList).find(c => c.startsWith('service-'));
                if (sectionClass) {
                    const existingSections = document.querySelectorAll(`section.${sectionClass}`);
                    if (existingSections.length > 0) {
                        console.log(`[CMS Loader] Removing ${existingSections.length} duplicate special section(s): ${sectionClass}`);
                        existingSections.forEach(s => s.remove());
                    }
                }
                
                // КРИТИЧНО: Убедиться, что секция имеет правильные классы перед вставкой
                if (!processed.classList.contains('section')) {
                    processed.classList.add('section');
                    console.log(`[CMS Loader] Added 'section' class to special section: ${sectionClass}`);
                }
                if (sectionClass && !processed.classList.contains(sectionClass)) {
                    processed.classList.add(sectionClass);
                    console.log(`[CMS Loader] Added special class '${sectionClass}' to section`);
                }
                
                // КРИТИЧНО: Вставить специальную секцию в КОНЕЦ страницы, перед footer
                // Если mainContent - это SECTION (например, hero), нужно найти правильное место для вставки
                if (mainContent.tagName === 'SECTION') {
                    // Найти footer или последнюю секцию перед footer
                    const footer = document.querySelector('footer');
                    if (footer && footer.parentNode) {
                        // Вставить перед footer
                        footer.parentNode.insertBefore(processed, footer);
                        console.log(`[CMS Loader] Inserted special section before footer`);
                    } else {
                        // Если footer не найден, найти последнюю секцию на странице
                        const allSections = document.querySelectorAll('section.section:not([class*="service-"])');
                        const lastSection = allSections[allSections.length - 1];
                        if (lastSection && lastSection.nextSibling) {
                            lastSection.parentNode.insertBefore(processed, lastSection.nextSibling);
                            console.log(`[CMS Loader] Inserted special section after last content section`);
                        } else if (lastSection) {
                            lastSection.after(processed);
                            console.log(`[CMS Loader] Inserted special section after last content section (using after)`);
                        } else {
                            // Если секций нет, вставить после mainContent
                            mainContent.parentNode.insertBefore(processed, mainContent.nextSibling);
                            console.log(`[CMS Loader] Inserted special section after mainContent (no other sections found)`);
                        }
                    }
                } else {
                    // Если mainContent - это не SECTION (например, main или div), вставить в конец
                    mainContent.appendChild(processed);
                    console.log(`[CMS Loader] Inserted special section at the end of mainContent`);
                }
                updateContentPaths(processed, null);
                console.log(`[CMS Loader] ✅ Special section inserted at the end: ${sectionClass || processed.className}`);
                console.log(`[CMS Loader] Final classes on inserted section:`, processed.className);
            }
        });
        
        // КРИТИЧНО: Организовать service-card в grid во всех контейнерах после вставки всех секций
        const allContainers = document.querySelectorAll('.container');
        allContainers.forEach(container => {
            organizeServiceCards(container);
        });
        
        return true; // Успешно обработано через модульную систему
    }
    
    function renderContent(container, pageData) {
        // КРИТИЧНО: Защита от повторных вызовов
        if (renderContentInProgress) {
            console.warn('[CMS Loader] ⚠️ renderContent is already in progress, skipping duplicate call');
            return;
        }
        
        if (renderContentCompleted) {
            console.warn('[CMS Loader] ⚠️ renderContent has already completed, skipping duplicate call');
            return;
        }
        
        renderContentInProgress = true;
        
        try {
            // КРИТИЧНО: Определить slug и тип страницы один раз в начале функции
            const currentPath = window.location.pathname;
            const slug = extractSlugFromPath(currentPath);
            const isMainPage = slug === 'home' || slug === 'index' || slug === 'main_page' || slug === '';
            const isServicePage = slug.includes('business/') && 
                                 (slug.match(/\/internet\/[^\/]+/) || 
                                  slug.match(/\/telephony\/[^\/]+/) || 
                                  slug.match(/\/security\/[^\/]+/) || 
                                  slug.match(/\/cloud\/[^\/]+/) || 
                                  slug.match(/\/tv\/[^\/]+/));
            
            // КРИТИЧНО: Для главной страницы просто вставляем контент как есть, без нормализации
        
        if (isMainPage && pageData.content) {
            console.log('[CMS Loader] Main page detected - inserting content as-is without normalization');
            
            // Найти контейнер для вставки - ищем main#main-content или section.section
            let targetContainer = document.querySelector('main#main-content .container');
            if (!targetContainer) {
                targetContainer = document.querySelector('main#main-content');
            }
            if (!targetContainer) {
                targetContainer = document.querySelector('section.section .container');
            }
            if (!targetContainer) {
                targetContainer = document.querySelector('section.section');
            }
            if (!targetContainer) {
                targetContainer = document.querySelector('section .container');
            }
            
            if (targetContainer) {
                // Просто вставить контент как есть
                if (targetContainer.classList.contains('container')) {
                    targetContainer.innerHTML = pageData.content;
                } else {
                    // Если это section, ищем или создаем container внутри
                    let container = targetContainer.querySelector('.container');
                    if (!container) {
                        container = document.createElement('div');
                        container.className = 'container';
                        targetContainer.appendChild(container);
                    }
                    container.innerHTML = pageData.content;
                }
                // Обновить пути
                updateContentPaths(targetContainer, null);
                console.log('[CMS Loader] Main page content inserted as-is');
                return;
            } else {
                console.warn('[CMS Loader] Target container not found for main page, falling back to normal processing');
            }
        }
        
        // НИКОГДА не использовать document.body как container - это перезапишет весь контент!
        // КРИТИЧНО: Сначала проверить, не существует ли уже main#main-content в document
        // Это предотвратит создание дубликатов
        let mainContent = document.querySelector('main#main-content');
        
        if (!mainContent) {
            // Ищем main или .main-content в container
            mainContent = container.querySelector('main#main-content') || container.querySelector('main');
        }
        
        if (!mainContent) {
            mainContent = container.querySelector('.main-content');
        }
        
        if (!mainContent) {
            // Если main не найден, ищем контейнер с контентом в document
            mainContent = document.querySelector('main') || document.querySelector('.main-content');
        }
        
        // Если main не найден, ищем другие возможные контейнеры
        if (!mainContent) {
            mainContent = document.querySelector('.content') || 
                         document.querySelector('#content') ||
                         document.querySelector('.page-content') ||
                         document.querySelector('.container > .content') ||
                         document.querySelector('body > .container');
        }
        
        // Если все еще не найден, используем body для поиска секций (но НЕ перезаписываем body!)
        if (!mainContent) {
            // Ищем первую секцию после hero или breadcrumbs
            const hero = document.querySelector('.hero');
            const breadcrumbs = document.querySelector('.breadcrumbs, nav.breadcrumbs');
            
            if (hero && hero.nextElementSibling) {
                // Используем следующий элемент после hero
                mainContent = hero.nextElementSibling;
                console.log('[CMS Loader] Using element after hero:', mainContent.tagName, mainContent.className || 'no class');
            } else if (breadcrumbs && breadcrumbs.nextElementSibling) {
                // Используем следующий элемент после breadcrumbs
                mainContent = breadcrumbs.nextElementSibling;
                console.log('[CMS Loader] Using element after breadcrumbs:', mainContent.tagName, mainContent.className || 'no class');
            } else {
                // Ищем первую секцию с классом .section
                const firstSection = document.querySelector('section.section');
                if (firstSection) {
                    mainContent = firstSection;
                    console.log('[CMS Loader] Using first section.section');
                } else {
                    // КРИТИЧНО: Проверить, не существует ли уже main#main-content
                    // Это предотвратит создание дубликатов при повторных вызовах
                    const existingMain = document.querySelector('main#main-content');
                    if (existingMain) {
                        console.log('[CMS Loader] ⚠️ main#main-content already exists, using it instead of creating new');
                        mainContent = existingMain;
                    } else {
                        // Создаем новый main контейнер после hero
                        mainContent = document.createElement('main');
                        mainContent.id = 'main-content'; // КРИТИЧНО: Добавить id для предотвращения дубликатов
                        mainContent.className = 'main-content';
                        if (hero && hero.parentNode) {
                            hero.parentNode.insertBefore(mainContent, hero.nextSibling);
                        } else {
                            // Вставляем после header, если есть
                            const header = document.querySelector('header') || document.querySelector('[data-component="header"]');
                            if (header && header.parentNode) {
                                header.parentNode.insertBefore(mainContent, header.nextSibling);
                            } else {
                                document.body.appendChild(mainContent);
                            }
                        }
                        console.log('[CMS Loader] Created main content container');
                    }
                }
            }
        }
        
        if (!mainContent) {
            console.error('[CMS Loader] Failed to find or create main content container, skipping content render');
            return;
        }
        
        console.log('[CMS Loader] Using content container:', mainContent.tagName, mainContent.className || mainContent.id || 'no class/id');

        // Если есть HTML контент, вставить его
        if (pageData.content) {
            console.log('[CMS Loader] Page data content found, length:', pageData.content.length);
            
            // Проверить, что контент - это строка
            if (typeof pageData.content !== 'string') {
                console.error('[CMS Loader] Content is not a string:', typeof pageData.content, pageData.content);
                return;
            }
            
            // Проверить, что контент не пустой
            if (!pageData.content.trim()) {
                console.warn('[CMS Loader] Content is empty or whitespace only');
                return;
            }
            
            console.log('[CMS Loader] Content preview (first 500 chars):', pageData.content.substring(0, 500));
            console.log('[CMS Loader] Content preview (last 200 chars):', pageData.content.substring(Math.max(0, pageData.content.length - 200)));
            
            // Создать временный контейнер для парсинга HTML
            const tempDiv = document.createElement('div');
            
            // ВАЖНО: Проверить, что контент валидный HTML перед вставкой
            try {
                tempDiv.innerHTML = pageData.content;
                console.log('[CMS Loader] Content parsed successfully, tempDiv children:', tempDiv.children.length);
                console.log('[CMS Loader] tempDiv innerHTML length:', tempDiv.innerHTML.length);
            } catch (error) {
                console.error('[CMS Loader] Error parsing content as HTML:', error);
                console.error('[CMS Loader] Problematic content:', pageData.content);
                return;
            }

            // КРИТИЧНО: Удалить все inline стили из контента перед обработкой
            // Это предотвратит конфликты стилей и дублирование
            const allStyledElements = tempDiv.querySelectorAll('[style]');
            let removedStylesCount = 0;
            allStyledElements.forEach(el => {
                const style = el.getAttribute('style');
                // Сохранить только критически важные стили (например, display: none для скрытых элементов)
                if (style && !style.includes('display: none') && !style.includes('display:none')) {
                    el.removeAttribute('style');
                    removedStylesCount++;
                }
            });
            if (removedStylesCount > 0) {
                console.log(`[CMS Loader] ✅ Removed inline styles from ${removedStylesCount} element(s)`);
            }

            // Обновить пути к изображениям и ссылкам ПЕРЕД вставкой
            updateContentPaths(tempDiv, null); // basePath будет вычислен автоматически
            
            // КРИТИЧНО: Удалить неправильные классы из заголовков в tempDiv ДО обработки
            // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
            tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                if (heading.classList.contains('section') && !heading.classList.contains('section-title') && !heading.classList.contains('section-subtitle')) {
                    heading.classList.remove('section');
                }
                heading.classList.remove('main-section', 'home-section-container');
                heading.removeAttribute('data-cms-processed');
            });

            // КРИТИЧНО: Определить, является ли это страницей услуги ДО обработки секций
            // КРИТИЧНО: Service page - это конкретная услуга, а не категория
            // Категории: business/internet, business/telephony, business/security, business/cloud, business/tv
            // Услуги: business/internet/gpon, business/telephony/fixed, и т.д.
            // ПРИМЕЧАНИЕ: currentPath, slug и isServicePage уже определены выше в начале функции
            
            console.log('[CMS Loader] Is service page:', isServicePage, '(slug:', slug, ')');

            // КРИТИЧНО: Для service pages - пропустить всю обработку секций и просто добавить контент
            if (isServicePage) {
                console.log('[CMS Loader] Service page detected - skipping section processing, appending all content');
                
                // Удалить только hero-content, если он есть
                const heroContentInTemp = tempDiv.querySelector('.hero-content');
                if (heroContentInTemp) {
                    console.log('[CMS Loader] Removing hero-content from CMS content (should be in hero section)');
                    heroContentInTemp.remove();
                }
                
                // Найти контейнер для вставки
                let container = mainContent.querySelector('.container');
                if (!container) {
                    // Если контейнер не найден, создать его
                    container = document.createElement('div');
                    container.className = 'container';
                    if (mainContent.tagName === 'SECTION') {
                        mainContent.appendChild(container);
                    } else {
                        mainContent.appendChild(container);
                    }
                    console.log('[CMS Loader] Created container for service page content');
                }
                
                // Получить существующий контент
                const existingContent = container.innerHTML.trim();
                const cleanExistingContent = existingContent.replace(/<!--[\s\S]*?-->/g, '').trim();
                
                // Получить контент из CMS
                const cmsContent = tempDiv.innerHTML.trim();
                
                console.log('[CMS Loader] Existing content length:', cleanExistingContent.length);
                console.log('[CMS Loader] CMS content length:', cmsContent.length);
                
                // Если существующий контент пустой или очень короткий, просто вставить CMS контент
                if (!cleanExistingContent || cleanExistingContent.length < 50) {
                    container.innerHTML = cmsContent;
                    console.log('[CMS Loader] No existing content, inserted CMS content only');
                } else {
                    // Проверить, не дублируется ли контент
                    const cmsPreview = cmsContent.substring(0, 100);
                    if (!cleanExistingContent.includes(cmsPreview)) {
                        // Добавить CMS контент к существующему
                        container.innerHTML = cleanExistingContent + '\n\n' + cmsContent;
                        console.log('[CMS Loader] Appended CMS content to existing content');
                    } else {
                        // Контент уже есть, просто обновить
                        container.innerHTML = cmsContent;
                        console.log('[CMS Loader] CMS content already present, replaced with fresh content');
                    }
                }
                
                // Удалить классы анимации из вставленного контента
                container.querySelectorAll('*').forEach(el => {
                    el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                    el.style.setProperty('opacity', '1', 'important');
                    el.style.setProperty('visibility', 'visible', 'important');
                });
                
                // Убедиться, что контейнер виден
                container.style.setProperty('opacity', '1', 'important');
                container.style.setProperty('visibility', 'visible', 'important');
                
                console.log('[CMS Loader] Service page content inserted successfully');
                console.log('[CMS Loader] Final container content length:', container.innerHTML.length);
                
                // Обновить пути
                updateContentPaths(mainContent, null);
                
                // Выходим из функции, пропуская всю остальную логику обработки секций
                return;
            }

            // ВАЖНО: Контент из CMS может содержать и hero-content, и основной контент
            // Нужно удалить hero-content, но сохранить остальной контент
            const heroContentInTemp = tempDiv.querySelector('.hero-content');
            if (heroContentInTemp) {
                console.log('[CMS Loader] Removing hero-content from CMS content (should be in hero section)');
                // КРИТИЧНО: Удалить только hero-content, но сохранить остальной контент в container
                const heroContentParent = heroContentInTemp.parentElement;
                heroContentInTemp.remove();
                
                // Если после удаления hero-content container стал пустым или содержит только пробелы/комментарии, удалить его тоже
                if (heroContentParent && heroContentParent.classList.contains('container')) {
                    const remainingContent = heroContentParent.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                    if (!remainingContent || remainingContent.length < 10) {
                        console.log('[CMS Loader] Container is empty after removing hero-content, removing container too');
                        // Переместить оставшийся контент на уровень выше перед удалением container
                        while (heroContentParent.firstChild) {
                            heroContentParent.parentNode.insertBefore(heroContentParent.firstChild, heroContentParent);
                        }
                        heroContentParent.remove();
                    } else {
                        console.log('[CMS Loader] Container still has content after removing hero-content, keeping it');
                    }
                }
                
                console.log('[CMS Loader] After removing hero-content, tempDiv children:', tempDiv.children.length);
                console.log('[CMS Loader] After removing hero-content, tempDiv innerHTML length:', tempDiv.innerHTML.length);
            }
            
            // КРИТИЧНО: Удалить обертку home-section-container, извлекая её содержимое
            // Эта обертка не должна оставаться на странице
            const homeSectionContainer = tempDiv.querySelector('.home-section-container');
            if (homeSectionContainer) {
                console.log('[CMS Loader] Removing home-section-container wrapper, extracting its content');
                const containerContent = homeSectionContainer.innerHTML;
                // Заменить обертку её содержимым
                const parent = homeSectionContainer.parentElement;
                if (parent) {
                    // Создать временный div для вставки содержимого
                    const tempWrapper = document.createElement('div');
                    tempWrapper.innerHTML = containerContent;
                    // Заменить обертку содержимым
                    parent.replaceChild(tempWrapper, homeSectionContainer);
                    // Переместить содержимое на уровень выше
                    while (tempWrapper.firstChild) {
                        parent.insertBefore(tempWrapper.firstChild, tempWrapper);
                    }
                    tempWrapper.remove();
                } else {
                    // Если нет родителя, просто заменить innerHTML
                    tempDiv.innerHTML = containerContent;
                }
                console.log('[CMS Loader] home-section-container removed, content extracted');
            }

            // КРИТИЧНО: Извлечь секции и контент из container перед обработкой
            // Если container содержит секции, извлечь их на уровень выше
            // Если container содержит контент без секций, обернуть его в секцию
            // ВАЖНО: Проверить, не является ли container частью существующей секции
            const topLevelContainer = tempDiv.querySelector('div.container');
            if (topLevelContainer) {
                // Проверить, не находится ли container внутри секции
                const parentSection = topLevelContainer.closest('section');
                if (parentSection && parentSection !== tempDiv) {
                    console.log(`[CMS Loader] Container is inside a section, skipping extraction to avoid duplicates`);
                    // Если container внутри секции, не обрабатывать его отдельно
                    // Просто удалить container, оставив его содержимое в секции
                    const containerContent = Array.from(topLevelContainer.childNodes);
                    containerContent.forEach(node => {
                        parentSection.insertBefore(node, topLevelContainer);
                    });
                    topLevelContainer.remove();
                    console.log(`[CMS Loader] ✅ Extracted content from container inside section`);
                } else {
                const sectionsInContainer = topLevelContainer.querySelectorAll('section');
                const containerContent = topLevelContainer.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                const hasRealContent = containerContent.length > 50; // Есть реальный контент (не только пробелы)
                
                if (sectionsInContainer.length > 0) {
                    console.log(`[CMS Loader] Found ${sectionsInContainer.length} section(s) inside top-level container, extracting them`);
                    
                    // Логирование секций в container ДО извлечения
                    sectionsInContainer.forEach((s, idx) => {
                        const titleEl = s.querySelector('.title-promo-short, h2, h1, .section-title');
                        const title = titleEl ? titleEl.textContent.trim() : 'no title';
                        const contentLength = s.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
                        console.log(`[CMS Loader]   Section ${idx + 1} in container: "${title.substring(0, 50)}" (${contentLength} chars)`);
                    });
                    
                    // КРИТИЧНО: Проверить, не дублируются ли секции при извлечении
                    // Сначала получить все секции, которые уже есть в tempDiv (не в container)
                    const existingSectionsInTempDiv = Array.from(tempDiv.querySelectorAll('section')).filter(s => 
                        !topLevelContainer.contains(s)
                    );
                    
                    console.log(`[CMS Loader] Existing sections in tempDiv (outside container): ${existingSectionsInTempDiv.length}`);
                    const existingTitles = new Set();
                    const existingSectionsByTitle = new Map();
                    existingSectionsInTempDiv.forEach((s, idx) => {
                        const titleEl = s.querySelector('.title-promo-short, h2, h1, .section-title');
                        const title = titleEl ? titleEl.textContent.trim() : 'no title';
                        const contentLength = s.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
                        console.log(`[CMS Loader]   Existing section ${idx + 1}: "${title.substring(0, 50)}" (${contentLength} chars)`);
                        if (title && title !== 'no title') {
                            existingTitles.add(title);
                            existingSectionsByTitle.set(title, s);
                        }
                    });
                    
                    // КРИТИЧНО: Перемещаем секции напрямую (не клонируем), чтобы избежать дубликатов
                    const sectionsToMove = Array.from(sectionsInContainer);
                    let extractedCount = 0;
                    let skippedDuplicates = 0;
                    
                    sectionsToMove.forEach((section, idx) => {
                        // Проверить, не является ли это дубликатом
                        const titleEl = section.querySelector('.title-promo-short, h2, h1, .section-title');
                        const title = titleEl ? titleEl.textContent.trim() : '';
                        const sectionContent = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                        
                        console.log(`[CMS Loader] Checking section ${idx + 1} from container: "${title.substring(0, 50)}" (${sectionContent.length} chars)`);
                        
                        // Проверить, есть ли уже секция с таким же заголовком
                        let isDuplicate = false;
                        if (title && existingTitles.has(title)) {
                            // Проверить содержимое
                            const existingSection = existingSectionsByTitle.get(title);
                            if (existingSection) {
                                const existingContent = existingSection.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                                // Сравнить содержимое (с нормализацией пробелов)
                                const normalizedExisting = existingContent.replace(/\s+/g, ' ').trim();
                                const normalizedCurrent = sectionContent.replace(/\s+/g, ' ').trim();
                                
                                if (normalizedExisting === normalizedCurrent && sectionContent.length > 50) {
                                    console.warn(`[CMS Loader] ⚠️ Skipping duplicate section when extracting from container: "${title.substring(0, 50)}" (same content)`);
                                    isDuplicate = true;
                                    skippedDuplicates++;
                                } else {
                                    console.log(`[CMS Loader] Section "${title.substring(0, 50)}" has same title but different content - keeping both`);
                                    console.log(`[CMS Loader]   Existing: ${normalizedExisting.length} chars, Current: ${normalizedCurrent.length} chars`);
                                }
                            }
                        }
                        
                        if (!isDuplicate) {
                            // КРИТИЧНО: Переместить секцию напрямую, НЕ клонировать, чтобы избежать дубликатов
                            // Переместить секцию на уровень выше (в tempDiv, после container)
                            tempDiv.insertBefore(section, topLevelContainer.nextSibling);
                            extractedCount++;
                            // Добавить заголовок в список существующих
                            if (title) {
                                existingTitles.add(title);
                                existingSectionsByTitle.set(title, section);
                            }
                            console.log(`[CMS Loader] ✅ Extracted section ${idx + 1}: "${title.substring(0, 50)}"`);
                        } else {
                            // Удалить дубликат из container
                            section.remove();
                        }
                    });
                    
                    console.log(`[CMS Loader] ✅ Extracted ${extractedCount} section(s) from container, skipped ${skippedDuplicates} duplicate(s)`);
                } else if (hasRealContent) {
                    // Если в container есть контент, но нет секций, обернуть его в секцию
                    console.log(`[CMS Loader] Found content in container without sections, wrapping in section`);
                    
                    // КРИТИЧНО: Проверить, не является ли этот контент дубликатом существующей секции
                    // Найти заголовок в контенте container
                    const containerTitleEl = topLevelContainer.querySelector('.title-promo-short, h2, h1, .section-title');
                    const containerTitle = containerTitleEl ? containerTitleEl.textContent.trim() : '';
                    const containerContent = topLevelContainer.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                    
                    // Проверить, есть ли уже секция с таким же заголовком в tempDiv
                    let isDuplicate = false;
                    if (containerTitle) {
                        const existingSectionsInTempDiv = Array.from(tempDiv.querySelectorAll('section')).filter(s => 
                            !topLevelContainer.contains(s)
                        );
                        
                        for (const existingSection of existingSectionsInTempDiv) {
                            const existingTitleEl = existingSection.querySelector('.title-promo-short, h2, h1, .section-title');
                            const existingTitle = existingTitleEl ? existingTitleEl.textContent.trim() : '';
                            
                            if (existingTitle === containerTitle) {
                                // Проверить содержимое
                                const existingContent = existingSection.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                                const normalizedExisting = existingContent.replace(/\s+/g, ' ').trim();
                                const normalizedContainer = containerContent.replace(/\s+/g, ' ').trim();
                                
                                // Если содержимое похоже (разница менее 10%), это дубликат
                                const similarity = Math.min(normalizedExisting.length, normalizedContainer.length) / 
                                                   Math.max(normalizedExisting.length, normalizedContainer.length);
                                
                                if (similarity > 0.9 && containerContent.length > 50) {
                                    console.warn(`[CMS Loader] ⚠️ Skipping wrapping container content - duplicate of existing section: "${containerTitle.substring(0, 50)}"`);
                                    console.warn(`[CMS Loader]   Existing: ${normalizedExisting.length} chars, Container: ${normalizedContainer.length} chars, Similarity: ${(similarity * 100).toFixed(1)}%`);
                                    isDuplicate = true;
                                    // Удалить container, так как его контент уже есть в существующей секции
                                    topLevelContainer.remove();
                                    break;
                                } else {
                                    console.log(`[CMS Loader] Container content has same title but different content - keeping both`);
                                    console.log(`[CMS Loader]   Existing: ${normalizedExisting.length} chars, Container: ${normalizedContainer.length} chars`);
                                }
                            }
                        }
                    }
                    
                    if (!isDuplicate) {
                        const wrapperSection = document.createElement('section');
                        wrapperSection.className = 'section';
                        // Переместить весь контент из container в секцию
                        while (topLevelContainer.firstChild) {
                            wrapperSection.appendChild(topLevelContainer.firstChild);
                        }
                        // Вставить секцию на место container
                        topLevelContainer.parentNode.insertBefore(wrapperSection, topLevelContainer);
                        topLevelContainer.remove();
                        console.log(`[CMS Loader] ✅ Wrapped container content in section${containerTitle ? `: "${containerTitle.substring(0, 50)}"` : ''}`);
                    }
                }
                }
            }
            
            // КРИТИЧНО: Удалить дублирующиеся секции перед обработкой
            // Найти все секции с одинаковыми заголовками и оставить только первую
            // ВАЖНО: Удаляем только дубликаты ВНУТРИ tempDiv (из CMS), не сравниваем с существующими на странице
            
            // Обновить список секций после извлечения
            const allSectionsUpdated = tempDiv.querySelectorAll('section.main-section, section[class*="section"]');
            
            // Логирование ДО удаления дубликатов
            console.log(`[CMS Loader] Sections BEFORE duplicate removal: ${allSectionsUpdated.length}`);
            allSectionsUpdated.forEach((section, index) => {
                const titleEl = section.querySelector('.title-promo-short, h2, h1, .section-title');
                const title = titleEl ? titleEl.textContent.trim() : 'no title';
                const contentLength = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
                console.log(`[CMS Loader]   BEFORE: Section ${index + 1}: "${title.substring(0, 50)}" (${contentLength} chars)`);
            });
            
            const seenSectionTitles = new Map();
            let removedDuplicates = 0;
            
            // КРИТИЧНО: После нормализации HTML дубликатов быть не должно
            // Но на всякий случай проверим и удалим только реальные дубликаты (одинаковый контент)
            // НЕ удаляем секции только по заголовку, так как разные секции могут иметь одинаковые заголовки
            
            allSectionsUpdated.forEach((section, index) => {
                // Найти заголовок секции (может быть в .title-promo-short, h2, или другом элементе)
                const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
                const title = titleElement ? titleElement.textContent.trim() : '';
                const sectionContent = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                
                if (title) {
                    // Проверить, есть ли уже секция с таким же заголовком И таким же содержимым
                    let isDuplicate = false;
                    seenSectionTitles.forEach((existingSection, existingTitle) => {
                        const existingContent = existingSection.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                        // Удаляем только если заголовок И содержимое полностью совпадают
                        if (existingTitle === title && existingContent === sectionContent && sectionContent.length > 50) {
                            console.warn(`[CMS Loader] ⚠️ Removing duplicate section (same title and content): "${title.substring(0, 50)}"`);
                            section.remove();
                            removedDuplicates++;
                            isDuplicate = true;
                        }
                    });
                    
                    if (!isDuplicate) {
                        // Сохранить секцию (первую с таким заголовком)
                        seenSectionTitles.set(title, section);
                        console.log(`[CMS Loader] Keeping section ${index + 1}: "${title.substring(0, 50)}" (${sectionContent.length} chars)`);
                    }
                } else {
                    // Если у секции нет заголовка, проверить, не является ли она дубликатом по содержимому
                    if (sectionContent.length > 10) {
                        let isDuplicate = false;
                        seenSectionTitles.forEach((existingSection, existingTitle) => {
                            const existingContent = existingSection.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                            if (existingContent === sectionContent && sectionContent.length > 50) {
                                console.warn(`[CMS Loader] ⚠️ Removing duplicate section without title (same content as "${existingTitle.substring(0, 50)}")`);
                                section.remove();
                                removedDuplicates++;
                                isDuplicate = true;
                            }
                        });
                        if (!isDuplicate) {
                            // Сохранить секцию без заголовка, используя содержимое как ключ
                            seenSectionTitles.set(`__no_title_${sectionContent.substring(0, 50)}`, section);
                            console.log(`[CMS Loader] Keeping section ${index + 1} without title (${sectionContent.length} chars)`);
                        }
                    } else {
                        // Удалить пустые секции без заголовка
                        console.warn(`[CMS Loader] ⚠️ Removing empty section without title`);
                        section.remove();
                        removedDuplicates++;
                    }
                }
            });
            
            if (removedDuplicates > 0) {
                console.log(`[CMS Loader] ✅ Removed ${removedDuplicates} duplicate/empty section(s) from CMS content`);
            }
            
            // Логирование ПОСЛЕ удаления дубликатов
            const sectionsAfterRemoval = tempDiv.querySelectorAll('section.main-section, section[class*="section"]');
            console.log(`[CMS Loader] Sections AFTER duplicate removal: ${sectionsAfterRemoval.length}`);
            sectionsAfterRemoval.forEach((section, index) => {
                const titleEl = section.querySelector('.title-promo-short, h2, h1, .section-title');
                const title = titleEl ? titleEl.textContent.trim() : 'no title';
                const contentLength = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim().length;
                console.log(`[CMS Loader]   AFTER: Section ${index + 1}: "${title.substring(0, 50)}" (${contentLength} chars)`);
            });

            // Найти все секции в контенте из CMS (после удаления дубликатов)
            let sections = tempDiv.querySelectorAll('.section, section, [class*="section"]');
            console.log('[CMS Loader] Found', sections.length, 'sections in CMS content (after removing duplicates)');
            
            // Объявить specialSections в более широкой области видимости
            let specialSections = [];
            
            // Диагностика: что есть в tempDiv
            console.log('[CMS Loader] tempDiv structure:');
            console.log('[CMS Loader] - Direct children:', tempDiv.children.length);
            console.log('[CMS Loader] - All elements:', tempDiv.querySelectorAll('*').length);
            console.log('[CMS Loader] - Has h2:', tempDiv.querySelectorAll('h2').length);
            console.log('[CMS Loader] - Has .card:', tempDiv.querySelectorAll('.card').length);
            console.log('[CMS Loader] - Full tempDiv.innerHTML length:', tempDiv.innerHTML.length);
            
            // КРИТИЧНО: Попробовать использовать модульную систему обработки
            // ПРИМЕЧАНИЕ: currentPath, slug и isServicePage уже определены выше в начале функции
            // Попробовать обработать через модульную систему
            const processedWithManager = processWithManager(tempDiv, mainContent, isServicePage, updateContentPaths);
            
            if (processedWithManager) {
                console.log('[CMS Loader] ✅ Content processed successfully via modular system');
                
                // КРИТИЧНО: Удалить дубликаты main#main-content после обработки
                const allMainElements = document.querySelectorAll('main#main-content');
                if (allMainElements.length > 1) {
                    console.warn(`[CMS Loader] ⚠️ Found ${allMainElements.length} main#main-content elements, removing duplicates`);
                    // Оставить только первый, переместить контент из остальных
                    const firstMain = allMainElements[0];
                    for (let i = 1; i < allMainElements.length; i++) {
                        const duplicateMain = allMainElements[i];
                        // Переместить контент из дубликата в первый
                        while (duplicateMain.firstChild) {
                            firstMain.appendChild(duplicateMain.firstChild);
                        }
                        duplicateMain.remove();
                    }
                    console.log(`[CMS Loader] ✅ Removed ${allMainElements.length - 1} duplicate main#main-content element(s)`);
                }
                
                // КРИТИЧНО: Удалить пустые секции с плейсхолдерами
                // НЕ удалять секции, которые были только что добавлены (имеют data-cms-processed)
                // НЕ удалять секции со sidebar
                const emptySections = document.querySelectorAll('section.section:not([data-cms-processed])');
                let removedEmptySections = 0;
                emptySections.forEach(section => {
                    // Пропустить секции со sidebar
                    if (section.querySelector('[data-component="sidebar-about"]') !== null) {
                        return;
                    }
                    
                    const container = section.querySelector('.container');
                    const containerContent = container ? container.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim() : '';
                    const sectionContent = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                    
                    // Проверить, есть ли контент в контейнере или в секции
                    const hasContent = containerContent.length > 50 || 
                                      (sectionContent.length > 50 && !sectionContent.includes('Контент из CMS будет вставлен'));
                    
                    // Также проверить наличие визуальных элементов
                    const hasVisualElements = section.querySelector('img, svg, iframe, video, audio, .card, .grid, .service-card, h1, h2, h3, p') !== null;
                    
                    if (!hasContent && !hasVisualElements) {
                        console.log('[CMS Loader] Removing empty section with placeholder:', section.querySelector('h2, h3')?.textContent?.trim() || 'no title');
                        section.remove();
                        removedEmptySections++;
                    }
                });
                if (removedEmptySections > 0) {
                    console.log(`[CMS Loader] ✅ Removed ${removedEmptySections} empty section(s) with placeholders`);
                }
                
                // Обновить пути в основном контенте
                updateContentPaths(mainContent, null);
                renderContentCompleted = true;
                renderContentInProgress = false;
                return; // Успешно обработано, выходим
            }
            
            // Если модульная система не смогла обработать, используем старую логику
            console.log('[CMS Loader] Falling back to legacy processing logic');
            
            if (sections.length > 0) {
                // КРИТИЧНО: Сначала отделить специальные секции от обычных ДО обработки
                // Это нужно сделать до того, как мы начнем обрабатывать обычные секции
                const allSectionsArray = Array.from(sections);
                const specialSectionsArray = [];
                const regularSectionsArray = [];
                
                allSectionsArray.forEach((section) => {
                    // КРИТИЧНО: Проверить, является ли секция специальной по классу
                    const isSpecialByClass = section.classList.contains('service-order') || 
                        section.classList.contains('service-tariffs') || 
                        section.classList.contains('service-faq') ||
                        section.classList.contains('service-features') ||
                        section.classList.contains('service-specs') ||
                        section.classList.contains('service-cases') ||
                        section.classList.contains('service-howto');
                    
                    // КРИТИЧНО: Также проверить содержимое - если секция содержит форму заказа, это тоже специальная секция
                    const hasOrderForm = section.querySelector('.order-form, form.order-form, [class*="order-form"]') !== null;
                    const hasServiceOrderContent = section.textContent.includes('Заказать услугу') && hasOrderForm;
                    
                    if (isSpecialByClass || hasServiceOrderContent) {
                        console.log('[CMS Loader] Section identified as special:', {
                            className: section.className,
                            hasOrderForm: hasOrderForm,
                            isSpecialByClass: isSpecialByClass,
                            hasServiceOrderContent: hasServiceOrderContent
                        });
                        specialSectionsArray.push(section);
                    } else {
                        regularSectionsArray.push(section);
                    }
                });
                
                console.log('[CMS Loader] Separated sections:', {
                    total: allSectionsArray.length,
                    special: specialSectionsArray.length,
                    regular: regularSectionsArray.length
                });
                
                // Обновить sections - только обычные секции
                sections = regularSectionsArray;
                specialSections = specialSectionsArray;
                // Найти все существующие секции на странице (в body, не только в mainContent)
                const existingSections = document.querySelectorAll('section.section, section[class*="section"]');
                console.log('[CMS Loader] Found', existingSections.length, 'existing sections on page');
                
                // Создать карту существующих секций по заголовкам для правильного сопоставления
                const existingSectionsMap = new Map();
                existingSections.forEach((existingSection) => {
                    // Найти заголовок существующей секции
                    const titleElement = existingSection.querySelector('.title-promo-short, h2, h1, .section-title');
                    const title = titleElement ? titleElement.textContent.trim() : '';
                    if (title) {
                        existingSectionsMap.set(title, existingSection);
                    }
                });
                
                // КРИТИЧНО: Удалить секции с ненужными классами перед нормализацией
                // Удалить секции, которые являются обертками (home-section-container) или пустые
                const sectionsToRemove = [];
                sections.forEach((section) => {
                    // Проверить, является ли секция оберткой home-section-container
                    if (section.classList.contains('home-section-container') || 
                        section.closest('.home-section-container') === section) {
                        console.log('[CMS Loader] ⚠️ Removing section with home-section-container class');
                        sectionsToRemove.push(section);
                        return;
                    }
                    
                    // Проверить, пустая ли секция
                    const hasContent = section.textContent.trim().length > 0 || 
                                     section.querySelector('img, svg, iframe, video, audio, .card, .grid, .service-card, h1, h2, h3, p, a, button') !== null;
                    if (!hasContent) {
                        console.log('[CMS Loader] ⚠️ Removing empty section before normalization:', section.className);
                        sectionsToRemove.push(section);
                    }
                });
                
                sectionsToRemove.forEach(section => section.remove());
                if (sectionsToRemove.length > 0) {
                    console.log(`[CMS Loader] ✅ Removed ${sectionsToRemove.length} unwanted section(s) before normalization`);
                }
                
                // КРИТИЧНО: Обновить списки секций после удаления ненужных
                // Специальные секции уже отделены выше, нужно только обновить их список
                // (удалить те, которые были удалены из tempDiv)
                specialSections = specialSections.filter(section => {
                    // Проверить, что секция все еще в tempDiv
                    return tempDiv.contains(section) || section.parentNode === tempDiv;
                });
                
                // Обновить список обычных секций
                sections = Array.from(sections).filter(section => {
                    return tempDiv.contains(section) || section.parentNode === tempDiv;
                });
                
                console.log('[CMS Loader] After cleanup:', {
                    special: specialSections.length,
                    regular: sections.length
                });
                
                const regularSections = sections;
                
                // Вставить специальные секции в конец mainContent
                specialSections.forEach((section) => {
                    console.log('[CMS Loader] Processing special section:', section.className);
                    
                    // КРИТИЧНО: Проверить, не существует ли уже такая секция на странице
                    const sectionClass = Array.from(section.classList).find(c => c.startsWith('service-'));
                    if (sectionClass) {
                        // Проверить все секции с таким классом на странице (не только в mainContent)
                        const allExistingSections = document.querySelectorAll(`section.${sectionClass}`);
                        console.log(`[CMS Loader] Found ${allExistingSections.length} existing section(s) with class "${sectionClass}" on page`);
                        
                        if (allExistingSections.length > 0) {
                            // Если секции уже есть, удалить все дубликаты
                            allExistingSections.forEach((existingSection, index) => {
                                console.log(`[CMS Loader] Checking existing section ${index + 1}:`, {
                                    hasDataCmsProcessed: existingSection.hasAttribute('data-cms-processed'),
                                    isInMainContent: mainContent.contains(existingSection),
                                    innerHTMLLength: existingSection.innerHTML.length
                                });
                                
                                // Удалить все существующие секции с таким классом (дубликаты)
                                console.log(`[CMS Loader] ⚠️ Removing duplicate special section: ${sectionClass}`);
                                existingSection.remove();
                            });
                            console.log(`[CMS Loader] ✅ Removed ${allExistingSections.length} duplicate special section(s)`);
                        } else {
                            console.log(`[CMS Loader] No existing sections with class "${sectionClass}" found, will insert new one`);
                        }
                    } else {
                        console.warn('[CMS Loader] ⚠️ Special section does not have service-* class:', section.className);
                    }
                    
                    // КРИТИЧНО: Проверить, что секция не пустая перед клонированием
                    const sectionContent = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                    const hasForm = section.querySelector('form, .order-form') !== null;
                    const hasOtherContent = section.querySelector('.service-tariffs, .service-faq, h2, h3, p, .card, .grid') !== null;
                    const hasTextContent = section.textContent.trim().replace(/\s+/g, ' ').length > 10; // Минимум 10 символов текста
                    const hasContent = sectionContent.length > 50 && (hasForm || hasOtherContent || hasTextContent);
                    
                    console.log(`[CMS Loader] Checking special section "${sectionClass}":`, {
                        sectionContentLength: sectionContent.length,
                        hasForm: hasForm,
                        hasOtherContent: hasOtherContent,
                        hasTextContent: hasTextContent,
                        textContentLength: section.textContent.trim().length,
                        hasContent: hasContent,
                        innerHTML: section.innerHTML.substring(0, 200)
                    });
                    
                    if (!hasContent) {
                        console.warn(`[CMS Loader] ⚠️ Special section "${sectionClass}" is empty or has insufficient content, skipping insertion`);
                        console.warn(`[CMS Loader] Section details:`, {
                            innerHTML: section.innerHTML,
                            textContent: section.textContent,
                            children: section.children.length
                        });
                        return; // Пропускаем пустые секции
                    }
                    
                    console.log(`[CMS Loader] ✅ Special section "${sectionClass}" has content (${sectionContent.length} chars), proceeding with insertion`);
                    
                    const clonedSection = section.cloneNode(true);
                    
                    // КРИТИЧНО: Пометить секцию как обработанную ПЕРЕД вставкой
                    clonedSection.setAttribute('data-cms-processed', 'true');
                    
                    // КРИТИЧНО: Убедиться, что секция видна
                    clonedSection.style.setProperty('opacity', '1', 'important');
                    clonedSection.style.setProperty('visibility', 'visible', 'important');
                    clonedSection.style.setProperty('display', '', 'important');
                    
                    // Удалить классы анимации
                    clonedSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                    clonedSection.querySelectorAll('*').forEach(el => {
                        el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                        // КРИТИЧНО: Удалить неправильные классы и атрибуты из заголовков
                        // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                        if (el.tagName && el.tagName.match(/^H[1-6]$/)) {
                            // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                            if (el.classList.contains('section') && !el.classList.contains('section-title') && !el.classList.contains('section-subtitle')) {
                                el.classList.remove('section');
                            }
                            el.classList.remove('main-section', 'home-section-container');
                            el.removeAttribute('data-cms-processed');
                            el.removeAttribute('style');
                        }
                        el.style.setProperty('opacity', '1', 'important');
                        el.style.setProperty('visibility', 'visible', 'important');
                    });
                    
                    // КРИТИЧНО: Убедиться, что mainContent существует и не является дубликатом
                    if (!mainContent || !mainContent.parentNode) {
                        console.error('[CMS Loader] ⚠️ mainContent is invalid, cannot insert special section');
                        return;
                    }
                    
                    // КРИТИЧНО: Проверить, не является ли mainContent дубликатом
                    const allMainElements = document.querySelectorAll('main#main-content');
                    if (allMainElements.length > 1) {
                        console.warn(`[CMS Loader] ⚠️ Found ${allMainElements.length} main#main-content elements, using the first one`);
                        mainContent = allMainElements[0];
                    }
                    
                    if (mainContent.tagName === 'SECTION') {
                        mainContent.parentNode.insertBefore(clonedSection, mainContent.nextSibling);
                    } else {
                        mainContent.appendChild(clonedSection);
                    }
                    updateContentPaths(clonedSection, null);
                    console.log('[CMS Loader] ✅ Special section inserted and marked as processed:', sectionClass || section.className);
                    
                    // Финальная проверка - убедиться, что на странице только одна секция с таким классом
                    if (sectionClass) {
                        const finalCheck = document.querySelectorAll(`section.${sectionClass}`);
                        if (finalCheck.length > 1) {
                            console.warn(`[CMS Loader] ⚠️ WARNING: Found ${finalCheck.length} sections with class "${sectionClass}" after insertion!`);
                            // Удалить все кроме последней (только что вставленной)
                            for (let i = 0; i < finalCheck.length - 1; i++) {
                                console.log(`[CMS Loader] Removing duplicate #${i + 1} of ${finalCheck.length}`);
                                finalCheck[i].remove();
                            }
                        } else {
                            console.log(`[CMS Loader] ✅ Confirmed: Only 1 section with class "${sectionClass}" on page`);
                        }
                    }
                });
                
                // Нормализовать классы обычных секций из CMS и сопоставить с существующими
                regularSections.forEach((section, index) => {
                    
                    console.log(`\n[LOG] ========== ОБРАБОТКА СЕКЦИИ ${index + 1} из ${regularSections.length} ==========`);
                    console.log(`[LOG] Исходная секция из CMS:`, section.outerHTML.substring(0, 200));
                    
                    // КРИТИЧНО: Проверить, не является ли эта секция формой заказа (даже если она не имеет класса service-order)
                    const hasOrderForm = section.querySelector('.order-form, form.order-form, [class*="order-form"], form[action]') !== null;
                    const hasServiceOrderTitle = section.textContent.includes('Заказать услугу') || 
                                                 section.textContent.includes('Оставить заявку') ||
                                                 section.textContent.includes('Отправить заявку');
                    const hasOrderFormInputs = section.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]').length >= 3;
                    
                    if (hasOrderForm || (hasServiceOrderTitle && hasOrderFormInputs)) {
                        console.log(`[CMS Loader] ⚠️ Section contains order form but was classified as regular, skipping to avoid duplicate`);
                        console.log(`[CMS Loader] Section details:`, {
                            hasOrderForm: hasOrderForm,
                            hasServiceOrderTitle: hasServiceOrderTitle,
                            hasOrderFormInputs: hasOrderFormInputs,
                            className: section.className
                        });
                        console.log(`[CMS Loader] This section should have been in specialSections. Removing from regular processing.`);
                        // КРИТИЧНО: Извлечь контент из секции ПЕРЕД удалением, если в ней есть контент кроме формы
                        const sectionContent = section.innerHTML;
                        const hasContentBesidesForm = section.querySelector('h2, h3, p, .card, .grid') !== null && 
                                                     section.querySelectorAll('input, textarea, select').length < 5; // Если меньше 5 полей формы, возможно есть другой контент
                        if (hasContentBesidesForm) {
                            console.log(`[CMS Loader] ⚠️ Section contains content besides form, extracting it before removal`);
                            // Сохранить контент для последующей вставки (удалить только форму)
                            const formElements = section.querySelectorAll('.order-form, form.order-form, [class*="order-form"], form[action]');
                            formElements.forEach(form => form.remove());
                            const extractedContent = section.innerHTML.trim();
                            if (extractedContent) {
                                // Сохранить извлеченный контент в data-атрибуте tempDiv для последующей обработки
                                if (!tempDiv.dataset.extractedContent) {
                                    tempDiv.dataset.extractedContent = '';
                                }
                                tempDiv.dataset.extractedContent += extractedContent + '\n';
                                console.log(`[CMS Loader] Extracted content length:`, extractedContent.length);
                            }
                        }
                        // Удалить эту секцию из tempDiv, чтобы она не обрабатывалась
                        section.remove();
                        return; // Пропускаем секции с формой заказа
                    }
                    
                    // Найти заголовок секции из CMS
                    const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
                    const sectionTitle = titleElement ? titleElement.textContent.trim() : '';
                    console.log(`[LOG] Заголовок секции из CMS: "${sectionTitle}"`);
                    
                    // Логируем все заголовки в исходной секции
                    const headingsInOriginalSection = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    console.log(`[LOG] Заголовков в исходной секции из CMS: ${headingsInOriginalSection.length}`);
                    headingsInOriginalSection.forEach((h, i) => {
                        console.log(`[LOG]   Заголовок ${i + 1}: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                    });
                    
                    // КРИТИЧНО: Удалить неправильные классы из заголовков (h1, h2, h3 не должны иметь класс section)
                    // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                    section.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                        // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                        if (heading.classList.contains('section') && !heading.classList.contains('section-title') && !heading.classList.contains('section-subtitle')) {
                            heading.classList.remove('section');
                        }
                        heading.classList.remove('main-section', 'home-section-container');
                    });
                    
                    // Нормализовать классы: удалить main-section, оставить только section и специфичные классы
                    const sectionClasses = section.className.split(' ').filter(cls => {
                        // Удалить main-section и home-section-container, но сохранить другие классы
                        return cls !== 'main-section' && cls !== 'section' && cls !== 'home-section-container';
                    });
                    // Добавить базовый класс section только если это действительно секция (не заголовок)
                    if (section.tagName === 'SECTION' || section.classList.contains('section')) {
                        sectionClasses.unshift('section');
                    }
                    section.className = sectionClasses.join(' ');
                    
                    // Удалить inline стили из секции и всех дочерних элементов
                    section.removeAttribute('style');
                    section.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
                    
                    // Попытаться найти существующую секцию по заголовку
                    const existingSection = sectionTitle ? existingSectionsMap.get(sectionTitle) : null;
                    
                    if (existingSection) {
                        console.log(`[CMS Loader] ✅ Matching section by title: "${sectionTitle}"`);
                        console.log(`[LOG] Найдена существующая секция на странице`);
                        
                        // Логируем заголовки в существующей секции ДО обработки
                        const headingsBeforeProcessing = existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        console.log(`[LOG] Заголовков в существующей секции ДО обработки: ${headingsBeforeProcessing.length}`);
                        headingsBeforeProcessing.forEach((h, i) => {
                            console.log(`[LOG]   Заголовок ${i + 1} ДО: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                        });
                        
                        // КРИТИЧНО: Проверить, не была ли эта секция уже обработана
                        if (existingSection.hasAttribute('data-cms-processed')) {
                            console.log(`[CMS Loader] ⚠️ Section "${sectionTitle}" already processed, skipping`);
                            return; // Пропускаем уже обработанные секции
                        }
                        
                        // Пометить секцию как обработанную
                        existingSection.setAttribute('data-cms-processed', 'true');
                        
                        // Сохранить классы и атрибуты существующей секции
                        const originalClasses = existingSection.className;
                        const originalAttributes = {};
                        Array.from(existingSection.attributes).forEach(attr => {
                            if (attr.name !== 'class' && attr.name !== 'style' && attr.name !== 'data-cms-processed') {
                                originalAttributes[attr.name] = attr.value;
                            }
                        });
                        
                        // КРИТИЧНО: Извлечь содержимое секции правильно
                        // Проверяем структуру секции из CMS
                        let sectionContent = '';
                        
                        // Если секция содержит .container, используем его содержимое
                        const sectionContainer = section.querySelector('.container');
                        if (sectionContainer) {
                            console.log('[CMS Loader] Section has container, using container content');
                            sectionContent = sectionContainer.innerHTML;
                            console.log(`[LOG] Извлечено содержимое из .container, длина: ${sectionContent.length}`);
                            
                            // Логируем заголовки в извлеченном контенте
                            const tempCheckDiv = document.createElement('div');
                            tempCheckDiv.innerHTML = sectionContent;
                            const headingsInExtractedContent = tempCheckDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            console.log(`[LOG] Заголовков в извлеченном контенте из .container: ${headingsInExtractedContent.length}`);
                            headingsInExtractedContent.forEach((h, i) => {
                                console.log(`[LOG]   Заголовок ${i + 1} в контенте: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                            });
                        } else {
                            // Если нет container, используем весь innerHTML секции
                            console.log('[CMS Loader] Section has no container, using full section content');
                            sectionContent = section.innerHTML;
                            console.log(`[LOG] Извлечено содержимое из секции целиком, длина: ${sectionContent.length}`);
                            
                            // Логируем заголовки в извлеченном контенте
                            const tempCheckDiv = document.createElement('div');
                            tempCheckDiv.innerHTML = sectionContent;
                            const headingsInExtractedContent = tempCheckDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            console.log(`[LOG] Заголовков в извлеченном контенте из секции: ${headingsInExtractedContent.length}`);
                            headingsInExtractedContent.forEach((h, i) => {
                                console.log(`[LOG]   Заголовок ${i + 1} в контенте: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                            });
                        }
                        
                        // КРИТИЧНО: Проверить, что контент не пустой
                        if (!sectionContent || sectionContent.trim().length === 0) {
                            console.warn(`[CMS Loader] ⚠️ Section "${sectionTitle}" has empty content, skipping replacement`);
                            return; // Пропускаем пустые секции
                        }
                        
                        // Заменить содержимое секции
                        console.log('[CMS Loader] Replacing section content, length:', sectionContent.length);
                        
                        // КРИТИЧНО: Сохранить заголовок существующей секции перед очисткой
                        // Заголовок может быть в структуре страницы и не должен удаляться
                        const existingTitleElement = existingSection.querySelector('.title-promo-short, h2.section-title, h1.section-title, .section-title');
                        let savedTitleElement = null;
                        if (existingTitleElement) {
                            console.log(`[LOG] Сохраняем заголовок существующей секции: "${existingTitleElement.textContent.trim()}"`);
                            savedTitleElement = existingTitleElement.cloneNode(true);
                        }
                        
                        // КРИТИЧНО: Очистить секцию перед вставкой нового контента
                        console.log(`[LOG] Очищаем существующую секцию перед вставкой`);
                        existingSection.innerHTML = '';
                        
                        // Восстановить сохраненный заголовок, если он был
                        if (savedTitleElement) {
                            console.log(`[LOG] Восстанавливаем сохраненный заголовок секции`);
                            // Найти контейнер для заголовка или вставить в начало секции
                            const container = existingSection.querySelector('.container');
                            if (container) {
                                container.insertBefore(savedTitleElement, container.firstChild);
                            } else {
                                existingSection.insertBefore(savedTitleElement, existingSection.firstChild);
                            }
                        }
                        
                        // Вставить контент через DocumentFragment для сохранения структуры
                        const tempContainer = document.createElement('div');
                        tempContainer.innerHTML = sectionContent;
                        
                        // Логируем заголовки в tempContainer ПЕРЕД удалением дубликатов
                        const headingsBeforeDedup = tempContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        console.log(`[LOG] Заголовков в tempContainer ПЕРЕД удалением дубликатов: ${headingsBeforeDedup.length}`);
                        headingsBeforeDedup.forEach((h, i) => {
                            console.log(`[LOG]   Заголовок ${i + 1} ПЕРЕД: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                        });
                        
                        // КРИТИЧНО: Удалить дублирующиеся заголовки из вставляемого контента
                        // Если в контенте есть заголовок с таким же текстом, как у секции, удалить его
                        // (заголовок секции уже есть в структуре страницы или был сохранен)
                        if (sectionTitle) {
                            const headingsInContent = tempContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            let removedCount = 0;
                            headingsInContent.forEach(heading => {
                                const headingText = heading.textContent.trim();
                                // Проверяем точное совпадение текста
                                if (headingText === sectionTitle) {
                                    console.log(`[LOG] ⚠️ Удаляем дубликат заголовка "${sectionTitle}" из контента (уже есть в структуре секции)`);
                                    console.log(`[LOG]   Удаляемый элемент: <${heading.tagName}> class="${heading.className || ''}"`);
                                    heading.remove();
                                    removedCount++;
                                } else {
                                    // Логируем заголовки, которые НЕ удаляются
                                    console.log(`[LOG]   Заголовок НЕ удаляется (текст отличается): "${headingText.substring(0, 50)}" vs "${sectionTitle.substring(0, 50)}"`);
                                }
                            });
                            console.log(`[LOG] Удалено дубликатов заголовка секции: ${removedCount}`);
                        }
                        
                        // Логируем заголовки в tempContainer ПОСЛЕ удаления дубликатов
                        const headingsAfterDedup = tempContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        console.log(`[LOG] Заголовков в tempContainer ПОСЛЕ удаления дубликатов: ${headingsAfterDedup.length}`);
                        headingsAfterDedup.forEach((h, i) => {
                            console.log(`[LOG]   Заголовок ${i + 1} ПОСЛЕ: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                        });
                        
                        // Переместить все дочерние элементы в секцию
                        console.log(`[LOG] Перемещаем элементы из tempContainer в секцию`);
                        while (tempContainer.firstChild) {
                            existingSection.appendChild(tempContainer.firstChild);
                        }
                        
                        // Логируем заголовки в секции ПОСЛЕ вставки контента
                        const headingsAfterInsert = existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        console.log(`[LOG] Заголовков в секции ПОСЛЕ вставки контента: ${headingsAfterInsert.length}`);
                        headingsAfterInsert.forEach((h, i) => {
                            console.log(`[LOG]   Заголовок ${i + 1} ПОСЛЕ вставки: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}"`);
                        });
                        
                        // КРИТИЧНО: Удалить неправильные классы и атрибуты из заголовков сразу после вставки
                        // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                        existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                            // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                            if (heading.classList.contains('section') && !heading.classList.contains('section-title') && !heading.classList.contains('section-subtitle')) {
                                heading.classList.remove('section');
                            }
                            heading.classList.remove('main-section', 'home-section-container');
                            heading.removeAttribute('data-cms-processed');
                            heading.removeAttribute('style');
                        });
                        
                        // КРИТИЧНО: Удалить дублирующиеся заголовки внутри секции после вставки
                        // Группируем заголовки по тексту и удаляем дубликаты (оставляем только первый)
                        console.log(`[LOG] Проверяем дубликаты заголовков в секции`);
                        const headingsInSection = existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        const seenHeadingTexts = new Set();
                        let removedDuplicateHeadings = 0;
                        headingsInSection.forEach((heading, idx) => {
                            const headingText = heading.textContent.trim();
                            if (headingText && seenHeadingTexts.has(headingText)) {
                                console.log(`[LOG] ⚠️ НАЙДЕН ДУБЛИКАТ! Удаляем заголовок #${idx + 1}: <${heading.tagName}> "${headingText.substring(0, 50)}"`);
                                heading.remove();
                                removedDuplicateHeadings++;
                            } else if (headingText) {
                                seenHeadingTexts.add(headingText);
                                console.log(`[LOG]   Заголовок #${idx + 1} уникален: <${heading.tagName}> "${headingText.substring(0, 50)}"`);
                            }
                        });
                        if (removedDuplicateHeadings > 0) {
                            console.log(`[CMS Loader] ✅ Removed ${removedDuplicateHeadings} duplicate heading(s) from section`);
                        } else {
                            console.log(`[LOG] Дубликатов заголовков не найдено`);
                        }
                        
                        // Финальная проверка заголовков в секции
                        const finalHeadings = existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        console.log(`[LOG] ========== ФИНАЛЬНОЕ СОСТОЯНИЕ СЕКЦИИ ==========`);
                        console.log(`[LOG] Заголовков в секции после всех обработок: ${finalHeadings.length}`);
                        finalHeadings.forEach((h, i) => {
                            console.log(`[LOG]   ФИНАЛЬНЫЙ заголовок ${i + 1}: <${h.tagName}> "${h.textContent.trim().substring(0, 50)}" class="${h.className || ''}"`);
                        });
                        console.log(`[LOG] ================================================\n`);
                        
                        // Восстановить оригинальные классы и атрибуты, но добавить классы из CMS
                        const mergedClasses = new Set(originalClasses.split(' ').filter(c => c));
                        sectionClasses.forEach(cls => mergedClasses.add(cls));
                        existingSection.className = Array.from(mergedClasses).join(' ');
                        
                        Object.keys(originalAttributes).forEach(attrName => {
                            existingSection.setAttribute(attrName, originalAttributes[attrName]);
                        });
                        
                        // Удалить inline стили из вставленного контента
                        existingSection.removeAttribute('style');
                        existingSection.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
                        
                        // КРИТИЧНО: Убедиться, что секция видна
                        existingSection.style.setProperty('opacity', '1', 'important');
                        existingSection.style.setProperty('visibility', 'visible', 'important');
                        existingSection.style.setProperty('display', '', 'important');
                        
                        // Удалить классы анимации, которые могут скрывать контент
                        existingSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                        existingSection.querySelectorAll('*').forEach(el => {
                            el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            // КРИТИЧНО: Удалить неправильные классы из заголовков
                            // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                            if (el.tagName && el.tagName.match(/^H[1-6]$/)) {
                                // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                                if (el.classList.contains('section') && !el.classList.contains('section-title') && !el.classList.contains('section-subtitle')) {
                                    el.classList.remove('section');
                                }
                                el.classList.remove('main-section', 'home-section-container');
                            }
                            el.style.setProperty('opacity', '1', 'important');
                            el.style.setProperty('visibility', 'visible', 'important');
                        });
                        
                        // Обновить пути в уже вставленном контенте
                        updateContentPaths(existingSection, null);
                        
                        // КРИТИЧНО: Удалить пустые элементы из замененной секции
                        // Это важно, так как могут остаться пустые обертки
                        const emptyInSection = existingSection.querySelectorAll('*:empty');
                        let removedEmpty = 0;
                        emptyInSection.forEach(el => {
                            if (el.tagName !== 'BR' && el.tagName !== 'HR' && el.tagName !== 'IMG' && el.tagName !== 'INPUT' && el.tagName !== 'SVG') {
                                if (!el.textContent.trim() && el.children.length === 0) {
                                    console.log('[CMS Loader] Removing empty element from replaced section:', el.tagName, el.className || 'no class');
                                    el.remove();
                                    removedEmpty++;
                                }
                            }
                        });
                        
                        if (removedEmpty > 0) {
                            console.log(`[CMS Loader] Removed ${removedEmpty} empty element(s) from replaced section`);
                        }
                        
                        // КРИТИЧНО: Удалить пустые обертки (div, section) которые могут остаться
                        // после замены содержимого
                        const emptyWrappers = existingSection.querySelectorAll('div:empty, section:empty');
                        emptyWrappers.forEach(wrapper => {
                            // Пропустить важные контейнеры
                            if (!wrapper.classList.contains('container') && 
                                !wrapper.classList.contains('grid') && 
                                !wrapper.classList.contains('card') &&
                                !wrapper.classList.contains('service-card')) {
                                console.log('[CMS Loader] Removing empty wrapper from replaced section:', wrapper.tagName, wrapper.className || 'no class');
                                wrapper.remove();
                            }
                        });
                        
                        // КРИТИЧНО: Проверить, не стала ли сама секция пустой после замены
                        // Если секция пустая, удалить её полностью
                        const sectionText = existingSection.textContent.trim();
                        const sectionHasContent = sectionText.length > 0 || 
                                                  existingSection.querySelector('img, svg, iframe, video, audio, .card, .grid, .service-card, h1, h2, h3, p, a, button') !== null;
                        
                        // Дополнительная проверка: если секция содержит только пустые div-обертки
                        const allChildren = existingSection.querySelectorAll('*');
                        let hasAnyRealContent = false;
                        for (const child of allChildren) {
                            if (child.textContent.trim().length > 0 || 
                                child.querySelector('img, svg, iframe, video, audio, .card, .grid, .service-card, h1, h2, h3, p, a, button')) {
                                hasAnyRealContent = true;
                                break;
                            }
                        }
                        
                        if (!sectionHasContent || !hasAnyRealContent) {
                            console.log(`[CMS Loader] ⚠️ Section "${sectionTitle}" became empty after replacement`);
                            console.log(`[CMS Loader] Section HTML:`, existingSection.innerHTML.substring(0, 200));
                            // Не удаляем секцию, если она содержит хотя бы заголовок
                            const hasTitle = existingSection.querySelector('h1, h2, h3, .section-title');
                            if (!hasTitle) {
                                console.log(`[CMS Loader] Removing empty section "${sectionTitle}"`);
                                existingSection.remove();
                            } else {
                                console.log(`[CMS Loader] Keeping section "${sectionTitle}" with title only`);
                            }
                        } else {
                            console.log(`[CMS Loader] ✅ Replaced section "${sectionTitle}" (${index + 1} of ${regularSections.length})`);
                            console.log(`[CMS Loader] Section content length:`, existingSection.innerHTML.length);
                        }
                        
                        // Удалить из карты, чтобы не использовать повторно
                        existingSectionsMap.delete(sectionTitle);
                    } else {
                        // Если секция не найдена по заголовку, попробовать по индексу (fallback)
                        if (existingSections[index]) {
                            console.log(`[CMS Loader] ⚠️ Section "${sectionTitle}" not found by title, using index ${index}`);
                            const existingSection = existingSections[index];
                            const originalClasses = existingSection.className;
                            const originalAttributes = {};
                            Array.from(existingSection.attributes).forEach(attr => {
                                if (attr.name !== 'class' && attr.name !== 'style') {
                                    originalAttributes[attr.name] = attr.value;
                                }
                            });
                            
                            // КРИТИЧНО: Извлечь содержимое секции правильно (fallback)
                            let sectionContent = '';
                            
                            const sectionContainer = section.querySelector('.container');
                            if (sectionContainer) {
                                console.log('[CMS Loader] Section has container (fallback), using container content');
                                sectionContent = sectionContainer.innerHTML;
                            } else {
                                console.log('[CMS Loader] Section has no container (fallback), using full section content');
                                sectionContent = section.innerHTML;
                            }
                            
                            // КРИТИЧНО: Проверить, что контент не пустой
                            if (!sectionContent || sectionContent.trim().length === 0) {
                                console.warn(`[CMS Loader] ⚠️ Section "${sectionTitle}" has empty content (fallback), skipping replacement`);
                                return; // Пропускаем пустые секции
                            }
                            
                            // КРИТИЧНО: Очистить секцию перед вставкой нового контента
                            existingSection.innerHTML = '';
                            
                            // Вставить контент через DocumentFragment для сохранения структуры
                            const tempContainer = document.createElement('div');
                            tempContainer.innerHTML = sectionContent;
                            
                            // КРИТИЧНО: Удалить дублирующиеся заголовки из вставляемого контента (fallback)
                            if (sectionTitle) {
                                const headingsInContent = tempContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
                                headingsInContent.forEach(heading => {
                                    const headingText = heading.textContent.trim();
                                    if (headingText === sectionTitle) {
                                        console.log(`[CMS Loader] Removing duplicate heading "${sectionTitle}" from content (fallback, already in section structure)`);
                                        heading.remove();
                                    }
                                });
                            }
                            
                            // Переместить все дочерние элементы в секцию
                            while (tempContainer.firstChild) {
                                existingSection.appendChild(tempContainer.firstChild);
                            }
                            
                            // КРИТИЧНО: Удалить неправильные классы и атрибуты из заголовков сразу после вставки
                            // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                            existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                                // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                                if (heading.classList.contains('section') && !heading.classList.contains('section-title') && !heading.classList.contains('section-subtitle')) {
                                    heading.classList.remove('section');
                                }
                                heading.classList.remove('main-section', 'home-section-container');
                                heading.removeAttribute('data-cms-processed');
                                heading.removeAttribute('style');
                            });
                            
                            // КРИТИЧНО: Удалить дублирующиеся заголовки внутри секции после вставки (fallback)
                            const headingsInSection = existingSection.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            const seenHeadingTexts = new Set();
                            let removedDuplicateHeadings = 0;
                            headingsInSection.forEach(heading => {
                                const headingText = heading.textContent.trim();
                                if (headingText && seenHeadingTexts.has(headingText)) {
                                    console.log(`[CMS Loader] ⚠️ Removing duplicate heading (fallback): "${headingText.substring(0, 50)}"`);
                                    heading.remove();
                                    removedDuplicateHeadings++;
                                } else if (headingText) {
                                    seenHeadingTexts.add(headingText);
                                }
                            });
                            if (removedDuplicateHeadings > 0) {
                                console.log(`[CMS Loader] ✅ Removed ${removedDuplicateHeadings} duplicate heading(s) from section (fallback)`);
                            }
                            
                            const mergedClasses = new Set(originalClasses.split(' ').filter(c => c));
                            sectionClasses.forEach(cls => mergedClasses.add(cls));
                            existingSection.className = Array.from(mergedClasses).join(' ');
                            
                            Object.keys(originalAttributes).forEach(attrName => {
                                existingSection.setAttribute(attrName, originalAttributes[attrName]);
                            });
                            
                            existingSection.removeAttribute('style');
                            existingSection.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
                            
                            // КРИТИЧНО: Убедиться, что секция и все её элементы видимы
                            existingSection.style.setProperty('opacity', '1', 'important');
                            existingSection.style.setProperty('visibility', 'visible', 'important');
                            existingSection.style.setProperty('display', '', 'important');
                            
                            // Удалить классы анимации
                            existingSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            existingSection.querySelectorAll('*').forEach(el => {
                                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                // КРИТИЧНО: Удалить неправильные классы и атрибуты из заголовков
                                if (el.tagName && el.tagName.match(/^H[1-6]$/)) {
                                    el.classList.remove('section', 'main-section', 'home-section-container');
                                    el.removeAttribute('data-cms-processed');
                                    el.removeAttribute('style');
                                }
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                            });
                            
                            // Удалить пустые элементы из замененной секции
                            const emptyInSection = existingSection.querySelectorAll('*:empty');
                            emptyInSection.forEach(el => {
                                if (el.tagName !== 'BR' && el.tagName !== 'HR' && el.tagName !== 'IMG' && el.tagName !== 'INPUT' && el.tagName !== 'SVG') {
                                    if (!el.textContent.trim() && el.children.length === 0) {
                                        el.remove();
                                    }
                                }
                            });
                            
                            // Удалить пустые обертки
                            const emptyWrappers = existingSection.querySelectorAll('div:empty, section:empty');
                            emptyWrappers.forEach(wrapper => {
                                if (!wrapper.classList.contains('container') && 
                                    !wrapper.classList.contains('grid') && 
                                    !wrapper.classList.contains('card') &&
                                    !wrapper.classList.contains('service-card')) {
                                    wrapper.remove();
                                }
                            });
                            
                            updateContentPaths(existingSection, null);
                        } else {
                            // Если секций больше, чем существующих, добавляем новые
                            console.log(`[CMS Loader] Adding new section "${sectionTitle}" (${index + 1} of ${regularSections.length})`);
                            
                            // КРИТИЧНО: Проверить, не существует ли уже секция с таким заголовком
                            // Проверяем ВСЕ секции на странице, не только обработанные
                            const existingSectionWithTitle = Array.from(document.querySelectorAll('section')).find(s => {
                                const titleEl = s.querySelector('h1, h2, h3, .section-title');
                                return titleEl && titleEl.textContent.trim() === sectionTitle;
                            });
                            
                            // КРИТИЧНО: Если секция уже существует (даже без data-cms-processed), не добавлять её снова
                            if (existingSectionWithTitle) {
                                console.log(`[CMS Loader] ⚠️ Section "${sectionTitle}" already exists on page, skipping duplicate`);
                                return; // Пропускаем дубликаты
                            }
                            
                            const clonedSection = section.cloneNode(true);
                            
                            // Пометить секцию как обработанную
                            clonedSection.setAttribute('data-cms-processed', 'true');
                            
                            // КРИТИЧНО: Убедиться, что секция видна
                            clonedSection.style.setProperty('opacity', '1', 'important');
                            clonedSection.style.setProperty('visibility', 'visible', 'important');
                            clonedSection.style.setProperty('display', '', 'important');
                            
                            // Удалить классы анимации
                            clonedSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            clonedSection.querySelectorAll('*').forEach(el => {
                                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                // КРИТИЧНО: Удалить неправильные классы из заголовков
                                // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                                if (el.tagName && el.tagName.match(/^H[1-6]$/)) {
                                    // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                                    if (el.classList.contains('section') && !el.classList.contains('section-title') && !el.classList.contains('section-subtitle')) {
                                        el.classList.remove('section');
                                    }
                                    el.classList.remove('main-section', 'home-section-container');
                                    el.removeAttribute('data-cms-processed');
                                    el.removeAttribute('style');
                                }
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                            });
                            
                            if (mainContent.tagName === 'SECTION') {
                                // Если mainContent - это секция, добавляем после нее
                                mainContent.parentNode.insertBefore(clonedSection, mainContent.nextSibling);
                            } else {
                                mainContent.appendChild(clonedSection);
                            }
                            // Обновить пути в новом элементе
                            updateContentPaths(clonedSection, null);
                            console.log(`[CMS Loader] ✅ Added new section "${sectionTitle}"`);
                        }
                    }
                });
                
                // КРИТИЧНО: После обработки обычных секций проверить, не остался ли необработанный контент в tempDiv
                // Это может быть контент, который не в секциях (например, просто в container)
                const remainingContentInTempDiv = tempDiv.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                const remainingSections = tempDiv.querySelectorAll('section');
                const hasRemainingSections = remainingSections.length > 0;
                const hasRemainingContent = remainingContentInTempDiv.length > 100 && 
                    (tempDiv.querySelector('h2, h3, .card, .grid, p, div.container') !== null);
                
                // КРИТИЧНО: Проверить, есть ли извлеченный контент из пропущенных секций
                const extractedContent = tempDiv.dataset.extractedContent ? tempDiv.dataset.extractedContent.trim() : '';
                const hasExtractedContent = extractedContent.length > 100;
                
                // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ
                console.log('[CMS Loader] ========== CHECKING FOR REMAINING CONTENT ==========');
                console.log('[CMS Loader] remainingContentInTempDiv length:', remainingContentInTempDiv.length);
                console.log('[CMS Loader] remainingSections count:', remainingSections.length);
                console.log('[CMS Loader] hasRemainingSections:', hasRemainingSections);
                console.log('[CMS Loader] hasRemainingContent:', hasRemainingContent);
                console.log('[CMS Loader] extractedContent length:', extractedContent.length);
                console.log('[CMS Loader] hasExtractedContent:', hasExtractedContent);
                if (remainingContentInTempDiv.length > 0) {
                    console.log('[CMS Loader] remainingContentInTempDiv preview:', remainingContentInTempDiv.substring(0, 500));
                }
                if (remainingSections.length > 0) {
                    console.log('[CMS Loader] Remaining sections:', Array.from(remainingSections).map(s => {
                        const title = s.querySelector('h1, h2, h3, .section-title');
                        return title ? title.textContent.trim() : s.className;
                    }));
                }
                if (extractedContent.length > 0) {
                    console.log('[CMS Loader] extractedContent preview:', extractedContent.substring(0, 500));
                }
                
                // КРИТИЧНО: Если есть секции в tempDiv, но они не были обработаны, извлечь из них контент
                if (hasRemainingSections && remainingSections.length > 0) {
                    console.log('[CMS Loader] ⚠️ Found unprocessed sections in tempDiv, extracting content from them');
                    let extractedFromSections = '';
                    remainingSections.forEach((section, idx) => {
                        const sectionTitle = section.querySelector('h1, h2, h3, .section-title')?.textContent.trim() || `Section ${idx + 1}`;
                        console.log(`[CMS Loader] Processing unprocessed section: "${sectionTitle}"`);
                        
                        // Проверить, не является ли это специальной секцией
                        const isSpecialSection = section.classList.contains('service-order') || 
                                                 section.classList.contains('service-tariffs') || 
                                                 section.classList.contains('service-faq') ||
                                                 section.classList.contains('service-features') ||
                                                 section.classList.contains('service-specs') ||
                                                 section.classList.contains('service-cases') ||
                                                 section.classList.contains('service-howto');
                        
                        if (!isSpecialSection) {
                            // Извлечь контент из обычной секции
                            const sectionContent = section.innerHTML.trim();
                            if (sectionContent.length > 50) {
                                extractedFromSections += sectionContent + '\n';
                                console.log(`[CMS Loader] Extracted ${sectionContent.length} chars from section "${sectionTitle}"`);
                            }
                        } else {
                            console.log(`[CMS Loader] Skipping special section "${sectionTitle}"`);
                        }
                    });
                    
                    if (extractedFromSections.length > 0) {
                        if (!tempDiv.dataset.extractedContent) {
                            tempDiv.dataset.extractedContent = '';
                        }
                        tempDiv.dataset.extractedContent += extractedFromSections;
                        console.log('[CMS Loader] Added extracted content from unprocessed sections, total length:', tempDiv.dataset.extractedContent.length);
                    }
                }
                
                // Обновить переменные после извлечения контента из секций
                const finalExtractedContent = tempDiv.dataset.extractedContent ? tempDiv.dataset.extractedContent.trim() : '';
                const finalHasExtractedContent = finalExtractedContent.length > 100;
                
                console.log('[CMS Loader] Final check:');
                console.log('[CMS Loader] - !hasRemainingSections:', !hasRemainingSections);
                console.log('[CMS Loader] - hasRemainingContent:', hasRemainingContent);
                console.log('[CMS Loader] - finalHasExtractedContent:', finalHasExtractedContent);
                console.log('[CMS Loader] - Condition result:', (!hasRemainingSections && hasRemainingContent) || finalHasExtractedContent);
                
                if ((!hasRemainingSections && hasRemainingContent) || finalHasExtractedContent) {
                    console.log('[CMS Loader] Found remaining/extracted content after processing sections, processing it');
                    console.log('[CMS Loader] Remaining content length:', remainingContentInTempDiv.length);
                    console.log('[CMS Loader] Extracted content length:', extractedContent.length);
                    
                    // Найти контейнер для вставки
                    let targetContainer = mainContent.querySelector('.container');
                    console.log('[CMS Loader] Looking for target container:');
                    console.log('[CMS Loader] - mainContent:', mainContent.tagName, mainContent.className || mainContent.id || 'no class/id');
                    console.log('[CMS Loader] - Found .container in mainContent:', targetContainer ? 'yes' : 'no');
                    
                    if (!targetContainer && mainContent.tagName === 'SECTION') {
                        console.log('[CMS Loader] mainContent is SECTION, creating .container inside');
                        targetContainer = document.createElement('div');
                        targetContainer.className = 'container';
                        mainContent.appendChild(targetContainer);
                    } else if (!targetContainer) {
                        console.log('[CMS Loader] mainContent is not SECTION and no .container found, using mainContent directly');
                        targetContainer = mainContent;
                        
                        // КРИТИЧНО: Если mainContent - это main, и он пустой, создать .container внутри
                        if (targetContainer.tagName === 'MAIN' && (!targetContainer.innerHTML.trim() || targetContainer.innerHTML.trim().length < 50)) {
                            console.log('[CMS Loader] mainContent is MAIN and empty, creating .container inside');
                            const newContainer = document.createElement('div');
                            newContainer.className = 'container';
                            targetContainer.appendChild(newContainer);
                            targetContainer = newContainer;
                        }
                    }
                    
                    console.log('[CMS Loader] Final targetContainer:', targetContainer.tagName, targetContainer.className || targetContainer.id || 'no class/id');
                    console.log('[CMS Loader] Final targetContainer innerHTML length:', targetContainer.innerHTML.length);
                    console.log('[CMS Loader] Final targetContainer innerHTML:', targetContainer.innerHTML.substring(0, 200));
                    
                    if (targetContainer) {
                        console.log('[CMS Loader] ✅ Target container found:', targetContainer.className || 'no class');
                        console.log('[CMS Loader] Container current innerHTML length:', targetContainer.innerHTML.length);
                        console.log('[CMS Loader] Container current innerHTML:', targetContainer.innerHTML.substring(0, 200));
                        
                        // Объединить оставшийся контент и извлеченный контент
                        let contentToInsert = '';
                        if (finalHasExtractedContent && remainingContentInTempDiv) {
                            contentToInsert = finalExtractedContent + '\n' + remainingContentInTempDiv;
                        } else if (finalHasExtractedContent) {
                            contentToInsert = finalExtractedContent;
                        } else {
                            contentToInsert = remainingContentInTempDiv;
                        }
                        
                        console.log('[CMS Loader] contentToInsert length:', contentToInsert.length);
                        console.log('[CMS Loader] contentToInsert preview:', contentToInsert.substring(0, 500));
                        
                        console.log('[CMS Loader] Combined content length:', contentToInsert.length);
                        console.log('[CMS Loader] Combined content preview:', contentToInsert.substring(0, 300));
                        
                        // Удалить специальные секции из контента перед вставкой
                        const tempContentDiv = document.createElement('div');
                        tempContentDiv.innerHTML = contentToInsert;
                        tempContentDiv.querySelectorAll('section.service-order, section.service-tariffs, section.service-faq, section.service-features, section.service-specs, section.service-cases, section.service-howto').forEach(s => s.remove());
                        
                        // Также удалить секции с формами заказа
                        tempContentDiv.querySelectorAll('section').forEach(section => {
                            const hasOrderForm = section.querySelector('.order-form, form.order-form, [class*="order-form"]') !== null;
                            if (hasOrderForm) {
                                section.remove();
                            }
                        });
                        
                        const cleanedContent = tempContentDiv.innerHTML.trim();
                        
                        console.log('[CMS Loader] cleanedContent length:', cleanedContent.length);
                        console.log('[CMS Loader] cleanedContent preview:', cleanedContent.substring(0, 500));
                        
                        if (cleanedContent) {
                            const existingContent = targetContainer.innerHTML.trim();
                            console.log('[CMS Loader] existingContent length:', existingContent.length);
                            console.log('[CMS Loader] existingContent:', existingContent.substring(0, 200));
                            
                            // КРИТИЧНО: Если контейнер содержит только комментарий, полностью заменить содержимое
                            const isOnlyComment = existingContent.match(/^<!--[\s\S]*?-->[\s\S]*?$/) || existingContent.length < 50;
                            console.log('[CMS Loader] isOnlyComment:', isOnlyComment);
                            
                            if (isOnlyComment || !existingContent || existingContent.length < 50) {
                                console.log('[CMS Loader] Replacing container content (existing is empty or comment)');
                                targetContainer.innerHTML = cleanedContent;
                                console.log('[CMS Loader] ✅ Replaced container content with CMS content');
                                console.log('[CMS Loader] targetContainer.innerHTML after replace length:', targetContainer.innerHTML.length);
                            } else {
                                console.log('[CMS Loader] Appending CMS content to existing content');
                                targetContainer.innerHTML = existingContent + '\n\n' + cleanedContent;
                                console.log('[CMS Loader] ✅ Appended CMS content to existing container content');
                                console.log('[CMS Loader] targetContainer.innerHTML after append length:', targetContainer.innerHTML.length);
                            }
                            
                            // КРИТИЧНО: Убедиться, что контент виден
                            targetContainer.style.setProperty('opacity', '1', 'important');
                            targetContainer.style.setProperty('visibility', 'visible', 'important');
                            targetContainer.style.setProperty('display', 'block', 'important');
                            
                            // Удалить классы анимации
                            targetContainer.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            targetContainer.querySelectorAll('*').forEach(el => {
                                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                            });
                            
                            updateContentPaths(targetContainer, null);
                            console.log('[CMS Loader] ✅ Inserted remaining/extracted content into container');
                        } else {
                            console.warn('[CMS Loader] ⚠️ Cleaned content is empty after removing special sections');
                        }
                    } else {
                        console.warn('[CMS Loader] ⚠️ Target container not found for remaining content');
                    }
                }
                
                // КРИТИЧНО: Финальная очистка всех дубликатов форм заказа
                console.log('[CMS Loader] Performing final cleanup of duplicate order forms');
                // Найти все секции с формами заказа (не используем :has() для совместимости)
                const allSections = document.querySelectorAll('section');
                const allOrderForms = Array.from(allSections).filter(section => {
                    return section.classList.contains('service-order') || 
                           section.querySelector('.order-form') !== null ||
                           section.querySelector('form.order-form') !== null ||
                           (section.textContent.includes('Заказать услугу') && 
                            section.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]').length >= 3);
                });
                console.log(`[CMS Loader] Found ${allOrderForms.length} sections with order forms on page`);
                
                if (allOrderForms.length > 1) {
                    // Оставить только первую секцию с формой заказа, которая имеет data-cms-processed
                    let keptSection = null;
                    const sectionsToRemove = [];
                    
                    allOrderForms.forEach((section, index) => {
                        if (section.hasAttribute('data-cms-processed') && !keptSection) {
                            keptSection = section;
                            console.log(`[CMS Loader] Keeping order form section #${index + 1} (has data-cms-processed)`);
                        } else {
                            sectionsToRemove.push(section);
                            console.log(`[CMS Loader] Marking order form section #${index + 1} for removal`);
                        }
                    });
                    
                    // Если не нашли секцию с data-cms-processed, оставить первую
                    if (!keptSection && allOrderForms.length > 0) {
                        keptSection = allOrderForms[0];
                        sectionsToRemove.shift(); // Удалить первую из списка на удаление
                        console.log(`[CMS Loader] No section with data-cms-processed found, keeping first one`);
                    }
                    
                    // Удалить все дубликаты
                    sectionsToRemove.forEach((section, index) => {
                        console.log(`[CMS Loader] ⚠️ Removing duplicate order form section #${index + 1}`);
                        section.remove();
                    });
                    
                    console.log(`[CMS Loader] ✅ Removed ${sectionsToRemove.length} duplicate order form section(s)`);
                } else if (allOrderForms.length === 1) {
                    console.log(`[CMS Loader] ✅ Only 1 order form section found, no duplicates`);
                }
                
                // КРИТИЧНО: Финальная очистка всех заголовков на странице после обработки всех секций
                // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                console.log('[CMS Loader] Performing final cleanup of headings');
                document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                    // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                    if (heading.classList.contains('section') && !heading.classList.contains('section-title') && !heading.classList.contains('section-subtitle')) {
                        heading.classList.remove('section');
                    }
                    heading.classList.remove('main-section', 'home-section-container');
                    heading.removeAttribute('data-cms-processed');
                    // Удалить inline стили только если они были добавлены нами
                    const style = heading.getAttribute('style');
                    if (style && (style.includes('opacity') || style.includes('visibility'))) {
                        heading.removeAttribute('style');
                    }
                });
                console.log('[CMS Loader] ✅ Final cleanup of headings completed');
            } else {
                // Если нет обычных секций, но есть специальные секции, вставить их
                if (specialSections.length > 0) {
                    console.log('[CMS Loader] No regular sections, but found special sections, inserting them');
                    specialSections.forEach((section) => {
                        console.log('[CMS Loader] Processing special section (fallback):', section.className);
                        
                        // КРИТИЧНО: Проверить, не существует ли уже такая секция
                        const sectionClass = Array.from(section.classList).find(c => c.startsWith('service-'));
                        if (sectionClass) {
                            // Проверить все секции с таким классом на странице
                            const allExistingSections = document.querySelectorAll(`section.${sectionClass}`);
                            console.log(`[CMS Loader] (Fallback) Found ${allExistingSections.length} existing section(s) with class "${sectionClass}" on page`);
                            
                            if (allExistingSections.length > 0) {
                                // Если секции уже есть, удалить все дубликаты
                                allExistingSections.forEach((existingSection, index) => {
                                    console.log(`[CMS Loader] (Fallback) Removing duplicate special section ${index + 1}: ${sectionClass}`);
                                    existingSection.remove();
                                });
                                console.log(`[CMS Loader] (Fallback) ✅ Removed ${allExistingSections.length} duplicate special section(s)`);
                            }
                        }
                        
                        const clonedSection = section.cloneNode(true);
                        
                        // Пометить секцию как обработанную
                        clonedSection.setAttribute('data-cms-processed', 'true');
                        
                        // КРИТИЧНО: Убедиться, что секция видна
                        clonedSection.style.setProperty('opacity', '1', 'important');
                        clonedSection.style.setProperty('visibility', 'visible', 'important');
                        clonedSection.style.setProperty('display', '', 'important');
                        
                        // Удалить классы анимации
                        clonedSection.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                        clonedSection.querySelectorAll('*').forEach(el => {
                            el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            // КРИТИЧНО: Удалить неправильные классы и атрибуты из заголовков
                            // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
                            if (el.tagName && el.tagName.match(/^H[1-6]$/)) {
                                // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
                                if (el.classList.contains('section') && !el.classList.contains('section-title') && !el.classList.contains('section-subtitle')) {
                                    el.classList.remove('section');
                                }
                                el.classList.remove('main-section', 'home-section-container');
                                el.removeAttribute('data-cms-processed');
                                el.removeAttribute('style');
                            }
                            el.style.setProperty('opacity', '1', 'important');
                            el.style.setProperty('visibility', 'visible', 'important');
                        });
                        
                        if (mainContent.tagName === 'SECTION') {
                            mainContent.parentNode.insertBefore(clonedSection, mainContent.nextSibling);
                        } else {
                            mainContent.appendChild(clonedSection);
                        }
                        updateContentPaths(clonedSection, null);
                        
                        // Финальная проверка после вставки (fallback)
                        if (sectionClass) {
                            const finalCheck = document.querySelectorAll(`section.${sectionClass}`);
                            if (finalCheck.length > 1) {
                                console.warn(`[CMS Loader] (Fallback) ⚠️ WARNING: Found ${finalCheck.length} sections with class "${sectionClass}" after insertion!`);
                                for (let i = 0; i < finalCheck.length - 1; i++) {
                                    console.log(`[CMS Loader] (Fallback) Removing duplicate #${i + 1} of ${finalCheck.length}`);
                                    finalCheck[i].remove();
                                }
                            } else {
                                console.log(`[CMS Loader] (Fallback) ✅ Confirmed: Only 1 section with class "${sectionClass}" on page`);
                            }
                        }
                    });
                }
                
                // КРИТИЧНО: Проверить, не остались ли специальные секции в tempDiv, которые не были обработаны
                const remainingSpecialSections = tempDiv.querySelectorAll('section.service-order, section.service-tariffs, section.service-faq, section.service-features, section.service-specs, section.service-cases, section.service-howto');
                if (remainingSpecialSections.length > 0) {
                    console.log('[CMS Loader] Found remaining special sections in tempDiv, processing them');
                    remainingSpecialSections.forEach((section) => {
                        const sectionClass = Array.from(section.classList).find(c => c.startsWith('service-'));
                        if (sectionClass) {
                            const existingSpecialSection = document.querySelector(`section.${sectionClass}`);
                            if (existingSpecialSection && existingSpecialSection.hasAttribute('data-cms-processed')) {
                                console.log('[CMS Loader] ⚠️ Special section already processed, skipping:', sectionClass);
                                return;
                            }
                            // Удалить существующую секцию, если она не обработана
                            if (existingSpecialSection) {
                                console.log('[CMS Loader] Removing unprocessed duplicate special section:', sectionClass);
                                existingSpecialSection.remove();
                            }
                        }
                    });
                }
                
                // КРИТИЧНО: Если есть обычные секции, но они все были пропущены (например, содержат формы заказа),
                // нужно обработать контент, который не в секциях
                const hasUnprocessedContent = tempDiv.innerHTML.trim().length > 0 && 
                    tempDiv.querySelectorAll('section').length === 0 &&
                    (tempDiv.querySelector('h2, h3, .card, .grid, p') !== null);
                
                if (hasUnprocessedContent) {
                    console.log('[CMS Loader] Found unprocessed content without sections, processing it');
                    // Обернуть весь контент в секцию или вставить в существующий container
                    let targetContainer = mainContent.querySelector('.container');
                    if (!targetContainer && mainContent.tagName === 'SECTION') {
                        targetContainer = document.createElement('div');
                        targetContainer.className = 'container';
                        mainContent.appendChild(targetContainer);
                    } else if (!targetContainer) {
                        targetContainer = mainContent;
                    }
                    
                    // Вставить контент из tempDiv
                    const contentToInsert = tempDiv.innerHTML.trim();
                    if (contentToInsert) {
                        // Удалить специальные секции из контента перед вставкой
                        const tempContentDiv = document.createElement('div');
                        tempContentDiv.innerHTML = contentToInsert;
                        tempContentDiv.querySelectorAll('section.service-order, section.service-tariffs, section.service-faq, section.service-features, section.service-specs, section.service-cases, section.service-howto').forEach(s => s.remove());
                        const cleanedContent = tempContentDiv.innerHTML.trim();
                        
                        if (cleanedContent) {
                            const existingContent = targetContainer.innerHTML.trim();
                            if (!existingContent || existingContent.length < 50) {
                                targetContainer.innerHTML = cleanedContent;
                            } else {
                                targetContainer.innerHTML = existingContent + '\n\n' + cleanedContent;
                            }
                            console.log('[CMS Loader] ✅ Inserted unprocessed content into container');
                        }
                    }
                }
                
                // Если нет секций в контенте CMS, заменяем содержимое .container внутри секции
                console.log('[CMS Loader] No sections found in CMS content, replacing container content');
                console.log('[CMS Loader] mainContent:', mainContent.tagName, mainContent.className || 'no class');
                console.log('[CMS Loader] tempDiv.innerHTML length:', tempDiv.innerHTML.length);
                console.log('[CMS Loader] tempDiv.innerHTML:', tempDiv.innerHTML.substring(0, 500));
                
                // Если mainContent - это секция, заменяем только содержимое .container внутри
                if (mainContent.tagName === 'SECTION') {
                    console.log('[CMS Loader] mainContent is a SECTION, looking for .container');
                    let container = mainContent.querySelector('.container');
                    console.log('[CMS Loader] Found container in section (querySelector):', container ? 'yes' : 'no');
                    
                    // Проверить все контейнеры в секции
                    const allContainers = mainContent.querySelectorAll('.container');
                    console.log('[CMS Loader] All containers in section:', allContainers.length);
                    allContainers.forEach((c, idx) => {
                        const hasSidebar = c.querySelector('[data-component="sidebar-about"]');
                        console.log(`[CMS Loader] Container ${idx}: hasSidebar=${!!hasSidebar}, innerHTML length=${c.innerHTML.length}`);
                    });
                    
                    // Если контейнер найден и содержит sidebar, найти контейнер с основным контентом
                    if (container) {
                        const sidebarPlaceholder = container.querySelector('[data-component="sidebar-about"]');
                        if (sidebarPlaceholder) {
                            console.log('[CMS Loader] ⚠️ Container contains sidebar, looking for content container');
                            // Найти родительский div с grid layout
                            const gridParent = sidebarPlaceholder.closest('div[style*="grid-template-columns"]');
                            if (gridParent) {
                                console.log('[CMS Loader] Found grid parent with sidebar');
                                // Найти div с основным контентом (следующий после sidebar)
                                // sidebarPlaceholder сам является прямым дочерним элементом grid parent
                                const allChildren = Array.from(gridParent.children);
                                const sidebarIndex = allChildren.indexOf(sidebarPlaceholder);
                                console.log('[CMS Loader] Sidebar placeholder index:', sidebarIndex, 'Total children:', allChildren.length);
                                
                                if (sidebarIndex >= 0 && sidebarIndex < allChildren.length - 1) {
                                    // Следующий элемент после sidebar - это контейнер с контентом
                                    const contentDiv = allChildren[sidebarIndex + 1];
                                    if (contentDiv && contentDiv.tagName === 'DIV') {
                                        container = contentDiv;
                                        console.log('[CMS Loader] ✅ Using content container (next after sidebar placeholder)');
                                    } else {
                                        console.log('[CMS Loader] ⚠️ Next element is not a DIV:', contentDiv?.tagName);
                                    }
                                } else {
                                    console.log('[CMS Loader] ⚠️ Sidebar index out of range or not found');
                                    // Попробуем найти любой div после sidebar
                                    for (let i = sidebarIndex + 1; i < allChildren.length; i++) {
                                        if (allChildren[i].tagName === 'DIV') {
                                            container = allChildren[i];
                                            console.log('[CMS Loader] ✅ Using content container (found div at index', i, ')');
                                            break;
                                        }
                                    }
                                }
                            } else {
                                // Если нет grid parent, ищем следующий div после sidebar
                                const sidebarWrapper = sidebarPlaceholder.parentElement;
                                if (sidebarWrapper && sidebarWrapper.parentElement) {
                                    const allChildren = Array.from(sidebarWrapper.parentElement.children);
                                    const sidebarIndex = allChildren.indexOf(sidebarWrapper);
                                    if (sidebarIndex >= 0 && sidebarIndex < allChildren.length - 1) {
                                        const contentDiv = allChildren[sidebarIndex + 1];
                                        if (contentDiv && contentDiv.tagName === 'DIV') {
                                            container = contentDiv;
                                            console.log('[CMS Loader] ✅ Using content container (next after sidebar)');
                                        }
                                    }
                                }
                            }
                            
                            // КРИТИЧНО: Если контейнер все еще не найден, попробуем найти div с комментарием "Контент из CMS"
                            if (container === mainContent.querySelector('.container')) {
                                console.log('[CMS Loader] ⚠️ Container still points to .container, searching for content div');
                                const contentDivWithComment = Array.from(container.querySelectorAll('div')).find(div => {
                                    const text = div.textContent || '';
                                    return text.includes('Контент из CMS') || text.includes('CMS будет вставлен');
                                });
                                if (contentDivWithComment) {
                                    container = contentDivWithComment;
                                    console.log('[CMS Loader] ✅ Found content div with CMS comment');
                                }
                            }
                        }
                    }
                    
                    // Если контейнер не найден, попробовать найти по другому
                    if (!container) {
                        console.log('[CMS Loader] Container not found via querySelector, trying querySelectorAll');
                        const containers = mainContent.querySelectorAll('.container');
                        console.log('[CMS Loader] Found containers via querySelectorAll:', containers.length);
                        if (containers.length > 0) {
                            // Пропустить контейнеры со sidebar
                            container = Array.from(containers).find(c => !c.querySelector('[data-component="sidebar-about"]')) || containers[0];
                            console.log('[CMS Loader] Using container from querySelectorAll (excluding sidebar)');
                            
                            // Если контейнер содержит sidebar, найти div для контента
                            if (container && container.querySelector('[data-component="sidebar-about"]')) {
                                const sidebarPlaceholder = container.querySelector('[data-component="sidebar-about"]');
                                const gridParent = sidebarPlaceholder.closest('div[style*="grid-template-columns"]');
                                if (gridParent) {
                                    const allChildren = Array.from(gridParent.children);
                                    const sidebarIndex = allChildren.indexOf(sidebarPlaceholder);
                                    if (sidebarIndex >= 0 && sidebarIndex < allChildren.length - 1) {
                                        const contentDiv = allChildren[sidebarIndex + 1];
                                        if (contentDiv && contentDiv.tagName === 'DIV') {
                                            container = contentDiv;
                                            console.log('[CMS Loader] ✅ Found content div in grid (fallback method)');
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // ФИНАЛЬНАЯ ПРОВЕРКА: Если контейнер все еще указывает на .container с sidebar, найти div для контента
                    if (container && container.querySelector('[data-component="sidebar-about"]')) {
                        console.log('[CMS Loader] ⚠️ Final check: container still has sidebar, searching for content div');
                        const sidebarPlaceholder = container.querySelector('[data-component="sidebar-about"]');
                        const gridParent = sidebarPlaceholder.closest('div[style*="grid-template-columns"]');
                        if (gridParent) {
                            const allChildren = Array.from(gridParent.children);
                            const sidebarIndex = allChildren.indexOf(sidebarPlaceholder);
                            if (sidebarIndex >= 0 && sidebarIndex < allChildren.length - 1) {
                                const contentDiv = allChildren[sidebarIndex + 1];
                                if (contentDiv && contentDiv.tagName === 'DIV') {
                                    container = contentDiv;
                                    console.log('[CMS Loader] ✅ Final: Found content div in grid');
                                }
                            }
                        }
                    }
                    
                    if (container) {
                        // Убрана специальная обработка для service pages - все страницы обрабатываются одинаково
                        console.log('[CMS Loader] Using existing container');
                        console.log('[CMS Loader] Container before insert, innerHTML length:', container.innerHTML.length);
                        console.log('[CMS Loader] Container before insert, innerHTML:', container.innerHTML);
                        // Найти .container в контенте CMS
                        const cmsContainer = tempDiv.querySelector('.container');
                        let cmsContainerContent = '';
                        
                        if (cmsContainer) {
                            // Удалить hero-content из container, если он есть
                            const heroContent = cmsContainer.querySelector('.hero-content');
                            if (heroContent) {
                                console.log('[CMS Loader] Removing hero-content from container');
                                heroContent.remove();
                            }
                            
                            // ВАЖНО: Контент из CMS может содержать контент ВНЕ container (h2, карточки и т.д.)
                            // Сначала извлекаем контент из container
                            const containerContent = cmsContainer.innerHTML.trim();
                            console.log('[CMS Loader] Container content extracted, length:', containerContent.length);
                            
                            // Затем удаляем container из tempDiv, чтобы получить контент ВНЕ container
                            cmsContainer.remove();
                            const contentOutsideContainer = tempDiv.innerHTML.trim();
                            console.log('[CMS Loader] Content outside container, length:', contentOutsideContainer.length);
                            
                            // Объединяем: контент из container + контент вне container
                            if (containerContent && contentOutsideContainer) {
                                cmsContainerContent = containerContent + '\n' + contentOutsideContainer;
                            } else if (containerContent) {
                                cmsContainerContent = containerContent;
                            } else {
                                cmsContainerContent = contentOutsideContainer;
                            }
                            
                            console.log('[CMS Loader] Final content length:', cmsContainerContent.length);
                        } else {
                            // Если нет .container, использовать весь контент tempDiv
                            console.log('[CMS Loader] No container found, using all content from tempDiv');
                            cmsContainerContent = tempDiv.innerHTML.trim();
                        }
                        
                        // КРИТИЧНО: Удалить дублирующиеся секции из контента перед вставкой
                        // И нормализовать классы и удалить inline стили
                        if (cmsContainerContent) {
                            const tempContentDiv = document.createElement('div');
                            tempContentDiv.innerHTML = cmsContainerContent;
                            
                            // Найти все секции в контенте
                            const contentSections = tempContentDiv.querySelectorAll('section.main-section, section[class*="section"]');
                            const seenTitles = new Map();
                            let removedContentDuplicates = 0;
                            
                            contentSections.forEach((section) => {
                                const titleElement = section.querySelector('.title-promo-short, h2, h1, .section-title');
                                const title = titleElement ? titleElement.textContent.trim() : '';
                                
                                if (title) {
                                    if (seenTitles.has(title)) {
                                        console.warn(`[CMS Loader] ⚠️ Removing duplicate section from content: "${title}"`);
                                        section.remove();
                                        removedContentDuplicates++;
                                    } else {
                                        seenTitles.set(title, section);
                                        
                                        // Нормализовать классы секции: удалить main-section, оставить только section и специфичные классы
                                        const sectionClasses = section.className.split(' ').filter(cls => {
                                            return cls !== 'main-section' && cls !== 'section';
                                        });
                                        sectionClasses.unshift('section');
                                        section.className = sectionClasses.join(' ');
                                        
                                        // Удалить inline стили из секции и всех дочерних элементов
                                        section.removeAttribute('style');
                                        section.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
                                    }
                                }
                            });
                            
                            // Удалить inline стили из всех элементов контента (не только секций)
                            tempContentDiv.querySelectorAll('[style]').forEach(el => {
                                // Сохранить только критически важные стили (например, display: none для скрытых элементов)
                                const style = el.getAttribute('style');
                                if (style && !style.includes('display: none') && !style.includes('display:none')) {
                                    el.removeAttribute('style');
                                }
                            });
                            
                            // Удалить пустые элементы, которые могут создавать лишнее пространство
                            const emptyElements = tempContentDiv.querySelectorAll('section:empty, div:empty, p:empty, h1:empty, h2:empty, h3:empty');
                            let removedEmptyCount = 0;
                            emptyElements.forEach(el => {
                                // Проверить, что элемент действительно пустой (нет текста, нет дочерних элементов)
                                if (!el.textContent.trim() && el.children.length === 0) {
                                    el.remove();
                                    removedEmptyCount++;
                                }
                            });
                            
                            // Удалить секции, которые содержат только пустые контейнеры
                            const allSections = tempContentDiv.querySelectorAll('section');
                            allSections.forEach(section => {
                                const hasContent = section.textContent.trim().length > 0 || 
                                                  section.querySelector('img, svg, iframe, video, audio') !== null;
                                if (!hasContent) {
                                    section.remove();
                                    removedEmptyCount++;
                                }
                            });
                            
                            if (removedContentDuplicates > 0) {
                                console.log(`[CMS Loader] ✅ Removed ${removedContentDuplicates} duplicate section(s) from content`);
                            }
                            
                            if (removedEmptyCount > 0) {
                                console.log(`[CMS Loader] ✅ Removed ${removedEmptyCount} empty element(s) from content`);
                            }
                            
                            console.log(`[CMS Loader] ✅ Normalized classes and removed inline styles from content`);
                            cmsContainerContent = tempContentDiv.innerHTML.trim();
                        }
                        
                        console.log('[CMS Loader] Final content to insert, length:', cmsContainerContent ? cmsContainerContent.length : 0);
                        if (cmsContainerContent) {
                            console.log('[CMS Loader] Content preview:', cmsContainerContent.substring(0, 200));
                            console.log('[CMS Loader] Full content to insert:', cmsContainerContent);
                        }
                        
                        // Заменить содержимое .container из CMS в существующий .container
                        // ВАЖНО: Полностью очищаем и заменяем, чтобы удалить статичный контент
                        if (cmsContainerContent && cmsContainerContent.trim() !== '') {
                            console.log('[CMS Loader] About to insert content, length:', cmsContainerContent.length);
                            console.log('[CMS Loader] Content preview:', cmsContainerContent.substring(0, 300));
                            
                            // КРИТИЧНО: Удалить классы анимации ДО вставки контента
                            // Это предотвратит запуск анимации с opacity: 0
                            container.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            
                            // Также удалить классы из секции ДО вставки
                            const section = container.closest('section');
                            if (section) {
                                section.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            }
                            
                            // Отключить анимации и переходы ДО вставки контента
                            container.style.setProperty('animation', 'none', 'important');
                            container.style.setProperty('transition', 'none', 'important');
                            container.style.setProperty('opacity', '1', 'important');
                            container.style.setProperty('visibility', 'visible', 'important');
                            if (section) {
                                section.style.setProperty('animation', 'none', 'important');
                                section.style.setProperty('transition', 'none', 'important');
                                section.style.setProperty('opacity', '1', 'important');
                                section.style.setProperty('visibility', 'visible', 'important');
                            }
                            
                            // КРИТИЧНО: Проверить, не содержит ли cmsContainerContent пустые обертки
                            // которые могут создать пустые элементы после вставки
                            if (cmsContainerContent) {
                                const tempCheckDiv = document.createElement('div');
                                tempCheckDiv.innerHTML = cmsContainerContent;
                                
                                // Функция для проверки видимого контента (используем ту же, что и в финальной очистке)
                                function hasVisibleContentInTemp(element) {
                                    const text = element.textContent.trim();
                                    if (text.length > 0) return true;
                                    
                                    const visualElements = element.querySelectorAll('img, svg, iframe, video, audio, canvas, picture');
                                    if (visualElements.length > 0) return true;
                                    
                                    const interactiveElements = element.querySelectorAll('a, button, input, select, textarea, .card, .grid, .service-card, .btn');
                                    if (interactiveElements.length > 0) return true;
                                    
                                    const contentElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th');
                                    for (const el of contentElements) {
                                        if (el.textContent.trim().length > 0) return true;
                                    }
                                    
                                    return false;
                                }
                                
                                // Удалить пустые обертки из контента перед вставкой (используем более строгую проверку)
                                const allWrappers = tempCheckDiv.querySelectorAll('div, section');
                                let removedWrappers = 0;
                                
                                allWrappers.forEach(wrapper => {
                                    // КРИТИЧНО: НИКОГДА не удалять важные контейнеры, даже если они кажутся пустыми
                                    // Они могут содержать контент, который будет виден после применения стилей
                                    if (wrapper.classList.contains('container') || 
                                        wrapper.classList.contains('grid') || 
                                        wrapper.classList.contains('grid-item') ||
                                        wrapper.classList.contains('card') ||
                                        wrapper.classList.contains('service-card') ||
                                        wrapper.classList.contains('hero-content')) {
                                        // Убедиться, что важные контейнеры видимы
                                        wrapper.style.setProperty('opacity', '1', 'important');
                                        wrapper.style.setProperty('visibility', 'visible', 'important');
                                        wrapper.style.setProperty('display', '', 'important');
                                        return;
                                    }
                                    
                                    // Проверить, пустой ли wrapper (используя строгую проверку)
                                    if (!hasVisibleContentInTemp(wrapper)) {
                                        const innerHTML = wrapper.innerHTML.trim();
                                        const isEmpty = innerHTML === '' || 
                                                       innerHTML === '<br>' || 
                                                       innerHTML.replace(/<br\s*\/?>/gi, '').trim() === '';
                                        
                                        if (isEmpty) {
                                            console.log('[CMS Loader] Removing empty wrapper from content before insert:', wrapper.tagName, wrapper.className || 'no class');
                                            wrapper.remove();
                                            removedWrappers++;
                                        }
                                    }
                                });
                                
                                if (removedWrappers > 0) {
                                    console.log(`[CMS Loader] Removed ${removedWrappers} empty wrapper(s) from content before insert`);
                                    // Обновить cmsContainerContent после удаления пустых оберток
                                    cmsContainerContent = tempCheckDiv.innerHTML.trim();
                                }
                            }
                            
                            // Определяем, является ли это страницей услуги (конкретная услуга, не категория)
                            const currentPath = window.location.pathname;
                            const slug = extractSlugFromPath(currentPath);
                            const isServicePage = slug.includes('business/') && 
                                                 (slug.match(/\/internet\/[^\/]+/) || 
                                                  slug.match(/\/telephony\/[^\/]+/) || 
                                                  slug.match(/\/security\/[^\/]+/) || 
                                                  slug.match(/\/cloud\/[^\/]+/) || 
                                                  slug.match(/\/tv\/[^\/]+/));
                            
                            if (isServicePage) {
                                // Для страниц услуг: всегда добавляем контент из CMS к существующему
                                const existingContent = container.innerHTML.trim();
                                const cleanExistingContent = existingContent.replace(/<!--[\s\S]*?-->/g, '').trim();
                                
                                console.log('[CMS Loader] Service page detected - preserving existing content');
                                
                                // Если существующий контент пустой или содержит только комментарии, просто вставляем контент из CMS
                                if (!cleanExistingContent || cleanExistingContent.length < 50) {
                                    container.innerHTML = cmsContainerContent;
                                    console.log('[CMS Loader] No existing content (or only comments), inserting CMS content only');
                                } else {
                                    // Есть существующий контент, проверяем на дублирование
                                    const contentPreview = cmsContainerContent.substring(0, 100);
                                    if (!cleanExistingContent.includes(contentPreview)) {
                                        // Добавляем контент из CMS к существующему
                                        container.innerHTML = cleanExistingContent + '\n\n' + cmsContainerContent;
                                        console.log('[CMS Loader] Content appended to existing content');
                                    } else {
                                        // Контент из CMS уже есть, просто обновляем его (заменяем полностью)
                                        container.innerHTML = cmsContainerContent;
                                        console.log('[CMS Loader] CMS content already in existing content, replacing with fresh CMS content');
                                    }
                                }
                            } else {
                                // Для других страниц (включая категории): заменяем контент полностью
                                container.innerHTML = '';
                                console.log('[CMS Loader] Container cleared, innerHTML length:', container.innerHTML.length);
                                
                                // Вставить контент из CMS
                                container.innerHTML = cmsContainerContent;
                            }
                            console.log('[CMS Loader] Content inserted, container.innerHTML length:', container.innerHTML.length);
                            console.log('[CMS Loader] Container children count:', container.children.length);
                            console.log('[CMS Loader] Container has h2:', container.querySelectorAll('h2').length);
                            console.log('[CMS Loader] Container has .card:', container.querySelectorAll('.card').length);
                            console.log('[CMS Loader] Container innerHTML preview:', container.innerHTML.substring(0, 300));
                            
                            // КРИТИЧНО: Удалить классы анимации из ВСТАВЛЕННОГО контента
                            // Контент из CMS может содержать эти классы
                            const allElements = container.querySelectorAll('*');
                            allElements.forEach(el => {
                                el.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                // Установить opacity: 1 и visibility: visible для всех элементов
                                // Это гарантирует, что все элементы видны
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                                el.style.setProperty('display', '', 'important'); // Удалить display: none если есть
                            });
                            
                            // КРИТИЧНО: Убедиться, что сам контейнер виден
                            container.style.setProperty('opacity', '1', 'important');
                            container.style.setProperty('visibility', 'visible', 'important');
                            container.style.setProperty('display', '', 'important');
                            
                            // Убедиться, что все важные элементы (grid, grid-item, card) видимы
                            const importantElements = container.querySelectorAll('.grid, .grid-item, .card, .container, .hero-content');
                            importantElements.forEach(el => {
                                el.style.setProperty('opacity', '1', 'important');
                                el.style.setProperty('visibility', 'visible', 'important');
                                el.style.setProperty('display', '', 'important');
                            });
                            
                            // Удалить пустые элементы после вставки, которые могут создавать лишнее пространство
                            // КРИТИЧНО: НЕ удалять важные контейнеры (container, grid, grid-item, card, hero-content)
                            const emptyElementsAfterInsert = container.querySelectorAll('section:empty, div:empty, p:empty');
                            let removedAfterInsert = 0;
                            emptyElementsAfterInsert.forEach(el => {
                                // Пропустить важные контейнеры
                                if (el.classList.contains('container') || 
                                    el.classList.contains('grid') || 
                                    el.classList.contains('grid-item') ||
                                    el.classList.contains('card') ||
                                    el.classList.contains('service-card') ||
                                    el.classList.contains('hero-content')) {
                                    return;
                                }
                                
                                if (!el.textContent.trim() && el.children.length === 0) {
                                    el.remove();
                                    removedAfterInsert++;
                                }
                            });
                            
                            // Удалить пустые секции после вставки
                            // КРИТИЧНО: НЕ удалять секции, которые содержат важные контейнеры
                            const sectionsAfterInsert = container.querySelectorAll('section');
                            sectionsAfterInsert.forEach(section => {
                                // Проверить, содержит ли секция важные контейнеры
                                const hasImportantContainers = section.querySelector('.container, .grid, .grid-item, .card, .service-card, .hero-content') !== null;
                                
                                const hasContent = section.textContent.trim().length > 0 || 
                                                  section.querySelector('img, svg, iframe, video, audio, .card, .grid, h1, h2, h3') !== null;
                                
                                // Не удалять секции с важными контейнерами или контентом
                                if (!hasContent && !hasImportantContainers) {
                                    section.remove();
                                    removedAfterInsert++;
                                }
                            });
                            
                            if (removedAfterInsert > 0) {
                                console.log(`[CMS Loader] ✅ Removed ${removedAfterInsert} empty element(s) after insertion`);
                            }
                            
                            // Удалить лишние пустые контейнеры и секции перед футером
                            // Найти последний элемент контента
                            const lastChild = container.lastElementChild;
                            if (lastChild) {
                                // Проверить, не является ли последний элемент пустой секцией или контейнером
                                const isLastEmpty = !lastChild.textContent.trim() && 
                                                   lastChild.querySelector('img, svg, iframe, video, audio, .card, .grid, h1, h2, h3') === null;
                                if (isLastEmpty && (lastChild.tagName === 'SECTION' || lastChild.tagName === 'DIV')) {
                                    console.log('[CMS Loader] ⚠️ Removing empty last element before footer');
                                    lastChild.remove();
                                }
                            }
                            
                            // Проверить сразу после вставки
                            setTimeout(() => {
                                const checkLength = container.innerHTML.length;
                                const checkChildren = container.children.length;
                                console.log('[CMS Loader] Check after 100ms - innerHTML length:', checkLength);
                                console.log('[CMS Loader] Check after 100ms - children count:', checkChildren);
                                if (checkLength === 0 || checkChildren === 0) {
                                    console.error('[CMS Loader] ERROR: Content was removed after insertion!');
                                    console.error('[CMS Loader] Container:', container);
                                    console.error('[CMS Loader] Container parent:', container.parentElement);
                                    // Попробовать вставить еще раз
                                    container.innerHTML = cmsContainerContent;
                                    console.log('[CMS Loader] Re-inserted content');
                                }
                            }, 100);
                            
                            updateContentPaths(container, null);
                            
                            // КРИТИЧНО: Преобразовать простые карточки в структуру тарифов
                            // Получить gridType из data-атрибута контейнера (если есть)
                            const containerGridType = container.getAttribute('data-grid-type');
                            
                            // Обработать карточки после небольшой задержки, чтобы DOM был полностью готов
                            setTimeout(() => {
                                enhanceTariffCards(container, containerGridType);
                                
                                // Функция для проверки, имеет ли элемент визуально значимый контент
                                function hasVisibleContent(element) {
                                    // Проверить наличие текста (исключая только пробелы и переносы строк)
                                    const text = element.textContent.trim();
                                    if (text.length > 0) {
                                        return true;
                                    }
                                    
                                    // Проверить наличие визуальных элементов
                                    const visualElements = element.querySelectorAll('img, svg, iframe, video, audio, canvas, picture');
                                    if (visualElements.length > 0) {
                                        return true;
                                    }
                                    
                                    // Проверить наличие интерактивных элементов
                                    const interactiveElements = element.querySelectorAll('a, button, input, select, textarea, .card, .grid, .service-card, .btn');
                                    if (interactiveElements.length > 0) {
                                        return true;
                                    }
                                    
                                    // Проверить наличие заголовков и параграфов с контентом
                                    const contentElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th');
                                    for (const el of contentElements) {
                                        if (el.textContent.trim().length > 0) {
                                            return true;
                                        }
                                    }
                                    
                                    return false;
                                }
                                
                                // Финальная очистка: удалить пустые секции и контейнеры после обработки карточек
                                // Сначала внутри контейнера
                                const finalEmptySections = container.querySelectorAll('section');
                                let removedFromContainer = 0;
                                finalEmptySections.forEach(section => {
                                    if (!hasVisibleContent(section)) {
                                        console.log('[CMS Loader] ⚠️ Removing empty section after card processing:', section.className);
                                        section.remove();
                                        removedFromContainer++;
                                    }
                                });
                                
                                // Удалить пустые div-контейнеры внутри контейнера
                                const finalEmptyDivs = container.querySelectorAll('div');
                                finalEmptyDivs.forEach(div => {
                                    // Пропустить важные контейнеры
                                    if (div.classList.contains('container') || 
                                        div.classList.contains('grid') || 
                                        div.classList.contains('card') ||
                                        div.classList.contains('service-card')) {
                                        return;
                                    }
                                    
                                    if (!hasVisibleContent(div)) {
                                        const parent = div.parentElement;
                                        // Удалить только если это не важный контейнер
                                        if (parent && parent.tagName !== 'SECTION' && !parent.classList.contains('card')) {
                                            console.log('[CMS Loader] ⚠️ Removing empty div container:', div.className);
                                            div.remove();
                                            removedFromContainer++;
                                        }
                                    }
                                });
                                
                                if (removedFromContainer > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedFromContainer} empty element(s) from container`);
                                }
                                
                                // КРИТИЧНО: Удалить пустые секции на уровне всей страницы (не только в контейнере)
                                // Это важно, так как пустые секции могут остаться после замены контента
                                const allPageSections = document.querySelectorAll('section.section, section[class*="section"], section.main-section');
                                let removedFromPage = 0;
                                
                                // Собрать все секции в массив для безопасного удаления
                                const sectionsToCheck = Array.from(allPageSections);
                                
                                sectionsToCheck.forEach(section => {
                                    // Пропустить hero секцию
                                    if (section.classList.contains('hero') || section.querySelector('.hero-content')) {
                                        return;
                                    }
                                    
                                    // Более строгая проверка: секция считается пустой, если:
                                    // 1. Нет визуального контента
                                    // 2. Или содержит только пустые div-контейнеры
                                    // 3. Или содержит только пробелы и переносы строк
                                    const hasContent = hasVisibleContent(section);
                                    
                                    if (!hasContent) {
                                        // Дополнительная проверка: может быть секция содержит только пустые вложенные элементы
                                        const allChildren = section.querySelectorAll('*');
                                        let hasAnyContent = false;
                                        
                                        for (const child of allChildren) {
                                            if (hasVisibleContent(child)) {
                                                hasAnyContent = true;
                                                break;
                                            }
                                        }
                                        
                                        if (!hasAnyContent) {
                                            console.log('[CMS Loader] ⚠️ Removing empty section from page:', section.className);
                                            section.remove();
                                            removedFromPage++;
                                        }
                                    }
                                });
                                
                                if (removedFromPage > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedFromPage} empty section(s) from page`);
                                }
                                
                                // Удалить пустые контейнеры на уровне страницы (вне секций)
                                const allPageContainers = document.querySelectorAll('body > .container, main > .container, .main-content > .container');
                                allPageContainers.forEach(containerEl => {
                                    if (!hasVisibleContent(containerEl)) {
                                        console.log('[CMS Loader] ⚠️ Removing empty container from page');
                                        containerEl.remove();
                                    }
                                });
                                
                                // КРИТИЧНО: Финальная проверка - удалить все пустые div-элементы на странице
                                // которые могут остаться после обработки (особенно для main_page)
                                const allEmptyDivs = document.querySelectorAll('div');
                                let removedEmptyDivs = 0;
                                
                                allEmptyDivs.forEach(div => {
                                    // Пропустить важные контейнеры и элементы с контентом
                                    if (div.classList.contains('container') || 
                                        div.classList.contains('grid') || 
                                        div.classList.contains('card') ||
                                        div.classList.contains('service-card') ||
                                        div.classList.contains('hero') ||
                                        div.closest('.hero') ||
                                        hasVisibleContent(div)) {
                                        return;
                                    }
                                    
                                    // Проверить, что div действительно пустой
                                    const innerHTML = div.innerHTML.trim();
                                    const textContent = div.textContent.trim();
                                    
                                    // Дополнительная проверка: может быть div содержит только пустые вложенные элементы
                                    const allChildren = div.querySelectorAll('*');
                                    let hasAnyContent = false;
                                    
                                    for (const child of allChildren) {
                                        if (hasVisibleContent(child)) {
                                            hasAnyContent = true;
                                            break;
                                        }
                                    }
                                    
                                    // Удалить div, если он пустой или содержит только <br> теги
                                    const isEmpty = (innerHTML === '' || innerHTML === '<br>' || innerHTML.replace(/<br\s*\/?>/gi, '').trim() === '') && 
                                                   textContent === '' && !hasAnyContent;
                                    
                                    if (isEmpty) {
                                        // Проверить, что родитель не является важным элементом
                                        const parent = div.parentElement;
                                        if (parent && 
                                            !parent.classList.contains('card') && 
                                            !parent.classList.contains('service-card') &&
                                            !parent.classList.contains('container') &&
                                            parent.tagName !== 'SECTION') {
                                            console.log('[CMS Loader] ⚠️ Removing empty div:', div.className || 'no class');
                                            div.remove();
                                            removedEmptyDivs++;
                                        }
                                    }
                                });
                                
                                if (removedEmptyDivs > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedEmptyDivs} empty div(s) from page`);
                                }
                                
                                // Дополнительная финальная проверка: удалить пустые секции, которые могли остаться
                                // после удаления контента (особенно для main_page)
                                const finalCheckSections = document.querySelectorAll('section');
                                let finalRemoved = 0;
                                
                                finalCheckSections.forEach(section => {
                                    // Пропустить hero секцию
                                    if (section.classList.contains('hero') || section.querySelector('.hero-content')) {
                                        return;
                                    }
                                    
                                    // Проверить, что секция действительно пустая
                                    if (!hasVisibleContent(section)) {
                                        const allChildren = section.querySelectorAll('*');
                                        let hasAnyContent = false;
                                        
                                        for (const child of allChildren) {
                                            if (hasVisibleContent(child)) {
                                                hasAnyContent = true;
                                                break;
                                            }
                                        }
                                        
                                        if (!hasAnyContent) {
                                            console.log('[CMS Loader] ⚠️ Final check: Removing empty section:', section.className);
                                            section.remove();
                                            finalRemoved++;
                                        }
                                    }
                                });
                                
                                if (finalRemoved > 0) {
                                    console.log(`[CMS Loader] ✅ Final check: Removed ${finalRemoved} empty section(s)`);
                                }
                                
                                // КРИТИЧНО: Удалить секции с ненужными классами, которые остались пустыми
                                const unwantedSections = document.querySelectorAll('section.home-section-container, section[class*="home-section-container"]');
                                let removedUnwanted = 0;
                                unwantedSections.forEach(section => {
                                    console.log('[CMS Loader] ⚠️ Removing unwanted section with home-section-container class');
                                    section.remove();
                                    removedUnwanted++;
                                });
                                
                                if (removedUnwanted > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedUnwanted} unwanted section(s) with home-section-container`);
                                }
                                
                                // КРИТИЧНО: Удалить пустые секции с определенными классами (section-gray-horizontal-slider, section-promo-note)
                                // которые остались пустыми после обработки
                                const specificEmptySections = document.querySelectorAll('section.section-gray-horizontal-slider, section.section-promo-note');
                                let removedSpecific = 0;
                                specificEmptySections.forEach(section => {
                                    const hasContent = hasVisibleContent(section);
                                    if (!hasContent) {
                                        console.log('[CMS Loader] ⚠️ Removing empty section with specific class:', section.className);
                                        section.remove();
                                        removedSpecific++;
                                    }
                                });
                                
                                if (removedSpecific > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedSpecific} empty section(s) with specific classes`);
                                }
                                
                                // КРИТИЧНО: Дополнительная проверка - удалить пустые grid контейнеры
                                const emptyGrids = document.querySelectorAll('.grid');
                                let removedEmptyGrids = 0;
                                emptyGrids.forEach(grid => {
                                    if (grid.children.length === 0) {
                                        console.log('[CMS Loader] ⚠️ Removing empty grid container');
                                        grid.remove();
                                        removedEmptyGrids++;
                                    }
                                });
                                
                                if (removedEmptyGrids > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedEmptyGrids} empty grid container(s)`);
                                }
                                
                                // КРИТИЧНО: Удалить пустые карточки (card, service-card) которые могли остаться
                                const emptyCards = document.querySelectorAll('.card:empty, .service-card:empty');
                                let removedEmptyCards = 0;
                                emptyCards.forEach(card => {
                                    if (card.textContent.trim().length === 0 && card.children.length === 0) {
                                        console.log('[CMS Loader] ⚠️ Removing empty card');
                                        card.remove();
                                        removedEmptyCards++;
                                    }
                                });
                                
                                if (removedEmptyCards > 0) {
                                    console.log(`[CMS Loader] ✅ Removed ${removedEmptyCards} empty card(s)`);
                                }
                                
                                // КРИТИЧНО: Финальная очистка всех заголовков на странице
                                console.log('[CMS Loader] Performing final cleanup of all headings on page');
                                document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
                                    heading.classList.remove('section', 'main-section', 'home-section-container');
                                    heading.removeAttribute('data-cms-processed');
                                    // Удалить inline стили только если они были добавлены нами
                                    const style = heading.getAttribute('style');
                                    if (style && (style.includes('opacity') || style.includes('visibility'))) {
                                        heading.removeAttribute('style');
                                    }
                                });
                                console.log('[CMS Loader] ✅ Final cleanup of all headings completed');
                            }, 50);
                            
                            // КРИТИЧНО: Обработать карточки и добавить grid обертку
                            // Используем setTimeout для обработки после полной вставки DOM
                            setTimeout(() => {
                                // Найти все карточки в контейнере, которые еще не в grid (и .card и .service-card)
                                const allCards = container.querySelectorAll('.card, .service-card');
                                const cardsNotInGrid = Array.from(allCards).filter(card => {
                                    const parent = card.parentElement;
                                    return parent && !parent.classList.contains('grid') && parent === container;
                                });
                                
                                if (cardsNotInGrid.length > 0) {
                                    console.log(`[CMS Loader] Found ${cardsNotInGrid.length} cards not in grid, wrapping...`);
                                    
                                    // Получить все прямые дочерние элементы контейнера
                                    const allElements = Array.from(container.children);
                                    
                                    // Обработать элементы, группируя карточки по секциям
                                    let currentGroup = [];
                                    let lastHeadingIndex = -1;
                                    
                                    for (let i = 0; i < allElements.length; i++) {
                                        const el = allElements[i];
                                        
                                        // Пропустить уже существующие grid контейнеры
                                        if (el.classList.contains('grid')) {
                                            if (currentGroup.length > 0) {
                                                wrapCardsInGrid(container, currentGroup, lastHeadingIndex + 1);
                                                currentGroup = [];
                                            }
                                            continue;
                                        }
                                        
                                        // Если это заголовок h2, обработать предыдущую группу карточек
                                        if (el.tagName === 'H2') {
                                            if (currentGroup.length > 0) {
                                                wrapCardsInGrid(container, currentGroup, lastHeadingIndex + 1);
                                                currentGroup = [];
                                            }
                                            lastHeadingIndex = i;
                                        }
                                        // Если это карточка (любого типа) и она еще не в grid, добавить в текущую группу
                                        else if ((el.classList.contains('card') || el.classList.contains('service-card')) && cardsNotInGrid.includes(el)) {
                                            currentGroup.push(el);
                                        }
                                        // Если это другой элемент и есть группа карточек, обработать группу
                                        else if (currentGroup.length > 0) {
                                            wrapCardsInGrid(container, currentGroup, lastHeadingIndex + 1);
                                            currentGroup = [];
                                        }
                                    }
                                    
                                    // Обработать последнюю группу карточек
                                    if (currentGroup.length > 0) {
                                        wrapCardsInGrid(container, currentGroup, lastHeadingIndex + 1);
                                    }
                                } else {
                                    console.log('[CMS Loader] All cards are already in grid containers');
                                }
                            }, 50);
                            
                            // СРАЗУ показать контент (не ждать showCMSContent)
                            // ВАЖНО: Убрать все стили, которые могут скрывать контент
                            
                            // Удалить классы, которые могут скрывать контент (fade-in, animate-in и т.д.)
                            // (уже удалены выше, но на всякий случай еще раз)
                            container.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                            
                            // Также показать родительскую секцию, если она скрыта
                            // (section уже получена выше, но проверим еще раз)
                            if (!section) {
                                const sectionCheck = container.closest('section');
                                if (sectionCheck) {
                                    sectionCheck.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                                    sectionCheck.style.setProperty('animation', 'none', 'important');
                                    sectionCheck.style.setProperty('transition', 'none', 'important');
                                    sectionCheck.style.setProperty('opacity', '1', 'important');
                                    sectionCheck.style.setProperty('visibility', 'visible', 'important');
                                }
                            }
                            
                            // Отключить анимации и переходы (уже сделано выше, но на всякий случай)
                            container.style.setProperty('animation', 'none', 'important');
                            container.style.setProperty('transition', 'none', 'important');
                            if (section) {
                                section.style.setProperty('animation', 'none', 'important');
                                section.style.setProperty('transition', 'none', 'important');
                            }
                            
                            // Используем setProperty с !important для принудительного отображения
                            container.style.setProperty('opacity', '1', 'important');
                            container.style.setProperty('visibility', 'visible', 'important');
                            container.style.setProperty('height', 'auto', 'important');
                            container.style.setProperty('overflow', 'visible', 'important');
                            container.style.setProperty('display', 'block', 'important');
                            container.style.setProperty('min-height', 'auto', 'important');
                            container.style.setProperty('max-height', 'none', 'important');
                            
                            if (section) {
                                section.style.setProperty('opacity', '1', 'important');
                                section.style.setProperty('visibility', 'visible', 'important');
                                section.style.setProperty('height', 'auto', 'important');
                                section.style.setProperty('overflow', 'visible', 'important');
                                section.style.setProperty('display', 'block', 'important');
                            }
                            
                            // Дополнительно установить через обычный style для совместимости
                            container.style.opacity = '1';
                            if (section) {
                                section.style.opacity = '1';
                            }
                            
                            // Принудительно установить opacity через несколько кадров для гарантии
                            setTimeout(() => {
                                container.style.setProperty('opacity', '1', 'important');
                                container.style.opacity = '1';
                                if (section) {
                                    section.style.setProperty('opacity', '1', 'important');
                                    section.style.opacity = '1';
                                }
                            }, 0);
                            
                            requestAnimationFrame(() => {
                                container.style.setProperty('opacity', '1', 'important');
                                container.style.opacity = '1';
                                if (section) {
                                    section.style.setProperty('opacity', '1', 'important');
                                    section.style.opacity = '1';
                                }
                            });
                            
                            console.log('[CMS Loader] Replaced .container content inside section with CMS content and made it visible');
                            console.log('[CMS Loader] Container after insert (first 500):', container.innerHTML.substring(0, 500));
                            console.log('[CMS Loader] Container after insert (last 200):', container.innerHTML.substring(Math.max(0, container.innerHTML.length - 200)));
                            // Улучшенное логирование без прототипа Object
                            const computedStyles = window.getComputedStyle(container);
                            const rect = container.getBoundingClientRect();
                            
                            // Создаем простой объект без прототипа для безопасного логирования
                            const stylesInfo = {
                                opacity: computedStyles.opacity,
                                visibility: computedStyles.visibility,
                                display: computedStyles.display,
                                height: computedStyles.height,
                                width: computedStyles.width
                            };
                            
                            const rectInfo = {
                                top: rect.top,
                                left: rect.left,
                                width: rect.width,
                                height: rect.height,
                                visible: rect.width > 0 && rect.height > 0
                            };
                            
                            console.log('[CMS Loader] Container computed styles:', stylesInfo);
                            console.log('[CMS Loader] Container bounding rect:', rectInfo);
                            
                            // ВСЕГДА создавать force style для гарантии видимости СРАЗУ после вставки
                            const containerId = container.id || `cms-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            if (!container.id) container.id = containerId;
                            
                            if (section) {
                                const sectionId = section.id || `cms-section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                if (!section.id) section.id = sectionId;
                                
                                const styleId = 'cms-loader-force-opacity';
                                let forceStyle = document.getElementById(styleId);
                                if (!forceStyle) {
                                    forceStyle = document.createElement('style');
                                    forceStyle.id = styleId;
                                    document.head.appendChild(forceStyle);
                                }
                                
                                // Добавить force style для контейнера и секции (не заменять, а добавлять)
                                const existingStyle = forceStyle.textContent;
                                const containerSelector = `#${containerId}`;
                                const sectionSelector = `#${sectionId}`;
                                
                                // Проверить, не добавлен ли уже этот селектор
                                if (!existingStyle.includes(containerSelector)) {
                                    forceStyle.textContent += `
                                        ${containerSelector} { 
                                            opacity: 1 !important; 
                                            visibility: visible !important; 
                                            display: block !important; 
                                            height: auto !important; 
                                            min-height: auto !important; 
                                            max-height: none !important; 
                                            overflow: visible !important; 
                                            animation: none !important; 
                                            transition: none !important; 
                                        }
                                    `;
                                }
                                
                                if (!existingStyle.includes(sectionSelector)) {
                                    forceStyle.textContent += `
                                        ${sectionSelector} { 
                                            opacity: 1 !important; 
                                            visibility: visible !important; 
                                            display: block !important; 
                                            height: auto !important; 
                                            overflow: visible !important; 
                                            animation: none !important; 
                                            transition: none !important; 
                                        }
                                    `;
                                }
                                
                                console.log(`[CMS Loader] Created force style immediately after insert for container #${containerId} and section #${sectionId}`);
                                
                                // Финальная проверка через 200ms
                                setTimeout(() => {
                                    const finalComputed = window.getComputedStyle(container);
                                    const finalOpacity = finalComputed.opacity;
                                    const finalVisibility = finalComputed.visibility;
                                    const finalDisplay = finalComputed.display;
                                    console.log(`[CMS Loader] Final check after insert - opacity: ${finalOpacity}, visibility: ${finalVisibility}, display: ${finalDisplay}`);
                                    
                                    if (parseFloat(finalOpacity) < 1 || finalVisibility === 'hidden' || finalDisplay === 'none') {
                                        console.error(`[CMS Loader] CRITICAL: Styles still not applied after force style! opacity: ${finalOpacity}, visibility: ${finalVisibility}, display: ${finalDisplay}`);
                                        // Попробовать еще раз установить через inline стили
                                        container.style.setProperty('opacity', '1', 'important');
                                        container.style.setProperty('visibility', 'visible', 'important');
                                        container.style.setProperty('display', 'block', 'important');
                                        if (section) {
                                            section.style.setProperty('opacity', '1', 'important');
                                            section.style.setProperty('visibility', 'visible', 'important');
                                            section.style.setProperty('display', 'block', 'important');
                                        }
                                    }
                                }, 200);
                            }
                        } else {
                            console.warn('[CMS Loader] CMS container is empty, keeping existing content');
                            // Показать существующий контент
                            container.style.setProperty('opacity', '1', 'important');
                            container.style.setProperty('visibility', 'visible', 'important');
                            container.style.setProperty('height', 'auto', 'important');
                            container.style.setProperty('overflow', 'visible', 'important');
                            container.style.setProperty('display', 'block', 'important');
                            container.style.setProperty('min-height', 'auto', 'important');
                            container.style.setProperty('max-height', 'none', 'important');
                            
                            // Также показать родительскую секцию
                            const section = container.closest('section');
                            if (section) {
                                section.style.setProperty('opacity', '1', 'important');
                                section.style.setProperty('visibility', 'visible', 'important');
                                section.style.setProperty('height', 'auto', 'important');
                                section.style.setProperty('overflow', 'visible', 'important');
                                section.style.setProperty('display', 'block', 'important');
                            }
                        }
                        } else {
                            // Если в секции нет .container, создаем его
                            console.log('[CMS Loader] No container found in section, creating .container');
                            // Использовать весь контент tempDiv (уже без hero-content)
                            let fullContent = tempDiv.innerHTML.trim();
                            console.log('[CMS Loader] Full content for container, length:', fullContent ? fullContent.length : 0);
                            console.log('[CMS Loader] Full content preview:', fullContent.substring(0, 500));
                            
                            // КРИТИЧНО: Проверить и удалить пустые обертки из fullContent перед созданием контейнера
                            if (fullContent) {
                                const tempCheckDiv = document.createElement('div');
                                tempCheckDiv.innerHTML = fullContent;
                                
                                // Функция для проверки видимого контента
                                function hasVisibleContentInTemp(element) {
                                    const text = element.textContent.trim();
                                    if (text.length > 0) return true;
                                    
                                    const visualElements = element.querySelectorAll('img, svg, iframe, video, audio, canvas, picture');
                                    if (visualElements.length > 0) return true;
                                    
                                    const interactiveElements = element.querySelectorAll('a, button, input, select, textarea, .card, .grid, .service-card, .btn');
                                    if (interactiveElements.length > 0) return true;
                                    
                                    const contentElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th');
                                    for (const el of contentElements) {
                                        if (el.textContent.trim().length > 0) return true;
                                    }
                                    
                                    return false;
                                }
                                
                                // Удалить пустые обертки
                                const allWrappers = tempCheckDiv.querySelectorAll('div, section');
                                let removedWrappers = 0;
                                
                                allWrappers.forEach(wrapper => {
                                    if (wrapper.classList.contains('container') || 
                                        wrapper.classList.contains('grid') || 
                                        wrapper.classList.contains('card') ||
                                        wrapper.classList.contains('service-card')) {
                                        return;
                                    }
                                    
                                    if (!hasVisibleContentInTemp(wrapper)) {
                                        const innerHTML = wrapper.innerHTML.trim();
                                        const isEmpty = innerHTML === '' || 
                                                       innerHTML === '<br>' || 
                                                       innerHTML.replace(/<br\s*\/?>/gi, '').trim() === '';
                                        
                                        if (isEmpty) {
                                            console.log('[CMS Loader] Removing empty wrapper from new container content:', wrapper.tagName, wrapper.className || 'no class');
                                            wrapper.remove();
                                            removedWrappers++;
                                        }
                                    }
                                });
                                
                                if (removedWrappers > 0) {
                                    console.log(`[CMS Loader] Removed ${removedWrappers} empty wrapper(s) from new container content`);
                                    fullContent = tempCheckDiv.innerHTML.trim();
                                }
                            }
                            
                            // КРИТИЧНО: Проверить, что fullContent не пустой перед созданием контейнера
                            if (!fullContent || fullContent.trim() === '' || fullContent.trim() === '<br>') {
                                console.warn('[CMS Loader] ⚠️ Full content is empty, skipping container creation');
                                return;
                            }
                            
                            // Создать .container внутри секции
                            const newContainer = document.createElement('div');
                            newContainer.className = 'container';
                            mainContent.appendChild(newContainer);
                            
                            console.log('[CMS Loader] Created .container, before insert, innerHTML length:', newContainer.innerHTML.length);
                            newContainer.innerHTML = fullContent;
                            console.log('[CMS Loader] After insert into new container, innerHTML length:', newContainer.innerHTML.length);
                            console.log('[CMS Loader] New container children count:', newContainer.children.length);
                            
                            // КРИТИЧНО: Проверить, что новый контейнер не пустой после вставки
                            if (newContainer.innerHTML.trim().length === 0 || newContainer.children.length === 0) {
                                console.warn('[CMS Loader] ⚠️ New container is empty after insert, removing it');
                                newContainer.remove();
                                return;
                            }
                            
                            updateContentPaths(newContainer, null);
                            // Показать контент
                            newContainer.style.setProperty('opacity', '1', 'important');
                            newContainer.style.setProperty('visibility', 'visible', 'important');
                            newContainer.style.setProperty('height', 'auto', 'important');
                            newContainer.style.setProperty('overflow', 'visible', 'important');
                            newContainer.style.setProperty('display', 'block', 'important');
                            mainContent.style.setProperty('opacity', '1', 'important');
                            mainContent.style.setProperty('visibility', 'visible', 'important');
                            mainContent.style.setProperty('display', 'block', 'important');
                            
                            console.log('[CMS Loader] Created and filled .container with CMS content');
                            console.log('[CMS Loader] New container innerHTML preview:', newContainer.innerHTML.substring(0, 300));
                        }
                } else {
                    // Если mainContent НЕ секция, используем весь контент tempDiv
                    console.log('[CMS Loader] mainContent is not a section, using all content from tempDiv');
                    mainContent.innerHTML = tempDiv.innerHTML.trim();
                    updateContentPaths(mainContent, null);
                    // Показать контент
                    mainContent.style.opacity = '1';
                    mainContent.style.visibility = 'visible';
                    mainContent.style.height = 'auto';
                    mainContent.style.overflow = 'visible';
                    console.log('[CMS Loader] Replaced mainContent with CMS content and made it visible');
                }
            }
            
            console.log('[CMS Loader] Content rendering completed');
            
            // Финальная проверка - убедиться, что контент действительно вставлен
            const finalSections = document.querySelectorAll('section.section, section[class*="section"]');
            finalSections.forEach((section, index) => {
                const container = section.querySelector('.container');
                if (container) {
                    const contentLength = container.innerHTML.trim().length;
                    console.log(`[CMS Loader] Final check - Section ${index + 1}, container content length:`, contentLength);
                    if (contentLength === 0) {
                        console.warn(`[CMS Loader] WARNING: Section ${index + 1} container is still empty after render!`);
                    }
                }
            });
        } else {
            console.warn('[CMS Loader] No content in pageData, skipping render');
        }
        
        // КРИТИЧНО: Удалить заголовки h2, которые остались вне секций (это дубликаты)
        console.log('[CMS Loader] Final check: Removing h2 headings outside of sections (duplicates)');
        const allH2HeadingsFinal = document.querySelectorAll('h2');
        let removedH2OutsideSectionsFinal = 0;
        
        allH2HeadingsFinal.forEach(h2 => {
            // Проверяем, находится ли h2 внутри секции
            const parentSection = h2.closest('section');
            if (!parentSection) {
                // h2 не внутри секции - это дубликат, удаляем
                const h2Text = h2.textContent.trim();
                console.log(`[CMS Loader] ⚠️ Removing h2 outside section (duplicate, final check): "${h2Text.substring(0, 50)}"`);
                console.log(`[CMS Loader]   Parent: ${h2.parentElement ? h2.parentElement.tagName + (h2.parentElement.className ? '.' + h2.parentElement.className.split(' ')[0] : '') : 'none'}`);
                h2.remove();
                removedH2OutsideSectionsFinal++;
            }
        });
        
        if (removedH2OutsideSectionsFinal > 0) {
            console.log(`[CMS Loader] ✅ Removed ${removedH2OutsideSectionsFinal} h2 heading(s) outside sections (final check)`);
        }
        
        // КРИТИЧНО: Финальная очистка дубликатов main#main-content
        console.log('[CMS Loader] Final cleanup: Removing duplicate main#main-content elements');
        const allMainElements = document.querySelectorAll('main#main-content');
        if (allMainElements.length > 1) {
            console.warn(`[CMS Loader] ⚠️ Found ${allMainElements.length} main#main-content elements, keeping only the first one`);
            // Оставить только первый, удалить остальные
            for (let i = 1; i < allMainElements.length; i++) {
                const duplicateMain = allMainElements[i];
                console.log(`[CMS Loader] Removing duplicate main#main-content #${i + 1}`);
                // Переместить содержимое из дубликата в первый main перед удалением
                const firstMain = allMainElements[0];
                while (duplicateMain.firstChild) {
                    firstMain.appendChild(duplicateMain.firstChild);
                }
                duplicateMain.remove();
            }
            console.log(`[CMS Loader] ✅ Removed ${allMainElements.length - 1} duplicate main#main-content element(s)`);
        }
        
        // КРИТИЧНО: Финальная очистка пустых секций service-order
        console.log('[CMS Loader] Final cleanup: Removing empty service-order sections');
        const allServiceOrderSections = document.querySelectorAll('section.service-order');
        let removedEmptyServiceOrder = 0;
        allServiceOrderSections.forEach((section, index) => {
            const sectionContent = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
            const hasContent = sectionContent.length > 0 && 
                              (section.querySelector('form, .order-form, h2, h3, p, .card, .grid') !== null);
            
            if (!hasContent) {
                console.warn(`[CMS Loader] ⚠️ Removing empty service-order section #${index + 1}`);
                section.remove();
                removedEmptyServiceOrder++;
            } else {
                console.log(`[CMS Loader] Service-order section #${index + 1} has content (${sectionContent.length} chars), keeping it`);
            }
        });
        
        if (removedEmptyServiceOrder > 0) {
            console.log(`[CMS Loader] ✅ Removed ${removedEmptyServiceOrder} empty service-order section(s)`);
        }
        
        // КРИТИЧНО: Финальная очистка дубликатов service-order секций
        console.log('[CMS Loader] Final cleanup: Removing duplicate service-order sections');
        const remainingServiceOrderSections = document.querySelectorAll('section.service-order');
        if (remainingServiceOrderSections.length > 1) {
            console.warn(`[CMS Loader] ⚠️ Found ${remainingServiceOrderSections.length} service-order sections, keeping only the first one with content`);
            // Найти первую секцию с контентом
            let firstSectionWithContent = null;
            for (let i = 0; i < remainingServiceOrderSections.length; i++) {
                const section = remainingServiceOrderSections[i];
                const sectionContent = section.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim();
                const hasContent = sectionContent.length > 0 && 
                                  (section.querySelector('form, .order-form, h2, h3, p, .card, .grid') !== null);
                if (hasContent) {
                    firstSectionWithContent = section;
                    break;
                }
            }
            
            // Удалить все остальные секции
            for (let i = 0; i < remainingServiceOrderSections.length; i++) {
                const section = remainingServiceOrderSections[i];
                if (section !== firstSectionWithContent) {
                    console.log(`[CMS Loader] Removing duplicate service-order section #${i + 1}`);
                    section.remove();
                }
            }
            
            if (firstSectionWithContent) {
                console.log(`[CMS Loader] ✅ Kept service-order section with content, removed ${remainingServiceOrderSections.length - 1} duplicate(s)`);
            } else {
                console.warn(`[CMS Loader] ⚠️ No service-order section with content found, all removed`);
            }
        }
        
        // КРИТИЧНО: Завершить обработку
        renderContentInProgress = false;
        renderContentCompleted = true;
        } catch (error) {
            console.error('[CMS Loader] Error in renderContent:', error);
            renderContentInProgress = false;
            throw error;
        }
        
        // КРИТИЧНО: Финальная очистка всех заголовков на странице после всей обработки
        // ВАЖНО: Проверяем точное совпадение класса, а не подстроку (section-title содержит "section", но это правильный класс)
        console.log('[CMS Loader] Performing final cleanup of all headings after all processing');
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            // Удаляем только точные классы, не трогаем section-title, section-subtitle и т.д.
            if (heading.classList.contains('section') && !heading.classList.contains('section-title') && !heading.classList.contains('section-subtitle')) {
                heading.classList.remove('section');
            }
            heading.classList.remove('main-section', 'home-section-container');
            heading.removeAttribute('data-cms-processed');
            // Удалить inline стили только если они были добавлены нами
            const style = heading.getAttribute('style');
            if (style && (style.includes('opacity') || style.includes('visibility'))) {
                heading.removeAttribute('style');
            }
        });
        console.log('[CMS Loader] ✅ Final cleanup of all headings completed');
    }

    // Обновление метаданных страницы
    function updatePageMetadata(pageData) {
        if (pageData.title) {
            document.title = pageData.title;
        }

        if (pageData.metaDescription) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = pageData.metaDescription;
        }

        if (pageData.metaKeywords) {
            let metaKeywords = document.querySelector('meta[name="keywords"]');
            if (!metaKeywords) {
                metaKeywords = document.createElement('meta');
                metaKeywords.name = 'keywords';
                document.head.appendChild(metaKeywords);
            }
            metaKeywords.content = pageData.metaKeywords;
        }
    }

    // Построить breadcrumbs из slug пути (fallback если parent не загружен)
    function buildBreadcrumbsFromSlug(slug, pageData) {
        if (!slug || slug === 'main_page' || slug === '' || slug === 'index') {
            return [{
                name: 'Главная',
                url: '/index.html',
                slug: 'main_page'
            }];
        }
        
        const breadcrumbs = [];
        
        // Добавляем "Главная"
        breadcrumbs.push({
            name: 'Главная',
            url: '/index.html',
            slug: 'main_page'
        });
        
        // Разбиваем slug на части: "about/ethics" -> ["about", "ethics"]
        const parts = slug.split('/').filter(p => p && p !== 'index' && p !== 'main_page');
        
        // Строим иерархию из частей slug
        let currentPath = '';
        for (let i = 0; i < parts.length; i++) {
            currentPath += (currentPath ? '/' : '') + parts[i];
            // Для последней части используем title из pageData, для остальных - slug
            const name = (i === parts.length - 1 && pageData.title) ? pageData.title : parts[i];
            breadcrumbs.push({
                name: name || parts[i],
                url: `/${currentPath}/index.html`,
                slug: currentPath
            });
        }
        
        return breadcrumbs;
    }

    // Рендеринг breadcrumbs
    function renderBreadcrumbs(breadcrumbsData) {
        if (!breadcrumbsData) return;

        let breadcrumbs;
        try {
            breadcrumbs = typeof breadcrumbsData === 'string' 
                ? JSON.parse(breadcrumbsData) 
                : breadcrumbsData;
        } catch (e) {
            console.warn('Invalid breadcrumbs data:', breadcrumbsData);
            return;
        }

        if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) return;

        // Найти существующий элемент breadcrumbs
        let breadcrumbsContainer = document.querySelector('.breadcrumbs');
        if (!breadcrumbsContainer) {
            breadcrumbsContainer = document.createElement('nav');
            breadcrumbsContainer.className = 'breadcrumbs';
            // Вставить перед hero или первой секцией
            const hero = document.querySelector('.hero');
            const firstSection = document.querySelector('section.section');
            const insertBefore = hero || firstSection || document.body.firstChild;
            if (insertBefore && insertBefore.parentNode) {
                insertBefore.parentNode.insertBefore(breadcrumbsContainer, insertBefore);
            } else {
                document.body.insertBefore(breadcrumbsContainer, document.body.firstChild);
            }
        }
        
        // Создать или найти container внутри breadcrumbs
        let container = breadcrumbsContainer.querySelector('.container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'container';
            breadcrumbsContainer.appendChild(container);
        }
        
        // Создать или найти список breadcrumbs
        let breadcrumbsList = container.querySelector('.breadcrumbs-list');
        if (!breadcrumbsList) {
            breadcrumbsList = document.createElement('ul');
            breadcrumbsList.className = 'breadcrumbs-list';
            breadcrumbsList.setAttribute('itemscope', '');
            breadcrumbsList.setAttribute('itemtype', 'https://schema.org/BreadcrumbList');
            container.appendChild(breadcrumbsList);
        }
        
        // Очистить список и заполнить новыми элементами
        breadcrumbsList.innerHTML = breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const position = index + 1;
            
            if (isLast) {
                return `
                    <li class="breadcrumbs-item active" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                        <span itemprop="name">${item.name}</span>
                        <meta itemprop="position" content="${position}" />
                    </li>
                `;
            } else {
                // Для ссылки "Главная" использовать index.html
                let href = item.url || '#';
                if (item.name === 'Главная' || item.name === 'главная' || item.url === '/' || item.url === 'index.html' || !item.url) {
                    href = 'index.html';
                }
                
                return `
                    <li class="breadcrumbs-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                        <a href="${href}" itemprop="item">
                            <span itemprop="name">${item.name}</span>
                        </a>
                        <meta itemprop="position" content="${position}" />
                    </li>
                `;
            }
        }).join('');
    }

    // Основная функция загрузки контента из API
    async function loadContentFromAPI(bypassCache = false) {
        const currentPath = window.location.pathname;
        const slug = extractSlugFromPath(currentPath);
        const isMainPage = slug === 'home' || slug === 'index' || slug === 'main_page' || slug === '';

        console.log(`[CMS Loader] Attempting to load content for slug: ${slug}`);

        const pageData = await loadPageFromAPI(slug, bypassCache);

        if (pageData) {
            // Обновить метаданные
            updatePageMetadata(pageData);

            // Рендерить Hero (только если данных нет в HTML или если это не главная страница)
            // Для главной страницы hero уже есть в HTML, не перезаписываем его
            if (!isMainPage && (pageData.heroTitle || pageData.heroSubtitle)) {
                renderHero(document.body, pageData);
            } else if (isMainPage && (pageData.heroTitle || pageData.heroSubtitle)) {
                // Для главной страницы обновляем только если hero уже есть
                const existingHero = document.querySelector('.hero');
                if (existingHero) {
                    renderHero(document.body, pageData);
                }
            }

            // Рендерить контент
            renderContent(document.body, pageData);
            
            // Убедиться, что контент виден после рендеринга
            // (renderContent уже должен показать контент, но на всякий случай)
            setTimeout(() => {
                showCMSContent();
                
                // Инициализировать интерактивные компоненты после загрузки контента
                // Mirror Slider (для каруселей изображений)
                if (window.initMirrorSliders && typeof window.initMirrorSliders === 'function') {
                    setTimeout(() => {
                        window.initMirrorSliders();
                    }, 200);
                }
                
                // History Timeline (история с пагинацией)
                if (window.initHistoryTimelines && typeof window.initHistoryTimelines === 'function') {
                    setTimeout(() => {
                        window.initHistoryTimelines();
                    }, 250);
                }
                
                // Section Map (карта с точками)
                if (window.initSectionMaps && typeof window.initSectionMaps === 'function') {
                    setTimeout(() => {
                        window.initSectionMaps();
                    }, 250);
                }
                
                // Mobile App Section (секция мобильного приложения с переключением изображений)
                if (window.initMobileAppSections && typeof window.initMobileAppSections === 'function') {
                    setTimeout(() => {
                        window.initMobileAppSections();
                    }, 250);
                }
                
                // CRM Cards (карточки CRM с интерактивностью)
                if (window.initCrmCards && typeof window.initCrmCards === 'function') {
                    setTimeout(() => {
                        window.initCrmCards();
                    }, 250);
                }
                
                // Отправить событие для других скриптов после инициализации компонентов
                // Генерируем оба варианта события для совместимости
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('cmsContentLoaded'));
                    window.dispatchEvent(new CustomEvent('cms-content-loaded'));
                }, 300);
            }, 100);
            
            // Убедиться, что кодировка установлена правильно
            if (!document.querySelector('meta[charset]')) {
                const metaCharset = document.createElement('meta');
                metaCharset.setAttribute('charset', 'UTF-8');
                document.head.insertBefore(metaCharset, document.head.firstChild);
            }
            
            // Проверить кодировку документа
            if (document.characterSet && document.characterSet !== 'UTF-8') {
                console.warn('[CMS Loader] Кодировка документа:', document.characterSet, '- должна быть UTF-8');
            }

            // Рендерить breadcrumbs
            // Breadcrumbs должны быть построены в api-client.js из parent иерархии
            // Если breadcrumbs нет в pageData, строим из slug пути как fallback
            if (!pageData.breadcrumbs && pageData.slug) {
                console.log('[CMS Loader] Breadcrumbs not found in pageData, building from slug as fallback');
                pageData.breadcrumbs = buildBreadcrumbsFromSlug(pageData.slug, pageData);
            }
            if (pageData.breadcrumbs) {
                renderBreadcrumbs(pageData.breadcrumbs);
            } else {
                console.warn('[CMS Loader] No breadcrumbs available for page:', pageData.slug);
            }

            // Загрузить sidebar если нужно (всегда для страниц about)
            const currentPath = window.location.pathname;
            const isAboutPage = currentPath.includes('/about/');
            const sidebarPlaceholder = document.querySelector('[data-component="sidebar-about"]');
            
            if (sidebarPlaceholder) {
                // Проверяем, не загружен ли уже sidebar
                if (sidebarPlaceholder.innerHTML.trim() === '' || sidebarPlaceholder.querySelector('.sidebar-menu') === null) {
                    if (window.ComponentLoader) {
                        console.log('[CMS Loader] Loading sidebar-about component');
                        window.ComponentLoader.load('sidebar-about', '[data-component="sidebar-about"]').catch(function(error) {
                            console.error('[CMS Loader] Failed to load sidebar:', error);
                        });
                    } else {
                        console.warn('[CMS Loader] ComponentLoader not available, sidebar will not load');
                    }
                } else {
                    console.log('[CMS Loader] Sidebar already loaded');
                }
            }

            console.log(`[CMS Loader] Content loaded successfully from API for: ${slug}`);
            // Вернуть успех для Promise
            return true;
        } else {
            console.log(`[CMS Loader] Page not found in API, using static content for: ${slug}`);
            // Вернуть false для Promise
            return false;
        }
    }

    // Скрытие статичного контента до загрузки CMS
    function hideStaticContent() {
        if (!USE_CMS_API || !window.StrapiAPI) {
            return; // Не скрываем, если CMS не используется
        }
        
        // Найти все секции с контентом
        const sections = document.querySelectorAll('section.section, section[class*="section"]');
        let hiddenCount = 0;
        
        sections.forEach(section => {
            const container = section.querySelector('.container');
            if (container) {
                // Проверить, есть ли контент в контейнере (если контейнер пустой, не скрываем)
                const hasContent = container.innerHTML.trim().length > 0;
                
                if (hasContent) {
                    // Сохранить оригинальный контент в data-атрибуте только если еще не сохранен
                    if (!container.dataset.originalContent) {
                        container.dataset.originalContent = container.innerHTML;
                    }
                    
                    // Проверить, не скрыт ли уже контент
                    const currentOpacity = window.getComputedStyle(container).opacity;
                    if (currentOpacity !== '0') {
                        // Скрыть контент (но не саму секцию, чтобы сохранить структуру)
                        // НЕ используем !important здесь, чтобы потом можно было перезаписать
                        container.style.opacity = '0';
                        container.style.visibility = 'hidden';
                        container.style.height = '0';
                        container.style.overflow = 'hidden';
                        container.style.transition = 'opacity 0.2s ease-in-out';
                        hiddenCount++;
                    }
                } else {
                    // Если контейнер пустой, просто показываем его (контент будет из CMS)
                    container.style.opacity = '1';
                    container.style.visibility = 'visible';
                    container.style.height = 'auto';
                    container.style.overflow = 'visible';
                }
            }
        });
        
        if (hiddenCount > 0) {
            console.log(`[CMS Loader] Hidden ${hiddenCount} static content container(s), waiting for CMS content`);
        } else {
            console.log(`[CMS Loader] No static content found, containers are ready for CMS content`);
        }
    }

    // Показ контента после загрузки CMS
    function showCMSContent() {
        const sections = document.querySelectorAll('section.section, section[class*="section"]');
        let shownCount = 0;
        
        sections.forEach(section => {
            const container = section.querySelector('.container');
            if (container) {
                // Плавное появление контента
                // Используем setProperty с !important для принудительного отображения
                container.style.setProperty('height', 'auto', 'important');
                container.style.setProperty('overflow', 'visible', 'important');
                container.style.setProperty('visibility', 'visible', 'important');
                container.style.setProperty('display', 'block', 'important');
                container.style.setProperty('min-height', 'auto', 'important');
                container.style.setProperty('max-height', 'none', 'important');
                
                // Также показать секцию
                section.style.setProperty('opacity', '1', 'important');
                section.style.setProperty('visibility', 'visible', 'important');
                section.style.setProperty('height', 'auto', 'important');
                section.style.setProperty('overflow', 'visible', 'important');
                section.style.setProperty('display', 'block', 'important');
                
                // Удалить классы, которые могут скрывать контент (fade-in, animate-in и т.д.)
                container.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out');
                section.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out');
                
                // Использовать requestAnimationFrame для плавной анимации
                requestAnimationFrame(() => {
                    container.style.setProperty('opacity', '1', 'important');
                    section.style.setProperty('opacity', '1', 'important');
                });
                
                // Принудительно установить opacity через несколько кадров для гарантии
                setTimeout(() => {
                    container.style.setProperty('opacity', '1', 'important');
                    section.style.setProperty('opacity', '1', 'important');
                }, 0);
                
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        container.style.setProperty('opacity', '1', 'important');
                        section.style.setProperty('opacity', '1', 'important');
                    });
                });
                
                shownCount++;
                console.log(`[CMS Loader] Showing container in section:`, section.className || 'no class');
                
                // ВСЕГДА применять агрессивный подход для гарантии opacity = 1
                console.log(`[CMS Loader] Applying aggressive opacity fix...`);
                
                // Сначала удалить все классы, которые могут влиять на opacity
                container.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                section.classList.remove('fade-in', 'animate-in', 'fade-out', 'animate-out', 'fade', 'animate');
                
                // Отключить анимации и переходы
                container.style.setProperty('animation', 'none', 'important');
                container.style.setProperty('transition', 'none', 'important');
                container.style.setProperty('animation-name', 'none', 'important');
                container.style.setProperty('animation-duration', '0s', 'important');
                section.style.setProperty('animation', 'none', 'important');
                section.style.setProperty('transition', 'none', 'important');
                section.style.setProperty('animation-name', 'none', 'important');
                section.style.setProperty('animation-duration', '0s', 'important');
                
                // Установить opacity через несколько механизмов одновременно
                container.style.opacity = '1';
                container.style.setProperty('opacity', '1', 'important');
                section.style.opacity = '1';
                section.style.setProperty('opacity', '1', 'important');
                
                // Принудительно установить через setAttribute (если style уже есть)
                const currentStyle = container.getAttribute('style') || '';
                if (!currentStyle.includes('opacity: 1')) {
                    container.setAttribute('style', currentStyle + '; opacity: 1 !important;');
                }
                const sectionStyle = section.getAttribute('style') || '';
                if (!sectionStyle.includes('opacity: 1')) {
                    section.setAttribute('style', sectionStyle + '; opacity: 1 !important;');
                }
                
                            // Проверить результат и применить force style ВСЕГДА
                            const newComputedStyles = window.getComputedStyle(container);
                            const newOpacity = newComputedStyles.opacity;
                            console.log(`[CMS Loader] After aggressive fix, opacity:`, String(newOpacity));
                            
                            // ВСЕГДА создавать force style для гарантии видимости
                            const styleId = 'cms-loader-force-opacity';
                            let forceStyle = document.getElementById(styleId);
                            if (!forceStyle) {
                                forceStyle = document.createElement('style');
                                forceStyle.id = styleId;
                                document.head.appendChild(forceStyle);
                            }
                            
                            // Создать уникальный ID для контейнера, если его нет
                            const containerId = container.id || `cms-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            if (!container.id) container.id = containerId;
                            
                            // Добавить force style для контейнера и секции
                            const sectionId = section.id || `cms-section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            if (!section.id) section.id = sectionId;
                            
                            // Создать максимально специфичный CSS селектор
                            forceStyle.textContent += `
                                #${containerId} { 
                                    opacity: 1 !important; 
                                    visibility: visible !important; 
                                    display: block !important; 
                                    height: auto !important; 
                                    min-height: auto !important; 
                                    max-height: none !important; 
                                    overflow: visible !important; 
                                    animation: none !important; 
                                    transition: none !important; 
                                }
                                #${sectionId} { 
                                    opacity: 1 !important; 
                                    visibility: visible !important; 
                                    display: block !important; 
                                    height: auto !important; 
                                    overflow: visible !important; 
                                    animation: none !important; 
                                    transition: none !important; 
                                }
                            `;
                            console.log(`[CMS Loader] Created force style for container #${containerId} and section #${sectionId}`);
                            
                            // Финальная проверка
                            setTimeout(() => {
                                const finalComputed = window.getComputedStyle(container);
                                const finalOpacity = finalComputed.opacity;
                                const finalVisibility = finalComputed.visibility;
                                const finalDisplay = finalComputed.display;
                                console.log(`[CMS Loader] Final check - opacity: ${finalOpacity}, visibility: ${finalVisibility}, display: ${finalDisplay}`);
                                
                                if (parseFloat(finalOpacity) < 1 || finalVisibility === 'hidden' || finalDisplay === 'none') {
                                    console.error(`[CMS Loader] CRITICAL: Styles still not applied! opacity: ${finalOpacity}, visibility: ${finalVisibility}, display: ${finalDisplay}`);
                                }
                            }, 200);
                
                // Логирование ПОСЛЕ применения агрессивного подхода
                const finalComputedStyles = window.getComputedStyle(container);
                const finalStylesInfo = {
                    opacity: finalComputedStyles.opacity,
                    visibility: finalComputedStyles.visibility,
                    display: finalComputedStyles.display,
                    height: finalComputedStyles.height,
                    animation: finalComputedStyles.animation,
                    transition: finalComputedStyles.transition
                };
                console.log(`[CMS Loader] Container computed styles (after fix):`, finalStylesInfo);
            }
        });
        
        console.log(`[CMS Loader] CMS content is now visible (${shownCount} container(s) shown)`);
        
        // Если контент не найден, попробовать найти другие контейнеры
        if (shownCount === 0) {
            console.warn('[CMS Loader] No containers found to show, searching for alternative containers...');
            const allContainers = document.querySelectorAll('.container');
            allContainers.forEach(container => {
                const computedOpacity = window.getComputedStyle(container).opacity;
                const computedVisibility = window.getComputedStyle(container).visibility;
                if (computedOpacity === '0' || computedVisibility === 'hidden') {
                    container.style.setProperty('opacity', '1', 'important');
                    container.style.setProperty('visibility', 'visible', 'important');
                    container.style.setProperty('height', 'auto', 'important');
                    container.style.setProperty('overflow', 'visible', 'important');
                    container.style.setProperty('display', 'block', 'important');
                    console.log('[CMS Loader] Found and showed alternative container');
                }
            });
        }
    }

    // Инициализация
    function initCMSLoader() {
        console.log('[CMS Loader] Initializing...');
        console.log('[CMS Loader] USE_CMS_API:', USE_CMS_API);
        console.log('[CMS Loader] StrapiAPI available:', typeof window.StrapiAPI !== 'undefined');
        console.log('[CMS Loader] Hostname:', window.location.hostname);
        
        if (USE_CMS_API && window.StrapiAPI) {
            console.log('[CMS Loader] ✅ CMS API enabled, loading content from Strapi...');
            
            // Загружаем главное меню
            loadMainMenu().catch(error => {
                console.error('[CMS Loader] Error loading main menu:', error);
            });
            
            // Скрыть статичный контент ДО загрузки CMS
            hideStaticContent();
            
            // Небольшая задержка для загрузки компонентов
            setTimeout(() => {
                loadContentFromAPI().then(() => {
                    // Показать контент после загрузки
                    showCMSContent();
                }).catch((error) => {
                    console.error('[CMS Loader] Error loading content, showing static content:', error);
                    // В случае ошибки показать статичный контент
                    const sections = document.querySelectorAll('section.section, section[class*="section"]');
                    sections.forEach(section => {
                        const container = section.querySelector('.container');
                        if (container && container.dataset.originalContent) {
                            container.innerHTML = container.dataset.originalContent;
                            showCMSContent();
                        }
                    });
                });
            }, 500);
        } else {
            if (!USE_CMS_API) {
                console.log('[CMS Loader] ⚠️ CMS API disabled, using static content');
                console.log('[CMS Loader] 💡 To enable: add ?cms=true to URL or set localStorage.setItem("useCMS", "true")');
            } else if (!window.StrapiAPI) {
                console.log('[CMS Loader] ❌ StrapiAPI not available, using static content');
                console.log('[CMS Loader] 💡 Make sure api-client.js is loaded before cms-loader.js');
            }
        }
    }

    /**
     * Загрузить и отобразить главное меню из Strapi
     */
    async function loadMainMenu() {
        if (!window.StrapiAPI) {
            console.warn('[CMS Loader] StrapiAPI not available for menu loading');
            return;
        }

        try {
            console.log('[CMS Loader] Loading main menu from Strapi...');
            const menuData = await window.StrapiAPI.getMainMenu();
            
            if (!menuData) {
                console.warn('[CMS Loader] Menu data not available');
                return;
            }

            // Рендерим главное меню
            renderMainMenu(menuData);
            
            console.log('[CMS Loader] Main menu loaded and rendered successfully');
        } catch (error) {
            console.error('[CMS Loader] Error loading main menu:', error);
        }
    }

    /**
     * Рендерить главное меню на основе данных из Strapi
     */
    function renderMainMenu(menuData) {
        const nav = document.querySelector('#mainNav');
        if (!nav) {
            console.warn('[CMS Loader] Navigation element #mainNav not found');
            return;
        }

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

        // Очищаем существующее меню (кроме логотипа и телефона)
        const existingLinks = nav.querySelectorAll('.nav-link:not([href^="tel:"])');
        existingLinks.forEach(link => link.remove());

        // Удаляем старые мега-меню
        const existingMegaMenus = document.querySelectorAll('.mega-menu');
        existingMegaMenus.forEach(menu => menu.remove());

        // Добавляем главную ссылку
        const homeLink = document.createElement('a');
        homeLink.href = 'index.html';
        homeLink.className = 'nav-link';
        homeLink.setAttribute('data-base-path', '');
        homeLink.setAttribute('aria-label', 'Главная страница');
        homeLink.textContent = 'Главная';
        nav.insertBefore(homeLink, nav.firstChild.nextSibling); // После логотипа

        // Строим функцию для получения пути страницы с учетом иерархии
        // Поддерживает как parent (объект), так и parentSlug (строка)
        const getPagePath = (page) => {
            // Если нет parent и parentSlug - это корневая страница
            if (!page.parent && !page.parentSlug) {
                return `${page.slug}/index.html`;
            }
            
            // Если есть parentSlug, строим путь через slug
            if (page.parentSlug && !page.parent) {
                return `${page.parentSlug}/${page.slug}/index.html`;
            }
            
            // Если есть parent (объект), строим путь с учетом иерархии
            if (page.parent) {
                const pathParts = [page.slug];
                let parent = page.parent;
                while (parent && typeof parent === 'object') {
                    const parentData = parent.attributes || parent;
                    pathParts.unshift(parentData.slug);
                    parent = parentData.parent;
                }
                return pathParts.join('/') + '/index.html';
            }
            
            // Fallback
            return `${page.slug}/index.html`;
        };

        // Группируем страницы по секциям для мега-меню
        const sectionsWithChildren = {};
        const rootPages = menuData.rootPages || [];

        // Добавляем ссылки на основные разделы и создаем мега-меню
        const sectionOrder = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts', 'news'];
        
        sectionOrder.forEach(section => {
            const sectionPages = menuData.bySection[section] || [];
            if (sectionPages.length === 0) return;

            // Находим корневые страницы секции (без parent и parentSlug)
            const rootSectionPages = sectionPages.filter(page => !page.parent && !page.parentSlug);
            if (rootSectionPages.length === 0) return;

            // Если есть только одна корневая страница, делаем простую ссылку
            // Если несколько или есть дочерние - делаем мега-меню
            const hasChildren = sectionPages.some(page => page.children && page.children.length > 0);
            
            if (rootSectionPages.length === 1 && !hasChildren) {
                // Простая ссылка без мега-меню
                const page = rootSectionPages[0];
                const link = document.createElement('a');
                link.href = getPagePath(page);
                link.className = 'nav-link';
                link.setAttribute('data-base-path', '');
                link.textContent = page.title || sectionLabels[section] || section;
                nav.appendChild(link);
            } else {
                // Мега-меню для секции
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
                createMegaMenu(megaMenuId, section, sectionPages);
            }
        });

        // Добавляем ссылку на контакты (если есть страница contacts)
        const contactsPage = rootPages.find(p => p.slug === 'contacts' || p.slug === 'contact');
        if (contactsPage) {
            const link = document.createElement('a');
            link.href = 'contacts/index.html';
            link.className = 'nav-link';
            link.setAttribute('data-base-path', '');
            link.setAttribute('aria-label', 'Контакты');
            link.textContent = 'Контакты';
            nav.appendChild(link);
        }

        // Инициализируем навигацию (для работы мега-меню)
        if (typeof Navigation !== 'undefined' && typeof Navigation.init === 'function') {
            Navigation.init();
        } else if (window.Navigation && typeof window.Navigation.init === 'function') {
            window.Navigation.init();
        }
    }

    /**
     * Создать мега-меню для секции
     */
    function createMegaMenu(megaMenuId, section, pages) {
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

        // Группируем страницы по корневым родителям (используем parentSlug, если parent не загружен)
        const rootPages = pages.filter(page => !page.parent && !page.parentSlug);
        rootPages.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Строим функцию для получения пути страницы с учетом иерархии
        // Используем parentSlug, если parent не загружен через API
        const getPagePath = (page) => {
            // Если нет parent и parentSlug - это корневая страница
            if (!page.parent && !page.parentSlug) {
                return `${page.slug}/index.html`;
            }
            
            // Если есть parentSlug, строим путь через slug
            if (page.parentSlug && !page.parent) {
                // Нужно найти все родители до корня, но для упрощения используем только parentSlug
                return `${page.parentSlug}/${page.slug}/index.html`;
            }
            
            // Если есть parent (загружен через API), строим путь с учетом иерархии
            if (page.parent) {
                const pathParts = [page.slug];
                let parent = page.parent;
                while (parent && typeof parent === 'object') {
                    const parentData = parent.attributes || parent;
                    pathParts.unshift(parentData.slug);
                    parent = parentData.parent;
                }
                return pathParts.join('/') + '/index.html';
            }
            
            // Fallback
            return `${page.slug}/index.html`;
        };

        rootPages.forEach(rootPage => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'mega-menu-section';

            // Заголовок секции (ссылка на корневую страницу)
            const h3 = document.createElement('h3');
            const h3Link = document.createElement('a');
            h3Link.href = getPagePath(rootPage);
            h3Link.style.cssText = 'color: inherit; text-decoration: none;';
            h3Link.setAttribute('data-base-path', '');
            h3Link.textContent = rootPage.title || rootPage.slug;
            h3.appendChild(h3Link);
            sectionDiv.appendChild(h3);

            // Дочерние страницы
            if (rootPage.children && rootPage.children.length > 0) {
                const list = document.createElement('ul');
                list.className = 'mega-menu-list';

                // Сортируем дочерние страницы по order перед рендерингом
                const sortedChildren = [...rootPage.children].sort((a, b) => (a.order || 0) - (b.order || 0));
                
                sortedChildren.forEach(child => {
                    const item = document.createElement('li');
                    item.className = 'mega-menu-item';
                    const link = document.createElement('a');
                    link.href = getPagePath(child);
                    link.setAttribute('data-base-path', '');
                    link.textContent = child.title || child.slug;
                    item.appendChild(link);
                    list.appendChild(item);
                });

                sectionDiv.appendChild(list);
            }

            grid.appendChild(sectionDiv);
        });

        container.appendChild(grid);
        megaMenu.appendChild(container);
        header.appendChild(megaMenu);
    }

    // Экспорт функций
    window.CMSLoader = {
        load: loadContentFromAPI,
        loadPage: loadPageFromAPI,
        loadMainMenu: loadMainMenu,
        renderHero: renderHero,
        renderContent: renderContent,
        renderMainMenu: renderMainMenu,
        init: initCMSLoader,
        reload: () => loadContentFromAPI(true), // Перезагрузить с обходом кэша
        clearCache: () => window.StrapiAPI?.clearCache()
    };

    // Скрыть статичный контент сразу, если CMS включен
    // Это предотвращает мигание (FOUC)
    if (USE_CMS_API && typeof window.StrapiAPI !== 'undefined') {
        // Скрыть контент сразу, даже до DOMContentLoaded
        if (document.readyState === 'loading') {
            // Если DOM еще загружается, ждем немного и скрываем
            document.addEventListener('DOMContentLoaded', () => {
                hideStaticContent();
            });
        } else {
            // Если DOM уже загружен, скрываем сразу
            hideStaticContent();
        }
    }

    // Автоматическая инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCMSLoader);
    } else {
        initCMSLoader();
    }
})();

