/**
 * Извлечение недостающих страниц и динамического контента
 * - Недостающие страницы
 * - Динамический контент (табы, селекторы)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');

// Создаем директории
[OUTPUT_DIR, NORMALIZED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Список недостающих страниц для извлечения
const MISSING_PAGES = [
    {
        url: 'https://business.mgts.ru/developers/connecting_objects',
        slug: 'developers_connecting_objects',
        section: 'developers',
        title: 'Подключение объектов'
    },
    {
        url: 'https://business.mgts.ru/developers/compensation_for_losses',
        slug: 'developers_compensation_for_losses',
        section: 'developers',
        title: 'Компенсация ущерба'
    },
    {
        url: 'https://business.mgts.ru/government/communications_infrastructure',
        slug: 'government_communications_infrastructure',
        section: 'government',
        title: 'Инфраструктура связи'
    }
];

// Страницы с динамическим контентом (табы, селекторы)
const DYNAMIC_CONTENT_PAGES = [
    {
        url: 'https://business.mgts.ru/about_mgts',
        slug: 'about_mgts',
        type: 'tabs_history',
        description: 'Табы истории на странице "О компании"'
    },
    {
        url: 'https://business.mgts.ru/corporate_documents',
        slug: 'corporate_documents',
        type: 'tabs_documents',
        description: 'Табы документов с параметром tab в URL'
    }
];

/**
 * Извлечь контент со страницы
 */
