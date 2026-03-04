const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getPageUrl } = require('./load-pages-urls');

const BASE_URL = 'https://business.mgts.ru';

// Фильтруем нулевые байты из stdout/stderr, чтобы они не попадали в лог
(() => {
    const sanitizeChunk = (chunk) => {
        if (typeof chunk === 'string') {
            return chunk.replace(/\u0000/g, '');
        }
        if (Buffer.isBuffer(chunk)) {
            return Buffer.from(chunk.toString('utf8').replace(/\u0000/g, ''), 'utf8');
        }
        return chunk;
    };
    const origStdoutWrite = process.stdout.write.bind(process.stdout);
    const origStderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = (chunk, encoding, callback) => origStdoutWrite(sanitizeChunk(chunk), encoding, callback);
    process.stderr.write = (chunk, encoding, callback) => origStderrWrite(sanitizeChunk(chunk), encoding, callback);
})();

/**
 * Удаляет все SVG блоки из HTML контента
 */
function removeSvgFromHtml(html) {
    if (!html || typeof html !== 'string') {
        return html;
    }
    
    try {
        // Используем регулярное выражение для удаления всех <svg>...</svg> блоков
        // Включая вложенные SVG
        let cleanedHtml = html;
        
        // Удаляем все SVG теги (включая содержимое)
        // Паттерн: <svg ...>...</svg> (с учетом многострочности и вложенности)
        cleanedHtml = cleanedHtml.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
        
        // Также удаляем самозакрывающиеся SVG теги
        cleanedHtml = cleanedHtml.replace(/<svg[^>]*\/>/gi, '');
        
        return cleanedHtml;
    } catch (error) {
        console.warn(`⚠️  Ошибка при удалении SVG: ${error.message}`);
        return html; // Возвращаем оригинал в случае ошибки
    }
}

