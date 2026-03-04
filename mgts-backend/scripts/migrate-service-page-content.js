const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// Таймаут для HTTP запросов (30 секунд)
const HTTP_TIMEOUT = 30000;

// Максимальное количество итераций в циклах
const MAX_ITERATIONS = 10000;

// Функция для логирования с немедленным выводом
function log(message) {
    console.log(message);
    // Принудительный flush для stdout
    if (process.stdout.isTTY) {
        process.stdout.write('');
    }
}

// Проверка наличия fetch (Node.js 18+ имеет встроенный fetch)
let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    // Пытаемся использовать node-fetch для старых версий Node.js
    try {
        fetch = require('node-fetch');
    } catch (e) {
        log('❌ Fetch не доступен. Установите node-fetch: npm install node-fetch@2');
        process.exit(1);
    }
}

// Обертка для fetch с таймаутом
async function fetchWithTimeout(url, options = {}, timeout = HTTP_TIMEOUT) {
    // Для node-fetch нужно использовать другой подход
    if (fetch.default) {
        fetch = fetch.default;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
    }
}

// Используем Cheerio для парсинга HTML
let cheerio;
try {
    cheerio = require('cheerio');
} catch (e) {
    log('❌ Cheerio не установлен. Установите: npm install cheerio');
    process.exit(1);
}

/**
 * Извлечь данные тарифов из старого блока
 * Анализирует повторяющиеся структуры и извлекает данные
 */
function extractTariffsFromOldBlock($, blockHTML, logger = log) {
    const tariffs = [];
    
    // Очищаем блок от комментариев и лишних закрывающих тегов
    let cleanBlockHTML = blockHTML;
    // Удаляем HTML комментарии
    cleanBlockHTML = cleanBlockHTML.replace(/<!--[\s\S]*?-->/g, '');
    // Удаляем лишние закрывающие теги div в начале (после h2)
    cleanBlockHTML = cleanBlockHTML.replace(/<\/h2>\s*<\/div>\s*/g, '</h2>');
    // Находим первую карточку и берем все от неё
    const firstCardIndex = cleanBlockHTML.indexOf('<div class="card">');
    if (firstCardIndex > 0) {
        cleanBlockHTML = cleanBlockHTML.substring(firstCardIndex);
        // Находим последнюю карточку
        const lastCardIndex = cleanBlockHTML.lastIndexOf('</div>');
        if (lastCardIndex > 0) {
            // Находим закрывающий тег последней карточки
            let cardEnd = lastCardIndex;
            let divCount = 0;
            for (let i = lastCardIndex; i >= 0; i--) {
                if (cleanBlockHTML.substring(i, i + 6) === '</div>') {
                    divCount++;
                    if (divCount === 1) {
                        cardEnd = i + 6;
                        break;
                    }
                }
            }
            cleanBlockHTML = cleanBlockHTML.substring(0, cardEnd);
        }
    }
    
    logger(`   🧹 Очищенный блок (размер: ${cleanBlockHTML.length} символов)`);
    
    const $block = cheerio.load(`<div>${cleanBlockHTML}</div>`, { decodeEntities: false })('div');
    
    logger('   🔍 Анализ структуры блока тарифов...');
    
    // ШАГ 1: Ищем повторяющиеся структуры - карточки с классом .card
    const cards = $block.find('.card');
    logger(`   📦 Найдено элементов с классом .card: ${cards.length}`);
    
    if (cards.length > 0) {
        logger('   ✅ Обнаружена повторяющаяся структура: .card элементы');
        cards.each(function(i) {
            const $card = $(this);
            logger(`\n   📋 Анализ карточки ${i + 1}:`);
            
            // Извлекаем название тарифа (h3 или h2 внутри карточки)
            const title = $card.find('h3, h2').first().text().trim();
            logger(`      - Название (h3/h2): "${title}"`);
            
            if (!title) {
                logger(`      ⚠️  Название не найдено, пропускаем карточку`);
                return;
            }
            
            // Извлекаем весь текст карточки для поиска цены
            const cardText = $card.text();
            logger(`      - Полный текст карточки (первые 200 символов): ${cardText.substring(0, 200)}`);
            
            // Ищем цену в тексте
            const priceMatch = cardText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*₽(?:\/мес)?/i) || 
                              cardText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*руб(?:\/мес)?/i);
            const priceAmount = priceMatch ? priceMatch[1].replace(/\s+/g, ' ') : '';
            logger(`      - Цена: ${priceAmount ? priceAmount + ' ₽' : 'не найдена'}`);
            
            if (!priceAmount) {
                logger(`      ⚠️  Цена не найдена, пропускаем карточку`);
                return;
            }
            
            // Извлекаем описание (первый параграф, который не содержит цену)
            let description = '';
            $card.find('p').each(function() {
                const pText = $(this).text().trim();
                if (pText && !pText.includes('₽') && !pText.includes('руб') && pText !== title) {
                    description = pText;
                    return false; // Прерываем цикл
                }
            });
            logger(`      - Описание: ${description || 'не найдено'}`);
            
            // Извлекаем характеристики (списки или строки с маркерами)
            const features = [];
            
            // Ищем списки (ul/ol > li)
            $card.find('li').each(function() {
                const itemText = $(this).text().trim();
                if (itemText && itemText.length > 3 && !itemText.includes('₽') && !itemText.includes('руб')) {
                    const cleanText = itemText.replace(/^[✓•\-]\s*/, '').trim();
                    if (cleanText.length > 3) {
                        features.push(cleanText);
                    }
                }
            });
            
            // Если нет списка, ищем строки с маркерами в параграфах
            if (features.length === 0) {
                $card.find('p').each(function() {
                    const pText = $(this).text().trim();
                    if (pText && (pText.includes('✓') || pText.includes('•') || pText.startsWith('-'))) {
                        const lines = pText.split(/[✓•\-]/).map(l => l.trim()).filter(l => l.length > 3);
                        features.push(...lines);
                    }
                });
            }
            
            logger(`      - Характеристики найдено: ${features.length}`);
            if (features.length > 0) {
                features.forEach((f, idx) => logger(`        ${idx + 1}. ${f.substring(0, 50)}`));
            }
            
            // Проверяем, является ли тариф "популярным" (по классу или тексту)
            const isFeatured = $card.hasClass('featured') || 
                              $card.hasClass('popular') || 
                              cardText.toLowerCase().includes('популярн');
            
            tariffs.push({
                title: title,
                description: description || '',
                priceAmount: priceAmount,
                pricePeriod: '/мес',
                features: features.filter(f => f.length > 0),
                isFeatured: isFeatured
            });
            
            logger(`      ✅ Тариф "${title}" извлечен успешно`);
        });
    }
    
    // ШАГ 2: Если не нашли .card, ищем другие повторяющиеся структуры
    if (tariffs.length === 0) {
        logger('   🔍 Карточки .card не найдены, ищем другие повторяющиеся структуры...');
        
        // Ищем все div элементы, которые содержат h3 и цену
        const divsWithH3 = $block.find('div').filter(function() {
            const $div = $(this);
            const hasH3 = $div.find('h3').length > 0;
            const hasPrice = /\d+\s*₽/i.test($div.text());
            // Пропускаем дочерние элементы других div с h3
            const parentHasH3 = $div.parent().find('> h3').length > 0;
            return hasH3 && hasPrice && !parentHasH3;
        });
        
        logger(`   📦 Найдено div элементов с h3 и ценой: ${divsWithH3.length}`);
        
        if (divsWithH3.length > 0) {
            logger('   ✅ Обнаружена повторяющаяся структура: div с h3 и ценой');
            divsWithH3.each(function(i) {
                const $div = $(this);
                const title = $div.find('h3').first().text().trim();
                const divText = $div.text();
                const priceMatch = divText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*₽/i);
                const priceAmount = priceMatch ? priceMatch[1].replace(/\s+/g, ' ') : '';
                
                if (title && priceAmount) {
                    logger(`   📋 Тариф ${i + 1}: "${title}" - ${priceAmount} ₽`);
                    tariffs.push({
                        title: title,
                        description: '',
                        priceAmount: priceAmount,
                        pricePeriod: '/мес',
                        features: [],
                        isFeatured: false
                    });
                }
            });
        }
    }
    
    logger(`\n   📊 Итого извлечено тарифов: ${tariffs.length}`);
    return tariffs;
}

