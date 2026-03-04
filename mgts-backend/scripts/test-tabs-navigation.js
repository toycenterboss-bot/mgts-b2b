const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Функция для извлечения текста таба
 */
function getDirectText(element) {
    // Ищем прямой текстовый узел
    for (let node of element.childNodes) {
        if (node.nodeType === 3) { // TEXT_NODE
            const text = node.textContent.trim();
            if (text.length > 0) {
                return text;
            }
        }
    }
    return null;
}

/**
 * Главная функция
 */
async function main() {
    const slug = process.argv[2] || 'forms_doc';
    const baseUrl = 'https://business.mgts.ru';
    const pageUrl = `${baseUrl}/${slug}/`;
    
    const outputDir = path.join(__dirname, '..', 'temp', 'tabs-test');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('🚀 Запуск браузера...');
    console.log(`📥 Загрузка страницы: ${pageUrl}`);
    
    const browser = await puppeteer.launch({
        headless: false, // Показываем браузер для визуального контроля
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Детальное логирование событий страницы
    let pageLoadCount = 0;
    let navigationCount = 0;
    let requestCount = 0;
    
    page.on('load', () => {
        pageLoadCount++;
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        console.log(`   [${timestamp}] 🔄 Событие LOAD #${pageLoadCount}`);
    });
    
    page.on('domcontentloaded', () => {
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        console.log(`   [${timestamp}] 📄 DOMContentLoaded`);
    });
    
    page.on('request', (request) => {
        requestCount++;
        const url = request.url();
        const method = request.method();
        // Логируем только важные запросы (не ресурсы)
        if (method === 'GET' && (url.includes(pageUrl) || url.includes('forms_doc'))) {
            const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
            console.log(`   [${timestamp}] 📤 REQUEST #${requestCount} ${method} ${url.substring(0, 80)}...`);
        }
    });
    
    page.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        // Логируем только важные ответы
        if (url.includes(pageUrl) || url.includes('forms_doc')) {
            const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
            if (status >= 300) {
                console.log(`   [${timestamp}] 📥 RESPONSE ${status} ${url.substring(0, 80)}...`);
            }
        }
    });
    
    page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
            navigationCount++;
            const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
            const url = frame.url();
            console.log(`   [${timestamp}] 🧭 NAVIGATION #${navigationCount} to ${url.substring(0, 80)}...`);
        }
    });
    
    // Перехватываем логи из браузера
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        if (type === 'log') {
            process.stdout.write(`   [${timestamp}] [Browser] ${text}\n`);
        } else if (type === 'warn') {
            process.stdout.write(`   [${timestamp}] [Browser WARN] ${text}\n`);
        } else if (type === 'error') {
            process.stdout.write(`   [${timestamp}] [Browser ERROR] ${text}\n`);
        }
    });
    
    const startTime = Date.now();
    console.log(`   ⏱️  Начало загрузки страницы: ${new Date().toISOString()}`);
    
    await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`   ✓ Страница загружена за ${loadTime}ms`);
    console.log(`   📊 Статистика: LOAD=${pageLoadCount}, NAVIGATION=${navigationCount}, REQUESTS=${requestCount}`);
    
    // Ждем немного для полной загрузки
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tabsData = await page.evaluate(async () => {
        const log = (msg) => console.log(msg);
        
        // Функция для извлечения текста таба
        const getDirectText = (element) => {
            for (let node of element.childNodes) {
                if (node.nodeType === 3) {
                    const text = node.textContent.trim();
                    if (text.length > 0) {
                        return text;
                    }
                }
            }
            return null;
        };
        
        const tabsData = [];
        let screenshotCounter = 0;
        const processedTabCombinations = new Set();
        let totalClicks = 0;
        let passCount = 0;
        
        // Находим все табы
        const allTabs = Array.from(document.querySelectorAll(
            '[role="tab"], ' +
            '.tab-button-item, ' +
            '.tab-stroke-item, ' +
            '[class*="tab-item"], ' +
            'button[role="tab"], ' +
            'a[role="tab"], ' +
            '[data-tab], ' +
            '[aria-controls]'
        ));
        
        log(`📋 Найдено всего табов: ${allTabs.length}`);
        
        // Разделяем табы на первый и второй уровень
        const tabsByLevel = {
            level1: [],
            level2: []
        };
        
        allTabs.forEach(tab => {
            // Проверяем, является ли таб первого уровня
            const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                tab.closest('[class*="tab-button"]') !== null ||
                                (tab.getAttribute('aria-controls') && !tab.closest('[class*="tab-content"]'));
            
            if (isFirstLevel) {
                tabsByLevel.level1.push(tab);
            } else {
                // Проверяем, является ли таб второго уровня
                const parent = tab.closest('[class*="tab-stroke"], [class*="tabs-stroke"], [class*="tab-content"]');
                const isSecondLevel = parent !== null || 
                                     tab.classList?.contains('tab-stroke-item') ||
                                     tab.classList?.contains('tab-stroke');
                
                if (isSecondLevel) {
                    tabsByLevel.level2.push(tab);
                }
            }
        });
        
        // Удаляем дубликаты
        const uniqueElements = new Set();
        tabsByLevel.level1 = tabsByLevel.level1.filter(tab => {
            if (uniqueElements.has(tab)) return false;
            uniqueElements.add(tab);
            return true;
        });
        uniqueElements.clear();
        tabsByLevel.level2 = tabsByLevel.level2.filter(tab => {
            if (uniqueElements.has(tab)) return false;
            uniqueElements.add(tab);
            return true;
        });
        
        log(`📊 Табов первого уровня: ${tabsByLevel.level1.length}`);
        log(`📊 Табов второго уровня: ${tabsByLevel.level2.length}`);
        
        // Проходим по табам первого уровня
        passCount++;
        log(`\n🔄 ПРОХОД ПО ТАБАМ #${passCount} (начало: ${new Date().toISOString().split('T')[1].substring(0, 12)})`);
        
        for (let level1Index = 0; level1Index < tabsByLevel.level1.length; level1Index++) {
            const level1Tab = tabsByLevel.level1[level1Index];
            
            // Извлекаем текст таба первого уровня
            let level1Text = getDirectText(level1Tab);
            if (!level1Text || level1Text.length === 0) {
                level1Text = level1Tab.textContent?.trim().replace(/\s+/g, ' ') || '';
            }
            if (!level1Text || level1Text.length === 0) {
                level1Text = level1Tab.innerText?.trim().replace(/\s+/g, ' ') || '';
            }
            if (!level1Text || level1Text.length === 0) {
                level1Text = level1Tab.getAttribute('aria-label') || 
                            level1Tab.getAttribute('title') || 
                            level1Tab.getAttribute('data-tab') ||
                            'Unknown';
            }
            if (level1Text.length > 100) {
                level1Text = level1Text.substring(0, 50) + '...';
            }
            
            log(`\n📌 Таб первого уровня [${level1Index + 1}/${tabsByLevel.level1.length}]: "${level1Text}"`);
            
            // Проверяем, активен ли таб первого уровня
            const isLevel1Active = level1Tab.classList?.contains('active') ||
                                  level1Tab.classList?.contains('selected') ||
                                  level1Tab.getAttribute('aria-selected') === 'true' ||
                                  level1Tab.getAttribute('data-active') === 'true';
            
            // Кликаем на таб первого уровня только если он не активен
            if (!isLevel1Active) {
                try {
                    const clickStartTime = Date.now();
                    log(`   ⏱️  Начало обработки таба первого уровня: ${new Date().toISOString().split('T')[1].substring(0, 12)}`);
                    
                    level1Tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    if (level1Tab.click) {
                        log(`   🖱️  Кликаем на таб первого уровня...`);
                        totalClicks++;
                        level1Tab.click();
                        const clickTime = Date.now();
                        log(`   ⏱️  Клик выполнен: ${new Date().toISOString().split('T')[1].substring(0, 12)} (${clickTime - clickStartTime}ms)`);
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Ждем загрузки контента
                        for (let waitAttempt = 0; waitAttempt < 5; waitAttempt++) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                                 document.querySelector('.tab-content.active') ||
                                                 document.querySelector('.tab-panel.active');
                            if (activeContent && activeContent.innerHTML.trim().length > 50) {
                                log(`   ✓ Контент загружен (попытка ${waitAttempt + 1}/5)`);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    log(`   ⚠️  Ошибка при клике на таб первого уровня: ${e.message}`);
                }
            } else {
                log(`   ✓ Таб первого уровня уже активен, пропускаем клик`);
            }
            
            // Ждем немного, чтобы табы второго уровня успели появиться
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Переопределяем табы второго уровня ПОСЛЕ клика на таб первого уровня
            const currentLevel2Tabs = Array.from(document.querySelectorAll(
                '[role="tab"]:not([class*="tab-button"]), ' +
                '.tab-stroke-item, ' +
                '[class*="tab-stroke"], ' +
                '[class*="tab-item"]:not([class*="tab-button"]), ' +
                'button[role="tab"], ' +
                'a[role="tab"], ' +
                '[data-tab], ' +
                '[aria-controls]'
            )).filter(tab => {
                const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                    tab.closest('[class*="tab-button"]') !== null ||
                                    (tab.getAttribute('aria-controls') && !tab.closest('[class*="tab-content"]'));
                
                if (isFirstLevel) return false;
                
                const parent = tab.closest('[class*="tab-stroke"], [class*="tabs-stroke"], [class*="tab-content"]');
                const isSecondLevel = parent !== null || 
                                     tab.classList?.contains('tab-stroke-item') ||
                                     tab.classList?.contains('tab-stroke');
                
                return isSecondLevel;
            });
            
            // Фильтруем видимые табы второго уровня
            const visibleLevel2Tabs = currentLevel2Tabs.filter(level2Tab => {
                if (!document.body.contains(level2Tab)) {
                    return false;
                }
                const isVisible = level2Tab.offsetParent !== null && 
                                 window.getComputedStyle(level2Tab).display !== 'none' &&
                                 window.getComputedStyle(level2Tab).visibility !== 'hidden';
                return isVisible;
            });
            
            // Удаляем дубликаты
            const uniqueLevel2Tabs = [];
            const seenElements = new Set();
            visibleLevel2Tabs.forEach(tab => {
                if (!seenElements.has(tab)) {
                    seenElements.add(tab);
                    uniqueLevel2Tabs.push(tab);
                }
            });
            
            const tabsToProcess = uniqueLevel2Tabs;
            
            log(`   📋 Найдено табов второго уровня для обработки: ${tabsToProcess.length}`);
            
            // Сначала собираем данные для активного подтаба (без клика)
            let firstActiveSubTabProcessed = false;
            
            for (let level2Index = 0; level2Index < tabsToProcess.length; level2Index++) {
                const tab = tabsToProcess[level2Index];
                
                // Проверяем, что элемент все еще в DOM
                if (!document.body.contains(tab)) {
                    log(`   ⚠️  Таб [${level2Index + 1}/${tabsToProcess.length}] удален из DOM, пропускаем`);
                    continue;
                }
                
                // Извлекаем текст таба второго уровня
                let tabText = getDirectText(tab);
                if (!tabText || tabText.length === 0) {
                    tabText = tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                }
                if (!tabText || tabText.length === 0) {
                    tabText = tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                }
                if (!tabText || tabText.length === 0) {
                    tabText = tab.getAttribute('aria-label') || 
                             tab.getAttribute('title') || 
                             tab.getAttribute('data-tab') ||
                             tab.getAttribute('data-label') ||
                             'Unknown';
                }
                if (tabText.length > 100) {
                    tabText = tabText.substring(0, 50) + '...';
                }
                
                // Проверяем, активен ли подтаб
                const isLevel2Active = tab.classList?.contains('active') ||
                                      tab.classList?.contains('selected') ||
                                      tab.getAttribute('aria-selected') === 'true' ||
                                      tab.getAttribute('data-active') === 'true';
                
                const level1TabId = level1Tab.id || level1Tab.getAttribute('data-tab') || `level1-${level1Index}`;
                const level2TabId = tab.id || tab.getAttribute('data-tab') || `level2-${level2Index}`;
                const combinationKey = `${level1TabId}:${level2TabId}`;
                const textCombinationKey = `[${level1Index}]${level1Text} > ${tabText}`;
                
                if (processedTabCombinations.has(combinationKey) || processedTabCombinations.has(textCombinationKey)) {
                    log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" - уже обработан, пропускаем`);
                    continue;
                }
                
                // Если это активный подтаб и мы еще не обработали активный подтаб
                if (isLevel2Active && !firstActiveSubTabProcessed) {
                    log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" (активен, делаем скриншот без клика)`);
                    firstActiveSubTabProcessed = true;
                    processedTabCombinations.add(combinationKey);
                    processedTabCombinations.add(textCombinationKey);
                    screenshotCounter++;
                    
                    // Ждем стабилизации контента
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Делаем скриншот СРАЗУ
                    const screenshotPath = path.join(outputDir, `${String(screenshotCounter).padStart(3, '0')}_${level1Text.replace(/[^a-zA-Z0-9]/g, '_')}_${tabText.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                    const screenshotBase64 = await page.screenshot({ 
                        path: screenshotPath, 
                        fullPage: true,
                        encoding: 'base64'
                    });
                    
                    tabsData.push({
                        level1: level1Text,
                        level2: tabText,
                        combination: `${level1Text} > ${tabText}`,
                        screenshotNumber: screenshotCounter,
                        isActive: true,
                        clicked: false,
                        level1Index: level1Index,
                        level2Index: level2Index,
                        screenshotPath: screenshotPath
                    });
                    
                    log(`      📸 Скриншот #${screenshotCounter} сохранен: ${screenshotPath}`);
                } else if (!isLevel2Active) {
                    // Если подтаб не активен, кликаем на него
                    log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" (не активен, кликаем)`);
                    processedTabCombinations.add(combinationKey);
                    processedTabCombinations.add(textCombinationKey);
                    
                    try {
                        tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                    if (tab.click && typeof tab.click === 'function') {
                        const clickStartTime = Date.now();
                        log(`      ⏱️  Начало клика на подтаб: ${new Date().toISOString().split('T')[1].substring(0, 12)}`);
                        totalClicks++;
                        tab.click();
                        const clickTime = Date.now();
                        log(`      ✓ Клик выполнен: ${new Date().toISOString().split('T')[1].substring(0, 12)} (${clickTime - clickStartTime}ms)`);
                        await new Promise(resolve => setTimeout(resolve, 800));
                            
                            // Ждем появления контента
                            for (let waitAttempt = 0; waitAttempt < 2; waitAttempt++) {
                                await new Promise(resolve => setTimeout(resolve, 400));
                                const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                                     document.querySelector('.tab-content.active') ||
                                                     document.querySelector('.tab-panel.active') ||
                                                     document.querySelector('article');
                                if (activeContent && activeContent.innerHTML.trim().length > 50) {
                                    log(`      ✓ Контент найден (попытка ${waitAttempt + 1}/2)`);
                                    break;
                                }
                            }
                        }
                    } catch (clickError) {
                        log(`      ❌ Ошибка при клике: ${clickError.message}`);
                        continue;
                    }
                    
                    screenshotCounter++;
                    
                    // Ждем стабилизации контента после клика
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Делаем скриншот СРАЗУ после клика
                    const screenshotPath = path.join(outputDir, `${String(screenshotCounter).padStart(3, '0')}_${level1Text.replace(/[^a-zA-Z0-9]/g, '_')}_${tabText.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                    const screenshotBase64 = await page.screenshot({ 
                        path: screenshotPath, 
                        fullPage: true,
                        encoding: 'base64'
                    });
                    
                    tabsData.push({
                        level1: level1Text,
                        level2: tabText,
                        combination: `${level1Text} > ${tabText}`,
                        screenshotNumber: screenshotCounter,
                        isActive: false,
                        clicked: true,
                        level1Index: level1Index,
                        level2Index: level2Index,
                        screenshotPath: screenshotPath
                    });
                    
                    log(`      📸 Скриншот #${screenshotCounter} сохранен: ${screenshotPath}`);
                } else {
                    // Если подтаб активен, но мы уже обработали активный подтаб - пропускаем
                    log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" (активен, но уже обработан, пропускаем)`);
                    continue;
                }
            }
        }
        
        return {
            tabsData: tabsData,
            totalScreenshots: screenshotCounter,
            processedCombinations: Array.from(processedTabCombinations),
            totalClicks: totalClicks,
            passCount: passCount
        };
    });
    
    console.log(`\n✅ Обработка табов завершена`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего уникальных комбинаций: ${tabsData.totalScreenshots}`);
    console.log(`   - Всего кликов: ${tabsData.totalClicks}`);
    console.log(`   - Количество проходов: ${tabsData.passCount}`);
    console.log(`   - LOAD событий: ${pageLoadCount}`);
    console.log(`   - NAVIGATION событий: ${navigationCount}`);
    console.log(`\n📋 Обработанные комбинации:`);
    tabsData.tabsData.forEach((data, index) => {
        console.log(`   ${index + 1}. ${data.combination} (скриншот #${data.screenshotNumber}, активен: ${data.isActive}, клик: ${data.clicked})`);
    });
    
    // Скриншоты уже сделаны во время первого прохода, просто выводим информацию
    console.log(`\n📸 Скриншоты созданы во время обработки табов (${tabsData.totalScreenshots} шт.)`);
    
    // Сохраняем метаданные
    const metadataPath = path.join(outputDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(tabsData, null, 2));
    console.log(`\n💾 Метаданные сохранены: ${metadataPath}`);
    
    await browser.close();
    console.log(`\n✅ Тест завершен. Всего скриншотов: ${tabsData.totalScreenshots}`);
}

main().catch(console.error);
