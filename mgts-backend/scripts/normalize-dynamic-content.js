/**
 * Нормализация динамического контента (аккордеоны, табы)
 * Извлекает dynamicContent из оригинальных файлов, нормализует HTML используя ту же логику, что и для основного HTML
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Импортируем функцию нормализации HTML из normalize-html-structure.js
// Для этого нам нужно скопировать основную логику нормализации
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');

// Загружаем маппинг классов (используем ту же структуру, что в normalize-html-structure.js)
const INTERNAL_CLASSES_MAPPING = {
    // Service FAQ (аккордеоны)
    'service-faq': {
        'accordion-row': 'service-faq__item',
        'accordion-row__header': 'service-faq__question',
        'accordion-row__header-text': 'service-faq__question',
        'accordion-row__content': 'service-faq__answer',
        'accordion-row__container-collapse': 'service-faq__answer',
        'p1-comp-reg': 'service-faq__text',
        'p2-comp-reg': 'service-faq__answer-text',
        'h1-wide-med': 'service-faq__title',
        'h2-comp-med': 'service-faq__subtitle',
        'accordion-container': 'service-faq__container',
        'accordion-item-extracted': 'service-faq__item',
        'accordion-container-extracted': 'service-faq__container',
    },
    // Document tabs
    'document-tabs': {
        'tabs-row-selection': 'document-tabs__tabs',
        'tab-buttons-container': 'document-tabs__tabs-container',
        'tab-button-item': 'document-tabs__tab-button',
        'documents-tab-content': 'document-tabs__tab-content',
        'documents-tabs-container': 'document-tabs__container',
        'files-list': 'document-tabs__files-list',
        'files-table': 'document-tabs__files-table',
        'documents-table': 'document-tabs__table',
        'documents-container': 'document-tabs__container',
        'h2-comp-med': 'document-tabs__title',
        'h1-wide-med': 'document-tabs__title',
        // Классы для контента внутри табов (используем files-table)
        'file-item': 'files-table__item',
        'file-item__type-img': 'files-table__item-icon',
        'file-item__section-info': 'files-table__item-info',
        'file-text-box': 'files-table__item-text',
        'file-name': 'files-table__item-name',
        'file-size': 'files-table__item-size',
        'link-img': 'files-table__item-link',
        'type-size-L': '',
        'disable-selection': '',
    },
    // Service tabs
    'service-tabs': {
        'tabs-row-selection': 'service-tabs__tabs',
        'tab-buttons-container': 'service-tabs__tabs-container',
        'tab-button-item': 'service-tabs__tab-button',
        'service-tabs-container': 'service-tabs__container',
        'cards-container': 'service-tabs__container',
        'service-card': 'section-cards__card',
        'advantage-card': 'section-cards__card',
        'h2-comp-med': 'service-tabs__title',
        'h1-wide-med': 'service-tabs__title',
        // Классы для контента внутри табов (используем section-cards)
        'service-card__title': 'section-cards__card-title',
        'service-card__content': 'section-cards__card-content',
        'advantage-card__header': 'section-cards__card-title',
        'advantage-card__content-wrapper': 'section-cards__card-content',
        'type-size-L': '',
        'disable-selection': '',
    },
    // History tabs (already in normalized files)
    'history-timeline': {
        'data-title': 'history-timeline__period-title',
        'data-info-item': 'history-timeline__period',
        'p1-text-reg': 'history-timeline__period-content',
        'history-content': 'history-timeline__content',
        'content-box': 'history-timeline__content-box',
        'data-content-list': 'history-timeline__periods-list',
        'h1-wide-med': 'history-timeline__period-title',
        'h2-comp-med': 'history-timeline__title',
    },
    // Section text (для контента внутри табов/аккордеонов)
    'section-text': {
        'p1-text-reg': 'section-text__content',
        'p1-comp-reg': 'section-text__content',
        'p2-comp-reg': 'section-text__content',
        'h1-wide-med': 'section-text__title',
        'h2-comp-med': 'section-text__subtitle',
        'h3-comp-med': 'section-text__subtitle',
        'short-text-width': 'section-text__content--narrow',
    }
};

// Элементы для удаления
const REMOVE_SELECTORS = [
    'script',
    'style',
    'nav.bread-crumbs-row',
    '[class*="breadcrumb"]',
    'footer',
    '.footer',
    'header',
    '.header',
    '.banner-cookie-container',
    '.mega-menu',
    '.sidebar-menu-desktop',
    'aside.sidebar-menu-desktop',
];

/**
 * Извлечь ссылки на файлы из элемента
 */
