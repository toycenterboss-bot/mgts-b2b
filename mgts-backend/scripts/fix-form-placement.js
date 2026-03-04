const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const HTTP_TIMEOUT = 30000;

function log(message) {
    console.log(message);
    if (process.stdout.isTTY) {
        process.stdout.write('');
    }
}

let fetch;
if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
} else {
    try {
        fetch = require('node-fetch');
    } catch (e) {
        log('❌ Fetch не доступен');
        process.exit(1);
    }
}

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

const cheerio = require('cheerio');

/**
 * Исправить размещение формы на странице
 */
function fixFormPlacement(htmlContent, slug) {
    const $ = cheerio.load(`<body>${htmlContent}</body>`, { decodeEntities: false });
    let modified = false;
    
    // Находим секцию service-order
    const serviceOrder = $('body section.service-order');
    
    if (serviceOrder.length === 0) {
        return { html: htmlContent, modified: false };
    }
    
    // Проверяем, находится ли секция внутри неправильного контейнера
    serviceOrder.each((i, section) => {
        const $section = $(section);
        const $parent = $section.parent();
        
        // Если родитель - это не body и не другой section, значит форма в неправильном месте
        const parentTag = $parent.get(0)?.tagName || '';
        const isInWrongContainer = parentTag !== 'body' && 
                                   !$parent.is('section') && 
                                   !$parent.hasClass('service-order') &&
                                   !$parent.hasClass('service-tariffs') &&
                                   !$parent.hasClass('service-faq');
        
        if (isInWrongContainer) {
            log(`   🔧 Форма находится внутри ${parentTag}, перемещаю на верхний уровень...`);
            
            // Сохраняем HTML секции (используем cheerio для правильного получения HTML)
            const sectionHTML = $section.html() ? 
                `<section class="service-order" id="order-form">${$section.html()}</section>` :
                $section[0].outerHTML || '';
            
            // Удаляем секцию из текущего места
            $section.remove();
            
            // Добавляем секцию в конец body
            $('body').append(sectionHTML);
            
            modified = true;
        } else {
            // Проверяем, есть ли секция вообще
            log(`   ✅ Форма на правильном месте (родитель: ${parentTag})`);
        }
    });
    
    if (modified) {
        const updatedHTML = $('body').html() || '';
        return { html: updatedHTML, modified: true };
    }
    
    return { html: htmlContent, modified: false };
}

/**
 * Обработать проблемные страницы
 */
async function fixPages() {
    const problemSlugs = ['business', 'developers', 'government', 'index', 'operators', 'partners'];
    
    log('\n' + '='.repeat(70));
    log('🔧 ИСПРАВЛЕНИЕ РАЗМЕЩЕНИЯ ФОРМ');
    log('='.repeat(70));
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
    };
    
    const results = {
        fixed: [],
        noChanges: []
    };
    
    for (let i = 0; i < problemSlugs.length; i++) {
        const slug = problemSlugs[i];
        log(`\n[${i + 1}/${problemSlugs.length}] Обрабатываю: ${slug}`);
        
        try {
            // Получаем страницу
            const getUrl = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
            const getResponse = await fetchWithTimeout(getUrl, { headers });
            
            if (!getResponse.ok) {
                log(`   ⚠️  Ошибка загрузки: ${getResponse.status}`);
                continue;
            }
            
            const getData = await getResponse.json();
            if (!getData.data || getData.data.length === 0) {
                log(`   ⚠️  Страница не найдена`);
                continue;
            }
            
            const page = getData.data[0];
            const pageId = page.documentId || page.id;
            const pageAttributes = page.attributes || page;
            const content = pageAttributes.content || '';
            
            if (!content) {
                log(`   ℹ️  Страница без контента`);
                continue;
            }
            
            // Исправляем размещение формы
            const { html: updatedContent, modified } = fixFormPlacement(content, slug);
            
            if (modified) {
                // Обновляем страницу
                const updateUrl = `${STRAPI_URL}/api/pages/${pageId}`;
                const updateData = {
                    data: {
                        content: updatedContent
                    }
                };
                
                const updateResponse = await fetchWithTimeout(updateUrl, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(updateData)
                });
                
                if (updateResponse.ok) {
                    log(`   ✅ Форма перемещена на правильное место`);
                    results.fixed.push(slug);
                } else {
                    const errorText = await updateResponse.text();
                    log(`   ❌ Ошибка обновления: ${updateResponse.status} - ${errorText.substring(0, 200)}`);
                }
            } else {
                log(`   ℹ️  Изменений не требуется`);
                results.noChanges.push(slug);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            log(`   ❌ Ошибка: ${error.message}`);
        }
    }
    
    // Итоговый отчет
    log('\n' + '='.repeat(70));
    log('📊 ИТОГОВЫЙ ОТЧЕТ');
    log('='.repeat(70));
    
    if (results.fixed.length > 0) {
        log(`\n✅ ИСПРАВЛЕНО (${results.fixed.length}):`);
        results.fixed.forEach(slug => log(`   - ${slug}`));
    }
    
    if (results.noChanges.length > 0) {
        log(`\nℹ️  БЕЗ ИЗМЕНЕНИЙ (${results.noChanges.length}):`);
        results.noChanges.forEach(slug => log(`   - ${slug}`));
    }
    
    log('\n' + '='.repeat(70));
    log('✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО');
    log('='.repeat(70));
}

if (require.main === module) {
    fixPages()
        .then(() => process.exit(0))
        .catch((error) => {
            log(`\n❌ Критическая ошибка: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { fixFormPlacement };