/**
 * Извлечь FAQ из старого блока
 * Анализирует повторяющиеся структуры и извлекает данные
 */
function extractFAQFromOldBlock($, blockHTML, logger = log) {
    const faqItems = [];
    
    // Очищаем блок от комментариев и лишних закрывающих тегов
    let cleanBlockHTML = blockHTML;
    // Удаляем HTML комментарии
    cleanBlockHTML = cleanBlockHTML.replace(/<!--[\s\S]*?-->/g, '');
    // Удаляем лишние закрывающие теги div в начале (после h2)
    cleanBlockHTML = cleanBlockHTML.replace(/<\/h2>\s*<\/div>\s*/g, '</h2>');
    // Находим первую карточку и берем все от неё
    const firstCardIndex = cleanBlockHTML.indexOf('<div class="card">');
    if (firstCardIndex > 0) {
        cleanBlockHTML = cleanBlockHTML.substring(firstCardIndex);
        // Находим последнюю карточку
        const lastCardIndex = cleanBlockHTML.lastIndexOf('</div>');
        if (lastCardIndex > 0) {
            // Находим закрывающий тег последней карточки
            let cardEnd = lastCardIndex;
            let divCount = 0;
            for (let i = lastCardIndex; i >= 0; i--) {
                if (cleanBlockHTML.substring(i, i + 6) === '</div>') {
                    divCount++;
                    if (divCount === 1) {
                        cardEnd = i + 6;
                        break;
                    }
                }
            }
            cleanBlockHTML = cleanBlockHTML.substring(0, cardEnd);
        }
    }
    
    logger(`   🧹 Очищенный блок FAQ (размер: ${cleanBlockHTML.length} символов)`);
    
    const $block = cheerio.load(`<div>${cleanBlockHTML}</div>`, { decodeEntities: false })('div');
    
    logger('   🔍 Анализ структуры блока FAQ...');
    
    // ШАГ 1: Ищем повторяющиеся структуры - карточки с классом .card
    const cards = $block.find('.card');
    logger(`   📦 Найдено элементов с классом .card: ${cards.length}`);
    
    if (cards.length > 0) {
        logger('   ✅ Обнаружена повторяющаяся структура: .card элементы');
        cards.each(function(i) {
            const $card = $(this);
            logger(`\n   📋 Анализ карточки FAQ ${i + 1}:`);
            
            // Извлекаем вопрос (h3 или h2 внутри карточки)
            const question = $card.find('h3, h2').first().text().trim();
            logger(`      - Вопрос (h3/h2): "${question}"`);
            
            if (!question) {
                logger(`      ⚠️  Вопрос не найден, пропускаем карточку`);
                return;
            }
            
            // Извлекаем ответ (все параграфы)
            const allParagraphs = [];
            $card.find('p').each(function() {
                let pText = $(this).text().trim();
                // Убираем вопрос из начала ответа, если он там есть
                if (pText.startsWith(question)) {
                    pText = pText.substring(question.length).trim();
                    // Убираем лишние пробелы и переносы строк в начале
                    pText = pText.replace(/^\s*[\n\r]+\s*/, '');
                }
                if (pText && pText.length > 0 && pText !== question) {
                    allParagraphs.push(pText);
                }
            });
            
            logger(`      - Найдено параграфов ответа: ${allParagraphs.length}`);
            if (allParagraphs.length > 0) {
                allParagraphs.forEach((p, idx) => {
                    logger(`        Параграф ${idx + 1} (первые 100 символов): ${p.substring(0, 100)}`);
                });
            }
            
            const fullAnswer = allParagraphs.join('\n\n');
            
            if (fullAnswer) {
                faqItems.push({
                    question: question,
                    answer: fullAnswer
                });
                logger(`      ✅ FAQ элемент "${question.substring(0, 50)}..." извлечен успешно`);
            } else {
                logger(`      ⚠️  Ответ не найден, пропускаем карточку`);
            }
        });
    }
    
    // ШАГ 2: Если не нашли .card, ищем другие повторяющиеся структуры
    if (faqItems.length === 0) {
        logger('   🔍 Карточки .card не найдены, ищем другие повторяющиеся структуры...');
        
        // Ищем все div элементы, которые содержат h3 (вопрос) и p (ответ)
        const divsWithQnA = $block.find('div').filter(function() {
            const $div = $(this);
            const hasH3 = $div.find('> h3, h3').length > 0;
            const hasP = $div.find('> p, p').length > 0;
            // Пропускаем дочерние элементы других div с h3
            const parentHasH3 = $div.parent().find('> h3').length > 0;
            return hasH3 && hasP && !parentHasH3;
        });
        
        logger(`   📦 Найдено div элементов с h3 и p: ${divsWithQnA.length}`);
        
        if (divsWithQnA.length > 0) {
            logger('   ✅ Обнаружена повторяющаяся структура: div с h3 (вопрос) и p (ответ)');
            divsWithQnA.each(function(i) {
                const $div = $(this);
                const question = $div.find('h3').first().text().trim();
                const paragraphs = [];
                $div.find('p').each(function() {
                    const pText = $(this).text().trim();
                    if (pText && pText !== question) {
                        paragraphs.push(pText);
                    }
                });
                const answer = paragraphs.join('\n\n');
                
                if (question && answer) {
                    logger(`   📋 FAQ ${i + 1}: "${question.substring(0, 50)}..."`);
                    faqItems.push({
                        question: question,
                        answer: answer
                    });
                }
            });
        }
    }
    
    logger(`\n   📊 Итого извлечено FAQ элементов: ${faqItems.length}`);
    return faqItems;
}