function extractFileLinksFromElement(element) {
    const fileLinks = [];
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt', 'odt', 'ods'];
    
    // Находим все ссылки на файлы
    const links = element.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Проверяем, является ли ссылка файлом
        const ext = path.extname(href).toLowerCase().replace('.', '');
        if (fileExtensions.includes(ext)) {
            const linkText = link.textContent.trim();
            // Извлекаем текст из span.file-name, если есть
            const fileNameSpan = link.querySelector('.file-name, .file-item__section-info .file-text-box .file-name');
            const actualText = fileNameSpan ? fileNameSpan.textContent.trim() : linkText;
            
            fileLinks.push({
                href: href,
                text: actualText || linkText,
                element: link,
                rawText: linkText
            });
        }
    });
    
    return fileLinks;
}

/**
 * Нормализовать контент с сохранением ссылок на файлы
 */
function normalizeContentWithFileLinks(htmlContent, containerElement) {
    // 1. Извлекаем все ссылки на файлы
    const fileLinks = extractFileLinksFromElement(containerElement);
    
    if (fileLinks.length === 0) {
        return htmlContent;
    }
    
    // 2. Для каждой ссылки проверяем, есть ли она в HTML контенте
    let normalizedContent = htmlContent;
    
    fileLinks.forEach(link => {
        const linkText = link.text;
        const rawText = link.rawText;
        
        // Если текст ссылки есть в контенте, но самой ссылки нет - добавляем её
        const textVariants = [
            linkText,
            rawText,
            linkText.replace(/\s+/g, ' ').trim(),
            rawText.replace(/\s+/g, ' ').trim()
        ].filter(t => t && t.length > 0);
        
        let linkAdded = false;
        
        for (const text of textVariants) {
            // Экранируем специальные символы для regex
            const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Если текст есть, но ссылки нет - заменяем текст на ссылку
            if (normalizedContent.includes(text) && !normalizedContent.includes(link.href)) {
                // Пробуем найти текст и заменить на ссылку
                const patterns = [
                    new RegExp(`(>|\\s|^)(${escapedText})(<|\\s|$)`, 'gi'),
                    new RegExp(`(${escapedText})`, 'gi')
                ];
                
                for (const pattern of patterns) {
                    if (pattern.test(normalizedContent)) {
                        normalizedContent = normalizedContent.replace(
                            pattern,
                            (match, before, textMatch, after) => {
                                // Убеждаемся, что это не часть уже существующей ссылки
                                const context = normalizedContent.substring(
                                    Math.max(0, normalizedContent.indexOf(match) - 20),
                                    Math.min(normalizedContent.length, normalizedContent.indexOf(match) + match.length + 20)
                                );
                                if (context.includes('<a') && context.includes('href')) {
                                    return match; // Уже есть ссылка, не заменяем
                                }
                                linkAdded = true;
                                return `${before || ''}<a href="${link.href}" data-file-link="true">${textMatch || match}</a>${after || ''}`;
                            }
                        );
                        if (linkAdded) break;
                    }
                }
                
                if (linkAdded) break;
            }
        }
        
        // Если ссылки вообще нет в контенте - добавляем в конец
        if (!linkAdded && !normalizedContent.includes(link.href)) {
            normalizedContent += ` <a href="${link.href}" data-file-link="true">${linkText || rawText}</a>`;
        }
    });
    
    return normalizedContent;
}

