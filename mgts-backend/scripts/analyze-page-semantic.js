const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';

/**
 * Извлекает метаданные страницы
 */
async function extractMetadata(page) {
    return await page.evaluate(() => {
        return {
            title: document.title || '',
            metaDescription: document.querySelector('meta[name="description"]')?.content || '',
            metaKeywords: document.querySelector('meta[name="keywords"]')?.content || '',
            h1: document.querySelector('h1')?.textContent.trim() || '',
            url: window.location.href,
            pathname: window.location.pathname
        };
    });
}

/**
 * Анализирует хлебные крошки
 */
async function analyzeBreadcrumbs(page) {
    return await page.evaluate(() => {
        const breadcrumbs = {
            type: 'breadcrumbs',
            description: 'Навигационные хлебные крошки',
            items: []
        };

        const breadcrumbContainer = document.querySelector('[class*="breadcrumb"], [class*="bread-crumb"], .bread-crumbs-row');
        if (!breadcrumbContainer) return breadcrumbs;

        const items = breadcrumbContainer.querySelectorAll('a, [class*="breadcrumb-item"], .bread-crumb-item');
        items.forEach(item => {
            const text = item.textContent.trim();
            const href = item.getAttribute('href');
            if (text) {
                breadcrumbs.items.push({
                    text: text,
                    href: href || null
                });
            }
        });

        return breadcrumbs;
    });
}

/**
 * Анализирует hero-секцию
 */
async function analyzeHeroSection(page) {
    return await page.evaluate(() => {
        const hero = {
            type: 'hero-section',
            description: 'Главная секция страницы (hero)',
            title: '',
            subtitle: '',
            hasImage: false,
            hasButton: false,
            buttonText: '',
            buttonHref: ''
        };

        // Ищем hero-секцию по различным селекторам
        const heroSelectors = [
            '[class*="hero"]',
            '[class*="banner"]',
            '[class*="home-tablet"]',
            '.h1-wide-med',
            'main > div:first-child > div:first-child > div:first-child'
        ];

        let heroElement = null;
        for (const selector of heroSelectors) {
            heroElement = document.querySelector(selector);
            if (heroElement && (heroElement.textContent.trim().length > 50 || heroElement.querySelector('h1, h2, .h1-wide-med'))) {
                break;
            }
        }

        if (!heroElement) {
            // Пробуем найти первый большой блок с заголовком в main
            const main = document.querySelector('main');
            if (main) {
                const firstBlock = main.querySelector('[class*="block"], [class*="section"], article > div:first-child');
                if (firstBlock) {
                    const h1 = firstBlock.querySelector('h1, .h1-wide-med');
                    if (h1) {
                        heroElement = firstBlock;
                    }
                }
            }
        }

        if (!heroElement) return hero;

        const h1 = heroElement.querySelector('h1, .h1-wide-med, [class*="h1"]');
        const h2 = heroElement.querySelector('h2, .h2-comp-med, [class*="h2"]');
        const subtitle = heroElement.querySelector('p, .p1-text-reg, [class*="subtitle"], [class*="text-reg"]');

        hero.title = h1?.textContent.trim() || h2?.textContent.trim() || '';
        hero.subtitle = subtitle?.textContent.trim().substring(0, 500) || '';
        hero.hasImage = !!heroElement.querySelector('img');
        hero.hasButton = !!heroElement.querySelector('a[class*="button"], button, a.btn');

        if (hero.hasButton) {
            const button = heroElement.querySelector('a[class*="button"], button, a.btn');
            hero.buttonText = button.textContent.trim();
            hero.buttonHref = button.getAttribute('href') || '';
        }

        return hero;
    });
}

/**
 * Анализирует боковое меню (sidebar)
 */
