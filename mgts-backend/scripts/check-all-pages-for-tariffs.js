const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// Уже обработанные страницы
const PROCESSED_PAGES = [
    'business/internet/gpon',
    'business/internet/dedicated',
    'business/internet/office',
    'business/telephony/fixed',
    'business/telephony/ip',
    'business/telephony/vpbx',
    'business/telephony/mobile',
    'business/security/video-surveillance',
    'business/security/access-control',
    'business/security/alarm',
    'business/cloud/storage',
    'business/cloud/vps',
    'business/cloud/services',
    'business/tv/iptv',
    'business/tv/office'
];

// Таймаут для HTTP запросов
const HTTP_TIMEOUT = 30000;

// Функция для логирования
function log(message) {
    console.log(message);
    if (process.stdout.isTTY) {
        process.stdout.write('');
    }
}

// Проверка наличия fetch
let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        log('❌ Fetch не доступен. Установите node-fetch: npm install node-fetch@2');
        process.exit(1);
    }
}

// Обертка для fetch с таймаутом
async function fetchWithTimeout(url, options = {}, timeout = HTTP_TIMEOUT) {
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
 * Проверить страницу на наличие тарифов
 */
function checkPageForTariffs(htmlContent, slug) {
    const $ = cheerio.load(htmlContent);
    const results = {
        hasOldTariffs: false,
        hasNewTariffs: false,
        oldTariffsCount: 0,
        newTariffsCount: 0,
        hasOldFAQ: false,
        hasNewFAQ: false,
        oldFAQCount: 0,
        newFAQCount: 0,
        hasOldForm: false,
        hasNewForm: false
    };
    
    // Проверка старых блоков тарифов
    const oldTariffsH2 = $('body h2').filter((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        return (text.includes('тариф') || text.includes('тарифы') || text.includes('тарифный')) &&
               !text.includes('faq') && 
               !text.includes('вопрос') &&
               $(el).closest('.service-tariffs, section.service-tariffs').length === 0;
    });
    
    if (oldTariffsH2.length > 0) {
        results.hasOldTariffs = true;
        // Подсчитываем карточки после h2
        oldTariffsH2.each((i, h2) => {
            const $h2 = $(h2);
            let next = $h2.next();
            let count = 0;
            let maxIterations = 100;
            const seenCards = new Set();
            
            while (next.length > 0 && maxIterations > 0) {
                if (next.is('h2') || next.is('section.service-tariffs, section.service-faq, section.service-order')) {
                    break;
                }
                
                // Ищем карточки с тарифами (должны содержать цену)
                const cards = next.find('.card').addBack().filter('.card');
                cards.each((j, card) => {
                    const $card = $(card);
                    const cardText = $card.text();
                    const hasPrice = /\d+\s*₽|\d+\s*руб/i.test(cardText);
                    const hasH3 = $card.find('h3').length > 0;
                    
                    if (hasPrice && hasH3 && !seenCards.has(card)) {
                        seenCards.add(card);
                        count++;
                    }
                });
                
                next = next.next();
                maxIterations--;
            }
            results.oldTariffsCount = Math.max(results.oldTariffsCount, count);
        });
    }
    
    // Проверка новых секций тарифов
    const newTariffsSection = $('body section.service-tariffs');
    if (newTariffsSection.length > 0) {
        results.hasNewTariffs = true;
        results.newTariffsCount = newTariffsSection.find('.tariff-card').length;
    }
    
    // Проверка старых блоков FAQ
    const oldFAQH2 = $('body h2').filter((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        return (text.includes('часто задаваемые вопросы') || 
                text.includes('faq') || 
                text.includes('вопросы')) &&
               $(el).closest('.service-faq, section.service-faq').length === 0;
    });
    
    if (oldFAQH2.length > 0) {
        results.hasOldFAQ = true;
        oldFAQH2.each((i, h2) => {
            const $h2 = $(h2);
            let next = $h2.next();
            let count = 0;
            let maxIterations = 100;
            
            while (next.length > 0 && maxIterations > 0) {
                if (next.is('h2') || next.is('section.service-tariffs, section.service-faq, section.service-order')) {
                    break;
                }
                if (next.hasClass('card') || (next.find('.card').length > 0)) {
                    count += next.find('.card').length || 1;
                }
                next = next.next();
                maxIterations--;
            }
            results.oldFAQCount = Math.max(results.oldFAQCount, count);
        });
    }
    
    // Проверка новых секций FAQ
    const newFAQSection = $('body section.service-faq');
    if (newFAQSection.length > 0) {
        results.hasNewFAQ = true;
        results.newFAQCount = newFAQSection.find('.faq-item').length;
    }
    
    // Проверка старых форм
    const oldForms = $('body form').filter((i, form) => {
        return !$(form).closest('.service-order, section.service-order').length;
    });
    results.hasOldForm = oldForms.length > 0;
    
    // Проверка новых форм
    const newForms = $('body section.service-order form');
    results.hasNewForm = newForms.length > 0;
    
    return results;
}

/**
 * Получить все страницы из Strapi
 */
async function getAllPages() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (API_TOKEN) {
        headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }
    
    log('📥 Загружаю список всех страниц из Strapi...');
    
    // Получаем все страницы с пагинацией
    let allPages = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;
    
    while (hasMore) {
        const url = `${STRAPI_URL}/api/pages?pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=slug:asc`;
        const response = await fetchWithTimeout(url, { headers });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const data = await response.json();
        const pages = data.data || [];
        allPages = allPages.concat(pages);
        
        const pagination = data.meta?.pagination;
        if (pagination && pagination.page < pagination.pageCount) {
            page++;
        } else {
            hasMore = false;
        }
    }
    
    log(`✅ Найдено страниц: ${allPages.length}`);
    return allPages;
}