/**
 * Нормализовать HTML используя маппинг классов
 */
function normalizeHTML(html, componentType = 'section-text') {
    if (!html || typeof html !== 'string') return html;

    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // ВАЖНО: Сохраняем ссылки на файлы ДО нормализации классов
    // Извлекаем все ссылки на файлы из документа
    const fileLinks = extractFileLinksFromElement(document.body);

    // Удаляем ненужные элементы
    REMOVE_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Применяем маппинг классов
    const classMapping = INTERNAL_CLASSES_MAPPING[componentType] || INTERNAL_CLASSES_MAPPING['section-text'];
    
    document.querySelectorAll('*').forEach(element => {
        // ВАЖНО: Для ссылок на файлы сохраняем их атрибут data-file-link
        if (element.tagName === 'A' || element.tagName === 'a') {
            const href = element.getAttribute('href');
            if (href) {
                const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt', 'odt', 'ods'];
                const ext = href.split('.').pop()?.toLowerCase();
                if (ext && fileExtensions.includes(ext)) {
                    // Сохраняем атрибут data-file-link, если его нет - добавляем
                    if (!element.getAttribute('data-file-link')) {
                        element.setAttribute('data-file-link', 'true');
                    }
                }
            }
        }
        
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(/\s+/);
            const newClasses = classes
                .map(cls => {
                    // Ищем точное совпадение
                    if (classMapping[cls] !== undefined) {
                        return classMapping[cls] || '';
                    }
                    // Ищем частичное совпадение (для классов с префиксами)
                    const matchingKey = Object.keys(classMapping).find(key => 
                        cls.includes(key) || key.includes(cls)
                    );
                    if (matchingKey && classMapping[matchingKey]) {
                        return classMapping[matchingKey];
                    }
                    return cls;
                })
                .filter(cls => cls !== '')
                .filter((cls, index, arr) => arr.indexOf(cls) === index); // Удаляем дубликаты

            if (newClasses.length > 0) {
                element.className = newClasses.join(' ');
            } else {
                element.removeAttribute('class');
            }
        }
    });

    // Очищаем атрибуты служебного характера
    // ВАЖНО: НЕ удаляем data-file-link - это важный атрибут для ссылок на файлы
    document.querySelectorAll('*').forEach(element => {
        // Удаляем data-атрибуты, которые были нужны только для извлечения
        ['data-header', 'data-tab-name', 'data-tab-index'].forEach(attr => {
            // НЕ удаляем data-file-link
            if (attr !== 'data-file-link') {
                element.removeAttribute(attr);
            }
        });
        // Удаляем служебные атрибуты
        ['disable-selection', 'disable-scrollbar'].forEach(attr => {
            if (element.classList.contains(attr)) {
                element.classList.remove(attr);
            }
        });
    });
    
    // ВАЖНО: После нормализации проверяем, что все ссылки на файлы сохранены
    // Если какие-то ссылки были потеряны при нормализации, восстанавливаем их
    let normalizedHTML = document.body.innerHTML;
    
    if (fileLinks.length > 0) {
        // Нормализуем контент с сохранением ссылок на файлы
        const tempDoc = new JSDOM(normalizedHTML);
        normalizedHTML = normalizeContentWithFileLinks(normalizedHTML, tempDoc.window.document.body);
    }

    return normalizedHTML;
}

/**
 * Извлечь контент аккордеонов из нормализованного HTML
 */
function extractAccordionContentFromNormalizedHTML(normalizedHTML) {
    if (!normalizedHTML || !normalizedHTML.includes('accordion')) {
        return [];
    }

    const dom = new JSDOM(normalizedHTML);
    const document = dom.window.document;

    // Ищем элементы аккордеонов
    const accordionItems = document.querySelectorAll('.accordion-item-extracted, .service-faq__item, [class*="accordion"]');
    const items = [];

    accordionItems.forEach((item, index) => {
        const header = item.getAttribute('data-header') || 
                       item.querySelector('.service-faq__question, .accordion-row__header, [class*="header"]')?.textContent.trim() ||
                       `Элемент ${index + 1}`;
        
        const content = item.innerHTML;
        
        if (content && content.trim()) {
            items.push({
                header: header,
                content: content,
                normalized: false // Будет нормализовано позже
            });
        }
    });

    return items;
}

