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
 * Анализирует hero-секцию
 */
async function analyzeHeroSection(page) {
    return await page.evaluate(() => {
        const hero = {
            type: 'hero',
            description: 'Hero section',
            title: '',
            subtitle: '',
            hasButton: false,
            buttonText: '',
            buttonHref: ''
        };

        // Ищем hero-секцию по различным селекторам
        const heroSelectors = [
            '[class*="hero"]',
            '[class*="home-tablet"]',
            '.h1-wide-med',
            'main > div:first-child > div:first-child'
        ];

        let heroElement = null;
        for (const selector of heroSelectors) {
            heroElement = document.querySelector(selector);
            if (heroElement) {
                const h1 = heroElement.querySelector('h1, .h1-wide-med, [class*="h1"]');
                const text = heroElement.textContent.trim();
                // Проверяем, что это действительно hero (содержит заголовок МГТС)
                if (h1 || (text.length > 50 && (text.includes('МГТС') || text.includes('НАДЁЖНАЯ')))) {
                    break;
                }
            }
        }

        if (!heroElement) return hero;

        const h1 = heroElement.querySelector('h1, .h1-wide-med, [class*="h1"]');
        const subtitle = heroElement.querySelector('p, .p1-text-reg, [class*="subtitle"], [class*="text-reg"]');
        const button = heroElement.querySelector('a[class*="button"], button, a.btn');

        hero.title = h1?.textContent.trim() || '';
        hero.subtitle = subtitle?.textContent.trim() || '';
        hero.hasButton = !!button;
        if (button) {
            hero.buttonText = button.textContent.trim();
            hero.buttonHref = button.getAttribute('href') || '';
        }

        return hero;
    });
}

/**
 * Анализирует секцию с фактами о компании (статистика)
 */
async function analyzeFactsSection(page) {
    return await page.evaluate(() => {
        const factsSection = {
            type: 'facts-section',
            description: 'Короткий значимый лозунг и крупным шрифтом цифры основных фактов с подписью чем каждый из них измеряется',
            title: '',
            subtitle: '',
            linkTo: null,
            items: []
        };

        // Ищем секцию с фактами - обычно содержит большие цифры и проценты
        const main = document.querySelector('main');
        if (!main) return factsSection;

        // Ищем секцию с текстом "ВЕКОВОЙ ОПЫТ" или содержащую большие цифры
        const sections = main.querySelectorAll('section, div[class*="section"], div[class*="block"]');
        
        for (const section of sections) {
            const text = section.textContent.trim();
            const heading = section.querySelector('h1, h2, h3, .h1, .h2, [class*="h1"], [class*="h2"]');
            
            // Проверяем, содержит ли секция факты (большие цифры, проценты)
            if (text.includes('ВЕКОВОЙ ОПЫТ') || 
                (heading && (heading.textContent.includes('ОПЫТ') || heading.textContent.includes('95%') || heading.textContent.includes('км')))) {
                
                factsSection.title = heading?.textContent.trim() || '';
                
                // Ищем подзаголовок
                const subtitle = section.querySelector('p, [class*="text"]');
                factsSection.subtitle = subtitle?.textContent.trim() || '';
                
                // Ищем ссылку
                const link = section.querySelector('a[href*="about"]');
                if (link) {
                    factsSection.linkTo = link.getAttribute('href');
                }
                
                // Ищем карточки с фактами (цифры + подписи)
                const factItems = section.querySelectorAll('[class*="item"], [class*="card"], [class*="data"]');
                factItems.forEach((item, index) => {
                    const value = item.querySelector('[class*="value"], [class*="number"], [class*="data-title"]');
                    const label = item.querySelector('[class*="label"], [class*="text"], [class*="data-title"]');
                    
                    if (value || label) {
                        factsSection.items.push({
                            index: index + 1,
                            value: value?.textContent.trim() || '',
                            label: label?.textContent.trim() || item.textContent.trim()
                        });
                    }
                });
                
                // Если не нашли структурированные элементы, извлекаем из текста
                if (factsSection.items.length === 0) {
                    const textLines = text.split('\n').filter(line => line.trim().length > 0);
                    textLines.forEach((line, index) => {
                        // Ищем строки с цифрами и процентами
                        if (/\d+%/.test(line) || /\d+\s*км/.test(line) || /\d+\+/.test(line)) {
                            factsSection.items.push({
                                index: index + 1,
                                value: line.match(/\d+[%км+]*/)?.[0] || '',
                                label: line.replace(/\d+[%км+]*/, '').trim()
                            });
                        }
                    });
                }
                
                break; // Нашли секцию, выходим
            }
        }

        return factsSection;
    });
}