async function analyzeSidebar(page) {
    return await page.evaluate(() => {
        const sidebar = {
            type: 'sidebar-menu',
            description: 'Боковое меню навигации',
            items: []
        };

        const sidebarElement = document.querySelector('[class*="sidebar"], [class*="sidebar-menu"], .sidebar-menu-desktop');
        if (!sidebarElement) return sidebar;

        const menuItems = sidebarElement.querySelectorAll('[class*="menu-item"], [class*="sidebar-menu-item"]');
        menuItems.forEach(item => {
            const header = item.querySelector('[class*="header"], [class*="header-label"]');
            if (!header) return;

            const text = header.textContent.trim();
            const href = header.getAttribute('href');
            const hasSubmenu = item.querySelector('[class*="collapse"], [class*="submenu"], [class*="submenu-list"]');

            const menuItem = {
                text: text,
                href: href || null,
                hasSubmenu: !!hasSubmenu,
                submenuItems: []
            };

            if (hasSubmenu) {
                const submenu = item.querySelector('[class*="submenu-list"], [class*="collapse"]');
                if (submenu) {
                    const submenuItems = submenu.querySelectorAll('a, [class*="submenu-item"]');
                    submenuItems.forEach(subItem => {
                        const subText = subItem.textContent.trim();
                        const subHref = subItem.getAttribute('href');
                        if (subText) {
                            menuItem.submenuItems.push({
                                text: subText,
                                href: subHref || null
                            });
                        }
                    });
                }
            }

            if (text) {
                sidebar.items.push(menuItem);
            }
        });

        return sidebar;
    });
}

/**
 * Находит и активирует все слайдеры/карусели на странице
 */
async function activateSliders(page) {
    return await page.evaluate(async () => {
        const sliders = [];
        
        // Ищем слайдеры по различным селекторам
        const sliderSelectors = [
            '[class*="slider"]',
            '[class*="carousel"]',
            '[class*="swiper"]',
            '[class*="slide"]'
        ];

        for (const selector of sliderSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                // Ищем кнопки навигации слайдера
                const prevBtn = element.querySelector('[class*="prev"], [class*="previous"], [aria-label*="prev"], [aria-label*="пред"]');
                const nextBtn = element.querySelector('[class*="next"], [aria-label*="next"], [aria-label*="след"]');
                const dots = element.querySelectorAll('[class*="dot"], [class*="indicator"], [role="button"]');
                
                if (prevBtn || nextBtn || dots.length > 0) {
                    sliders.push({
                        selector: `${selector}:nth-of-type(${index + 1})`,
                        hasNavigation: !!(prevBtn || nextBtn),
                        hasDots: dots.length > 0,
                        slidesCount: element.querySelectorAll('[class*="slide"], [class*="item"]').length
                    });
                }
            });
        }

        return sliders;
    });
}

/**
 * Анализирует табы - прокликивает каждый таб и извлекает контент
 */
async function analyzeTabs(page) {
    const tabsData = await page.evaluate(() => {
        const tabGroups = [];
        
        // Ищем контейнеры с табами
        const tabContainers = document.querySelectorAll('[class*="tabs"], [class*="tab-row"], .tabs-row-selection, .document-tabs, .service-tabs');
        
        tabContainers.forEach((container, containerIdx) => {
            const tabButtons = container.querySelectorAll('[class*="tab-button"], [class*="tab-item"], .tab-button-item, button[class*="tab"], [role="tab"]');
            if (tabButtons.length > 0) {
                const tabs = Array.from(tabButtons).map((tab, idx) => ({
                    index: idx,
                    text: tab.textContent.trim(),
                    isActive: tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true',
                    selector: tab.id ? `#${tab.id}` : null
                }));
                
                tabGroups.push({
                    containerIndex: containerIdx,
                    containerClasses: Array.from(container.classList).join(' '),
                    tabs: tabs
                });
            }
        });
        
        return tabGroups;
    });

    const result = [];
    
    for (const tabGroup of tabsData) {
        const containerSelector = `.${tabGroup.containerClasses.split(' ')[0]}`;
        const tabs = [];
        
        for (const tab of tabGroup.tabs) {
            try {
                // Прокручиваем к контейнеру табов
                await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, containerSelector);
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Кликаем на таб, если он не активен
                if (!tab.isActive) {
                    const clicked = await page.evaluate((containerIdx, tabIdx) => {
                        const containers = document.querySelectorAll('[class*="tabs"], [class*="tab-row"], .tabs-row-selection, .document-tabs, .service-tabs');
                        const container = containers[containerIdx];
                        if (!container) return false;
                        
                        const buttons = container.querySelectorAll('[class*="tab-button"], [class*="tab-item"], .tab-button-item, button[class*="tab"], [role="tab"]');
                        const button = buttons[tabIdx];
                        if (button) {
                            button.click();
                            return true;
                        }
                        return false;
                    }, tabGroup.containerIndex, tab.index);
                    
                    if (clicked) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                // Извлекаем контент активного таба
                const tabContent = await page.evaluate((containerIdx) => {
                    const containers = document.querySelectorAll('[class*="tabs"], [class*="tab-row"], .tabs-row-selection, .document-tabs, .service-tabs, .history-content');
                    const container = containers[containerIdx];
                    if (!container) return null;
                    
                    const content = container.querySelector('[class*="content"], [class*="tab-content"], .history-content, .content-box, [class*="data-content"]') || container;
                    
                    return {
                        html: content.innerHTML.substring(0, 10000),
                        text: content.textContent.trim().substring(0, 2000),
                        images: Array.from(content.querySelectorAll('img')).map(img => ({
                            src: img.src,
                            alt: img.alt || '',
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight
                        })),
                        files: Array.from(content.querySelectorAll('a[href]')).filter(a => {
                            const href = a.href;
                            return /\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(href);
                        }).map(a => ({
                            href: a.href,
                            text: a.textContent.trim()
                        }))
                    };
                }, tabGroup.containerIndex);
                
                tabs.push({
                    name: tab.text,
                    content: tabContent
                });
            } catch (error) {
                console.warn(`⚠️  Ошибка при анализе таба "${tab.text}": ${error.message}`);
            }
        }
        
        if (tabs.length > 0) {
            result.push({
                type: 'tabs',
                description: 'Группа вкладок (табов)',
                tabs: tabs
            });
        }
    }
    
    return result;
}