/**
 * Извлечь контент табов из нормализованного HTML
 */
function extractTabsContentFromNormalizedHTML(normalizedHTML) {
    if (!normalizedHTML || !normalizedHTML.includes('tab')) {
        return {};
    }

    const dom = new JSDOM(normalizedHTML);
    const document = dom.window.document;

    // Ищем элементы табов (разные варианты структуры)
    const tabContents = document.querySelectorAll(
        '.documents-tab-content, .history-tab-content, .service-tab-content, ' +
        '[data-tab-name], [data-tab-index], [class*="tab-content"], ' +
        '.history-tab-content, .document-tabs__tab-content, .service-tabs__tab-content'
    );
    const tabs = {};

    tabContents.forEach((tabContent, index) => {
        // Пробуем разные способы определения имени таба
        let tabName = tabContent.getAttribute('data-tab-name') || 
                     tabContent.getAttribute('data-tab') ||
                     tabContent.getAttribute('data-tab-index');
        
        // Если не нашли в атрибутах, ищем в тексте заголовка или родительском элементе
        if (!tabName) {
            const header = tabContent.previousElementSibling || tabContent.parentElement?.querySelector('.tab-button-item');
            if (header) {
                tabName = header.textContent?.trim() || header.getAttribute('data-tab-name');
            }
        }
        
        // Если все еще не нашли, используем индекс
        if (!tabName || tabName === '') {
            tabName = `Таб ${index + 1}`;
        }
        
        // Извлекаем контент (включая HTML структуру)
        const content = tabContent.innerHTML || tabContent.outerHTML || tabContent.textContent;
        
        if (content && content.trim()) {
            tabs[tabName] = {
                name: tabName,
                content: content,
                normalized: false
            };
        }
    });

    // Также ищем табы в структуре history-timeline (если есть)
    const historyTabContents = document.querySelectorAll('.history-tab-content');
    historyTabContents.forEach((tabContent, index) => {
        const tabName = tabContent.getAttribute('data-tab-name') || `История ${index + 1}`;
        const content = tabContent.innerHTML || tabContent.textContent;
        if (content && content.trim()) {
            tabs[tabName] = {
                name: tabName,
                content: content,
                normalized: false
            };
        }
    });

    return tabs;
}

/**
 * Нормализовать dynamicContent для одной страницы
 */