/**
 * Проверить все страницы
 */
async function checkAllPages() {
    log('\n' + '='.repeat(70));
    log('🔍 ПРОВЕРКА ВСЕХ СТРАНИЦ НА НАЛИЧИЕ ТАРИФОВ');
    log('='.repeat(70));
    
    try {
        const allPages = await getAllPages();
        
        // Фильтруем уже обработанные страницы
        const pagesToCheck = allPages.filter(page => {
            const slug = page.attributes?.slug || page.slug;
            return !PROCESSED_PAGES.includes(slug);
        });
        
        log(`\n📋 Страниц для проверки: ${pagesToCheck.length} (из ${allPages.length} всего)`);
        log(`⏭️  Пропущено уже обработанных: ${PROCESSED_PAGES.length}`);
        log('='.repeat(70));
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (API_TOKEN) {
            headers['Authorization'] = `Bearer ${API_TOKEN}`;
        }
        
        const results = {
            withOldTariffs: [],
            withNewTariffs: [],
            withOldFAQ: [],
            withNewFAQ: [],
            withOldForms: [],
            withNewForms: [],
            noTariffs: []
        };
        
        for (let i = 0; i < pagesToCheck.length; i++) {
            const page = pagesToCheck[i];
            const slug = page.attributes?.slug || page.slug;
            const pageId = page.documentId || page.id;
            
            log(`\n[${i + 1}/${pagesToCheck.length}] Проверяю: ${slug}`);
            
            try {
                // Получаем контент страницы (используем documentId для Strapi v5)
                const getUrl = `${STRAPI_URL}/api/pages/${pageId}`;
                const getResponse = await fetchWithTimeout(getUrl, { headers });
                
                if (!getResponse.ok) {
                    log(`   ⚠️  Ошибка загрузки: ${getResponse.status}`);
                    continue;
                }
                
                const pageData = await getResponse.json();
                // Проверяем разные варианты структуры данных Strapi v5
                const page = pageData.data || pageData;
                const pageAttributes = page?.attributes || page || {};
                const content = pageAttributes.content || page?.content || '';
                
                if (!content || content.trim().length === 0) {
                    log(`   ℹ️  Страница без контента`);
                    results.noTariffs.push({ slug, reason: 'Нет контента' });
                    continue;
                }
                
                // Проверяем на наличие тарифов
                const checkResults = checkPageForTariffs(content, slug);
                
                // Классифицируем результаты
                if (checkResults.hasOldTariffs) {
                    results.withOldTariffs.push({
                        slug,
                        oldTariffsCount: checkResults.oldTariffsCount,
                        hasNewTariffs: checkResults.hasNewTariffs,
                        newTariffsCount: checkResults.newTariffsCount
                    });
                    log(`   🔴 Найдены СТАРЫЕ тарифы (${checkResults.oldTariffsCount} шт.)`);
                    if (checkResults.hasNewTariffs) {
                        log(`   ✅ Также есть новые тарифы (${checkResults.newTariffsCount} шт.)`);
                    }
                } else if (checkResults.hasNewTariffs) {
                    results.withNewTariffs.push({
                        slug,
                        newTariffsCount: checkResults.newTariffsCount
                    });
                    log(`   ✅ Только новые тарифы (${checkResults.newTariffsCount} шт.)`);
                } else {
                    results.noTariffs.push({ slug, reason: 'Нет тарифов' });
                    log(`   ℹ️  Тарифов не найдено`);
                }
                
                if (checkResults.hasOldFAQ) {
                    results.withOldFAQ.push({
                        slug,
                        oldFAQCount: checkResults.oldFAQCount,
                        hasNewFAQ: checkResults.hasNewFAQ,
                        newFAQCount: checkResults.newFAQCount
                    });
                    log(`   🔴 Найдены СТАРЫЕ FAQ (${checkResults.oldFAQCount} шт.)`);
                }
                
                if (checkResults.hasOldForm) {
                    results.withOldForms.push({ slug });
                    log(`   🔴 Найдена СТАРАЯ форма`);
                }
                
                // Небольшая задержка между запросами
                if (i < pagesToCheck.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                log(`   ❌ Ошибка: ${error.message}`);
            }
        }
        
        // Итоговый отчет
        log('\n' + '='.repeat(70));
        log('📊 ИТОГОВЫЙ ОТЧЕТ');
        log('='.repeat(70));
        
        if (results.withOldTariffs.length > 0) {
            log(`\n🔴 СТРАНИЦЫ С СТАРЫМИ ТАРИФАМИ (${results.withOldTariffs.length}):`);
            results.withOldTariffs.forEach(({ slug, oldTariffsCount, hasNewTariffs, newTariffsCount }) => {
                log(`   - ${slug} (${oldTariffsCount} тарифов)`);
                if (hasNewTariffs) {
                    log(`     ⚠️  Также есть новые тарифы (${newTariffsCount} шт.) - требуется проверка`);
                }
            });
        }
        
        if (results.withNewTariffs.length > 0) {
            log(`\n✅ СТРАНИЦЫ ТОЛЬКО С НОВЫМИ ТАРИФАМИ (${results.withNewTariffs.length}):`);
            results.withNewTariffs.forEach(({ slug, newTariffsCount }) => {
                log(`   - ${slug} (${newTariffsCount} тарифов)`);
            });
        }
        
        if (results.withOldFAQ.length > 0) {
            log(`\n🔴 СТРАНИЦЫ С СТАРЫМИ FAQ (${results.withOldFAQ.length}):`);
            results.withOldFAQ.forEach(({ slug, oldFAQCount }) => {
                log(`   - ${slug} (${oldFAQCount} вопросов)`);
            });
        }
        
        if (results.withOldForms.length > 0) {
            log(`\n🔴 СТРАНИЦЫ С СТАРЫМИ ФОРМАМИ (${results.withOldForms.length}):`);
            results.withOldForms.forEach(({ slug }) => {
                log(`   - ${slug}`);
            });
        }
        
        if (results.noTariffs.length > 0 && results.noTariffs.length < 20) {
            log(`\nℹ️  СТРАНИЦЫ БЕЗ ТАРИФОВ (${results.noTariffs.length}):`);
            results.noTariffs.forEach(({ slug, reason }) => {
                log(`   - ${slug} (${reason})`);
            });
        } else if (results.noTariffs.length > 0) {
            log(`\nℹ️  СТРАНИЦ БЕЗ ТАРИФОВ: ${results.noTariffs.length}`);
        }
        
        log('\n' + '='.repeat(70));
        log('✅ ПРОВЕРКА ЗАВЕРШЕНА');
        log('='.repeat(70));
        
        return results;
        
    } catch (error) {
        log(`\n❌ Критическая ошибка: ${error.message}`);
        log(error.stack);
        throw error;
    }
}

// Запуск скрипта
if (require.main === module) {
    checkAllPages()
        .then((results) => {
            const exitCode = results.withOldTariffs.length > 0 ? 1 : 0;
            process.exit(exitCode);
        })
        .catch((error) => {
            log(`\n❌ Критическая ошибка: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { checkAllPages, checkPageForTariffs };