/**
 * Анализирует аккордеоны - раскрывает каждый и извлекает контент
 */
async function analyzeAccordions(page) {
    const accordionsData = await page.evaluate(() => {
        const accordionGroups = [];
        
        // Ищем контейнеры с аккордеонами
        const accordionContainers = document.querySelectorAll('[class*="accordion"], [class*="collapse"], [data-toggle="collapse"]');
        
        accordionContainers.forEach((container, containerIdx) => {
            const buttons = container.querySelectorAll('[data-toggle="collapse"], [aria-expanded], button[class*="accordion"]');
            if (buttons.length > 0) {
                const items = Array.from(buttons).map((btn, idx) => ({
                    index: idx,
                    text: btn.textContent.trim(),
                    isExpanded: btn.getAttribute('aria-expanded') === 'true' || btn.classList.contains('active'),
                    target: btn.getAttribute('data-target') || btn.getAttribute('aria-controls') || ''
                }));
                
                accordionGroups.push({
                    containerIndex: containerIdx,
                    containerClasses: Array.from(container.classList).join(' '),
                    items: items
                });
            }
        });
        
        return accordionGroups;
    });

    const result = [];
    
    for (const accordionGroup of accordionsData) {
        const items = [];
        
        for (const item of accordionGroup.items) {
            try {
                // Прокручиваем к аккордеону
                await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, accordionGroup.containerClasses.split(' ')[0]);
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Раскрываем аккордеон, если он закрыт
                if (!item.isExpanded) {
                    const clicked = await page.evaluate((containerIdx, itemIdx) => {
                        const containers = document.querySelectorAll('[class*="accordion"], [class*="collapse"], [data-toggle="collapse"]');
                        const container = containers[containerIdx];
                        if (!container) return false;
                        
                        const buttons = container.querySelectorAll('[data-toggle="collapse"], [aria-expanded], button[class*="accordion"]');
                        const button = buttons[itemIdx];
                        if (button) {
                            button.click();
                            return true;
                        }
                        return false;
                    }, accordionGroup.containerIndex, item.index);
                    
                    if (clicked) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                // Извлекаем контент
                const itemContent = await page.evaluate((target) => {
                    const content = target ? document.querySelector(target) : null;
                    if (!content) return null;
                    
                    return {
                        html: content.innerHTML.substring(0, 10000),
                        text: content.textContent.trim().substring(0, 2000),
                        images: Array.from(content.querySelectorAll('img')).map(img => ({
                            src: img.src,
                            alt: img.alt || ''
                        })),
                        files: Array.from(content.querySelectorAll('a[href]')).filter(a => {
                            const href = a.href;
                            return /\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(href);
                        }).map(a => ({
                            href: a.href,
                            text: a.textContent.trim()
                        }))
                    };
                }, item.target);
                
                items.push({
                    title: item.text,
                    content: itemContent
                });
            } catch (error) {
                console.warn(`⚠️  Ошибка при анализе аккордеона "${item.text}": ${error.message}`);
            }
        }
        
        if (items.length > 0) {
            result.push({
                type: 'accordion',
                description: 'Аккордеон (раскрывающиеся блоки)',
                items: items
            });
        }
    }
    
    return result;
}

