/**
 * Извлечение всего динамического контента из страниц
 * - Аккордеоны (FAQ)
 * - Табы документов
 * - Табы разделов услуг
 * - Карусели
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const MISSING_ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/missing-pages-analysis.json');

// Создаем директорию для сохранения контента
if (!fs.existsSync(PAGES_CONTENT_DIR)) {
    fs.mkdirSync(PAGES_CONTENT_DIR, { recursive: true });
}

/**
 * Извлечь аккордеон (FAQ) со страницы
 */
async function extractAccordion(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n📋 Извлечение аккордеона: ${pageInfo.title || slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все элементы аккордеона
        const accordionData = await page.evaluate(() => {
            const accordionRows = Array.from(document.querySelectorAll('.accordion-row'));
            const accordionItems = [];
            
            accordionRows.forEach((row, index) => {
                const header = row.querySelector('.accordion-row__header');
                const headerText = header ? header.querySelector('.accordion-row__header-text') : null;
                const contentContainer = row.querySelector('.accordion-row__container-collapse');
                const content = contentContainer ? contentContainer.querySelector('.accordion-row__content') : null;
                
                if (header && headerText) {
                    const headerTextValue = headerText.textContent.trim();
                    const isExpanded = contentContainer && contentContainer.style.height !== '0px' && contentContainer.style.height !== '' && contentContainer.style.display !== 'none';
                    
                    accordionItems.push({
                        index: index,
                        header: headerTextValue,
                        content: content ? content.innerHTML : (contentContainer ? contentContainer.innerHTML : ''),
                        contentText: content ? content.textContent.trim().substring(0, 200) : (contentContainer ? contentContainer.textContent.trim().substring(0, 200) : ''),
                        isExpanded: isExpanded
                    });
                }
            });
            
            return {
                itemsCount: accordionItems.length,
                items: accordionItems
            };
        });
        
        if (accordionData.itemsCount === 0) {
            console.log(`   ⚠️  Аккордеон не найден`);
            return null;
        }
        
        console.log(`   ✅ Найдено элементов аккордеона: ${accordionData.itemsCount}`);
        
        // Теперь кликаем по каждому элементу и извлекаем полный контент
        const fullAccordionData = [];
        
        for (let i = 0; i < accordionData.items.length; i++) {
            try {
                console.log(`   🔄 Обработка элемента ${i + 1}/${accordionData.items.length}: ${accordionData.items[i].header.substring(0, 50)}...`);
                
                // Кликаем по заголовку аккордеона
                await page.evaluate((index) => {
                    const rows = Array.from(document.querySelectorAll('.accordion-row'));
                    if (rows[index]) {
                        const header = rows[index].querySelector('.accordion-row__header');
                        if (header) {
                            header.click();
                        }
                    }
                }, i);
                
                // Ждем обновления контента (аккордеоны могут анимироваться)
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Извлекаем обновленный контент
                const updatedContent = await page.evaluate((index) => {
                    const rows = Array.from(document.querySelectorAll('.accordion-row'));
                    if (rows[index]) {
                        const contentContainer = rows[index].querySelector('.accordion-row__container-collapse');
                        if (contentContainer) {
                            const content = contentContainer.querySelector('.accordion-row__content');
                            if (content) {
                                return content.innerHTML;
                            }
                            return contentContainer.innerHTML;
                        }
                        // Если контент не в контейнере, берем весь row
                        return rows[index].innerHTML;
                    }
                    return null;
                }, i);
                
                if (updatedContent) {
                    fullAccordionData.push({
                        header: accordionData.items[i].header,
                        content: updatedContent,
                        contentText: accordionData.items[i].contentText
                    });
                }
                
            } catch (itemError) {
                console.error(`   ⚠️  Ошибка при обработке элемента ${i + 1}: ${itemError.message}`);
                // Сохраняем исходный контент, если не удалось получить обновленный
                fullAccordionData.push({
                    header: accordionData.items[i].header,
                    content: accordionData.items[i].content,
                    contentText: accordionData.items[i].contentText
                });
            }
        }
        
        // Загружаем существующий файл
        const existingFile = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
        let pageData = {};
        
        if (fs.existsSync(existingFile)) {
            pageData = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
        } else {
            console.error(`   ❌ Файл ${slug}.json не найден!`);
            return null;
        }
        
        // Обновляем HTML контент, добавляя полный контент всех аккордеонов
        if (pageData.content && pageData.content.html) {
            // Создаем HTML со всеми элементами аккордеона
            const allAccordionHTML = fullAccordionData.map(item => 
                `<div class="accordion-item-extracted" data-header="${item.header}">${item.content}</div>`
            ).join('\n');
            
            // Заменяем существующие аккордеоны на полный контент или добавляем в конец
            if (pageData.content.html.includes('accordion-row') || pageData.content.html.includes('accordion')) {
                // Заменяем блок аккордеона
                pageData.content.html = pageData.content.html.replace(
                    /<div[^>]*class="[^"]*accordion[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
                    `<div class="accordion-container">${allAccordionHTML}</div>`
                );
            } else {
                // Добавляем в конец
                pageData.content.html += `\n<div class="accordion-container">${allAccordionHTML}</div>`;
            }
            
            pageData.dynamicContent = {
                type: 'accordion',
                items: fullAccordionData.map(item => ({
                    header: item.header,
                    textPreview: item.contentText
                })),
                extractedAt: new Date().toISOString()
            };
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        console.log(`   ✅ Аккордеон сохранен в ${slug}.json (${fullAccordionData.length} элементов)`);
        
        return pageData;
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения аккордеона: ${error.message}`);
        return null;
    }
}

/**
 * Извлечь табы документов со страницы
 */
async function extractDocumentTabs(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n📋 Извлечение табов документов: ${pageInfo.title || slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все табы
        const tabsInfo = await page.evaluate(() => {
            const tabButtons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
            return tabButtons.map((btn, index) => ({
                index: index,
                text: btn.textContent.trim(),
                isActive: btn.classList.contains('active') || btn.getAttribute('aria-selected') === 'true'
            }));
        });
        
        if (tabsInfo.length === 0) {
            console.log(`   ⚠️  Табы не найдены`);
            return null;
        }
        
        console.log(`   ✅ Найдено табов: ${tabsInfo.length}`);
        
        const allTabsContent = [];
        
        // Извлекаем контент каждого таба
        for (let i = 0; i < tabsInfo.length; i++) {
            const tab = tabsInfo[i];
            
            try {
                console.log(`   🔄 Обработка таба ${i + 1}/${tabsInfo.length}: ${tab.text.substring(0, 50)}...`);
                
                // Кликаем по табу
                await page.evaluate((index) => {
                    const buttons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
                    if (buttons[index]) {
                        buttons[index].click();
                    }
                }, i);
                
                // Ждем обновления контента
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Извлекаем контент документов
                const tabContent = await page.evaluate(() => {
                    const filesList = document.querySelector('.files-list');
                    const documentsTable = document.querySelector('table, .documents-table, .files-table');
                    const documentsContainer = document.querySelector('.documents-container, .documents-list');
                    
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
                        tabName: tab.text,
                        tabIndex: i,
                        content: tabContent.html,
                        textContent: tabContent.textContent
                    });
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при обработке таба ${i + 1}: ${tabError.message}`);
            }
        }
        
        // Загружаем существующий файл
        const existingFile = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
        let pageData = {};
        
        if (fs.existsSync(existingFile)) {
            pageData = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
        } else {
            console.error(`   ❌ Файл ${slug}.json не найден!`);
            return null;
        }
        
        // Обновляем HTML контент
        if (pageData.content && pageData.content.html) {
            const allContentHTML = allTabsContent.map(tab => 
                `<div class="documents-tab-content" data-tab-name="${tab.tabName}" data-tab-index="${tab.tabIndex}">${tab.content}</div>`
            ).join('\n');
            
            // Заменяем или добавляем контент табов
            if (pageData.content.html.includes('files-list') || pageData.content.html.includes('tab-button')) {
                pageData.content.html = pageData.content.html.replace(
                    /<div[^>]*class="[^"]*files-list[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
                    `<div class="files-list-extracted">${allContentHTML}</div>`
                );
            } else {
                pageData.content.html += `\n<div class="documents-tabs-container">${allContentHTML}</div>`;
            }
            
            pageData.dynamicContent = {
                type: 'document_tabs',
                tabs: allTabsContent.map(tab => ({
                    name: tab.tabName,
                    textPreview: tab.textContent
                })),
                extractedAt: new Date().toISOString()
            };
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        console.log(`   ✅ Табы документов сохранены в ${slug}.json (${allTabsContent.length} табов)`);
        
        return pageData;
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения табов документов: ${error.message}`);
        return null;
    }
}

/**
 * Извлечь табы разделов услуг
 */
async function extractServiceTabs(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n📋 Извлечение табов услуг: ${pageInfo.title || slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все табы
        const tabsInfo = await page.evaluate(() => {
            const tabButtons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
            return tabButtons.map((btn, index) => ({
                index: index,
                text: btn.textContent.trim(),
                isActive: btn.classList.contains('active')
            }));
        });
        
        if (tabsInfo.length === 0) {
            console.log(`   ⚠️  Табы не найдены`);
            return null;
        }
        
        console.log(`   ✅ Найдено табов: ${tabsInfo.length}`);
        
        const allTabsContent = [];
        
        // Извлекаем контент каждого таба
        for (let i = 0; i < tabsInfo.length; i++) {
            const tab = tabsInfo[i];
            
            try {
                console.log(`   🔄 Обработка таба ${i + 1}/${tabsInfo.length}: ${tab.text.substring(0, 50)}...`);
                
                // Кликаем по табу
                await page.evaluate((index) => {
                    const buttons = Array.from(document.querySelectorAll('.tab-button-item, .tab-button, .tab-item, [data-tab]'));
                    if (buttons[index]) {
                        buttons[index].click();
                    }
                }, i);
                
                // Ждем обновления контента
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Извлекаем контент секций услуг
                const tabContent = await page.evaluate(() => {
                    const mainContent = document.querySelector('main, article, .content-container, .content');
                    if (!mainContent) return null;
                    
                    // Извлекаем карточки услуг или секции
                    const cards = mainContent.querySelectorAll('.service-card, .card, [class*="card"]');
                    const sections = mainContent.querySelectorAll('section, .section');
                    
                    const container = cards.length > 0 ? Array.from(cards).map(c => c.outerHTML).join('') :
                                     sections.length > 0 ? Array.from(sections).map(s => s.outerHTML).join('') :
                                     mainContent.innerHTML;
                    
                    return {
                        html: container,
                        textContent: mainContent.textContent.trim().substring(0, 500)
                    };
                });
                
                if (tabContent) {
                    allTabsContent.push({
                        tabName: tab.text,
                        tabIndex: i,
                        content: tabContent.html,
                        textContent: tabContent.textContent
                    });
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при обработке таба ${i + 1}: ${tabError.message}`);
            }
        }
        
        // Загружаем существующий файл
        const existingFile = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
        let pageData = {};
        
        if (fs.existsSync(existingFile)) {
            pageData = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
        } else {
            console.error(`   ❌ Файл ${slug}.json не найден!`);
            return null;
        }
        
        // Обновляем HTML контент
        if (pageData.content && pageData.content.html) {
            const allContentHTML = allTabsContent.map(tab => 
                `<div class="services-tab-content" data-tab-name="${tab.tabName}" data-tab-index="${tab.tabIndex}">${tab.content}</div>`
            ).join('\n');
            
            // Заменяем или добавляем контент табов
            if (pageData.content.html.includes('tab-button')) {
                pageData.content.html = pageData.content.html.replace(
                    /<div[^>]*class="[^"]*tab-buttons-container[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
                    `<div class="services-tabs-container">${allContentHTML}</div>`
                );
            } else {
                pageData.content.html += `\n<div class="services-tabs-container">${allContentHTML}</div>`;
            }
            
            pageData.dynamicContent = {
                type: 'service_tabs',
                tabs: allTabsContent.map(tab => ({
                    name: tab.tabName,
                    textPreview: tab.textContent
                })),
                extractedAt: new Date().toISOString()
            };
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        console.log(`   ✅ Табы услуг сохранены в ${slug}.json (${allTabsContent.length} табов)`);
        
        return pageData;
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения табов услуг: ${error.message}`);
        return null;
    }
}

/**
 * Извлечь карусель со страницы
 */
async function extractCarousel(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n📋 Извлечение карусели: ${pageInfo.title || slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Больше времени для карусели
        
        // Находим карусель и извлекаем все слайды
        const carouselData = await page.evaluate(() => {
            const carousel = document.querySelector('.call-management-slider, .mobile-app-slider, [class*="carousel"], [class*="slider"], [class*="swiper"]');
            if (!carousel) return null;
            
            // Находим все слайды
            const slides = Array.from(carousel.querySelectorAll('.swiper-slide, .slide, [class*="slide"], [class*="carousel-item"]'));
            
            return {
                slidesCount: slides.length,
                slides: slides.map((slide, index) => ({
                    index: index,
                    html: slide.innerHTML,
                    textContent: slide.textContent.trim().substring(0, 200)
                }))
            };
        });
        
        if (!carouselData || carouselData.slidesCount === 0) {
            console.log(`   ⚠️  Карусель не найдена`);
            return null;
        }
        
        console.log(`   ✅ Найдено слайдов: ${carouselData.slidesCount}`);
        
        // Загружаем существующий файл
        const existingFile = path.join(PAGES_CONTENT_DIR, `${slug}.json`);
        let pageData = {};
        
        if (fs.existsSync(existingFile)) {
            pageData = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
        } else {
            console.error(`   ❌ Файл ${slug}.json не найден!`);
            return null;
        }
        
        // Обновляем HTML контент
        if (pageData.content && pageData.content.html) {
            const allSlidesHTML = carouselData.slides.map(slide => 
                `<div class="carousel-slide-extracted" data-slide-index="${slide.index}">${slide.html}</div>`
            ).join('\n');
            
            // Заменяем или добавляем контент карусели
            if (pageData.content.html.includes('slider') || pageData.content.html.includes('carousel')) {
                pageData.content.html = pageData.content.html.replace(
                    /<div[^>]*class="[^"]*slider[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
                    `<div class="carousel-container-extracted">${allSlidesHTML}</div>`
                );
            } else {
                pageData.content.html += `\n<div class="carousel-container-extracted">${allSlidesHTML}</div>`;
            }
            
            pageData.dynamicContent = {
                type: 'carousel',
                slides: carouselData.slides.map(slide => ({
                    index: slide.index,
                    textPreview: slide.textContent
                })),
                extractedAt: new Date().toISOString()
            };
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        console.log(`   ✅ Карусель сохранена в ${slug}.json (${carouselData.slidesCount} слайдов)`);
        
        return pageData;
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения карусели: ${error.message}`);
        return null;
    }
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔄 ИЗВЛЕЧЕНИЕ ВСЕГО ДИНАМИЧЕСКОГО КОНТЕНТА\n');
    console.log('='.repeat(70));
    
    // Загружаем анализ пропущенных страниц
    if (!fs.existsSync(MISSING_ANALYSIS_FILE)) {
        console.error('❌ Файл анализа не найден. Сначала запустите analyze-missing-pages-and-dynamic.js');
        process.exit(1);
    }
    
    const analysis = JSON.parse(fs.readFileSync(MISSING_ANALYSIS_FILE, 'utf-8'));
    const pagesWithDynamic = analysis.pagesWithDynamicContent || [];
    
    if (pagesWithDynamic.length === 0) {
        console.log('✅ Нет страниц с нескачанным динамическим контентом');
        return;
    }
    
    console.log(`\n📋 Найдено страниц для обработки: ${pagesWithDynamic.length}\n`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const results = {
        accordions: [],
        documentTabs: [],
        serviceTabs: [],
        carousels: [],
        errors: []
    };
    
    // Группируем страницы по типу динамического контента (объявляем вне try для доступа в finally)
    const accordionPages = pagesWithDynamic.filter(p => p.dynamicContent?.hasAccordion && !p.dynamicContent?.hasDocumentTabs && !p.dynamicContent?.hasTabs);
    const documentTabPages = pagesWithDynamic.filter(p => p.dynamicContent?.hasDocumentTabs);
    const serviceTabPages = pagesWithDynamic.filter(p => p.dynamicContent?.hasTabs && !p.dynamicContent?.hasDocumentTabs && p.url.includes('/all_services'));
    const carouselPages = pagesWithDynamic.filter(p => p.dynamicContent?.hasCarousel);
    
    console.log(`📋 Группировка страниц:`);
    console.log(`   - Аккордеоны: ${accordionPages.length}`);
    console.log(`   - Табы документов: ${documentTabPages.length}`);
    console.log(`   - Табы услуг: ${serviceTabPages.length}`);
    console.log(`   - Карусели: ${carouselPages.length}\n`);
    
    try {
        
        // 1. Извлекаем аккордеоны
        if (accordionPages.length > 0) {
            console.log('\n📋 ШАГ 1: Извлечение аккордеонов\n');
            console.log('='.repeat(70));
            
            for (const pageInfo of accordionPages) {
                try {
                    const result = await extractAccordion(page, pageInfo);
                    if (result) {
                        results.accordions.push({ slug: pageInfo.slug, success: true });
                    } else {
                        results.errors.push({ slug: pageInfo.slug, type: 'accordion', error: 'Не удалось извлечь' });
                    }
                } catch (error) {
                    console.error(`   ❌ Ошибка при обработке ${pageInfo.slug}: ${error.message}`);
                    results.errors.push({ slug: pageInfo.slug, type: 'accordion', error: error.message });
                }
            }
        }
        
        // 2. Извлекаем табы документов
        if (documentTabPages.length > 0) {
            console.log('\n\n📋 ШАГ 2: Извлечение табов документов\n');
            console.log('='.repeat(70));
            
            for (const pageInfo of documentTabPages) {
                try {
                    const result = await extractDocumentTabs(page, pageInfo);
                    if (result) {
                        results.documentTabs.push({ slug: pageInfo.slug, success: true });
                    } else {
                        results.errors.push({ slug: pageInfo.slug, type: 'document_tabs', error: 'Не удалось извлечь' });
                    }
                } catch (error) {
                    console.error(`   ❌ Ошибка при обработке ${pageInfo.slug}: ${error.message}`);
                    results.errors.push({ slug: pageInfo.slug, type: 'document_tabs', error: error.message });
                }
            }
        }
        
        // 3. Извлекаем табы услуг
        if (serviceTabPages.length > 0) {
            console.log('\n\n📋 ШАГ 3: Извлечение табов услуг\n');
            console.log('='.repeat(70));
            
            for (const pageInfo of serviceTabPages) {
                try {
                    const result = await extractServiceTabs(page, pageInfo);
                    if (result) {
                        results.serviceTabs.push({ slug: pageInfo.slug, success: true });
                    } else {
                        results.errors.push({ slug: pageInfo.slug, type: 'service_tabs', error: 'Не удалось извлечь' });
                    }
                } catch (error) {
                    console.error(`   ❌ Ошибка при обработке ${pageInfo.slug}: ${error.message}`);
                    results.errors.push({ slug: pageInfo.slug, type: 'service_tabs', error: error.message });
                }
            }
        }
        
        // 4. Извлекаем карусели
        if (carouselPages.length > 0) {
            console.log('\n\n📋 ШАГ 4: Извлечение каруселей\n');
            console.log('='.repeat(70));
            
            for (const pageInfo of carouselPages) {
                try {
                    const result = await extractCarousel(page, pageInfo);
                    if (result) {
                        results.carousels.push({ slug: pageInfo.slug, success: true });
                    } else {
                        results.errors.push({ slug: pageInfo.slug, type: 'carousel', error: 'Не удалось извлечь' });
                    }
                } catch (error) {
                    console.error(`   ❌ Ошибка при обработке ${pageInfo.slug}: ${error.message}`);
                    results.errors.push({ slug: pageInfo.slug, type: 'carousel', error: error.message });
                }
            }
        }
        
    } finally {
        await browser.close();
    }
    
    // Сохраняем отчет
    const reportFile = path.join(__dirname, '../../temp/services-extraction/dynamic-content-extraction-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ ИЗВЛЕЧЕНИЕ ЗАВЕРШЕНО');
    console.log('='.repeat(70));
    console.log(`\n📊 Результаты:`);
    console.log(`   - Аккордеонов извлечено: ${results.accordions.length}/${accordionPages.length}`);
    console.log(`   - Табов документов извлечено: ${results.documentTabs.length}/${documentTabPages.length}`);
    console.log(`   - Табов услуг извлечено: ${results.serviceTabs.length}/${serviceTabPages.length}`);
    console.log(`   - Каруселей извлечено: ${results.carousels.length}/${carouselPages.length}`);
    console.log(`   - Ошибок: ${results.errors.length}`);
    console.log(`\n📄 Отчет сохранен: ${reportFile}\n`);
}

// Запускаем скрипт
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { main, extractAccordion, extractDocumentTabs, extractServiceTabs, extractCarousel };
