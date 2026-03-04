const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

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
 * Создать HTML новой формы заказа
 */
function createNewOrderFormHTML() {
    return `<section class="service-order" id="order-form">
    <div class="container">
        <h2>Заказать услугу</h2>
        <p>Оставьте заявку, и наш специалист свяжется с вами в течение 15 минут</p>
        <form class="order-form" action="#" method="POST">
            <div class="order-form__group">
                <label for="order-name" class="order-form__label">
                    Ваше имя
                    <span class="order-form__required" aria-label="обязательное поле">*</span>
                </label>
                <input type="text" id="order-name" name="name" class="order-form__input" required aria-required="true" aria-invalid="false" placeholder="Иван Иванов">
            </div>
            <div class="order-form__group">
                <label for="order-phone" class="order-form__label">
                    Телефон
                    <span class="order-form__required" aria-label="обязательное поле">*</span>
                </label>
                <input type="tel" id="order-phone" name="phone" class="order-form__input" required aria-required="true" aria-invalid="false" placeholder="+7 (999) 123-45-67">
            </div>
            <div class="order-form__group">
                <label for="order-email" class="order-form__label">
                    Email
                    <span class="order-form__required" aria-label="обязательное поле">*</span>
                </label>
                <input type="email" id="order-email" name="email" class="order-form__input" required aria-required="true" aria-invalid="false" placeholder="ivan@example.com">
            </div>
            <div class="order-form__group">
                <label for="order-company" class="order-form__label">Название компании</label>
                <input type="text" id="order-company" name="company" class="order-form__input" placeholder="ООО «Пример»">
            </div>
            <div class="order-form__group">
                <label for="order-message" class="order-form__label">Сообщение</label>
                <textarea id="order-message" name="message" class="order-form__textarea" rows="4" placeholder="Расскажите о ваших потребностях..."></textarea>
            </div>
            <div class="order-form__group">
                <label class="order-form__label">
                    <input type="checkbox" name="consent" required aria-required="true">
                    Я согласен на обработку персональных данных
                    <span class="order-form__required" aria-label="обязательное поле">*</span>
                </label>
            </div>
            <button type="submit" class="btn btn-primary btn-lg order-form__submit">Отправить заявку</button>
            <div class="order-form__success" role="alert" aria-live="polite">Спасибо! Ваша заявка принята. Мы свяжемся с вами в ближайшее время.</div>
            <div class="order-form__error" role="alert" aria-live="assertive">Произошла ошибка. Пожалуйста, проверьте правильность заполнения полей.</div>
        </form>
    </div>
</section>`;
}

/**
 * Проверить страницу на наличие старых форм
 */
function checkPageForOldForms(htmlContent, slug) {
    const $ = cheerio.load(htmlContent);
    const results = {
        hasOldForm: false,
        hasNewForm: false,
        oldFormCount: 0,
        oldFormElements: []
    };
    
    // Проверка старых форм (не в секции service-order)
    const oldForms = $('body form').filter((i, form) => {
        return !$(form).closest('.service-order, section.service-order').length;
    });
    
    if (oldForms.length > 0) {
        results.hasOldForm = true;
        results.oldFormCount = oldForms.length;
        oldForms.each((i, form) => {
            const $form = $(form);
            const hasName = $form.find('input[name="name"], input[id*="name"]').length > 0;
            const hasPhone = $form.find('input[name="phone"], input[id*="phone"], input[type="tel"]').length > 0;
            
            if (hasName && hasPhone) {
                results.oldFormElements.push({
                    element: $form,
                    hasName,
                    hasPhone,
                    html: $form[0].outerHTML || ''
                });
            }
        });
    }
    
    // Проверка новых форм
    const newForms = $('body section.service-order form');
    results.hasNewForm = newForms.length > 0;
    
    return results;
}

/**
 * Заменить старые формы на новую
 */