/**
 * Анализирует основной контент страницы - идет сверху вниз
 */
async function analyzeMainContent(page) {
    return await page.evaluate(() => {
        const content = {
            type: 'main-content',
            description: 'Основной контент страницы',
            blocks: []
        };

        // Ищем основной контент - пробуем разные селекторы
        let mainElement = document.querySelector('main');
        if (!mainElement) {
            mainElement = document.querySelector('[class*="container-mgts"], [class*="page-column"], .page-column-container');
        }
        if (!mainElement) {
            mainElement = document.querySelector('article, [class*="article"]');
        }
        if (!mainElement) {
            // Последняя попытка - берем body
            mainElement = document.body;
        }

        if (!mainElement) {
            console.warn('Не найден основной элемент контента');
            return content;
        }

        // Находим все значимые блоки сверху вниз
        // Сначала пробуем найти структурированные блоки
        let blocks = mainElement.querySelectorAll('[class*="block"], section, div[class*="section"], [class*="content-box"], [class*="block-"]');
        
        // Если не нашли структурированные блоки, ищем любые div с контентом
        if (blocks.length === 0) {
            const allDivs = mainElement.querySelectorAll('div');
            blocks = Array.from(allDivs).filter(div => {
                const text = div.textContent.trim();
                const hasHeading = div.querySelector('h1, h2, h3, h4, .h1, .h2');
                const hasImages = div.querySelectorAll('img').length > 0;
                const hasParagraphs = div.querySelectorAll('p').length > 0;
                // Фильтруем только значимые блоки
                return (hasHeading || hasImages || (hasParagraphs && text.length > 100)) && 
                       text.length > 50 &&
                       !div.classList.contains('nav') &&
                       !div.classList.contains('header') &&
                       !div.classList.contains('footer') &&
                       !div.classList.contains('menu');
            });
        }
        
        blocks.forEach((block, index) => {
            const heading = block.querySelector('h1, h2, h3, h4, .h1-wide-med, .h2-comp-med, .h1, .h2, [class*="h1"], [class*="h2"]');
            const headingText = heading?.textContent.trim() || '';
            
            // Пропускаем блоки без заголовка и без значимого контента
            const text = block.textContent.trim();
            if (!headingText && text.length < 100) {
                return; // Пропускаем маленькие блоки без заголовка
            }
            
            const paragraphs = Array.from(block.querySelectorAll('p, [class*="text-reg"], [class*="text"], [class*="p1"]'))
                .map(p => p.textContent.trim())
                .filter(t => t.length > 0);
            
            const images = Array.from(block.querySelectorAll('img')).map(img => ({
                src: img.src,
                alt: img.alt || '',
                width: img.naturalWidth,
                height: img.naturalHeight
            }));
            
            const files = Array.from(block.querySelectorAll('a[href]')).filter(a => {
                const href = a.href;
                return /\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(href);
            }).map(a => ({
                href: a.href,
                text: a.textContent.trim()
            }));
            
            const links = Array.from(block.querySelectorAll('a[href]')).filter(a => {
                const href = a.href;
                return href && !href.startsWith('#') && !href.startsWith('javascript:') && !/\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(href);
            }).map(a => ({
                href: a.href,
                text: a.textContent.trim()
            }));

            // Добавляем блок, если есть хотя бы что-то значимое
            if (headingText || paragraphs.length > 0 || images.length > 0 || text.length > 200) {
                content.blocks.push({
                    index: index,
                    heading: headingText,
                    paragraphs: paragraphs.length > 0 ? paragraphs : (text.length > 200 ? [text.substring(0, 500)] : []),
                    images: images,
                    files: files,
                    links: links,
                    description: paragraphs[0]?.substring(0, 200) || text.substring(0, 200) || '',
                    classes: Array.from(block.classList).join(' ')
                });
            }
        });

        return content;
    });
}

/**
 * Создает семантическое техническое задание
 */
