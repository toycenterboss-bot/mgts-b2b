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
 * Пересоздать структуру страницы с правильным размещением формы
 */
function reconstructPage(htmlContent, slug) {
    // Если контент содержит только форму, значит контент был потерян
    // В этом случае нужно восстановить из исходного состояния
    if (htmlContent.trim().startsWith('<section class="service-order')) {
        log(`   ⚠️  Контент потерян, требуется восстановление из резервной копии`);
        // Возвращаем как есть - контент нужно восстановить вручную
        return { html: htmlContent, modified: false, needsRestore: true };
    }
    
    // Удаляем теги html/body, если они есть
    let cleanContent = htmlContent;
    cleanContent = cleanContent.replace(/^[\s\S]*?<body[^>]*>/i, '');
    cleanContent = cleanContent.replace(/<\/body>[\s\S]*$/i, '');
    cleanContent = cleanContent.replace(/^[\s\S]*?<html[^>]*>/i, '');
    cleanContent = cleanContent.replace(/<\/html>[\s\S]*$/i, '');
    
    // Работаем с исходным HTML как со строкой для сохранения всей структуры
    // Находим и удаляем старую секцию service-order, если она есть
    const serviceOrderRegex = /<section\s+class=["']service-order["'][^>]*>[\s\S]*?<\/section>/gi;
    let contentWithoutForm = cleanContent.replace(serviceOrderRegex, '');
    
    // Удаляем пустые контейнеры, которые могли остаться от старой формы
    contentWithoutForm = contentWithoutForm.replace(/<div[^>]*class=["'][^"']*container["'][^>]*>\s*<\/div>/gi, '');
    contentWithoutForm = contentWithoutForm.replace(/<h2[^>]*>Оставьте заявку<\/h2>\s*/gi, '');
    contentWithoutForm = contentWithoutForm.replace(/<h2[^>]*>Заказать услугу<\/h2>\s*/gi, '');
    
    // Очищаем от лишних пробелов
    contentWithoutForm = contentWithoutForm.trim();
    
    // Добавляем форму в конец
    const newFormHTML = createNewOrderFormHTML();
    const reconstructedHTML = contentWithoutForm + '\n' + newFormHTML;
    
    log(`   📊 Размер контента до обработки: ${htmlContent.length} символов`);
    log(`   📊 Размер контента после: ${reconstructedHTML.length} символов`);
    
    return { html: reconstructedHTML, modified: true };
}

/**
 * Пересоздать все проблемные страницы
 */
async function reconstructAllPages() {
    const problemSlugs = ['business', 'developers', 'government', 'index', 'operators', 'partners'];
    
    log('\n' + '='.repeat(70));
    log('🔨 ПЕРЕСОЗДАНИЕ СТРУКТУРЫ СТРАНИЦ');
    log('='.repeat(70));
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
    };
    
    const results = {
        reconstructed: [],
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
            
            log(`   📄 Размер контента до: ${content.length} символов`);
            
            if (!content) {
                log(`   ℹ️  Страница без контента`);
                continue;
            }
            
            // Пересоздаем структуру страницы
            const { html: reconstructedContent } = reconstructPage(content, slug);
            
            log(`   📄 Размер контента после: ${reconstructedContent.length} символов`);
            
            // Обновляем страницу
            const updateUrl = `${STRAPI_URL}/api/pages/${pageId}`;
            const updateData = {
                data: {
                    content: reconstructedContent
                }
            };
            
            const updateResponse = await fetchWithTimeout(updateUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updateData)
            });
            
            if (updateResponse.ok) {
                log(`   ✅ Страница пересоздана`);
                results.reconstructed.push(slug);
            } else {
                const errorText = await updateResponse.text();
                log(`   ❌ Ошибка обновления: ${updateResponse.status} - ${errorText.substring(0, 200)}`);
                results.errors.push({ slug, error: `HTTP ${updateResponse.status}` });
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
    
    if (results.reconstructed.length > 0) {
        log(`\n✅ ПЕРЕСОЗДАНО (${results.reconstructed.length}):`);
        results.reconstructed.forEach(slug => log(`   - ${slug}`));
    }
    
    if (results.errors.length > 0) {
        log(`\n❌ ОШИБКИ (${results.errors.length}):`);
        results.errors.forEach(({ slug, error }) => log(`   - ${slug}: ${error}`));
    }
    
    log('\n' + '='.repeat(70));
    log('✅ ПЕРЕСОЗДАНИЕ ЗАВЕРШЕНО');
    log('='.repeat(70));
}

if (require.main === module) {
    reconstructAllPages()
        .then(() => process.exit(0))
        .catch((error) => {
            log(`\n❌ Критическая ошибка: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { reconstructPage };