function sanitizeFileLabel(label) {
    const safe = (label || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return safe || 'image';
}

function saveLLMScreenshot(outputDir, safeSlug, label, base64) {
    const imagesDir = path.join(outputDir, `${safeSlug}_llm_images`);
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    const fileName = `${safeSlug}_${sanitizeFileLabel(label)}.png`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return filePath;
}

function normalizeInfoformenResult(result) {
    if (!result || !Array.isArray(result.sections)) {
        return;
    }

    const sections = result.sections;
    const accordionSections = sections.filter(section => section && section.type === 'accordion');
    if (accordionSections.length === 0) {
        return;
    }

    const hasContent = (item) => {
        if (!item) return false;
        const text = (item.content?.text || '').trim();
        const fileLinks = Array.isArray(item.content?.fileLinks) ? item.content.fileLinks : [];
        const cards = Array.isArray(item.content?.cards) ? item.content.cards : [];
        const table = item.content?.table;
        const tableRows = Array.isArray(table?.rows) ? table.rows.length : 0;
        const tableHeaders = Array.isArray(table?.headers) ? table.headers.length : 0;
        return Boolean(text) || fileLinks.length > 0 || cards.length > 0 || tableRows > 0 || tableHeaders > 0;
    };

    let contentSection = sections.find(section => section && section.type === 'content' && Array.isArray(section.elements));
    if (!contentSection) {
        contentSection = {
            type: 'content',
            title: result.metadata?.title || 'Информация для акционеров',
            subtitle: null,
            text: '',
            elements: []
        };
        sections.push(contentSection);
    }

    let accordionElement = contentSection.elements.find(element => element && element.type === 'accordion');
    if (!accordionElement) {
        accordionElement = {
            type: 'accordion',
            title: 'Собрания акционеров по датам',
            items: []
        };
        contentSection.elements.push(accordionElement);
    }

    const items = [];
    const indexByTitle = new Map();

    accordionSections.forEach(section => {
        const title = (section.title || '').trim();
        if (!title) return;

        const fileLinks = Array.isArray(section.links?.fileLinks) ? section.links.fileLinks : [];
        const text = (section.text || '').trim();
        const cards = Array.isArray(section.cards) ? section.cards : [];
        const table = section.table || null;
        const score = (fileLinks.length * 10) + text.length + (cards.length * 2) + (table ? 5 : 0);
        const item = {
            title,
            isActive: false,
            content: {
                text,
                fileLinks,
                cards,
                table
            },
            _score: score
        };

        if (indexByTitle.has(title)) {
            const idx = indexByTitle.get(title);
            if (score > items[idx]._score) {
                items[idx] = item;
            }
        } else {
            indexByTitle.set(title, items.length);
            items.push(item);
        }
    });

    accordionElement.items = items
        .filter(hasContent)
        .map(({ _score, ...rest }) => rest);

    // Удаляем отдельные accordion-секции, оставляя единый аккордеон в content
    result.sections = sections.filter(section => section && section.type !== 'accordion');

    result.sections.forEach((section, index) => {
        section.sectionIndex = index + 1;
    });
}

/**
 * Читает API ключ из CONTEXT.md
 */
function getApiKeyFromContext() {
    try {
        const contextPath = path.join(__dirname, '..', '..', 'docs', 'project', 'CONTEXT.md');
        if (fs.existsSync(contextPath)) {
            const contextContent = fs.readFileSync(contextPath, 'utf-8');
            
            // Ищем Perplexity API ключ (формат: pplx-...)
            const perplexityKeyMatch = contextContent.match(/pplx-[a-zA-Z0-9]+/);
            if (perplexityKeyMatch) {
                return perplexityKeyMatch[0];
            }
            
            // Ищем в export строке
            const perplexityExportMatch = contextContent.match(/PERPLEXITY_API_KEY["']?\s*=\s*["']?([^"'\s]+)["']?/i);
            if (perplexityExportMatch) {
                return perplexityExportMatch[1];
            }
            
            // Ищем OpenAI API ключ
            const openaiMatch = contextContent.match(/OPENAI_API_KEY["']?\s*=\s*["']?([^"'\s]+)["']?/i);
            if (openaiMatch) {
                return openaiMatch[1];
            }
        }
    } catch (error) {
        console.warn('⚠️  Не удалось прочитать CONTEXT.md:', error.message);
    }
    return null;
}

// Конфигурация LLM (можно использовать OpenAI, Anthropic Claude, Perplexity, или локальный LLM)
const LLM_CONFIG = {
    provider: process.env.LLM_PROVIDER || 'perplexity', // 'openai', 'anthropic', 'perplexity', 'local'
    apiKey: process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || getApiKeyFromContext() || '',
    model: process.env.LLM_MODEL || 'sonar', // Perplexity модели: sonar, sonar-pro, sonar-small-online, sonar-medium-online, sonar-large-online
    baseURL: process.env.LLM_BASE_URL || 'https://api.perplexity.ai'
};
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 180000;
const LLM_RETRY_COUNT = Number(process.env.LLM_RETRY_COUNT) || 3;
const LLM_RETRY_DELAY_MS = Number(process.env.LLM_RETRY_DELAY_MS) || 5000;

function isRetryableLLMError(error) {
    const code = error?.code;
    const status = error?.response?.status;
    if (code && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED'].includes(code)) {
        return true;
    }
    if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
        return true;
    }
    return false;
}

/**
 * Извлекает полный HTML контент страницы (без header/footer)
 * Также кликает по всем табам, чтобы извлечь их содержимое
 */
/**
 * Новая версия extractPageContent - работает в Node.js контексте
 * Делает скриншоты и извлекает HTML сразу во время первого прохода по табам
 */
async function extractPageContentV2(page, pageUrl, outputDir, slug) {
    const fs = require('fs');
    const path = require('path');
    
    const tabsData = {};
    const tabsFileLinksByTab = {};
    const processedCombinations = new Set();
    let totalClicks = 0;
    const MAX_TOTAL_CLICKS = 50;
    const isOffersPage = slug === 'offers';
    
    // Получаем информацию о табах первого уровня
    const tabsInfo = await page.evaluate(() => {
        const allLevel1Tabs = Array.from(document.querySelectorAll('.tab-button-item'));
        const uniqueElements = new Set();
        const level1Tabs = allLevel1Tabs.filter(tab => {
            if (uniqueElements.has(tab)) return false;
            uniqueElements.add(tab);
            return true;
        });
        
        // ВАЖНО: Проверяем, что это действительно табы, а не ссылки на другие страницы
        const validTabs = level1Tabs.filter(tab => {
            // Исключаем элементы, которые являются ссылками на другие страницы
            const href = tab.getAttribute('href');
            if (href && href.trim() && !href.startsWith('#') && !href.startsWith('javascript:')) {
                return false; // Это ссылка на другую страницу, не таб
            }
            // Исключаем элементы <a> с href, которые ведут на другие страницы
            if (tab.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                return false; // Это ссылка на другую страницу, не таб
            }
            return true;
        });
        
        return {
            level1Count: validTabs.length,
            hasTabs: validTabs.length > 0
        };
    });
    
    console.log(`   📊 Найдено табов первого уровня: ${tabsInfo.level1Count}`);
    
    // ВАЖНО: Если на странице нет табов, не обрабатываем их
    if (!tabsInfo.hasTabs || tabsInfo.level1Count === 0) {
        console.log(`   ℹ️  На странице нет табов, пропускаем обработку табов`);
        return {
            tabsContentJSON: null,
            extractedFileLinks: {},
            tabsFileLinksByTab: {},
            totalClicks: 0,
            uniqueCombinations: 0
        };
    }
    
    // Проходим по табам первого уровня
    for (let level1Index = 0; level1Index < tabsInfo.level1Count; level1Index++) {
        // Получаем информацию о текущем табе первого уровня
        const level1Info = await page.evaluate((level1Index) => {
            const allLevel1Tabs = Array.from(document.querySelectorAll('.tab-button-item'));
            const uniqueElements = new Set();
            const level1Tabs = allLevel1Tabs.filter(tab => {
                if (uniqueElements.has(tab)) return false;
                uniqueElements.add(tab);
                return true;
            });
            
            if (level1Tabs[level1Index]) {
                const tab = level1Tabs[level1Index];
                const getDirectText = (element) => {
                    for (let child of element.childNodes) {
                        if (child.nodeType === 3) {
                            const text = child.textContent.trim();
                            if (text.length > 0) return text;
                        } else if (child.nodeType === 1) {
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
                if (!text) text = tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                if (!text) text = tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                if (!text) text = tab.getAttribute('aria-label') || tab.getAttribute('title') || tab.getAttribute('data-tab') || 'Unknown';
                if (text.length > 100) {
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
        console.log(`   📌 Таб первого уровня [${level1Index + 1}/${tabsInfo.level1Count}]: "${level1Text}" (активен: ${level1Info.isActive})`);
        
        // Кликаем на таб первого уровня если нужно
        let level1Clicked = false;
        if (!level1Info.isActive) {
            // Проверяем URL до клика
            const urlBefore = page.url();
            
            await page.evaluate((level1Index) => {
                const allLevel1Tabs = Array.from(document.querySelectorAll('.tab-button-item'));
                const uniqueElements = new Set();
                const level1Tabs = allLevel1Tabs.filter(tab => {
                    if (uniqueElements.has(tab)) return false;
                    uniqueElements.add(tab);
                    return true;
                });
                
                if (level1Tabs[level1Index]) {
                    const tab = level1Tabs[level1Index];
                    
                    // ВАЖНО: Проверяем, что это не ссылка на другую страницу
                    const href = tab.getAttribute('href');
                    if (href && href.trim() && !href.startsWith('#') && !href.startsWith('javascript:')) {
                        // Это ссылка на другую страницу - не кликаем
                        console.warn(`[Browser] Пропускаем клик по табу "${tab.textContent?.trim()}" - это ссылка на другую страницу: ${href}`);
                        return;
                    }
                    
                    // Проверяем, что элемент не является ссылкой <a> с href
                    if (tab.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                        console.warn(`[Browser] Пропускаем клик по табу "${tab.textContent?.trim()}" - это ссылка <a> на другую страницу: ${href}`);
                        return;
                    }
                    
                    tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    tab.click();
                }
            }, level1Index);
            
            // Проверяем, не произошел ли переход на другую страницу
            await new Promise(resolve => setTimeout(resolve, 500));
            const urlAfter = page.url();
            if (urlAfter !== urlBefore && !urlAfter.includes(urlBefore.split('?')[0])) {
                console.warn(`   ⚠️  Обнаружен переход на другую страницу: ${urlBefore} -> ${urlAfter}`);
                console.warn(`   🔄 Возвращаемся на исходную страницу...`);
                await page.goto(urlBefore, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue; // Пропускаем этот таб
            }
            
            console.log(`      🖱️  Клик на таб первого уровня`);
            level1Clicked = true;
            totalClicks++;
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            console.log(`      ✓ Таб уже активен, пропускаем клик`);
        }
        
        // Ждем появления табов второго уровня
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Получаем список табов второго уровня
        const level2TabsInfo = await page.evaluate(() => {
            const currentLevel2Tabs = Array.from(document.querySelectorAll(
                '[role="tab"]:not([class*="tab-button"]), .tab-stroke-item, [class*="tab-stroke"], [class*="tab-item"]:not([class*="tab-button"])'
            )).filter(tab => {
                // ВАЖНО: Исключаем элементы, которые являются ссылками на другие страницы
                const href = tab.getAttribute('href');
                if (href && href.trim() && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    return false; // Это ссылка на другую страницу, не таб
                }
                // Исключаем элементы <a> с href, которые ведут на другие страницы
                if (tab.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    return false; // Это ссылка на другую страницу, не таб
                }
                
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
        
        console.log(`      📋 Найдено табов второго уровня: ${level2TabsInfo.length}`);
        
        if (level2TabsInfo.length === 0) {
            const textCombinationKey = level1Text;
            if (!processedCombinations.has(textCombinationKey)) {
                processedCombinations.add(textCombinationKey);
                console.log(`      🔹 Подтабов нет, извлекаем данные для таба "${level1Text}"`);
                if (isOffersPage && level1Clicked) {
                    const offersSignatureBefore = await page.evaluate(() => {
                        const items = Array.from(document.querySelectorAll('.files-list a.file-item, a.file-item'));
                        const firstText = items[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '';
                        return `${items.length}:${firstText}`;
                    });
                    await page.waitForFunction((prevSignature) => {
                        const items = Array.from(document.querySelectorAll('.files-list a.file-item, a.file-item'));
                        const firstText = items[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '';
                        const signature = `${items.length}:${firstText}`;
                        return items.length > 0 && signature !== prevSignature;
                    }, { timeout: 15000 }, offersSignatureBefore).catch(() => {});
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const tabContent = await page.evaluate(() => {
                    const articleEl = document.querySelector('article');
                    if (articleEl && articleEl.innerHTML.trim().length > 50) {
                        return articleEl.innerHTML;
                    }
                    const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                         document.querySelector('.tab-content.active') ||
                                         document.querySelector('.tab-panel.active');
                    if (activeContent && activeContent.innerHTML.trim().length > 50) {
                        return activeContent.innerHTML;
                    }
                    return '';
                });
                
                if (tabContent && tabContent.trim().length > 50) {
                    tabsData[textCombinationKey] = tabContent;
                    console.log(`         ✓ HTML контент извлечен: ${(tabContent.length / 1024).toFixed(1)} KB`);
                }
                
                if (isOffersPage) {
                    const offersLinks = await page.evaluate(() => {
                        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                        return Array.from(document.querySelectorAll('.files-list a.file-item, a.file-item')).map(el => {
                            const nameEl = el.querySelector('.file-name, [class*="file-name"]');
                            const sizeEl = el.querySelector('.file-size, [class*="file-size"]');
                            const text = normalize(nameEl ? nameEl.textContent : el.textContent);
                            const href = el.getAttribute('href') || '';
                            const fileType = normalize(sizeEl ? sizeEl.textContent : '') || (href.match(/\.([^.]+)(\?|$)/i)?.[1]?.toLowerCase() || 'unknown');
                            return { text, href, fileType };
                        }).filter(item => item.text && item.href);
                    });
                    if (offersLinks.length > 0) {
                        const fileLinksObj = {};
                        offersLinks.forEach(item => {
                            let href = item.href;
                            if (href.startsWith('/')) {
                                href = `https://business.mgts.ru${href}`;
                            } else if (!href.startsWith('http')) {
                                href = `https://business.mgts.ru/${href}`;
                            }
                            fileLinksObj[item.text] = {
                                href,
                                fileType: item.fileType || 'unknown',
                                title: ''
                            };
                        });
                        tabsFileLinksByTab[textCombinationKey] = fileLinksObj;
                        console.log(`         ✓ Найдено файлов: ${Object.keys(fileLinksObj).length}`);
                    }
                } else {
                    const fileLinksObj = await extractFileLinks(page, outputDir, slug, null, 'article, [role="tabpanel"], .tab-content.active');
                    if (fileLinksObj && Object.keys(fileLinksObj).length > 0) {
                        tabsFileLinksByTab[textCombinationKey] = fileLinksObj;
                        console.log(`         ✓ Найдено файлов: ${Object.keys(fileLinksObj).length}`);
                    }
                }
            }
            continue;
        }
        
        let firstActiveProcessed = false;
        
        // Проходим по табам второго уровня
        for (const level2Info of level2TabsInfo) {
            if (totalClicks >= MAX_TOTAL_CLICKS) {
                console.log(`      ⚠️  Достигнут лимит кликов, прекращаем`);
                break;
            }
            
            const level2Text = level2Info.text;
            const combinationKey = `${level1Index}:${level2Info.index}`;
            const textCombinationKey = `${level1Text} > ${level2Text}`;
            
            if (processedCombinations.has(combinationKey) || processedCombinations.has(textCombinationKey)) {
                console.log(`      🔹 Подтаб "${level2Text}" - уже обработан, пропускаем`);
                continue;
            }
            
            processedCombinations.add(combinationKey);
            processedCombinations.add(textCombinationKey);
            
            // Если это активный подтаб и мы еще не обработали активный
            if (level2Info.isActive && !firstActiveProcessed) {
                console.log(`      🔹 Подтаб "${level2Text}" (активен, извлекаем данные без клика)`);
                firstActiveProcessed = true;
                
                // Ждем стабилизации
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Извлекаем HTML контент СРАЗУ
                const tabContent = await page.evaluate(() => {
                    const articleEl = document.querySelector('article');
                    if (articleEl && articleEl.innerHTML.trim().length > 50) {
                        return articleEl.innerHTML;
                    }
                    const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                         document.querySelector('.tab-content.active') ||
                                         document.querySelector('.tab-panel.active');
                    if (activeContent && activeContent.innerHTML.trim().length > 50) {
                        return activeContent.innerHTML;
                    }
                    return '';
                });
                
                if (tabContent && tabContent.trim().length > 50) {
                    tabsData[textCombinationKey] = tabContent;
                    console.log(`         ✓ HTML контент извлечен: ${(tabContent.length / 1024).toFixed(1)} KB`);
                }
                
                // Извлекаем файлы СРАЗУ
                const fileLinksObj = await extractFileLinks(page, outputDir, slug, null, 'article, [role="tabpanel"], .tab-content.active');
                if (fileLinksObj && Object.keys(fileLinksObj).length > 0) {
                    tabsFileLinksByTab[textCombinationKey] = fileLinksObj;
                    console.log(`         ✓ Найдено файлов: ${Object.keys(fileLinksObj).length}`);
                }
                
            } else if (!level2Info.isActive) {
                // Если подтаб не активен, кликаем на него
                console.log(`      🔹 Подтаб "${level2Text}" (не активен, кликаем)`);
                
                // Проверяем URL до клика
                const urlBefore = page.url();
                
                await page.evaluate((level2Index) => {
                    const currentLevel2Tabs = Array.from(document.querySelectorAll(
                        '[role="tab"]:not([class*="tab-button"]), .tab-stroke-item, [class*="tab-stroke"], [class*="tab-item"]:not([class*="tab-button"])'
                    )).filter(tab => {
                        // ВАЖНО: Исключаем элементы, которые являются ссылками на другие страницы
                        const href = tab.getAttribute('href');
                        if (href && href.trim() && !href.startsWith('#') && !href.startsWith('javascript:')) {
                            return false; // Это ссылка на другую страницу, не таб
                        }
                        // Исключаем элементы <a> с href, которые ведут на другие страницы
                        if (tab.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                            return false; // Это ссылка на другую страницу, не таб
                        }
                        
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
                        const tab = uniqueLevel2Tabs[level2Index];
                        
                        // ВАЖНО: Проверяем, что это не ссылка на другую страницу
                        const href = tab.getAttribute('href');
                        if (href && href.trim() && !href.startsWith('#') && !href.startsWith('javascript:')) {
                            // Это ссылка на другую страницу - не кликаем
                            console.warn(`[Browser] Пропускаем клик по подтабу "${tab.textContent?.trim()}" - это ссылка на другую страницу: ${href}`);
                            return;
                        }
                        
                        // Проверяем, что элемент не является ссылкой <a> с href
                        if (tab.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                            console.warn(`[Browser] Пропускаем клик по подтабу "${tab.textContent?.trim()}" - это ссылка <a> на другую страницу: ${href}`);
                            return;
                        }
                        
                        tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                        tab.click();
                    }
                }, level2Info.index);
                
                // Проверяем, не произошел ли переход на другую страницу
                await new Promise(resolve => setTimeout(resolve, 500));
                const urlAfter = page.url();
                if (urlAfter !== urlBefore && !urlAfter.includes(urlBefore.split('?')[0])) {
                    console.warn(`      ⚠️  Обнаружен переход на другую страницу: ${urlBefore} -> ${urlAfter}`);
                    console.warn(`      🔄 Возвращаемся на исходную страницу...`);
                    await page.goto(urlBefore, { waitUntil: 'networkidle2', timeout: 30000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue; // Пропускаем этот подтаб
                }
                
                console.log(`         🖱️  Клик выполнен`);
                totalClicks++;
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Ждем появления контента
                await new Promise(resolve => setTimeout(resolve, 400));
                
                // Извлекаем HTML контент СРАЗУ после клика
                const tabContent = await page.evaluate(() => {
                    const articleEl = document.querySelector('article');
                    if (articleEl && articleEl.innerHTML.trim().length > 50) {
                        return articleEl.innerHTML;
                    }
                    const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                         document.querySelector('.tab-content.active') ||
                                         document.querySelector('.tab-panel.active');
                    if (activeContent && activeContent.innerHTML.trim().length > 50) {
                        return activeContent.innerHTML;
                    }
                    return '';
                });
                
                if (tabContent && tabContent.trim().length > 50) {
                    tabsData[textCombinationKey] = tabContent;
                    console.log(`         ✓ HTML контент извлечен: ${(tabContent.length / 1024).toFixed(1)} KB`);
                }
                
                // Извлекаем файлы СРАЗУ после клика
                const fileLinks = await extractFileLinks(page, outputDir, slug, null, 'article, [role="tabpanel"], .tab-content.active');
                if (fileLinks && Object.keys(fileLinks).length > 0) {
                    tabsFileLinksByTab[textCombinationKey] = fileLinks;
                    console.log(`         ✓ Найдено файлов: ${Object.keys(fileLinks).length}`);
                }
            } else {
                console.log(`      🔹 Подтаб "${level2Text}" (активен, но уже обработан, пропускаем)`);
            }
        }
    }
    
    // Формируем результат в том же формате, что и старая функция
    const cleanedTabsContent = {};
    Object.keys(tabsData).forEach(key => {
        if (key.length <= 100 && !key.includes('[ERROR]')) {
            cleanedTabsContent[key] = removeSvgFromHtml(tabsData[key]);
        }
    });
    
    const result = {
        tabsContentJSON: Object.keys(cleanedTabsContent).length > 0 ? {
            tabsContent: cleanedTabsContent,
            allHiddenContent: {}
        } : null,
        extractedFileLinks: {},
        tabsFileLinksByTab: tabsFileLinksByTab,
        totalClicks: totalClicks,
        uniqueCombinations: Object.keys(cleanedTabsContent).length
    };
    
    console.log(`   📊 Статистика: кликов=${totalClicks}, комбинаций=${result.uniqueCombinations}`);
    
    return result;
}

/**
 * Специальная обработка страницы news:
 * - ждем первичной загрузки
 * - скроллим до конца для подгрузки
 * - переключаем фильтр по годам и собираем контент
 */
async function prepareNewsPage(page, writeDebugLog) {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const getNewsCount = async () => {
        return page.evaluate(() => {
            const selectors = [
                '[class*="news"] [class*="card"]',
                '[class*="news"] [class*="item"]',
                '[class*="news-item"]',
                '[class*="news__item"]',
                '[class*="news-card"]',
                'article'
            ];
            let maxCount = 0;
            selectors.forEach(sel => {
                const count = document.querySelectorAll(sel).length;
                if (count > maxCount) maxCount = count;
            });
            return maxCount;
        });
    };

    const getNewsSnapshot = async () => {
        return page.evaluate(() => {
            const items = Array.from(document.querySelectorAll(
                '.news-row-item, [class*="news-row-item"], [class*="news-item"], [class*="news__item"], article'
            ));
            const first = items[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '';
            return { count: items.length, first };
        });
    };

    const extractNewsItems = async () => {
        return page.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const anchors = Array.from(document.querySelectorAll('a.news-row-item, a[class*="news-row-item"], a[class*="news-item"], a[class*="news__item"]'));
            const rawItems = anchors.map(anchor => {
                const href = anchor.getAttribute('href') || '';
                const text = normalize(anchor.textContent);
                const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
                const date = dateMatch ? dateMatch[1] : '';
                const title = text.replace(date, '').trim();
                return { date, title, href, raw: text };
            }).filter(item => item.href);
            // Дедуп по href
            const seen = new Set();
            return rawItems.filter(item => {
                if (seen.has(item.href)) return false;
                seen.add(item.href);
                return true;
            });
        });
    };

    const extractNewsDetail = async (url) => {
        const detailPage = await page.browser().newPage();
        try {
            await detailPage.goto(url, { waitUntil: 'domcontentloaded' });
            await new Promise(resolve => setTimeout(resolve, 800));
            return await detailPage.evaluate(() => {
                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                const title = normalize(document.querySelector('h1')?.textContent || '');
                const date = normalize(document.querySelector('time')?.textContent || '');
                const container =
                    document.querySelector('article') ||
                    document.querySelector('[class*="news"]') ||
                    document.querySelector('main') ||
                    document.body;
                return {
                    title,
                    date,
                    html: container ? container.innerHTML : '',
                    text: normalize(container ? container.innerText : '')
                };
            });
        } catch (error) {
            return null;
        } finally {
            await detailPage.close();
        }
    };

    const enrichNewsItemsWithDetails = async (items, year, baseUrl) => {
        if (year !== '2025') return items;
        const enriched = [];
        for (const item of items) {
            const targetUrl = new URL(item.href, baseUrl).toString();
            const detail = await extractNewsDetail(targetUrl);
            if (!detail) {
                writeDebugLog(`NEWS: detail failed for ${item.href}`);
                enriched.push(item);
                continue;
            }
            enriched.push({ ...item, detail });
        }
        return enriched;
    };

    const waitForNewsItems = async () => {
        try {
            await page.waitForFunction(() => {
                const selectors = [
                    '[class*="news"] [class*="card"]',
                    '[class*="news"] [class*="item"]',
                    '[class*="news-item"]',
                    '[class*="news__item"]',
                    '[class*="news-card"]',
                    'article'
                ];
                return selectors.some(sel => document.querySelectorAll(sel).length > 0);
            }, { timeout: 60000 });
        } catch (error) {
            // Если не дождались, продолжаем, но логируем
        }
    };

    const scrollToLoadAll = async () => {
        let stableRounds = 0;
        let previousCount = await getNewsCount();
        for (let i = 0; i < 20; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(resolve => setTimeout(resolve, 1500));
            const currentCount = await getNewsCount();
            if (currentCount <= previousCount) {
                stableRounds++;
            } else {
                stableRounds = 0;
            }
            previousCount = currentCount;
            if (stableRounds >= 2) {
                break;
            }
        }
        // Пробуем проскроллить внутренний контейнер списка новостей, если он есть
        try {
            await page.evaluate(() => {
                const container =
                    document.querySelector('.news-list-column') ||
                    document.querySelector('[class*="news-list"]') ||
                    document.querySelector('[class*="news"] [class*="list"]');
                if (container && container.scrollHeight > container.clientHeight) {
                    container.scrollTo(0, container.scrollHeight);
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            // Игнорируем
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        return previousCount;
    };

    const openYearDropdown = async () => {
        await page.evaluate(() => {
            const trigger =
                document.querySelector('.header-select-wrapper .input-item.input-item--select') ||
                document.querySelector('.input-item.input-item--select.disable-selection.input-gray') ||
                document.querySelector('.header-select-wrapper .input-item--select .select-item-text') ||
                document.querySelector('.header-select-wrapper .input-item--select') ||
                document.querySelector('.header-select-wrapper .input-box') ||
                document.querySelector('.header-select-wrapper') ||
                document.querySelector('[class*="select"]');
            if (trigger) {
                try {
                    trigger.scrollIntoView({ block: 'center', inline: 'center' });
                } catch (error) {
                    // ignore
                }
                trigger.click();
            }
        });
        await new Promise(resolve => setTimeout(resolve, 300));
        await waitForYearOptionsVisible();
    };

    const getYearOptions = async () => {
        return page.evaluate(() => {
            const yearRegex = /^(19|20)\d{2}$/;
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const candidates = Array.from(document.querySelectorAll('div, li, button, span, a, option'));
            const years = new Set();
            candidates.forEach(el => {
                const text = (el.textContent || '').trim();
                if (yearRegex.test(text) && isVisible(el)) {
                    years.add(text);
                }
            });
            return Array.from(years).sort((a, b) => Number(b) - Number(a));
        });
    };

    const selectYear = async (year) => {
        return page.evaluate((yearValue) => {
            const yearStr = String(yearValue);
            const select = Array.from(document.querySelectorAll('select')).find(sel =>
                Array.from(sel.options || []).some(opt => (opt.textContent || '').trim() === yearStr)
            );
            if (select) {
                const option = Array.from(select.options).find(opt => (opt.textContent || '').trim() === yearStr);
                if (option) {
                    select.value = option.value;
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return { ok: true, method: 'select' };
                }
            }
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const listContainers = Array.from(document.querySelectorAll('.select-list, .input-list, [class*="select-list"], [class*="input-list"]'))
                .filter(el => isVisible(el));
            const scope = listContainers.length > 0 ? listContainers[0] : document;
            const candidates = Array.from(scope.querySelectorAll('div, li, button, span, a, [role="button"], [class*="year"], [class*="filter"], [class*="select-list-item"]'))
                .filter(el => isVisible(el));
            const explicitItem = candidates.find(el =>
                el.classList?.contains('select-list-item') &&
                el.classList?.contains('disable-selection') &&
                (el.textContent || '').trim() === yearStr
            );
            const clickable = explicitItem || candidates.find(el => (el.textContent || '').trim() === yearStr);
            if (clickable) {
                const href = clickable.getAttribute?.('href') || '';
                if (clickable.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    return { ok: false, method: 'link' };
                }
                try {
                    if (scope && scope !== document && scope.scrollHeight > scope.clientHeight) {
                        const top = clickable.offsetTop - Math.round(scope.clientHeight / 2);
                        scope.scrollTop = Math.max(0, top);
                    }
                    clickable.scrollIntoView({ block: 'center', inline: 'center' });
                } catch (error) {
                    // ignore
                }
                const fire = (type) => clickable.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
                fire('mouseover');
                fire('mousedown');
                fire('mouseup');
                fire('click');
                return { ok: true, method: 'click' };
            }
            const input = document.querySelector('.header-select-wrapper input') || document.querySelector('[class*="select"] input');
            if (input) {
                input.value = yearStr;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return { ok: true, method: 'input' };
            }
            return { ok: false, method: 'none' };
        }, year);
    };

    const getSelectedYear = async () => {
        return page.evaluate(() => {
            const text = document.querySelector('.select-item-text')?.textContent?.trim() || '';
            const inputValue = document.querySelector('.header-select-wrapper input')?.value || '';
            const selectValue = document.querySelector('.header-select-wrapper select')?.value || '';
            const combined = [text, inputValue, selectValue].join(' ');
            const match = combined.match(/(19|20)\d{2}/);
            return match ? match[0] : '';
        });
    };

    const waitForYearOptionsVisible = async () => {
        for (let i = 0; i < 10; i++) {
            const visible = await page.evaluate(() => {
                const yearRegex = /^(19|20)\d{2}$/;
                const isVisible = (el) =>
                    el && el.offsetParent !== null &&
                    window.getComputedStyle(el).visibility !== 'hidden' &&
                    window.getComputedStyle(el).display !== 'none';
                const listContainer =
                    document.querySelector('.select-list') ||
                    document.querySelector('.input-list') ||
                    document.querySelector('[class*="select-list"]') ||
                    document.querySelector('[class*="input-list"]');
                const scope = listContainer || document;
                const candidates = Array.from(scope.querySelectorAll('div, li, button, span, a, [class*="select-list-item"]'))
                    .filter(el => isVisible(el));
                return candidates.some(el => yearRegex.test((el.textContent || '').trim()));
            });
            if (visible) return true;
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        return false;
    };

    const getTopItemYear = async () => {
        return page.evaluate(() => {
            const firstItem =
                document.querySelector('a.news-row-item, a[class*="news-row-item"], a[class*="news-item"], a[class*="news__item"]') ||
                document.querySelector('.news-row-item, [class*="news-row-item"], [class*="news-item"], [class*="news__item"]');
            if (!firstItem) return '';
            const text = (firstItem.textContent || '').trim();
            const match = text.match(/(\d{2}\.\d{2}\.(\d{4}))/);
            return match ? match[2] : '';
        });
    };

    const waitForYearApplied = async (targetYear, beforeSnapshot) => {
        for (let i = 0; i < 16; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const selectedYear = await getSelectedYear();
            const topYear = await getTopItemYear();
            const after = await getNewsSnapshot();
            if (selectedYear === targetYear || topYear === targetYear) {
                return true;
            }
            if (after.count !== beforeSnapshot.count || (after.first && after.first !== beforeSnapshot.first)) {
                // Список обновился, даем ему дорендериться
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
        return false;
    };

    await waitForNewsItems();
    const initialCount = await getNewsCount();
    writeDebugLog(`NEWS: initial items count=${initialCount}`);

    // Пробуем собрать доступные годы
    await openYearDropdown();
    let years = await getYearOptions();
    if (years.length === 0) {
        // Если список не отрендерился, пробуем открыть еще раз
        await openYearDropdown();
        years = await getYearOptions();
    }
    // Ограничиваем годы (2025-2020)
    years = years.filter(year => ['2025', '2024', '2023', '2022', '2021', '2020'].includes(year));

    const collected = [];
    const yearsData = [];
    if (years.length > 0) {
        writeDebugLog(`NEWS: найдено лет для фильтра: ${years.join(', ')}`);
        const baseUrl = page.url().split('?')[0];
        for (const year of years) {
            const before = await getNewsSnapshot();
            await page.evaluate(() => window.scrollTo(0, 0));
            if (year !== '2025') {
                const targetUrl = `${baseUrl}?year=${encodeURIComponent(year)}`;
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
            }
            const applied = await waitForYearApplied(year, before);
            if (!applied) {
                const selectedYear = await getSelectedYear();
                const topYear = await getTopItemYear();
                writeDebugLog(`NEWS: год не применился (ожидали ${year}, видим select=${selectedYear || 'empty'}, top=${topYear || 'empty'})`);
                continue;
            }
            await waitForNewsItems();
            await new Promise(resolve => setTimeout(resolve, 600));
            const loadedCount = await scrollToLoadAll();
            writeDebugLog(`NEWS: year=${year}, items=${loadedCount}, method=${year === '2025' ? 'default' : 'query'}`);
            const items = await extractNewsItems();
            const itemsWithDetails = await enrichNewsItemsWithDetails(items, year, baseUrl);
            const yearContent = await page.evaluate(() => {
                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                const container =
                    document.querySelector('[class*="news"]') ||
                    document.querySelector('main') ||
                    document.body;
                return {
                    html: container ? container.innerHTML : '',
                    text: normalize(container ? container.innerText : '')
                };
            });
            if (yearContent.html) {
                collected.push({ year, html: yearContent.html, text: yearContent.text });
                yearsData.push({ year, items: itemsWithDetails });
            }
        }
    } else {
        writeDebugLog('NEWS: фильтр лет не найден, загружаем все через скролл');
        const loadedCount = await scrollToLoadAll();
        writeDebugLog(`NEWS: loaded items after scroll=${loadedCount}`);
        const items = await extractNewsItems();
        const content = await page.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const container =
                document.querySelector('[class*="news"]') ||
                document.querySelector('main') ||
                document.body;
            return {
                html: container ? container.innerHTML : '',
                text: normalize(container ? container.innerText : '')
            };
        });
        if (content.html) {
            collected.push({ year: 'all', html: content.html, text: content.text });
            yearsData.push({ year: 'all', items });
        }
    }

    if (collected.length === 0) {
        return null;
    }

    const combinedHtml = collected
        .map(item => `<!-- NEWS_YEAR:${item.year} -->\n${item.html}`)
        .join('\n');
    const combinedText = collected
        .map(item => `NEWS_YEAR:${item.year}\n${item.text}`)
        .join('\n');
    return { combinedHtml, combinedText, yearsData, useStructuredOnly: true };
}

/**
 * Старая версия extractPageContent (оставляем для совместимости)
 */
async function extractPageContent(page) {
    // Пытаемся кликнуть по всем табам и извлечь контент каждого таба
    let tabsContent = {};
    try {
        console.log(`   🔍 Поиск табов на странице...`);
        tabsContent = await page.evaluate(async () => {
            const tabsData = {};
            
            // Находим все табы
            const tabSelectors = [
                '[role="tab"]',
                '[data-tab]',
                '.tab-button',
                '.tab-item',
                '[class*="tab"]',
                '[id*="tab"]',
                'button[aria-controls]',
                'a[aria-controls]'
            ];
            
            let allTabs = [];
            tabSelectors.forEach(selector => {
                try {
                    const tabs = Array.from(document.querySelectorAll(selector));
                    // Фильтруем стрелки прокрутки и навигационные элементы
                    const filteredTabs = tabs.filter(tab => {
                        // Исключаем стрелки прокрутки
                        const isScrollArrow = tab.classList?.contains('scroll-arrow') ||
                                             tab.classList?.contains('arrow') ||
                                             tab.classList?.contains('nav-arrow') ||
                                             tab.classList?.contains('scroll-button') ||
                                             tab.classList?.contains('tab-scroll') ||
                                             tab.getAttribute('aria-label')?.toLowerCase().includes('scroll') ||
                                             tab.getAttribute('aria-label')?.toLowerCase().includes('arrow') ||
                                             tab.querySelector('svg[class*="arrow"]') !== null ||
                                             tab.querySelector('[class*="arrow"]') !== null ||
                                             // Проверяем, не является ли это кнопкой прокрутки контейнера табов
                                             (tab.closest('[class*="scroll"]') && tab.textContent?.trim().length === 0);
                        return !isScrollArrow;
                    });
                    allTabs = allTabs.concat(filteredTabs);
                } catch (e) {
                    // Игнорируем ошибки
                }
            });
            
            const uniqueTabs = Array.from(new Set(allTabs));
            
            // Определяем иерархию табов: группируем табы по уровням
            // Табы первого уровня обычно находятся в одном контейнере, табы второго уровня - в другом
            const tabsByLevel = { level1: [], level2: [] };
            
            // Функция для определения глубины элемента в DOM
            function getElementDepth(element) {
                let depth = 0;
                let current = element;
                while (current && current !== document.body) {
                    depth++;
                    current = current.parentElement;
                }
                return depth;
            }
            
            // Проверяем, есть ли на странице табы с классами tab-button-item и tab-stroke-item
            // Это указывает на специфичную структуру с четким разделением уровней
            const hasTabButtonItems = uniqueTabs.some(tab => tab.className && tab.className.includes('tab-button-item'));
            const hasTabStrokeItems = uniqueTabs.some(tab => tab.className && tab.className.includes('tab-stroke-item'));
            const useClassBasedDetection = hasTabButtonItems && hasTabStrokeItems;
            
            // Пытаемся определить уровень таба по его позиции в DOM и родительским контейнерам
            uniqueTabs.forEach(tab => {
                const parent = tab.closest('[class*="tab"], [role="tablist"], [class*="tabs"]');
                const parentClasses = parent ? parent.className : '';
                const tabClasses = tab.className || '';
                
                let isFirstLevel = false;
                
                if (useClassBasedDetection) {
                    // Специальная обработка для страниц с классами tab-button-item и tab-stroke-item
                    // Табы первого уровня имеют класс "tab-button-item"
                    // Табы второго уровня имеют класс "tab-stroke-item"
                    const isFirstLevelByClass = tabClasses.includes('tab-button-item');
                    const isSecondLevelByClass = tabClasses.includes('tab-stroke-item') || 
                                                tabClasses.includes('tab-stroke') ||
                                                parentClasses.includes('tabs-stroke') ||
                                                parentClasses.includes('tabs-stroke-container');
                    
                    if (isFirstLevelByClass) {
                        isFirstLevel = true;
                    } else if (isSecondLevelByClass) {
                        isFirstLevel = false;
                    } else {
                        // Если классы не помогли, используем общую логику
                        const depth = getElementDepth(tab);
                        isFirstLevel = depth < 10 || 
                                      parentClasses.includes('tab-button') ||
                                      (tab.getAttribute('aria-controls') && !tab.closest('[class*="tab-content"]')) ||
                                      (parent && (parent.classList.contains('tabs-header') || 
                                                  parent.classList.contains('tabs-nav') ||
                                                  (parent.getAttribute('role') === 'tablist' && !parentClasses.includes('stroke'))));
                    }
                } else {
                    // Общая логика для страниц без специфичных классов
                    const depth = getElementDepth(tab);
                    
                    // Проверяем различные признаки табов первого уровня
                    isFirstLevel = depth < 12 || 
                                  parentClasses.includes('tab-button') ||
                                  tabClasses.includes('tab-button-item') ||
                                  (tab.getAttribute('aria-controls') && !tab.closest('[class*="tab-content"]')) ||
                                  // Если таб находится в контейнере с классом, указывающим на первый уровень
                                  (parent && (parent.classList.contains('tabs-header') || 
                                              parent.classList.contains('tabs-nav') ||
                                              parent.getAttribute('role') === 'tablist'));
                }
                
                if (isFirstLevel) {
                    tabsByLevel.level1.push(tab);
                } else {
                    tabsByLevel.level2.push(tab);
                }
            });
            
            // Удаляем дубликаты из табов первого уровня (по элементу)
            const uniqueLevel1Tabs = [];
            const seenLevel1Elements = new Set();
            tabsByLevel.level1.forEach(tab => {
                if (!seenLevel1Elements.has(tab)) {
                    seenLevel1Elements.add(tab);
                    uniqueLevel1Tabs.push(tab);
                }
            });
            tabsByLevel.level1 = uniqueLevel1Tabs;
            
            // Удаляем дубликаты из табов второго уровня (по элементу)
            const uniqueLevel2Tabs = [];
            const seenLevel2Elements = new Set();
            tabsByLevel.level2.forEach(tab => {
                if (!seenLevel2Elements.has(tab)) {
                    seenLevel2Elements.add(tab);
                    uniqueLevel2Tabs.push(tab);
                }
            });
            tabsByLevel.level2 = uniqueLevel2Tabs;
            
            // Если не удалось определить уровни автоматически, используем порядок появления в DOM
            if (tabsByLevel.level1.length === 0 && tabsByLevel.level2.length === 0) {
                // Разделяем табы пополам: первые - первый уровень, остальные - второй
                const midPoint = Math.ceil(uniqueTabs.length / 2);
                tabsByLevel.level1 = uniqueTabs.slice(0, midPoint);
                tabsByLevel.level2 = uniqueTabs.slice(midPoint);
            }
            
            // Находим контейнеры с контентом табов
            // Важно: ищем контейнеры, которые могут содержать контент табов
            const tabContentSelectors = [
                '[role="tabpanel"]',
                '[data-tab-content]',
                '.tab-content',
                '.tab-panel',
                '[class*="tab-content"]',
                '[class*="tab-panel"]',
                '[id*="tab-content"]',
                '[id*="tabpanel"]',
                '[class*="document-tabs"]',
                '[class*="tabs-content"]',
                '[class*="tab__content"]',
                '[class*="tab-content-wrapper"]',
                '[class*="files-table"]', // Контейнеры с файлами
                '[class*="file-list"]', // Списки файлов
                '[class*="document-list"]', // Списки документов
                'div[class*="tab"]:not([class*="button"]):not([class*="item"])', // div с tab в классе, но не кнопки
                'section[class*="tab"]',
                '[aria-hidden]', // Все элементы с aria-hidden (включая скрытые табы)
                '[style*="display"]' // Элементы со стилями display
            ];
            
            // Также ищем контейнеры, которые могут быть связаны с табами через data-атрибуты
            const tabRelatedSelectors = [
                '[data-tab-id]',
                '[data-tab-name]',
                '[data-panel]',
                '[id*="panel"]',
                '[id*="content"]'
            ];
            
            // Собираем все возможные контейнеры контента (включая скрытые)
            const allContentContainers = [];
            tabContentSelectors.forEach(selector => {
                try {
                    const containers = Array.from(document.querySelectorAll(selector));
                    allContentContainers.push(...containers);
                } catch (e) {}
            });
            
            // Добавляем контейнеры, связанные с табами
            tabRelatedSelectors.forEach(selector => {
                try {
                    const containers = Array.from(document.querySelectorAll(selector));
                    allContentContainers.push(...containers);
                } catch (e) {}
            });
            
            // Убираем дубликаты
            const uniqueContainers = Array.from(new Set(allContentContainers));
            
            // Сначала извлекаем ВСЕ контейнеры контента (включая скрытые) и связываем их с табами
            const tabContentMap = new Map();
            const containerToTabMap = new Map(); // Карта для связи контейнеров с табами по индексу
            
            // Создаем карту табов по их позиции/индексу
            // Функция для извлечения только прямого текста элемента (без дочерних элементов)
            const getDirectText = (element) => {
                if (!element) return '';
                // Получаем все текстовые узлы напрямую в элементе (не в дочерних)
                let text = '';
                for (let node of element.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        text += node.textContent;
                    }
                }
                return text.trim();
            };
            
            const tabsByIndex = Array.from(uniqueTabs).map((tab, index) => {
                // Пробуем сначала получить прямой текст, затем aria-label, затем title
                let text = getDirectText(tab);
                if (!text || text.length === 0) {
                    text = tab.getAttribute('aria-label') || tab.getAttribute('title') || '';
                }
                // Если все еще нет текста, используем innerText (но ограничиваем длину)
                if (!text || text.length === 0) {
                    text = tab.innerText?.trim() || tab.textContent?.trim() || '';
                    // Если текст слишком длинный (слипшиеся табы), берем только первые 50 символов
                    if (text.length > 100) {
                        text = text.substring(0, 50) + '...';
                    }
                }
                return {
                    tab: tab,
                    index: index,
                    text: text || `Tab ${index + 1}`
                };
            });
            
            uniqueContainers.forEach((container, containerIndex) => {
                const content = container.innerHTML;
                if (!content || !content.trim()) return;
                
                // Пробуем найти связанный таб
                const containerId = container.id;
                const ariaLabelledBy = container.getAttribute('aria-labelledby');
                const dataTab = container.getAttribute('data-tab');
                const ariaControls = container.getAttribute('aria-controls');
                
                let relatedTab = null;
                let tabLabel = null;
                
                // Ищем таб по aria-controls (обратная связь)
                if (containerId) {
                    relatedTab = document.querySelector(`[aria-controls="${containerId}"]`) ||
                                document.querySelector(`[data-tab="${containerId}"]`);
                }
                
                // Ищем таб по aria-labelledby
                if (ariaLabelledBy && !relatedTab) {
                    relatedTab = document.getElementById(ariaLabelledBy);
                }
                
                // Ищем таб по data-tab
                if (dataTab && !relatedTab) {
                    relatedTab = document.querySelector(`[data-tab="${dataTab}"]`) ||
                                document.querySelector(`[id="${dataTab}"]`);
                }
                
                // Пробуем найти таб по индексу (если контейнеры идут в том же порядке, что и табы)
                if (!relatedTab && containerIndex < tabsByIndex.length) {
                    relatedTab = tabsByIndex[containerIndex].tab;
                }
                
                // Определяем метку таба
                if (relatedTab) {
                    let rawLabel = relatedTab.textContent?.trim() || 
                                  relatedTab.getAttribute('aria-label') || 
                                  relatedTab.getAttribute('title') ||
                                  relatedTab.id;
                    // Проверяем, что метка не содержит несколько названий табов (слипшихся вместе)
                    // Если метка слишком длинная или содержит известные названия табов без разделителей, используем aria-label или title
                    if (rawLabel && rawLabel.length > 100) {
                        // Пробуем использовать aria-label или title, если они короче
                        const ariaLabel = relatedTab.getAttribute('aria-label');
                        const title = relatedTab.getAttribute('title');
                        if (ariaLabel && ariaLabel.length < 100) {
                            rawLabel = ariaLabel;
                        } else if (title && title.length < 100) {
                            rawLabel = title;
                        } else if (containerIndex < tabsByIndex.length) {
                            // Используем таб по индексу
                            rawLabel = tabsByIndex[containerIndex].text;
                        }
                    }
                    tabLabel = rawLabel;
                } else {
                    // Если таб не найден, пробуем найти по индексу
                    if (containerIndex < tabsByIndex.length) {
                        tabLabel = tabsByIndex[containerIndex].text;
                    } else {
                        // Используем атрибуты контейнера
                        tabLabel = container.getAttribute('aria-label') ||
                                  container.id ||
                                  dataTab ||
                                  `tab-${containerIndex}`;
                    }
                }
                
                if (tabLabel && content) {
                    tabContentMap.set(tabLabel, content);
                    containerToTabMap.set(container, tabLabel);
                }
            });
            
            // Сначала извлекаем ВСЕ скрытые контейнеры контента ДО кликов
            // Это важно, так как после кликов контент может перезаписаться
            allContentContainers.forEach((container, index) => {
                const content = container.innerHTML;
                if (!content || !content.trim()) return;
                
                // Пробуем найти связанный таб
                const containerId = container.id;
                const ariaLabelledBy = container.getAttribute('aria-labelledby');
                const dataTab = container.getAttribute('data-tab');
                const ariaControls = container.getAttribute('aria-controls');
                
                let relatedTab = null;
                let tabLabel = null;
                
                // Ищем таб по aria-controls
                if (containerId) {
                    relatedTab = document.querySelector(`[aria-controls="${containerId}"]`) ||
                                document.querySelector(`[data-tab="${containerId}"]`);
                }
                
                // Ищем таб по aria-labelledby
                if (ariaLabelledBy && !relatedTab) {
                    relatedTab = document.getElementById(ariaLabelledBy);
                }
                
                // Ищем таб по data-tab
                if (dataTab && !relatedTab) {
                    relatedTab = document.querySelector(`[data-tab="${dataTab}"]`) ||
                                document.querySelector(`[id="${dataTab}"]`);
                }
                
                // Определяем метку таба
                if (relatedTab) {
                    let rawLabel = relatedTab.textContent?.trim() || 
                                  relatedTab.getAttribute('aria-label') || 
                                  relatedTab.getAttribute('title') ||
                                  relatedTab.id;
                    // Проверяем, что метка не содержит несколько названий табов (слипшихся вместе)
                    // Если метка слишком длинная или содержит известные названия табов без разделителей, используем aria-label или title
                    if (rawLabel && rawLabel.length > 100) {
                        // Пробуем использовать aria-label или title, если они короче
                        const ariaLabel = relatedTab.getAttribute('aria-label');
                        const title = relatedTab.getAttribute('title');
                        if (ariaLabel && ariaLabel.length < 100) {
                            rawLabel = ariaLabel;
                        } else if (title && title.length < 100) {
                            rawLabel = title;
                        } else if (index < tabsByIndex.length) {
                            // Используем таб по индексу
                            rawLabel = tabsByIndex[index].text;
                        }
                    }
                    tabLabel = rawLabel;
                } else if (index < tabsByIndex.length) {
                    // Используем таб по индексу
                    tabLabel = tabsByIndex[index].text;
                } else {
                    tabLabel = container.getAttribute('aria-label') ||
                              container.id ||
                              dataTab ||
                              `tab-content-${index}`;
                }
                
                // Сохраняем контент ДО кликов только если его еще нет
                // Это начальное состояние, которое может быть неполным
                if (tabLabel && content && content.trim().length > 50) {
                    // Не сохраняем технические ключи типа "tab-content-0"
                    if (!tabLabel.startsWith('tab-content-') && !tabLabel.includes('Положения о Комитетах Совета директоров ПАО МГТССвидетельства')) {
                        // Не сохраняем, если уже есть более полный контент
                        // или если это просто кнопки табов (не контент)
                        if (!tabsData[tabLabel] || content.length > tabsData[tabLabel].length) {
                            // Проверяем, что это не просто кнопки табов
                            if (!content.includes('tab-button-item') || content.length > 500) {
                                tabsData[tabLabel] = content;
                            }
                        }
                    }
                }
            });
            
            // Теперь кликаем по табам в правильном порядке: сначала все подтабы первого таба, потом все подтабы второго таба
            // Проходим по табам первого уровня, и для каждого проходим все его подтабы
            // Защита от зацикливания: отслеживаем обработанные комбинации табов
            const processedTabCombinations = new Set();
            let totalClicks = 0;
            const MAX_TOTAL_CLICKS = 50; // Максимальное количество кликов для предотвращения зацикливания
            
            // Массив для сбора логов (будет возвращен и выведен в Node.js контексте)
            const actionLogs = [];
            const log = (message) => {
                actionLogs.push(message);
                // Также выводим в консоль браузера для отладки
                console.log(message);
            };
            
            log(`🔄 Начинаем обработку ${tabsByLevel.level1.length} табов первого уровня...`);
            
            // Счетчик проходов
            if (!window.__tabPassCount) {
                window.__tabPassCount = 0;
            }
            window.__tabPassCount++;
            log(`\n🔄 ПРОХОД ПО ТАБАМ #${window.__tabPassCount} (начало: ${new Date().toISOString().split('T')[1].substring(0, 12)})`);
            
            for (let level1Index = 0; level1Index < tabsByLevel.level1.length; level1Index++) {
                const level1Tab = tabsByLevel.level1[level1Index];
                
                // Проверяем лимит кликов
                if (totalClicks >= MAX_TOTAL_CLICKS) {
                    log(`   ⚠️  Достигнут лимит кликов (${MAX_TOTAL_CLICKS}), прекращаем обработку табов`);
                    break;
                }
                
                // Извлекаем текст таба первого уровня (пробуем разные методы)
                let level1Text = getDirectText(level1Tab);
                if (!level1Text || level1Text.length === 0) {
                    // Пробуем textContent, но убираем лишние пробелы и переносы строк
                    level1Text = level1Tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                }
                if (!level1Text || level1Text.length === 0) {
                    // Пробуем innerText (учитывает видимость)
                    level1Text = level1Tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                }
                if (!level1Text || level1Text.length === 0) {
                    // Пробуем атрибуты
                    level1Text = level1Tab.getAttribute('aria-label') || 
                                level1Tab.getAttribute('title') || 
                                level1Tab.getAttribute('data-tab') ||
                                level1Tab.getAttribute('data-label') ||
                                'Unknown';
                }
                // Если текст слишком длинный (слипшиеся табы), ограничиваем
                if (level1Text.length > 100) {
                    level1Text = level1Text.substring(0, 50) + '...';
                }
                log(`📌 Таб первого уровня [${level1Index + 1}/${tabsByLevel.level1.length}]: "${level1Text}"`);
                
                // Проверяем, активен ли таб первого уровня
                const isLevel1Active = level1Tab.classList?.contains('active') ||
                                      level1Tab.classList?.contains('selected') ||
                                      level1Tab.getAttribute('aria-selected') === 'true' ||
                                      level1Tab.getAttribute('data-active') === 'true';
                
                // Кликаем на таб первого уровня только если он не активен
                // При загрузке страницы первый таб уже активен, его кликать не надо
                if (!isLevel1Active) {
                    try {
                        level1Tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        if (level1Tab.click) {
                            log(`   🖱️  Кликаем на таб первого уровня...`);
                            level1Tab.click();
                            totalClicks++;
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            
                            // Ждем загрузки контента
                            log(`   ⏳ Ожидание загрузки контента...`);
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
                
                // Теперь проходим по всем подтабам (табам второго уровня) для этого таба первого уровня
                // Ждем немного, чтобы табы второго уровня успели появиться после клика на таб первого уровня
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // ВАЖНО: Переопределяем табы второго уровня ПОСЛЕ клика на таб первого уровня,
                // так как для каждого таба первого уровня могут быть разные табы второго уровня
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
                    // Исключаем табы первого уровня
                    const isFirstLevel = tab.classList?.contains('tab-button-item') ||
                                        tab.closest('[class*="tab-button"]') !== null ||
                                        (tab.getAttribute('aria-controls') && !tab.closest('[class*="tab-content"]'));
                    
                    if (isFirstLevel) return false;
                    
                    // Проверяем, что это таб второго уровня (находится в контейнере табов второго уровня)
                    const parent = tab.closest('[class*="tab-stroke"], [class*="tabs-stroke"], [class*="tab-content"]');
                    const isSecondLevel = parent !== null || 
                                         tab.classList?.contains('tab-stroke-item') ||
                                         tab.classList?.contains('tab-stroke');
                    
                    return isSecondLevel;
                });
                
                // Фильтруем видимые табы второго уровня
                const visibleLevel2Tabs = currentLevel2Tabs.filter(level2Tab => {
                    // Проверяем, что элемент в DOM
                    if (!document.body.contains(level2Tab)) {
                        return false;
                    }
                    // Проверяем видимость
                    const isVisible = level2Tab.offsetParent !== null && 
                                     window.getComputedStyle(level2Tab).display !== 'none' &&
                                     window.getComputedStyle(level2Tab).visibility !== 'hidden';
                    return isVisible;
                });
                
                // Удаляем дубликаты по элементу
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
                // Это первый подтаб, который стал активным после клика на таб первого уровня
                let firstActiveSubTabProcessed = false;
                
                for (let level2Index = 0; level2Index < tabsToProcess.length; level2Index++) {
                    // Проверяем лимит кликов перед каждой итерацией
                    if (totalClicks >= MAX_TOTAL_CLICKS) {
                        log(`   ⚠️  Достигнут лимит кликов (${MAX_TOTAL_CLICKS}), прекращаем обработку подтабов`);
                        break;
                    }
                    
                    const tab = tabsToProcess[level2Index];
                try {
                    // Проверяем, что элемент все еще в DOM и доступен
                    if (!document.body.contains(tab)) {
                        log(`   ⚠️  Таб [${level2Index + 1}/${tabsToProcess.length}] удален из DOM, пропускаем`);
                        continue; // Пропускаем, если элемент удален из DOM
                    }
                    
                    // Извлекаем текст таба второго уровня (пробуем разные методы)
                    let tabText = getDirectText(tab);
                    if (!tabText || tabText.length === 0) {
                        // Пробуем textContent, но убираем лишние пробелы и переносы строк
                        tabText = tab.textContent?.trim().replace(/\s+/g, ' ') || '';
                    }
                    if (!tabText || tabText.length === 0) {
                        // Пробуем innerText (учитывает видимость)
                        tabText = tab.innerText?.trim().replace(/\s+/g, ' ') || '';
                    }
                    if (!tabText || tabText.length === 0) {
                        // Пробуем атрибуты
                        tabText = tab.getAttribute('aria-label') || 
                                 tab.getAttribute('title') || 
                                 tab.getAttribute('data-tab') ||
                                 tab.getAttribute('data-label') ||
                                 'Unknown';
                    }
                    // Если текст слишком длинный (слипшиеся табы), ограничиваем
                    if (tabText.length > 100) {
                        tabText = tabText.substring(0, 50) + '...';
                    }
                    
                    const tabKey = `[${level1Index + 1}/${tabsByLevel.level1.length}] ${level1Text} > [${level2Index + 1}/${tabsToProcess.length}] ${tabText}`;
                    
                    // Проверяем, не обрабатывали ли мы уже эту комбинацию табов
                    // ВАЖНО: Используем сам элемент таба для уникальности, а не только текст
                    // Это предотвращает повторную обработку одного и того же таба
                    const level1TabId = level1Tab.id || level1Tab.getAttribute('data-tab') || `level1-${level1Index}`;
                    const level2TabId = tab.id || tab.getAttribute('data-tab') || `level2-${level2Index}`;
                    const combinationKey = `${level1TabId}:${level2TabId}`;
                    
                    // Также проверяем по тексту для дополнительной защиты
                    const textCombinationKey = `[${level1Index}]${level1Text} > ${tabText}`;
                    
                    if (processedTabCombinations.has(combinationKey) || processedTabCombinations.has(textCombinationKey)) {
                        log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" - уже обработан, пропускаем`);
                        continue; // Пропускаем уже обработанную комбинацию
                    }
                    
                    // Проверяем, активен ли подтаб
                    const isLevel2Active = tab.classList?.contains('active') ||
                                          tab.classList?.contains('selected') ||
                                          tab.getAttribute('aria-selected') === 'true' ||
                                          tab.getAttribute('data-active') === 'true';
                    
                    // Если это активный подтаб и мы еще не обработали активный подтаб для этого таба первого уровня
                    // Собираем данные БЕЗ клика
                    if (isLevel2Active && !firstActiveSubTabProcessed) {
                        log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" (активен, собираем данные без клика)`);
                        firstActiveSubTabProcessed = true;
                        // Отмечаем как обработанный
                        processedTabCombinations.add(combinationKey);
                        processedTabCombinations.add(textCombinationKey);
                        // Пропускаем клик, сразу переходим к извлечению контента
                    } else if (!isLevel2Active) {
                        // Если подтаб не активен, кликаем на него
                        log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" (не активен, кликаем)`);
                        // Отмечаем как обработанный ДО клика
                        processedTabCombinations.add(combinationKey);
                        processedTabCombinations.add(textCombinationKey);
                    } else {
                        // Если подтаб активен, но мы уже обработали активный подтаб - пропускаем
                        log(`   🔹 Таб второго уровня [${level2Index + 1}/${tabsToProcess.length}]: "${tabText}" (активен, но уже обработан, пропускаем)`);
                        continue;
                    }
                    
                    // Прокручиваем к табу БЕЗ анимации, чтобы не активировать стрелки прокрутки
                    // Используем 'auto' вместо 'smooth' и 'nearest' вместо 'center'
                    try {
                        tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (scrollError) {
                        // Игнорируем ошибки прокрутки
                    }
                    
                    // ВАЖНО: Проверяем, что мы не кликаем по стрелкам прокрутки табов
                    // Игнорируем элементы, которые являются стрелками прокрутки
                    const isScrollArrow = tab.classList?.contains('scroll-arrow') ||
                                         tab.classList?.contains('arrow') ||
                                         tab.classList?.contains('nav-arrow') ||
                                         tab.getAttribute('aria-label')?.toLowerCase().includes('scroll') ||
                                         tab.getAttribute('aria-label')?.toLowerCase().includes('arrow') ||
                                         tab.querySelector('svg[class*="arrow"]') !== null;
                    
                    if (isScrollArrow) {
                        continue; // Пропускаем стрелки прокрутки
                    }
                    
                    // Проверяем, что таб видим и кликабельный
                    const isVisible = tab.offsetParent !== null && 
                                     window.getComputedStyle(tab).display !== 'none' &&
                                     window.getComputedStyle(tab).visibility !== 'hidden';
                    if (!isVisible) {
                        continue; // Пропускаем невидимые табы
                    }
                    
                    // Кликаем только если таб не активен
                    if (!isLevel2Active && tab.click && typeof tab.click === 'function') {
                        totalClicks++;
                        
                        log(`      🖱️  Кликаем на таб второго уровня [${totalClicks}/${MAX_TOTAL_CLICKS}]...`);
                        
                        // Кликаем с обработкой ошибок
                        try {
                            tab.click();
                            log(`      ✓ Клик выполнен`);
                        } catch (clickError) {
                            log(`      ⚠️  Ошибка при клике: ${clickError.message}, пробуем через dispatchEvent...`);
                            // Если обычный click не работает, пробуем через dispatchEvent
                            try {
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                tab.dispatchEvent(clickEvent);
                                log(`      ✓ Клик выполнен через dispatchEvent`);
                            } catch (dispatchError) {
                                log(`      ❌ Не удалось кликнуть, пропускаем этот таб`);
                                // Пропускаем этот таб, если клик не удался
                                processedTabCombinations.delete(combinationKey);
                                processedTabCombinations.delete(textCombinationKey);
                                totalClicks--;
                                continue;
                            }
                        }
                        // Ждем меньше времени для загрузки динамического контента (чтобы не зависать)
                        log(`      ⏳ Ожидание загрузки контента таба...`);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        
                        // Дополнительно ждем появления контента (проверяем меньше раз, чтобы не зависать)
                        let hasContent = false;
                        for (let waitAttempt = 0; waitAttempt < 2; waitAttempt++) {
                            await new Promise(resolve => setTimeout(resolve, 400));
                            
                            // Проверяем, появился ли контент
                            const tabId = tab.getAttribute('id') || tab.getAttribute('aria-controls');
                            
                            if (tabId) {
                                const contentEl = document.getElementById(tabId) || 
                                                 document.querySelector(`[aria-labelledby="${tabId}"]`) ||
                                                 document.querySelector(`[data-tab="${tabId}"]`);
                                if (contentEl && contentEl.innerHTML.trim().length > 50) {
                                    hasContent = true;
                                    log(`      ✓ Контент найден (попытка ${waitAttempt + 1}/2)`);
                                    break;
                                }
                            }
                            
                            if (!hasContent) {
                                const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                                     document.querySelector('.tab-content.active') ||
                                                     document.querySelector('.tab-panel.active') ||
                                                     document.querySelector('article');
                                if (activeContent && activeContent.innerHTML.trim().length > 50) {
                                    hasContent = true;
                                    log(`      ✓ Контент найден через активный контент (попытка ${waitAttempt + 1}/2)`);
                                    break;
                                }
                            }
                        }
                        if (!hasContent) {
                            log(`      ⚠️  Контент не найден, продолжаем`);
                        }
                        // Продолжаем даже если контент не появился (некоторые табы могут не иметь контента)
                    } else if (isLevel2Active && firstActiveSubTabProcessed) {
                        // Если таб активен и мы его уже обработали, пропускаем ожидание
                        log(`      ✓ Таб активен, контент уже доступен`);
                    } else if (!tab.click || typeof tab.click !== 'function') {
                        // Если таб не кликабельный, пропускаем его
                        log(`      ⚠️  Таб не кликабельный, пропускаем`);
                        continue;
                    }
                    
                    // ВАЖНО: Ждем стабилизации контента после клика (сокращаем время, чтобы не зависать)
                    // Проверяем, что контент не меняется (не происходит прокрутка/анимация)
                    log(`      ⏳ Проверка стабильности контента...`);
                    let previousContentLength = 0;
                    let stableContentCount = 0;
                    for (let stabilityCheck = 0; stabilityCheck < 2; stabilityCheck++) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        const currentContent = document.querySelector('article')?.innerHTML || '';
                        if (currentContent.length === previousContentLength && currentContent.length > 50) {
                            stableContentCount++;
                            if (stableContentCount >= 1) {
                                log(`      ✓ Контент стабилен`);
                                break; // Контент стабилен
                            }
                        } else {
                            stableContentCount = 0;
                        }
                        previousContentLength = currentContent.length;
                    }
                    
                    // СРАЗУ после стабилизации извлекаем контент этого таба
                    // Приоритет: ищем тег <article> с контентом таба
                    let tabContent = '';
                    
                    // Сначала ищем тег <article> - это основной контейнер контента таба
                    const articleEl = document.querySelector('article');
                    if (articleEl && articleEl.innerHTML.trim().length > 50) {
                        tabContent = articleEl.innerHTML;
                    }
                    
                    // Если не нашли article, ищем контент по ID таба
                    if (!tabContent || tabContent.trim().length < 50) {
                        const tabId = tab.getAttribute('id') || tab.getAttribute('aria-controls');
                        if (tabId) {
                            const contentEl = document.getElementById(tabId) || 
                                             document.querySelector(`[aria-labelledby="${tabId}"]`) ||
                                             document.querySelector(`[data-tab="${tabId}"]`);
                            if (contentEl && contentEl.innerHTML.trim().length > 50) {
                                tabContent = contentEl.innerHTML;
                            }
                        }
                    }
                    
                    // Если не нашли по ID, ищем активный контент
                    if (!tabContent || tabContent.trim().length < 50) {
                        const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                             document.querySelector('.tab-content.active') ||
                                             document.querySelector('.tab-panel.active') ||
                                             document.querySelector('[class*="tab-content"][class*="active"]') ||
                                             document.querySelector('[class*="tab-panel"][class*="active"]');
                        if (activeContent && activeContent.innerHTML.trim().length > 50) {
                            tabContent = activeContent.innerHTML;
                        }
                    }
                    
                    // Если все еще не нашли, ищем все article элементы и берем самый большой
                    if (!tabContent || tabContent.trim().length < 50) {
                        const allArticles = Array.from(document.querySelectorAll('article'));
                        if (allArticles.length > 0) {
                            // Берем article с самым большим контентом
                            const largestArticle = allArticles.reduce((largest, current) => {
                                return current.innerHTML.length > largest.innerHTML.length ? current : largest;
                            });
                            if (largestArticle && largestArticle.innerHTML.trim().length > 50) {
                                tabContent = largestArticle.innerHTML;
                            }
                        }
                    }
                    
                    // Сохраняем контент СРАЗУ после клика (до следующего клика)
                    // Используем комбинацию табов первого и второго уровня как ключ
                    // Используем уже извлеченный tabText, если он есть, иначе извлекаем заново
                    let level2Text = tabText; // Используем уже извлеченный tabText
                    if (!level2Text || level2Text === 'Unknown') {
                        level2Text = getDirectText(tab);
                        if (!level2Text || level2Text.length === 0) {
                            level2Text = tab.textContent?.trim().replace(/\s+/g, ' ') || 
                                        tab.innerText?.trim().replace(/\s+/g, ' ') ||
                                        tab.getAttribute('aria-label') || 
                                        tab.getAttribute('title') || 
                                        tab.getAttribute('data-tab') ||
                                        'Level2';
                        }
                    }
                    const combinedKey = `${level1Text} > ${level2Text}`;
                    
                    if (tabContent && tabContent.trim().length > 50) {
                        // Сохраняем по комбинации табов первого и второго уровня
                        // Если уже есть контент для этой комбинации, не перезаписываем (берем более полный)
                        if (!tabsData[combinedKey] || tabContent.length > tabsData[combinedKey].length) {
                            tabsData[combinedKey] = tabContent;
                            log(`      ✓ Контент сохранен: ${(tabContent.length / 1024).toFixed(1)} KB`);
                        }
                        // Также сохраняем отдельно по названию таба второго уровня для обратной совместимости
                        if (!tabsData[level2Text] || tabContent.length > tabsData[level2Text].length) {
                            tabsData[level2Text] = tabContent;
                        }
                    } else {
                        // Если контент не найден, сохраняем метку для отладки
                        if (!tabsData[combinedKey]) {
                            tabsData[combinedKey] = `[NO CONTENT] Контент не найден для "${combinedKey}"`;
                            log(`      ⚠️  Контент не найден для таба`);
                        }
                    }
                    } catch (e) {
                        // Игнорируем ошибки при клике, но сохраняем информацию
                        let tabText = getDirectText(tab);
                        if (!tabText || tabText.length === 0) {
                            tabText = tab.textContent?.trim().replace(/\s+/g, ' ') || 
                                     tab.innerText?.trim().replace(/\s+/g, ' ') ||
                                     tab.getAttribute('aria-label') || 
                                     tab.getAttribute('title') || 
                                     tab.getAttribute('data-tab') ||
                                     'Unknown';
                        }
                        log(`      ❌ Ошибка при обработке таба: ${e.message}`);
                        tabsData[`${level1Text} > ${tabText} [ERROR]`] = `Ошибка: ${e.message}`;
                    }
                }
                
                log(`   ✅ Завершена обработка табов второго уровня для "${level1Text}"`);
            }
            
            log(`✅ Завершена обработка всех табов первого уровня`);
            
            // Подсчитываем количество уникальных комбинаций
            const uniqueCombinations = Object.keys(tabsData).filter(key => !key.includes('[ERROR]')).length;
            log(`📊 Статистика: кликов=${totalClicks}, комбинаций=${uniqueCombinations}`);
            
            // Возвращаем информацию о кликах и логи для логирования снаружи
            const clicksInfo = {
                totalClicks: totalClicks,
                processedCombinations: Array.from(processedTabCombinations),
                maxClicksReached: totalClicks >= MAX_TOTAL_CLICKS,
                uniqueCombinations: uniqueCombinations
            };
            
            // Если есть табы, которые не были обработаны (не попали ни в level1, ни в level2)
            // Обрабатываем их отдельно как табы первого уровня без подтабов
            const processedTabs = new Set([...tabsByLevel.level1, ...tabsByLevel.level2]);
            const unprocessedTabs = uniqueTabs.filter(tab => !processedTabs.has(tab));
            
            for (let tabIndex = 0; tabIndex < unprocessedTabs.length; tabIndex++) {
                const tab = unprocessedTabs[tabIndex];
                try {
                    const tabText = getDirectText(tab) || tab.getAttribute('aria-label') || tab.getAttribute('title') || 'Unknown';
                    
                    tab.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    const isScrollArrow = tab.classList?.contains('scroll-arrow') ||
                                         tab.classList?.contains('arrow') ||
                                         tab.classList?.contains('nav-arrow') ||
                                         tab.getAttribute('aria-label')?.toLowerCase().includes('scroll') ||
                                         tab.getAttribute('aria-label')?.toLowerCase().includes('arrow') ||
                                         tab.querySelector('svg[class*="arrow"]') !== null;
                    
                    if (isScrollArrow) {
                        continue;
                    }
                    
                    if (tab.click) {
                        tab.click();
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        for (let waitAttempt = 0; waitAttempt < 5; waitAttempt++) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                            const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                                 document.querySelector('.tab-content.active') ||
                                                 document.querySelector('.tab-panel.active');
                            if (activeContent && activeContent.innerHTML.trim().length > 50) {
                                break;
                            }
                        }
                    }
                    
                    // Извлекаем контент
                    let tabContent = '';
                    const articleEl = document.querySelector('article');
                    if (articleEl && articleEl.innerHTML.trim().length > 50) {
                        tabContent = articleEl.innerHTML;
                    }
                    
                    if (!tabContent || tabContent.trim().length < 50) {
                        const activeContent = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                             document.querySelector('.tab-content.active') ||
                                             document.querySelector('.tab-panel.active');
                        if (activeContent && activeContent.innerHTML.trim().length > 50) {
                            tabContent = activeContent.innerHTML;
                        }
                    }
                    
                    if (tabContent && tabContent.trim().length > 50) {
                        if (!tabsData[tabText] || tabContent.length > tabsData[tabText].length) {
                            tabsData[tabText] = tabContent;
                        }
                    }
                } catch (e) {
                    const tabText = tab.textContent?.trim() || tab.getAttribute('aria-label') || 'Unknown';
                    tabsData[`${tabText} [ERROR]`] = `Ошибка: ${e.message}`;
                }
            }
            
            // Добавляем все контейнеры из карты, которые еще не добавлены
            // Но только если это не технические ключи и контент достаточно большой
            tabContentMap.forEach((content, label) => {
                if (content && content.trim().length > 50 && 
                    !label.startsWith('tab-content-') && 
                    !label.includes('Положения о Комитетах Совета директоров ПАО МГТССвидетельства')) {
                    // Не сохраняем, если уже есть более полный контент
                    if (!tabsData[label] || content.length > tabsData[label].length) {
                        // Проверяем, что это не просто кнопки табов
                        if (!content.includes('tab-button-item') || content.length > 500) {
                            tabsData[label] = content;
                        }
                    }
                }
            });
            
            // Также извлекаем ВСЕ контейнеры контента (включая скрытые) для последующего анализа
            const allHiddenContent = {};
            uniqueContainers.forEach((container, index) => {
                const content = container.innerHTML;
                // Пробуем найти связанный таб по aria-controls или другим атрибутам
                const containerId = container.id;
                const ariaLabelledBy = container.getAttribute('aria-labelledby');
                
                // Ищем таб, который управляет этим контейнером
                let relatedTab = null;
                if (containerId) {
                    relatedTab = document.querySelector(`[aria-controls="${containerId}"]`) ||
                                document.querySelector(`[data-tab="${containerId}"]`) ||
                                document.querySelector(`[id*="${containerId}"]`);
                }
                if (ariaLabelledBy && !relatedTab) {
                    relatedTab = document.getElementById(ariaLabelledBy);
                }
                
                const tabLabel = relatedTab ? 
                    (relatedTab.textContent?.trim() || relatedTab.getAttribute('aria-label') || relatedTab.getAttribute('title')) :
                    (container.getAttribute('data-tab') ||
                     container.getAttribute('aria-label') ||
                     container.id ||
                     `tab-content-${index}`);
                
                if (content && content.trim() && content.trim().length > 50) {
                    // Не сохраняем технические ключи и объединенные названия табов
                    if (!tabLabel.startsWith('tab-content-') && 
                        !tabLabel.includes('Положения о Комитетах Совета директоров ПАО МГТССвидетельства')) {
                        // Проверяем, что это не просто кнопки табов
                        if (!content.includes('tab-button-item') || content.length > 500) {
                            allHiddenContent[tabLabel] = content;
                            // Также добавляем в tabsData, если еще не добавлено или если новый контент больше
                            if (!tabsData[tabLabel] || content.length > tabsData[tabLabel].length) {
                                tabsData[tabLabel] = content;
                            }
                        }
                    }
                }
            });
            
            return {
                clickedTabs: Object.keys(tabsData),
                tabsContent: tabsData,
                allHiddenContent: allHiddenContent,
                tabsFound: uniqueTabs.length,
                containersFound: allContentContainers.length,
                clicksInfo: clicksInfo,
                tabsByLevelInfo: {
                    level1Count: tabsByLevel.level1.length,
                    level2Count: tabsByLevel.level2.length,
                    level1Names: tabsByLevel.level1.map(t => t.textContent?.trim() || 'Unknown').slice(0, 5),
                    level2Names: tabsByLevel.level2.map(t => t.textContent?.trim() || 'Unknown').slice(0, 10)
                },
                actionLogs: actionLogs // Возвращаем логи для вывода в Node.js контексте
            };
        });
        
        // Выводим логи действий из браузера (они уже будут в preLLMLogs через перехват console.log)
        if (tabsContent.actionLogs && tabsContent.actionLogs.length > 0) {
            console.log('');
            console.log('📋 Логи обработки табов:');
            tabsContent.actionLogs.forEach(log => {
                console.log(`   ${log}`);
            });
            console.log('');
        }
        
        if (tabsContent.tabsFound !== undefined) {
            console.log(`   📊 Найдено табов: ${tabsContent.tabsFound}, контейнеров контента: ${tabsContent.containersFound || 0}`);
        }
        
        // Логируем информацию об уровнях табов
        if (tabsContent.tabsByLevelInfo) {
            console.log(`   📊 Табы первого уровня: ${tabsContent.tabsByLevelInfo.level1Count}, второго уровня: ${tabsContent.tabsByLevelInfo.level2Count}`);
            if (tabsContent.tabsByLevelInfo.level1Names.length > 0) {
                console.log(`      Первый уровень: ${tabsContent.tabsByLevelInfo.level1Names.join(', ')}`);
            }
            if (tabsContent.tabsByLevelInfo.level2Names.length > 0) {
                console.log(`      Второй уровень: ${tabsContent.tabsByLevelInfo.level2Names.join(', ')}`);
            }
        }
        
        // Логируем информацию о кликах
        if (tabsContent.clicksInfo) {
            console.log(`   📊 Всего кликов: ${tabsContent.clicksInfo.totalClicks}, обработано комбинаций: ${tabsContent.clicksInfo.processedCombinations.length}`);
            if (tabsContent.clicksInfo.maxClicksReached) {
                console.warn(`   ⚠️  Достигнут лимит кликов!`);
            }
        }
        
        if (tabsContent.clickedTabs && tabsContent.clickedTabs.length > 0) {
            console.log(`   ✓ Кликнуто по табам: ${tabsContent.clickedTabs.length}`);
            // Фильтруем дубликаты перед выводом в лог
            const uniqueTabsContent = {};
            if (tabsContent.tabsContent) {
                Object.keys(tabsContent.tabsContent).forEach(tabName => {
                    // Пропускаем дубликаты и технические ключи
                    if (tabName.length <= 100 && 
                        !tabName.startsWith('tab-content-') && 
                        !tabName.includes('Положения о Комитетах Совета директоров ПАО МГТССвидетельства') &&
                        !tabName.includes('[ERROR]')) {
                        // Проверяем, нет ли более короткого ключа с таким же контентом
                        const content = tabsContent.tabsContent[tabName];
                        const existingKey = Object.keys(uniqueTabsContent).find(k => 
                            uniqueTabsContent[k] === content && k.length < tabName.length
                        );
                        if (!existingKey) {
                            uniqueTabsContent[tabName] = content;
                        }
                    }
                });
            }
            console.log(`   ✓ Извлечено контента табов: ${Object.keys(uniqueTabsContent).length}`);
            Object.keys(uniqueTabsContent).forEach(tabName => {
                const contentLength = uniqueTabsContent[tabName].length;
                console.log(`      - "${tabName}": ${contentLength} символов`);
            });
        }
        if (tabsContent.allHiddenContent && Object.keys(tabsContent.allHiddenContent).length > 0) {
            console.log(`   ✓ Найдено скрытых контейнеров: ${Object.keys(tabsContent.allHiddenContent).length}`);
        }
    } catch (error) {
        console.warn(`   ⚠️  Не удалось извлечь контент табов: ${error.message}`);
    }
    
    // НЕ извлекаем HTML здесь - он уже извлечен до кликов по табам
    // HTML будет добавлен позже из базового контента, чтобы избежать накопления заголовков
    // Возвращаем только данные о табах
    
    // Удаляем SVG блоки из контента табов перед сохранением
    // Также удаляем дубликаты и ключи с объединенными названиями табов
    const cleanedTabsContent = {};
    if (tabsContent.tabsContent) {
        Object.keys(tabsContent.tabsContent).forEach(key => {
            // Пропускаем ключи, которые содержат несколько названий табов (слипшихся вместе)
            // или технические ключи
            if (key.length > 100 || 
                key.includes('Положения о Комитетах Совета директоров ПАО МГТССвидетельства') ||
                key.startsWith('tab-content-') ||
                key.includes('[ERROR]')) {
                return; // Пропускаем этот ключ
            }
            
            // Пропускаем, если уже есть более короткий ключ с таким же контентом
            const content = removeSvgFromHtml(tabsContent.tabsContent[key]);
            const existingKey = Object.keys(cleanedTabsContent).find(k => 
                cleanedTabsContent[k] === content && k.length < key.length
            );
            if (existingKey) {
                return; // Пропускаем, так как уже есть более короткий ключ
            }
            
            cleanedTabsContent[key] = content;
        });
    }
    
    const cleanedHiddenContent = {};
    if (tabsContent.allHiddenContent) {
        Object.keys(tabsContent.allHiddenContent).forEach(key => {
            cleanedHiddenContent[key] = removeSvgFromHtml(tabsContent.allHiddenContent[key]);
        });
    }
    
    // Логируем информацию о контенте табов (НЕ добавляем к HTML здесь)
    if (Object.keys(cleanedTabsContent).length > 0) {
        const tabsContentJSON = JSON.stringify(cleanedTabsContent, null, 2);
        console.log(`   ✓ Добавлен JSON контента табов (без SVG): ${tabsContentJSON.length} символов`);
    }
    
    if (Object.keys(cleanedHiddenContent).length > 0) {
        const hiddenContentJSON = JSON.stringify(cleanedHiddenContent, null, 2);
        console.log(`   ✓ Добавлен JSON скрытого контента (без SVG): ${hiddenContentJSON.length} символов`);
    }
    
    // Возвращаем только данные о табах, без HTML (HTML извлекается отдельно до кликов)
    const result = {
        tabsContentJSON: null,
        extractedFileLinks: {},
        tabsFileLinksByTab: {}
    };
    
    // Сохраняем JSON контент табов отдельно для проверки (уже без SVG)
    if (Object.keys(cleanedTabsContent).length > 0 || Object.keys(cleanedHiddenContent).length > 0) {
        result.tabsContentJSON = {
            tabsContent: cleanedTabsContent,
            allHiddenContent: cleanedHiddenContent
        };
    }
    
    return result;
}

/**
 * Извлекает файлы через клики по элементам file-item и скачивает их
 */
async function extractFileLinks(page, outputDir, slug, downloadPath, scopeSelector = null) {
    const fileLinksMap = new Map(); // text -> { localPath, fileName, fileType }
    const fs = require('fs');
    const path = require('path');
    
    // Папка для файлов (передается из main функции)
    const filesDir = downloadPath || path.join(outputDir, `${slug}_files`);
    if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
    }
    
    // Определяем папку загрузок
    const os = require('os');
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    
    try {
        console.log(`   🔍 Поиск элементов с файлами...`);
        console.log(`   📁 Папка загрузок: ${downloadsDir}`);
        console.log(`   📁 Папка для файлов: ${filesDir}`);

        const closeCookieBanner = async () => {
            try {
                await page.evaluate(() => {
                    const btn = document.querySelector('.banner-cookie-button');
                    if (btn && btn.offsetParent !== null) {
                        btn.click();
                    }
                });
            } catch (error) {
                // Игнорируем - баннер может отсутствовать
            }
        };
        
        await closeCookieBanner();
        
        // Функция для получения списка файлов в папке
        const getDownloadedFiles = (dir) => {
            if (!fs.existsSync(dir)) return [];
            return fs.readdirSync(dir)
                .map(fileName => ({
                    fileName: fileName,
                    path: path.join(dir, fileName),
                    stats: fs.statSync(path.join(dir, fileName))
                }))
                .filter(file => file.stats.isFile())
                .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs); // Сортируем по времени изменения (новые первыми)
        };
        
        const fileSelectors = [
            '.file-item',
            'a[class*="file"]',
            '[data-file]',
            '[data-download]',
            '[data-url]',
            '[data-href]',
            '[data-link]',
            'a[href*=".pdf" i]',
            'a[href*=".doc" i]',
            'a[href*=".docx" i]',
            'a[href*=".xls" i]',
            'a[href*=".xlsx" i]',
            'a[href*=".zip" i]',
            'a[href*=".rar" i]'
        ].join(', ');

        // Находим все элементы с файлами и их заголовки h4
        const fileElements = await page.evaluate((scopeSelector, slug, selectors) => {
            const elements = [];
            
            // Определяем область поиска
            const searchScope = scopeSelector ? document.querySelector(scopeSelector) : document.body;
            if (!searchScope) {
                return elements; // Если область не найдена, возвращаем пустой массив
            }
            
            // Ищем элементы с классом file-item и все ссылки на файлы только в указанной области
            searchScope.querySelectorAll(selectors).forEach((el, index) => {
                const fileNameEl = el.querySelector('.file-name, [class*="file-name"]');
                const fileText = fileNameEl ? fileNameEl.textContent.trim() : el.textContent.trim();
                
                if (fileText && fileText.length > 0) {
                    // Ищем заголовок h4 перед этим элементом
                    let title = '';
                    let currentElement = el;
                    
                    // Ищем h4 в родительском контейнере или перед элементом
                    const parent = el.parentElement;
                    if (parent) {
                        // Ищем h4 в том же родителе
                        const h4InParent = parent.querySelector('h4');
                        if (h4InParent) {
                            title = h4InParent.textContent.trim();
                        } else {
                            // Ищем h4 перед родителем
                            let prevSibling = parent.previousElementSibling;
                            while (prevSibling && !title) {
                                if (prevSibling.tagName === 'H4') {
                                    title = prevSibling.textContent.trim();
                                } else {
                                    const h4InSibling = prevSibling.querySelector('h4');
                                    if (h4InSibling) {
                                        title = h4InSibling.textContent.trim();
                                    }
                                }
                                prevSibling = prevSibling.previousElementSibling;
                            }
                        }
                    }
                    
                    // Если не нашли в родителе, ищем перед элементом
                    if (!title) {
                        let prev = el.previousElementSibling;
                        while (prev && !title) {
                            if (prev.tagName === 'H4') {
                                title = prev.textContent.trim();
                            } else {
                                const h4InPrev = prev.querySelector('h4');
                                if (h4InPrev) {
                                    title = h4InPrev.textContent.trim();
                                }
                            }
                            prev = prev.previousElementSibling;
                        }
                    }
                    
                    // Извлекаем информацию об элементе
                    const href = el.getAttribute('href') || '';
                    const dataFile = el.getAttribute('data-file') || '';
                    const dataUrl = el.getAttribute('data-url') || '';
                    const dataHref = el.getAttribute('data-href') || '';
                    const onclick = el.getAttribute('onclick') || '';
                    const onClickHandler = el.onclick ? el.onclick.toString() : '';
                    
                    elements.push({
                        text: fileText,
                        title: title,
                        index: index,
                        href: href,
                        dataFile: dataFile,
                        dataUrl: dataUrl,
                        dataHref: dataHref,
                        dataLink: el.getAttribute('data-link') || '',
                        onclick: onclick,
                        hasOnClick: !!el.onclick,
                        clickByText: false
                    });
                }
            });

            // Дополнительная логика для страницы закупок: карточки без явных ссылок
            if (slug === 'purchas') {
                const seen = new Set(elements.map(item => item.text));
                const sizeRegex = /\b(КБ|МБ|KB|MB)\b/i;
                const typeRegex = /\b(docx?|xlsx?|pdf)\b/i;
                const candidates = Array.from(searchScope.querySelectorAll('div, a, button'))
                    .filter(el => {
                        const text = (el.textContent || '').trim();
                        return text && sizeRegex.test(text) && typeRegex.test(text);
                    });
                candidates.forEach((el) => {
                    const card = el.closest('[class*="card"], [class*="file"], [class*="document"]') || el;
                    const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
                    const titleText = titleEl ? titleEl.textContent.trim() : '';
                    const fileText = titleText || (card.textContent || '').trim();
                    if (!fileText || seen.has(fileText)) return;
                    seen.add(fileText);

                    const anchor = card.closest('a') || card.querySelector('a[href]');
                    const href = anchor ? anchor.getAttribute('href') || '' : '';
                    const dataFile = card.getAttribute('data-file') || '';
                    const dataUrl = card.getAttribute('data-url') || '';
                    const dataHref = card.getAttribute('data-href') || '';
                    const dataLink = card.getAttribute('data-link') || '';
                    const onclick = card.getAttribute('onclick') || '';

                    elements.push({
                        text: fileText,
                        title: '',
                        index: elements.length,
                        href,
                        dataFile,
                        dataUrl,
                        dataHref,
                        dataLink,
                        onclick,
                        hasOnClick: !!card.onclick,
                        clickByText: true
                    });
                });
            }
            
            return elements;
        }, scopeSelector, slug, fileSelectors);
        
        if (fileElements.length > 0) {
            console.log(`   📄 Найдено элементов с файлами: ${fileElements.length}`);
            
            // Обрабатываем каждый элемент
            for (let i = 0; i < fileElements.length; i++) {
                const fileElement = fileElements[i];
                try {
                    let fileUrl = '';
                    
                    // 1. Проверяем href (если есть)
                    if (fileElement.href && fileElement.href.trim() && !fileElement.href.startsWith('#')) {
                        fileUrl = fileElement.href;
                    }
                    // 2. Проверяем data-* атрибуты
                    else if (fileElement.dataFile) {
                        fileUrl = fileElement.dataFile;
                    } else if (fileElement.dataUrl) {
                        fileUrl = fileElement.dataUrl;
                    } else if (fileElement.dataHref) {
                        fileUrl = fileElement.dataHref;
                    } else if (fileElement.dataLink) {
                        fileUrl = fileElement.dataLink;
                    }
                    // 3. Парсим onclick (если есть)
                    else if (fileElement.onclick || fileElement.hasOnClick) {
                        const onclickCode = fileElement.onclick || '';
                        // Ищем URL в onclick
                        const urlMatch = onclickCode.match(/(?:window\.open|location\.href|location\.assign|downloadFile|download)\(['"]([^'"]+)['"]/);
                        if (urlMatch) {
                            fileUrl = urlMatch[1];
                        }
                    }
                    
                    // Если URL найден, сохраняем его
                    if (fileUrl && fileUrl.trim()) {
                        // Делаем URL абсолютным, если он относительный
                        if (fileUrl.startsWith('/')) {
                            fileUrl = `https://business.mgts.ru${fileUrl}`;
                        } else if (!fileUrl.startsWith('http')) {
                            fileUrl = `https://business.mgts.ru/${fileUrl}`;
                        }
                        
                        const fileName = fileUrl.split('/').pop().split('?')[0];
                        const fileType = fileUrl.match(/\.([^.]+)(\?|$)/i)?.[1]?.toLowerCase() || 'unknown';
                        
                        const fileData = {
                            href: fileUrl,
                            fileName: fileName,
                            fileType: fileType,
                            title: fileElement.title || ''
                        };
                        fileLinksMap.set(fileElement.text, fileData);
                        if (fileElement.title && fileElement.title !== fileElement.text) {
                            fileLinksMap.set(fileElement.title, fileData);
                        }
                        console.log(`      ✓ Найден URL для "${fileElement.text.substring(0, 50)}...": ${fileUrl}`);
                        continue;
                    } else {
                        console.log(`      ⚠️  URL не найден для "${fileElement.text.substring(0, 50)}..." (href: "${fileElement.href}", data-file: "${fileElement.dataFile}", onclick: "${fileElement.onclick ? 'есть' : 'нет'}")`);
                    }
                    
                    // 4. Если URL не найден, кликаем по элементу для скачивания файла
                    const clickedElement = await page.evaluateHandle((payload) => {
                        const { index, scopeSelector, text, clickByText, selectors } = payload || {};
                        const searchScope = scopeSelector ? document.querySelector(scopeSelector) : document.body;
                        if (!searchScope) return null;
                        if (clickByText && text) {
                            const fileCandidates = Array.from(searchScope.querySelectorAll(selectors))
                                .filter(el => (el.textContent || '').trim().includes(text.trim()));
                            if (fileCandidates.length > 0) {
                                return fileCandidates[0];
                            }
                            const candidates = Array.from(searchScope.querySelectorAll('a, button, [role="button"], .file-item, [class*="file"]'))
                                .filter(el => !el.closest('.banner-cookie-container'))
                                .filter(el => (el.textContent || '').trim().includes(text.trim()));
                            return candidates[0] || null;
                        }
                        const elements = Array.from(searchScope.querySelectorAll(selectors));
                        return elements[index] || null;
                    }, { index: fileElement.index, scopeSelector, text: fileElement.text, clickByText: fileElement.clickByText, selectors: fileSelectors });
                    
                    if (clickedElement) {
                        await closeCookieBanner();
                        // Получаем список файлов в папке загрузок до клика
                        const filesBefore = getDownloadedFiles(downloadsDir);
                        const filesBeforeNames = new Set(filesBefore.map(f => f.fileName));
                        
                        // Кликаем для скачивания файла
                        console.log(`      🖱️  Клик по элементу "${fileElement.text.substring(0, 50)}..."`);
                        await Promise.race([
                            page.evaluate((el) => {
                                const target = el.tagName === 'A' ? el : (el.querySelector('a') || el);
                                target.scrollIntoView({ block: 'center', inline: 'center' });
                                if (typeof target.click === 'function') {
                                    target.click();
                                } else {
                                    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                }
                            }, clickedElement),
                            new Promise(resolve => setTimeout(resolve, 3000)) // Таймаут 3 секунды
                        ]);
                        
                        // Ждем скачивания файла (проверяем папку загрузок несколько раз)
                        let downloadedFile = null;
                        for (let attempt = 0; attempt < 15; attempt++) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            const filesAfter = getDownloadedFiles(downloadsDir);
                            const newFiles = filesAfter.filter(f => !filesBeforeNames.has(f.fileName));
                            
                            if (newFiles.length > 0) {
                                // Берем самый новый файл
                                downloadedFile = newFiles[0];
                                console.log(`      ✓ Найден новый файл в загрузках: ${downloadedFile.fileName}`);
                                break;
                            }
                        }
                        
                        if (downloadedFile) {
                            // Генерируем безопасное имя файла из текста элемента
                            const safeFileName = fileElement.text
                                .replace(/[^a-zA-Zа-яА-Я0-9\s\-_]/g, '_')
                                .replace(/\s+/g, '_')
                                .substring(0, 100);
                            
                            // Определяем расширение файла из скачанного файла
                            let fileExtension = downloadedFile.fileName.match(/\.([^.]+)$/i)?.[1]?.toLowerCase() || 'bin';
                            
                            const newFileName = `${safeFileName}.${fileExtension}`;
                            const newFilePath = path.join(filesDir, newFileName);
                            
                            // Если файл с таким именем уже существует, добавляем номер
                            let finalFileName = newFileName;
                            let finalFilePath = newFilePath;
                            let counter = 1;
                            while (fs.existsSync(finalFilePath)) {
                                finalFileName = `${safeFileName}_${counter}.${fileExtension}`;
                                finalFilePath = path.join(filesDir, finalFileName);
                                counter++;
                            }
                            
                            // Перемещаем файл из папки загрузок в нужную папку
                            fs.renameSync(downloadedFile.path, finalFilePath);
                            
                            // Относительный путь от outputDir
                            const relativePath = path.relative(outputDir, finalFilePath);
                            
                            const fileData = {
                                localPath: relativePath,
                                fileName: finalFileName,
                                fileType: fileExtension,
                                title: fileElement.title || ''
                            };
                            fileLinksMap.set(fileElement.text, fileData);
                            if (fileElement.title && fileElement.title !== fileElement.text) {
                                fileLinksMap.set(fileElement.title, fileData);
                            }
                            
                            console.log(`      ✓ Файл перемещен: ${finalFileName}`);
                        } else {
                            console.log(`      ⚠️  Файл не был скачан для "${fileElement.text.substring(0, 50)}..."`);
                        }
                    }
                } catch (error) {
                    console.warn(`   ⚠️  Ошибка при обработке файла "${fileElement.text}": ${error.message}`);
                }
            }
            
            if (fileLinksMap.size > 0) {
                console.log(`   ✓ Извлечено ссылок на файлы: ${fileLinksMap.size}`);
            }
        }
        
        // Обработчики не нужны, так как используем мониторинг папки загрузок
    } catch (error) {
        console.warn(`   ⚠️  Не удалось извлечь ссылки на файлы: ${error.message}`);
    }
    
    // Преобразуем Map в объект
    const fileLinksObj = {};
    fileLinksMap.forEach((value, key) => {
        fileLinksObj[key] = value;
    });
    
    return fileLinksObj;
}

/**
 * Извлекает контент модальных окон, открывающихся по клику "Подробнее"
 */
async function extractModalContents(page) {
    const results = [];
    const seen = new Set();
    
    const getCandidateCount = async () => {
        return page.evaluate(() => {
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const candidates = Array.from(document.querySelectorAll('a, button, div, span'))
                .filter(el => isVisible(el))
                .filter(el => /Подробнее/i.test((el.textContent || '').trim()));
            return candidates.length;
        });
    };
    
    const clickCandidateAt = async (index) => {
        return page.evaluate((idx) => {
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const candidates = Array.from(document.querySelectorAll('a, button, div, span'))
                .filter(el => isVisible(el))
                .filter(el => /Подробнее/i.test((el.textContent || '').trim()));
            const target = candidates[idx];
            if (!target) return false;
            const href = target.getAttribute?.('href') || '';
            if (target.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                return false;
            }
            target.scrollIntoView({ block: 'center', inline: 'center' });
            target.click();
            return true;
        }, index);
    };
    
    const waitForModalVisible = async () => {
        return page.waitForFunction(() => {
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const modal = Array.from(document.querySelectorAll('.modal-container'))
                .find(el => isVisible(el));
            return !!modal;
        }, { timeout: 8000 }).then(() => true).catch(() => false);
    };
    
    const extractModal = async () => {
        return page.evaluate(() => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const modal = Array.from(document.querySelectorAll('.modal-container'))
                .find(el => isVisible(el));
            if (!modal) return null;
            const title = normalize(modal.querySelector('h1, h2, h3, [class*="title"]')?.textContent || '');
            const html = modal.innerHTML || '';
            const text = normalize(modal.innerText || modal.textContent || '');
            return { title, html, text };
        });
    };
    
    const closeModal = async () => {
        await page.evaluate(() => {
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const modal = Array.from(document.querySelectorAll('.modal-container'))
                .find(el => isVisible(el));
            if (!modal) return;
            const closeButton =
                modal.querySelector('button[class*="close"], button[aria-label*="закры"], button[aria-label*="close"]') ||
                modal.querySelector('[class*="close"], [class*="Close"]') ||
                modal.querySelector('button, [role="button"]');
            const svg = modal.querySelector('svg');
            const target = (closeButton && closeButton.querySelector('svg')) ? closeButton : (svg?.closest('button') || svg || closeButton);
            if (target && typeof target.click === 'function') {
                target.click();
            } else if (target) {
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
        });
        await page.waitForFunction(() => {
            const isVisible = (el) =>
                el && el.offsetParent !== null &&
                window.getComputedStyle(el).visibility !== 'hidden' &&
                window.getComputedStyle(el).display !== 'none';
            const modal = Array.from(document.querySelectorAll('.modal-container'))
                .find(el => isVisible(el));
            return !modal;
        }, { timeout: 8000 }).catch(() => {});
    };
    
    const total = await getCandidateCount();
    if (total === 0) return results;
    
    for (let i = 0; i < total; i++) {
        const clicked = await clickCandidateAt(i);
        if (!clicked) continue;
        const opened = await waitForModalVisible();
        if (!opened) continue;
        const modal = await extractModal();
        if (modal && modal.html && modal.text) {
            const signature = `${modal.title || ''}:${modal.text.slice(0, 200)}`;
            if (!seen.has(signature)) {
                seen.add(signature);
                results.push(modal);
            }
        }
        await closeModal();
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    return results;
}

/**
 * Извлекает шаги процедуры на странице procedure_admission_work
 */
async function extractAdmissionWorkSteps(page) {
    return page.evaluate(() => {
        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
        const steps = Array.from(document.querySelectorAll('.admission-work-step')).map((el, index) => {
            const numberEl = el.querySelector('.admission-work-step-number, [class*="step-number"]');
            const titleEl = el.querySelector('.admission-work-step-title, [class*="step-title"]');
            const linkEl = el.querySelector('.admission-work-step-link, a, button, span');
            const number = normalize(numberEl ? numberEl.textContent : '');
            const title = normalize(titleEl ? titleEl.textContent : el.textContent);
            const hasMore = /Подробнее/i.test(linkEl?.textContent || '');
            return {
                index: index + 1,
                number,
                title,
                hasMore
            };
        });
        return steps;
    });
}

async function extractProcedureForms(page) {
    return page.evaluate(() => {
        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
        const candidates = Array.from(document.querySelectorAll('form, [class*="form"], [class*="Form"]'))
            .filter(el => el.querySelector('input, textarea, select, button'));
        const unique = [];
        const seen = new Set();
        candidates.forEach(el => {
            const text = normalize(el.textContent || '');
            const signature = `${el.tagName}:${text.slice(0, 120)}`;
            if (!seen.has(signature)) {
                seen.add(signature);
                unique.push(el);
            }
        });
        return unique.map((formEl, index) => {
            const titleEl = formEl.querySelector('h1, h2, h3, h4, [class*="title"], [class*="header"]');
            const title = normalize(titleEl ? titleEl.textContent : '');
            const fields = Array.from(formEl.querySelectorAll('input, textarea, select')).map(field => {
                const labelEl = field.closest('label') || formEl.querySelector(`label[for="${field.id}"]`);
                const label = normalize(labelEl ? labelEl.textContent : '');
                return {
                    type: field.tagName.toLowerCase(),
                    name: field.getAttribute('name') || '',
                    placeholder: field.getAttribute('placeholder') || '',
                    label
                };
            });
            const buttons = Array.from(formEl.querySelectorAll('button, [role="button"], input[type="submit"]'))
                .map(btn => normalize(btn.textContent || btn.getAttribute('value') || ''))
                .filter(Boolean);
            return {
                index: index + 1,
                title,
                fields,
                buttons
            };
        });
    });
}

async function extractSelectOptions(page, outputDir, safeSlug) {
    const results = [];
    const seen = new Set();
    let screenshotIndex = 1;
    const triggers = await page.$$(
        'select, .input-item--select, .input-item.input-item--select, .select-item-text, [role="combobox"], [aria-haspopup="listbox"]'
    );

    for (const trigger of triggers) {
        const meta = await page.evaluate(el => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const wrapper =
                el.closest('.input-wrapper') ||
                el.closest('[class*="input-wrapper"]') ||
                el.closest('[class*="form"]') ||
                el.parentElement;
            const labelEl =
                el.closest('label') ||
                (wrapper ? wrapper.querySelector('label, .input-label, [class*="label"]') : null);
            const label = normalize(labelEl ? labelEl.textContent : '');
            const name = normalize(el.getAttribute?.('name') || el.getAttribute?.('id') || '');
            const placeholder = normalize(
                el.querySelector?.('.select-item-placeholder')?.textContent ||
                el.getAttribute?.('placeholder') ||
                ''
            );
            return {
                tag: (el.tagName || '').toLowerCase(),
                label,
                name,
                placeholder
            };
        }, trigger);

        const key = `${meta.label}|${meta.name}|${meta.placeholder}`;
        if (seen.has(key)) continue;

        let options = [];
        if (meta.tag === 'select') {
            options = await page.evaluate(el => {
                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                return Array.from(el.options || [])
                    .map(opt => normalize(opt.textContent))
                    .filter(Boolean);
            }, trigger);
        } else {
            await trigger.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
            await trigger.click({ delay: 30 });
            await new Promise(resolve => setTimeout(resolve, 300));

            options = await page.evaluate(() => {
                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                const optionCandidates = Array.from(document.querySelectorAll(
                    '[role="option"], .select-list-item, [class*="select-list-item"], .input-list-item, [class*="input-list-item"], .dropdown-item, [class*="dropdown-item"]'
                ));
                return optionCandidates
                    .map(el => normalize(el.textContent))
                    .filter(text => text && text.length < 120);
            });

            const screenshotBase64 = await page.screenshot({ encoding: 'base64', type: 'png' });
            const screenshotPath = saveLLMScreenshot(outputDir, safeSlug, `select_${screenshotIndex}`, screenshotBase64);
            screenshotIndex += 1;

            await trigger.click({ delay: 30 });
            await new Promise(resolve => setTimeout(resolve, 200));

            if (options.length > 0) {
                results.push({
                    label: meta.label,
                    name: meta.name,
                    placeholder: meta.placeholder,
                    options,
                    screenshot: screenshotPath ? path.basename(screenshotPath) : ''
                });
                seen.add(key);
            }
            continue;
        }

        if (options.length > 0) {
            results.push({
                label: meta.label,
                name: meta.name,
                placeholder: meta.placeholder,
                options
            });
            seen.add(key);
        }
    }

    return results;
}

async function extractProcedureExtraBlocks(page) {
    return page.evaluate(() => {
        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
        const collectLinks = (root) => Array.from(root.querySelectorAll('a'))
            .map(link => ({
                text: normalize(link.textContent || ''),
                href: link.getAttribute('href') || ''
            }))
            .filter(link => link.text || link.href);

        const blocks = [];
        const formCard = document.querySelector('.secondary-background-card-32');
        if (formCard) {
            const links = collectLinks(formCard);
            const title = links.length > 0 ? links[0].text : '';
            blocks.push({
                type: 'notice',
                title,
                text: normalize(formCard.textContent || ''),
                links,
                html: formCard.outerHTML || ''
            });
        }

        const contactBanner = document.querySelector('.contact-banner-container');
        if (contactBanner) {
            const titleEl = contactBanner.querySelector('h2, h3, h4');
            const tags = Array.from(contactBanner.querySelectorAll('.tag-box-item'))
                .map(tag => normalize(tag.textContent || ''))
                .filter(Boolean);
            const links = collectLinks(contactBanner);
            blocks.push({
                type: 'contact-banner',
                title: normalize(titleEl ? titleEl.textContent : ''),
                text: '',
                tags,
                links,
                html: contactBanner.outerHTML || ''
            });
        }

        return blocks;
    });
}

function buildProcedureModalCards(modalContents) {
    const { JSDOM } = require('jsdom');
    return modalContents.map((modal, index) => {
        const dom = new JSDOM(modal.html || '');
        const doc = dom.window.document;
        const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
        const title =
            normalize(doc.querySelector('h1, h2, h3, [class*="title"]')?.textContent || '') ||
            normalize(modal.title || '');
        const paragraphs = Array.from(doc.querySelectorAll('p'))
            .map(p => normalize(p.textContent))
            .filter(Boolean);
        const lists = Array.from(doc.querySelectorAll('ul, ol')).map(list => ({
            type: list.tagName.toLowerCase(),
            items: Array.from(list.querySelectorAll('li'))
                .map(li => normalize(li.textContent))
                .filter(Boolean)
        })).filter(list => list.items.length > 0);
        const links = Array.from(doc.querySelectorAll('a[href]')).map(a => ({
            text: normalize(a.textContent),
            href: a.getAttribute('href') || ''
        })).filter(link => link.text || link.href);
        const text = normalize(modal.text || paragraphs.join('\n'));
        return {
            stepIndex: index + 1,
            title: title || `Шаг ${index + 1}`,
            text,
            paragraphs,
            lists,
            links,
            html: modal.html || ''
        };
    });
}

/**
 * Извлекает скриншот страницы в base64
 */
async function getScreenshotBase64(page) {
    const screenshot = await page.screenshot({ 
        fullPage: true, 
        encoding: 'base64' 
    });
    return screenshot;
}

/**
 * Получает скриншот конкретного элемента по тексту заголовка
 */
async function getChunkScreenshot(page, headingText, occurrence = 1, options = {}) {
    try {
        // Находим элемент заголовка на странице
        const selectors = Array.isArray(options.selectors) && options.selectors.length > 0
            ? options.selectors
            : ['h1', 'h2', 'h3', 'h4'];
        const elementInfo = await page.evaluate((headingText, occurrence, selectors, fullWidth, useCardBackground, sectionBySelector, exactMatch) => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const headings = Array.from(document.querySelectorAll(selectors.join(',')));
            const targetText = normalize(headingText);
            const exactMatches = headings.filter(h => normalize(h.textContent) === targetText);
            const fuzzyMatches = headings.filter(h => {
                const text = normalize(h.textContent);
                if (!text) return false;
                const headingWords = targetText.split(/\s+/).filter(w => w.length > 3);
                const textWords = text.split(/\s+/).filter(w => w.length > 3);
                return headingWords.some(w => text.includes(w)) || textWords.some(w => targetText.includes(w));
            });
            const matches = (exactMatch && exactMatches.length > 0) ? exactMatches : fuzzyMatches;
            const desiredIndex = Math.max(0, (occurrence || 1) - 1);
            if (desiredIndex >= matches.length) return null;
            const heading = matches[desiredIndex];
            if (!heading) return null;

            const allHeadings = Array.from(document.querySelectorAll(selectors.join(',')));
            const currentIndex = allHeadings.indexOf(heading);
            const rawHeadingLevel = parseInt(heading.tagName.charAt(1), 10);
            const headingLevel = Number.isNaN(rawHeadingLevel) ? 1 : rawHeadingLevel;

            let nextHeading = null;
            for (let i = currentIndex + 1; i < allHeadings.length; i++) {
                const next = allHeadings[i];
                if (sectionBySelector) {
                    nextHeading = next;
                    break;
                }
                const rawNextLevel = parseInt(next.tagName.charAt(1), 10);
                const nextLevel = Number.isNaN(rawNextLevel) ? headingLevel : rawNextLevel;
                if (nextLevel <= headingLevel) {
                    nextHeading = next;
                    break;
                }
            }

            const rect = heading.getBoundingClientRect();
            const scrollY = window.scrollY;
            let endY = window.innerHeight + scrollY;
            if (nextHeading) {
                const nextRect = nextHeading.getBoundingClientRect();
                endY = nextRect.top + scrollY;
            }

            const findCardContainer = () => {
                if (!useCardBackground) return null;
                const candidates = heading
                    .closest('[class*="card"], .card, [class*="tile"], [class*="item"], [class*="benefit"], [class*="advantage"], [class*="tariff"]');
                if (!candidates) return null;
                const style = window.getComputedStyle(candidates);
                const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== 'none';
                const bgColor = style.backgroundColor || '';
                const hasBackgroundColor = !/rgba?\(0,\s*0,\s*0,\s*0\)/i.test(bgColor);
                if (!hasBackgroundImage && !hasBackgroundColor) return null;
                return candidates;
            };
            const card = findCardContainer();
            const targetRect = card ? card.getBoundingClientRect() : rect;
            const cardHeight = card ? targetRect.height + 40 : null;
            let x = targetRect.left;
            let width = targetRect.width;
            let y = targetRect.top + scrollY;
            let height = Math.max(100, endY - y);

            if (card) {
                x = targetRect.left;
                width = targetRect.width;
                y = targetRect.top + scrollY - 20;
                height = cardHeight || height;
            }
            if (fullWidth) {
                x = 0;
                width = window.innerWidth;
            }
            return { x, y, width, height, found: true };
        }, headingText, occurrence, selectors, !!options.fullWidth, !!options.useCardBackground, !!options.sectionBySelector, !!options.exactMatch);
        
        if (!elementInfo || !elementInfo.found) {
            return null;
        }
        
        // Прокручиваем к элементу
        const scrollY = Math.max(0, elementInfo.y - 80);
        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        await page.waitForFunction((y) => Math.abs(window.scrollY - y) < 2, {}, scrollY).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 300));

        // Пересчитываем координаты после прокрутки (в координатах страницы)
        const clipInfo = await page.evaluate((headingText, occurrence, selectors, fullWidth, useCardBackground, sectionBySelector, exactMatch) => {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const headings = Array.from(document.querySelectorAll(selectors.join(',')));
            const targetText = normalize(headingText);
            const exactMatches = headings.filter(h => normalize(h.textContent) === targetText);
            const fuzzyMatches = headings.filter(h => {
                const text = normalize(h.textContent);
                if (!text) return false;
                const headingWords = targetText.split(/\s+/).filter(w => w.length > 3);
                const textWords = text.split(/\s+/).filter(w => w.length > 3);
                return headingWords.some(w => text.includes(w)) || textWords.some(w => targetText.includes(w));
            });
            const matches = (exactMatch && exactMatches.length > 0) ? exactMatches : fuzzyMatches;
            const desiredIndex = Math.max(0, (occurrence || 1) - 1);
            if (desiredIndex >= matches.length) return null;
            const heading = matches[desiredIndex];
            if (!heading) return null;

            const allHeadings = Array.from(document.querySelectorAll(selectors.join(',')));
            const currentIndex = allHeadings.indexOf(heading);
            const rawHeadingLevel = parseInt(heading.tagName.charAt(1), 10);
            const headingLevel = Number.isNaN(rawHeadingLevel) ? 1 : rawHeadingLevel;

            let nextHeading = null;
            for (let i = currentIndex + 1; i < allHeadings.length; i++) {
                const next = allHeadings[i];
                if (sectionBySelector) {
                    nextHeading = next;
                    break;
                }
                const rawNextLevel = parseInt(next.tagName.charAt(1), 10);
                const nextLevel = Number.isNaN(rawNextLevel) ? headingLevel : rawNextLevel;
                if (nextLevel <= headingLevel) {
                    nextHeading = next;
                    break;
                }
            }

            const rect = heading.getBoundingClientRect();
            const scrollY = window.scrollY;
            let endY = window.innerHeight + scrollY;
            if (nextHeading) {
                const nextRect = nextHeading.getBoundingClientRect();
                endY = nextRect.top + scrollY;
            }

            const findCardContainer = () => {
                if (!useCardBackground) return null;
                const candidates = heading
                    .closest('[class*="card"], .card, [class*="tile"], [class*="item"], [class*="benefit"], [class*="advantage"], [class*="tariff"]');
                if (!candidates) return null;
                const style = window.getComputedStyle(candidates);
                const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== 'none';
                const bgColor = style.backgroundColor || '';
                const hasBackgroundColor = !/rgba?\(0,\s*0,\s*0,\s*0\)/i.test(bgColor);
                if (!hasBackgroundImage && !hasBackgroundColor) return null;
                return candidates;
            };
            const card = findCardContainer();
            const targetRect = card ? card.getBoundingClientRect() : rect;
            const cardHeight = card ? targetRect.height + 40 : null;
            let x = targetRect.left;
            let width = targetRect.width;
            let y = targetRect.top + scrollY;
            let height = Math.max(100, endY - y);

            if (card) {
                x = targetRect.left;
                width = targetRect.width;
                y = targetRect.top + scrollY - 20;
                height = cardHeight || height;
            }
            if (fullWidth) {
                x = 0;
                width = window.innerWidth;
            }
            return { x: Math.max(0, x), y: Math.max(0, y), width, height };
        }, headingText, occurrence, selectors, !!options.fullWidth, !!options.useCardBackground, !!options.sectionBySelector, !!options.exactMatch);
        
        if (!clipInfo || clipInfo.height < 80 || clipInfo.width < 80) {
            return null;
        }
        
        // Делаем скриншот области
        const screenshot = await page.screenshot({
            encoding: 'base64',
            type: 'png',
            clip: clipInfo,
            captureBeyondViewport: true,
            ...(options.fullPageClip ? { fullPage: true } : {})
        });
        
        return screenshot;
    } catch (error) {
        console.warn(`   ⚠️  Не удалось сделать скриншот фрагмента "${headingText}": ${error.message}`);
        return null;
    }
}

async function getScrollChunkScreenshot(page, index, total) {
    try {
        const scrollInfo = await page.evaluate((idx, count) => {
            const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
            const ratio = count > 1 ? idx / (count - 1) : 0;
            return { y: Math.floor(maxScroll * ratio) };
        }, index, total);
        await page.evaluate((y) => window.scrollTo(0, y), scrollInfo.y);
        await new Promise(resolve => setTimeout(resolve, 500));
        const screenshot = await page.screenshot({ encoding: 'base64', type: 'png' });
        return screenshot;
    } catch (error) {
        console.warn(`   ⚠️  Не удалось сделать скриншот прокрутки: ${error.message}`);
        return null;
    }
}

/**
 * Разбивает длинную страницу на части по секциям (h2, h3)
 */
function splitPageIntoChunks(htmlContent, textContent, maxChunkSize = 40000) {
    console.log(`   🔧 Начало разбиения страницы на части...`);
    console.log(`      Размер HTML: ${(htmlContent.length / 1024).toFixed(1)} KB`);
    console.log(`      Размер текста: ${(textContent.length / 1024).toFixed(1)} KB`);
    console.log(`      Максимальный размер части: ${(maxChunkSize / 1024).toFixed(1)} KB`);
    
    // Упрощенная версия: разбиваем по заголовкам h2, h3, h4 через регулярные выражения
    // Это быстрее и надежнее, чем парсинг через JSDOM
    console.log(`   🔍 Поиск заголовков в HTML...`);
    const headingRegex = /<(h[1-4])[^>]*>(.*?)<\/\1>/gi;
    const headings = [];
    const headingOccurrences = new Map();
    let match;
    let regexIterations = 0;
    const MAX_REGEX_ITERATIONS = 1000; // Защита от бесконечного цикла
    
    // Отслеживаем уже найденные заголовки, чтобы избежать дубликатов
    const seenHeadings = new Set();
    
    while ((match = headingRegex.exec(htmlContent)) !== null && regexIterations < MAX_REGEX_ITERATIONS) {
        regexIterations++;
        const tag = match[1];
        const text = match[2].replace(/<[^>]+>/g, '').trim();
        if (text.length > 0 && text.length < 200) {
            // Создаем уникальный ключ для заголовка (текст + приблизительная позиция)
            // Если заголовок с таким же текстом уже найден близко, пропускаем его
            const headingKey = `${text}|${Math.floor(match.index / 1000)}`;
            
            // Проверяем, не является ли это дубликатом (тот же текст на близкой позиции)
            const isDuplicate = Array.from(seenHeadings).some(seenKey => {
                const [seenText, seenPos] = seenKey.split('|');
                const posDiff = Math.abs(parseInt(seenPos) - Math.floor(match.index / 1000));
                return seenText === text && posDiff < 2; // Если тот же текст в пределах 2KB, считаем дубликатом
            });
            
            if (!isDuplicate) {
                seenHeadings.add(headingKey);
                const occurrence = (headingOccurrences.get(text) || 0) + 1;
                headingOccurrences.set(text, occurrence);
                headings.push({
                    tag: tag,
                    text: text,
                    index: match.index,
                    fullMatch: match[0],
                    occurrence
                });
            }
        }
    }
    
    if (regexIterations >= MAX_REGEX_ITERATIONS) {
        console.warn(`   ⚠️  Превышен лимит итераций поиска заголовков (${MAX_REGEX_ITERATIONS}), используем простое разбиение`);
    }
    
    console.log(`      Найдено заголовков: ${headings.length}`);
    
    // Логируем первые несколько заголовков для отладки
    if (headings.length > 0) {
        console.log(`      Первые заголовки: ${headings.slice(0, 5).map(h => `"${h.text.substring(0, 40)}"`).join(', ')}`);
    }
    
    // Если заголовков мало или нет, разбиваем просто по размеру
    if (headings.length < 2) {
        console.log(`   📦 Недостаточно заголовков, разбиваем по размеру...`);
        if (htmlContent.length <= maxChunkSize) {
            console.log(`      Страница помещается в одну часть`);
            return [{ html: htmlContent, text: textContent, title: 'Весь контент' }];
        }
        
        const chunks = [];
        const numChunks = Math.ceil(htmlContent.length / maxChunkSize);
        const chunkSize = Math.ceil(htmlContent.length / numChunks);
        console.log(`      Создаем ${numChunks} частей по ${(chunkSize / 1024).toFixed(1)} KB`);
        
        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, htmlContent.length);
            const chunkHtml = htmlContent.substring(start, end);
            const textStart = Math.floor(start * textContent.length / htmlContent.length);
            const textEnd = Math.floor(end * textContent.length / htmlContent.length);
            const chunkText = textContent.substring(textStart, textEnd);
            
            chunks.push({
                html: chunkHtml,
                text: chunkText,
                title: `Часть ${i + 1} из ${numChunks}`,
                tag: '',
                occurrence: 1
            });
            console.log(`      ✓ Часть ${i + 1}/${numChunks}: ${(chunkHtml.length / 1024).toFixed(1)} KB`);
        }
        console.log(`   ✅ Разбиение завершено: ${chunks.length} частей`);
        return chunks;
    }
    
    // Разбиваем по заголовкам
    console.log(`   📦 Разбиваем по заголовкам...`);
    const chunks = [];
    
    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        
        const start = heading.index;
        const end = nextHeading ? nextHeading.index : htmlContent.length;
        
        let chunkHtml = htmlContent.substring(start, end);
        
        // Если часть слишком большая, разбиваем её на подчасти
        // Используем меньший порог для подчастей (20KB), чтобы избежать обрезания JSON
        const subChunkThreshold = Math.min(maxChunkSize, 20000); // 20KB для подчастей
        if (chunkHtml.length > subChunkThreshold) {
            console.log(`      ⚠️  Часть "${heading.text}" слишком большая (${(chunkHtml.length / 1024).toFixed(1)} KB), разбиваем на подчасти...`);
            const subChunks = [];
            const numSubChunks = Math.ceil(chunkHtml.length / subChunkThreshold);
            const subChunkSize = Math.ceil(chunkHtml.length / numSubChunks);
            
            for (let j = 0; j < numSubChunks; j++) {
                const subStart = j * subChunkSize;
                const subEnd = Math.min(subStart + subChunkSize, chunkHtml.length);
                const subChunkHtml = chunkHtml.substring(subStart, subEnd);
                
                subChunks.push({
                    html: subChunkHtml,
                    text: textContent.substring(
                        Math.floor(start * textContent.length / htmlContent.length),
                        Math.floor(end * textContent.length / htmlContent.length)
                    ).substring(
                        Math.floor(subStart * textContent.length / htmlContent.length),
                        Math.floor(subEnd * textContent.length / htmlContent.length)
                    ),
                    title: j === 0 ? heading.text : `${heading.text} (продолжение ${j + 1})`,
                    tag: heading.tag || '',
                    occurrence: heading.occurrence || 1
                });
            }
            
            chunks.push(...subChunks);
            console.log(`      ✓ Разбито на ${numSubChunks} подчасти`);
            continue;
        }
        
        // Приблизительно вычисляем позицию в тексте
        const textStart = Math.floor(start * textContent.length / htmlContent.length);
        const textEnd = nextHeading ? Math.floor(end * textContent.length / htmlContent.length) : textContent.length;
        const chunkText = textContent.substring(textStart, textEnd);
        
        // Добавляем обычную часть (если она не была разбита выше на подчасти)
        chunks.push({
            html: chunkHtml,
            text: chunkText,
            title: heading.text,
            tag: heading.tag || '',
            occurrence: heading.occurrence || 1
        });
        console.log(`      ✓ Секция "${heading.text.substring(0, 50)}...": ${(chunkHtml.length / 1024).toFixed(1)} KB`);
    }
    
    console.log(`   ✅ Разбиение завершено: ${chunks.length} частей`);
    return chunks.length > 0 ? chunks : [{ html: htmlContent, text: textContent, title: 'Весь контент' }];
}

/**
 * Разбивает страницу на части по заголовкам h1
 */
function splitPageIntoChunksByH1(htmlContent, textContent, maxChunkSize = 40000) {
    console.log(`   🔧 Разбиение по H1...`);
    const headingRegex = /<(h1)\b[^>]*>([\s\S]*?)<\/\1>|<div\b[^>]*class="[^"]*title-promo-long__title-text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const headings = [];
    let match;
    const headingOccurrences = new Map();
    const seenHeadings = new Set();

    while ((match = headingRegex.exec(htmlContent)) !== null) {
        const rawText = match[2] || match[3] || '';
        const tag = match[1] ? 'h1' : 'div.title-promo-long__title-text';
        const text = rawText.replace(/<[^>]+>/g, '').trim();
        if (text.length === 0 || text.length > 200) continue;
        const headingKey = `${text}|${Math.floor(match.index / 1000)}`;
        if (seenHeadings.has(headingKey)) continue;
        seenHeadings.add(headingKey);
        const occurrence = (headingOccurrences.get(text) || 0) + 1;
        headingOccurrences.set(text, occurrence);
        headings.push({
            tag,
            text,
            index: match.index,
            fullMatch: match[0],
            occurrence
        });
    }

    if (headings.length < 2) {
        console.log(`   ⚠️  Недостаточно H1, используем стандартное разбиение`);
        return splitPageIntoChunks(htmlContent, textContent, maxChunkSize);
    }

    const chunks = [];
    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        const start = heading.index;
        const end = nextHeading ? nextHeading.index : htmlContent.length;
        const chunkHtml = htmlContent.substring(start, end);
        const textStart = Math.floor(start * textContent.length / htmlContent.length);
        const textEnd = nextHeading ? Math.floor(end * textContent.length / htmlContent.length) : textContent.length;
        const chunkText = textContent.substring(textStart, textEnd);
        chunks.push({
            html: chunkHtml,
            text: chunkText,
            title: heading.text,
            tag: heading.tag || 'h1',
            occurrence: heading.occurrence || 1
        });
        console.log(`      ✓ H1 секция "${heading.text.substring(0, 50)}...": ${(chunkHtml.length / 1024).toFixed(1)} KB`);
    }
    console.log(`   ✅ Разбиение по H1 завершено: ${chunks.length} частей`);
    return chunks;
}

/**
 * Вызывает LLM для анализа страницы (режим: скриншот + HTML)
 */
async function analyzeWithLLMScreenshot(
    screenshotBase64,
    htmlContent,
    textContent,
    pageUrl,
    tabsFileLinksData = null,
    tabsContentData = null,
    selectOptionsData = null,
    chunkMeta = null
) {
    // Формируем JSON данные для промпта
    let jsonDataSection = '';
    
    // Объединяем fileLinks и текстовый контент табов
    const combinedTabsData = {};
    if (tabsFileLinksData) {
        Object.keys(tabsFileLinksData).forEach(tabName => {
            if (!combinedTabsData[tabName]) {
                combinedTabsData[tabName] = {};
            }
            combinedTabsData[tabName].fileLinks = tabsFileLinksData[tabName];
        });
    }
    if (tabsContentData) {
        Object.keys(tabsContentData).forEach(tabName => {
            if (!combinedTabsData[tabName]) {
                combinedTabsData[tabName] = {};
            }
            combinedTabsData[tabName].text = tabsContentData[tabName].text;
        });
    }
    
    if (Object.keys(combinedTabsData).length > 0) {
        const jsonData = JSON.stringify(combinedTabsData, null, 2);
        jsonDataSection = `

═══════════════════════════════════════════════════════════
ДАННЫЕ ИЗ JSON (ИСПОЛЬЗУЙ ЭТИ ДАННЫЕ ДЛЯ ДИНАМИЧЕСКИХ ЭЛЕМЕНТОВ):
═══════════════════════════════════════════════════════════

Ниже приведен JSON с извлеченными данными для каждого таба:
- fileLinks: массив ссылок на файлы (если есть)
- text: текстовый контент таба (если есть)

КРИТИЧЕСКИ ВАЖНО: 
- Используй эти данные для заполнения fileLinks в структуре табов
- Используй текстовый контент (поле "text") для заполнения поля "text" в content каждого таба
- НЕ пытайся извлекать эти данные из HTML комментариев - используй готовые данные из JSON!

${jsonData}

═══════════════════════════════════════════════════════════
КОНЕЦ JSON ДАННЫХ
═══════════════════════════════════════════════════════════

`;
    }

    if (selectOptionsData && Array.isArray(selectOptionsData) && selectOptionsData.length > 0) {
        const selectJson = JSON.stringify(selectOptionsData, null, 2);
        jsonDataSection = `${jsonDataSection}

═══════════════════════════════════════════════════════════
ДАННЫЕ ПО SELECT (варианты выпадающих списков):
═══════════════════════════════════════════════════════════
Ниже список полей селекта и все варианты, полученные после клика.
Если в форме есть поле типа select, используй эти варианты и НЕ придумывай новые.

${selectJson}

═══════════════════════════════════════════════════════════
КОНЕЦ ДАННЫХ SELECT
═══════════════════════════════════════════════════════════
`;
    }
    
    const prompt = `Ты - эксперт по анализу веб-страниц и созданию технических заданий для разработки. Проанализируй скриншот страницы, HTML код и JSON данные, чтобы создать детальное техническое задание (ТЗ) для разработки новой HTML страницы.

URL страницы: ${pageUrl}

ВАЖНО: Игнорируй меню (header) и футер (footer) - анализируй только основной контент страницы.

КРИТИЧЕСКИ ВАЖНО ДЛЯ БОКОВОГО МЕНЮ (SIDEBAR):
- Если на странице есть боковое меню (sidebar, боковая навигация, навигационное меню), ОБЯЗАТЕЛЬНО создай для него отдельную секцию с типом "sidebar"
- В секции sidebar ОБЯЗАТЕЛЬНО извлеки ВСЕ ссылки из бокового меню в поле links.internalLinks
- Для каждой ссылки в sidebar укажи:
  * text: точный текст ссылки из HTML
  * href: полный URL ссылки (относительный или абсолютный путь)
  * purpose: назначение ссылки (куда ведет, какой раздел представляет)
- Опиши структуру бокового меню: какие разделы есть, какие подразделы, какой раздел активен
- Если в sidebar есть вложенные элементы (подменю, подразделы), опиши их структуру
- НЕ оставляй links.internalLinks пустым для секции sidebar - это критически важно для навигации!

У тебя есть ТРИ источника информации:
1. Скриншот страницы - визуальное представление того, как выглядит страница
2. HTML код страницы - структура и текстовое содержание
3. JSON данные (если есть) - извлеченные fileLinks для динамических элементов (табов)

Используй ВСЕ источники для максимально точного анализа:
${jsonDataSection}
- Скриншот показывает визуальную структуру, расположение элементов, стили
- HTML код содержит точные тексты, структуру, интерактивные элементы, ВСЕ ссылки (href), ВСЕ изображения (src), ВСЕ файлы
- Сопоставляй информацию из обоих источников для полного понимания
- КРИТИЧЕСКИ ВАЖНО: извлекай все ссылки, изображения и файлы из HTML кода - они нужны для разработки

КРИТИЧЕСКИ ВАЖНО: НЕ ВЫДУМЫВАЙ ДАННЫЕ
- НЕ добавляй факты, цифры, цены, пункты меню, карточки или списки, которых нет в скриншоте, HTML или JSON.
- Если элемент не подтвержден источниками, НЕ включай его в результат.
- Не пытайся «догадаться» или заполнять пропуски — лучше пропустить, чем выдумать.
- НЕ создавай пустые секции: если у секции нет заголовка, описания и текста — НЕ добавляй ее вообще.
- НЕ создавай пустые карточки/таблицы/тарифы/таб-контент: если данных нет — не добавляй структуру.

Задача:
1. Раздели страницу на тематические блоки (сверху вниз), анализируя визуальную структуру и смысловое содержание
2. Для каждого блока опиши:
   - description: общее описание блока (назначение, функция, что он показывает пользователю, какую роль играет на странице)
   - section title: заголовок секции (если есть, точный текст как на скриншоте)
   - section text: текст секции (основное содержание, подзаголовки, описания, точные формулировки)
   - Если в секции есть нестандартные элементы (карточки, табы, слайдеры, показатели, кнопки), опиши их структуру и содержимое подобным образом

3. Для интерактивных элементов (табы, слайдеры, аккордеоны):
   - Опиши все варианты контента, которые доступны при переключении
   - Укажи структуру каждого варианта (заголовки, тексты, изображения)
   - Опиши визуальное состояние активного/неактивного элемента
   - Для табов: КРИТИЧЕСКИ ВАЖНО - опиши КАЖДЫЙ таб отдельно с его полным содержимым:
   - КРИТИЧЕСКИ ВАЖНО ДЛЯ МНОГОУРОВНЕВЫХ ТАБОВ:
     * Если на странице есть несколько уровней табов (например, первый уровень: "Документы для физических лиц" / "Документы для юридических лиц", второй уровень: "МГТС" / "МТС HOME" / "Заключение/расторжение договора"), то документы должны быть сгруппированы по КОМБИНАЦИЯМ табов, а не по отдельным табам!
     * Например: "Документы для физических лиц" + "МГТС" = одна группа документов, "Документы для физических лиц" + "МТС HOME" = другая группа документов
     * НЕ дублируй документы - каждый документ должен быть только в одной комбинации табов!
     * Если видишь, что документы повторяются в разных табах, это означает, что они относятся к разным комбинациям табов первого и второго уровня
     * Структурируй табы так: первый уровень табов содержит вложенные табы второго уровня, и каждый таб второго уровня содержит свои документы
     * ПРИМЕР ПРАВИЛЬНОЙ СТРУКТУРЫ:
       {
         "type": "tabs",
         "tabs": [
           {
             "title": "Документы для физических лиц",
             "tabs": [
               {
                 "title": "МГТС",
                 "content": {
                   "fileLinks": [/* документы для физ. лиц + МГТС */]
                 }
               },
               {
                 "title": "МТС HOME",
                 "content": {
                   "fileLinks": [/* документы для физ. лиц + МТС HOME */]
                 }
               }
             ]
           },
           {
             "title": "Документы для юридических лиц",
             "tabs": [
               {
                 "title": "Заключение/расторжение договора",
                 "content": {
                   "fileLinks": [/* документы для юр. лиц + Заключение/расторжение */]
                 }
               }
             ]
           }
         ]
       }
     * КРИТИЧЕСКИ ВАЖНО: Используй JSON данные из раздела "ДАННЫЕ ИЗ JSON" (выше в этом промпте) для извлечения fileLinks для табов!
     * ПРОЦЕСС ИЗВЛЕЧЕНИЯ (ВЫПОЛНИ ЭТО ДЛЯ КАЖДОГО ТАБА):
       1. Сначала найди раздел "ДАННЫЕ ИЗ JSON" в этом промпте - там есть структурированные данные с fileLinks для каждого таба
       2. Для КАЖДОГО таба из JSON данных:
          - Найди ключ с названием таба (например, "Внутренние документы", "Положения о Комитетах Совета директоров ПАО МГТС" и т.д.)
          - Используй массив fileLinks из JSON данных для этого таба - это уже извлеченные и структурированные данные
          - Для каждого fileLink из JSON создай объект в массиве fileLinks результата:
            {
              "text": "текст из JSON (поле text)",
              "href": "URL из JSON (поле href)",
              "fileType": "тип файла из JSON (поле fileType)",
              "purpose": "назначение файла (опиши что это за документ на основе текста)"
            }
       3. Если для таба нет данных в JSON разделе, тогда используй HTML код из комментариев <!-- ALL_TABS_CONTENT_START --> в HTML
       4. Сопоставь данные из JSON с названиями табов (title) из визуального представления на скриншоте
     * Для КАЖДОГО таба (активного и неактивного) создай полную структуру:
       - title: точный текст таба (из скриншота или HTML)
       - text: ТЕКСТ КОНТЕНТА ТАБА - КРИТИЧЕСКИ ВАЖНО: используй поле "text" из JSON данных (раздел "ДАННЫЕ ИЗ JSON") для этого таба! Если в JSON есть поле "text" для таба, используй его полностью, а НЕ пиши "не предоставлено"!
       - links.fileLinks: МАССИВ ВСЕХ файлов из JSON данных (раздел "ДАННЫЕ ИЗ JSON") - НЕ ПУСТОЙ МАССИВ, А ПОЛНЫЙ СПИСОК ФАЙЛОВ!
       - links.internalLinks: внутренние ссылки (извлеки из HTML)
       - links.externalLinks: внешние ссылки (извлеки из HTML)
       - links.imageLinks: ссылки на изображения (извлеки из HTML)
     * КРИТИЧЕСКИ ВАЖНО: 
       - ПРИОРИТЕТ: Используй JSON данные (раздел "ДАННЫЕ ИЗ JSON") для fileLinks И для текстового контента (поле "text")!
       - Если в JSON есть поле "text" для таба, используй его для заполнения content.text - это уже извлеченный и очищенный текстовый контент!
       - НЕ пиши "не предоставлено" или "не видно на скриншоте", если в JSON есть поле "text" с контентом!
       - НЕ пропускай fileLinks для неактивных табов! Если в JSON есть данные для таба, используй их!
       - НЕ оставляй fileLinks пустым массивом, если в JSON разделе есть данные для этого таба!
       - Если в JSON разделе для таба "Внутренние документы" есть 17 fileLinks, то в результате должно быть 17 объектов в массиве fileLinks!
       - Если в JSON разделе для таба "Положения о Комитетах..." есть 3 fileLinks, то в результате должно быть 3 объекта в массиве fileLinks!
       - Если в JSON разделе для таба "Свидетельства о регистрации..." есть 3 fileLinks, то в результате должно быть 3 объекта в массиве fileLinks!
       - ПРИМЕР: Если в JSON есть {"1946 — 1989": {"text": "1953: Запрещено вводить в эксплуатацию..."}}, то в content.text для таба "1946 — 1989" должен быть этот текст, а НЕ "не предоставлено"!
   - Для слайдеров: ОБЯЗАТЕЛЬНО опиши все слайды/карточки в поле "cards" секции с их заголовками (title) и текстами (text). Слайдер - это способ отображения карточек, поэтому карточки должны быть полностью описаны в поле "cards" с заголовками и текстами!
   - Для аккордеонов: опиши каждый элемент аккордеона отдельно
   - КРИТИЧЕСКИ ВАЖНО - различение табов и слайдеров:
     * ТАБЫ: Если в секции есть табы (переключатели с заголовками, при клике меняется контент, показывается только один таб), то карточки внутри табов НЕ должны дублироваться в поле "cards" секции. Карточки внутри табов должны быть описаны только в поле "tabs[].content". ОБЯЗАТЕЛЬНО извлеки содержимое ВСЕХ табов, включая fileLinks для каждого таба!
     * СЛАЙДЕРЫ/КАРУСЕЛИ: Если в секции есть слайдер или карусель (карточки прокручиваются/переключаются, но все карточки доступны и видны при переключении), то карточки ДОЛЖНЫ быть в поле "cards" секции с их заголовками и текстами. Слайдер - это способ отображения карточек, а не отдельный контейнер контента. ОБЯЗАТЕЛЬНО извлекай заголовки и тексты всех карточек слайдера!
     * Поле "cards" используй для: карточек в слайдерах (с заголовками и текстами!), карточек в сетке, отдельных карточек, НО НЕ для карточек внутри табов

4. Для карточек и показателей:
   - Опиши каждую карточку отдельно с её заголовком и текстом
   - Для числовых показателей укажи точное значение и подпись (например: "95%" - "Охват жителей Москвы")
   - Если карточки расположены в сетке/ряду, опиши их расположение
   - ВАЖНО: 
     * Если карточки являются частью ТАБОВ (переключатели с заголовками), НЕ дублируй их в поле "cards" - они должны быть только в "tabs[].content"
     * Если карточки являются частью СЛАЙДЕРОВ (прокручиваются/переключаются), они ДОЛЖНЫ быть в поле "cards" секции, так как слайдер - это способ отображения карточек
     * Если карточки являются частью АККОРДЕОНОВ, опиши их внутри структуры аккордеона
     * Отдельные карточки в сетке/ряду всегда должны быть в поле "cards"

5. Для изображений и иллюстраций:
   - Извлеки ВСЕ ссылки на изображения из HTML кода: src атрибуты из тегов <img>
   - Укажи точный URL изображения (полный путь или относительный) из HTML
   - Опиши что изображение показывает (содержание, назначение, что визуализирует)
   - Укажи расположение в блоке (слева, справа, фон, центр)
   - Опиши стиль изображения (3D-иллюстрация, фотография, иконка и т.д.)
   - Укажи alt текст изображения (если есть в HTML)

6. Для ссылок (links) - КРИТИЧЕСКИ ВАЖНО извлечь из HTML:
   - Извлеки ВСЕ ссылки из HTML кода: href атрибуты из тегов <a>
   - Укажи точный URL ссылки (полный путь или относительный) из HTML
   - Опиши текст ссылки (что написано на ссылке)
   - Укажи назначение ссылки (куда ведет, что предлагает)
   - Раздели ссылки на категории:
     * internalLinks - внутренние ссылки на другие страницы сайта (начинаются с / или без http)
     * externalLinks - внешние ссылки на другие сайты (начинаются с http:// или https://)
     * fileLinks - ссылки на файлы (PDF, DOC, XLS, ZIP и т.д.) - определи по расширению файла
     * imageLinks - прямые ссылки на изображения (если есть в HTML как ссылки, не как <img>)

7. Для кнопок:
   - Укажи точный текст кнопки
   - Если кнопка является ссылкой (<a> с классом button или <button> с onclick), укажи href или действие
   - Опиши её назначение (куда ведет, что предлагает)

9. Для изображений:
   - Извлеки ВСЕ ссылки на изображения из HTML кода: src атрибуты из тегов <img>
   - Укажи точный URL изображения (полный путь или относительный)
   - Опиши что изображение показывает (содержание, назначение, что визуализирует)
   - Укажи расположение в блоке (слева, справа, фон, центр)
   - Опиши стиль изображения (3D-иллюстрация, фотография, иконка и т.д.)

10. Важно:
   - Не дублируй блоки - каждый блок должен быть уникальным
   - Описывай контент семантически (что это значит для пользователя, а не технические детали HTML)
   - Используй точные формулировки заголовков и текстов из HTML кода
   - Группируй связанные элементы в логические блоки
   - В результате должно получиться техническое задание на разработку новой HTML страницы, которая будет содержать весь контент, отображенный на этой странице
   - Структурируй описание так, чтобы разработчик мог легко понять, что нужно реализовать
   - ОБЯЗАТЕЛЬНО извлекай все ссылки, изображения, файлы и ТАБЛИЦЫ из HTML кода - это критически важно для разработки
   - Извлеки ВСЕ ссылки из HTML кода: href атрибуты из тегов <a>
   - Укажи точный URL ссылки (полный путь или относительный)
   - Опиши текст ссылки (что написано на ссылке)
   - Укажи назначение ссылки (куда ведет, что предлагает)
   - Раздели ссылки на категории:
     * internalLinks - внутренние ссылки на другие страницы сайта
     * externalLinks - внешние ссылки на другие сайты
     * fileLinks - ссылки на файлы (PDF, DOC, XLS и т.д.)
     * imageLinks - прямые ссылки на изображения (если есть в HTML)

Верни результат СТРОГО в формате JSON со следующей структурой (без дополнительного текста до или после JSON):
{
  "sections": [
    {
      "sectionIndex": 1,
      "type": "hero",
      "description": "Общее описание блока - назначение, функция, что показывает пользователю",
      "title": "Заголовок секции (точный текст)",
      "subtitle": "Подзаголовок (если есть)",
      "text": "Текст секции - основное содержание",
      "elements": [
        {
          "type": "button",
          "text": "Текст кнопки",
          "purpose": "Назначение кнопки",
          "href": "URL ссылки (если кнопка является ссылкой)"
        }
      ],
      "images": [
        {
          "description": "Описание изображения - что показывает, назначение",
          "position": "расположение в блоке",
          "src": "URL изображения из HTML (полный путь или относительный)",
          "alt": "Альтернативный текст изображения (если есть)"
        }
      ],
      "links": {
        "internalLinks": [
          {
            "text": "Текст ссылки",
            "href": "URL ссылки (относительный или полный путь)",
            "purpose": "Назначение ссылки - куда ведет, что предлагает"
          }
        ],
        "externalLinks": [
          {
            "text": "Текст ссылки",
            "href": "Полный URL внешней ссылки",
            "purpose": "Назначение ссылки"
          }
        ],
        "fileLinks": [
          {
            "text": "Текст ссылки на файл",
            "href": "URL файла (PDF, DOC, XLS и т.д.)",
            "fileType": "Тип файла (pdf, doc, xls и т.д.)",
            "purpose": "Назначение файла"
          }
        ],
        "imageLinks": [
          {
            "text": "Текст ссылки на изображение (если есть)",
            "href": "URL изображения",
            "purpose": "Назначение ссылки"
          }
        ]
      },
      "cards": [
        {
          "title": "Заголовок карточки",
          "text": "Текст карточки",
          "value": "Числовое значение (если есть)",
          "label": "Подпись к значению (если есть)",
          "link": {
            "text": "Текст ссылки в карточке (если есть)",
            "href": "URL ссылки",
            "purpose": "Назначение ссылки"
          }
        }
      ],
      "tabs": [
        {
          "title": "Название таба",
          "isActive": true,
          "content": {
            "title": "Заголовок контента таба (если есть)",
            "text": "Полный текст контента таба - все содержимое, которое видно в табе",
            "links": {
              "internalLinks": [
                {
                  "text": "Текст внутренней ссылки",
                  "href": "URL ссылки",
                  "purpose": "Назначение ссылки"
                }
              ],
              "externalLinks": [
                {
                  "text": "Текст внешней ссылки",
                  "href": "Полный URL",
                  "purpose": "Назначение ссылки"
                }
              ],
              "fileLinks": [
                {
                  "text": "Текст ссылки на файл (название файла или описание)",
                  "href": "URL файла из HTML (полный путь или относительный)",
                  "fileType": "Тип файла (pdf, doc, xls, zip и т.д.)",
                  "purpose": "Назначение файла - что это за документ"
                }
              ],
              "imageLinks": [
                {
                  "text": "Текст ссылки на изображение (если есть)",
                  "href": "URL изображения",
                  "purpose": "Назначение ссылки"
                }
              ]
            }
          }
        }
      ],
      "table": {
        "description": "Описание таблицы - назначение, что показывает",
        "headers": ["Заголовок колонки 1", "Заголовок колонки 2", "..."],
        "rows": [
          {
            "column1": "Значение в колонке 1",
            "column2": "Значение в колонке 2",
            "...": "..."
          }
        ]
      }
      
ВАЖНО для табов:
- ОБЯЗАТЕЛЬНО извлеки содержимое ВСЕХ табов, не только активного
- Для каждого таба извлеки ВСЕ fileLinks из HTML кода - это критически важно!
- Если таб неактивен, но его контент есть в HTML (например, в скрытом контейнере), извлеки его полностью
- Не оставляй пустые массивы fileLinks для неактивных табов - извлеки их содержимое из HTML!

КРИТИЧЕСКИ ВАЖНО для таблиц:
- Если в секции есть таблица (<table> в HTML), ОБЯЗАТЕЛЬНО извлеки ВСЕ данные из таблицы в структурированном виде!
- Для таблиц создай поле "table" с:
  * "description": описание назначения таблицы (что она показывает, для чего используется)
  * "headers": массив заголовков колонок (из <th> или первой строки <tr>) - ОБЯЗАТЕЛЬНО извлеки все заголовки!
  * "rows": массив объектов, где каждый объект - это строка таблицы с данными из всех колонок
  * Каждый объект в "rows" должен содержать все данные из соответствующей строки таблицы
  * Ключи объектов в "rows" должны соответствовать заголовкам (используй названия колонок из headers или column1, column2, column3 и т.д.)
- НЕ оставляй поле "table" пустым или без данных - извлеки ВСЕ строки и колонки из HTML!
- НЕ создавай пустые таблицы (с пустыми headers и rows) - если таблица есть в HTML, извлеки из нее данные!
- Если таблица большая (много строк), извлеки ВСЕ строки - не пропускай данные!
- Для таблиц с файлами/документами извлеки ВСЕ ссылки на файлы в соответствующие поля rows
- Пример: если в HTML есть таблица с 20 строками нормативных документов, в "rows" должно быть 20 объектов!
- Если таблица содержит только текст (без структурированных колонок), извлеки весь текст в поле "text", но также попробуй структурировать в "table" если возможно
- ВАЖНО: Если в HTML есть <table>, но ты не можешь извлечь данные, опиши проблему в "description" таблицы, но НЕ создавай пустую структуру с headers: [] и rows: []
- Если таблица отсутствует в HTML, НЕ создавай поле "table" вообще (или установи его в null)
    }
  ]
}`;

    try {
        const requestStartedAt = new Date();
        if (chunkMeta) {
            const metaLabel = `chunk ${chunkMeta.index}/${chunkMeta.total}`;
            const metaTitle = chunkMeta.title ? `, title="${chunkMeta.title}"` : '';
            console.log(`[${requestStartedAt.toISOString()}] 🧠 LLM запрос: ${metaLabel}${metaTitle}, html=${htmlContent.length} chars, text=${textContent.length} chars`);
        }
        if (LLM_CONFIG.provider === 'perplexity' || LLM_CONFIG.provider === 'openai') {
            const apiBaseURL = LLM_CONFIG.provider === 'perplexity' 
                ? 'https://api.perplexity.ai' 
                : (LLM_CONFIG.baseURL || 'https://api.openai.com/v1');
            
            // Визуальный индикатор отправки
            let apiDots = 0;
            const apiProgressInterval = setInterval(() => {
                apiDots++;
                process.stdout.write(`\r   📤 Отправка запроса к LLM API${'.'.repeat(apiDots % 4)}   `);
            }, 800);
            
            let response;
            for (let attempt = 1; attempt <= LLM_RETRY_COUNT; attempt++) {
                try {
                    if (attempt > 1) {
                        console.warn(`\n   ↻ Повтор запроса к LLM (${attempt}/${LLM_RETRY_COUNT}) через ${LLM_RETRY_DELAY_MS} ms`);
                        await new Promise(resolve => setTimeout(resolve, LLM_RETRY_DELAY_MS));
                    }
                    // Для Perplexity с изображениями используем vision API если доступен
                    // Пока используем текстовый промпт с описанием скриншота
                    response = await axios.post(
                    `${apiBaseURL}/chat/completions`,
                    {
                        model: LLM_CONFIG.model,
                        messages: [
                            {
                                role: 'system',
                                content: 'Ты - эксперт по анализу веб-страниц. Ты создаешь детальные технические задания для разработки HTML страниц, описывая контент семантически. Всегда возвращай результат строго в формате JSON без дополнительных комментариев.'
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `${prompt}

HTML контент страницы (основной контент, без header и footer):
${htmlContent.substring(0, 30000)}

Текстовая версия контента (для справки):
${textContent.substring(0, 5000)}`
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: `data:image/png;base64,${screenshotBase64}`
                                        }
                                    }
                                ]
                            }
                        ],
                        temperature: 0.3,
                        max_tokens: 32000
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: LLM_TIMEOUT_MS
                    }
                    );
                    break;
                } catch (apiError) {
                    const retryable = isRetryableLLMError(apiError);
                    if (!retryable || attempt === LLM_RETRY_COUNT) {
                        clearInterval(apiProgressInterval);
                        if (apiError.code === 'ECONNABORTED') {
                            console.error(`\n   ❌ Превышен таймаут LLM (${LLM_TIMEOUT_MS} ms).`);
                        }
                        const elapsedMs = Date.now() - requestStartedAt.getTime();
                        if (chunkMeta) {
                            console.warn(`[${new Date().toISOString()}] 🧠 LLM запрос завершился ошибкой (${elapsedMs} ms): chunk ${chunkMeta.index}/${chunkMeta.total}`);
                        }
                        throw apiError;
                    }
                    console.warn(`\n   ⚠️  Ошибка LLM (${apiError.code || apiError.response?.status || 'unknown'}), повторяем...`);
                }
            }
            
            clearInterval(apiProgressInterval);
            process.stdout.write(`\r   ✅ Получен ответ от LLM API\n`);
            
            process.stdout.write('   📄 Обработка ответа...');
            const llmResponse = response.data.choices[0].message.content;
            
            // Сохраняем сырой ответ для отладки
            const rawResponsePath = path.join(__dirname, '..', 'temp', 'page-analysis-llm', `${Date.now()}_llm_raw_response.txt`);
            fs.writeFileSync(rawResponsePath, llmResponse);
            process.stdout.write(` ✓\n   📄 Парсинг JSON ответа...`);
            
            // Пытаемся извлечь JSON из ответа
            const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    process.stdout.write(` ✓\n`);
                    const elapsedMs = Date.now() - requestStartedAt.getTime();
                    if (chunkMeta) {
                        console.log(`[${new Date().toISOString()}] 🧠 LLM ответ получен (${elapsedMs} ms): chunk ${chunkMeta.index}/${chunkMeta.total}`);
                    }
                    return parsed;
                } catch (parseError) {
                    console.warn('⚠️  Ошибка парсинга JSON, пытаемся исправить...');
                    console.warn(`   Позиция ошибки: ${parseError.message}`);
                    
                    // Более агрессивное исправление JSON
                    let fixedJson = jsonMatch[0]
                        .replace(/,\s*}/g, '}')  // Убираем запятые перед закрывающими скобками
                        .replace(/,\s*]/g, ']')  // Убираем запятые перед закрывающими квадратными скобками
                        .replace(/([^\\])\n/g, '$1 ')  // Заменяем переносы строк на пробелы
                        .replace(/,\s*,/g, ',');  // Убираем двойные запятые
                    
                    try {
                        const parsed = JSON.parse(fixedJson);
                        const elapsedMs = Date.now() - requestStartedAt.getTime();
                        if (chunkMeta) {
                            console.log(`[${new Date().toISOString()}] 🧠 LLM ответ восстановлен (${elapsedMs} ms): chunk ${chunkMeta.index}/${chunkMeta.total}`);
                        }
                        return parsed;
                    } catch (secondError) {
                        // Пытаемся восстановить обрезанный JSON
                        console.warn('   🔧 Попытка восстановить обрезанный JSON...');
                        let recoveredJson = fixedJson;
                        
                        // Подсчитываем открывающие и закрывающие скобки
                        const openBraces = (recoveredJson.match(/\{/g) || []).length;
                        const closeBraces = (recoveredJson.match(/\}/g) || []).length;
                        const openBrackets = (recoveredJson.match(/\[/g) || []).length;
                        const closeBrackets = (recoveredJson.match(/\]/g) || []).length;
                        
                        // Закрываем незакрытые структуры
                        if (openBraces > closeBraces) {
                            recoveredJson += '\n' + '}'.repeat(openBraces - closeBraces);
                        }
                        if (openBrackets > closeBrackets) {
                            recoveredJson += '\n' + ']'.repeat(openBrackets - closeBrackets);
                        }
                        
                        // Пытаемся закрыть незавершенные строки в массивах
                        if (recoveredJson.match(/,\s*$/)) {
                            recoveredJson = recoveredJson.replace(/,\s*$/, '');
                        }
                        
                        try {
                            const parsed = JSON.parse(recoveredJson);
                            console.warn('   ✅ JSON успешно восстановлен');
                            return parsed;
                        } catch (thirdError) {
                            console.error('❌ Не удалось восстановить JSON:', thirdError.message);
                            // Сохраняем проблемный JSON для анализа
                            const errorJsonPath = path.join(__dirname, '..', 'temp', 'page-analysis-llm', `${Date.now()}_error_json.txt`);
                            fs.writeFileSync(errorJsonPath, fixedJson);
                            console.error(`   📄 Проблемный JSON сохранен: ${errorJsonPath}`);
                            return { error: `Ошибка парсинга JSON: ${thirdError.message}`, rawResponse: llmResponse };
                        }
                    }
                }
            }
            
            return { error: 'Не удалось извлечь JSON из ответа LLM', rawResponse: llmResponse };
        } else {
            throw new Error(`Режим анализа по скриншоту поддерживается только для Perplexity и OpenAI`);
        }
    } catch (error) {
        console.error('❌ Ошибка при вызове LLM:', error.message);
        if (error.response) {
            console.error('   Ответ API:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

/**
 * Главная функция
 */
async function main() {
    const slug = process.argv[2] || 'home';
    const mode = process.env.ANALYSIS_MODE || 'screenshot'; // 'screenshot' или 'html'
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const safeSlug = slug.replace(/\//g, '_'); // Заменяем / на _ для имени файла (объявляем один раз)
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Массив для сбора логов до отправки в LLM
    const preLLMLogs = [];
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const debugLogPath = path.join(outputDir, `${safeSlug}_navigation_debug.log`);
    const writeDebugLog = (message) => {
        const line = `[${new Date().toISOString()}] ${message}`;
        try {
            fs.appendFileSync(debugLogPath, line + '\n');
        } catch (error) {
            originalConsoleWarn(`⚠️  Не удалось записать debug лог: ${error.message}`);
        }
        preLLMLogs.push(`[DEBUG] ${line}`);
        originalConsoleLog(line);
    };
    
    // Перехватываем логи до отправки в LLM
    const captureLog = (type, ...args) => {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
        preLLMLogs.push(`[${type}] ${message}`);
        // Также выводим в консоль
        if (type === 'LOG') originalConsoleLog(...args);
        else if (type === 'WARN') originalConsoleWarn(...args);
        else if (type === 'ERROR') originalConsoleError(...args);
    };
    
    console.log = (...args) => captureLog('LOG', ...args);
    console.warn = (...args) => captureLog('WARN', ...args);
    console.error = (...args) => captureLog('ERROR', ...args);

    // Проверяем наличие API ключа
    if (!LLM_CONFIG.apiKey) {
        console.error('❌ Ошибка: Не указан API ключ для LLM!');
        console.error('   Установите переменную окружения:');
        console.error('   - PERPLEXITY_API_KEY для Perplexity (рекомендуется)');
        console.error('   - OPENAI_API_KEY для OpenAI');
        console.error('   - ANTHROPIC_API_KEY для Anthropic');
        console.error('   - Или добавьте ключ в docs/project/CONTEXT.md');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🤖 АНАЛИЗ СТРАНИЦЫ С ИСПОЛЬЗОВАНИЕМ LLM');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 Slug: ${slug}`);
    console.log(`🔧 Режим: ${mode === 'screenshot' ? 'Только скриншот (рекомендуется)' : 'HTML + текст'}`);
    
    // Получаем правильный URL из PAGES_HIERARCHY.md
    const pageUrl = getPageUrl(slug);
    console.log(`🌐 URL: ${pageUrl}`);
    console.log(`📁 Вывод: ${outputDir}`);
    console.log(`🤖 LLM: ${LLM_CONFIG.provider} (${LLM_CONFIG.model})`);
    console.log('');
    writeDebugLog(`INFO: Полный лог навигации сохраняется в ${debugLogPath}`);
    writeDebugLog('INFO: Визуальные индикаторы используют перезапись строки (\\r), часть вывода может казаться пропавшей.');

    const chromeProfileDir = path.join(outputDir, `${safeSlug}_chrome_profile`);
    if (!fs.existsSync(chromeProfileDir)) {
        fs.mkdirSync(chromeProfileDir, { recursive: true });
    }
    const chromeHomeDir = path.join(outputDir, `${safeSlug}_chrome_home`);
    if (!fs.existsSync(chromeHomeDir)) {
        fs.mkdirSync(chromeHomeDir, { recursive: true });
    }
    const chromeXdgConfigDir = path.join(chromeHomeDir, '.config');
    const chromeXdgCacheDir = path.join(chromeHomeDir, '.cache');
    const chromeXdgDataDir = path.join(chromeHomeDir, '.local', 'share');
    [chromeXdgConfigDir, chromeXdgCacheDir, chromeXdgDataDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    const crashpadDir = path.join(
        chromeHomeDir,
        'Library',
        'Application Support',
        'Google',
        'Chrome for Testing',
        'Crashpad'
    );
    try {
        fs.mkdirSync(crashpadDir, { recursive: true });
        writeDebugLog(`INFO: Crashpad dir: ${crashpadDir}`);
    } catch (error) {
        writeDebugLog(`WARN: Не удалось создать Crashpad dir: ${error.message}`);
    }
    const puppeteerExecutablePath =
        typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null;
    const chromeCandidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH,
        puppeteerExecutablePath,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ].filter(Boolean);
    const chromeExecutablePath = chromeCandidates.find(candidate => {
        try {
            return fs.existsSync(candidate);
        } catch {
            return false;
        }
    });
    if (chromeExecutablePath) {
        writeDebugLog(`INFO: Используется Chrome executablePath: ${chromeExecutablePath}`);
    } else {
        writeDebugLog('WARN: Не найден локальный Chrome. Используется bundled Chromium.');
    }
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: chromeProfileDir,
        ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}),
        env: { ...process.env, HOME: chromeHomeDir },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-crashpad',
            '--no-crashpad',
            '--disable-breakpad',
            '--disable-crash-reporter',
            '--no-crash-upload',
            '--disable-features=Crashpad,CrashpadUserStream',
            '--force-device-scale-factor=1',
            '--high-dpi-support=1',
            '--window-size=1920,1080',
            '--no-first-run',
            '--no-default-browser-check'
        ],
        defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        
        // Перехватываем логи из браузера для видимости действий внутри page.evaluate
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            // Выводим все логи в реальном времени для визуального отслеживания
            if (type === 'log') {
                process.stdout.write(`   [Browser] ${text}\n`);
            } else if (type === 'warn') {
                process.stdout.write(`   [Browser WARN] ${text}\n`);
                writeDebugLog(`Browser WARN: ${text}`);
            } else if (type === 'error') {
                process.stdout.write(`   [Browser ERROR] ${text}\n`);
                writeDebugLog(`Browser ERROR: ${text}`);
            }
        });
        
        // Также перехватываем все сообщения для надежности
        page.on('pageerror', error => {
            console.error(`   [Browser Error] ${error.message}`);
            writeDebugLog(`Browser pageerror: ${error.message}`);
            process.stdout.write('');
        });
        // ПЕРЕД загрузкой страницы: отключаем автоматическую перезагрузку и навигацию
        if (slug !== 'video_surveillance_office') {
            await page.evaluateOnNewDocument(() => {
            // Логируем каждый клик (capturing), чтобы видеть, что вызывает навигацию
            window.addEventListener('click', (e) => {
                try {
                    const target = e.target;
                    const anchor = target && target.closest ? target.closest('a') : null;
                    const role = target?.getAttribute?.('role') || '';
                    const href = anchor?.getAttribute?.('href') || target?.getAttribute?.('href') || '';
                    const dataTab = target?.getAttribute?.('data-tab') || anchor?.getAttribute?.('data-tab') || '';
                    const ariaControls = target?.getAttribute?.('aria-controls') || anchor?.getAttribute?.('aria-controls') || '';
                    const id = target?.id || '';
                    const classes = target?.className || '';
                    const text = (target?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
                    const tagName = target?.tagName || '';
                    console.log(`[Puppeteer] CLICK tag=${tagName} id="${id}" class="${classes}" role="${role}" href="${href}" data-tab="${dataTab}" aria-controls="${ariaControls}" text="${text}"`);
                } catch (err) {
                    console.log(`[Puppeteer] CLICK log error: ${err?.message || err}`);
                }
            }, true);

            // Перехватываем и блокируем перезагрузку страницы
            window.addEventListener('beforeunload', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);
            
            // Блокируем location.reload()
            const originalReload = window.location.reload;
            window.location.reload = function() {
                console.warn('[Puppeteer] Блокирована попытка перезагрузки страницы');
                return false;
            };
            
            // Блокируем изменение location.href
            let originalHref = window.location.href;
            try {
                const desc = Object.getOwnPropertyDescriptor(window.location, 'href');
                if (!desc || desc.configurable) {
                    Object.defineProperty(window.location, 'href', {
                        get: function() {
                            return originalHref;
                        },
                        set: function(url) {
                            console.warn('[Puppeteer] Блокирована попытка навигации на:', url);
                            return false;
                        }
                    });
                } else {
                    console.warn('[Puppeteer] Не удалось переопределить location.href (не configurable)');
                }
            } catch (error) {
                console.warn('[Puppeteer] Не удалось переопределить location.href:', error.message);
            }
            
            // Блокируем history.pushState и replaceState, которые могут вызывать перезагрузку
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            history.pushState = function() {
                console.warn('[Puppeteer] Блокирован history.pushState');
                return false;
            };
            history.replaceState = function() {
                console.warn('[Puppeteer] Блокирован history.replaceState');
                return false;
            };
            });
        } else {
            console.log('   ℹ️  Навигационные блокировки отключены для video_surveillance_office');
        }
        
        console.log('🚀 Запуск браузера...');
        console.log(`📥 Загрузка страницы: ${pageUrl}`);
        
        // Счетчик загрузок страницы
        let pageLoadCount = 0;
        let lastMainFrameUrl = pageUrl;
        page.on('load', () => {
            pageLoadCount++;
            if (pageLoadCount > 1) {
                console.warn(`⚠️  [Puppeteer] Обнаружена повторная загрузка страницы (загрузка #${pageLoadCount})`);
            }
            writeDebugLog(`Page load event (#${pageLoadCount}): ${page.url()}`);
        });
        page.on('domcontentloaded', () => {
            writeDebugLog(`DOM content loaded: ${page.url()}`);
        });
        
        await page.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        console.log(`   ✓ Страница загружена (загрузка #${pageLoadCount})`);

        // Для video_surveillance_office фиксируем позицию/масштаб, чтобы избежать смещения вправо
        if (slug === 'video_surveillance_office') {
            try {
                const client = await page.target().createCDPSession();
                await client.send('Page.setZoomFactor', { zoomFactor: 1 });
            } catch (error) {
                console.warn(`⚠️  Не удалось сбросить zoomFactor: ${error.message}`);
            }
            try {
                const viewport = page.viewport() || {};
                const metrics = await page.evaluate(() => ({
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    devicePixelRatio: window.devicePixelRatio,
                    visualScale: window.visualViewport ? window.visualViewport.scale : null
                }));
                console.log(`   📐 Viewport: ${viewport.width || 0}x${viewport.height || 0} dpr=${viewport.deviceScaleFactor || 0}`);
                console.log(`   📐 Window: ${metrics.innerWidth}x${metrics.innerHeight} dpr=${metrics.devicePixelRatio} scale=${metrics.visualScale}`);
            } catch (error) {
                console.warn(`⚠️  Не удалось получить метрики окна: ${error.message}`);
            }
            await page.evaluate(() => {
                try {
                    document.documentElement.scrollLeft = 0;
                    document.body.scrollLeft = 0;
                    document.body.style.zoom = '100%';
                    document.documentElement.style.zoom = '100%';
                } catch {
                    // no-op
                }
            });
        }
        
        // Специальная обработка страницы новостей (долгая загрузка, бесконечный скролл, фильтр лет)
        let newsExtraContent = null;
        if (slug === 'news' || pageUrl.endsWith('/news')) {
            console.log('📰 Специальная обработка страницы news...');
            try {
                newsExtraContent = await prepareNewsPage(page, writeDebugLog);
            } catch (error) {
                console.warn(`⚠️  Ошибка при обработке news: ${error.message}`);
            }
        }
        
        // ПОСЛЕ загрузки страницы: блокируем изменение URL через history API
        await page.evaluate(() => {
            // Дублируем обработчик кликов после загрузки на случай, если страница переписала слушатели
            window.addEventListener('click', (e) => {
                try {
                    const target = e.target;
                    const anchor = target && target.closest ? target.closest('a') : null;
                    const role = target?.getAttribute?.('role') || '';
                    const href = anchor?.getAttribute?.('href') || target?.getAttribute?.('href') || '';
                    const dataTab = target?.getAttribute?.('data-tab') || anchor?.getAttribute?.('data-tab') || '';
                    const ariaControls = target?.getAttribute?.('aria-controls') || anchor?.getAttribute?.('aria-controls') || '';
                    const id = target?.id || '';
                    const classes = target?.className || '';
                    const text = (target?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
                    const tagName = target?.tagName || '';
                    console.log(`[Puppeteer] CLICK tag=${tagName} id="${id}" class="${classes}" role="${role}" href="${href}" data-tab="${dataTab}" aria-controls="${ariaControls}" text="${text}"`);
                } catch (err) {
                    console.log(`[Puppeteer] CLICK log error: ${err?.message || err}`);
                }
            }, true);

            // Сохраняем оригинальный URL (без параметров)
            const baseUrl = window.location.href.split('?')[0];
            
            // Перехватываем history.pushState и replaceState
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function(state, title, url) {
                // Если URL содержит параметры запроса, заменяем на базовый URL
                if (url && typeof url === 'string') {
                    try {
                        const urlObj = new URL(url, window.location.origin);
                        if (urlObj.search) {
                            // Вызываем pushState с базовым URL (без параметров)
                            return originalPushState.call(history, state, title, baseUrl);
                        }
                    } catch (e) {
                        // Если не удалось распарсить URL, используем как есть
                    }
                }
                return originalPushState.call(history, state, title, url);
            };
            
            history.replaceState = function(state, title, url) {
                if (url && typeof url === 'string') {
                    try {
                        const urlObj = new URL(url, window.location.origin);
                        if (urlObj.search) {
                            return originalReplaceState.call(history, state, title, baseUrl);
                        }
                    } catch (e) {
                        // Если не удалось распарсить URL, используем как есть
                    }
                }
                return originalReplaceState.call(history, state, title, url);
            };
            
            // Логируем все попытки перезагрузки
            const originalReload = window.location.reload;
            window.location.reload = function() {
                console.error('[Puppeteer] ОБНАРУЖЕНА попытка перезагрузки через location.reload()');
                return false;
            };
            
            // Перехватываем события beforeunload
            window.addEventListener('beforeunload', (e) => {
                console.error('[Puppeteer] ОБНАРУЖЕНО событие beforeunload - попытка перезагрузки');
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);
            
            // Перехватываем события unload
            window.addEventListener('unload', (e) => {
                console.error('[Puppeteer] ОБНАРУЖЕНО событие unload - попытка перезагрузки');
                e.preventDefault();
                e.stopPropagation();
            }, true);
            
            // Блокируем все формы, которые могут вызвать перезагрузку
            document.querySelectorAll('form').forEach(form => {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn('[Puppeteer] Блокирована отправка формы');
                    return false;
                }, true);
            });
        });
        
        // Слушаем события навигации в Puppeteer только для логирования
        // Блокировка происходит на уровне JavaScript через перехват pushState/replaceState
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) {
                const newUrl = frame.url();
                const basePageUrl = pageUrl.split('?')[0];
                // Логируем только если это реальная навигация (не просто изменение параметров)
                if (newUrl !== pageUrl && !newUrl.startsWith(basePageUrl)) {
                    console.warn('⚠️  [Puppeteer] Обнаружена навигация на другой URL:', newUrl);
                }
                if (newUrl !== lastMainFrameUrl) {
                    writeDebugLog(`Main frame navigated: ${lastMainFrameUrl} -> ${newUrl}`);
                    lastMainFrameUrl = newUrl;
                }
            }
        });
        
        page.on('request', (request) => {
            const url = request.url();
            // Логируем только запросы, которые могут быть перезагрузкой
            if (url === pageUrl || url.includes('reload') || url.includes('refresh')) {
                console.warn('⚠️  [Puppeteer] Обнаружен подозрительный запрос:', url);
            }
            if (request.isNavigationRequest()) {
                writeDebugLog(`Navigation request: ${request.method()} ${url}`);
            }
        });
        page.on('response', (response) => {
            const request = response.request();
            if (request.isNavigationRequest()) {
                writeDebugLog(`Navigation response: ${response.status()} ${request.url()}`);
            }
        });
        page.on('requestfailed', (request) => {
            if (request.isNavigationRequest()) {
                const failure = request.failure();
                writeDebugLog(`Navigation failed: ${request.url()} ${failure?.errorText || ''}`);
            }
        });
        
        // Ждем стабилизации страницы перед скриншотом
        // Уменьшаем время ожидания, чтобы не было задержки
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Проверяем, не произошла ли перезагрузка страницы
        const currentUrl = page.url();
        if (currentUrl !== pageUrl && !currentUrl.includes(pageUrl.split('?')[0])) {
            console.warn(`   ⚠️  URL страницы изменился после загрузки: ${currentUrl}`);
        }
        
        // Делаем скриншот (всегда нужен)
        const screenshotBase64 = await getScreenshotBase64(page);
        console.log(`   ✓ Скриншот: ${(screenshotBase64.length / 1024).toFixed(1)} KB`);
        
        // Сохраняем скриншот
        const screenshotPath = path.join(outputDir, `${safeSlug}_screenshot.png`);
        fs.writeFileSync(screenshotPath, Buffer.from(screenshotBase64, 'base64'));
        const llmFullScreenshotPath = saveLLMScreenshot(outputDir, safeSlug, 'llm_full', screenshotBase64);
        console.log(`   ✓ LLM скриншот сохранен: ${llmFullScreenshotPath}`);
        
        console.log('');
        console.log('🤖 Отправка контента в LLM для анализа...');
        console.log('   (это может занять некоторое время)');
        
        // ВАЖНО: Извлекаем HTML контент ДО кликов по табам, чтобы избежать накопления заголовков
        // из разных состояний табов в HTML
        console.log('📄 Извлечение HTML контента (до кликов по табам)...');
        
        // Сначала извлекаем базовый HTML без кликов по табам
        const basePageContent = await page.evaluate(() => {
            // Игнорируем header и footer
            const header = document.querySelector('header, [role="banner"], .header, .site-header');
            const footer = document.querySelector('footer, [role="contentinfo"], .footer, .site-footer');
            
            // Клонируем body, чтобы не изменять оригинал
            const bodyClone = document.body.cloneNode(true);
            
            // Удаляем header и footer из клона
            if (header && bodyClone.contains(header.cloneNode(true))) {
                const headerClone = bodyClone.querySelector('header, [role="banner"], .header, .site-header');
                if (headerClone) headerClone.remove();
            }
            if (footer && bodyClone.contains(footer.cloneNode(true))) {
                const footerClone = bodyClone.querySelector('footer, [role="contentinfo"], .footer, .site-footer');
                if (footerClone) footerClone.remove();
            }
            
            return {
                html: bodyClone.innerHTML,
                text: bodyClone.textContent || bodyClone.innerText || ''
            };
        });
        
        console.log(`   ✓ Базовый HTML: ${(basePageContent.html.length / 1024).toFixed(1)} KB`);
        console.log(`   ✓ Базовый текст: ${(basePageContent.text.length / 1024).toFixed(1)} KB`);

        let selectOptionsData = null;
        if (slug === 'partners_creating_work_order') {
            console.log('🔽 Извлечение вариантов select (с кликами)...');
            try {
                selectOptionsData = await extractSelectOptions(page, outputDir, safeSlug);
                if (selectOptionsData.length > 0) {
                    console.log(`   ✓ Найдено select-полей: ${selectOptionsData.length}`);
                } else {
                    console.log('   ⚠️  Варианты select не найдены');
                }
            } catch (error) {
                console.warn(`⚠️  Не удалось извлечь варианты select: ${error.message}`);
            }
        }
        
        if (newsExtraContent && newsExtraContent.combinedHtml) {
            if (newsExtraContent.useStructuredOnly) {
                console.log('   📰 Контент news по годам будет добавлен в результат структурно (без LLM).');
            } else {
                console.log('   📰 Добавляем загруженный контент news по годам...');
                basePageContent.html = basePageContent.html + `\n<!-- NEWS_EXTRA_CONTENT_START -->\n${newsExtraContent.combinedHtml}\n<!-- NEWS_EXTRA_CONTENT_END -->\n`;
                basePageContent.text = basePageContent.text + `\n${newsExtraContent.combinedText || ''}`;
            }
        }
        
        // Теперь кликаем по табам и извлекаем контент табов отдельно
        console.log('📄 Извлечение контента табов...');
        console.log('   ⏳ Запуск обработки табов в браузере...');
        process.stdout.write(''); // Принудительный flush
        
        // Добавляем визуальный индикатор прогресса
        let progressInterval = null;
        const startProgressIndicator = () => {
            let dots = 0;
            progressInterval = setInterval(() => {
                process.stdout.write(`\r   ⏳ Обработка табов${'.'.repeat(dots % 4)}   `);
                dots++;
            }, 500);
        };
        
        const stopProgressIndicator = () => {
            if (progressInterval) {
                clearInterval(progressInterval);
                process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Очищаем строку
            }
        };
        
        stopProgressIndicator();
        
        // Используем новую версию функции, которая работает в Node.js контексте
        // и делает скриншоты/извлекает HTML сразу во время первого прохода
        const extractedTabsData = await extractPageContentV2(page, pageUrl, outputDir, safeSlug);
        
        console.log('   ✓ Обработка табов завершена');
        process.stdout.write(''); // Принудительный flush
        
        // Создаем объект pageContent с базовым HTML и контентом табов
        // ВАЖНО: Используем базовый HTML (до кликов), чтобы избежать накопления заголовков
        const pageContent = {
            html: basePageContent.html,
            text: basePageContent.text,
            url: pageUrl,
            tabsContentJSON: extractedTabsData.tabsContentJSON || null,
            extractedFileLinks: extractedTabsData.extractedFileLinks || {},
            tabsFileLinksByTab: extractedTabsData.tabsFileLinksByTab || {},
            selectOptionsData: selectOptionsData
        };
        
        // Добавляем JSON контента табов в HTML для передачи в LLM (но не для разбиения)
        if (extractedTabsData.tabsContentJSON && extractedTabsData.tabsContentJSON.tabsContent) {
            const tabsContentJSON = JSON.stringify(extractedTabsData.tabsContentJSON.tabsContent, null, 2);
            const tabsContentHTML = `\n<!-- ALL_TABS_CONTENT_START -->\n${tabsContentJSON}\n<!-- ALL_TABS_CONTENT_END -->\n`;
            pageContent.html = pageContent.html + tabsContentHTML;
        }
        
        console.log(`   ✓ HTML: ${(pageContent.html.length / 1024).toFixed(1)} KB`);
        console.log(`   ✓ Текст: ${(pageContent.text.length / 1024).toFixed(1)} KB`);
        
        // Добавляем информацию о табах и файлах в лог
        if (pageContent.tabsContentJSON && pageContent.tabsContentJSON.tabsContent) {
            const tabsCount = Object.keys(pageContent.tabsContentJSON.tabsContent).length;
            console.log(`   ✓ Контент табов: ${tabsCount} табов`);
        }
        if (pageContent.extractedFileLinks && Object.keys(pageContent.extractedFileLinks).length > 0) {
            const filesCount = Object.keys(pageContent.extractedFileLinks).length;
            console.log(`   ✓ Найдено файлов: ${filesCount}`);
        }
        
        // Обрабатываем модальные окна "Подробнее", если они есть на странице
        const modalContents = await extractModalContents(page);
        if (modalContents.length > 0) {
            const modalHtml = modalContents
                .map((modal, index) => `<!-- MODAL_CONTENT_${index + 1} -->\n${modal.html}\n`)
                .join('\n');
            const modalText = modalContents
                .map((modal, index) => `MODAL_${index + 1} ${modal.title || ''}\n${modal.text}`)
                .join('\n\n');
            pageContent.html = `${pageContent.html}\n<!-- MODAL_CONTENT_START -->\n${modalHtml}\n<!-- MODAL_CONTENT_END -->\n`;
            pageContent.text = `${pageContent.text}\nMODAL_CONTENT_START\n${modalText}\nMODAL_CONTENT_END\n`;
            pageContent.modalContents = modalContents;
            console.log(`   ✓ Контент модальных окон: ${modalContents.length}`);
        }
        
        // Проверяем, нужно ли разбивать страницу на части (для очень длинных страниц)
        // Для страниц с табами и большим количеством файлов снижаем порог
        const LONG_PAGE_THRESHOLD = 60000; // 60KB HTML (по умолчанию)
        const TABS_PAGE_THRESHOLD = 20000; // 20KB HTML для страниц с табами
        
        // Определяем, есть ли табы и много ли файлов
        const hasTabs = pageContent.tabsContentJSON && Object.keys(pageContent.tabsContentJSON.tabsContent || {}).length > 0;
        const hasManyFiles = pageContent.extractedFileLinks && Object.keys(pageContent.extractedFileLinks).length > 10;
        const hasTabsFileLinks = pageContent.tabsFileLinksByTab && Object.keys(pageContent.tabsFileLinksByTab).length > 0;
        
        // Если есть табы или много файлов, используем более низкий порог
        const effectiveThreshold = (hasTabs || hasManyFiles || hasTabsFileLinks) ? TABS_PAGE_THRESHOLD : LONG_PAGE_THRESHOLD;
        const shouldSplitPage = pageContent.html.length > effectiveThreshold;
        
        if (shouldSplitPage && (hasTabs || hasManyFiles || hasTabsFileLinks)) {
            console.log(`   ⚠️  Страница с табами/файлами (${(pageContent.html.length / 1024).toFixed(1)} KB), будет разбита на части (порог: ${(effectiveThreshold / 1024).toFixed(1)} KB)`);
            console.log(`   📊 Информация: табы=${hasTabs}, много файлов=${hasManyFiles}, файлы в табах=${hasTabsFileLinks}`);
        }

        if (slug === 'video_surveillance_building') {
            console.log('🧩 Сохраняем чанки по H1 для проверки блока с формой...');
            const debugChunks = splitPageIntoChunksByH1(pageContent.html, pageContent.text, LONG_PAGE_THRESHOLD);
            for (let i = 0; i < debugChunks.length; i++) {
                const chunk = debugChunks[i];
                if (!chunk.title || chunk.title === 'Весь контент') continue;
                const chunkTag = (chunk.tag || '').toLowerCase();
                const isSection = chunkTag === 'h1' || chunkTag === 'div.title-promo-long__title-text';
                const selectors = chunkTag ? [chunkTag] : ['h1', 'h2', 'h3', 'h4'];
                const debugScreenshot = await getChunkScreenshot(
                    page,
                    chunk.title,
                    chunk.occurrence || 1,
                    { fullWidth: true, useCardBackground: false, selectors, sectionBySelector: isSection, exactMatch: true }
                );
                if (debugScreenshot) {
                    const debugLabel = `debug_chunk_${i + 1}_${chunk.title}`;
                    const debugPath = saveLLMScreenshot(outputDir, safeSlug, debugLabel, debugScreenshot);
                    console.log(`   ✓ Debug чанк сохранен: ${debugPath}`);
                } else {
                    console.log(`   ⚠️  Debug чанк не найден: ${chunk.title}`);
                }
            }
        }
        
        // Раскрываем все аккордеоны перед извлечением файлов
        const accordionsOpened = await page.evaluate(async () => {
            const describeElement = (el) => {
                if (!el) return 'null';
                const tag = el.tagName || '';
                const id = el.id || '';
                const cls = el.className || '';
                const href = el.getAttribute?.('href') || '';
                const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
                return `tag=${tag} id="${id}" class="${cls}" href="${href}" text="${text}"`;
            };
            let openedCount = 0;
            // Ищем только элементы, похожие на триггеры аккордеонов
            const accordionButtons = Array.from(document.querySelectorAll(
                'button[aria-expanded], ' +
                '[data-toggle="collapse"], ' +
                '[aria-controls], ' +
                '.accordion-row__header'
            ));
            const seenRows = new WeakSet();
            
            for (const btn of accordionButtons) {
                const skipByContainer = btn.closest?.('.sidebar, .sidebar-menu, .sidebar-menu-item, nav, header');
                if (skipByContainer) {
                    continue;
                }
                if (btn.closest?.('.accordion-row__content, .accordion-row__container-collapse')) {
                    continue;
                }
                if (btn.tagName === 'SVG') {
                    continue;
                }
                const row = btn.closest?.('.accordion-row') || null;
                if (row) {
                    if (seenRows.has(row)) {
                        continue;
                    }
                    seenRows.add(row);
                }
                const header = btn.closest?.('.accordion-row__header') || null;
                const clickable = header || btn;
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                const isCollapsed = btn.classList.contains('collapsed');
                
                // Если аккордеон закрыт, открываем его
                if (!isExpanded || isCollapsed) {
                    try {
                        const href = clickable.getAttribute?.('href') || '';
                        if (clickable.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                            console.log(`[Puppeteer] ACCORDION_SKIP_LINK ${describeElement(clickable)}`);
                            continue;
                        }
                        console.log(`[Puppeteer] ACCORDION_CLICK ${describeElement(clickable)}`);
                        clickable.click();
                        openedCount++;
                        await new Promise(resolve => setTimeout(resolve, 800));
                    } catch (e) {
                        // Игнорируем ошибки клика
                    }
                }
            }
            
            // Ждем стабилизации контента
            await new Promise(resolve => setTimeout(resolve, 1000));
            return openedCount;
        });
        
        if (accordionsOpened > 0) {
            console.log(`   ✓ Раскрыто аккордеонов: ${accordionsOpened}`);
            // Обновляем HTML после раскрытия аккордеонов
            pageContent.html = await page.content();
        }
        
        // Обрабатываем кнопки "Показать еще" и "Подробнее" для раскрытия дополнительного контента
        // Делаем это после извлечения контента табов, но перед извлечением файлов
        const moreButtonsClicked = await page.evaluate(async () => {
            const describeElement = (el) => {
                if (!el) return 'null';
                const tag = el.tagName || '';
                const id = el.id || '';
                const cls = el.className || '';
                const href = el.getAttribute?.('href') || '';
                const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
                return `tag=${tag} id="${id}" class="${cls}" href="${href}" text="${text}"`;
            };
            let totalClicks = 0;
            // Ищем кнопки "Показать еще", "Подробнее" или похожие кнопки для раскрытия контента
            const moreButtons = Array.from(document.querySelectorAll('button, a, [class*="more"], [class*="show"], [class*="expand"], [class*="details"], [class*="load"]'))
                .filter(btn => {
                    const text = (btn.textContent?.trim() || '').toLowerCase();
                    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                    const className = (btn.className || '').toLowerCase();
                    return text.includes('показать еще') || 
                           text.includes('показать') || 
                           text.includes('подробнее') || 
                           text.includes('еще') ||
                           text.includes('развернуть') ||
                           text.includes('загрузить') ||
                           ariaLabel.includes('показать еще') ||
                           ariaLabel.includes('подробнее') ||
                           className.includes('show-more') ||
                           className.includes('load-more') ||
                           className.includes('more') ||
                           className.includes('expand');
                });
            
            // Кликаем по каждой кнопке несколько раз, пока она видна и активна
            for (const button of moreButtons) {
                let clickCount = 0;
                const maxClicks = 15; // Увеличиваем максимум кликов
                
                while (clickCount < maxClicks) {
                    const href = button.getAttribute?.('href') || '';
                    if (button.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                        console.log(`[Puppeteer] MORE_BUTTON_SKIP_LINK ${describeElement(button)}`);
                        break;
                    }
                    // Проверяем, видна ли кнопка и активна ли она
                    const isVisible = button.offsetParent !== null && 
                                     window.getComputedStyle(button).display !== 'none' &&
                                     window.getComputedStyle(button).visibility !== 'hidden';
                    const isEnabled = !button.disabled && !button.classList.contains('disabled');
                    
                    if (!isVisible || !isEnabled) {
                        break; // Кнопка скрыта или неактивна, выходим
                    }
                    
                    // Сохраняем текущее состояние контента перед кликом
                    const contentBefore = document.body.innerHTML.length;
                    const cardsBefore = document.querySelectorAll('.card, [class*="card"]').length;
                    
                    // Кликаем
                    console.log(`[Puppeteer] MORE_BUTTON_CLICK ${describeElement(button)} attempt=${clickCount + 1}/${maxClicks}`);
                    button.click();
                    clickCount++;
                    totalClicks++;
                    
                    // Ждем загрузки нового контента (увеличиваем время ожидания)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Проверяем, изменился ли контент
                    const contentAfter = document.body.innerHTML.length;
                    const cardsAfter = document.querySelectorAll('.card, [class*="card"]').length;
                    const contentChanged = Math.abs(contentAfter - contentBefore) > 100 || cardsAfter > cardsBefore;
                    
                    // Проверяем, видна ли кнопка после клика
                    const stillVisible = button.offsetParent !== null && 
                                        window.getComputedStyle(button).display !== 'none' &&
                                        window.getComputedStyle(button).visibility !== 'hidden';
                    
                    if (!stillVisible || !contentChanged) {
                        // Если контент не изменился, ждем еще немного и проверяем снова
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const finalContent = document.body.innerHTML.length;
                        const finalCards = document.querySelectorAll('.card, [class*="card"]').length;
                        if (Math.abs(finalContent - contentBefore) <= 100 && finalCards === cardsBefore) {
                            break; // Контент не изменился, значит весь контент раскрыт
                        }
                    }
                }
            }
            
            // Ждем финальной стабилизации контента
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return totalClicks;
        });
        
        if (moreButtonsClicked > 0) {
            console.log(`   ✓ Обработано кнопок "Показать еще"/"Подробнее": ${moreButtonsClicked} кликов`);
            // После кликов по кнопкам обновляем HTML контент страницы
            pageContent.html = await page.content();
            // Также обновляем текстовый контент
            pageContent.text = await page.evaluate(() => document.body.innerText);
        }
        
        // Извлекаем файлы через клики по элементам и скачиваем их
        // Сначала извлекаем файлы из основного контента
        let extractedFileLinks = await extractFileLinks(page, outputDir, safeSlug);
        
        // Если есть табы, извлекаем файлы из каждого таба отдельно
        if (pageContent.tabsContentJSON && pageContent.tabsContentJSON.tabsContent) {
            const isOffersPage = safeSlug === 'offers';
            const tabsFileLinksByTab = {};
            
            // Переключаемся на каждый таб и извлекаем файлы
            const tabNames = Object.keys(pageContent.tabsContentJSON.tabsContent);
            for (const tabName of tabNames) {
                try {
                    // Обрабатываем комбинации табов вида "таб1 > таб2"
                    let level1TabName = '';
                    let level2TabName = '';
                    let offersPrevSignature = null;
                    if (isOffersPage) {
                        offersPrevSignature = await page.evaluate(() => {
                            const items = Array.from(document.querySelectorAll('.files-list a.file-item, a.file-item'));
                            const firstText = items[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '';
                            return `${items.length}:${firstText}`;
                        });
                    }
                    
                    if (tabName.includes(' > ')) {
                        const parts = tabName.split(' > ');
                        level1TabName = parts[0].replace(/\[.*?\]/g, '').trim();
                        level2TabName = parts[1].replace(/\[.*?\]/g, '').trim();
                    } else {
                        // Если нет разделителя, это может быть либо таб первого уровня, либо таб второго уровня
                        const cleanTabName = tabName.replace(/\[.*?\]/g, '').trim();
                        level2TabName = cleanTabName;
                    }
                    
                    // Находим и кликаем по табам (разделяем на шаги)
                    let finalTabInfo = { clicked: false, tabText: '', clickedLevel1: false, clickedLevel2: false };
                    
                    // Шаг 1: Если есть таб первого уровня, кликаем на него
                    if (level1TabName) {
                        const level1TabInfo = await page.evaluate((level1TabName) => {
                            const allTabs = Array.from(document.querySelectorAll(
                                '[role="tab"], [data-tab], .tab-button, .tab-item, [class*="tab"], button[class*="tab"], a[class*="tab"], [class*="tab-stroke"], [class*="tab-button-item"]'
                            )).filter(t => {
                                const isScrollArrow = t.classList?.contains('scroll-arrow') ||
                                                     t.classList?.contains('arrow') ||
                                                     t.classList?.contains('nav-arrow');
                                return !isScrollArrow;
                            });
                            
                            const level1Tab = allTabs.find(t => {
                                const text = t.textContent?.trim() || '';
                                return text === level1TabName || text.includes(level1TabName);
                            });
                            
                            if (level1Tab) {
                                const isActive = level1Tab.getAttribute('aria-selected') === 'true' ||
                                              level1Tab.classList.contains('active') ||
                                              level1Tab.classList.contains('selected');
                                if (!isActive) {
                                    level1Tab.click();
                                    return { clicked: true, tabText: level1TabName };
                                }
                                return { clicked: false, tabText: level1TabName, alreadyActive: true };
                            }
                            return { clicked: false, tabText: level1TabName, notFound: true };
                        }, level1TabName);
                        
                        if (level1TabInfo.clicked || level1TabInfo.alreadyActive) {
                            finalTabInfo.clickedLevel1 = true;
                            // Ждем появления табов второго уровня
                            await new Promise(resolve => setTimeout(resolve, 800));
                        } else {
                            console.log(`   ⚠️  Таб первого уровня "${level1TabName}" не найден`);
                        }
                    }
                    
                    // Шаг 2: Кликаем на таб второго уровня
                    if (level2TabName) {
                        const level2TabInfo = await page.evaluate((level2TabName) => {
                            const allTabs = Array.from(document.querySelectorAll(
                                '[role="tab"], [data-tab], .tab-button, .tab-item, [class*="tab"], button[class*="tab"], a[class*="tab"], [class*="tab-stroke"], [class*="tab-button-item"]'
                            )).filter(t => {
                                const isScrollArrow = t.classList?.contains('scroll-arrow') ||
                                                     t.classList?.contains('arrow') ||
                                                     t.classList?.contains('nav-arrow');
                                return !isScrollArrow;
                            });
                            
                            const level2Tab = allTabs.find(t => {
                                const text = t.textContent?.trim() || '';
                                return text === level2TabName || text.includes(level2TabName);
                            });
                            
                            if (level2Tab) {
                                const isActive = level2Tab.getAttribute('aria-selected') === 'true' ||
                                              level2Tab.classList.contains('active') ||
                                              level2Tab.classList.contains('selected');
                                if (!isActive) {
                                    level2Tab.click();
                                    return { clicked: true, tabText: level2TabName };
                                }
                                return { clicked: false, tabText: level2TabName, alreadyActive: true };
                            }
                            return { clicked: false, tabText: level2TabName, notFound: true };
                        }, level2TabName);
                        
                        finalTabInfo.clickedLevel2 = level2TabInfo.clicked || level2TabInfo.alreadyActive;
                        finalTabInfo.clicked = finalTabInfo.clicked || level2TabInfo.clicked;
                        finalTabInfo.alreadyActive = level2TabInfo.alreadyActive;
                        finalTabInfo.tabText = level1TabName && level2TabName ? `${level1TabName} > ${level2TabName}` : level2TabName;
                        finalTabInfo.level2NotFound = level2TabInfo.notFound;
                    }
                    
                    if (finalTabInfo.clicked || finalTabInfo.alreadyActive || (finalTabInfo.clickedLevel1 && finalTabInfo.clickedLevel2)) {
                        // Ждем загрузки контента таба (увеличиваем время ожидания)
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Дополнительно ждем, пока контент стабилизируется
                        await page.evaluate(async () => {
                            let previousLength = document.body.innerHTML.length;
                            for (let i = 0; i < 5; i++) {
                                await new Promise(resolve => setTimeout(resolve, 200));
                                const currentLength = document.body.innerHTML.length;
                                if (currentLength === previousLength) {
                                    break; // Контент стабилизировался
                                }
                                previousLength = currentLength;
                            }
                        });
                        
                        let tabFileLinks = {};
                        if (isOffersPage) {
                            const shouldWaitForOffersUpdate = finalTabInfo.clicked || finalTabInfo.clickedLevel1 || finalTabInfo.clickedLevel2;
                            if (shouldWaitForOffersUpdate) {
                                await page.waitForFunction((prevSignature) => {
                                    const items = Array.from(document.querySelectorAll('.files-list a.file-item, a.file-item'));
                                    const firstText = items[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '';
                                    const signature = `${items.length}:${firstText}`;
                                    return items.length > 0 && signature !== prevSignature;
                                }, { timeout: 15000 }, offersPrevSignature).catch(() => {});
                            }
                            // Для offers: читаем файлы из списка без скачивания и с ожиданием обновления
                            await page.waitForFunction(() => {
                                return document.querySelectorAll('.files-list a.file-item, a.file-item').length > 0;
                            }, { timeout: 15000 }).catch(() => {});
                            const offersLinks = await page.evaluate(() => {
                                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                                return Array.from(document.querySelectorAll('.files-list a.file-item, a.file-item')).map(el => {
                                    const nameEl = el.querySelector('.file-name, [class*="file-name"]');
                                    const sizeEl = el.querySelector('.file-size, [class*="file-size"]');
                                    const text = normalize(nameEl ? nameEl.textContent : el.textContent);
                                    const href = el.getAttribute('href') || '';
                                    const fileType = normalize(sizeEl ? sizeEl.textContent : '') || (href.match(/\.([^.]+)(\?|$)/i)?.[1]?.toLowerCase() || 'unknown');
                                    return { text, href, fileType };
                                }).filter(item => item.text && item.href);
                            });
                            offersLinks.forEach(item => {
                                let href = item.href;
                                if (href.startsWith('/')) {
                                    href = `https://business.mgts.ru${href}`;
                                } else if (!href.startsWith('http')) {
                                    href = `https://business.mgts.ru/${href}`;
                                }
                                tabFileLinks[item.text] = {
                                    href,
                                    fileType: item.fileType || 'unknown',
                                    title: ''
                                };
                            });
                        } else {
                            // Извлекаем файлы из текущего таба (только из активного контента)
                            // Определяем селектор активного контента таба
                            const activeTabContentSelector = await page.evaluate(() => {
                                // Ищем активный контейнер контента таба
                                const activePanel = document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
                                                  document.querySelector('.tab-content.active') ||
                                                  document.querySelector('.tab-panel.active') ||
                                                  document.querySelector('[class*="tab-content"][class*="active"]') ||
                                                  document.querySelector('[class*="tab-panel"][class*="active"]') ||
                                                  document.querySelector('article');
                                
                                if (activePanel && activePanel.id) {
                                    return `#${activePanel.id}`;
                                }
                                // Если нет ID, используем класс или другой селектор
                                if (activePanel) {
                                    const classes = Array.from(activePanel.classList).filter(c => c.includes('tab') || c.includes('content') || c.includes('panel'));
                                    if (classes.length > 0) {
                                        return `.${classes[0]}`;
                                    }
                                }
                                return null;
                            });
                            
                            // Извлекаем файлы только из активного контента таба
                            tabFileLinks = await extractFileLinks(page, outputDir, safeSlug, null, activeTabContentSelector);
                        }
                        
                        if (Object.keys(tabFileLinks).length > 0) {
                            // Используем оригинальное имя таба из JSON для ключа
                            tabsFileLinksByTab[tabName] = tabFileLinks;
                            const displayName = level2TabName || level1TabName || tabName.replace(/\[.*?\]/g, '').trim();
                            console.log(`   ✓ Извлечено файлов из таба "${displayName}": ${Object.keys(tabFileLinks).length}`);
                        } else {
                            const displayName = level2TabName || level1TabName || tabName.replace(/\[.*?\]/g, '').trim();
                            console.log(`   ⚠️  Файлы не найдены в табе "${displayName}"`);
                        }
                    } else {
                        const displayName = level2TabName || level1TabName || tabName.replace(/\[.*?\]/g, '').trim();
                        if (finalTabInfo.notFound) {
                            console.log(`   ⚠️  Таб "${displayName}" не найден на странице`);
                        } else if (finalTabInfo.level2NotFound) {
                            console.log(`   ⚠️  Таб второго уровня "${displayName}" не найден после клика на таб первого уровня`);
                        } else {
                            console.log(`   ⚠️  Таб "${displayName}" не кликабелен`);
                        }
                    }
                } catch (error) {
                    console.warn(`   ⚠️  Ошибка при извлечении файлов из таба "${tabName}": ${error.message}`);
                }
            }
            
            // Сохраняем файлы по табам для передачи в LLM (НЕ объединяем в общий список)
            // Каждый таб должен иметь свои файлы отдельно
            if (Object.keys(tabsFileLinksByTab).length > 0) {
                pageContent.tabsFileLinksByTab = tabsFileLinksByTab;
                console.log(`   ✓ Файлы извлечены из ${Object.keys(tabsFileLinksByTab).length} табов отдельно`);
                
                // Восстанавливаем оригинальные функции console перед сохранением лога
                console.log = originalConsoleLog;
                console.warn = originalConsoleWarn;
                console.error = originalConsoleError;
                
                // Сохраняем лог до отправки в LLM (после обработки табов и файлов)
                const logFilePath = path.join(outputDir, `${safeSlug}_pre_llm.log`);
                const logContent = preLLMLogs.join('\n');
                fs.writeFileSync(logFilePath, logContent);
                console.log(`📝 Лог до отправки в LLM сохранен: ${logFilePath}`);
                console.log('');
                
                // Восстанавливаем перехват логов для дальнейшей работы
                console.log = (...args) => captureLog('LOG', ...args);
                console.warn = (...args) => captureLog('WARN', ...args);
                console.error = (...args) => captureLog('ERROR', ...args);
            }
        }
        
        if (Object.keys(extractedFileLinks).length > 0) {
            pageContent.extractedFileLinks = extractedFileLinks;
            console.log(`   ✓ Скачано файлов: ${Object.keys(extractedFileLinks).length}`);
        }
        
        // Извлекаем fileLinks и текстовый контент из JSON контента табов для передачи в LLM
        let tabsFileLinksData = null;
        let tabsContentData = null;
        if (pageContent.tabsContentJSON && pageContent.tabsContentJSON.tabsContent) {
            const { JSDOM } = require('jsdom');
            tabsFileLinksData = {};
            tabsContentData = {};
            
            Object.keys(pageContent.tabsContentJSON.tabsContent).forEach(tabName => {
                const htmlContent = pageContent.tabsContentJSON.tabsContent[tabName];
                
                // Пропускаем ключи, которые содержат несколько названий табов (слипшихся вместе)
                if (tabName.length > 100 || tabName.includes('2019 —1990 — 20181946')) {
                    return;
                }
                
                try {
                    const dom = new JSDOM(htmlContent);
                    const doc = dom.window.document;
                    const fileLinks = [];
                    
                    // ПРИОРИТЕТ 1: Используем файлы, извлеченные из таба через extractFileLinks (если есть)
                    // Это файлы, которые были реально найдены при переключении на таб
                    if (pageContent.tabsFileLinksByTab && pageContent.tabsFileLinksByTab[tabName]) {
                        Object.entries(pageContent.tabsFileLinksByTab[tabName]).forEach(([text, fileData]) => {
                            fileLinks.push({
                                text: text,
                                href: fileData.localPath || fileData.href || '',
                                fileType: fileData.fileType || 'unknown',
                                title: fileData.title || ''
                            });
                        });
                    }
                    
                    // ПРИОРИТЕТ 2: Извлекаем все ссылки на файлы из HTML контента таба
                    // Это КРИТИЧЕСКИ ВАЖНО, так как в HTML могут быть ссылки, которые не были найдены через extractFileLinks
                    // И это основной способ извлечения файлов для табов, где контент не извлекается правильно
                    doc.querySelectorAll('a[href]').forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && /\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv|xml|json|pptx|ppt|odt|ods)$/i.test(href)) {
                            // Делаем URL абсолютным, если он относительный
                            let absoluteHref = href;
                            if (href.startsWith('/')) {
                                absoluteHref = `https://business.mgts.ru${href}`;
                            } else if (!href.startsWith('http')) {
                                absoluteHref = `https://business.mgts.ru/${href}`;
                            }
                            
                            // Извлекаем текст ссылки
                            const fileNameEl = link.querySelector('.file-name, [class*="file-name"]');
                            const linkText = fileNameEl ? fileNameEl.textContent.trim() : link.textContent.trim();
                            const fileType = href.match(/\.([^.]+)$/i)?.[1]?.toLowerCase() || 'unknown';
                            
                            // Проверяем, не добавлен ли уже этот файл (по href или по тексту)
                            const alreadyAdded = fileLinks.some(fl => {
                                const flHref = fl.href || '';
                                return flHref === absoluteHref || 
                                       flHref === href ||
                                       (fl.text && linkText && fl.text.trim() === linkText.trim());
                            });
                            
                            if (!alreadyAdded && linkText && linkText.length > 0) {
                                fileLinks.push({
                                    text: linkText || href.split('/').pop(),
                                    href: absoluteHref,
                                    fileType: fileType
                                });
                            }
                        }
                    });
                    
                    // Извлекаем текстовый контент таба (без HTML тегов)
                    const textContent = doc.body.textContent.trim();
                    
                    // Сохраняем fileLinks, если есть
                    if (fileLinks.length > 0) {
                        tabsFileLinksData[tabName] = fileLinks;
                    }
                    
                    // Всегда сохраняем текстовый контент для таба
                    if (textContent && textContent.length > 50) {
                        tabsContentData[tabName] = {
                            text: textContent.substring(0, 2000), // Ограничиваем длину
                            htmlLength: htmlContent.length
                        };
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            });
            
            if (Object.keys(tabsFileLinksData).length > 0) {
                console.log(`   ✓ Извлечено fileLinks для ${Object.keys(tabsFileLinksData).length} табов`);
            }
            if (Object.keys(tabsContentData).length > 0) {
                console.log(`   ✓ Извлечен текстовый контент для ${Object.keys(tabsContentData).length} табов`);
            }
        }
        
        // Анализируем с помощью LLM (комбинированный режим: скриншот + HTML + JSON)
        let analysis;

        if (slug === 'video_surveillance_building') {
            console.log('\n🧩 Анализируем только H1 чанк с формой (по запросу)...');
            const formChunk = splitPageIntoChunksByH1(pageContent.html, pageContent.text, LONG_PAGE_THRESHOLD)
                .find(chunk => (chunk.title || '').toLowerCase().includes('мгтс заинтересована'));

            if (formChunk) {
                const chunkTag = (formChunk.tag || '').toLowerCase();
                const isSection = chunkTag === 'h1' || chunkTag === 'div.title-promo-long__title-text';
                const selectors = chunkTag ? [chunkTag] : ['h1', 'h2', 'h3', 'h4'];
                const formScreenshot = await getChunkScreenshot(
                    page,
                    formChunk.title,
                    formChunk.occurrence || 1,
                    { fullWidth: true, useCardBackground: false, selectors, sectionBySelector: isSection, exactMatch: true }
                );
                const formScreenshotToUse = formScreenshot || screenshotBase64;
                const formLabel = `chunk_form_${formChunk.title || 'form'}`;
                const formScreenshotPath = saveLLMScreenshot(outputDir, safeSlug, formLabel, formScreenshotToUse);
                console.log(`   ✓ LLM скриншот чанка формы сохранен: ${formScreenshotPath}`);

                const chunkAnalysis = await analyzeWithLLMScreenshot(
                    formScreenshotToUse,
                    formChunk.html,
                    formChunk.text,
                    pageUrl,
                    tabsFileLinksData,
                    tabsContentData,
                    pageContent.selectOptionsData,
                    { index: 1, total: 1, title: formChunk.title || '' }
                );

                const specPath = path.join(outputDir, `${safeSlug}_spec.json`);
                let existingSpec = null;
                if (fs.existsSync(specPath)) {
                    try {
                        existingSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
                    } catch {
                        existingSpec = null;
                    }
                }

                const baseSpec = existingSpec || {
                    page: {
                        slug,
                        url: pageUrl,
                        pathname: new URL(pageUrl).pathname,
                        analyzedAt: new Date().toISOString(),
                        screenshot: path.join(outputDir, `${safeSlug}_screenshot.png`),
                        llmProvider: process.env.LLM_PROVIDER || 'unknown',
                        llmModel: process.env.LLM_MODEL || 'unknown'
                    },
                    metadata: { title: '' },
                    sections: []
                };

                const newSections = (chunkAnalysis.sections || []).filter(section => {
                    const title = (section.title || '').trim();
                    const text = (section.text || '').trim();
                    const description = (section.description || '').trim();
                    const hasCards = Array.isArray(section.cards) && section.cards.length > 0;
                    return title || text || description || hasCards;
                });

                newSections.forEach(section => {
                    const title = (section.title || '').trim();
                    const type = section.type || '';
                    const isDuplicate = baseSpec.sections.some(existing =>
                        (existing.type || '') === type && (existing.title || '').trim() === title && title
                    );
                    if (!isDuplicate) {
                        baseSpec.sections.push(section);
                    }
                });

                baseSpec.sections.forEach((section, index) => {
                    section.sectionIndex = index + 1;
                });

                baseSpec.page.analyzedAt = new Date().toISOString();
                fs.writeFileSync(specPath, JSON.stringify(baseSpec, null, 2));
                console.log(`✅ Обновлен spec с формой: ${specPath}`);
                return;
            }
            console.warn('⚠️  Не удалось найти H1 чанк с формой, продолжаем стандартный анализ.');
        }
        
        // Если страница слишком длинная, обрабатываем по частям
        if (shouldSplitPage) {
            console.log(`\n   ⚠️  Страница слишком длинная (${(pageContent.html.length / 1024).toFixed(1)} KB), разбиваем на части...`);
            process.stdout.write('   🔧 Разбиение страницы на части...');
            const startTime = Date.now();
            const chunks = splitPageIntoChunksByH1(pageContent.html, pageContent.text, LONG_PAGE_THRESHOLD);
            const splitTime = Date.now() - startTime;
            process.stdout.write(` ✓ (${chunks.length} частей, ${(splitTime / 1000).toFixed(1)} сек)\n`);
            console.log('');
            
            const allSections = [];
            let sectionIndex = 1;
            
            // Обрабатываем каждую часть отдельно
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkStartTime = Date.now();
                console.log(`[${new Date().toISOString()}] 🔄 Обработка части ${i + 1}/${chunks.length}: "${chunk.title}"`);
                // Визуальный вывод прогресса
                const progress = ((i + 1) / chunks.length * 100).toFixed(1);
                console.log(`\n   ${'='.repeat(60)}`);
                console.log(`   🔄 Обработка части ${i + 1}/${chunks.length} (${progress}%)`);
                console.log(`   📄 Заголовок: "${chunk.title}"`);
                console.log(`   📊 Размер: ${(chunk.html.length / 1024).toFixed(1)} KB HTML, ${(chunk.text.length / 1024).toFixed(1)} KB текста`);
                console.log(`   ${'='.repeat(60)}`);
                
                try {
                    // Получаем скриншот фрагмента, соответствующего этой части HTML
                    console.log(`   📸 Получение скриншота фрагмента...`);
                    let chunkScreenshot = null;
                    if (chunk.title && chunk.title !== 'Весь контент' && !chunk.title.startsWith('Часть ')) {
                        const chunkTag = (chunk.tag || '').toLowerCase();
                        const isSection = chunkTag === 'h1' || chunkTag === 'div.title-promo-long__title-text';
                        const selectors = chunkTag ? [chunkTag] : ['h1', 'h2', 'h3', 'h4'];
                        const fullWidth = isSection;
                        const useCardBackground = !isSection;
                        chunkScreenshot = await getChunkScreenshot(
                            page,
                            chunk.title,
                            chunk.occurrence || 1,
                            { fullWidth, useCardBackground, selectors, sectionBySelector: isSection }
                        );
                        if (chunkScreenshot) {
                            console.log(`   ✓ Скриншот фрагмента получен`);
                        } else {
                            console.log(`   ⚠️  Используется полный скриншот (фрагмент не найден)`);
                        }
                    }
                    
                    // Используем скриншот фрагмента, если он есть, иначе полный скриншот
                    const screenshotToUse = chunkScreenshot || screenshotBase64;
                    const chunkLabelBase = chunk.title ? `chunk_${i + 1}_${chunk.title}` : `chunk_${i + 1}`;
                    const llmChunkScreenshotPath = saveLLMScreenshot(
                        outputDir,
                        safeSlug,
                        chunkScreenshot ? chunkLabelBase : `${chunkLabelBase}_full`,
                        screenshotToUse
                    );
                    console.log(`   ✓ LLM скриншот части сохранен: ${llmChunkScreenshotPath}`);
                    
                    // Анализируем часть через LLM
                    process.stdout.write(`   📤 Отправка в LLM...`);
                    
                    // Показываем прогресс ожидания
                    let waitDots = 0;
                    const progressInterval = setInterval(() => {
                        waitDots++;
                        process.stdout.write(`\r   ⏳ Ожидание ответа от LLM${'.'.repeat(waitDots % 4)}   `);
                    }, 1000);
                    
                    const chunkAnalysis = await analyzeWithLLMScreenshot(
                        screenshotToUse,
                        chunk.html,
                        chunk.text,
                        pageUrl,
                        tabsFileLinksData,
                        tabsContentData,
                        pageContent.selectOptionsData,
                        { index: i + 1, total: chunks.length, title: chunk.title || '' }
                    );
                    
                    clearInterval(progressInterval);
                    process.stdout.write(`\r   ✅ Получен ответ от LLM\n`);
                    
                    const chunkTime = Date.now() - chunkStartTime;
                    
                    if (chunkAnalysis.error) {
                        console.warn(`   ⚠️  Ошибка при анализе части ${i + 1} (${(chunkTime / 1000).toFixed(1)} сек): ${chunkAnalysis.error}`);
                        continue;
                    }
                    
                    process.stdout.write(` ✓\n`);
                    console.log(`   ✅ Часть ${i + 1} обработана за ${(chunkTime / 1000).toFixed(1)} сек`);
                    console.log(`   📋 Найдено секций: ${chunkAnalysis.sections?.length || 0}`);
                    
                    // Обновляем индексы секций и добавляем их в общий список
                    if (chunkAnalysis.sections && chunkAnalysis.sections.length > 0) {
                        let addedSections = 0;
                        chunkAnalysis.sections.forEach(section => {
                            section._sourceChunk = {
                                index: i + 1,
                                title: chunk.title || '',
                                screenshot: llmChunkScreenshotPath ? path.basename(llmChunkScreenshotPath) : ''
                            };
                            // Пропускаем breadcrumbs и hero из промежуточных частей (оставляем только из первой)
                            if (i > 0 && (section.type === 'breadcrumbs' || section.type === 'hero')) {
                                return;
                            }
                            
                            // Проверяем на дубликаты: ищем секцию с таким же типом и заголовком
                            const sectionTitle = section.title || '';
                            const sectionType = section.type || '';
                            const sectionDescription = section.description || '';
                            
                            let existingSectionIndex = allSections.findIndex(existingSection => {
                                const existingTitle = existingSection.title || '';
                                const existingType = existingSection.type || '';
                                const existingDescription = existingSection.description || '';
                                
                                // Для секций типа "header", "page_header", "content" - считаем дубликатом если заголовок совпадает
                                // (они могут описывать одно и то же, но с разных точек зрения)
                                if ((sectionType === 'header' || sectionType === 'page_header' || sectionType === 'content') && 
                                    (existingType === 'header' || existingType === 'page_header' || existingType === 'content') &&
                                    sectionTitle === existingTitle && sectionTitle !== '') {
                                    return true;
                                }
                                
                                // Для секций типа "tabs" - считаем дубликатом если тип и заголовок совпадают
                                if (sectionType === 'tabs' && existingType === 'tabs') {
                                    // Если оба без заголовка, проверяем описание
                                    if (sectionTitle === '' && existingTitle === '') {
                                        const desc1 = sectionDescription.substring(0, 150);
                                        const desc2 = existingDescription.substring(0, 150);
                                        if (desc1 === desc2 && desc1.length > 50) {
                                            return true;
                                        }
                                    }
                                    // Если заголовки совпадают
                                    if (sectionTitle === existingTitle && sectionTitle !== '') {
                                        return true;
                                    }
                                }
                                
                                // Для секций типа "file-list", "files-list", "files", "document_list" - считаем дубликатом если описание совпадает
                                if ((sectionType === 'file-list' || sectionType === 'files-list' || sectionType === 'files' || sectionType === 'document_list') &&
                                    (existingType === 'file-list' || existingType === 'files-list' || existingType === 'files' || existingType === 'document_list')) {
                                    const desc1 = sectionDescription.substring(0, 150);
                                    const desc2 = existingDescription.substring(0, 150);
                                    if (desc1 === desc2 && desc1.length > 50) {
                                        return true;
                                    }
                                    // Также проверяем по fileLinks - если они одинаковые, это дубликат
                                    const fileLinks1 = section.links?.fileLinks || [];
                                    const fileLinks2 = existingSection.links?.fileLinks || [];
                                    if (fileLinks1.length > 0 && fileLinks2.length > 0 && fileLinks1.length === fileLinks2.length) {
                                        const hrefs1 = new Set(fileLinks1.map(f => f.href).filter(Boolean));
                                        const hrefs2 = new Set(fileLinks2.map(f => f.href).filter(Boolean));
                                        if (hrefs1.size === hrefs2.size && [...hrefs1].every(h => hrefs2.has(h))) {
                                            return true;
                                        }
                                    }
                                }
                                
                                // Для других типов - считаем дубликатом если тип и заголовок совпадают
                                if (sectionType === existingType && sectionType !== '' && sectionTitle === existingTitle && sectionTitle !== '') {
                                    return true;
                                }
                                
                                return false;
                            });
                            
                            // Для tabs: если уже есть секция tabs, всегда считаем дубликатом и объединяем
                            if (existingSectionIndex === -1 && sectionType === 'tabs') {
                                existingSectionIndex = allSections.findIndex(existingSection => existingSection.type === 'tabs');
                            }
                            
                            if (existingSectionIndex !== -1) {
                                // Найден дубликат
                                const existingSection = allSections[existingSectionIndex];
                                
                                // Для секций типа "tabs" пытаемся объединить контент вместо пропуска
                                if (sectionType === 'tabs' && section.tabs && existingSection.tabs) {
                                    // Объединяем табы, если они не полностью совпадают
                                    const existingTabTitles = new Set(existingSection.tabs.map(t => t.title).filter(Boolean));
                                    let hasNewTabs = false;
                                    
                                    section.tabs.forEach(newTab => {
                                        if (newTab.title && !existingTabTitles.has(newTab.title)) {
                                            existingSection.tabs.push(newTab);
                                            existingTabTitles.add(newTab.title);
                                            hasNewTabs = true;
                                        }
                                    });
                                    
                                    if (hasNewTabs) {
                                        console.log(`   🔗 Объединены табы в секции: "${sectionTitle}"`);
                                    } else {
                                        console.log(`   ⏭️  Пропущена дублирующая секция: "${sectionTitle}" (тип: ${sectionType})`);
                                    }
                                } else {
                                    console.log(`   ⏭️  Пропущена дублирующая секция: "${sectionTitle}" (тип: ${sectionType})`);
                                }
                                return; // Пропускаем дубликат
                            }
                            
                            // Проверяем и логируем таблицы
                            if (section.table) {
                                const tableRows = section.table.rows?.length || 0;
                                const tableHeaders = section.table.headers?.length || 0;
                                if (tableRows === 0 && tableHeaders === 0) {
                                    // Пустая таблица - возможно, данные не извлечены
                                    console.warn(`   ⚠️  Секция "${section.title?.substring(0, 50)}" имеет пустую таблицу`);
                                } else {
                                    console.log(`   📊 Секция "${section.title?.substring(0, 50)}" содержит таблицу: ${tableRows} строк, ${tableHeaders} заголовков`);
                                }
                            }
                            
                            section.sectionIndex = sectionIndex++;
                            allSections.push(section);
                            addedSections++;
                        });
                        console.log(`   ➕ Добавлено секций: ${addedSections}`);
                    }
                } catch (error) {
                    const chunkTime = Date.now() - chunkStartTime;
                    process.stdout.write(` ❌\n`);
                    console.error(`   ❌ Критическая ошибка при обработке части ${i + 1} (${(chunkTime / 1000).toFixed(1)} сек):`, error.message);
                    console.error(`   📍 Стек ошибки:`, error.stack);
                    // Продолжаем обработку следующих частей
                    continue;
                }
                
                // Показываем прогресс (уже выведен выше)
                // const progress = ((i + 1) / chunks.length * 100).toFixed(1);
                // console.log(`   📊 Прогресс: ${progress}% (${i + 1}/${chunks.length} частей)`);
            }
            
            // Проверяем пустые таблицы в объединенном результате
            const emptyTables = [];
            allSections.forEach((section, index) => {
                if (section.table && (!section.table.headers || section.table.headers.length === 0) && 
                    (!section.table.rows || section.table.rows.length === 0)) {
                    emptyTables.push({
                        sectionIndex: section.sectionIndex || index + 1,
                        title: section.title?.substring(0, 50) || 'без заголовка',
                        type: section.type
                    });
                }
            });
            
            if (emptyTables.length > 0) {
                console.warn(`\n   ⚠️  Обнаружено ${emptyTables.length} секций с пустыми таблицами:`);
                emptyTables.forEach(et => {
                    console.warn(`      - Секция ${et.sectionIndex} (${et.type}): "${et.title}"`);
                });
                console.warn(`   💡 Возможно, данные из таблиц не были извлечены LLM из HTML\n`);
            }
            
            // Создаем объединенный результат
            analysis = {
                sections: allSections
            };
            const totalTime = Date.now() - startTime;
            console.log(`\n   ${'='.repeat(60)}`);
            console.log(`   ✅ Обработка всех частей завершена`);
            console.log(`   📊 Итого: ${allSections.length} секций из ${chunks.length} частей`);
            console.log(`   ⏱️  Общее время: ${(totalTime / 1000).toFixed(1)} сек`);
            console.log(`   ${'='.repeat(60)}\n`);
        } else {
            // Обычная обработка для коротких страниц
            if (mode === 'screenshot') {
                // Режим: скриншот + HTML + JSON (рекомендуется)
                analysis = await analyzeWithLLMScreenshot(
                    screenshotBase64,
                    pageContent.html,
                    pageContent.text,
                    pageUrl,
                    tabsFileLinksData,
                    tabsContentData,
                    pageContent.selectOptionsData,
                    { index: 1, total: 1, title: 'full-page' }
                );
            } else {
                // Режим: только HTML (устаревший, но оставляем для совместимости)
                analysis = await analyzeWithLLMScreenshot(
                    screenshotBase64,
                    pageContent.html,
                    pageContent.text,
                    pageUrl,
                    tabsFileLinksData,
                    tabsContentData,
                    pageContent.selectOptionsData,
                    { index: 1, total: 1, title: 'full-page' }
                );
            }
        }
        
        if (analysis.error) {
            console.error('❌ Ошибка анализа:', analysis.error);
            if (analysis.rawResponse) {
                // Сохраняем сырой ответ для отладки
                fs.writeFileSync(
                    path.join(outputDir, `${safeSlug}_llm_raw_response.txt`),
                    analysis.rawResponse
                );
            }
            return;
        }
        
        console.log(`   ✓ LLM проанализировал страницу`);
        console.log(`   ✓ Найдено секций: ${analysis.sections?.length || 0}`);
        
        // Сохраняем результат
        let metadata = {
            title: '',
            url: pageUrl,
            pathname: new URL(pageUrl).pathname
        };
        try {
            metadata = await page.evaluate(() => ({
                title: document.title || '',
                url: window.location.href,
                pathname: window.location.pathname
            }));
        } catch (error) {
            console.warn(`⚠️  Не удалось получить metadata страницы: ${error.message}`);
        }
        
        let heroCandidate = { title: '', text: '' };
        try {
            heroCandidate = await page.evaluate(() => {
                const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
                const promoTitleEl = document.querySelector('.title-promo-long__title-text');
                const promoTextEl = document.querySelector('.title-promo-long__description-text');
                if (promoTitleEl) {
                    return {
                        title: normalize(promoTitleEl.textContent),
                        text: promoTextEl ? normalize(promoTextEl.textContent) : ''
                    };
                }
                const h1 = document.querySelector('h1');
                const title = h1 ? normalize(h1.textContent) : '';
                let text = '';
                if (h1) {
                    const container = h1.closest('section, header, .page-header, .hero, [class*="hero"], [class*="page-header"], [class*="banner"]') || h1.parentElement;
                    if (container) {
                        const textEl = container.querySelector('p, .subtitle, .description, .text, .lead, [class*="subtitle"], [class*="description"], [class*="text"]');
                        if (textEl) {
                            text = normalize(textEl.textContent);
                        }
                    }
                }
                return { title, text };
            });
        } catch (error) {
            console.warn(`⚠️  Не удалось получить heroCandidate: ${error.message}`);
        }
        
        const result = {
            page: {
                slug: slug,
                url: metadata.url,
                pathname: metadata.pathname,
                analyzedAt: new Date().toISOString(),
                screenshot: screenshotPath,
                llmProvider: LLM_CONFIG.provider,
                llmModel: LLM_CONFIG.model
            },
            metadata: {
                title: metadata.title
            },
            sections: analysis.sections || []
        };
        
        // Нормализуем hero, чтобы избежать ошибок из-за разбиения на части
        const desiredHeroTitle = (heroCandidate.title || metadata.title || '').trim();
        const desiredHeroText = (heroCandidate.text || '').trim();
        if (desiredHeroTitle) {
            const existingHeroIndex = result.sections.findIndex(section => section.type === 'hero');
            if (existingHeroIndex === -1) {
                result.sections.unshift({
                    sectionIndex: 1,
                    type: 'hero',
                    description: 'Главный заголовок страницы',
                    title: desiredHeroTitle,
                    subtitle: '',
                    text: desiredHeroText,
                    elements: [],
                    images: [],
                    links: { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] },
                    cards: [],
                    tabs: [],
                    table: null
                });
            } else {
                const existingHero = result.sections[existingHeroIndex];
                if (existingHero.title && existingHero.title !== desiredHeroTitle) {
                    // Смещаем ошибочный hero в заголовок секции и вставляем корректный
                    existingHero.type = 'section-header';
                    existingHero.description = existingHero.description || 'Заголовок секции';
                    result.sections.unshift({
                        sectionIndex: 1,
                        type: 'hero',
                        description: 'Главный заголовок страницы',
                        title: desiredHeroTitle,
                        subtitle: '',
                        text: desiredHeroText,
                        elements: [],
                        images: [],
                        links: { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] },
                        cards: [],
                        tabs: [],
                        table: null
                    });
                } else {
                    // Обновляем hero, если данные отсутствуют
                    existingHero.title = desiredHeroTitle || existingHero.title;
                    if (!existingHero.text && desiredHeroText) {
                        existingHero.text = desiredHeroText;
                    }
                }
            }
        }

        // Нормализуем структуру шагов и модальных окон для procedure_admission_work
        if (slug === 'procedure_admission_work') {
            const stepsFromPage = await extractAdmissionWorkSteps(page);
            const modalContents = pageContent.modalContents || [];
            const modalCards = modalContents.length > 0 ? buildProcedureModalCards(modalContents) : [];
            const procedureForms = await extractProcedureForms(page);
            const extraBlocks = await extractProcedureExtraBlocks(page);
            
            // Оставляем только базовые секции + добавляем структурированные шаги/модалки
            const keepTypes = new Set(['hero', 'sidebar', 'breadcrumbs', 'files-list', 'file-list', 'notice', 'table']);
            result.sections = result.sections.filter(section => keepTypes.has(section.type));

            // Оставляем только одно боковое меню (с максимальным числом ссылок)
            const sidebarSections = result.sections.filter(section => section.type === 'sidebar');
            if (sidebarSections.length > 1) {
                const bestSidebar = sidebarSections.reduce((best, current) => {
                    const bestCount = best.links?.internalLinks?.length || 0;
                    const currentCount = current.links?.internalLinks?.length || 0;
                    return currentCount > bestCount ? current : best;
                }, sidebarSections[0]);
                result.sections = result.sections.filter(section => section.type !== 'sidebar' || section === bestSidebar);
            }
            
            if (stepsFromPage.length > 0) {
                result.sections.push({
                    sectionIndex: result.sections.length + 1,
                    type: 'steps',
                    description: 'Исходные шаги процедуры',
                    title: 'Порядок допуска для проведения работ',
                    text: '',
                    elements: stepsFromPage.map(step => ({
                        type: 'step',
                        index: step.index,
                        number: step.number,
                        title: step.title,
                        hasMore: step.hasMore
                    })),
                    images: [],
                    links: { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] },
                    cards: [],
                    tabs: [],
                    table: null
                });
            }
            
            if (modalCards.length > 0) {
                result.sections.push({
                    sectionIndex: result.sections.length + 1,
                    type: 'modal-cards',
                    description: 'Детализация шагов из модальных окон (связано по stepIndex)',
                    title: 'Детализация шагов',
                    text: '',
                    elements: [],
                    images: [],
                    links: { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] },
                    cards: modalCards,
                    tabs: [],
                    table: null
                });
            }
            
            if (procedureForms.length > 0) {
                result.sections.push({
                    sectionIndex: result.sections.length + 1,
                    type: 'forms',
                    description: 'Формы на странице (не модальные)',
                    title: 'Формы для заполнения',
                    text: '',
                    elements: procedureForms,
                    images: [],
                    links: { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] },
                    cards: [],
                    tabs: [],
                    table: null
                });
            }
            
            if (extraBlocks.length > 0) {
                extraBlocks.forEach(block => {
                    result.sections.push({
                        sectionIndex: result.sections.length + 1,
                        type: block.type,
                        description: block.type === 'contact-banner'
                            ? 'Контактный блок перед футером'
                            : 'Информационный блок перед футером',
                        title: block.title || '',
                        text: block.text || '',
                        elements: block.tags ? block.tags.map(tag => ({ text: tag })) : [],
                        images: [],
                        links: {
                            internalLinks: [],
                            externalLinks: (block.links || [])
                                .filter(link => link.href && !link.href.startsWith('/'))
                                .map(link => ({ text: link.text || '', href: link.href })),
                            fileLinks: (block.links || [])
                                .filter(link => link.href && /\.(pdf|docx?|xlsx?|pptx?)($|\\?)/i.test(link.href))
                                .map(link => ({ text: link.text || '', href: link.href })),
                            imageLinks: []
                        },
                        cards: [],
                        tabs: [],
                        table: null,
                        html: block.html || ''
                    });
                });
            }
        }

        // Нормализация для video_surveillance_office: удаляем дубли и собираем карточки
        if (slug === 'video_surveillance_office') {
            const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
            const sourceHtml = (pageContent.html || '').toLowerCase();
            const linkMatchesHtml = (href) => {
                if (!href || !sourceHtml) return false;
                const normalizedHref = href.toLowerCase();
                if (sourceHtml.includes(normalizedHref)) return true;
                try {
                    const url = new URL(href, pageUrl);
                    const path = (url.pathname || '').toLowerCase();
                    return path ? sourceHtml.includes(path) : false;
                } catch {
                    return false;
                }
            };
            const getCardKey = (card) => normalize(card?.title || card?.text || card?.label || '');
            const getSectionSignature = (section) => {
                const typeKey = normalize(section.type || '');
                const titleKey = normalize(section.title || '');
                const textKey = normalize(section.text || '').slice(0, 120);
                const cardKey = Array.isArray(section.cards)
                    ? section.cards.map(getCardKey).filter(Boolean).slice(0, 6).join('|')
                    : '';
                const mainKey = titleKey || cardKey || textKey;
                return [typeKey, mainKey, cardKey || textKey].filter(Boolean).join('::');
            };

            const seen = new Map();
            const deduped = [];
            let sidebarIndex = -1;
            let bestSidebarLinksCount = 0;

            result.sections.forEach(section => {
                if (section.type === 'sidebar') {
                    const filteredLinks = (section.links?.internalLinks || [])
                        .filter(link => linkMatchesHtml(link.href));
                    if (filteredLinks.length === 0) {
                        return;
                    }
                    section.links = {
                        internalLinks: filteredLinks,
                        externalLinks: section.links?.externalLinks || [],
                        fileLinks: section.links?.fileLinks || [],
                        imageLinks: section.links?.imageLinks || []
                    };
                    const linksCount = filteredLinks.length;
                    if (sidebarIndex === -1) {
                        sidebarIndex = deduped.length;
                        bestSidebarLinksCount = linksCount;
                        deduped.push(section);
                    } else if (linksCount > bestSidebarLinksCount) {
                        bestSidebarLinksCount = linksCount;
                        deduped[sidebarIndex] = section;
                    }
                    return;
                }

                if (section.type === 'hero') {
                    const heroKey = 'hero::' + normalize(section.title || '');
                    if (seen.has(heroKey)) {
                        return;
                    }
                    seen.set(heroKey, deduped.length);
                    deduped.push(section);
                    return;
                }

                const signature = getSectionSignature(section);
                if (!signature) {
                    deduped.push(section);
                    return;
                }

                if (seen.has(signature)) {
                    const existingIndex = seen.get(signature);
                    const existing = deduped[existingIndex];
                    if (existing && Array.isArray(existing.cards) && Array.isArray(section.cards)) {
                        const existingKeys = new Set(existing.cards.map(getCardKey).filter(Boolean));
                        section.cards.forEach(card => {
                            const key = getCardKey(card);
                            if (!key || existingKeys.has(key)) {
                                return;
                            }
                            existing.cards.push(card);
                            existingKeys.add(key);
                        });
                    }
                    return;
                }

                seen.set(signature, deduped.length);
                deduped.push(section);
            });

            result.sections = deduped;

            if (sourceHtml) {
                const findPos = (needle) => {
                    if (!needle) return -1;
                    const idx = sourceHtml.indexOf(needle.toLowerCase());
                    return idx;
                };
                const getSectionPos = (section) => {
                    const title = normalize(section.title || '');
                    if (title) {
                        const pos = findPos(title);
                        if (pos !== -1) return pos;
                    }
                    if (Array.isArray(section.cards)) {
                        for (const card of section.cards) {
                            const cardTitle = normalize(card?.title || '');
                            if (!cardTitle) continue;
                            const pos = findPos(cardTitle);
                            if (pos !== -1) return pos;
                        }
                    }
                    const text = normalize(section.text || '').slice(0, 120);
                    if (text) {
                        const pos = findPos(text);
                        if (pos !== -1) return pos;
                    }
                    return Number.MAX_SAFE_INTEGER;
                };

                result.sections = result.sections
                    .map((section, idx) => ({
                        section,
                        idx,
                        pos: getSectionPos(section)
                    }))
                    .sort((a, b) => (a.pos - b.pos) || (a.idx - b.idx))
                    .map(item => item.section);
            }
        }
        
        // Пересчитываем индексы после возможных вставок/перемещений
        result.sections.forEach((section, index) => {
            section.sectionIndex = index + 1;
        });
        
        // Добавляем структурированный архив новостей (если обработка news)
        if (newsExtraContent && newsExtraContent.yearsData && newsExtraContent.yearsData.length > 0) {
            result.sections.push({
                sectionIndex: result.sections.length + 1,
                type: 'news-archive',
                description: 'Архив новостей по годам, извлечен напрямую из DOM',
                title: 'Новости по годам',
                subtitle: '',
                text: '',
                elements: [],
                images: [],
                links: { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] },
                cards: [],
                tabs: [],
                table: null,
                years: newsExtraContent.yearsData
            });
            // Пересчитываем индексы после добавления секции
            result.sections.forEach((section, index) => {
                section.sectionIndex = index + 1;
            });
        }

        // Обновляем ссылки на файлы в результате, используя извлеченные данные
        if (pageContent.extractedFileLinks && Object.keys(pageContent.extractedFileLinks).length > 0) {
            console.log(`   🔗 Обновление ссылок на файлы в результате...`);
            let updatedCount = 0;
            const findExtractedByText = (fileText) => {
                if (!fileText) return null;
                const normalizedText = fileText.toLowerCase().trim().replace(/\s+/g, ' ');
                const foundLink = Object.keys(pageContent.extractedFileLinks).find(key => {
                    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, ' ');

                    // Точное совпадение
                    if (normalizedKey === normalizedText) return true;

                    // Одно содержит другое (минимум 20 символов для надежности)
                    if (normalizedText.length >= 20 && normalizedKey.includes(normalizedText.substring(0, Math.min(50, normalizedText.length)))) return true;
                    if (normalizedKey.length >= 20 && normalizedText.includes(normalizedKey.substring(0, Math.min(50, normalizedKey.length)))) return true;

                    // Проверяем первые слова (для случаев, когда тексты обрезаны)
                    const textWords = normalizedText.split(/\s+/).slice(0, 5).join(' ');
                    const keyWords = normalizedKey.split(/\s+/).slice(0, 5).join(' ');
                    if (textWords.length >= 15 && keyWords.length >= 15 &&
                        (textWords === keyWords || textWords.includes(keyWords) || keyWords.includes(textWords))) {
                        return true;
                    }

                    return false;
                });
                if (!foundLink || !pageContent.extractedFileLinks[foundLink]) return null;
                return { key: foundLink, data: pageContent.extractedFileLinks[foundLink] };
            };
            result.sections.forEach(section => {
                if (section.links && section.links.fileLinks) {
                    section.links.fileLinks.forEach(fileLink => {
                        const fileText = fileLink.text || '';
                        if (!fileText) return;

                        const match = findExtractedByText(fileText);
                        if (match) {
                            const extracted = match.data;
                            // Обновляем href на локальный путь к файлу (если есть) или оставляем оригинальный URL
                            if (extracted.localPath) {
                                fileLink.href = extracted.localPath;
                            } else if (extracted.href && (!fileLink.href || fileLink.href.trim() === '')) {
                                fileLink.href = extracted.href;
                            }
                            // Всегда пытаемся проставить метаданные файла
                            if (extracted.fileName && !fileLink.fileName) {
                                fileLink.fileName = extracted.fileName;
                            }
                            if (extracted.fileType && (!fileLink.fileType || fileLink.fileType === 'unknown')) {
                                fileLink.fileType = extracted.fileType;
                            }
                            if (extracted.title && !fileLink.title) {
                                fileLink.title = extracted.title;
                            }
                            updatedCount++;
                            console.log(`      ✓ Обновлена ссылка: "${fileText.substring(0, 50)}..." -> ${extracted.localPath || extracted.href || fileLink.href || ''}`);
                        } else {
                            console.log(`      ⚠️  Не найдено совпадение для: "${fileText.substring(0, 50)}..."`);
                        }
                    });
                }

                if (section.cards && Array.isArray(section.cards)) {
                    section.cards.forEach(card => {
                        const linkText = (card.link && card.link.text) ? card.link.text : (card.title || card.text || '');
                        const match = findExtractedByText(linkText);
                        if (!match) return;
                        const extracted = match.data;
                        if (!card.link) {
                            card.link = { text: linkText, href: '' };
                        }
                        if (extracted.localPath) {
                            card.link.href = extracted.localPath;
                        } else if (extracted.href && (!card.link.href || card.link.href.trim() === '' || card.link.href === '#')) {
                            card.link.href = extracted.href;
                        }
                        if (extracted.fileName && !card.link.fileName) {
                            card.link.fileName = extracted.fileName;
                        }
                        if (extracted.fileType && !card.link.fileType) {
                            card.link.fileType = extracted.fileType;
                        }
                        if (extracted.title && !card.link.title) {
                            card.link.title = extracted.title;
                        }
                        updatedCount++;
                    });
                }
            });
            // Добавляем файлы, которые были извлечены, но не включены LLM в результат
            const allExtractedFileTexts = new Set(Object.keys(pageContent.extractedFileLinks));
            const existingFileTexts = new Set();
            result.sections.forEach(section => {
                if (section.links && section.links.fileLinks) {
                    section.links.fileLinks.forEach(fileLink => {
                        if (fileLink.text) {
                            existingFileTexts.add(fileLink.text.toLowerCase().trim());
                        }
                    });
                }
            });
            
            // Находим секцию с fileLinks (обычно это последняя секция с контентом)
            let targetSection = result.sections.find(s => s.links && s.links.fileLinks && s.links.fileLinks.length > 0);
            if (!targetSection) {
                // Если нет секции с fileLinks, создаем или используем последнюю секцию с контентом
                targetSection = result.sections[result.sections.length - 1];
                if (!targetSection.links) {
                    targetSection.links = { internalLinks: [], externalLinks: [], fileLinks: [], imageLinks: [] };
                }
                if (!targetSection.links.fileLinks) {
                    targetSection.links.fileLinks = [];
                }
            }

            // Синтезируем карточки файлов из fileLinks, если карточек нет
            result.sections.forEach(section => {
                if (!section || !section.links || !Array.isArray(section.links.fileLinks)) return;
                if (!Array.isArray(section.cards)) {
                    section.cards = [];
                }
                if (section.cards.length > 0) return;
                section.links.fileLinks.forEach(fileLink => {
                    if (!fileLink || !fileLink.text) return;
                    section.cards.push({
                        title: fileLink.text,
                        text: fileLink.fileType || '',
                        value: '',
                        label: '',
                        link: {
                            text: fileLink.text,
                            href: fileLink.href || '',
                            fileName: fileLink.fileName || '',
                            fileType: fileLink.fileType || '',
                            title: fileLink.title || '',
                            purpose: fileLink.purpose || ''
                        }
                    });
                });
            });
            
            // Добавляем недостающие файлы
            let addedCount = 0;
            Object.keys(pageContent.extractedFileLinks).forEach(fileText => {
                const normalizedText = fileText.toLowerCase().trim();
                const isAlreadyIncluded = Array.from(existingFileTexts).some(existing => {
                    const normalizedExisting = existing.toLowerCase().trim();
                    return normalizedText === normalizedExisting || 
                           (normalizedText.length >= 20 && normalizedExisting.includes(normalizedText.substring(0, Math.min(50, normalizedText.length))));
                });
                
                if (!isAlreadyIncluded) {
                    const extracted = pageContent.extractedFileLinks[fileText];
                    const newFileLink = {
                        text: fileText,
                        href: extracted.localPath || extracted.href || '',
                        fileType: extracted.fileType || 'pdf',
                        purpose: ''
                    };
                    if (extracted.title) {
                        newFileLink.title = extracted.title;
                    }
                    if (extracted.fileName) {
                        newFileLink.fileName = extracted.fileName;
                    }
                    targetSection.links.fileLinks.push(newFileLink);
                    addedCount++;
                }
            });
            
            if (updatedCount > 0 || addedCount > 0) {
                console.log(`   ✓ Обновлено ссылок на файлы: ${updatedCount}, добавлено недостающих: ${addedCount}`);
            } else {
                console.log(`   ⚠️  Не удалось обновить ссылки на файлы`);
            }
        }

        if (slug === 'infoformen') {
            normalizeInfoformenResult(result);
        }
        
        const outputPath = path.join(outputDir, `${safeSlug}_spec.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        
        // Сохраняем JSON контента табов для проверки
        if (pageContent.tabsContentJSON) {
            const tabsContentPath = path.join(outputDir, `${safeSlug}_tabs_content.json`);
            fs.writeFileSync(tabsContentPath, JSON.stringify(pageContent.tabsContentJSON, null, 2), 'utf-8');
            console.log(`📄 JSON контента табов сохранен: ${tabsContentPath}`);
        }
        
        // Сохраняем извлеченные ссылки на файлы для проверки
        if (pageContent.extractedFileLinks && Object.keys(pageContent.extractedFileLinks).length > 0) {
            const fileLinksPath = path.join(outputDir, `${safeSlug}_extracted_file_links.json`);
            fs.writeFileSync(fileLinksPath, JSON.stringify(pageContent.extractedFileLinks, null, 2), 'utf-8');
            console.log(`📄 Извлеченные ссылки на файлы сохранены: ${fileLinksPath}`);
        }
        
        // Сохраняем полный HTML, который отправляется в LLM
        const htmlForLLMPath = path.join(outputDir, `${safeSlug}_html_for_llm.html`);
        fs.writeFileSync(htmlForLLMPath, pageContent.html, 'utf-8');
        console.log(`📄 HTML для LLM сохранен: ${htmlForLLMPath}`);
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ ТЗ сохранено: ${outputPath}`);
        console.log(`📸 Скриншот: ${screenshotPath}`);
        console.log(`📋 Секций: ${result.sections.length}`);
        console.log('');
        
        // Выводим краткое описание секций
        result.sections.forEach((section, index) => {
            console.log(`   Секция ${section.sectionIndex || index + 1} - ${section.type}:`);
            console.log(`      ${section.title || 'без заголовка'}`);
            if (section.description) {
                console.log(`      ${section.description.substring(0, 80)}...`);
            }
        });
        console.log('');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

main();
