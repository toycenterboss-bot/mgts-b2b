const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Главная функция - делает скриншоты сразу во время первого прохода
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
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Детальное логирование событий
    let pageLoadCount = 0;
    let navigationCount = 0;
    
    page.on('load', () => {
        pageLoadCount++;
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        console.log(`   [${timestamp}] 🔄 LOAD #${pageLoadCount}`);
    });
    
    page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
            navigationCount++;
            const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
            if (navigationCount <= 5) {
                console.log(`   [${timestamp}] 🧭 NAVIGATION #${navigationCount}`);
            }
        }
    });
    
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
        if (type === 'log') {
            process.stdout.write(`   [${timestamp}] [Browser] ${text}\n`);
        }
    });
    
    await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
    });
    
    console.log(`   ✓ Страница загружена`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Получаем информацию о табах
    const tabsInfo = await page.evaluate(() => {
        const getDirectText = (element) => {
            for (let node of element.childNodes) {
                if (node.nodeType === 3) {
                    const text = node.textContent.trim();
                    if (text.length > 0) return text;
                }
            }
            return null;
        };
        
        const allTabs = Array.from(document.querySelectorAll(
            '[role="tab"], .tab-button-item, .tab-stroke-item, [class*="tab-item"], button[role="tab"], a[role="tab"], [data-tab], [aria-controls]'
        ));
        
        const tabsByLevel = { level1: [], level2: [] };
        
        allTabs.forEach(tab => {
            const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                tab.closest('[class*="tab-button"]') !== null;
            if (isFirstLevel) {
                tabsByLevel.level1.push(tab);
            } else {
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
        
        return {
            level1Count: tabsByLevel.level1.length,
            level2Count: tabsByLevel.level2.length
        };
    });
    
    console.log(`📊 Найдено табов: первого уровня=${tabsInfo.level1Count}, второго уровня=${tabsInfo.level2Count}`);
    
    const screenshots = [];
    let screenshotCounter = 0;
    const processedCombinations = new Set();
    
    // Проходим по табам первого уровня
    for (let level1Index = 0; level1Index < tabsInfo.level1Count; level1Index++) {
        console.log(`\n📌 Обработка таба первого уровня [${level1Index + 1}/${tabsInfo.level1Count}]`);
        
        // Получаем информацию о текущем табе первого уровня
        // Используем специфичный селектор .tab-button-item напрямую
        const level1Info = await page.evaluate((level1Index) => {
            // Находим только реальные кнопки табов первого уровня
            const allLevel1Tabs = Array.from(document.querySelectorAll('.tab-button-item'));
            
            // Удаляем дубликаты по элементу
            const uniqueElements = new Set();
            const level1Tabs = allLevel1Tabs.filter(tab => {
                if (uniqueElements.has(tab)) return false;
                uniqueElements.add(tab);
                return true;
            });
            
            if (level1Tabs[level1Index]) {
                const tab = level1Tabs[level1Index];
                const getDirectText = (element) => {
                    // Ищем прямой текстовый узел в первом уровне дочерних элементов
                    for (let child of element.childNodes) {
                        if (child.nodeType === 3) {
                            const text = child.textContent.trim();
                            if (text.length > 0) return text;
                        } else if (child.nodeType === 1) {
                            // Если это элемент, ищем текстовый узел внутри
                            for (let node of child.childNodes) {
                                if (node.nodeType === 3) {
                                    const text = node.textContent.trim();
                                    if (text.length > 0) return text;
                                }
                            }
                        }
                    }
                    return null;
                };
                
                let text = getDirectText(tab);
                if (!text || text.length === 0) {
                    // Пробуем найти текст только в прямых дочерних элементах, исключая вложенные табы
                    const directChildren = Array.from(tab.children).filter(child => 
                        !child.classList?.contains('tab-button-item') && 
                        !child.closest('[class*="tab-button"]')
                    );
                    for (const child of directChildren) {
                        const childText = child.textContent?.trim();
                        if (childText && childText.length > 0 && childText.length < 200) {
                            text = childText;
                            break;
                        }
                    }
                }
                if (!text || text.length === 0) {
                    text = tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                }
                if (!text || text.length === 0) {
                    text = tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                }
                if (!text || text.length === 0) {
                    text = tab.getAttribute('aria-label') || 
                           tab.getAttribute('title') || 
                           tab.getAttribute('data-tab') || 
                           'Unknown';
                }
                // Ограничиваем длину и убираем дубликаты
                if (text.length > 100) {
                    // Пробуем найти уникальную часть
                    const parts = text.split(/\s+/);
                    if (parts.length > 5) {
                        text = parts.slice(0, 5).join(' ') + '...';
                    } else {
                        text = text.substring(0, 50) + '...';
                    }
                }
                
                const isActive = tab.classList?.contains('active') ||
                                tab.classList?.contains('selected') ||
                                tab.getAttribute('aria-selected') === 'true' ||
                                tab.getAttribute('data-active') === 'true';
                
                return { text, isActive };
            }
            return null;
        }, level1Index);
        
        if (!level1Info) continue;
        
        const level1Text = level1Info.text;
        console.log(`   Таб [${level1Index}]: "${level1Text}" (активен: ${level1Info.isActive})`);
        
        // Отладочный вывод - проверяем все табы первого уровня
        const allLevel1Tabs = await page.evaluate(() => {
            const allLevel1Tabs = Array.from(document.querySelectorAll('.tab-button-item'));
            const uniqueElements = new Set();
            const level1Tabs = allLevel1Tabs.filter(tab => {
                if (uniqueElements.has(tab)) return false;
                uniqueElements.add(tab);
                return true;
            });
            return level1Tabs.map((tab, idx) => {
                const getDirectText = (element) => {
                    for (let child of element.childNodes) {
                        if (child.nodeType === 3) {
                            const text = child.textContent.trim();
                            if (text.length > 0) return text;
                        }
                    }
                    return null;
                };
                let text = getDirectText(tab);
                if (!text) text = tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                if (!text) text = tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                if (!text) text = tab.getAttribute('aria-label') || tab.getAttribute('title') || 'Unknown';
                if (text.length > 100) text = text.substring(0, 50) + '...';
                const isActive = tab.classList?.contains('active') || tab.getAttribute('aria-selected') === 'true';
                return { index: idx, text, isActive };
            });
        });
        console.log(`   🔍 Все табы первого уровня: ${allLevel1Tabs.map(t => `[${t.index}]"${t.text}"(${t.isActive ? 'активен' : 'неактивен'})`).join(', ')}`);
        
        // Кликаем на таб первого уровня если нужно
        if (!level1Info.isActive) {
            await page.evaluate((level1Index) => {
                const allTabs = Array.from(document.querySelectorAll(
                    '[role="tab"], .tab-button-item, [class*="tab-button"], button[role="tab"], a[role="tab"], [data-tab], [aria-controls]'
                ));
                
                const tabsByLevel = { level1: [] };
                allTabs.forEach(tab => {
                    // Пропускаем контейнеры
                    const isContainer = tab.querySelector('.tab-button-item, [class*="tab-button"]') !== null;
                    if (isContainer) return;
                    
                    const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                        (tab.closest('[class*="tab-button"]') !== null && 
                                         !tab.closest('[class*="tab-button"]').querySelector('.tab-button-item'));
                    
                    const isClickable = tab.tagName === 'BUTTON' || 
                                       tab.tagName === 'A' || 
                                       tab.getAttribute('role') === 'tab' ||
                                       tab.onclick !== null;
                    
                    if (isFirstLevel && isClickable) {
                        tabsByLevel.level1.push(tab);
                    }
                });
                
                const uniqueElements = new Set();
                const level1Tabs = tabsByLevel.level1.filter(tab => {
                    if (uniqueElements.has(tab)) return false;
                    uniqueElements.add(tab);
                    return true;
                });
                
                if (level1Tabs[level1Index]) {
                    level1Tabs[level1Index].scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    level1Tabs[level1Index].click();
                }
            }, level1Index);
            
            console.log(`   🖱️  Клик на таб первого уровня`);
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            console.log(`   ✓ Таб уже активен, пропускаем клик`);
        }
        
        // Ждем появления табов второго уровня
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Получаем список табов второго уровня
        const level2TabsInfo = await page.evaluate(() => {
            const currentLevel2Tabs = Array.from(document.querySelectorAll(
                '[role="tab"]:not([class*="tab-button"]), .tab-stroke-item, [class*="tab-stroke"], [class*="tab-item"]:not([class*="tab-button"])'
            )).filter(tab => {
                const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                    tab.closest('[class*="tab-button"]') !== null;
                if (isFirstLevel) return false;
                const parent = tab.closest('[class*="tab-stroke"], [class*="tabs-stroke"], [class*="tab-content"]');
                const isSecondLevel = parent !== null || 
                                     tab.classList?.contains('tab-stroke-item') ||
                                     tab.classList?.contains('tab-stroke');
                return isSecondLevel;
            });
            
            const visibleLevel2Tabs = currentLevel2Tabs.filter(level2Tab => {
                if (!document.body.contains(level2Tab)) return false;
                const isVisible = level2Tab.offsetParent !== null && 
                                 window.getComputedStyle(level2Tab).display !== 'none' &&
                                 window.getComputedStyle(level2Tab).visibility !== 'hidden';
                return isVisible;
            });
            
            const uniqueLevel2Tabs = [];
            const seenElements = new Set();
            visibleLevel2Tabs.forEach(tab => {
                if (!seenElements.has(tab)) {
                    seenElements.add(tab);
                    uniqueLevel2Tabs.push(tab);
                }
            });
            
            const getDirectText = (element) => {
                for (let node of element.childNodes) {
                    if (node.nodeType === 3) {
                        const text = node.textContent.trim();
                        if (text.length > 0) return text;
                    }
                }
                return null;
            };
            
            return uniqueLevel2Tabs.map((tab, index) => {
                let text = getDirectText(tab);
                if (!text) text = tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                if (!text) text = tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                if (!text) text = tab.getAttribute('aria-label') || tab.getAttribute('title') || 'Unknown';
                if (text.length > 100) text = text.substring(0, 50) + '...';
                
                const isActive = tab.classList?.contains('active') ||
                                tab.getAttribute('aria-selected') === 'true';
                
                return { index, text, isActive };
            });
        });
        
        console.log(`   📋 Найдено табов второго уровня: ${level2TabsInfo.length}`);
        
        let firstActiveProcessed = false;
        
        // Проходим по табам второго уровня
        for (const level2Info of level2TabsInfo) {
            const level2Text = level2Info.text;
            const combinationKey = `${level1Index}:${level2Info.index}`;
            
            if (processedCombinations.has(combinationKey)) {
                console.log(`   🔹 Подтаб "${level2Text}" - уже обработан, пропускаем`);
                continue;
            }
            
            processedCombinations.add(combinationKey);
            
            // Если это активный подтаб и мы еще не обработали активный
            if (level2Info.isActive && !firstActiveProcessed) {
                console.log(`   🔹 Подтаб "${level2Text}" (активен, делаем скриншот без клика)`);
                firstActiveProcessed = true;
                
                // Ждем стабилизации
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Делаем скриншот СРАЗУ
                screenshotCounter++;
                const screenshotPath = path.join(outputDir, `${String(screenshotCounter).padStart(3, '0')}_${level1Text.replace(/[^a-zA-Z0-9]/g, '_')}_${level2Text.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`      📸 Скриншот #${screenshotCounter} сохранен`);
                
                screenshots.push({
                    screenshotNumber: screenshotCounter,
                    level1: level1Text,
                    level2: level2Text,
                    combination: `${level1Text} > ${level2Text}`,
                    isActive: true,
                    clicked: false
                });
            } else if (!level2Info.isActive) {
                // Если подтаб не активен, кликаем на него
                console.log(`   🔹 Подтаб "${level2Text}" (не активен, кликаем)`);
                
                await page.evaluate((level2Index) => {
                    const currentLevel2Tabs = Array.from(document.querySelectorAll(
                        '[role="tab"]:not([class*="tab-button"]), .tab-stroke-item, [class*="tab-stroke"], [class*="tab-item"]:not([class*="tab-button"])'
                    )).filter(tab => {
                        const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                            tab.closest('[class*="tab-button"]') !== null;
                        if (isFirstLevel) return false;
                        const parent = tab.closest('[class*="tab-stroke"], [class*="tabs-stroke"], [class*="tab-content"]');
                        const isSecondLevel = parent !== null || 
                                             tab.classList?.contains('tab-stroke-item') ||
                                             tab.classList?.contains('tab-stroke');
                        return isSecondLevel;
                    });
                    
                    const visibleLevel2Tabs = currentLevel2Tabs.filter(level2Tab => {
                        if (!document.body.contains(level2Tab)) return false;
                        const isVisible = level2Tab.offsetParent !== null && 
                                         window.getComputedStyle(level2Tab).display !== 'none' &&
                                         window.getComputedStyle(level2Tab).visibility !== 'hidden';
                        return isVisible;
                    });
                    
                    const uniqueLevel2Tabs = [];
                    const seenElements = new Set();
                    visibleLevel2Tabs.forEach(tab => {
                        if (!seenElements.has(tab)) {
                            seenElements.add(tab);
                            uniqueLevel2Tabs.push(tab);
                        }
                    });
                    
                    if (uniqueLevel2Tabs[level2Index]) {
                        uniqueLevel2Tabs[level2Index].click();
                    }
                }, level2Info.index);
                
                console.log(`      🖱️  Клик выполнен`);
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Ждем появления контента
                await new Promise(resolve => setTimeout(resolve, 400));
                
                // Делаем скриншот СРАЗУ после клика
                screenshotCounter++;
                const screenshotPath = path.join(outputDir, `${String(screenshotCounter).padStart(3, '0')}_${level1Text.replace(/[^a-zA-Z0-9]/g, '_')}_${level2Text.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`      📸 Скриншот #${screenshotCounter} сохранен`);
                
                screenshots.push({
                    screenshotNumber: screenshotCounter,
                    level1: level1Text,
                    level2: level2Text,
                    combination: `${level1Text} > ${level2Text}`,
                    isActive: false,
                    clicked: true
                });
            } else {
                console.log(`   🔹 Подтаб "${level2Text}" (активен, но уже обработан, пропускаем)`);
            }
        }
    }
    
    // Сохраняем метаданные
    const metadata = {
        totalScreenshots: screenshotCounter,
        screenshots: screenshots,
        totalClicks: screenshots.filter(s => s.clicked).length,
        passCount: 1,
        loadEvents: pageLoadCount,
        navigationEvents: navigationCount
    };
    
    const metadataPath = path.join(outputDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`\n✅ Тест завершен`);
    console.log(`📊 Статистика:`);
    console.log(`   - Всего скриншотов: ${screenshotCounter}`);
    console.log(`   - Всего кликов: ${metadata.totalClicks}`);
    console.log(`   - Проходов: 1`);
    console.log(`   - LOAD событий: ${pageLoadCount}`);
    console.log(`   - NAVIGATION событий: ${navigationCount}`);
    console.log(`\n💾 Метаданные сохранены: ${metadataPath}`);
    
    await browser.close();
}

main().catch(console.error);
