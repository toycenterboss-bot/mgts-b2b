/**
 * Извлечение файлов и изображений из динамического контента
 * (табы, аккордеоны, вложенные табы)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const PAGES_CONTENT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/files-images-extracted');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/files-images-extraction-report.json');

// Создаем директорию для сохранения данных
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Извлечь все файлы и изображения из табов страницы
 */
async function extractFilesFromTabs(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n📋 Извлечение файлов из табов: ${pageInfo.title || slug}`);
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
        
        const allTabsFiles = {};
        
        // Извлекаем файлы из каждого таба
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
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Проверяем наличие select для фильтрации (вложенные табы через select)
                // Ищем select внутри контента таба, а не на всей странице
                const selectFilters = await page.evaluate(() => {
                    // Сначала находим контент текущего активного таба
                    const tabContent = document.querySelector('.tab-content.active, [class*="tab-content"][class*="active"], .files-list, [class*="tab-panel"][class*="active"]') ||
                                     document.querySelector('.tab-content, [class*="tab-content"], .files-list, [class*="tab-panel"]') ||
                                     document.querySelector('article, main, .content');
                    
                    if (!tabContent) return [];
                    
                    // Ищем select внутри контента таба
                    const selects = Array.from(tabContent.querySelectorAll('select'));
                    return selects.map(select => ({
                        name: select.name || select.id || select.className || '',
                        id: select.id || '',
                        className: select.className || '',
                        options: Array.from(select.querySelectorAll('option')).map(opt => ({
                            value: opt.value,
                            text: opt.textContent.trim(),
                            selected: opt.selected
                        }))
                    })).filter(s => s.options.length > 1); // Только selects с несколькими опциями
                });
                
                let tabFiles = [];
                let tabImages = [];
                
                // Если есть select для фильтрации, перебираем все опции
                if (selectFilters.length > 0) {
                    console.log(`     📋 Найден select для фильтрации: ${selectFilters.length} элементов`);
                    
                    for (const selectFilter of selectFilters) {
                        for (const option of selectFilter.options) {
                            try {
                                // Выбираем опцию - ищем select по имени, id или классу
                                await page.evaluate((selectIdentifier, optionValue) => {
                                    // Пробуем найти select разными способами
                                    let select = null;
                                    if (selectIdentifier.name) {
                                        select = document.querySelector(`select[name="${selectIdentifier.name}"]`);
                                    }
                                    if (!select && selectIdentifier.id) {
                                        select = document.querySelector(`select#${selectIdentifier.id}`);
                                    }
                                    if (!select && selectIdentifier.className) {
                                        select = document.querySelector(`select.${selectIdentifier.className.split(' ')[0]}`);
                                    }
                                    // Если не нашли, ищем первый select в контенте таба
                                    if (!select) {
                                        const tabContent = document.querySelector('.tab-content, [class*="tab-content"], .files-list');
                                        if (tabContent) {
                                            select = tabContent.querySelector('select');
                                        }
                                    }
                                    
                                    if (select) {
                                        select.value = optionValue;
                                        // Триггерим события для обновления контента
                                        select.dispatchEvent(new Event('change', { bubbles: true }));
                                        select.dispatchEvent(new Event('input', { bubbles: true }));
                                        // Также пробуем кликнуть, если есть обработчик клика
                                        select.click();
                                    }
                                }, selectFilter, option.value);
                                
                                // Ждем обновления контента после выбора опции
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                // Извлекаем файлы после выбора опции - только из контента таба
                                const optionFiles = await page.evaluate(() => {
                                    const files = [];
                                    const images = [];
                                    
                                    // Ищем контент таба
                                    const tabContent = document.querySelector('.tab-content.active, [class*="tab-content"][class*="active"], .files-list, [class*="tab-panel"][class*="active"]') ||
                                                     document.querySelector('.tab-content, [class*="tab-content"], .files-list, [class*="tab-panel"]') ||
                                                     document.querySelector('article, main, .content');
                                    
                                    if (!tabContent) return { files, images };
                                    
                                    const links = Array.from(tabContent.querySelectorAll('a[href]'));
                                    links.forEach(link => {
                                        const href = link.getAttribute('href') || '';
                                        if (/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(href)) {
                                            files.push({
                                                href: href.startsWith('http') ? href : `${window.location.origin}${href}`,
                                                text: link.textContent.trim()
                                            });
                                        }
                                    });
                                    
                                    const imgs = Array.from(tabContent.querySelectorAll('img[src]'));
                                    imgs.forEach(img => {
                                        const src = img.getAttribute('src') || '';
                                        if (src && !src.startsWith('data:')) {
                                            images.push({
                                                src: src.startsWith('http') ? src : `${window.location.origin}${src}`,
                                                alt: img.getAttribute('alt') || ''
                                            });
                                        }
                                    });
                                    
                                    return { files, images };
                                });
                                
                                if (optionFiles.files.length > 0 || optionFiles.images.length > 0) {
                                    tabFiles.push(...optionFiles.files.map(f => ({ ...f, filterOption: option.text })));
                                    tabImages.push(...optionFiles.images.map(img => ({ ...img, filterOption: option.text })));
                                }
                                
                            } catch (optionError) {
                                console.error(`     ⚠️  Ошибка при обработке опции ${option.text}: ${optionError.message}`);
                            }
                        }
                    }
                } else {
                    // Если нет select, просто извлекаем файлы из текущего таба
                    const assets = await page.evaluate(() => {
                        const files = [];
                        const images = [];
                        
                        const tabContent = document.querySelector('.tab-content, [class*="tab-content"], .files-list, [class*="tab-panel"]') ||
                                         document.querySelector('article, main, .content');
                        
                        if (tabContent) {
                            const links = Array.from(tabContent.querySelectorAll('a[href]'));
                            links.forEach(link => {
                                const href = link.getAttribute('href') || '';
                                if (/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(href)) {
                                    files.push({
                                        href: href.startsWith('http') ? href : `${window.location.origin}${href}`,
                                        text: link.textContent.trim()
                                    });
                                }
                            });
                            
                            const imgs = Array.from(tabContent.querySelectorAll('img[src]'));
                            imgs.forEach(img => {
                                const src = img.getAttribute('src') || '';
                                if (src && !src.startsWith('data:')) {
                                    images.push({
                                        src: src.startsWith('http') ? src : `${window.location.origin}${src}`,
                                        alt: img.getAttribute('alt') || ''
                                    });
                                }
                            });
                        }
                        
                        return { files, images };
                    });
                    
                    tabFiles = assets.files;
                    tabImages = assets.images;
                }
                
                if (tabFiles.length > 0 || tabImages.length > 0) {
                    allTabsFiles[tab.text] = {
                        files: tabFiles,
                        images: tabImages,
                        hasSelectFilter: selectFilters.length > 0,
                        selectFilters: selectFilters
                    };
                }
                
            } catch (tabError) {
                console.error(`   ⚠️  Ошибка при обработке таба ${i + 1}: ${tabError.message}`);
            }
        }
        
        if (Object.keys(allTabsFiles).length === 0) {
            console.log(`   ⚠️  Файлы не найдены в табах`);
            return null;
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
        
        // Сохраняем файлы и изображения в структурированном виде
        if (!pageData.filesAndImages) {
            pageData.filesAndImages = {};
        }
        
        pageData.filesAndImages.fromTabs = allTabsFiles;
        pageData.filesAndImages.extractedAt = new Date().toISOString();
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        
        const totalFiles = Object.values(allTabsFiles).reduce((sum, tab) => sum + (tab.files?.length || 0), 0);
        const totalImages = Object.values(allTabsFiles).reduce((sum, tab) => sum + (tab.images?.length || 0), 0);
        
        console.log(`   ✅ Файлы извлечены: ${totalFiles} файлов, ${totalImages} изображений из ${Object.keys(allTabsFiles).length} табов`);
        
        return {
            slug: pageInfo.slug,
            tabs: Object.keys(allTabsFiles).length,
            files: totalFiles,
            images: totalImages,
            hasSelectFilters: Object.values(allTabsFiles).some(tab => tab.hasSelectFilter)
        };
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения файлов из табов: ${error.message}`);
        return null;
    }
}

/**
 * Извлечь все файлы и изображения из аккордеонов страницы
 */
async function extractFilesFromAccordions(page, pageInfo) {
    const { url, slug } = pageInfo;
    
    console.log(`\n📋 Извлечение файлов из аккордеонов: ${pageInfo.title || slug}`);
    console.log(`   URL: ${url}`);
    
    try {
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Находим все аккордеоны
        const accordionsInfo = await page.evaluate(() => {
            const accordionRows = Array.from(document.querySelectorAll('.accordion-row'));
            return accordionRows.map((row, index) => {
                const header = row.querySelector('.accordion-row__header-text');
                return {
                    index: index,
                    header: header ? header.textContent.trim() : ''
                };
            });
        });
        
        if (accordionsInfo.length === 0) {
            console.log(`   ⚠️  Аккордеоны не найдены`);
            return null;
        }
        
        console.log(`   ✅ Найдено аккордеонов: ${accordionsInfo.length}`);
        
        const allAccordionsFiles = {};
        
        // Извлекаем файлы из каждого аккордеона
        for (let i = 0; i < accordionsInfo.length; i++) {
            const accordion = accordionsInfo[i];
            
            try {
                console.log(`   🔄 Обработка аккордеона ${i + 1}/${accordionsInfo.length}: ${accordion.header.substring(0, 50)}...`);
                
                // Кликаем по аккордеону
                await page.evaluate((index) => {
                    const rows = Array.from(document.querySelectorAll('.accordion-row'));
                    if (rows[index]) {
                        const header = rows[index].querySelector('.accordion-row__header');
                        if (header) {
                            header.click();
                        }
                    }
                }, i);
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Извлекаем файлы и изображения
                const assets = await page.evaluate((index) => {
                    const rows = Array.from(document.querySelectorAll('.accordion-row'));
                    if (!rows[index]) return { files: [], images: [] };
                    
                    const content = rows[index].querySelector('.accordion-row__content, .accordion-row__container-collapse');
                    if (!content) return { files: [], images: [] };
                    
                    const files = [];
                    const images = [];
                    
                    const links = Array.from(content.querySelectorAll('a[href]'));
                    links.forEach(link => {
                        const href = link.getAttribute('href') || '';
                        if (/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(href)) {
                            files.push({
                                href: href.startsWith('http') ? href : `${window.location.origin}${href}`,
                                text: link.textContent.trim()
                            });
                        }
                    });
                    
                    const imgs = Array.from(content.querySelectorAll('img[src]'));
                    imgs.forEach(img => {
                        const src = img.getAttribute('src') || '';
                        if (src && !src.startsWith('data:')) {
                            images.push({
                                src: src.startsWith('http') ? src : `${window.location.origin}${src}`,
                                alt: img.getAttribute('alt') || ''
                            });
                        }
                    });
                    
                    return { files, images };
                }, i);
                
                if (assets.files.length > 0 || assets.images.length > 0) {
                    allAccordionsFiles[accordion.header] = {
                        files: assets.files,
                        images: assets.images
                    };
                }
                
            } catch (accordionError) {
                console.error(`   ⚠️  Ошибка при обработке аккордеона ${i + 1}: ${accordionError.message}`);
            }
        }
        
        if (Object.keys(allAccordionsFiles).length === 0) {
            console.log(`   ⚠️  Файлы не найдены в аккордеонах`);
            return null;
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
        
        // Сохраняем файлы и изображения
        if (!pageData.filesAndImages) {
            pageData.filesAndImages = {};
        }
        
        pageData.filesAndImages.fromAccordions = allAccordionsFiles;
        if (!pageData.filesAndImages.extractedAt) {
            pageData.filesAndImages.extractedAt = new Date().toISOString();
        }
        
        // Сохраняем обновленный файл
        fs.writeFileSync(existingFile, JSON.stringify(pageData, null, 2), 'utf-8');
        
        const totalFiles = Object.values(allAccordionsFiles).reduce((sum, acc) => sum + (acc.files?.length || 0), 0);
        const totalImages = Object.values(allAccordionsFiles).reduce((sum, acc) => sum + (acc.images?.length || 0), 0);
        
        console.log(`   ✅ Файлы извлечены: ${totalFiles} файлов, ${totalImages} изображений из ${Object.keys(allAccordionsFiles).length} аккордеонов`);
        
        return {
            slug: pageInfo.slug,
            accordions: Object.keys(allAccordionsFiles).length,
            files: totalFiles,
            images: totalImages
        };
        
    } catch (error) {
        console.error(`   ❌ Ошибка извлечения файлов из аккордеонов: ${error.message}`);
        return null;
    }
}

/**
 * Главная функция
 */
async function main() {
    console.log('🔄 ИЗВЛЕЧЕНИЕ ФАЙЛОВ И ИЗОБРАЖЕНИЙ ИЗ ДИНАМИЧЕСКОГО КОНТЕНТА\n');
    console.log('='.repeat(70));
    
    // Загружаем отчет глубокого анализа
    const deepAnalysisFile = path.join(__dirname, '../../temp/services-extraction/deep-analysis-report.json');
    if (!fs.existsSync(deepAnalysisFile)) {
        console.error('❌ Файл глубокого анализа не найден. Сначала запустите deep-analyze-dynamic-content.js');
        process.exit(1);
    }
    
    const deepAnalysis = JSON.parse(fs.readFileSync(deepAnalysisFile, 'utf-8'));
    const pagesWithFiles = deepAnalysis.pagesWithFilesInDynamic || [];
    
    if (pagesWithFiles.length === 0) {
        console.log('✅ Нет страниц с файлами в динамическом контенте');
        return;
    }
    
    console.log(`\n📋 Найдено страниц для обработки: ${pagesWithFiles.length}\n`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const results = {
        tabs: [],
        accordions: [],
        errors: [],
        summary: {
            pagesProcessed: 0,
            totalFilesFromTabs: 0,
            totalImagesFromTabs: 0,
            totalFilesFromAccordions: 0,
            totalImagesFromAccordions: 0,
            pagesWithSelectFilters: 0
        }
    };
    
    try {
        // Обрабатываем страницы с табами
        console.log('\n📋 ШАГ 1: Извлечение файлов из табов\n');
        console.log('='.repeat(70));
        
        for (const pageInfo of pagesWithFiles) {
            try {
                const result = await extractFilesFromTabs(page, pageInfo);
                if (result) {
                    results.tabs.push(result);
                    results.summary.totalFilesFromTabs += result.files;
                    results.summary.totalImagesFromTabs += result.images;
                    if (result.hasSelectFilters) {
                        results.summary.pagesWithSelectFilters++;
                    }
                }
                results.summary.pagesProcessed++;
            } catch (error) {
                console.error(`   ❌ Ошибка при обработке ${pageInfo.slug}: ${error.message}`);
                results.errors.push({ slug: pageInfo.slug, type: 'tabs', error: error.message });
            }
        }
        
        // Обрабатываем страницы с аккордеонами
        console.log('\n\n📋 ШАГ 2: Извлечение файлов из аккордеонов\n');
        console.log('='.repeat(70));
        
        const accordionPages = [
            { slug: 'access_internet', url: 'https://business.mgts.ru/business/access_internet', title: 'Доступ в интернет' },
            { slug: 'digital_television', url: 'https://business.mgts.ru/business/digital_television', title: 'Телевидение' },
            { slug: 'infoformen', url: 'https://business.mgts.ru/infoformen', title: 'Информация для акционеров' },
            { slug: 'security_alarm', url: 'https://business.mgts.ru/business/security_alarm', title: 'Охранная сигнализация' },
            { slug: 'telephony', url: 'https://business.mgts.ru/business/telephony', title: 'Телефония' },
            { slug: 'video_surveillance_office', url: 'https://business.mgts.ru/business/video_surveillance_office', title: 'Видеонаблюдение' },
            { slug: 'virtual_ate', url: 'https://business.mgts.ru/virtual_ate', title: 'Виртуальная АТС' }
        ];
        
        for (const pageInfo of accordionPages) {
            try {
                const result = await extractFilesFromAccordions(page, pageInfo);
                if (result) {
                    results.accordions.push(result);
                    results.summary.totalFilesFromAccordions += result.files;
                    results.summary.totalImagesFromAccordions += result.images;
                }
            } catch (error) {
                console.error(`   ❌ Ошибка при обработке ${pageInfo.slug}: ${error.message}`);
                results.errors.push({ slug: pageInfo.slug, type: 'accordions', error: error.message });
            }
        }
        
    } finally {
        await browser.close();
    }
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ ИЗВЛЕЧЕНИЕ ЗАВЕРШЕНО');
    console.log('='.repeat(70));
    console.log(`\n📊 Результаты:`);
    console.log(`   - Обработано страниц: ${results.summary.pagesProcessed}`);
    console.log(`   - Страниц с select-фильтрами: ${results.summary.pagesWithSelectFilters}`);
    console.log(`   - Файлов из табов: ${results.summary.totalFilesFromTabs}`);
    console.log(`   - Изображений из табов: ${results.summary.totalImagesFromTabs}`);
    console.log(`   - Файлов из аккордеонов: ${results.summary.totalFilesFromAccordions}`);
    console.log(`   - Изображений из аккордеонов: ${results.summary.totalImagesFromAccordions}`);
    console.log(`   - Ошибок: ${results.errors.length}`);
    console.log(`\n📄 Отчет сохранен: ${REPORT_FILE}\n`);
}

// Запускаем скрипт
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { main, extractFilesFromTabs, extractFilesFromAccordions };
