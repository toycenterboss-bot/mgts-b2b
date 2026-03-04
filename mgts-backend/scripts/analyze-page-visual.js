const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';

/**
 * Визуальный анализ страницы - группирует элементы по их позициям и стилям
 */
async function analyzeVisualLayout(page) {
    return await page.evaluate(() => {
        const blocks = [];
        
        // Находим все значимые элементы
        const elements = document.querySelectorAll('div, section, article, header, main, footer, nav');
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Фильтруем элементы, которые имеют видимый контент
        const visibleElements = Array.from(elements).filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const text = el.textContent.trim();
            
            // Пропускаем невидимые элементы
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            
            // Пропускаем слишком маленькие элементы
            if (rect.width < 50 && rect.height < 50) {
                return false;
            }
            
            // Пропускаем элементы без контента
            if (text.length < 10 && el.querySelectorAll('img').length === 0) {
                return false;
            }
            
            // Пропускаем элементы вне видимой области (с запасом)
            if (rect.bottom < -100 || rect.top > viewportHeight + 100) {
                return false;
            }
            
            return true;
        });
        
        // Сортируем элементы по позиции (сверху вниз, слева направо)
        visibleElements.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            
            const topDiff = rectA.top - rectB.top;
            if (Math.abs(topDiff) > 20) {
                return topDiff; // Разные строки - сортируем по вертикали
            }
            return rectA.left - rectB.left; // Одна строка - сортируем по горизонтали
        });
        
        // Группируем элементы в визуальные блоки
        const visualBlocks = [];
        let currentBlock = null;
        
        visibleElements.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const text = el.textContent.trim();
            
            // Получаем стили для определения типа блока
            const backgroundColor = style.backgroundColor;
            const paddingTop = parseInt(style.paddingTop) || 0;
            const paddingBottom = parseInt(style.paddingBottom) || 0;
            const marginTop = parseInt(style.marginTop) || 0;
            const marginBottom = parseInt(style.marginBottom) || 0;
            
            // Определяем, является ли это началом нового блока
            const isNewBlock = !currentBlock || 
                               (rect.top - currentBlock.bottom > 50) || // Большой отступ сверху
                               (marginTop > 40 || paddingTop > 40) || // Большие отступы
                               (backgroundColor !== currentBlock.backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') || // Другой фон
                               (index === 0); // Первый элемент
            
            if (isNewBlock) {
                // Сохраняем предыдущий блок
                if (currentBlock) {
                    visualBlocks.push(currentBlock);
                }
                
                // Создаем новый блок
                const heading = el.querySelector('h1, h2, h3, h4, .h1, .h2, [class*="h1"], [class*="h2"]');
                const headingText = heading?.textContent.trim() || '';
                
                currentBlock = {
                    index: visualBlocks.length,
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right,
                    backgroundColor: backgroundColor,
                    paddingTop: paddingTop,
                    paddingBottom: paddingBottom,
                    marginTop: marginTop,
                    marginBottom: marginBottom,
                    heading: headingText,
                    textPreview: text.substring(0, 200),
                    hasImages: el.querySelectorAll('img').length > 0,
                    hasLinks: el.querySelectorAll('a').length > 0,
                    imageCount: el.querySelectorAll('img').length,
                    linkCount: el.querySelectorAll('a').length,
                    classes: Array.from(el.classList).join(' '),
                    elements: [{
                        tag: el.tagName.toLowerCase(),
                        text: text.substring(0, 100),
                        classes: Array.from(el.classList).join(' ')
                    }]
                };
            } else {
                // Добавляем элемент к текущему блоку
                if (currentBlock) {
                    currentBlock.bottom = Math.max(currentBlock.bottom, rect.bottom);
                    currentBlock.height = currentBlock.bottom - currentBlock.top;
                    currentBlock.width = Math.max(currentBlock.width, rect.right - currentBlock.left);
                    
                    if (!currentBlock.heading) {
                        const heading = el.querySelector('h1, h2, h3, h4, .h1, .h2, [class*="h1"], [class*="h2"]');
                        currentBlock.heading = heading?.textContent.trim() || '';
                    }
                    
                    currentBlock.textPreview += ' ' + text.substring(0, 100);
                    currentBlock.hasImages = currentBlock.hasImages || el.querySelectorAll('img').length > 0;
                    currentBlock.hasLinks = currentBlock.hasLinks || el.querySelectorAll('a').length > 0;
                    currentBlock.imageCount += el.querySelectorAll('img').length;
                    currentBlock.linkCount += el.querySelectorAll('a').length;
                    
                    currentBlock.elements.push({
                        tag: el.tagName.toLowerCase(),
                        text: text.substring(0, 100),
                        classes: Array.from(el.classList).join(' ')
                    });
                }
            }
        });
        
        // Добавляем последний блок
        if (currentBlock) {
            visualBlocks.push(currentBlock);
        }
        
        // Определяем тип каждого блока
        visualBlocks.forEach(block => {
            // Определяем семантический тип блока
            if (block.top < 200 && block.classes.includes('header')) {
                block.type = 'header';
                block.description = 'Шапка сайта (header)';
            } else if (block.bottom > viewportHeight - 200 && block.classes.includes('footer')) {
                block.type = 'footer';
                block.description = 'Подвал сайта (footer)';
            } else if (block.top < 500 && (block.hasImages || block.heading)) {
                block.type = 'hero';
                block.description = 'Главная секция (hero)';
            } else if (block.left < 300 && block.width < 300 && block.classes.includes('sidebar')) {
                block.type = 'sidebar';
                block.description = 'Боковое меню (sidebar)';
            } else if (block.hasImages && block.imageCount > 2) {
                block.type = 'gallery';
                block.description = 'Галерея изображений';
            } else if (block.hasLinks && block.linkCount > 5) {
                block.type = 'navigation';
                block.description = 'Навигационный блок';
            } else if (block.heading) {
                block.type = 'content-section';
                block.description = 'Контентная секция';
            } else {
                block.type = 'content';
                block.description = 'Блок контента';
            }
        });
        
        return {
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight,
            blocks: visualBlocks
        };
    });
}