async function extractPageContent(page, pageInfo) {
    const { url, slug, section, title } = pageInfo;
    
    console.log(`\n📄 Извлечение: ${title || slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // Дополнительное ожидание для динамического контента
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Извлекаем контент
        const content = await page.evaluate(() => {
            // Удаляем скрипты и стили для чистоты
            const scripts = document.querySelectorAll('script, style, noscript');
            scripts.forEach(el => el.remove());
            
            // Получаем основной контент
            const main = document.querySelector('main, [role="main"], .main-content, .content, article.article-about-mgts, .container-mgts') || document.body;
            
            return {
                html: main.innerHTML,
                title: document.title,
                metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                metaKeywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
                h1: document.querySelector('h1, .h1-wide-med')?.textContent?.trim() || '',
                h2: Array.from(document.querySelectorAll('h2, .h2-comp-med')).map(h => h.textContent.trim()),
                images: Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || '',
                    title: img.getAttribute('title') || ''
                })),
                links: Array.from(document.querySelectorAll('a[href]')).map(link => ({
                    href: link.getAttribute('href') || '',
                    text: link.textContent.trim(),
                    title: link.getAttribute('title') || ''
                })),
                textContent: main.textContent.trim().substring(0, 500),
                fullTextLength: main.textContent.trim().length
            };
        });
        
        // Получаем полный HTML страницы
        const fullHTML = await page.content();
        
        const result = {
            url: url,
            title: title || content.title,
            slug: slug,
            section: section || 'unknown',
            originalUrl: url,
            extractedAt: new Date().toISOString(),
            content: content,
            fullHTML: fullHTML,
            success: true
        };
        
        // Сохраняем в отдельный файл
        const filename = `${slug}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
        
        console.log(`   ✅ Сохранено: ${filename}`);
        
        return result;
        
    } catch (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        
        const result = {
            url: url,
            title: title || 'Untitled',
            slug: slug,
            section: section || 'unknown',
            originalUrl: url,
            extractedAt: new Date().toISOString(),
            success: false,
            error: error.message,
            errorType: error.name
        };
        
        const filename = `${slug}-error.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
        
        return result;
    }
}

/**
 * Извлечь динамический контент с табами истории
 */
async function extractHistoryTabs(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n🔄 Извлечение динамического контента: ${pageInfo.description}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // Ждем загрузки контента
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все табы истории
        const tabsData = await page.evaluate(() => {
            const tabsContainer = document.querySelector('.block-mgts-history');
            if (!tabsContainer) {
                return { error: 'Контейнер истории не найден', tabs: [] };
            }
            
            // Находим кнопки табов
            const tabButtons = Array.from(tabsContainer.querySelectorAll('.tab-button-item, .tab-button'));
            const tabs = [];
            
            // Проверяем текущий активный таб
            const activeContent = tabsContainer.querySelector('.history-content, .content-box, .data-content-list');
            if (activeContent) {
                tabs.push({
                    tabName: 'initial',
                    content: activeContent.innerHTML,
                    textContent: activeContent.textContent.trim().substring(0, 200)
                });
            }
            
            return {
                tabsCount: tabButtons.length,
                tabButtons: tabButtons.map(btn => ({
                    text: btn.textContent.trim(),
                    isActive: btn.classList.contains('active') || btn.getAttribute('aria-selected') === 'true'
                })),
                tabs: tabs
            };
        });
        
        console.log(`   📊 Найдено табов: ${tabsData.tabsCount}`);
        
        // Кликаем по каждому табу и извлекаем контент
        const allTabsContent = [];
        
        for (let i = 0; i < tabsData.tabButtons.length; i++) {
            const tabButton = tabsData.tabButtons[i];
            
            if (tabButton.isActive && i === 0) {
                // Первый таб уже активен, используем его контент
                continue;
            }
            
            try {
                console.log(`   🔄 Обработка таба: ${tabButton.text}`);
                
                // Находим и кликаем по табу
                await page.evaluate((index) => {
                    const tabButtons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button'));
                    if (tabButtons[index]) {
                        tabButtons[index].click();
                    }
                }, i);
                
                // Ждем обновления контента
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Извлекаем обновленный контент
                const tabContent = await page.evaluate((index) => {
                    const tabsContainer = document.querySelector('.block-mgts-history');
                    if (!tabsContainer) return null;
                    
                    const contentContainer = tabsContainer.querySelector('.history-content, .content-box, .data-content-list');
                    if (!contentContainer) return null;
                    
                    return {
                        tabIndex: index,
                        content: contentContainer.innerHTML,
                        textContent: contentContainer.textContent.trim().substring(0, 500)
                    };
                }, i);
                
                if (tabContent) {
                    allTabsContent.push({
                        tabName: tabButton.text,
                        tabIndex: i,
                        content: tabContent.content,
                        textContent: tabContent.textContent
                    });
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при обработке таба ${i}: ${tabError.message}`);
            }
        }
        
        // Объединяем весь контент табов
        const allContentHTML = allTabsContent.map(tab => 
            `<div class="history-tab-content" data-tab-name="${tab.tabName}">${tab.content}</div>`
        ).join('\n');
        
        // Загружаем существующий файл или создаем новый
        const existingFile = path.join(OUTPUT_DIR, `${slug}.json`);
        let pageData = {};
        
        if (fs.existsSync(existingFile)) {
            pageData = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
        } else {
            // Если файл не существует, нужно сначала извлечь основную страницу
            console.log(`   ⚠️  Файл ${slug}.json не найден, извлекаем основную страницу...`);
            const mainContent = await extractPageContent(page, { url, slug, section: 'about_mgts', title: 'О МГТС' });
            pageData = mainContent;
        }
        
        // Обновляем HTML контент, заменяя блок истории на полный контент всех табов
        if (pageData.content && pageData.content.html) {
            // Находим блок истории и заменяем его на полный контент
            const updatedHTML = pageData.content.html.replace(
                /<div[^>]*class="[^"]*block-mgts-history[^"]*"[^>]*>[\s\S]*?<\/div>/i,
                `<div class="block-mgts-history"><div class="history-content">${allContentHTML}</div></div>`
            );
            
            pageData.content.html = updatedHTML;
            pageData.dynamicContent = {
                type: 'history_tabs',
                tabs: allTabsContent.map(tab => ({
                    name: tab.tabName,
                    textPreview: tab.textContent
                })),
                extractedAt: new Date().toISOString()
            };
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        console.log(`   ✅ Динамический контент сохранен в ${slug}.json`);
        
        return pageData;
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения динамического контента: ${error.message}`);
        return null;
    }
}

/**
 * Извлечь динамический контент с табами документов
 */
async function extractDocumentTabs(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n🔄 Извлечение динамического контента: ${pageInfo.description}`);
    console.log(`   URL: ${url}`);
    
    try {
        // Сначала загружаем основную страницу без параметров
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все возможные табы/селекторы
        const tabsInfo = await page.evaluate(() => {
            // Ищем кнопки табов (для corporate_documents используются .tab-button-item)
            const tabButtonItems = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
            const tabSelect = document.querySelector('select[name="tab"], select.tab-selector, .tab-selector select');
            const tabLinks = Array.from(document.querySelectorAll('a[href*="tab="], a.tab-link'));
            
            let tabs = [];
            
            if (tabButtonItems.length > 0) {
                // Если это кнопки табов (как на corporate_documents)
                tabs = tabButtonItems.map((btn, index) => {
                    const text = btn.textContent.trim();
                    // Пробуем найти значение из data-атрибута или использовать текст
                    const dataTab = btn.getAttribute('data-tab') || text;
                    return {
                        type: 'button',
                        text: text,
                        dataTab: dataTab,
                        isActive: btn.classList.contains('active'),
                        index: index
                    };
                });
            } else if (tabSelect) {
                // Если это select
                const options = Array.from(tabSelect.querySelectorAll('option'));
                tabs = options.map(opt => ({
                    type: 'select',
                    value: opt.value || opt.textContent.trim(),
                    text: opt.textContent.trim(),
                    selected: opt.selected
                })).filter(t => t.value && t.value !== '');
            } else if (tabLinks.length > 0) {
                // Если это ссылки с параметром tab
                tabs = tabLinks.map(link => {
                    const href = link.getAttribute('href');
                    const tabMatch = href.match(/[?&]tab=([^&]*)/);
                    return {
                        type: 'link',
                        text: link.textContent.trim(),
                        tabValue: tabMatch ? decodeURIComponent(tabMatch[1]) : null,
                        href: href
                    };
                }).filter(t => t.tabValue);
            }
            
            return { tabs, tabsCount: tabs.length };
        });
        
        console.log(`   📊 Найдено вариантов табов: ${tabsInfo.tabsCount}`);
        
        // Извлекаем контент для каждого таба
        const allTabsContent = [];
        
        for (const tab of tabsInfo.tabs) {
            try {
                let tabUrl = url;
                let tabContent = null;
                
                if (tab.type === 'select') {
                    // Для select перезагружаем страницу с параметром
                    tabUrl = `${url}${url.includes('?') ? '&' : '?'}tab=${encodeURIComponent(tab.value)}`;
                    
                    console.log(`   🔄 Обработка таба (select): ${tab.text}`);
                    await page.goto(tabUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                } else if (tab.type === 'button') {
                    // Для кнопок кликаем по индексу (надежнее)
                    console.log(`   🔄 Обработка таба (button): ${tab.text} [index: ${tab.index}]`);
                    
                    const clicked = await page.evaluate((index) => {
                        const buttons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
                        if (buttons[index]) {
                            buttons[index].click();
                            return true;
                        }
                        return false;
                    }, tab.index !== undefined ? tab.index : 0);
                    
                    if (clicked) {
                        // Ждем обновления контента после клика
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                } else if (tab.type === 'link') {
                    // Для ссылок переходим по ссылке
                    tabUrl = tab.href.startsWith('http') ? tab.href : `${BASE_URL}${tab.href}`;
                    
                    console.log(`   🔄 Обработка таба (link): ${tab.text}`);
                    await page.goto(tabUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                // Извлекаем контент таблицы/документов (после клика на таб)
                tabContent = await page.evaluate(() => {
                    // Ищем список документов (.files-list) или таблицу документов
                    const filesList = document.querySelector('.files-list');
                    const documentsTable = document.querySelector('table, .documents-table, .files-table');
                    const documentsContainer = document.querySelector('.documents-container, .documents-list');
                    
                    // Приоритет: files-list > documents-table > documents-container > main content
                    const container = filesList || documentsTable || documentsContainer || 
                                     document.querySelector('article.content-container, article, main, .content');
                    
                    if (!container) return null;
                    
                    return {
                        html: container.innerHTML,
                        textContent: container.textContent.trim().substring(0, 500)
                    };
                });
                
                if (tabContent) {
                    allTabsContent.push({
                        tabName: tab.text || tab.value,
                        tabValue: tab.value || tab.dataTab || tab.tabValue,
                        tabType: tab.type,
                        content: tabContent.html,
                        textContent: tabContent.textContent
                    });
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при обработке таба "${tab.text || tab.value}": ${tabError.message}`);
            }
        }
        
        // Загружаем существующий файл или создаем новый
        const existingFile = path.join(OUTPUT_DIR, `${slug}.json`);
        let pageData = {};
        
        if (fs.existsSync(existingFile)) {
            pageData = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
        } else {
            console.log(`   ⚠️  Файл ${slug}.json не найден, извлекаем основную страницу...`);
            const mainContent = await extractPageContent(page, { url, slug, section: 'about_mgts', title: 'Корпоративные документы' });
            pageData = mainContent;
        }
        
        // Обновляем HTML контент с учетом всех табов
        if (pageData.content && pageData.content.html) {
            // Объединяем весь контент табов
            const allContentHTML = allTabsContent.map(tab => 
                `<div class="documents-tab-content" data-tab-name="${tab.tabName}" data-tab-value="${tab.tabValue || ''}">${tab.content}</div>`
            ).join('\n');
            
            // Заменяем или добавляем контент табов
            if (pageData.content.html.includes('documents-table') || pageData.content.html.includes('files-table')) {
                // Если уже есть таблица, заменяем её
                pageData.content.html = pageData.content.html.replace(
                    /<table[^>]*>[\s\S]*?<\/table>/i,
                    allContentHTML
                );
            } else {
                // Добавляем контент табов в конец
                pageData.content.html += `\n<div class="documents-tabs-container">${allContentHTML}</div>`;
            }
            
            pageData.dynamicContent = {
                type: 'document_tabs',
                tabs: allTabsContent.map(tab => ({
                    name: tab.tabName,
                    value: tab.tabValue,
                    textPreview: tab.textContent
                })),
                extractedAt: new Date().toISOString()
            };
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        console.log(`   ✅ Динамический контент сохранен в ${slug}.json`);
        
        return pageData;
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения динамического контента: ${error.message}`);
        return null;
    }
}

/**
 * Главная функция
 */
async function main() {
    console.log('📄 ИЗВЛЕЧЕНИЕ НЕДОСТАЮЩИХ СТРАНИЦ И ДИНАМИЧЕСКОГО КОНТЕНТА');
    console.log('='.repeat(70));
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const results = {
        missingPages: [],
        dynamicContent: [],
        errors: []
    };
    
    try {
        // 1. Извлекаем недостающие страницы
        console.log('\n📋 ШАГ 1: Извлечение недостающих страниц\n');
        console.log('='.repeat(70));
        
        for (const pageInfo of MISSING_PAGES) {
            try {
                const result = await extractPageContent(page, pageInfo);
                results.missingPages.push(result);
            } catch (error) {
                console.error(`❌ Ошибка при извлечении ${pageInfo.url}: ${error.message}`);
                results.errors.push({
                    type: 'missing_page',
                    url: pageInfo.url,
                    error: error.message
                });
            }
        }
        
        // 2. Извлекаем динамический контент
        console.log('\n\n📋 ШАГ 2: Извлечение динамического контента\n');
        console.log('='.repeat(70));
        
        for (const pageInfo of DYNAMIC_CONTENT_PAGES) {
            try {
                let result = null;
                
                if (pageInfo.type === 'tabs_history') {
                    result = await extractHistoryTabs(page, pageInfo);
                } else if (pageInfo.type === 'tabs_documents') {
                    result = await extractDocumentTabs(page, pageInfo);
                }
                
                if (result) {
                    results.dynamicContent.push({
                        url: pageInfo.url,
                        slug: pageInfo.slug,
                        type: pageInfo.type,
                        success: true
                    });
                } else {
                    results.errors.push({
                        type: 'dynamic_content',
                        url: pageInfo.url,
                        error: 'Не удалось извлечь динамический контент'
                    });
                }
                
            } catch (error) {
                console.error(`❌ Ошибка при извлечении динамического контента ${pageInfo.url}: ${error.message}`);
                results.errors.push({
                    type: 'dynamic_content',
                    url: pageInfo.url,
                    error: error.message
                });
            }
        }
        
    } finally {
        await browser.close();
    }
    
    // Сохраняем отчет
    const reportFile = path.join(__dirname, '../../temp/services-extraction/extraction-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ ИЗВЛЕЧЕНИЕ ЗАВЕРШЕНО');
    console.log('='.repeat(70));
    console.log(`\n📊 Результаты:`);
    console.log(`   - Недостающих страниц извлечено: ${results.missingPages.filter(p => p.success).length}/${MISSING_PAGES.length}`);
    console.log(`   - Динамического контента извлечено: ${results.dynamicContent.length}/${DYNAMIC_CONTENT_PAGES.length}`);
    console.log(`   - Ошибок: ${results.errors.length}`);
    console.log(`\n📄 Отчет сохранен: ${reportFile}\n`);
}

// Запускаем скрипт
main().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});