/**
 * Создать HTML для новой секции тарифов
 */
function createServiceTariffsHTML(tariffs) {
    if (tariffs.length === 0) return '';
    
    let html = '<section class="service-tariffs">\n';
    html += '    <div class="container">\n';
    html += '        <h2>Тарифы и цены</h2>\n';
    html += '        <div class="tariffs-grid">\n';
    
    tariffs.forEach((tariff, index) => {
        const featuredClass = tariff.isFeatured ? ' tariff-card--featured' : '';
        html += `            <div class="tariff-card${featuredClass}">\n`;
        
        if (tariff.isFeatured) {
            html += '                <div class="tariff-badge">Популярный</div>\n';
        }
        
        html += '                <div class="tariff-card__header">\n';
        html += `                    <h3 class="tariff-card__title">${escapeHtml(tariff.title)}</h3>\n`;
        if (tariff.description) {
            html += `                    <p class="tariff-card__description">${escapeHtml(tariff.description)}</p>\n`;
        }
        html += '                    <div class="tariff-price">\n';
        html += `                        от <span class="tariff-price__amount">${escapeHtml(tariff.priceAmount)}</span> ₽\n`;
        html += `                        <span class="tariff-price__period">${escapeHtml(tariff.pricePeriod)}</span>\n`;
        html += '                    </div>\n';
        html += '                </div>\n';
        
        if (tariff.features && tariff.features.length > 0) {
            html += '                <ul class="tariff-features">\n';
            tariff.features.forEach(feature => {
                html += `                    <li>${escapeHtml(feature)}</li>\n`;
            });
            html += '                </ul>\n';
        }
        
        html += '                <div class="tariff-card__footer">\n';
        html += '                    <button class="btn btn-primary btn-lg" onclick="document.getElementById(\'order-form\').scrollIntoView({behavior: \'smooth\'})">Выбрать тариф</button>\n';
        html += '                </div>\n';
        html += '            </div>\n';
    });
    
    html += '        </div>\n';
    html += '    </div>\n';
    html += '</section>\n';
    
    return html;
}

/**
 * Создать HTML для новой секции FAQ
 */
function createServiceFAQHTML(faqItems) {
    if (faqItems.length === 0) return '';
    
    let html = '<section class="service-faq">\n';
    html += '    <div class="container">\n';
    html += '        <h2>Часто задаваемые вопросы</h2>\n';
    html += '        <div class="faq-list">\n';
    
    faqItems.forEach((item, index) => {
        const faqId = `faq-answer-${index + 1}`;
        html += '            <div class="faq-item">\n';
        html += `                <button class="faq-question" type="button" aria-expanded="false" aria-controls="${faqId}">\n`;
        html += `                    <span>${escapeHtml(item.question)}</span>\n`;
        html += '                    <span class="faq-icon" aria-hidden="true">\n';
        html += '                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n';
        html += '                            <path d="M6 9l6 6 6-6"></path>\n';
        html += '                        </svg>\n';
        html += '                    </span>\n';
        html += '                </button>\n';
        html += `                <div class="faq-answer" id="${faqId}" aria-expanded="false">\n`;
        html += '                    <div class="faq-answer-content">\n';
        
        // Разбиваем ответ на параграфы
        const answerParagraphs = item.answer.split('\n\n').filter(p => p.trim().length > 0);
        answerParagraphs.forEach(paragraph => {
            html += `                        <p>${escapeHtml(paragraph.trim())}</p>\n`;
        });
        
        html += '                    </div>\n';
        html += '                </div>\n';
        html += '            </div>\n';
    });
    
    html += '        </div>\n';
    html += '    </div>\n';
    html += '</section>\n';
    
    return html;
}

/**
 * Экранировать HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Найти блок между двумя элементами
 */
function findBlockBetween($, startElement, endSelector) {
    const elements = [];
    
    // Находим все следующие элементы после startElement
    let current = startElement;
    const parent = startElement.parent();
    
    // Находим следующий разделитель (h2 или новая секция)
    const nextH2 = startElement.nextAll('h2').first();
    const nextSection = startElement.nextAll('section.service-tariffs, section.service-faq, section.service-order').first();
    
    let endElement = null;
    if (nextSection.length > 0 && nextH2.length > 0) {
        // Берем тот, который ближе
        const h2Index = startElement[0] ? Array.from(parent.children()).indexOf(nextH2[0]) : -1;
        const sectionIndex = startElement[0] ? Array.from(parent.children()).indexOf(nextSection[0]) : -1;
        endElement = (h2Index >= 0 && sectionIndex >= 0 && h2Index < sectionIndex) ? nextH2 : nextSection;
    } else if (nextSection.length > 0) {
        endElement = nextSection;
    } else if (nextH2.length > 0) {
        endElement = nextH2;
    }
    
    // Собираем все элементы между startElement и endElement
    if (endElement && endElement.length > 0) {
        let sibling = startElement.next();
        let iterations = 0;
        while (sibling.length > 0 && sibling[0] !== endElement[0] && iterations < MAX_ITERATIONS) {
            elements.push(sibling[0]);
            sibling = sibling.next();
            iterations++;
        }
        if (iterations >= MAX_ITERATIONS) {
            throw new Error(`Превышено максимальное количество итераций (${MAX_ITERATIONS}) при сборе элементов между startElement и endElement`);
        }
    } else {
        // Если нет следующего разделителя, берем все следующие элементы
        let sibling = startElement.next();
        let iterations = 0;
        while (sibling.length > 0 && iterations < MAX_ITERATIONS) {
            // Проверяем, не является ли элемент разделителем
            if (sibling.is('h2') || sibling.is('section.service-tariffs, section.service-faq, section.service-order')) {
                break;
            }
            elements.push(sibling[0]);
            sibling = sibling.next();
            iterations++;
        }
        if (iterations >= MAX_ITERATIONS) {
            throw new Error(`Превышено максимальное количество итераций (${MAX_ITERATIONS}) при сборе элементов после startElement`);
        }
    }
    
    return $(elements);
}

/**
 * Обработать контент страницы: извлечь данные из старых блоков и обновить новые
 */
