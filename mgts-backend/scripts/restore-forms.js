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
 * Восстановить форму на странице
 */
function restoreForm(htmlContent, slug) {
    // Парсим HTML без обертки body, чтобы сохранить всю структуру
    const $ = cheerio.load(htmlContent, { decodeEntities: false });
    let modified = false;
    
    // Проверяем, есть ли уже секция service-order
    const serviceOrder = $('section.service-order');
    
    if (serviceOrder.length > 0) {
        log(`   ✅ Форма уже есть на странице`);
        // Проверяем, правильно ли она размещена
        serviceOrder.each((i, section) => {
            const $section = $(section);
            const $parent = $section.parent();
            const parentTag = $parent.get(0)?.tagName || '';
            
            // Если форма внутри div, перемещаем её на верхний уровень
            if (parentTag === 'div' && !$parent.hasClass('service-order')) {
                log(`   🔧 Форма внутри ${parentTag}, перемещаю на верхний уровень...`);
                const sectionHTML = $section[0].outerHTML || '';
                $section.remove();
                $.root().append(sectionHTML);
                modified = true;
            }
        });
        
        if (!modified) {
            return { html: htmlContent, modified: false };
        }
    } else {
        // Ищем пустые контейнеры или заголовки "Оставьте заявку" без формы
        const h2WithRequest = $('h2').filter((i, h2) => {
            const text = $(h2).text().trim().toLowerCase();
            return text.includes('оставьте заявку') || text.includes('заказать');
        });
        
        if (h2WithRequest.length > 0) {
            log(`   🔧 Найден заголовок формы без самой формы, добавляю форму после заголовка...`);
            const $h2 = $(h2WithRequest.first());
            const newFormHTML = createNewOrderFormHTML();
            
            // Вставляем форму после заголовка и его родительского контейнера
            const $parent = $h2.parent();
            if ($parent.hasClass('container')) {
                // Если заголовок в контейнере, вставляем форму после контейнера
                $parent.after(newFormHTML);
            } else {
                // Иначе вставляем после заголовка
                $h2.after(newFormHTML);
            }
            modified = true;
        } else {
            // Если ничего не найдено, просто добавляем форму в конец
            log(`   ➕ Добавляю новую форму в конец страницы...`);
            const newFormHTML = createNewOrderFormHTML();
            $.root().append(newFormHTML);
            modified = true;
        }
    }
    
    if (modified) {
        // Получаем обновленный HTML (весь документ)
        let updatedHTML = $.html();
        
        // Удаляем автоматически добавленные теги html/head/body, если они есть
        if (updatedHTML.includes('<html>')) {
            const bodyMatch = updatedHTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (bodyMatch) {
                updatedHTML = bodyMatch[1];
            }
        }
        
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
 * Восстановить формы на проблемных страницах
 */
async function restoreForms() {
    const problemSlugs = ['business', 'developers', 'government', 'index', 'operators', 'partners'];
    
    log('\n' + '='.repeat(70));
    log('🔄 ВОССТАНОВЛЕНИЕ ФОРМ');
    log('='.repeat(70));
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
    };
    
    const results = {
        restored: [],
        alreadyExists: [],
        errors: []
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
                results.errors.push({ slug, error: `HTTP ${getResponse.status}` });
                continue;
            }
            
            const getData = await getResponse.json();
            if (!getData.data || getData.data.length === 0) {
                log(`   ⚠️  Страница не найдена`);
                results.errors.push({ slug, error: 'Страница не найдена' });
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
            
            // Восстанавливаем форму
            const { html: updatedContent, modified } = restoreForm(content, slug);
            
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
                    log(`   ✅ Форма восстановлена`);
                    results.restored.push(slug);
                } else {
                    const errorText = await updateResponse.text();
                    log(`   ❌ Ошибка обновления: ${updateResponse.status} - ${errorText.substring(0, 200)}`);
                    results.errors.push({ slug, error: `HTTP ${updateResponse.status}` });
                }
            } else {
                log(`   ℹ️  Форма уже есть на странице`);
                results.alreadyExists.push(slug);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            log(`   ❌ Ошибка: ${error.message}`);
            results.errors.push({ slug, error: error.message });
        }
    }
    
    // Итоговый отчет
    log('\n' + '='.repeat(70));
    log('📊 ИТОГОВЫЙ ОТЧЕТ');
    log('='.repeat(70));
    
    if (results.restored.length > 0) {
        log(`\n✅ ВОССТАНОВЛЕНО (${results.restored.length}):`);
        results.restored.forEach(slug => log(`   - ${slug}`));
    }
    
    if (results.alreadyExists.length > 0) {
        log(`\nℹ️  УЖЕ ЕСТЬ (${results.alreadyExists.length}):`);
        results.alreadyExists.forEach(slug => log(`   - ${slug}`));
    }
    
    if (results.errors.length > 0) {
        log(`\n❌ ОШИБКИ (${results.errors.length}):`);
        results.errors.forEach(({ slug, error }) => log(`   - ${slug}: ${error}`));
    }
    
    log('\n' + '='.repeat(70));
    log('✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО');
    log('='.repeat(70));
}

if (require.main === module) {
    restoreForms()
        .then(() => process.exit(0))
        .catch((error) => {
            log(`\n❌ Критическая ошибка: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { restoreForm };