function normalizeDynamicContentForPage(slug) {
    const originalFile = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
    const normalizedFile = path.join(NORMALIZED_DIR, `${slug}.json`);

    if (!fs.existsSync(originalFile)) {
        console.log(`   ⚠️  Оригинальный файл не найден: ${slug}.json`);
        return null;
    }

    if (!fs.existsSync(normalizedFile)) {
        console.log(`   ⚠️  Нормализованный файл не найден: ${slug}.json`);
        return null;
    }

    const originalData = JSON.parse(fs.readFileSync(originalFile, 'utf-8'));
    const normalizedData = JSON.parse(fs.readFileSync(normalizedFile, 'utf-8'));

    // Если в оригинальном файле нет dynamicContent, пропускаем
    if (!originalData.dynamicContent) {
        return null;
    }

    console.log(`   📋 Обработка ${slug}: тип = ${originalData.dynamicContent.type}`);

    const dynamicContentType = originalData.dynamicContent.type;
    const normalizedHTML = normalizedData.normalizedHTML || normalizedData.content?.html || '';
    
    let normalizedDynamicContent = {
        type: dynamicContentType,
        normalizedAt: new Date().toISOString()
    };

    // Обрабатываем аккордеоны
    if (dynamicContentType === 'accordion' && originalData.dynamicContent.items) {
        const items = [];
        
        // Если в оригинальном файле есть полный контент, используем его
        const itemsWithContent = originalData.dynamicContent.items.filter(item => 
            item.content && item.content.length > 0
        );
        
        if (itemsWithContent.length > 0) {
            // Используем контент из оригинального файла
            originalData.dynamicContent.items.forEach(item => {
                if (item.content && item.content.length > 0) {
                    const normalizedContent = normalizeHTML(item.content, 'service-faq');
                    items.push({
                        header: item.header,
                        content: normalizedContent,
                        textPreview: item.textPreview || item.contentText
                    });
                }
            });
        } else {
            // Пытаемся извлечь из нормализованного HTML
            const extractedItems = extractAccordionContentFromNormalizedHTML(normalizedHTML);
            if (extractedItems.length > 0) {
                extractedItems.forEach(extracted => {
                    const originalItem = originalData.dynamicContent.items.find(item => 
                        item.header === extracted.header
                    );
                    if (originalItem) {
                        const normalizedContent = normalizeHTML(extracted.content, 'service-faq');
                        items.push({
                            header: extracted.header,
                            content: normalizedContent,
                            textPreview: originalItem.textPreview || originalItem.contentText || ''
                        });
                    }
                });
            } else {
                // Если контент не найден, сохраняем хотя бы заголовки и текст
                originalData.dynamicContent.items.forEach(item => {
                    items.push({
                        header: item.header,
                        content: item.textPreview || item.contentText || '',
                        textPreview: item.textPreview || item.contentText || ''
                    });
                });
            }
        }
        
        normalizedDynamicContent.items = items;
    }
    // Обрабатываем табы документов
    else if ((dynamicContentType === 'document_tabs' || dynamicContentType === 'document-tabs') && originalData.dynamicContent.tabs) {
        const tabs = [];
        const tabKeys = Object.keys(originalData.dynamicContent.tabs).sort((a, b) => {
            // Сортируем по индексу (0, 1, 2...) если это числа, иначе по алфавиту
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });
        
        // ВАЖНО: Получаем список файлов из filesAndImages.fromTabs для восстановления ссылок
        const filesFromTabs = originalData.filesAndImages?.fromTabs || {};
        
        tabKeys.forEach((key, index) => {
            const originalTab = originalData.dynamicContent.tabs[key];
            const tabName = typeof originalTab === 'string' ? originalTab : (originalTab?.name || key || `Таб ${index + 1}`);
            
            // Пытаемся найти контент
            let content = '';
            if (originalTab && typeof originalTab === 'object' && originalTab.content) {
                content = originalTab.content;
            }
            
            // Если контента нет, пытаемся извлечь из нормализованного HTML
            if (!content || content.length === 0) {
                const extractedTabs = extractTabsContentFromNormalizedHTML(normalizedHTML);
                
                // Пробуем найти по имени
                if (extractedTabs[tabName] && extractedTabs[tabName].content) {
                    content = extractedTabs[tabName].content;
                } else {
                    // Пробуем найти по индексу
                    const extractedTabKeys = Object.keys(extractedTabs);
                    if (extractedTabKeys[index] && extractedTabs[extractedTabKeys[index]].content) {
                        content = extractedTabs[extractedTabKeys[index]].content;
                    }
                }
            }
            
            // Нормализуем контент: сначала как document-tabs (для структуры табов), 
            // затем внутри таба используем files-table для файлов
            // ВАЖНО: Для document-tabs нужно сохранить все ссылки на файлы
            let normalizedContent = '';
            if (content && content.length > 0) {
                // Создаем временный DOM для извлечения ссылок на файлы
                const tempDom = new JSDOM(`<div>${content}</div>`);
                const tempDoc = tempDom.window.document;
                
                // Извлекаем ссылки на файлы из контента таба
                const fileLinks = extractFileLinksFromElement(tempDoc.body);
                
                // ВАЖНО: Если ссылки не найдены в контенте, но есть в filesAndImages.fromTabs - используем их
                let finalFileLinks = fileLinks;
                if (fileLinks.length === 0 && filesFromTabs[tabName] && filesFromTabs[tabName].files) {
                    // Преобразуем данные из filesAndImages в формат fileLinks
                    finalFileLinks = filesFromTabs[tabName].files.map(file => ({
                        href: file.href,
                        text: file.text,
                        rawText: file.text
                    }));
                }
                
                // Нормализуем структуру табов
                normalizedContent = normalizeHTML(content, 'document-tabs');
                
                // ВАЖНО: Если после нормализации ссылки потерялись или их не было, вставляем их явно
                if (finalFileLinks.length > 0) {
                    const normalizedDom = new JSDOM(`<div>${normalizedContent}</div>`);
                    
                    // Проверяем, есть ли ссылки в нормализованном контенте
                    const normalizedLinks = extractFileLinksFromElement(normalizedDom.window.document.body);
                    
                    if (normalizedLinks.length === 0) {
                        // Если ссылок нет в нормализованном HTML, создаем HTML со ссылками
                        let contentWithLinks = '';
                        finalFileLinks.forEach((link, linkIndex) => {
                            if (linkIndex > 0) contentWithLinks += ' ';
                            contentWithLinks += `<a href="${link.href}" data-file-link="true">${link.text || link.rawText}</a>`;
                        });
                        
                        // Обновляем контент, добавляя ссылки
                        if (normalizedContent.includes('document-tabs__tab-content')) {
                            // Если есть контейнер, вставляем ссылки внутрь
                            normalizedContent = normalizedContent.replace(
                                /<div class="document-tabs__tab-content">(.*?)<\/div>/,
                                `<div class="document-tabs__tab-content">${contentWithLinks}</div>`
                            );
                        } else {
                            // Если контейнера нет, создаем его со ссылками
                            normalizedContent = `<div class="document-tabs__tab-content">${contentWithLinks}</div>`;
                        }
                    } else {
                        // Если ссылки есть, просто нормализуем их
                        normalizedContent = normalizeContentWithFileLinks(normalizedContent, normalizedDom.window.document.body);
                    }
                } else {
                    // Если ссылок нет, просто нормализуем HTML
                    normalizedContent = normalizeHTML(content, 'document-tabs');
                }
            } else {
                // Если контента нет, но есть файлы в filesAndImages - создаем HTML со ссылками
                if (filesFromTabs[tabName] && filesFromTabs[tabName].files && filesFromTabs[tabName].files.length > 0) {
                    let contentWithLinks = '';
                    filesFromTabs[tabName].files.forEach((file, fileIndex) => {
                        if (fileIndex > 0) contentWithLinks += ' ';
                        contentWithLinks += `<a href="${file.href}" data-file-link="true">${file.text}</a>`;
                    });
                    normalizedContent = `<div class="document-tabs__tab-content">${contentWithLinks}</div>`;
                } else {
                    // Если файлов нет, используем textPreview как fallback
                    normalizedContent = typeof originalTab === 'object' && originalTab.textPreview 
                        ? `<div class="document-tabs__tab-content">${originalTab.textPreview}</div>` 
                        : '';
                }
            }
            
            tabs.push({
                name: tabName,
                content: normalizedContent,
                textPreview: typeof originalTab === 'object' ? (originalTab.textPreview || originalTab.textContent || '') : '',
                order: index
            });
        });
        
        normalizedDynamicContent.tabs = tabs;
    }
    // Обрабатываем табы услуг (service_tabs)
    else if ((dynamicContentType === 'service_tabs' || dynamicContentType === 'service-tabs') && originalData.dynamicContent.tabs) {
        const tabs = [];
        const tabKeys = Object.keys(originalData.dynamicContent.tabs).sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });
        
        tabKeys.forEach((key, index) => {
            const originalTab = originalData.dynamicContent.tabs[key];
            let content = '';
            
            if (originalTab && typeof originalTab === 'object' && originalTab.content) {
                content = originalTab.content;
            }
            
            if (!content || content.length === 0) {
                const extractedTabs = extractTabsContentFromNormalizedHTML(normalizedHTML);
                const tabName = typeof originalTab === 'string' ? originalTab : (originalTab?.name || key);
                
                // Пробуем найти по имени
                if (extractedTabs[tabName] && extractedTabs[tabName].content) {
                    content = extractedTabs[tabName].content;
                } else {
                    // Пробуем найти по индексу
                    const extractedTabKeys = Object.keys(extractedTabs);
                    if (extractedTabKeys[index] && extractedTabs[extractedTabKeys[index]].content) {
                        content = extractedTabs[extractedTabKeys[index]].content;
                    }
                }
            }
            
            const tabName = typeof originalTab === 'string' ? originalTab : (originalTab?.name || key || `Таб ${index + 1}`);
            
            // Нормализуем контент: сначала как service-tabs (для структуры табов),
            // затем внутри таба используем section-cards для карточек услуг
            let normalizedContent = '';
            if (content && content.length > 0) {
                normalizedContent = normalizeHTML(content, 'service-tabs');
            } else {
                normalizedContent = typeof originalTab === 'object' && originalTab.textPreview 
                    ? `<div class="service-tabs__tab-content">${originalTab.textPreview}</div>` 
                    : '';
            }
            
            tabs.push({
                name: tabName,
                content: normalizedContent,
                textPreview: typeof originalTab === 'object' ? (originalTab.textPreview || originalTab.textContent || '') : '',
                order: index
            });
        });
        
        normalizedDynamicContent.tabs = tabs;
    }
    // История уже нормализована, просто копируем
    else if (dynamicContentType === 'history_tabs') {
        normalizedDynamicContent = originalData.dynamicContent;
    }

    // Сохраняем в нормализованный файл
    normalizedData.dynamicContent = normalizedDynamicContent;
    fs.writeFileSync(normalizedFile, JSON.stringify(normalizedData, null, 2), 'utf-8');

    return normalizedDynamicContent;
}