function replaceOldForms(htmlContent, slug) {
    // Парсим HTML, оборачивая в body для правильной работы с DOM
    const $ = cheerio.load(`<body>${htmlContent}</body>`, { decodeEntities: false });
    let modified = false;
    
    // Находим старые формы
    const oldForms = $('body form').filter((i, form) => {
        return !$(form).closest('.service-order, section.service-order').length;
    });
    
    if (oldForms.length === 0) {
        return { html: htmlContent, modified: false };
    }
    
    // Проверяем, есть ли уже секция service-order
    const existingServiceOrder = $('body section.service-order');
    
    if (existingServiceOrder.length > 0) {
        // Если секция уже есть, просто удаляем старые формы
        log(`   🗑️  Удаляю ${oldForms.length} старую(их) форму(ы)...`);
        oldForms.each((i, form) => {
            const $form = $(form);
            const hasName = $form.find('input[name="name"], input[id*="name"]').length > 0;
            const hasPhone = $form.find('input[name="phone"], input[id*="phone"], input[type="tel"]').length > 0;
            
            if (hasName && hasPhone) {
                // Удаляем только форму, сохраняя родительский контейнер
                $form.remove();
                modified = true;
            }
        });
    } else {
        // Если секции нет, заменяем первую старую форму на новую секцию
        log(`   🔄 Заменяю старую форму на новую секцию service-order...`);
        const firstOldForm = oldForms.first();
        const $firstOldForm = $(firstOldForm);
        const hasName = $firstOldForm.find('input[name="name"], input[id*="name"]').length > 0;
        const hasPhone = $firstOldForm.find('input[name="phone"], input[id*="phone"], input[type="tel"]').length > 0;
        
        if (hasName && hasPhone) {
            // Заменяем только саму форму на новую секцию, сохраняя всю остальную структуру
            const newFormHTML = createNewOrderFormHTML();
            $firstOldForm.replaceWith(newFormHTML);
            modified = true;
            
            // Удаляем остальные старые формы
            if (oldForms.length > 1) {
                log(`   🗑️  Удаляю ${oldForms.length - 1} дополнительную(ых) старую(их) форму(ы)...`);
                oldForms.slice(1).each((i, form) => {
                    const $form = $(form);
                    $form.remove();
                });
            }
        }
    }
    
    if (modified) {
        // Получаем обновленный HTML из body (сохраняем всю структуру)
        const updatedHTML = $('body').html() || '';
        
        // Если получили пустую строку, возвращаем исходный контент
        if (!updatedHTML || updatedHTML.trim().length === 0) {
            log(`   ⚠️  Предупреждение: получен пустой HTML, возвращаю исходный контент`);
            return { html: htmlContent, modified: false };
        }
        
        return { html: updatedHTML, modified: true };
    }
    
    return { html: htmlContent, modified: false };
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
 * Обработать все страницы
 */
async function processAllPages() {
    log('\n' + '='.repeat(70));
    log('🔍 ПРОВЕРКА И ЗАМЕНА СТАРЫХ ФОРМ ЗАКАЗА');
    log('='.repeat(70));
    
    try {
        const allPages = await getAllPages();
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        };
        
        const results = {
            withOldForms: [],
            replaced: [],
            alreadyHaveNewForm: [],
            noForms: []
        };
        
        for (let i = 0; i < allPages.length; i++) {
            const page = allPages[i];
            const slug = page.attributes?.slug || page.slug;
            const pageId = page.documentId || page.id;
            
            log(`\n[${i + 1}/${allPages.length}] Проверяю: ${slug}`);
            
            try {
                // Получаем контент страницы
                const getUrl = `${STRAPI_URL}/api/pages/${pageId}`;
                const getResponse = await fetchWithTimeout(getUrl, { headers });
                
                if (!getResponse.ok) {
                    log(`   ⚠️  Ошибка загрузки: ${getResponse.status}`);
                    continue;
                }
                
                const pageData = await getResponse.json();
                const pageObj = pageData.data || pageData;
                const pageAttributes = pageObj?.attributes || pageObj || {};
                const content = pageAttributes.content || pageObj?.content || '';
                
                if (!content) {
                    log(`   ℹ️  Страница без контента`);
                    results.noForms.push({ slug, reason: 'Нет контента' });
                    continue;
                }
                
                // Проверяем на наличие старых форм
                const checkResults = checkPageForOldForms(content, slug);
                
                if (checkResults.hasOldForm) {
                    log(`   🔴 Найдено старых форм: ${checkResults.oldFormCount}`);
                    
                    // Заменяем старые формы
                    const { html: updatedContent, modified } = replaceOldForms(content, slug);
                    
                    if (modified) {
                        // Обновляем страницу в Strapi
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
                            if (checkResults.hasNewForm) {
                                log(`   ✅ Старые формы удалены (новая форма уже была)`);
                                results.alreadyHaveNewForm.push({ slug, oldFormCount: checkResults.oldFormCount });
                            } else {
                                log(`   ✅ Старая форма заменена на новую`);
                                results.replaced.push({ slug, oldFormCount: checkResults.oldFormCount });
                            }
                        } else {
                            const errorText = await updateResponse.text();
                            log(`   ❌ Ошибка обновления: ${updateResponse.status} - ${errorText.substring(0, 200)}`);
                            results.withOldForms.push({ slug, oldFormCount: checkResults.oldFormCount, error: `HTTP ${updateResponse.status}` });
                        }
                    } else {
                        log(`   ⚠️  Формы не были изменены`);
                        results.withOldForms.push({ slug, oldFormCount: checkResults.oldFormCount, error: 'Не удалось заменить' });
                    }
                } else if (checkResults.hasNewForm) {
                    log(`   ✅ Только новая форма`);
                } else {
                    log(`   ℹ️  Форм не найдено`);
                    results.noForms.push({ slug, reason: 'Нет форм' });
                }
                
                // Небольшая задержка между запросами
                if (i < allPages.length - 1) {
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
        
        if (results.replaced.length > 0) {
            log(`\n✅ СТРАНИЦЫ С ЗАМЕНЕННЫМИ ФОРМАМИ (${results.replaced.length}):`);
            results.replaced.forEach(({ slug, oldFormCount }) => {
                log(`   - ${slug} (заменено ${oldFormCount} форм)`);
            });
        }
        
        if (results.alreadyHaveNewForm.length > 0) {
            log(`\n🗑️  СТРАНИЦЫ С УДАЛЕННЫМИ СТАРЫМИ ФОРМАМИ (${results.alreadyHaveNewForm.length}):`);
            results.alreadyHaveNewForm.forEach(({ slug, oldFormCount }) => {
                log(`   - ${slug} (удалено ${oldFormCount} старых форм)`);
            });
        }
        
        if (results.withOldForms.length > 0) {
            log(`\n⚠️  СТРАНИЦЫ СО СТАРЫМИ ФОРМАМИ (не обработаны) (${results.withOldForms.length}):`);
            results.withOldForms.forEach(({ slug, oldFormCount }) => {
                log(`   - ${slug} (${oldFormCount} форм)`);
            });
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
    processAllPages()
        .then((results) => {
            const exitCode = (results.withOldForms.length > 0) ? 1 : 0;
            process.exit(exitCode);
        })
        .catch((error) => {
            log(`\n❌ Критическая ошибка: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { processAllPages, checkPageForOldForms, replaceOldForms };