function createSemanticSpec(slug, analysisResult, screenshotPath) {
    const semanticBlocks = [];
    
    // Добавляем блоки в правильном порядке (сверху вниз)
    if (analysisResult.breadcrumbs && analysisResult.breadcrumbs.items.length > 0) {
        semanticBlocks.push(analysisResult.breadcrumbs);
    }
    
    if (analysisResult.hero && analysisResult.hero.title) {
        semanticBlocks.push(analysisResult.hero);
    }
    
    if (analysisResult.sidebar && analysisResult.sidebar.items.length > 0) {
        semanticBlocks.push(analysisResult.sidebar);
    }
    
    // Добавляем основной контент
    if (analysisResult.mainContent && analysisResult.mainContent.blocks.length > 0) {
        semanticBlocks.push(analysisResult.mainContent);
    }
    
    // Добавляем динамические элементы (табы, аккордеоны)
    if (analysisResult.tabs && analysisResult.tabs.length > 0) {
        semanticBlocks.push(...analysisResult.tabs);
    }
    
    if (analysisResult.accordions && analysisResult.accordions.length > 0) {
        semanticBlocks.push(...analysisResult.accordions);
    }
    
    return {
        page: {
            slug: slug,
            url: analysisResult.metadata.url,
            pathname: analysisResult.metadata.pathname,
            analyzedAt: new Date().toISOString(),
            screenshot: screenshotPath
        },
        metadata: analysisResult.metadata,
        semanticBlocks: semanticBlocks
    };
}

/**
 * Главная функция
 */
async function main() {
    const slug = process.argv[2] || 'home';
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-semantic');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 СЕМАНТИЧЕСКИЙ АНАЛИЗ СТРАНИЦЫ (СВЕРХУ ВНИЗ)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 Slug: ${slug}`);
    
    const pageUrl = slug === 'home' ? BASE_URL : `${BASE_URL}/${slug}`;
    console.log(`🌐 URL: ${pageUrl}`);
    console.log(`📁 Вывод: ${outputDir}`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: false, // Включаем видимый браузер для ручного прощелкивания
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null,
        slowMo: 100 // Замедляем для видимости
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('🚀 Запуск браузера...');
        console.log(`📥 Загрузка страницы: ${pageUrl}`);
        
        await page.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Семантический анализ содержимого (сверху вниз)...');
        
        // Извлекаем все данные
        const metadata = await extractMetadata(page);
        console.log(`   ✓ Метаданные: ${metadata.title}`);
        
        const breadcrumbs = await analyzeBreadcrumbs(page);
        console.log(`   ✓ Хлебные крошки: ${breadcrumbs.items.length} пунктов`);
        
        const hero = await analyzeHeroSection(page);
        console.log(`   ✓ Hero-секция: ${hero.title ? 'найдена' : 'не найдена'}`);
        if (hero.title) {
            console.log(`      - Заголовок: ${hero.title}`);
        }
        
        const sidebar = await analyzeSidebar(page);
        console.log(`   ✓ Боковое меню: ${sidebar.items.length} пунктов`);
        
        console.log('   🔄 Анализ интерактивных элементов...');
        const tabs = await analyzeTabs(page);
        console.log(`   ✓ Табов: ${tabs.length} групп`);
        
        const accordions = await analyzeAccordions(page);
        console.log(`   ✓ Аккордеонов: ${accordions.length} групп`);
        
        const sliders = await activateSliders(page);
        console.log(`   ✓ Слайдеров: ${sliders.length}`);
        
        const mainContent = await analyzeMainContent(page);
        console.log(`   ✓ Основной контент: ${mainContent.blocks.length} блоков`);
        if (mainContent.blocks.length > 0) {
            console.log(`      - Первый блок: ${mainContent.blocks[0].heading || 'без заголовка'}`);
        }
        
        // Создаем скриншот
        const screenshotPath = path.join(outputDir, `${slug}_screenshot.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Скриншот: ${screenshotPath}`);
        
        // Создаем ТЗ
        const analysisResult = {
            metadata,
            breadcrumbs,
            hero,
            sidebar,
            tabs,
            accordions,
            sliders,
            mainContent
        };
        
        const spec = createSemanticSpec(slug, analysisResult, screenshotPath);
        
        // Сохраняем результат
        const outputPath = path.join(outputDir, `${slug}_spec.json`);
        fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ ТЗ сохранено: ${outputPath}`);
        console.log(`📸 Скриншот: ${screenshotPath}`);
        console.log(`📋 Семантических блоков: ${spec.semanticBlocks.length}`);
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