/**
 * Основная функция
 */
function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 НОРМАЛИЗАЦИЯ ДИНАМИЧЕСКОГО КОНТЕНТА');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (!fs.existsSync(PAGES_CONTENT_DIR)) {
        console.error('❌ Директория с оригинальными файлами не найдена!');
        process.exit(1);
    }

    if (!fs.existsSync(NORMALIZED_DIR)) {
        console.error('❌ Директория с нормализованными файлами не найдена!');
        process.exit(1);
    }

    // Получаем список всех нормализованных файлов
    const normalizedFiles = fs.readdirSync(NORMALIZED_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

    console.log(`Найдено нормализованных файлов: ${normalizedFiles.length}\n`);

    let processed = 0;
    let withDynamicContent = 0;
    let errors = 0;

    normalizedFiles.forEach((slug, index) => {
        try {
            console.log(`[${index + 1}/${normalizedFiles.length}] ${slug}`);
            const result = normalizeDynamicContentForPage(slug);
            if (result) {
                withDynamicContent++;
                const itemsCount = result.items?.length || Object.keys(result.tabs || {}).length || 0;
                console.log(`   ✅ Нормализовано: ${itemsCount} элементов\n`);
            } else {
                console.log(`   ⏭️  Нет dynamicContent\n`);
            }
            processed++;
        } catch (error) {
            console.error(`   ❌ Ошибка: ${error.message}\n`);
            errors++;
        }
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 ИТОГИ:');
    console.log(`   Обработано файлов: ${processed}`);
    console.log(`   С dynamicContent: ${withDynamicContent}`);
    console.log(`   Ошибок: ${errors}`);
    console.log('═══════════════════════════════════════════════════════════════');
}

if (require.main === module) {
    main();
}

module.exports = {
    normalizeDynamicContentForPage,
    normalizeHTML,
    extractAccordionContentFromNormalizedHTML,
    extractTabsContentFromNormalizedHTML
};