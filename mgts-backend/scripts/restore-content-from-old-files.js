const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const fs = require('fs');
const path = require('path');

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
 * Извлечь контент из старого HTML файла
 */
function extractContentFromOldFile(filePath, slug) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const $ = cheerio.load(fileContent);
        
        // Извлекаем все секции из body (исключая header, footer, breadcrumbs, scripts)
        const content = [];
        
        // Извлекаем hero секцию
        const hero = $('section.hero');
        if (hero.length > 0) {
            const heroContent = hero.find('.hero-content');
            if (heroContent.length > 0) {
                content.push(`<div class="container">
            <div class="hero-content">
                ${heroContent.html()}
            </div>
        </div>`);
            }
        }
        
        // Извлекаем все секции section.section (кроме старой формы)
        $('body section.section').each((i, section) => {
            const $section = $(section);
            // Пропускаем секцию со старой формой
            const hasForm = $section.find('form').length > 0;
            if (!hasForm) {
                // Используем $.html() для получения HTML элемента с его атрибутами
                const sectionHTML = $.html($section);
                if (sectionHTML && sectionHTML.trim().length > 0) {
                    content.push(sectionHTML);
                }
            }
        });
        
        // Добавляем новую форму в конец
        content.push(createNewOrderFormHTML());
        
        return content.join('\n');
        
    } catch (error) {
        log(`   ❌ Ошибка чтения файла: ${error.message}`);
        return null;
    }
}

/**
 * Восстановить контент на страницах
 */
async function restoreContent() {
    const pages = [
        { slug: 'business', file: 'SiteMGTS/business/index_old.html' },
        { slug: 'developers', file: 'SiteMGTS/developers/index_old.html' },
        { slug: 'government', file: 'SiteMGTS/government/index_old.html' },
        { slug: 'operators', file: 'SiteMGTS/operators/index_old.html' },
        { slug: 'partners', file: 'SiteMGTS/partners/index_old.html' }
    ];
    
    log('\n' + '='.repeat(70));
    log('🔄 ВОССТАНОВЛЕНИЕ КОНТЕНТА ИЗ СТАРЫХ ФАЙЛОВ');
    log('='.repeat(70));
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
    };
    
    const results = {
        restored: [],
        errors: []
    };
    
    for (let i = 0; i < pages.length; i++) {
        const { slug, file } = pages[i];
        log(`\n[${i + 1}/${pages.length}] Обрабатываю: ${slug}`);
        
        const filePath = path.join(__dirname, '..', '..', file);
        
        if (!fs.existsSync(filePath)) {
            log(`   ⚠️  Файл не найден: ${filePath}`);
            results.errors.push({ slug, error: 'Файл не найден' });
            continue;
        }
        
        log(`   📄 Читаю файл: ${file}`);
        
        // Извлекаем контент из старого файла
        const restoredContent = extractContentFromOldFile(filePath, slug);
        
        if (!restoredContent) {
            log(`   ❌ Не удалось извлечь контент`);
            results.errors.push({ slug, error: 'Ошибка извлечения контента' });
            continue;
        }
        
        log(`   📊 Размер восстановленного контента: ${restoredContent.length} символов`);
        
        try {
            // Получаем страницу из Strapi
            const getUrl = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
            const getResponse = await fetchWithTimeout(getUrl, { headers });
            
            if (!getResponse.ok) {
                log(`   ⚠️  Ошибка загрузки страницы: ${getResponse.status}`);
                results.errors.push({ slug, error: `HTTP ${getResponse.status}` });
                continue;
            }
            
            const getData = await getResponse.json();
            if (!getData.data || getData.data.length === 0) {
                log(`   ⚠️  Страница не найдена в Strapi`);
                results.errors.push({ slug, error: 'Страница не найдена' });
                continue;
            }
            
            const page = getData.data[0];
            const pageId = page.documentId || page.id;
            
            // Обновляем страницу
            const updateUrl = `${STRAPI_URL}/api/pages/${pageId}`;
            const updateData = {
                data: {
                    content: restoredContent
                }
            };
            
            const updateResponse = await fetchWithTimeout(updateUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updateData)
            });
            
            if (updateResponse.ok) {
                log(`   ✅ Контент восстановлен`);
                results.restored.push(slug);
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
    
    if (results.restored.length > 0) {
        log(`\n✅ ВОССТАНОВЛЕНО (${results.restored.length}):`);
        results.restored.forEach(slug => log(`   - ${slug}`));
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
    restoreContent()
        .then(() => process.exit(0))
        .catch((error) => {
            log(`\n❌ Критическая ошибка: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { extractContentFromOldFile, restoreContent };