/**
 * Анализирует слайдер mirror-slider
 */
async function analyzeMirrorSlider(page) {
    // Сначала находим контейнер слайдера
    const sliderContainer = await page.evaluate(() => {
        const slider = document.querySelector('[class*="mirror-slider"], [class*="slider"]');
        if (!slider) return null;
        
        return {
            classes: Array.from(slider.classList).join(' '),
            id: slider.id || ''
        };
    });
    
    if (!sliderContainer) {
        return {
            type: 'mirror-slider',
            description: 'Содержит динамический элемент mirror-slider, который автоматически в зацикленном режиме перелистывает три текстовых описания и соответствующие им изображения',
            slides: []
        };
    }

    // Прокручиваем к слайдеру
    await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, sliderContainer.id ? `#${sliderContainer.id}` : `.${sliderContainer.classes.split(' ')[0]}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Извлекаем все слайды
    const slider = await page.evaluate(() => {
        const sliderElement = document.querySelector('[class*="mirror-slider"], [class*="slider"]');
        if (!sliderElement) return { slides: [] };

        const slides = [];
        const slideElements = sliderElement.querySelectorAll('[class*="slide"], [class*="item"], [class*="card"]');
        
        slideElements.forEach((slide, index) => {
            const title = slide.querySelector('h2, h3, [class*="title"], [class*="heading"]');
            const text = slide.querySelector('p, [class*="text"]');
            const img = slide.querySelector('img');

            if (title || text || img) {
                slides.push({
                    index: index + 1,
                    title: title?.textContent.trim() || '',
                    text: text?.textContent.trim() || '',
                    image: img ? {
                        src: img.src,
                        alt: img.alt || ''
                    } : null
                });
            }
        });

        return { slides };
    });

    // Если слайды не найдены через селекторы, ищем вручную
    if (slider.slides.length === 0) {
        // Пробуем найти кнопки навигации и прощелкивать слайды
        const navigationButtons = await page.evaluate(() => {
            const slider = document.querySelector('[class*="mirror-slider"], [class*="slider"]');
            if (!slider) return null;
            
            const nextBtn = slider.querySelector('[class*="next"], [aria-label*="next"], [aria-label*="след"]');
            const prevBtn = slider.querySelector('[class*="prev"], [aria-label*="prev"], [aria-label*="пред"]');
            
            return {
                hasNext: !!nextBtn,
                hasPrev: !!prevBtn
            };
        });

        // Если есть навигация, прощелкиваем слайды
        if (navigationButtons && navigationButtons.hasNext) {
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем автопереключения
                
                const slideContent = await page.evaluate(() => {
                    const slider = document.querySelector('[class*="mirror-slider"], [class*="slider"]');
                    if (!slider) return null;
                    
                    const activeSlide = slider.querySelector('[class*="active"], [class*="current"]') || slider;
                    const title = activeSlide.querySelector('h2, h3, [class*="title"]');
                    const text = activeSlide.querySelector('p, [class*="text"]');
                    const img = activeSlide.querySelector('img');

                    return {
                        title: title?.textContent.trim() || '',
                        text: text?.textContent.trim() || '',
                        image: img ? {
                            src: img.src,
                            alt: img.alt || ''
                        } : null
                    };
                });

                if (slideContent && (slideContent.title || slideContent.text || slideContent.image)) {
                    slider.slides.push({
                        index: i + 1,
                        ...slideContent
                    });
                }
            }
        }
    }

    return {
        type: 'mirror-slider',
        description: 'Содержит динамический элемент mirror-slider, который автоматически в зацикленном режиме перелистывает три текстовых описания и соответствующие им изображения',
        slides: slider.slides
    };
}

/**
 * Анализирует секцию услуг с табами
 */
async function analyzeServicesSection(page) {
    // Находим контейнер с табами
    const tabContainer = await page.evaluate(() => {
        const containers = document.querySelectorAll('[class*="services"], [class*="section-our-services"], [class*="promo-note"]');
        
        for (const container of containers) {
            const tabButtons = container.querySelectorAll('[class*="tab"], [class*="tab-button"], [role="tab"]');
            if (tabButtons.length > 0) {
                return {
                    classes: Array.from(container.classList).join(' '),
                    id: container.id || '',
                    tabButtons: Array.from(tabButtons).map(btn => ({
                        text: btn.textContent.trim(),
                        isActive: btn.classList.contains('active')
                    }))
                };
            }
        }
        
        return null;
    });

    if (!tabContainer) {
        return {
            type: 'services-section',
            description: 'Содержит три области услуг по одной для каждой из ключевых клиентских категорий',
            title: '',
            subsections: []
        };
    }

    // Прокручиваем к секции
    await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, tabContainer.id ? `#${tabContainer.id}` : `.${tabContainer.classes.split(' ')[0]}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Извлекаем заголовок секции
    const sectionTitle = await page.evaluate((selector) => {
        const container = document.querySelector(selector);
        if (!container) return '';
        
        const title = container.querySelector('h2, h3, [class*="title"]');
        return title?.textContent.trim() || '';
    }, tabContainer.id ? `#${tabContainer.id}` : `.${tabContainer.classes.split(' ')[0]}`);

    const servicesSection = {
        type: 'services-section',
        description: 'Содержит три области услуг по одной для каждой из ключевых клиентских категорий. Одна область видима вместе с содержимым - по умолчанию это "Операторам связи", две другие видны только на уровне заголовков, что бы открыть надо щелкнуть по нему. При отрытии другой области предыдущая скрывается.',
        title: sectionTitle || 'НАШИ УСЛУГИ',
        subsections: []
    };

    // Прощелкиваем каждый таб и извлекаем контент
    for (const tabButton of tabContainer.tabButtons) {
        try {
            // Прокручиваем к табу
            await page.evaluate((tabText) => {
                const button = Array.from(document.querySelectorAll('[class*="tab"], [class*="tab-button"]'))
                    .find(btn => btn.textContent.trim().includes(tabText));
                if (button) {
                    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, tabButton.text);

            await new Promise(resolve => setTimeout(resolve, 300));

            // Кликаем на таб, если он не активен
            if (!tabButton.isActive) {
                const clicked = await page.evaluate((tabText) => {
                    const button = Array.from(document.querySelectorAll('[class*="tab"], [class*="tab-button"]'))
                        .find(btn => btn.textContent.trim().includes(tabText));
                    if (button && !button.classList.contains('active')) {
                        button.click();
                        return true;
                    }
                    return false;
                }, tabButton.text);

                if (clicked) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Извлекаем контент активного таба
            const tabContent = await page.evaluate((tabText) => {
                const container = document.querySelector('[class*="services"], [class*="section-our-services"], [class*="promo-note"]');
                if (!container) return null;

                // Ищем активный контент таба
                const activeContent = container.querySelector('[class*="active"], [class*="show"], [class*="content"]') || container;
                
                const header = activeContent.querySelector('h3, h4, [class*="header"]');
                const services = Array.from(activeContent.querySelectorAll('a[href]'))
                    .filter(link => {
                        const href = link.getAttribute('href');
                        const text = link.textContent.trim();
                        // Фильтруем только ссылки на услуги (не "Подробнее" и не hub-ссылки)
                        return href && 
                               !href.includes('#') && 
                               text.length > 5 && 
                               text !== 'Подробнее' &&
                               !text.includes('Перейти');
                    })
                    .map(link => ({
                        title: link.textContent.trim(),
                        href: link.getAttribute('href') || null
                    }));

                const hubLink = Array.from(activeContent.querySelectorAll('a[href]'))
                    .find(link => {
                        const text = link.textContent.trim();
                        const href = link.getAttribute('href');
                        return text === 'Подробнее' || 
                               (href && (href.includes('/operators') || href.includes('/government') || href.includes('/developers')));
                    });

                return {
                    header: header?.textContent.trim() || '',
                    services: services,
                    hubLink: hubLink ? {
                        text: hubLink.textContent.trim(),
                        href: hubLink.getAttribute('href') || null
                    } : null
                };
            }, tabButton.text);

            if (tabContent) {
                servicesSection.subsections.push({
                    index: servicesSection.subsections.length + 1,
                    title: tabButton.text,
                    header: tabContent.header,
                    services: tabContent.services,
                    hubLink: tabContent.hubLink
                });
            }
        } catch (error) {
            console.warn(`⚠️  Ошибка при анализе таба "${tabButton.text}": ${error.message}`);
        }
    }

    return servicesSection;
}

/**
 * Анализирует секцию с карточками партнерства
 */
async function analyzePartnershipSection(page) {
    return await page.evaluate(() => {
        const partnershipSection = {
            type: 'partnership-section',
            description: 'Объяснение как можно заработать вместе с МГТС, содержит три информационных карточки без переходов на внешние страницы',
            title: '',
            cards: []
        };

        // Ищем секцию с текстом о партнерстве
        const main = document.querySelector('main');
        if (!main) return partnershipSection;

        const sections = main.querySelectorAll('section, div[class*="section"], div[class*="block"]');
        
        for (const section of sections) {
            const text = section.textContent.trim();
            const heading = section.querySelector('h2, h3, [class*="title"]');
            
            // Ищем секцию с текстом о партнерстве или закупках
            if (text.includes('ЗАРАБАТЫВАЙТЕ') || 
                text.includes('ПАРТНЕРСТВЕ') ||
                text.includes('Допуск в ЛСС') ||
                text.includes('Соглашения об условиях') ||
                (heading && (heading.textContent.includes('ПАРТНЕР') || heading.textContent.includes('ЗАРАБАТЫВАЙТЕ')))) {
                
                partnershipSection.title = heading?.textContent.trim() || '';
                
                // Ищем карточки
                const cards = section.querySelectorAll('[class*="card"], [class*="item"]');
                
                cards.forEach((card, index) => {
                    const cardTitle = card.querySelector('h3, h4, [class*="title"], [class*="heading"]');
                    const cardText = card.querySelector('p, [class*="text"]');
                    const cardIcon = card.querySelector('svg, img, [class*="icon"]');
                    
                    // Проверяем, что карточка не является ссылкой
                    const hasLink = card.querySelector('a[href]');
                    if (hasLink && hasLink.getAttribute('href') && !hasLink.getAttribute('href').startsWith('#')) {
                        return; // Пропускаем карточки со ссылками
                    }

                    if (cardTitle || cardText) {
                        partnershipSection.cards.push({
                            index: index + 1,
                            title: cardTitle?.textContent.trim() || '',
                            text: cardText?.textContent.trim() || '',
                            hasIcon: !!cardIcon,
                            iconDescription: cardIcon ? (cardIcon.querySelector('title')?.textContent || 'иконка') : null
                        });
                    }
                });
                
                break; // Нашли секцию, выходим
            }
        }

        return partnershipSection;
    });
}

/**
 * Основная функция анализа - определяет секции на странице сверху вниз
 */
async function analyzePageSections(page) {
    const sections = [];
    
    console.log('   🔍 Поиск секций...');

    // Секция 1: Hero
    console.log('      → Анализ Hero-секции...');
    const hero = await analyzeHeroSection(page);
    if (hero.title) {
        sections.push({
            sectionIndex: 1,
            type: 'hero',
            description: 'Hero section',
            title: hero.title,
            subtitle: hero.subtitle,
            hasButton: hero.hasButton,
            buttonText: hero.buttonText,
            buttonHref: hero.buttonHref
        });
        console.log(`         ✓ Hero: ${hero.title}`);
    } else {
        console.log('         ⚠ Hero не найден');
    }

    // Секция 2: Факты о компании
    console.log('      → Анализ секции с фактами...');
    const facts = await analyzeFactsSection(page);
    if (facts.title || facts.items.length > 0) {
        sections.push({
            sectionIndex: 2,
            type: 'facts-section',
            description: facts.description,
            title: facts.title,
            subtitle: facts.subtitle,
            linkTo: facts.linkTo,
            items: facts.items
        });
        console.log(`         ✓ Факты: ${facts.title || 'найдено ' + facts.items.length + ' фактов'}`);
    } else {
        console.log('         ⚠ Секция с фактами не найдена');
    }

    // Секция 3: Mirror-slider (почему МГТС)
    console.log('      → Анализ mirror-slider...');
    const slider = await analyzeMirrorSlider(page);
    if (slider.slides.length > 0) {
        sections.push({
            sectionIndex: sections.length + 1,
            type: 'mirror-slider-section',
            description: slider.description,
            title: 'ПОЧЕМУ МГТС?',
            slider: slider
        });
        console.log(`         ✓ Mirror-slider: ${slider.slides.length} слайдов`);
    } else {
        console.log('         ⚠ Mirror-slider не найден');
    }

    // Секция 4: Услуги с табами
    console.log('      → Анализ секции услуг...');
    const services = await analyzeServicesSection(page);
    if (services.subsections.length > 0) {
        sections.push({
            sectionIndex: sections.length + 1,
            type: 'services-section',
            description: services.description,
            title: services.title,
            subsections: services.subsections
        });
        console.log(`         ✓ Услуги: ${services.subsections.length} подсекций`);
    } else {
        console.log('         ⚠ Секция услуг не найдена');
    }

    // Секция 5: Партнерство
    console.log('      → Анализ секции партнерства...');
    const partnership = await analyzePartnershipSection(page);
    if (partnership.cards.length > 0) {
        sections.push({
            sectionIndex: sections.length + 1,
            type: 'partnership-section',
            description: partnership.description,
            title: partnership.title,
            cards: partnership.cards
        });
        console.log(`         ✓ Партнерство: ${partnership.cards.length} карточек`);
    } else {
        console.log('         ⚠ Секция партнерства не найдена');
    }

    return sections;
}

/**
 * Главная функция
 */
async function main() {
    const slug = process.argv[2] || 'home';
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-structured');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 СТРУКТУРИРОВАННЫЙ СЕМАНТИЧЕСКИЙ АНАЛИЗ СТРАНИЦЫ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📄 Slug: ${slug}`);
    
    const pageUrl = slug === 'home' ? BASE_URL : `${BASE_URL}/${slug}`;
    console.log(`🌐 URL: ${pageUrl}`);
    console.log(`📁 Вывод: ${outputDir}`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null,
        slowMo: 100
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
        
        console.log('🔍 Структурированный анализ страницы...');
        
        const metadata = await extractMetadata(page);
        console.log(`   ✓ Метаданные: ${metadata.title}`);
        console.log('');
        
        const sections = await analyzePageSections(page);
        console.log('');
        console.log(`   ✓ Всего секций: ${sections.length}`);
        
        // Создаем скриншот
        const screenshotPath = path.join(outputDir, `${slug}_screenshot.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Скриншот: ${screenshotPath}`);
        
        // Сохраняем результат
        const result = {
            page: {
                slug: slug,
                url: metadata.url,
                pathname: metadata.pathname,
                analyzedAt: new Date().toISOString(),
                screenshot: screenshotPath
            },
            metadata: metadata,
            sections: sections
        };
        
        const outputPath = path.join(outputDir, `${slug}_spec.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ ТЗ сохранено: ${outputPath}`);
        console.log(`📸 Скриншот: ${screenshotPath}`);
        console.log(`📋 Секций: ${sections.length}`);
        console.log('');
        
        // Выводим краткое описание секций
        sections.forEach((section, index) => {
            console.log(`   Секция ${section.sectionIndex} - ${section.type}:`);
            console.log(`      ${section.title || 'без заголовка'}`);
            if (section.subtitle) {
                console.log(`      ${section.subtitle.substring(0, 80)}...`);
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
