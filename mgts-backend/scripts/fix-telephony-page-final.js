/**
 * Финальный скрипт для исправления страницы business/telephony
 * Создает правильную структуру согласно типизации
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.error("\n❌ Ошибка: Необходимо установить STRAPI_API_TOKEN (Settings → API Tokens → Full access)");
  console.error("   Пример: export STRAPI_API_TOKEN="your_token_here"\n");
  process.exit(1);
}


/**
 * Получить страницу из Strapi
 */
async function getPage(slug) {
    const encodedSlug = encodeURIComponent(slug);
    const response = await fetch(`${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodedSlug}&populate=*`, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
        throw new Error('Страница не найдена');
    }
    
    return data.data[0];
}

/**
 * Обновить страницу в Strapi
 */
async function updatePage(pageId, content) {
    const response = await fetch(`${STRAPI_URL}/api/pages/${pageId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: {
                content: content
            }
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update page: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
}

/**
 * Создать правильную структуру для business/telephony
 */
function createCorrectStructure(originalHTML) {
    // Правильная структура согласно типизации:
    // 1. Секция с услугами (карточки) - section.section
    // 2. Секция с преимуществами (grid) - section.section  
    // 3. Секция с формой заказа - section.service-order (уже правильная)
    
    const fixedHTML = `<section class="section">
    <div class="container">
        <h2 class="section-title">Услуги корпоративной телефонии</h2>
        <div class="grid">
            <div class="card">
                <h3>Фиксированная телефония</h3>
                <p>Классическая телефонная связь для офисов с гарантированным качеством.</p>
            </div>
            <div class="card">
                <h3>IP-телефония</h3>
                <p>Современная телефонная связь через интернет с расширенными возможностями.</p>
            </div>
            <div class="card">
                <h3>Виртуальная АТС</h3>
                <p>Облачная телефонная станция без оборудования с продвинутыми функциями.</p>
            </div>
            <div class="card">
                <h3>Корпоративная мобильная связь</h3>
                <p>Мобильная связь для сотрудников компании через МТС Бизнес.</p>
            </div>
        </div>
    </div>
</section>

<section class="section">
    <div class="container">
        <h2 class="section-title">Преимущества корпоративной телефонии МГТС</h2>
        <div class="grid">
            <div class="grid-item">
                <h3>Экономия</h3>
                <p>Снижение расходов на связь до 50%</p>
            </div>
            <div class="grid-item">
                <h3>Масштабируемость</h3>
                <p>Легко добавлять номера и функции</p>
            </div>
            <div class="grid-item">
                <h3>Интеграция</h3>
                <p>Интеграция с CRM и другими системами</p>
            </div>
            <div class="grid-item">
                <h3>Аналитика</h3>
                <p>Детальная статистика звонков</p>
            </div>
        </div>
    </div>
</section>

<section class="service-order" id="order-form">
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
                    <input type="checkbox" name="consent" required aria-required="true" style="margin-right: var(--spacing-xs);">
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

    return fixedHTML;
}

/**
 * Основная функция
 */
async function fixTelephonyPage(shouldApply = false) {
    try {
        console.log('\n=== ИСПРАВЛЕНИЕ СТРАНИЦЫ: business/telephony ===\n');
        
        if (!shouldApply) {
            console.log('🔍 РЕЖИМ ПРОВЕРКИ - изменения не будут сохранены\n');
        }
        
        // Получить страницу
        console.log('Получение страницы из Strapi...');
        const page = await getPage('business/telephony');
        const originalContent = page.attributes?.content || page.content || '';
        
        if (!originalContent) {
            console.log('⚠️ Страница не имеет контента');
            return;
        }
        
        console.log(`Длина оригинального контента: ${originalContent.length} символов\n`);
        
        // Создать правильную структуру
        console.log('Создание правильной структуры...');
        const fixedContent = createCorrectStructure(originalContent);
        console.log(`Длина исправленного контента: ${fixedContent.length} символов\n`);
        
        // Показать изменения
        console.log('📝 ИСПРАВЛЕННАЯ СТРУКТУРА:');
        console.log(fixedContent);
        console.log('');
        
        if (shouldApply) {
            // Обновить страницу
            console.log('Обновление страницы в Strapi...');
            await updatePage(page.id, fixedContent);
            console.log('✅ Страница обновлена в Strapi!');
        } else {
            console.log('🔍 Режим проверки: изменения не сохранены');
            console.log('Для применения изменений запустите: node fix-telephony-page-final.js --apply\n');
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Проверить аргументы
const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');

fixTelephonyPage(shouldApply);