async function processPageContent(slug) {
    log(`\n${'='.repeat(70)}`);
    log(`ОБРАБОТКА КОНТЕНТА СТРАНИЦЫ: ${slug}`);
    log('='.repeat(70));
    
    try {
        // Получаем страницу из Strapi
        const getUrl = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (API_TOKEN) {
            headers['Authorization'] = `Bearer ${API_TOKEN}`;
        }
        
        log(`\n📥 Загружаю страницу из Strapi...`);
        const getResponse = await fetchWithTimeout(getUrl, { headers });
        
        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            throw new Error(`HTTP error! status: ${getResponse.status}, body: ${errorText}`);
        }
        
        const getData = await getResponse.json();
        
        if (!getData.data || getData.data.length === 0) {
            throw new Error(`Страница ${slug} не найдена в Strapi`);
        }
        
        const page = getData.data[0];
        const pageId = page.documentId || page.id; // В Strapi v5 используется documentId
        const documentId = page.documentId; // Сохраняем для использования в обновлении
        const pageAttributes = page.attributes || page;
        let currentContent = pageAttributes.content || '';
        
        log(`✅ Страница найдена (ID: ${pageId}, documentId: ${documentId}, id: ${page.id})`);
        log(`📄 Текущий размер контента: ${currentContent.length} символов`);
        
        if (!currentContent || currentContent.trim().length === 0) {
            log('⚠️  Контент страницы пуст, пропускаем обработку');
            return;
        }
        
        // Парсим HTML - оборачиваем в body для правильного парсинга
        const $ = cheerio.load(`<body>${currentContent}</body>`, { decodeEntities: false });
        
        // 1. Найти старый блок тарифов
        log('\n🔍 Ищу старый блок тарифов...');
        let oldTariffsH2 = null;
        let oldTariffsContent = null; // DOM элементы для комментирования
        let oldTariffsBlockHTML = null; // HTML строка для извлечения данных
        let tariffs = [];
        
        // Сначала проверяем, есть ли тарифы в секции service-tariffs
        const existingTariffsSection = $('body section.service-tariffs');
        if (existingTariffsSection.length > 0) {
            const tariffsInSection = existingTariffsSection.find('.tariff-card').length;
            const cardsInSection = existingTariffsSection.find('.card').length;
            log(`   ℹ️  Найдена секция service-tariffs с ${tariffsInSection} тарифами (.tariff-card) и ${cardsInSection} карточками (.card)`);
            
            // Извлекаем данные из существующей секции (названия и цены)
            const existingTariffs = [];
            existingTariffsSection.find('.tariff-card').each((i, card) => {
                const $card = $(card);
                const title = $card.find('.tariff-card__title, h3').first().text().trim();
                const priceText = $card.find('.tariff-price__amount, .tariff-price').first().text().trim();
                const priceMatch = priceText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)/i);
                const priceAmount = priceMatch ? priceMatch[1].replace(/\s+/g, ' ') : '';
                
                if (title && priceAmount) {
                    existingTariffs.push({
                        title,
                        priceAmount,
                        pricePeriod: '/мес',
                        features: [], // Характеристики будут дополнены из старых блоков
                        isFeatured: $card.hasClass('tariff-card--featured')
                    });
                }
            });
            
            if (existingTariffs.length > 0) {
                log(`   📋 Извлечено ${existingTariffs.length} тарифов из существующей секции (без характеристик)`);
                tariffs = existingTariffs;
            } else if (cardsInSection > 0 && tariffsInSection === 0) {
                // Если в секции есть .card элементы, но нет .tariff-card, значит это старый формат
                log(`   ✅ Найдены тарифы в старом формате внутри секции service-tariffs`);
                oldTariffsBlockHTML = existingTariffsSection.html();
                tariffs = extractTariffsFromOldBlock($, oldTariffsBlockHTML, (msg) => log(msg));
                if (tariffs.length > 0) {
                    log(`   📊 Извлечено тарифов из секции: ${tariffs.length}`);
                    // Помечаем секцию для обновления
                    oldTariffsContent = existingTariffsSection;
                }
            }
        }
        
        // Если тарифы найдены в секции, но без характеристик, ищем старые блоки для дополнения
        if (tariffs.length > 0 && tariffs.some(t => t.features.length === 0)) {
            log(`   🔍 Ищу старые блоки тарифов для дополнения характеристик...`);
            
            // Ищем старые блоки тарифов вне секции service-tariffs
            // 1. Ищем по h2 заголовкам
            const allH2 = $('body h2').toArray();
            for (let i = 0; i < allH2.length; i++) {
                const $h2 = $(allH2[i]);
                const text = $h2.text().trim().toLowerCase();
                if ((text.includes('тариф') || text.includes('цена') || text.includes('стоимость')) && 
                    !text.includes('faq') && !text.includes('вопрос')) {
                    if ($h2.closest('section.service-tariffs').length === 0) {
                        // Находим блок после h2
                        let next = $h2.next();
                        let blockHTML = $('<div>').append($h2.clone()).html();
                        let maxIterations = 50;
                        
                        while (next.length > 0 && maxIterations > 0) {
                            if (next.is('h2') || next.is('section.service-tariffs, section.service-faq, section.service-order')) {
                                break;
                            }
                            blockHTML += next[0].outerHTML || '';
                            next = next.next();
                            maxIterations--;
                        }
                        
                        // Извлекаем тарифы из старого блока
                        const oldTariffs = extractTariffsFromOldBlock($, blockHTML, (msg) => log(msg));
                        
                        // Объединяем данные: название и цена из секции + характеристики из старого блока
                        tariffs = tariffs.map(tariff => {
                            const oldTariff = oldTariffs.find(ot => 
                                ot.title.toLowerCase() === tariff.title.toLowerCase() ||
                                (ot.priceAmount === tariff.priceAmount && ot.title.toLowerCase().includes(tariff.title.toLowerCase())) ||
                                (tariff.title.toLowerCase().includes(ot.title.toLowerCase()) && ot.priceAmount === tariff.priceAmount)
                            );
                            
                            if (oldTariff && oldTariff.features.length > 0) {
                                log(`   ✅ Дополнены характеристики для тарифа "${tariff.title}" (${oldTariff.features.length} шт.)`);
                                return {
                                    ...tariff,
                                    features: oldTariff.features
                                };
                            }
                            return tariff;
                        });
                        
                        if (oldTariffs.length > 0) {
                            break; // Нашли старый блок, прекращаем поиск
                        }
                    }
                }
            }
            
            // 2. Если не нашли по h2, ищем любые .card элементы вне секции service-tariffs
            if (tariffs.some(t => t.features.length === 0)) {
                log(`   🔍 Ищу .card элементы вне секции service-tariffs...`);
                const cardsOutsideSection = $('body .card').filter((i, card) => {
                    return $(card).closest('section.service-tariffs').length === 0;
                });
                
                if (cardsOutsideSection.length > 0) {
                    log(`   📦 Найдено ${cardsOutsideSection.length} карточек вне секции`);
                    
                    // Прямое извлечение из каждой карточки
                    cardsOutsideSection.each((i, card) => {
                        const $card = $(card);
                        const cardText = $card.text();
                        
                        // Ищем название (h3, h2, или первый значимый текст)
                        const title = $card.find('h3, h2').first().text().trim() || 
                                     $card.find('strong, b').first().text().trim() ||
                                     cardText.split('\n')[0].trim();
                        
                        // Ищем цену
                        const priceMatch = cardText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*₽(?:\/мес)?/i) || 
                                          cardText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*руб(?:\/мес)?/i);
                        
                        if (title && priceMatch) {
                            const priceAmount = priceMatch[1].replace(/\s+/g, ' ');
                            
                            // Ищем соответствующий тариф в списке
                            const matchingTariff = tariffs.find(t => 
                                t.title.toLowerCase() === title.toLowerCase() ||
                                (t.priceAmount === priceAmount && t.title.toLowerCase().includes(title.toLowerCase())) ||
                                (title.toLowerCase().includes(t.title.toLowerCase()) && t.priceAmount === priceAmount)
                            );
                            
                            if (matchingTariff && matchingTariff.features.length === 0) {
                                // Извлекаем характеристики
                                const features = [];
                                
                                // Из списков
                                $card.find('li').each((j, li) => {
                                    const featureText = $(li).text().trim();
                                    if (featureText && !featureText.includes('₽') && !featureText.includes('руб')) {
                                        features.push(featureText);
                                    }
                                });
                                
                                // Из параграфов (разбиваем по маркерам)
                                if (features.length === 0) {
                                    $card.find('p').each((j, p) => {
                                        const pText = $(p).text().trim();
                                        if (pText && !pText.includes('₽') && !pText.includes('руб') && pText !== title) {
                                            // Разбиваем по символам маркера
                                            const lines = pText.split(/[✓•\-\*]/).map(l => l.trim()).filter(l => l && l.length > 3);
                                            features.push(...lines);
                                        }
                                    });
                                }
                                
                                // Из всего текста карточки (последний вариант)
                                if (features.length === 0) {
                                    const allText = cardText.split('\n').map(l => l.trim()).filter(l => l);
                                    allText.forEach(line => {
                                        if (line && 
                                            !line.includes('₽') && 
                                            !line.includes('руб') && 
                                            line !== title &&
                                            line.length > 5 &&
                                            !line.match(/^\d+\s*₽/)) {
                                            // Проверяем, не является ли это частью цены или названия
                                            if (!line.match(/от\s*\d+/i) && !line.toLowerCase().includes(title.toLowerCase())) {
                                                features.push(line);
                                            }
                                        }
                                    });
                                }
                                
                                if (features.length > 0) {
                                    matchingTariff.features = features;
                                    log(`   ✅ Дополнены характеристики для тарифа "${matchingTariff.title}" из .card (${features.length} шт.)`);
                                }
                            }
                        }
                    });
                }
            }
        }
        
        // Если тарифы не найдены, ищем универсально - любые элементы с h3 и ценой
        // Но только если они НЕ находятся в секции service-tariffs
        if (tariffs.length === 0) {
            log(`   🔍 Универсальный поиск тарифов (h3 + цена)...`);
            const allH3 = $('body h3').toArray();
            let foundTariffs = [];
            
            allH3.forEach((h3, i) => {
                const $h3 = $(h3);
                const title = $h3.text().trim();
                if (!title) return;
                
                // Пропускаем тарифы, которые уже в секции service-tariffs
                if ($h3.closest('section.service-tariffs').length > 0) {
                    return;
                }
                
                // Ищем цену в родительском элементе или следующих элементах
                const parent = $h3.parent();
                const parentText = parent.text();
                const priceMatch = parentText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*₽(?:\/мес)?/i) || 
                                  parentText.match(/(?:от\s*)?(\d+(?:\s+\d+)*)\s*руб(?:\/мес)?/i);
                
                if (priceMatch) {
                    const priceAmount = priceMatch[1].replace(/\s+/g, ' ');
                    log(`   ✅ Найден тариф: "${title}" - ${priceAmount} ₽`);
                    
                    // Извлекаем характеристики из родительского элемента
                    const features = [];
                    parent.find('li').each((j, li) => {
                        const featureText = $(li).text().trim();
                        if (featureText) features.push(featureText);
                    });
                    
                    // Если нет li, ищем в параграфах
                    if (features.length === 0) {
                        parent.find('p').each((j, p) => {
                            const pText = $(p).text().trim();
                            if (pText && !pText.includes('₽') && !pText.includes('руб') && pText !== title) {
                                // Разбиваем на строки по символам маркера
                                const lines = pText.split(/[✓•\-\*]/).map(l => l.trim()).filter(l => l);
                                features.push(...lines);
                            }
                        });
                    }
                    
                    foundTariffs.push({
                        title,
                        priceAmount,
                        pricePeriod: '/мес',
                        features: features.length > 0 ? features : [],
                        isFeatured: parent.hasClass('tariff-card--featured') || parent.hasClass('featured')
                    });
                }
            });
            
            if (foundTariffs.length > 0) {
                log(`   📊 Найдено тарифов универсальным поиском: ${foundTariffs.length}`);
                tariffs = foundTariffs;
            }
        }
        
        const allH2ForOldBlocks = $('body h2').toArray();
        for (let i = 0; i < allH2ForOldBlocks.length; i++) {
            const $h2 = $(allH2ForOldBlocks[i]);
            const text = $h2.text().trim().toLowerCase();
            if (text.includes('тариф') && !text.includes('faq') && !text.includes('вопрос')) {
                // Проверяем, что это не новая секция
                if ($h2.closest('.service-tariffs, section.service-tariffs').length === 0) {
                    oldTariffsH2 = $h2;
                    
                    // Находим следующий h2 или новую секцию
                    let nextH2 = null;
                    for (let j = i + 1; j < allH2.length; j++) {
                        const $nextH2 = $(allH2[j]);
                        // Пропускаем новые секции
                        if ($nextH2.closest('.service-tariffs, section.service-tariffs, section.service-faq, section.service-order').length === 0) {
                            nextH2 = $nextH2;
                            break;
                        }
                    }
                    
                    // Собираем HTML между h2 - используем обход всех элементов body
                    const h2HTML = $('<div>').append($h2.clone()).html();
                    
                    // Находим все элементы body в порядке их появления в DOM
                    const bodyChildren = $('body').children().toArray();
                    const h2Index = bodyChildren.indexOf($h2[0]);
                    
                    // Собираем все элементы после h2 до следующего h2 или новой секции
                    const collectedElements = [];
                    for (let idx = h2Index + 1; idx < bodyChildren.length; idx++) {
                        const el = bodyChildren[idx];
                        const $el = $(el);
                        
                        // Останавливаемся на следующем h2 (который не в новой секции)
                        if ($el.is('h2')) {
                            if ($el.closest('.service-tariffs, section.service-tariffs, section.service-faq, section.service-order').length === 0) {
                                break;
                            }
                        }
                        
                        // Останавливаемся на новой секции
                        if ($el.is('section.service-tariffs, section.service-faq, section.service-order')) {
                            break;
                        }
                        
                        collectedElements.push(el);
                    }
                    
                    // Сохраняем DOM элементы для комментирования
                    oldTariffsContent = $(collectedElements);
                    
                    // Создаем HTML строку для извлечения данных (включая вложенные элементы)
                    // Используем outerHTML для получения полной структуры элемента
                    const contentHTML = collectedElements.length > 0 
                        ? collectedElements.map(el => {
                            try {
                                // Используем outerHTML для получения полной структуры, включая вложенные элементы
                                return el.outerHTML || '';
                            } catch (e) {
                                try {
                                    return $(el).html() || '';
                                } catch (e2) {
                                    return '';
                                }
                            }
                        }).join('')
                        : '';
                    
                    // Если блок пустой, пытаемся найти элементы в исходном HTML между h2
                    if (contentHTML.length < 50) {
                        log(`   ⚠️  Блок кажется пустым, ищу в исходном HTML...`);
                        
                        // Находим позицию h2 в исходном HTML
                        const h2Text = $h2.text().trim();
                        const h2Start = currentContent.indexOf(`<h2>${h2Text}</h2>`) || currentContent.indexOf(`<h2`);
                        if (h2Start >= 0) {
                            // Ищем следующий h2 в исходном HTML
                            let nextH2Start = currentContent.indexOf('<h2', h2Start + 10);
                            // Пропускаем h2 внутри новых секций
                            let iterations = 0;
                            while (nextH2Start >= 0 && iterations < MAX_ITERATIONS) {
                                const beforeNextH2 = currentContent.substring(h2Start, nextH2Start);
                                if (!beforeNextH2.includes('section.service-tariffs') && 
                                    !beforeNextH2.includes('section.service-faq') &&
                                    !beforeNextH2.includes('section.service-order')) {
                                    break;
                                }
                                const nextSearchStart = nextH2Start + 10;
                                nextH2Start = currentContent.indexOf('<h2', nextSearchStart);
                                iterations++;
                                if (nextH2Start === nextSearchStart - 10) {
                                    // Если индекс не изменился, значит мы не нашли следующий h2
                                    break;
                                }
                            }
                            if (iterations >= MAX_ITERATIONS) {
                                throw new Error(`Превышено максимальное количество итераций (${MAX_ITERATIONS}) при поиске следующего h2 для FAQ`);
                            }
                            
                            if (nextH2Start > 0) {
                                const blockFromHTML = currentContent.substring(h2Start, nextH2Start);
                                log(`   ✅ Найден блок в исходном HTML, размер: ${blockFromHTML.length} символов`);
                                oldTariffsBlockHTML = blockFromHTML;
                            } else {
                                // Берем все до конца или до новой секции
                                const blockFromHTML = currentContent.substring(h2Start);
                                const sectionStart = blockFromHTML.indexOf('<section class="service-');
                                if (sectionStart > 0) {
                                    oldTariffsBlockHTML = blockFromHTML.substring(0, sectionStart);
                                    log(`   ✅ Найден блок в исходном HTML до новой секции, размер: ${oldTariffsBlockHTML.length} символов`);
                                } else {
                                    oldTariffsBlockHTML = h2HTML + contentHTML;
                                }
                            }
                        } else {
                            oldTariffsBlockHTML = h2HTML + contentHTML;
                        }
                    } else {
                        oldTariffsBlockHTML = h2HTML + contentHTML;
                    }
                    break;
                }
            }
        }
        
        if (oldTariffsH2 && oldTariffsH2.length > 0) {
            log('✅ Старый блок тарифов найден');
            log(`   Размер блока: ${oldTariffsBlockHTML.length} символов`);
            log(`   Превью блока (первые 800 символов): ${oldTariffsBlockHTML.substring(0, 800)}`);
            tariffs = extractTariffsFromOldBlock($, oldTariffsBlockHTML, (msg) => log(msg));
            log(`\n   📊 Итого извлечено тарифов: ${tariffs.length}`);
            if (tariffs.length > 0) {
                tariffs.forEach((t, i) => {
                    log(`   ${i + 1}. ${t.title} - ${t.priceAmount} ₽`);
                });
            } else {
                log('   ⚠️  Тарифы не извлечены, проверяю структуру...');
                // Показываем структуру блока
                const $block = cheerio.load(oldTariffsBlockHTML, { decodeEntities: false })('body');
                log(`   Найдено элементов: ${$block.find('*').length}`);
                log(`   Найдено .card: ${$block.find('.card').length}`);
                log(`   Найдено h3: ${$block.find('h3').length}`);
                log(`   Найдено div с классом card: ${$block.find('div.card').length}`);
                const priceElements = $block.find('*').filter((i, el) => {
                    const text = $(el).text();
                    return /\d+\s*₽/i.test(text);
                });
                log(`   Найдено элементов с ценой: ${priceElements.length}`);
                if (priceElements.length > 0) {
                    log(`   Первый элемент с ценой: ${priceElements.first().text().substring(0, 100)}`);
                }
            }
        } else {
            log('⚠️  Старый блок тарифов не найден');
        }
        
        // 2. Найти старый блок FAQ
        log('\n🔍 Ищу старый блок FAQ...');
        let oldFAQH2 = null;
        let oldFAQContent = null; // DOM элементы для комментирования
        let oldFAQBlockHTML = null; // HTML строка для извлечения данных
        let faqItems = [];
        
        const allH2FAQ = $('body h2').toArray();
        for (let i = 0; i < allH2FAQ.length; i++) {
            const $h2 = $(allH2FAQ[i]);
            const text = $h2.text().trim().toLowerCase();
            if ((text.includes('вопрос') || text.includes('faq')) && !text.includes('тариф')) {
                if ($h2.closest('.service-faq, section.service-faq').length === 0) {
                    oldFAQH2 = $h2;
                    
                    // Находим следующий h2 или новую секцию
                    let nextH2 = null;
                    for (let j = i + 1; j < allH2FAQ.length; j++) {
                        const $nextH2 = $(allH2FAQ[j]);
                        if ($nextH2.closest('.service-tariffs, section.service-tariffs, section.service-faq, section.service-order').length === 0) {
                            nextH2 = $nextH2;
                            break;
                        }
                    }
                    
                    // Собираем HTML между h2 - используем обход всех элементов body
                    const h2HTML = $('<div>').append($h2.clone()).html();
                    
                    // Находим все элементы body в порядке их появления в DOM
                    const bodyChildren = $('body').children().toArray();
                    const h2Index = bodyChildren.indexOf($h2[0]);
                    
                    // Собираем все элементы после h2 до следующего h2 или новой секции
                    const collectedElements = [];
                    for (let idx = h2Index + 1; idx < bodyChildren.length; idx++) {
                        const el = bodyChildren[idx];
                        const $el = $(el);
                        
                        // Останавливаемся на следующем h2 (который не в новой секции)
                        if ($el.is('h2')) {
                            if ($el.closest('.service-tariffs, section.service-tariffs, section.service-faq, section.service-order').length === 0) {
                                break;
                            }
                        }
                        
                        // Останавливаемся на новой секции
                        if ($el.is('section.service-tariffs, section.service-faq, section.service-order')) {
                            break;
                        }
                        
                        collectedElements.push(el);
                    }
                    
                    // Сохраняем DOM элементы для комментирования
                    oldFAQContent = $(collectedElements);
                    
                    // Создаем HTML строку для извлечения данных (включая вложенные элементы)
                    const contentHTML = collectedElements.length > 0 
                        ? collectedElements.map(el => {
                            try {
                                return el.outerHTML || $(el).html() || '';
                            } catch (e) {
                                return '';
                            }
                        }).join('')
                        : '';
                    
                    // Если блок пустой, пытаемся найти элементы в исходном HTML между h2
                    if (contentHTML.length < 50) {
                        log(`   ⚠️  Блок FAQ кажется пустым, ищу в исходном HTML...`);
                        
                        // Находим позицию h2 в исходном HTML
                        const h2Text = $h2.text().trim();
                        const h2Start = currentContent.indexOf(`<h2>${h2Text}</h2>`) || currentContent.indexOf(`<h2`);
                        if (h2Start >= 0) {
                            // Ищем следующий h2 в исходном HTML
                            let nextH2Start = currentContent.indexOf('<h2', h2Start + 10);
                            // Пропускаем h2 внутри новых секций
                            let iterations = 0;
                            while (nextH2Start >= 0 && iterations < MAX_ITERATIONS) {
                                const beforeNextH2 = currentContent.substring(h2Start, nextH2Start);
                                if (!beforeNextH2.includes('section.service-tariffs') && 
                                    !beforeNextH2.includes('section.service-faq') &&
                                    !beforeNextH2.includes('section.service-order')) {
                                    break;
                                }
                                const nextSearchStart = nextH2Start + 10;
                                nextH2Start = currentContent.indexOf('<h2', nextSearchStart);
                                iterations++;
                                if (nextH2Start === nextSearchStart - 10) {
                                    // Если индекс не изменился, значит мы не нашли следующий h2
                                    break;
                                }
                            }
                            if (iterations >= MAX_ITERATIONS) {
                                throw new Error(`Превышено максимальное количество итераций (${MAX_ITERATIONS}) при поиске следующего h2 для FAQ`);
                            }
                            
                            if (nextH2Start > 0) {
                                const blockFromHTML = currentContent.substring(h2Start, nextH2Start);
                                log(`   ✅ Найден блок FAQ в исходном HTML, размер: ${blockFromHTML.length} символов`);
                                oldFAQBlockHTML = blockFromHTML;
                            } else {
                                // Берем все до конца или до новой секции
                                const blockFromHTML = currentContent.substring(h2Start);
                                const sectionStart = blockFromHTML.indexOf('<section class="service-');
                                if (sectionStart > 0) {
                                    oldFAQBlockHTML = blockFromHTML.substring(0, sectionStart);
                                    log(`   ✅ Найден блок FAQ в исходном HTML до новой секции, размер: ${oldFAQBlockHTML.length} символов`);
                                } else {
                                    oldFAQBlockHTML = h2HTML + contentHTML;
                                }
                            }
                        } else {
                            oldFAQBlockHTML = h2HTML + contentHTML;
                        }
                    } else {
                        oldFAQBlockHTML = h2HTML + contentHTML;
                    }
                    break;
                }
            }
        }
        
        if (oldFAQH2 && oldFAQH2.length > 0) {
            log('✅ Старый блок FAQ найден');
            log(`   Размер блока: ${oldFAQBlockHTML.length} символов`);
            faqItems = extractFAQFromOldBlock($, oldFAQBlockHTML, (msg) => log(msg));
            log(`\n   📊 Итого извлечено FAQ элементов: ${faqItems.length}`);
            if (faqItems.length > 0) {
                faqItems.forEach((item, i) => {
                    log(`   ${i + 1}. ${item.question.substring(0, 50)}...`);
                });
            }
        } else {
            log('⚠️  Старый блок FAQ не найден');
        }
        
        // 3. Найти старый блок формы заказа
        log('\n🔍 Ищу старый блок формы заказа...');
        let oldFormBlock = null;
        
        $('body form').each(function() {
            const $form = $(this);
            if (!$form.closest('.service-order, section.service-order').length) {
                const hasName = $form.find('input[name="name"], input[id*="name"]').length > 0;
                const hasPhone = $form.find('input[name="phone"], input[id*="phone"], input[type="tel"]').length > 0;
                if (hasName && hasPhone) {
                    oldFormBlock = $form;
                    return false;
                }
            }
        });
        
        if (oldFormBlock && oldFormBlock.length > 0) {
            log('✅ Старый блок формы найден');
        } else {
            log('⚠️  Старый блок формы не найден');
        }
        
        // 4. Обновить новые секции с извлеченными данными
        log('\n📝 Обновляю новые секции...');
        
        // Обновить service-tariffs
        const existingServiceTariffs = $('body section.service-tariffs');
        if (tariffs.length > 0) {
            // Удаляем дубликаты тарифов (по названию или цене)
            const uniqueTariffs = [];
            const seen = new Set();
            
            tariffs.forEach(tariff => {
                const key = `${tariff.title.toLowerCase().trim()}_${tariff.priceAmount}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueTariffs.push(tariff);
                } else {
                    log(`   ⚠️  Пропущен дубликат тарифа: "${tariff.title}" - ${tariff.priceAmount} ₽`);
                }
            });
            
            if (uniqueTariffs.length < tariffs.length) {
                log(`   🧹 Удалено дубликатов: ${tariffs.length - uniqueTariffs.length}`);
                tariffs = uniqueTariffs;
            }
            
            const newTariffsHTML = createServiceTariffsHTML(tariffs);
            if (existingServiceTariffs.length > 0) {
                existingServiceTariffs.replaceWith(newTariffsHTML);
                log(`✅ Секция service-tariffs обновлена (${tariffs.length} уникальных тарифов)`);
            } else {
                // Добавляем перед service-faq или service-order
                const insertBefore = $('body section.service-faq, body section.service-order').first();
                if (insertBefore.length > 0) {
                    insertBefore.before(newTariffsHTML);
                } else {
                    $('body').append(newTariffsHTML);
                }
                log('✅ Секция service-tariffs добавлена');
            }
        } else if (existingServiceTariffs.length > 0) {
            log('⚠️  Секция service-tariffs уже существует, но данные из старого блока не найдены');
        }
        
        // Обновить service-faq
        const existingServiceFAQ = $('body section.service-faq');
        if (faqItems.length > 0) {
            const newFAQHTML = createServiceFAQHTML(faqItems);
            if (existingServiceFAQ.length > 0) {
                existingServiceFAQ.replaceWith(newFAQHTML);
                log('✅ Секция service-faq обновлена');
            } else {
                const insertBefore = $('body section.service-order').first();
                if (insertBefore.length > 0) {
                    insertBefore.before(newFAQHTML);
                } else {
                    $('body').append(newFAQHTML);
                }
                log('✅ Секция service-faq добавлена');
            }
        } else if (existingServiceFAQ.length > 0) {
            log('⚠️  Секция service-faq уже существует, но данные из старого блока не найдены');
        }
        
        // 5. Закомментировать или удалить старые блоки
        log('\n🗑️  Удаляю/комментирую старые блоки...');
        
        if (oldTariffsH2 && oldTariffsH2.length > 0) {
            // Объединяем h2 и контент в один блок для комментирования
            const commentStart = '<!-- Старый блок тарифов (данные перенесены в section.service-tariffs) -->\n';
            const commentEnd = '\n<!-- /Старый блок тарифов -->';
            
            // Вставляем комментарии до и после блока
            oldTariffsH2.before(commentStart);
            if (oldTariffsContent && oldTariffsContent.length > 0) {
                oldTariffsContent.last().after(commentEnd);
            } else {
                oldTariffsH2.after(commentEnd);
            }
            
            // Оборачиваем в div с display:none
            const wrapper = $('<div style="display:none;"></div>');
            oldTariffsH2.wrap(wrapper);
            if (oldTariffsContent && oldTariffsContent.length > 0) {
                oldTariffsContent.appendTo(wrapper);
            }
            
            log('✅ Старый блок тарифов закомментирован');
        }
        
        if (oldFAQH2 && oldFAQH2.length > 0) {
            const commentStart = '<!-- Старый блок FAQ (данные перенесены в section.service-faq) -->\n';
            const commentEnd = '\n<!-- /Старый блок FAQ -->';
            
            oldFAQH2.before(commentStart);
            if (oldFAQContent && oldFAQContent.length > 0) {
                oldFAQContent.last().after(commentEnd);
            } else {
                oldFAQH2.after(commentEnd);
            }
            
            const wrapper = $('<div style="display:none;"></div>');
            oldFAQH2.wrap(wrapper);
            if (oldFAQContent && oldFAQContent.length > 0) {
                oldFAQContent.appendTo(wrapper);
            }
            
            log('✅ Старый блок FAQ закомментирован');
        }
        
        if (oldFormBlock && oldFormBlock.length > 0) {
            oldFormBlock.remove();
            log('✅ Старый блок формы удален');
        }
        
        // Получаем обновленный HTML (только содержимое body)
        let updatedContent = $('body').html();
        
        // Убираем лишние пробелы и переносы строк в начале и конце
        updatedContent = updatedContent.trim();
        
        log(`\n📊 Результат:`);
        log(`   Размер контента до: ${currentContent.length} символов`);
        log(`   Размер контента после: ${updatedContent.length} символов`);
        
        // Сохраняем обновленный контент в Strapi
        log(`\n💾 Сохраняю обновленный контент в Strapi...`);
        log(`   Page ID: ${pageId}`);
        log(`   Update URL: ${STRAPI_URL}/api/pages/${pageId}`);
        
        const updateUrl = `${STRAPI_URL}/api/pages/${pageId}`;
        
        // Формат данных для Strapi v5
        const updateData = {
            data: {
                content: updatedContent
            }
        };
        
        log(`   Отправляю данные (размер: ${JSON.stringify(updateData).length} символов)...`);
        
        const updateResponse = await fetchWithTimeout(updateUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            log(`   ❌ Ошибка обновления: ${errorText}`);
            
            // Попробуем использовать documentId вместо id (если он отличается)
            if (documentId && documentId !== pageId) {
                log(`   Пробую с documentId: ${documentId}...`);
                const updateUrlDoc = `${STRAPI_URL}/api/pages/${documentId}`;
                const updateResponseDoc = await fetchWithTimeout(updateUrlDoc, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(updateData)
                });
                
                if (updateResponseDoc.ok) {
                    log('✅ Страница обновлена (с documentId)');
                } else {
                    const errorTextDoc = await updateResponseDoc.text();
                    throw new Error(`HTTP error! status: ${updateResponseDoc.status}, body: ${errorTextDoc}`);
                }
            } else {
                throw new Error(`HTTP error! status: ${updateResponse.status}, body: ${errorText}`);
            }
        } else {
            log('✅ Страница обновлена');
        }
        
        // Публикуем страницу
        const publishUrl = `${STRAPI_URL}/api/pages/${pageId}/actions/publish`;
        const publishResponse = await fetchWithTimeout(publishUrl, {
            method: 'POST',
            headers
        });
        
        if (publishResponse.ok) {
            log('✅ Страница опубликована');
        } else {
            const publishError = await publishResponse.text();
            log(`⚠️  Страница не опубликована: ${publishError}`);
        }
        
        log(`\n✅ Обработка завершена для страницы: ${slug}`);
        
    } catch (error) {
        log(`\n❌ Ошибка при обработке страницы ${slug}:`, error.message);
        log(error.stack);
        throw error;
    }
}

// Основная функция
async function main() {
    const slug = process.argv[2] || 'business/internet/gpon';
    
    log('🚀 Начало обработки контента страницы');
    log(`📄 Страница: ${slug}`);
    log(`🔗 Strapi URL: ${STRAPI_URL}`);
    
    await processPageContent(slug);
    
    log('\n' + '='.repeat(70));
    log('✅ ОБРАБОТКА ЗАВЕРШЕНА');
    log('='.repeat(70));
}

if (require.main === module) {
    main()
        .then(() => {
            log('\n✅ Готово!');
            process.exit(0);
        })
        .catch(error => {
            log('\n❌ Критическая ошибка:', error);
            process.exit(1);
        });
}

module.exports = { processPageContent };