/**
 * Главная функция
 */
async function main() {
    const slug = process.argv[2] || 'home';
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-visual');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎨 ВИЗУАЛЬНЫЙ АНАЛИЗ СТРАНИЦЫ');
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
        
        console.log('🎨 Визуальный анализ структуры страницы...');
        
        const visualLayout = await analyzeVisualLayout(page);
        
        console.log(`   ✓ Размер viewport: ${visualLayout.viewportWidth}x${visualLayout.viewportHeight}`);
        console.log(`   ✓ Найдено визуальных блоков: ${visualLayout.blocks.length}`);
        
        // Группируем блоки по типам
        const blocksByType = {};
        visualLayout.blocks.forEach(block => {
            if (!blocksByType[block.type]) {
                blocksByType[block.type] = [];
            }
            blocksByType[block.type].push(block);
        });
        
        console.log('\n   📊 Блоки по типам:');
        Object.keys(blocksByType).forEach(type => {
            console.log(`      - ${type}: ${blocksByType[type].length} блоков`);
        });
        
        // Создаем скриншот
        const screenshotPath = path.join(outputDir, `${slug}_screenshot.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`\n📸 Скриншот: ${screenshotPath}`);
        
        // Сохраняем результат
        const result = {
            page: {
                slug: slug,
                url: pageUrl,
                analyzedAt: new Date().toISOString(),
                screenshot: screenshotPath
            },
            viewport: {
                width: visualLayout.viewportWidth,
                height: visualLayout.viewportHeight
            },
            visualBlocks: visualLayout.blocks
        };
        
        const outputPath = path.join(outputDir, `${slug}_visual.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 РЕЗУЛЬТАТЫ ВИЗУАЛЬНОГО АНАЛИЗА');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ Результат сохранен: ${outputPath}`);
        console.log(`📸 Скриншот: ${screenshotPath}`);
        console.log(`📋 Визуальных блоков: ${visualLayout.blocks.length}`);
        console.log('');
        
        // Выводим краткое описание блоков
        console.log('📝 Структура страницы (сверху вниз):');
        visualLayout.blocks.slice(0, 10).forEach((block, index) => {
            console.log(`   ${index + 1}. ${block.type}: ${block.heading || block.textPreview.substring(0, 50)}`);
            console.log(`      Позиция: ${Math.round(block.top)}px, Размер: ${Math.round(block.width)}x${Math.round(block.height)}px`);
        });
        if (visualLayout.blocks.length > 10) {
            console.log(`   ... и еще ${visualLayout.blocks.length - 10} блоков`);
        }
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
