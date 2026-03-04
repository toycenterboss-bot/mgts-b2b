/**
 * Скрипт для исправления контента страниц услуг:
 * 1. Сохраняет существующий контент (не заменяет его)
 * 2. Извлекает существующие тарифы/FAQ из контента
 * 3. Обновляет компоненты с правильным контентом
 */

const fs = require('fs');
const path = require('path');

// API настройки
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

// Список страниц услуг
const servicePages = [
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

// Функция для извлечения тарифов из HTML контента
function extractTariffsFromContent(content) {
  const tariffs = [];
  const tempDiv = { innerHTML: content };
  
  // Ищем карточки с тарифами (обычно содержат цену и список функций)
  const pricePattern = /(от\s*)?[\d\s]+[\s₽рубР]+\/?мес?/i;
  
  // Парсим HTML для поиска тарифов
  // Ищем структуру: h3 (название) + p (описание) + цена + список функций
  const cardMatches = content.match(/<div[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
  
  cardMatches.forEach((cardHtml, index) => {
    // Извлекаем название тарифа
    const titleMatch = cardHtml.match(/<h3[^>]*>(.*?)<\/h3>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    
    // Извлекаем цену
    const priceMatch = cardHtml.match(pricePattern);
    const price = priceMatch ? priceMatch[0].trim() : '';
    
    // Извлекаем описание
    const descMatch = cardHtml.match(/<p[^>]*>(.*?)<\/p>/i);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    
    // Извлекаем функции (строки с галочками)
    const features = [];
    const listMatches = cardHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
    listMatches.forEach(li => {
      const text = li.replace(/<[^>]+>/g, '').replace(/^[✓✔✗✘•]\s*/, '').trim();
      if (text && text.length > 3) {
        features.push(text);
      }
    });
    
    // Если нашли тариф (есть название и цена), добавляем его
    if (title && price) {
      tariffs.push({
        title,
        description,
        price: price.replace(/от\s*/i, '').trim(),
        pricePeriod: price.includes('/мес') ? '/мес' : '/мес',
        isFeatured: index === 1 || cardHtml.includes('Популярный') || cardHtml.includes('Стандартный'),
        badgeText: cardHtml.includes('Популярный') ? 'Популярный' : '',
        features: features.join('\n'),
        buttonText: 'Выбрать тариф',
        buttonLink: '#order-form'
      });
    }
  });
  
  return tariffs;
}

// Функция для извлечения FAQ из HTML контента
function extractFAQFromContent(content) {
  const faqItems = [];
  
  // Ищем структуру FAQ (обычно это h3 + p или div с вопросом и ответом)
  // Ищем вопросы (обычно в заголовках h3 или h2)
  const questionPattern = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
  const questions = [];
  let match;
  
  while ((match = questionPattern.exec(content)) !== null) {
    const questionText = match[1].replace(/<[^>]+>/g, '').trim();
    // Проверяем, похоже ли это на FAQ вопрос (обычно содержит "?", "как", "что", "когда" и т.д.)
    if (questionText && (questionText.includes('?') || 
        /^(как|что|когда|где|почему|можно|нужно)/i.test(questionText))) {
      questions.push({
        question: questionText,
        position: match.index
      });
    }
  }
  
  // Для каждого вопроса ищем ответ (следующий параграф или список)
  questions.forEach((q, index) => {
    const startPos = q.position;
    const nextQuestionPos = index < questions.length - 1 ? questions[index + 1].position : content.length;
    const answerSection = content.substring(startPos, nextQuestionPos);
    
    // Извлекаем ответ (обычно это параграфы или списки после вопроса)
    const answerMatch = answerSection.match(/<\/h[23]>[\s\S]*?<p[^>]*>(.*?)<\/p>/i) || 
                      answerSection.match(/<\/h[23]>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    
    if (answerMatch) {
      let answer = answerMatch[1].replace(/<li[^>]*>/g, '<li>').replace(/<\/li>/g, '</li>');
      // Если это список, обернем в ul
      if (answer.includes('<li>')) {
        answer = `<ul>${answer}</ul>`;
      } else {
        answer = `<p>${answer.replace(/<[^>]+>/g, '').trim()}</p>`;
      }
      
      faqItems.push({
        question: q.question,
        answer: answer
      });
    }
  });
  
  return faqItems;
}

// Функция для генерации HTML тарифов из данных
function generateTariffsHTML(tariffs) {
  if (!tariffs || tariffs.length === 0) return '';
  
  let html = '<section class="service-tariffs">\n';
  html += '    <div class="container">\n';
  html += '        <h2>Тарифы и цены</h2>\n';
  html += '        <div class="tariffs-grid">\n';
  
  tariffs.forEach((tariff, index) => {
    html += `            <div class="tariff-card${tariff.isFeatured ? ' tariff-card--featured' : ''}">\n`;
    if (tariff.isFeatured && tariff.badgeText) {
      html += `                <div class="tariff-badge">${tariff.badgeText}</div>\n`;
    }
    html += '                <div class="tariff-card__header">\n';
    html += `                    <h3 class="tariff-card__title">${tariff.title}</h3>\n`;
    if (tariff.description) {
      html += `                    <p class="tariff-card__description">${tariff.description}</p>\n`;
    }
    html += '                    <div class="tariff-price">\n';
    html += `                        от <span class="tariff-price__amount">${tariff.price}</span> ₽\n`;
    html += `                        <span class="tariff-price__period">${tariff.pricePeriod}</span>\n`;
    html += '                    </div>\n';
    html += '                </div>\n';
    if (tariff.features) {
      html += '                <ul class="tariff-features">\n';
      tariff.features.split('\n').forEach(feature => {
        if (feature.trim()) {
          html += `                    <li>${feature.trim()}</li>\n`;
        }
      });
      html += '                </ul>\n';
    }
    html += '                <div class="tariff-card__footer">\n';
    html += `                    <button class="btn btn-primary btn-lg" onclick="document.getElementById('order-form').scrollIntoView({behavior: 'smooth'})">${tariff.buttonText}</button>\n`;
    html += '                </div>\n';
    html += '            </div>\n';
  });
  
  html += '        </div>\n';
  html += '    </div>\n';
  html += '</section>\n';
  
  return html;
}

// Функция для генерации HTML FAQ из данных
function generateFAQHTML(faqItems) {
  if (!faqItems || faqItems.length === 0) return '';
  
  let html = '<section class="service-faq">\n';
  html += '    <div class="container">\n';
  html += '        <h2>Часто задаваемые вопросы</h2>\n';
  html += '        <div class="faq-list">\n';
  
  faqItems.forEach((item, index) => {
    html += `            <div class="faq-item">\n`;
    html += `                <button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${index + 1}">\n`;
    html += `                    <span>${item.question}</span>\n`;
    html += '                    <span class="faq-icon" aria-hidden="true">\n';
    html += '                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n';
    html += '                            <path d="M6 9l6 6 6-6"></path>\n';
    html += '                        </svg>\n';
    html += '                    </span>\n';
    html += '                </button>\n';
    html += `                <div class="faq-answer" id="faq-answer-${index + 1}" aria-expanded="false">\n`;
    html += '                    <div class="faq-answer-content">\n';
    html += `                        ${item.answer}\n`;
    html += '                    </div>\n';
    html += '                </div>\n';
    html += '            </div>\n';
  });
  
  html += '        </div>\n';
  html += '    </div>\n';
  html += '</section>\n';
  
  return html;
}

// Функция для генерации HTML формы заказа
function generateOrderFormHTML() {
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
}

async function fixPageContent(slug, apiToken) {
  try {
    // Получаем страницу по slug
    const getUrl = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    const getResponse = await fetch(getUrl, { headers });
    
    if (!getResponse.ok) {
      throw new Error(`HTTP error! status: ${getResponse.status}`);
    }
    
    const getData = await getResponse.json();
    const pages = Array.isArray(getData.data) ? getData.data : [];
    
    if (pages.length === 0) {
      console.log(`⚠️  Страница ${slug} не найдена`);
      return { action: 'skipped', reason: 'not_found' };
    }
    
    const page = pages[0];
    const pageId = page.documentId || page.id;
    const pageAttributes = page.attributes || page;
    
    // Получаем текущий контент
    let currentContent = pageAttributes.content || '';
    
    // Проверяем, есть ли уже новые компоненты (service-tariffs, service-faq, service-order)
    const hasNewComponents = currentContent.includes('service-tariffs') || 
                             currentContent.includes('service-faq') || 
                             currentContent.includes('service-order');
    
    if (hasNewComponents) {
      // Удаляем старые компоненты, чтобы заменить их правильными
      console.log(`🔄 Удаляю старые компоненты из ${slug}...`);
      
      // Удаляем секции service-tariffs, service-faq, service-order
      const tempDiv = { innerHTML: currentContent };
      let cleanedContent = currentContent;
      
      // Удаляем секции с новыми компонентами
      cleanedContent = cleanedContent.replace(/<section[^>]*class="[^"]*service-tariffs[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');
      cleanedContent = cleanedContent.replace(/<section[^>]*class="[^"]*service-faq[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');
      cleanedContent = cleanedContent.replace(/<section[^>]*class="[^"]*service-order[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');
      
      currentContent = cleanedContent.trim();
    }
    
    // Извлекаем существующие тарифы и FAQ из контента
    const existingTariffs = extractTariffsFromContent(currentContent);
    const existingFAQ = extractFAQFromContent(currentContent);
    
    console.log(`📋 Извлечено из ${slug}: ${existingTariffs.length} тарифов, ${existingFAQ.length} FAQ`);
    
    // Генерируем HTML компонентов
    const tariffsHTML = existingTariffs.length > 0 ? generateTariffsHTML(existingTariffs) : '';
    const faqHTML = existingFAQ.length > 0 ? generateFAQHTML(existingFAQ) : '';
    const orderFormHTML = generateOrderFormHTML();
    
    // Собираем новый контент: существующий + новые компоненты
    let updatedContent = currentContent;
    
    // Добавляем компоненты в конец контента
    if (tariffsHTML) {
      updatedContent += '\n\n' + tariffsHTML;
    }
    if (faqHTML) {
      updatedContent += '\n\n' + faqHTML;
    }
    if (orderFormHTML) {
      updatedContent += '\n\n' + orderFormHTML;
    }
    
    // Обновляем страницу
    const updateUrl = `${STRAPI_URL}/api/pages/${pageId}`;
    const updateData = {
      data: {
        content: updatedContent
      }
    };
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`HTTP error! status: ${updateResponse.status}, body: ${errorText}`);
    }
    
    // Публикуем страницу
    const publishUrl = `${STRAPI_URL}/api/pages/${pageId}/actions/publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers
    });
    
    if (publishResponse.ok) {
      console.log(`✅ Исправлена и опубликована страница: ${slug}`);
      return { action: 'updated', published: true, tariffs: existingTariffs.length, faq: existingFAQ.length };
    } else {
      console.log(`✅ Исправлена страница: ${slug} (не опубликована)`);
      return { action: 'updated', published: false, tariffs: existingTariffs.length, faq: existingFAQ.length };
    }
    
  } catch (error) {
    console.error(`❌ Ошибка при исправлении ${slug}:`, error.message);
    return { action: 'error', error: error.message };
  }
}

async function fixAllServicePages() {
  console.log('='.repeat(70));
  console.log('ИСПРАВЛЕНИЕ КОНТЕНТА СТРАНИЦ УСЛУГ');
  console.log('='.repeat(70));
  console.log(`\nStrapi URL: ${STRAPI_URL}`);
  console.log(`API Token: ${API_TOKEN ? '✅ Установлен' : '⚠️  Не установлен'}`);
  console.log(`\nВсего страниц для исправления: ${servicePages.length}\n`);
  
  const results = {
    updated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };
  
  for (const slug of servicePages) {
    const result = await fixPageContent(slug, API_TOKEN);
    results.details.push({ slug, ...result });
    
    if (result.action === 'updated') {
      results.updated++;
    } else if (result.action === 'skipped') {
      results.skipped++;
    } else if (result.action === 'error') {
      results.errors++;
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЯ');
  console.log('='.repeat(70));
  console.log(`✅ Обновлено: ${results.updated}`);
  console.log(`⏭️  Пропущено: ${results.skipped}`);
  console.log(`❌ Ошибок: ${results.errors}`);
  
  if (results.errors > 0) {
    console.log('\nОшибки:');
    results.details
      .filter(r => r.action === 'error')
      .forEach(r => console.log(`  - ${r.slug}: ${r.error}`));
  }
  
  console.log('\n' + '='.repeat(70));
  
  return results;
}

// Запуск скрипта
if (require.main === module) {
  fixAllServicePages()
    .then(() => {
      console.log('\n✅ Исправление завершено!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { fixAllServicePages, fixPageContent };



